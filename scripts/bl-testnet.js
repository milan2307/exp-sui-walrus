/**
 * bl-testnet.js
 *
 * Issues a DCSA eBL 3.0 compliant Bill of Lading NFT on Sui Testnet.
 * The BL is an owned object — only the holder can endorse or surrender it.
 * Holder rights are enforced by the Sui network, not by any platform.
 *
 * Usage:
 *   node scripts/bl-testnet.js
 *   node scripts/bl-testnet.js --bl-number BL-SPX-2026-001 --consignee 0x... --pol "KE MBA" --pod "GB FXT"
 *
 * Defaults simulate a Mombasa → Felixstowe Speedex coffee shipment.
 */

import { spawnSync }   from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs }   from 'node:util';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const suiCli   = join(dirname(repoRoot), 'MilanGPT-OS', '.tools', 'sui', 'sui.exe');

const PACKAGE    = '0xdf6082e26679444b163801398b7ab49654c5d2f4922db5512fe2760eca248aa0';
const CLOCK_ID   = '0x0000000000000000000000000000000000000000000000000000000000000006';
const GAS_BUDGET = '80000000';
const EXPLORER   = 'https://testnet.suivision.xyz';

// ── CLI args ──────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    'bl-number':    { type: 'string', default: 'BL-SPX-2026-001' },
    'bl-type':      { type: 'string', default: '1' },       // 0=STRAIGHT 1=TO_ORDER 2=BEARER
    'carrier-scac': { type: 'string', default: 'MSCU' },
    'vessel':       { type: 'string', default: 'MSC AURORA' },
    'voyage':       { type: 'string', default: 'AW216N' },
    'place-of-receipt':   { type: 'string', default: 'KE NBO' },  // Nairobi ICD
    'pol':          { type: 'string', default: 'KE MBA' },   // Mombasa Port
    'pod':          { type: 'string', default: 'GB FXT' },   // Felixstowe
    'place-of-delivery':  { type: 'string', default: 'GB BHM' },  // Birmingham
    'sob-date-ms':  { type: 'string', default: String(Date.now()) }, // shipped on board
    'consignee':    { type: 'string', default: '' },          // defaults to active address
    'notify-party': { type: 'string', default: 'Speedex Logistics notify party' },
    'cargo':        { type: 'string', default: '500 x 60kg bags of green coffee beans' },
    'hs-code':      { type: 'string', default: '0901.11' },  // green coffee
    'weight-kg':    { type: 'string', default: '30000' },
    'containers':   { type: 'string', default: '1' },
    'freight-terms':{ type: 'string', default: '0' },        // 0=PREPAID 1=COLLECT
    'walrus-blob':  { type: 'string', default: 'pending-walrus-upload' },
    'evidence-hash':{ type: 'string', default: 'sha256:pending' },
    'seal-id':      { type: 'string', default: '' },         // Seal AllowList object ID (or "")
    'is-encrypted': { type: 'boolean', default: false },     // true = Walrus blob is Seal-encrypted
  },
  allowPositionals: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const W   = Math.min(process.stdout.columns || 70, 80);
const sep = '─'.repeat(W);
const dbl = '═'.repeat(W);

function sui(args) {
  const r = spawnSync(suiCli, args, { encoding: 'utf8', cwd: repoRoot });
  if (r.error) throw r.error;
  if (r.status !== 0) { process.stderr.write(r.stderr || ''); throw new Error(`sui exit ${r.status}`); }
  try { return JSON.parse(r.stdout); } catch { return r.stdout; }
}

function activeAddress() {
  const r = spawnSync(suiCli, ['client', 'active-address'], { encoding: 'utf8', cwd: repoRoot });
  return r.stdout.trim();
}

function findCreated(tx, module) {
  return (tx.objectChanges ?? []).find(c =>
    c.type === 'created' && typeof c.objectType === 'string' && c.objectType.includes(module)
  )?.objectId;
}

// ── BL type labels ────────────────────────────────────────────────────────────

const BL_TYPE_LABELS = { '0': 'STRAIGHT (non-negotiable)', '1': 'TO ORDER (negotiable)', '2': 'BEARER' };
const FREIGHT_LABELS = { '0': 'PREPAID', '1': 'COLLECT' };

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n' + dbl);
console.log('  TradeProof — Issue DCSA eBL 3.0 Bill of Lading on Sui Testnet');
console.log(dbl);

const shipper   = activeAddress();
const consignee = values['consignee'] || shipper;  // default: issue to self for demo

console.log(`\n  Shipper:    ${shipper}`);
console.log(`  Consignee:  ${consignee}`);
console.log(`  BL Number:  ${values['bl-number']}`);
console.log(`  BL Type:    ${BL_TYPE_LABELS[values['bl-type']] ?? values['bl-type']}`);
console.log(`  Vessel:     ${values['vessel']} / Voyage ${values['voyage']}`);
console.log(`  Route:      ${values['place-of-receipt']} → ${values['pol']} → ${values['pod']} → ${values['place-of-delivery']}`);
console.log(`  Cargo:      ${values['cargo']}`);
console.log(`  HS Code:    ${values['hs-code']}`);
console.log(`  Weight:     ${Number(values['weight-kg']).toLocaleString()} kg`);
console.log(`  Freight:    ${FREIGHT_LABELS[values['freight-terms']] ?? values['freight-terms']}`);

// ── Issue the BL ──────────────────────────────────────────────────────────────

console.log('\n' + sep);
console.log('  Issuing Bill of Lading on Sui Testnet…');
console.log(sep);

const issueTx = sui([
  'client', 'call',
  '--package', PACKAGE,
  '--module', 'bill_of_lading',
  '--function', 'issue',
  '--args',
    values['bl-number'],
    values['bl-type'],
    values['carrier-scac'],
    values['vessel'],
    values['voyage'],
    values['place-of-receipt'],
    values['pol'],
    values['pod'],
    values['place-of-delivery'],
    values['sob-date-ms'],
    consignee,
    values['notify-party'],
    values['cargo'],
    values['hs-code'],
    values['weight-kg'],
    values['containers'],
    values['freight-terms'],
    values['walrus-blob'],
    values['evidence-hash'],
    values['seal-id'],
    String(values['is-encrypted']),   // bool as string for CLI
  '--gas-budget', GAS_BUDGET,
  '--json',
]);

if (issueTx.effects?.status?.status !== 'success') {
  throw new Error(`issue() failed: ${JSON.stringify(issueTx.effects?.status)}`);
}

// The BL is transferred to the consignee — find it in objectChanges
const blId     = findCreated(issueTx, '::bill_of_lading::BillOfLading');
const txDigest = issueTx.digest;

if (!blId) throw new Error('BL object ID not found in transaction output');

console.log(`  BL issued successfully`);
console.log(`  BL Object:  ${blId}`);
console.log(`  Tx Digest:  ${txDigest}`);
console.log(`  Explorer:   ${EXPLORER}/object/${blId}`);

// ── Read back ─────────────────────────────────────────────────────────────────

console.log('\n' + sep);
console.log('  Verify On-Chain State');
console.log(sep);

const obj    = sui(['client', 'object', blId, '--json']);
const fields = obj?.content?.fields;

if (fields) {
  console.log(`  bl_number:            ${fields.bl_number}`);
  console.log(`  bl_type:              ${fields.bl_type} — ${BL_TYPE_LABELS[String(fields.bl_type)]}`);
  console.log(`  carrier_scac:         ${fields.carrier_scac}`);
  console.log(`  vessel:               ${fields.vessel}  /  ${fields.voyage}`);
  console.log(`  place_of_receipt:     ${fields.place_of_receipt}`);
  console.log(`  port_of_loading:      ${fields.port_of_loading}`);
  console.log(`  port_of_discharge:    ${fields.port_of_discharge}`);
  console.log(`  place_of_delivery:    ${fields.place_of_delivery}`);
  console.log(`  hs_code:              ${fields.hs_code}`);
  console.log(`  gross_weight_kg:      ${Number(fields.gross_weight_kg).toLocaleString()} kg`);
  console.log(`  container_count:      ${fields.container_count}`);
  console.log(`  freight_terms:        ${FREIGHT_LABELS[String(fields.freight_terms)]}`);
  console.log(`  status:               ${fields.status} — ISSUED`);
  console.log(`  shipper:              ${fields.shipper}`);
}

// ── Save proof artifact ───────────────────────────────────────────────────────

const artifactsDir = join(repoRoot, 'artifacts', 'bl');
mkdirSync(artifactsDir, { recursive: true });

const proof = {
  generated_at:        new Date().toISOString(),
  bl_number:           values['bl-number'],
  bl_object_id:        blId,
  issue_tx:            txDigest,
  package:             PACKAGE,
  shipper,
  consignee,
  bl_type:             values['bl-type'],
  carrier_scac:        values['carrier-scac'],
  vessel:              values['vessel'],
  voyage:              values['voyage'],
  place_of_receipt:    values['place-of-receipt'],
  port_of_loading:     values['pol'],
  port_of_discharge:   values['pod'],
  place_of_delivery:   values['place-of-delivery'],
  shipped_on_board_ms: values['sob-date-ms'],
  cargo:               values['cargo'],
  hs_code:             values['hs-code'],
  gross_weight_kg:     values['weight-kg'],
  container_count:     values['containers'],
  freight_terms:       values['freight-terms'],
  walrus_blob_id:      values['walrus-blob'],
  evidence_hash:       values['evidence-hash'],
  explorer:            `${EXPLORER}/object/${blId}`,
  verify_url:          `http://127.0.0.1:4174/verify/?object=${blId}`,
};

const outPath = join(artifactsDir, `${values['bl-number']}.json`);
writeFileSync(outPath, JSON.stringify(proof, null, 2));

console.log('\n' + sep);
console.log('  Bill of Lading Summary');
console.log(sep);
console.log(`
  BL Number:  ${values['bl-number']}
  Object ID:  ${blId}
  Status:     ISSUED — held by consignee
  Route:      ${values['pol']} → ${values['pod']}
  Cargo:      ${values['cargo']}
  HS Code:    ${values['hs-code']}

  The consignee is the Sui object owner.
  Only they can call endorse() or surrender().
  No platform controls this — the Sui network enforces holder rights.

  Explorer:   ${EXPLORER}/object/${blId}
  Verify:     http://127.0.0.1:4174/verify/?object=${blId}
  Artifact:   ${outPath}
`);
