import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repoRoot, "artifacts", "tradeproof", "manifest.json");
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

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
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
]);
const objectId = matchRequired(
  "shipment object ID",
  txOutput,
  /ObjectID:\s*(0x[a-fA-F0-9]+)[\s\S]*?ObjectType:\s*0x[a-fA-F0-9]+::shipment::Shipment/
);
const createDigest = matchRequired(
  "create transaction digest",
  txOutput,
  /Transaction Digest:\s*([A-Za-z0-9]+)/
);

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
]);
const statusDigest = matchRequired(
  "status transaction digest",
  statusOutput,
  /Transaction Digest:\s*([A-Za-z0-9]+)/
);

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

console.log("\nTradeProof local demo completed");
console.log(`memwal_upload=${memwalRan ? "ran" : "not-needed"}`);
console.log(`package=${packageId}`);
console.log(`shipment_object=${objectId}`);
console.log(`create_tx=${createDigest}`);
console.log(`status_tx=${statusDigest}`);
console.log(`final_status=${finalStatus}`);
console.log(`walrus_blob_id=${manifest.walrus_blob_id}`);
console.log(`evidence_hash=${manifest.evidence_hash}`);
