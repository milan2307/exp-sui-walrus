import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repoRoot, "artifacts", "tradeproof", "manifest.json");
const defaultOutputPath = join(repoRoot, "artifacts", "tradeproof", "walrus-readback.json");
const defaultAggregator = "https://aggregator.walrus-testnet.walrus.space";

function parseArgs(argv) {
  const parsed = {
    aggregator: process.env.WALRUS_AGGREGATOR_URL ?? defaultAggregator,
    attempts: 1,
    output: defaultOutputPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--aggregator") {
      parsed.aggregator = argv[++index];
    } else if (arg === "--blob-id") {
      parsed.blobId = argv[++index];
    } else if (arg === "--attempts") {
      parsed.attempts = Number(argv[++index]);
    } else if (arg === "--output") {
      parsed.output = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function fetchBlob(blobId, aggregator, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const url = `${aggregator}/v1/blobs/${encodeURIComponent(blobId)}${attempt > 1 ? `?cb=${Date.now()}` : ""}`;
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    const responseText = await response.text();
    lastError = new Error(`Walrus read failed: HTTP ${response.status} ${response.statusText}\n${responseText}`);
    if (response.status !== 404 || attempt === attempts) {
      throw lastError;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
  }

  throw lastError ?? new Error(`Walrus read failed for blob ${blobId}`);
}

const args = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const blobId = args.blobId ?? manifest.walrus_blob_id;
if (!blobId || blobId.startsWith("pending-walrus-upload:")) {
  throw new Error("Missing a real Walrus blob ID. Run npm run walrus:upload first.");
}

const aggregator = normalizeBaseUrl(args.aggregator);
const bytes = await fetchBlob(blobId, aggregator, args.attempts);

mkdirSync(dirname(args.output), { recursive: true });
writeFileSync(args.output, bytes);

console.log("Walrus HTTP read completed");
console.log(`aggregator=${aggregator}`);
console.log(`walrus_blob_id=${blobId}`);
console.log(`bytes=${bytes.length}`);
console.log(`output=${args.output}`);
