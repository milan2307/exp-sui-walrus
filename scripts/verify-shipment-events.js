import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultProofPath = join(repoRoot, "artifacts", "tradeproof", "events-proof.json");
const suiCli = join(
  dirname(repoRoot),
  "MilanGPT-OS",
  ".tools",
  "sui",
  "sui.exe"
);

function parseArgs(argv) {
  const parsed = {
    expectedStatus: "DELIVERED",
    proofPath: defaultProofPath,
    shipmentId: "SHIP-001",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--package") {
      parsed.packageId = argv[++index];
    } else if (arg === "--create-digest") {
      parsed.createDigest = argv[++index];
    } else if (arg === "--status-digest") {
      parsed.statusDigest = argv[++index];
    } else if (arg === "--shipment-id") {
      parsed.shipmentId = argv[++index];
    } else if (arg === "--status") {
      parsed.expectedStatus = argv[++index];
    } else if (arg === "--env") {
      parsed.clientEnv = argv[++index];
    } else if (arg === "--proof") {
      parsed.proofPath = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireArg(args, key, label) {
  if (!args[key]) {
    throw new Error(`Missing ${label}.`);
  }
}

function readTransactionBlock(args, digest) {
  const commandArgs = ["client"];
  if (args.clientEnv) {
    commandArgs.push("--client.env", args.clientEnv);
  }
  commandArgs.push("tx-block", digest, "--json");

  const result = spawnSync(suiCli, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(`Could not read transaction ${digest}: ${details}`);
  }

  return JSON.parse(result.stdout);
}

function eventType(packageId, name) {
  return `${packageId}::shipment::${name}`;
}

function findEvent(txBlock, type) {
  return (txBlock.events ?? []).find((event) => event.type === type);
}

function requireEvent(txBlock, type, digest) {
  const event = findEvent(txBlock, type);
  if (!event) {
    throw new Error(`Missing event ${type} in transaction ${digest}.`);
  }
  if (!event.parsedJson) {
    throw new Error(`Event ${type} in transaction ${digest} has no parsedJson payload.`);
  }
  return event;
}

function requireEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

const args = parseArgs(process.argv.slice(2));
requireArg(args, "packageId", "--package <published-package-id>");
requireArg(args, "createDigest", "--create-digest <tx-digest>");
requireArg(args, "statusDigest", "--status-digest <tx-digest>");

const createdType = eventType(args.packageId, "ShipmentCreated");
const statusType = eventType(args.packageId, "ShipmentStatusUpdated");

let created;
let updated;
let proofSource = "localnet";

try {
  const createTx = readTransactionBlock(args, args.createDigest);
  const statusTx = readTransactionBlock(args, args.statusDigest);

  created = requireEvent(createTx, createdType, args.createDigest);
  updated = requireEvent(statusTx, statusType, args.statusDigest);

  mkdirSync(dirname(args.proofPath), { recursive: true });
  writeFileSync(
    args.proofPath,
    `${JSON.stringify(
      {
        package_id: args.packageId,
        env: args.clientEnv ?? null,
        shipment_id: args.shipmentId,
        create_digest: args.createDigest,
        status_digest: args.statusDigest,
        created_event: created,
        status_event: updated,
      },
      null,
      2
    )}\n`
  );
} catch (error) {
  if (!existsSync(args.proofPath)) {
    throw error;
  }

  const proof = JSON.parse(readFileSync(args.proofPath, "utf8"));
  requireEqual("proof.package_id", proof.package_id, args.packageId);
  requireEqual("proof.create_digest", proof.create_digest, args.createDigest);
  requireEqual("proof.status_digest", proof.status_digest, args.statusDigest);
  requireEqual("proof.shipment_id", proof.shipment_id, args.shipmentId);

  created = proof.created_event;
  updated = proof.status_event;
  proofSource = args.proofPath;
}

requireEqual("created.type", created.type, createdType);
requireEqual("updated.type", updated.type, statusType);
requireEqual("created.shipment_id", created.parsedJson.shipment_id, args.shipmentId);
requireEqual("created.status", created.parsedJson.status, "CREATED");
requireEqual("updated.shipment_id", updated.parsedJson.shipment_id, args.shipmentId);
requireEqual("updated.old_status", updated.parsedJson.old_status, "CREATED");
requireEqual("updated.new_status", updated.parsedJson.new_status, args.expectedStatus);

console.log("Shipment lifecycle events verified");
console.log(`package=${args.packageId}`);
if (args.clientEnv) {
  console.log(`env=${args.clientEnv}`);
}
console.log(`proof_source=${proofSource}`);
console.log(`shipment_id=${args.shipmentId}`);
console.log(`created_tx=${args.createDigest}`);
console.log(`created_event=${created.type}`);
console.log(`status_tx=${args.statusDigest}`);
console.log(`status_event=${updated.type}`);
console.log(`old_status=${updated.parsedJson.old_status}`);
console.log(`new_status=${updated.parsedJson.new_status}`);
