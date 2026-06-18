import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tradeproofDir = join(repoRoot, "artifacts", "tradeproof");
const manifestPath = join(tradeproofDir, "manifest.json");
const readbackPath = join(tradeproofDir, "walrus-readback.json");
const verificationPath = join(tradeproofDir, "walrus-http-verification.json");
const defaultAggregator = "https://aggregator.walrus-testnet.walrus.space";

function parseArgs(argv) {
  const parsed = {
    aggregator: process.env.WALRUS_AGGREGATOR_URL ?? defaultAggregator,
    attempts: 6,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--aggregator") {
      parsed.aggregator = argv[++index];
    } else if (arg === "--attempts") {
      parsed.attempts = Number(argv[++index]);
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

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function fetchBlob(blobId, aggregator, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const cacheBust = attempt > 1 ? `?cb=${Date.now()}` : "";
    const response = await fetch(`${aggregator}/v1/blobs/${encodeURIComponent(blobId)}${cacheBust}`, {
      cache: "no-store",
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    const responseText = await response.text();
    lastError = new Error(`Walrus verify read failed: HTTP ${response.status} ${response.statusText}\n${responseText}`);
    if (response.status !== 404 || attempt === attempts) {
      throw lastError;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
  }

  throw lastError ?? new Error(`Walrus verify failed to read blob ${blobId}`);
}

const args = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const blobId = manifest.walrus_blob_id;
if (!blobId || blobId.startsWith("pending-walrus-upload:")) {
  throw new Error("Missing a real Walrus blob ID. Run npm run walrus:upload first.");
}

const aggregator = normalizeBaseUrl(args.aggregator);
const bytes = await fetchBlob(blobId, aggregator, args.attempts);
const readbackHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

if (readbackHash !== manifest.evidence_hash) {
  throw new Error(`Walrus evidence hash mismatch: expected ${manifest.evidence_hash}, got ${readbackHash}`);
}

mkdirSync(tradeproofDir, { recursive: true });
writeFileSync(readbackPath, bytes);
writeFileSync(
  verificationPath,
  `${stableStringify({
    aggregator,
    bytes: bytes.length,
    evidence_hash: readbackHash,
    manifest_path: "artifacts/tradeproof/manifest.json",
    readback_path: "artifacts/tradeproof/walrus-readback.json",
    verified_at: new Date().toISOString(),
    walrus_blob_id: blobId,
  })}\n`
);

console.log("Walrus HTTP evidence verified");
console.log(`aggregator=${aggregator}`);
console.log(`walrus_blob_id=${blobId}`);
console.log(`bytes=${bytes.length}`);
console.log(`evidence_hash=${readbackHash}`);
console.log(`readback=${readbackPath}`);
console.log(`verification=${verificationPath}`);
