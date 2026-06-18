import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repoRoot, "artifacts", "tradeproof", "manifest.json");
const suiCli = join(
  dirname(repoRoot),
  "MilanGPT-OS",
  ".tools",
  "sui",
  "sui.exe"
);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--object") {
      parsed.objectId = argv[++index];
    } else if (arg === "--env") {
      parsed.clientEnv = argv[++index];
    } else if (arg === "--package") {
      parsed.packageId = argv[++index];
    } else if (arg === "--origin") {
      parsed.origin = argv[++index];
    } else if (arg === "--destination") {
      parsed.destination = argv[++index];
    } else if (arg === "--status") {
      parsed.status = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

if (!existsSync(manifestPath)) {
  throw new Error("Missing artifacts/tradeproof/manifest.json. Run npm run demo:evidence first.");
}

const args = parseArgs(process.argv.slice(2));
if (!args.objectId) {
  throw new Error("Missing --object <shipment-object-id>.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const expected = {
  shipment_id: manifest.shipment_id,
  proof_type: manifest.proof_type,
  origin: args.origin ?? "Nairobi",
  destination: args.destination ?? "Mombasa",
  status: args.status ?? "CREATED",
  walrus_blob_id: manifest.walrus_blob_id,
  evidence_hash: manifest.evidence_hash,
};

const objectArgs = ["client"];
if (args.clientEnv) {
  objectArgs.push("--client.env", args.clientEnv);
}
objectArgs.push("object", args.objectId, "--json");

const result = spawnSync(suiCli, objectArgs, {
  cwd: repoRoot,
  encoding: "utf8",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const object = JSON.parse(result.stdout);
const content = object.content;
if (!content) {
  throw new Error(`Object ${args.objectId} has no decoded Move content.`);
}

if (args.packageId) {
  const expectedType = `${args.packageId}::shipment::Shipment`;
  requireEqual("object type", object.objType, expectedType);
}

for (const [field, value] of Object.entries(expected)) {
  requireEqual(field, content[field], value);
}

console.log("Shipment object verified");
console.log(`object=${object.objectId}`);
console.log(`type=${object.objType}`);
console.log(`owner=${content.owner}`);
console.log(`shipment_id=${content.shipment_id}`);
console.log(`proof_type=${content.proof_type}`);
console.log(`status=${content.status}`);
console.log(`walrus_blob_id=${content.walrus_blob_id}`);
console.log(`evidence_hash=${content.evidence_hash}`);
