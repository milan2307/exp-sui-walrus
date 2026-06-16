import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemWal } from "@mysten-incubation/memwal";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const evidencePath = join(repoRoot, "artifacts", "tradeproof", "evidence.json");
const manifestPath = join(repoRoot, "artifacts", "tradeproof", "manifest.json");
const receiptPath = join(repoRoot, "artifacts", "tradeproof", "memwal-receipt.json");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env before running demo:memwal.`);
  }
  return value;
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

if (!existsSync(evidencePath)) {
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

const evidenceBytes = readFileSync(evidencePath, "utf8");
const evidenceHash = createHash("sha256").update(evidenceBytes).digest("hex");
const serverUrl = process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz";

const memwal = MemWal.create({
  key: requireEnv("MEMWAL_PRIVATE_KEY"),
  accountId: requireEnv("MEMWAL_ACCOUNT_ID"),
  serverUrl,
});

console.log("Uploading TradeProof evidence to MemWal");
console.log(`Evidence: ${evidencePath}`);
console.log(`evidence_hash=sha256:${evidenceHash}`);

const stored = await memwal.rememberAndWait(evidenceBytes, undefined, {
  timeoutMs: 120_000,
});

const recalled = await memwal.recall({
  query: evidenceBytes,
  limit: 1,
});
const recalledText = recalled.results[0]?.text ?? "";
const recallMatched = recalledText === evidenceBytes;

const receipt = {
  evidence_hash: `sha256:${evidenceHash}`,
  id: stored.id,
  job_id: stored.job_id,
  walrus_blob_id: stored.blob_id,
  owner: stored.owner,
  namespace: stored.namespace,
  recall_matched: recallMatched,
  server_url: serverUrl,
  uploaded_at: new Date().toISOString(),
};

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.walrus_blob_id = stored.blob_id;
manifest.evidence_hash = `sha256:${evidenceHash}`;
manifest.memwal_receipt_path = "artifacts/tradeproof/memwal-receipt.json";

writeFileSync(manifestPath, `${stableStringify(manifest)}\n`);
writeFileSync(receiptPath, `${stableStringify(receipt)}\n`);

console.log("MemWal upload completed");
console.log(`Manifest: ${manifestPath}`);
console.log(`Receipt: ${receiptPath}`);
console.log(`walrus_blob_id=${stored.blob_id}`);
console.log(`job_id=${stored.job_id ?? stored.id}`);
console.log(`recall_matched=${recallMatched}`);

if (!recallMatched) {
  throw new Error("MemWal recall did not return the exact uploaded evidence bytes.");
}
