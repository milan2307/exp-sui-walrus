/**
 * file-to-proof.js
 *
 * Full pipeline: any file → Walrus blob → Sui testnet Shipment → verify URL
 *
 * Usage:
 *   node scripts/file-to-proof.js --file <path> --shipment-id <id> --origin <city> --destination <city>
 *   node scripts/file-to-proof.js --file invoice.pdf --shipment-id INV-042 --origin Nairobi --destination London
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactsDir = join(repoRoot, "artifacts", "proofs");
const suiCli = join(dirname(repoRoot), "MilanGPT-OS", ".tools", "sui", "sui.exe");

const PACKAGE_ID = "0x26374b0a84b30d54f8860808f37d66d9b2225ac96350fffa27469c585a0fd3e7";
const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const VERIFY_BASE = "http://127.0.0.1:4174";

function parseArgs(argv) {
  const parsed = { epochs: "1", proofType: "SHIPMENT" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file")          parsed.file = argv[++i];
    else if (a === "--shipment-id") parsed.shipmentId = argv[++i];
    else if (a === "--origin")   parsed.origin = argv[++i];
    else if (a === "--destination") parsed.destination = argv[++i];
    else if (a === "--proof-type")  parsed.proofType = argv[++i];
    else if (a === "--epochs")   parsed.epochs = argv[++i];
    else if (a === "--package")  parsed.packageId = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!parsed.file)        throw new Error("--file <path> is required");
  if (!parsed.shipmentId)  throw new Error("--shipment-id <id> is required");
  if (!parsed.origin)      throw new Error("--origin <city> is required");
  if (!parsed.destination) throw new Error("--destination <city> is required");
  parsed.packageId ??= PACKAGE_ID;
  return parsed;
}

function step(n, label) {
  console.log(`\n[${n}] ${label}`);
}

async function uploadToWalrus(fileBytes, epochs, publisher) {
  const url = `${publisher}/v1/blobs?epochs=${epochs}`;
  const res = await fetch(url, {
    method: "PUT",
    body: fileBytes,
    headers: { "content-type": "application/octet-stream" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Walrus upload failed: HTTP ${res.status}\n${text}`);
  const json = JSON.parse(text);
  const blobId = json.newlyCreated?.blobObject?.blobId ?? json.alreadyCertified?.blobId;
  if (!blobId) throw new Error(`No blob ID in Walrus response:\n${text}`);
  return { blobId, response: json };
}

function createSuiShipment(args, blobId, evidenceHash, recipient) {
  const callArgs = [
    "client", "call",
    "--package", args.packageId,
    "--module", "shipment",
    "--function", "create_and_transfer",
    "--args",
    args.shipmentId,
    args.proofType,
    args.origin,
    args.destination,
    blobId,
    evidenceHash,
    recipient,
    "--gas-budget", "100000000",
    "--json",
  ];

  const result = spawnSync(suiCli, callArgs, { cwd: repoRoot, encoding: "utf8" });
  if (result.error) throw new Error(`Sui CLI error: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Sui call failed:\n${result.stderr}`);

  const json = JSON.parse(result.stdout);
  const digest = json.digest;
  const objectId = json.objectChanges?.find(
    (c) => c.type === "created" && c.objectType?.includes("::shipment::Shipment")
  )?.objectId;

  if (!objectId) throw new Error(`Could not find Shipment object in tx output:\n${result.stdout}`);
  return { digest, objectId };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));

if (!existsSync(args.file)) throw new Error(`File not found: ${args.file}`);

mkdirSync(artifactsDir, { recursive: true });

const fileBytes = readFileSync(args.file);
const evidenceHash = `sha256:${createHash("sha256").update(fileBytes).digest("hex")}`;
const fileName = basename(args.file);

console.log("TradeProof file-to-proof pipeline");
console.log(`file=${args.file} (${fileBytes.length} bytes)`);
console.log(`shipment_id=${args.shipmentId}`);
console.log(`route=${args.origin} → ${args.destination}`);
console.log(`evidence_hash=${evidenceHash}`);

// Step 1 — Upload to Walrus
step(1, "Uploading evidence to Walrus testnet");
const { blobId, response: walrusResponse } = await uploadToWalrus(fileBytes, args.epochs, WALRUS_PUBLISHER);
console.log(`walrus_blob_id=${blobId}`);

// Step 2 — Get active Sui address
step(2, "Resolving Sui signer address");
const addrResult = spawnSync(suiCli, ["client", "active-address"], { encoding: "utf8" });
const recipient = addrResult.stdout.trim();
if (!recipient) throw new Error("Could not read Sui active address");
console.log(`signer=${recipient}`);

// Step 3 — Create Shipment on Sui testnet
step(3, "Creating Shipment proof on Sui testnet");
const { digest, objectId } = createSuiShipment(args, blobId, evidenceHash, recipient);
console.log(`tx_digest=${digest}`);
console.log(`shipment_object=${objectId}`);

// Step 4 — Write proof record
step(4, "Writing proof record");
const proofRecord = {
  shipment_id: args.shipmentId,
  proof_type: args.proofType,
  origin: args.origin,
  destination: args.destination,
  file: args.file,
  file_bytes: fileBytes.length,
  evidence_hash: evidenceHash,
  walrus_blob_id: blobId,
  package_id: args.packageId,
  shipment_object: objectId,
  tx_digest: digest,
  created_at: new Date().toISOString(),
  verify_url: `${VERIFY_BASE}/?object=${objectId}`,
};

const recordPath = join(artifactsDir, `${args.shipmentId.replace(/[^a-z0-9]/gi, "-")}.json`);
writeFileSync(recordPath, JSON.stringify(proofRecord, null, 2) + "\n");

// Step 5 — Print summary
console.log("\n─────────────────────────────────────────");
console.log("TradeProof created");
console.log(`shipment_id=${args.shipmentId}`);
console.log(`route=${args.origin} → ${args.destination}`);
console.log(`walrus_blob_id=${blobId}`);
console.log(`evidence_hash=${evidenceHash}`);
console.log(`shipment_object=${objectId}`);
console.log(`verify_url=${VERIFY_BASE}/?object=${objectId}`);
console.log(`proof_record=${recordPath}`);
console.log("─────────────────────────────────────────");
console.log("\nTo verify: npm run verify  →  open the verify_url above");
