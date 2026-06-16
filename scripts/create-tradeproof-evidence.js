import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(repoRoot, "artifacts", "tradeproof");
const evidencePath = join(outputDir, "evidence.json");
const manifestPath = join(outputDir, "manifest.json");
const receiptPath = join(outputDir, "memwal-receipt.json");

const evidence = {
  proof_type: "SHIPMENT",
  shipment_id: "SHIP-001",
  invoice_id: "INV-001",
  origin: "Nairobi",
  destination: "Mombasa",
  carrier: "LogiOracle Demo Carrier",
  status: "CREATED",
  issued_at: "2026-06-16T00:00:00.000Z",
  documents: [
    {
      name: "commercial-invoice.pdf",
      media_type: "application/pdf",
      bytes: 247392,
    },
    {
      name: "bill-of-lading.pdf",
      media_type: "application/pdf",
      bytes: 184221,
    },
  ],
};

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

mkdirSync(outputDir, { recursive: true });

const evidenceBytes = `${stableStringify(evidence)}\n`;
const evidenceHash = createHash("sha256").update(evidenceBytes).digest("hex");
const existingReceipt = existsSync(receiptPath)
  ? JSON.parse(readFileSync(receiptPath, "utf8"))
  : undefined;
const walrusBlobId =
  process.env.WALRUS_BLOB_ID ??
  existingReceipt?.walrus_blob_id ??
  `pending-walrus-upload:${evidenceHash.slice(0, 16)}`;

const manifest = {
  move_package: "logioracle",
  move_module: "logioracle::shipment",
  proof_type: evidence.proof_type,
  shipment_id: evidence.shipment_id,
  walrus_blob_id: walrusBlobId,
  evidence_hash: `sha256:${evidenceHash}`,
  evidence_path: "artifacts/tradeproof/evidence.json",
};

if (existingReceipt?.walrus_blob_id === walrusBlobId) {
  manifest.memwal_receipt_path = "artifacts/tradeproof/memwal-receipt.json";
}

writeFileSync(evidencePath, evidenceBytes);
writeFileSync(manifestPath, `${stableStringify(manifest)}\n`);

console.log("TradeProof evidence generated");
console.log(`Evidence: ${evidencePath}`);
console.log(`Manifest: ${manifestPath}`);
console.log(`proof_type=${manifest.proof_type}`);
console.log(`walrus_blob_id=${manifest.walrus_blob_id}`);
console.log(`evidence_hash=${manifest.evidence_hash}`);
