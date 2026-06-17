/**
 * TradeProof Demurrage Demo
 *
 * Demonstrates the on-chain demurrage dispute resolution flow for the
 * EAC corridor (Mombasa Port → Nairobi ICD).
 *
 * The same arithmetic used here is the exact on-chain function:
 *   logioracle::container::calculate_demurrage(gate_in_ms, free_days, rate_per_day, current_ms)
 *
 * When both parties use on-chain timestamps, the calculation is identical
 * for both — no dispute possible.
 *
 * Usage:
 *   node scripts/demurrage-demo.js
 *   node scripts/demurrage-demo.js --gate-in "2026-06-01" --free-days 14 --rate 150 --current "2026-06-20"
 */

import { parseArgs } from 'node:util';

const PACKAGE_V1 = '0x26374b0a84b30d54f8860808f37d66d9b2225ac96350fffa27469c585a0fd3e7';
const DAY_MS = 86_400_000n;

// ── Parse CLI args ────────────────────────────────────────────────────────────

const { values } = parseArgs({
    options: {
        'gate-in':    { type: 'string', default: '2026-06-01' },
        'gate-in-ms': { type: 'string', default: '' },  // on-chain ms timestamp (overrides --gate-in)
        'free-days':  { type: 'string', default: '14' },
        'rate':       { type: 'string', default: '150' },    // USD per container per day
        'current':    { type: 'string', default: '' },       // defaults to today
        'containers': { type: 'string', default: '1' },
        'iso-id':     { type: 'string', default: 'MSCU1234567' },
        'object-id':  { type: 'string', default: '' },  // on-chain container object ID for reference
    },
    allowPositionals: false,
});

const gateInDate  = values['gate-in-ms']
    ? new Date(Number(values['gate-in-ms']))
    : new Date(values['gate-in']);
const currentDate = values['current'] ? new Date(values['current']) : new Date();
const freeDays    = BigInt(values['free-days']);
const rateUsd     = BigInt(values['rate']);
const containers  = BigInt(values['containers']);
const isoId       = values['iso-id'];

const gateInMs  = BigInt(gateInDate.getTime());
const currentMs = BigInt(currentDate.getTime());

// ── Mirror of on-chain calculate_demurrage() ──────────────────────────────────

function calculateDemurrage(gateInMs, freeDays, ratePerDay, currentMs) {
    const freePeriodMs = freeDays * DAY_MS;
    if (currentMs <= gateInMs + freePeriodMs) return 0n;
    const overdueMs = currentMs - gateInMs - freePeriodMs;
    const days = overdueMs / DAY_MS;
    return days * ratePerDay;
}

const daysElapsed  = (currentMs - gateInMs) / DAY_MS;
const daysOverdue  = daysElapsed > freeDays ? daysElapsed - freeDays : 0n;
const perContainer = calculateDemurrage(gateInMs, freeDays, rateUsd, currentMs);
const totalOwed    = perContainer * containers;

// ── Report ────────────────────────────────────────────────────────────────────

const sep = '─'.repeat(64);

console.log(`\n${'═'.repeat(64)}`);
console.log('  TradeProof — Demurrage Dispute Resolution');
console.log('  EAC Corridor (Mombasa Port)');
console.log(`${'═'.repeat(64)}`);

console.log(`\n  Container:       ${isoId}`);
console.log(`  Gate In:         ${gateInDate.toDateString()}`);
console.log(`  Current Date:    ${currentDate.toDateString()}`);
console.log(`  Days at Port:    ${daysElapsed}`);
console.log(`  Free Days:       ${freeDays}`);
console.log(`  Rate:            $${rateUsd}/container/day`);
console.log(`  Containers:      ${containers}`);

console.log(`\n${sep}`);

if (daysOverdue === 0n) {
    console.log(`  Status:          WITHIN FREE PERIOD — no demurrage owed`);
    console.log(`  Days Remaining:  ${freeDays - daysElapsed} free days left`);
} else {
    console.log(`  Status:          DEMURRAGE ACCRUING`);
    console.log(`  Days Overdue:    ${daysOverdue}`);
    console.log(`  Per Container:   $${perContainer.toLocaleString()}`);
    console.log(`  TOTAL OWED:      $${totalOwed.toLocaleString()}`);
}

console.log(`\n${sep}`);
console.log(`  On-Chain Verification`);
console.log(sep);
console.log(`  Package:         ${PACKAGE_V1}`);
console.log(`  Function:        ${PACKAGE_V1}::container::calculate_demurrage`);
console.log(`  gate_in_ms:      ${gateInMs}`);
console.log(`  free_days:       ${freeDays}`);
console.log(`  rate_per_day:    ${rateUsd}`);
console.log(`  current_ms:      ${currentMs}`);
console.log(`  Result:          ${perContainer} USD per container`);

console.log(`\n${sep}`);
console.log(`  How This Eliminates the Dispute`);
console.log(sep);
console.log(`
  Traditional process:
    Shipping line: "Container arrived on ${gateInDate.toDateString()}"
    Shipper:       "We have it as ${new Date(gateInDate.getTime() + 2 * Number(DAY_MS)).toDateString()} — you owe us 2 days"
    Result:        Months of emails, legal threats, relationship damage

  On-chain process:
    Both parties read ContainerGateIn event timestamp from Sui
    Both run calculate_demurrage() — identical inputs, identical result
    Result:        Same number, both sides, no dispute possible
`);

console.log(`  Next Steps for a Real Pilot:`);
console.log(`  1. Shipping line records GateIn on testnet:`);
console.log(`     sui client call --package ${PACKAGE_V1} \\`);
console.log(`       --module container --function gate_in \\`);
console.log(`       --args <container-object-id> "Mombasa Port" <clock-id>`);
console.log(`  2. Both parties bookmark the Sui Explorer link`);
console.log(`  3. When free period expires, anyone can run calculate_demurrage()`);
console.log(`  4. The number is the same for both. Always.\n`);

// ── Write proof artifact ──────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..');
const artifactsDir = join(repoRoot, 'artifacts', 'demurrage');
mkdirSync(artifactsDir, { recursive: true });

const record = {
    generated_at:      new Date().toISOString(),
    container_iso_id:  isoId,
    ...(values['object-id'] ? { container_object_id: values['object-id'] } : {}),
    gate_in_date:      gateInDate.toISOString(),
    current_date:      currentDate.toISOString(),
    gate_in_ms:        gateInMs.toString(),
    current_ms:        currentMs.toString(),
    free_days:         freeDays.toString(),
    rate_usd_per_day:  rateUsd.toString(),
    containers:        containers.toString(),
    days_elapsed:      daysElapsed.toString(),
    days_overdue:      daysOverdue.toString(),
    demurrage_per_container_usd: perContainer.toString(),
    total_demurrage_usd: totalOwed.toString(),
    package:           PACKAGE_V1,
    function:          'logioracle::container::calculate_demurrage',
    status:            daysOverdue > 0n ? 'DEMURRAGE_ACCRUING' : 'WITHIN_FREE_PERIOD',
};

const outPath = join(artifactsDir, `${isoId}-${gateInDate.toISOString().slice(0,10)}.json`);
writeFileSync(outPath, JSON.stringify(record, null, 2));
console.log(`  Proof record saved: ${outPath}\n`);
