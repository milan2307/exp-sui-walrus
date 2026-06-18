import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repoRoot, "artifacts", "tradeproof", "manifest.json");
const demoSummaryPath = join(repoRoot, "artifacts", "tradeproof", "demo-summary.json");
const localSuiDir = join(repoRoot, "artifacts", "local-sui");

function runStep(label, args, options = {}) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function matchRequired(label, text, pattern) {
  const match = text.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Could not parse ${label} from command output.`);
  }
  return match[1];
}

function parseJsonOutput(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Could not parse JSON from command output.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function eventType(packageId, name) {
  return `${packageId}::shipment::${name}`;
}

function findEvent(tx, type) {
  return tx.events?.find((event) => event.type === type);
}

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

runStep("Move tests", ["scripts/verify-logioracle.js"]);
runStep("Generate evidence", ["scripts/create-tradeproof-evidence.js"]);

const manifestBeforeUpload = readManifest();
let memwalRan = false;
if (!manifestBeforeUpload.walrus_blob_id.startsWith("pending-walrus-upload:")) {
  console.log("\n== Evidence blob ==");
  console.log(`Using existing walrus_blob_id=${manifestBeforeUpload.walrus_blob_id}`);
} else {
  runStep("MemWal upload", ["scripts/upload-tradeproof-memwal.js"]);
  memwalRan = true;
}

runStep("Local Sui", ["scripts/start-local-sui.js"]);

mkdirSync(localSuiDir, { recursive: true });
const pubfilePath = join(localSuiDir, `Pub.demo.${Date.now()}.${process.pid}.toml`);
const publishOutput = runStep("Publish LogiOracle", [
  "scripts/publish-logioracle.js",
  "--env",
  "local",
  "--pubfile-path",
  pubfilePath,
  "--execute",
]);
const packageId = matchRequired(
  "package ID",
  publishOutput,
  /"type":\s*"published"[\s\S]*?"packageId":\s*"([^"]+)"/
);

const activeAddressOutput = spawnSync(
  join(dirname(repoRoot), "MilanGPT-OS", ".tools", "sui", "sui.exe"),
  ["client", "active-address"],
  {
    cwd: repoRoot,
    encoding: "utf8",
  }
);
if (activeAddressOutput.status !== 0) {
  process.stderr.write(activeAddressOutput.stderr);
  process.exit(activeAddressOutput.status ?? 1);
}
const recipient = activeAddressOutput.stdout.trim();

const txOutput = runStep("Create shipment proof", [
  "scripts/create-shipment-tx.js",
  "--package",
  packageId,
  "--env",
  "local",
  "--recipient",
  recipient,
  "--execute",
  "--json",
]);
const createTx = parseJsonOutput(txOutput);
const objectId = createTx.objectChanges?.find((change) =>
  change.type === "created" && change.objectType === `${packageId}::shipment::Shipment`
)?.objectId;
if (!objectId) {
  throw new Error("Could not parse created Shipment object ID from transaction JSON.");
}
const createDigest = createTx.digest;
if (!createDigest) {
  throw new Error("Could not parse create transaction digest from transaction JSON.");
}

runStep("Verify shipment object", [
  "scripts/verify-shipment-object.js",
  "--object",
  objectId,
  "--package",
  packageId,
  "--env",
  "local",
]);

const finalStatus = "DELIVERED";
const statusOutput = runStep("Update shipment status", [
  "scripts/update-shipment-status.js",
  "--object",
  objectId,
  "--package",
  packageId,
  "--status",
  finalStatus,
  "--env",
  "local",
  "--execute",
  "--json",
]);
const statusTx = parseJsonOutput(statusOutput);
const statusDigest = statusTx.digest;
if (!statusDigest) {
  throw new Error("Could not parse status transaction digest from transaction JSON.");
}

runStep("Verify updated shipment object", [
  "scripts/verify-shipment-object.js",
  "--object",
  objectId,
  "--package",
  packageId,
  "--env",
  "local",
  "--status",
  finalStatus,
]);

const manifest = readManifest();
const createdEvent = findEvent(createTx, eventType(packageId, "ShipmentCreated"));
const statusEvent = findEvent(statusTx, eventType(packageId, "ShipmentStatusUpdated"));
if (!createdEvent || !statusEvent) {
  throw new Error("Could not find lifecycle events in transaction JSON.");
}

writeFileSync(
  join(repoRoot, "artifacts", "tradeproof", "events-proof.json"),
  `${stableStringify({
    create_digest: createDigest,
    created_event: createdEvent,
    env: "local",
    package_id: packageId,
    shipment_id: manifest.shipment_id,
    status_digest: statusDigest,
    status_event: statusEvent,
  })}\n`
);

runStep("Verify lifecycle events", [
  "scripts/verify-shipment-events.js",
  "--package",
  packageId,
  "--create-digest",
  createDigest,
  "--status-digest",
  statusDigest,
  "--shipment-id",
  manifest.shipment_id,
  "--status",
  finalStatus,
  "--env",
  "local",
]);

const demoSummary = {
  create_tx: createDigest,
  evidence_hash: manifest.evidence_hash,
  final_status: finalStatus,
  memwal_upload: memwalRan ? "ran" : "not-needed",
  package: packageId,
  shipment_object: objectId,
  status_tx: statusDigest,
  walrus_blob_id: manifest.walrus_blob_id,
};
writeFileSync(demoSummaryPath, `${stableStringify(demoSummary)}\n`);

console.log("\nTradeProof local demo completed");
console.log(`memwal_upload=${demoSummary.memwal_upload}`);
console.log(`package=${demoSummary.package}`);
console.log(`shipment_object=${demoSummary.shipment_object}`);
console.log(`create_tx=${demoSummary.create_tx}`);
console.log(`status_tx=${demoSummary.status_tx}`);
console.log(`final_status=${demoSummary.final_status}`);
console.log(`walrus_blob_id=${demoSummary.walrus_blob_id}`);
console.log(`evidence_hash=${demoSummary.evidence_hash}`);
