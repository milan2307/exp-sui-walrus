import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tradeproofDir = join(repoRoot, "artifacts", "tradeproof");
const evidencePath = join(tradeproofDir, "evidence.json");
const manifestPath = join(tradeproofDir, "manifest.json");
const receiptPath = join(tradeproofDir, "walrus-http-receipt.json");
const defaultPublisher = "https://publisher.walrus-testnet.walrus.space";

function parseArgs(argv) {
  const parsed = {
    epochs: "1",
    publisher: process.env.WALRUS_PUBLISHER_URL ?? defaultPublisher,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--publisher") {
      parsed.publisher = argv[++index];
    } else if (arg === "--epochs") {
      parsed.epochs = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
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

function ensureEvidence() {
  if (existsSync(evidencePath) && existsSync(manifestPath)) {
    return;
  }

  const generated = spawnSync(process.execPath, [
    join(repoRoot, "scripts", "create-tradeproof-evidence.js"),
  ], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (generated.status !== 0) {
    process.exit(generated.status ?? 1);
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function extractBlobId(responseJson) {
  return responseJson.newlyCreated?.blobObject?.blobId
    ?? responseJson.alreadyCertified?.blobId;
}

const args = parseArgs(process.argv.slice(2));
ensureEvidence();
mkdirSync(tradeproofDir, { recursive: true });

const evidenceBytes = readFileSync(evidencePath);
const evidenceHash = createHash("sha256").update(evidenceBytes).digest("hex");
const publisher = normalizeBaseUrl(args.publisher);
const uploadUrl = `${publisher}/v1/blobs?epochs=${encodeURIComponent(args.epochs)}`;

console.log("Uploading TradeProof evidence to Walrus HTTP publisher");
console.log(`publisher=${publisher}`);
console.log(`epochs=${args.epochs}`);
console.log(`evidence=${evidencePath}`);
console.log(`evidence_hash=sha256:${evidenceHash}`);

const response = await fetch(uploadUrl, {
  method: "PUT",
  body: evidenceBytes,
  headers: {
    "content-type": "application/json",
  },
});

const responseText = await response.text();
if (!response.ok) {
  throw new Error(`Walrus upload failed: HTTP ${response.status} ${response.statusText}\n${responseText}`);
}

const responseJson = JSON.parse(responseText);
const blobId = extractBlobId(responseJson);
if (!blobId) {
  throw new Error(`Walrus upload response did not include a blob ID:\n${responseText}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.walrus_blob_id = blobId;
manifest.evidence_hash = `sha256:${evidenceHash}`;
manifest.walrus_http_receipt_path = "artifacts/tradeproof/walrus-http-receipt.json";

const receipt = {
  blob_id: blobId,
  evidence_hash: `sha256:${evidenceHash}`,
  publisher,
  epochs: Number(args.epochs),
  uploaded_at: new Date().toISOString(),
  response: responseJson,
};

writeFileSync(manifestPath, `${stableStringify(manifest)}\n`);
writeFileSync(receiptPath, `${stableStringify(receipt)}\n`);

console.log("Walrus HTTP upload completed");
console.log(`Manifest: ${manifestPath}`);
console.log(`Receipt: ${receiptPath}`);
console.log(`walrus_blob_id=${blobId}`);
console.log(`evidence_hash=sha256:${evidenceHash}`);
