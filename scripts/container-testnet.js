/**
 * container-testnet.js
 *
 * End-to-end demurrage pilot on Sui Testnet.
 *
 * What this does:
 *   1. Registers a Container object on-chain (shipping line creates the Digital ID)
 *   2. Calls gate_in() — records the terminal entry timestamp on-chain
 *   3. Reads the container object back — confirms last_event_ms is live on-chain
 *   4. Calculates demurrage using that exact timestamp (same formula as the contract)
 *   5. Saves a proof artifact — both parties can verify the same number
 *
 * Usage:
 *   node scripts/container-testnet.js
 *   node scripts/container-testnet.js --iso-id MSCU9999999 --free-days 14 --rate 150
 *
 * The proof artifact is saved to:
 *   artifacts/demurrage/<iso-id>-testnet.json
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const suiCli   = join(dirname(repoRoot), 'MilanGPT-OS', '.tools', 'sui', 'sui.exe');

const PACKAGE    = '0xdf6082e26679444b163801398b7ab49654c5d2f4922db5512fe2760eca248aa0';
const CLOCK_ID   = '0x0000000000000000000000000000000000000000000000000000000000000006';
const GAS_BUDGET = '50000000';
const DAY_MS     = 86_400_000n;

// ── CLI args ──────────────────────────────────────────────────────────────────

const { values } = parseArgs({
    options: {
        'iso-id':     { type: 'string', default: 'MSCU9999999' },
        'size-type':  { type: 'string', default: '40HC' },
        'operator':   { type: 'string', default: 'MSC Mediterranean Shipping Company' },
        'port':       { type: 'string', default: 'KE MBA' },
        'year':       { type: 'string', default: '2020' },
        'free-days':  { type: 'string', default: '14' },
        'rate':       { type: 'string', default: '150' },
    },
    allowPositionals: false,
});

const isoId    = values['iso-id'];
const sizeType = values['size-type'];
const operator = values['operator'];
const port     = values['port'];
const year     = values['year'];
const freeDays = BigInt(values['free-days']);
const rate     = BigInt(values['rate']);

// ── Helpers ───────────────────────────────────────────────────────────────────

const sep  = '─'.repeat(64);

function sui(args) {
    const result = spawnSync(suiCli, args, { encoding: 'utf8', cwd: repoRoot });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        process.stderr.write(result.stderr || '');
        throw new Error(`sui exited with code ${result.status}`);
    }
    try {
        return JSON.parse(result.stdout);
    } catch {
        return result.stdout;
    }
}

function findCreatedObject(tx, moduleHint) {
    const changes = tx.objectChanges ?? [];
    const created = changes.find(c =>
        c.type === 'created' && typeof c.objectType === 'string' &&
        c.objectType.includes(moduleHint)
    );
    if (!created) throw new Error(`No created ${moduleHint} object found in tx output`);
    return created.objectId;
}

function mirrorCalculateDemurrage(gateInMs, freeDays, ratePerDay, currentMs) {
    const freePeriodMs = freeDays * DAY_MS;
    if (currentMs <= gateInMs + freePeriodMs) return 0n;
    const overdueMs = currentMs - gateInMs - freePeriodMs;
    const days = overdueMs / DAY_MS;
    return days * ratePerDay;
}

// ── Step 0: get active address ────────────────────────────────────────────────

console.log(`\n${'═'.repeat(64)}`);
console.log('  TradeProof — Container Digital ID Testnet Pilot');
console.log('  EAC Corridor · Mombasa Port Demurrage');
console.log(`${'═'.repeat(64)}\n`);

const activeAddr = (() => {
    const r = spawnSync(suiCli, ['client', 'active-address'], { encoding: 'utf8', cwd: repoRoot });
    return r.stdout.trim();
})();

console.log(`  Operator address: ${activeAddr}`);
console.log(`  Package:          ${PACKAGE}`);
console.log(`  Container:        ${isoId} (${sizeType})`);
console.log(`  Port:             ${port}`);

// ── Step 1: register_and_transfer ─────────────────────────────────────────────

console.log(`\n${sep}`);
console.log('  Step 1 — Register Container on Sui Testnet');
console.log(sep);

const registerTx = sui([
    'client', 'call',
    '--package', PACKAGE,
    '--module', 'container',
    '--function', 'register_and_transfer',
    '--args', isoId, sizeType, operator, port, year, activeAddr, CLOCK_ID,
    '--gas-budget', GAS_BUDGET,
    '--json',
]);

if (registerTx.effects?.status?.status !== 'success') {
    throw new Error(`register_and_transfer failed: ${JSON.stringify(registerTx.effects?.status)}`);
}

const containerObjectId = findCreatedObject(registerTx, '::container::Container');
const registerDigest    = registerTx.digest;

console.log(`  Container object: ${containerObjectId}`);
console.log(`  Tx digest:        ${registerDigest}`);
console.log(`  Explorer: https://testnet.suivision.xyz/object/${containerObjectId}`);

// ── Step 2: gate_in ───────────────────────────────────────────────────────────

console.log(`\n${sep}`);
console.log('  Step 2 — Gate In (container enters port terminal)');
console.log(sep);

const gateInTx = sui([
    'client', 'call',
    '--package', PACKAGE,
    '--module', 'container',
    '--function', 'gate_in',
    '--args', containerObjectId, port, CLOCK_ID,
    '--gas-budget', GAS_BUDGET,
    '--json',
]);

if (gateInTx.effects?.status?.status !== 'success') {
    throw new Error(`gate_in failed: ${JSON.stringify(gateInTx.effects?.status)}`);
}

const gateInDigest = gateInTx.digest;
console.log(`  Gate-in recorded on-chain`);
console.log(`  Tx digest: ${gateInDigest}`);
console.log(`  Tx: https://testnet.suivision.xyz/txblock/${gateInDigest}`);

// ── Step 3: read back the container object ────────────────────────────────────

console.log(`\n${sep}`);
console.log('  Step 3 — Verify On-Chain State');
console.log(sep);

const objectData = sui(['client', 'object', containerObjectId, '--json']);
const fields     = objectData?.content?.fields ?? objectData?.content;

if (!fields) throw new Error('Could not read container object fields');

const gateInMs  = BigInt(fields.last_event_ms);
const status    = Number(fields.status);
const location  = fields.current_location;

console.log(`  iso_id:           ${fields.iso_id}`);
console.log(`  status:           ${status} (GATE_IN = 2)`);
console.log(`  current_location: ${location}`);
console.log(`  last_event_ms:    ${gateInMs} (${new Date(Number(gateInMs)).toISOString()})`);

if (status !== 2) throw new Error(`Expected status 2 (GATE_IN), got ${status}`);

// ── Step 4: calculate demurrage ───────────────────────────────────────────────

console.log(`\n${sep}`);
console.log('  Step 4 — Demurrage Calculation (same formula as on-chain)');
console.log(sep);

const nowMs        = BigInt(Date.now());
const daysElapsed  = (nowMs - gateInMs) / DAY_MS;
const daysOverdue  = daysElapsed > freeDays ? daysElapsed - freeDays : 0n;
const demurrage    = mirrorCalculateDemurrage(gateInMs, freeDays, rate, nowMs);

console.log(`  Gate-in time:     ${new Date(Number(gateInMs)).toUTCString()}`);
console.log(`  Current time:     ${new Date(Number(nowMs)).toUTCString()}`);
console.log(`  Days at port:     ${daysElapsed}`);
console.log(`  Free days:        ${freeDays}`);
console.log(`  Rate:             $${rate}/container/day`);

if (daysOverdue === 0n) {
    console.log(`\n  Status:           WITHIN FREE PERIOD — $0 owed`);
    console.log(`  Days remaining:   ${freeDays - daysElapsed} free days`);
} else {
    console.log(`\n  Status:           DEMURRAGE ACCRUING`);
    console.log(`  Days overdue:     ${daysOverdue}`);
    console.log(`  TOTAL OWED:       $${demurrage}`);
}

// ── Step 5: save proof artifact ───────────────────────────────────────────────

const artifactsDir = join(repoRoot, 'artifacts', 'demurrage');
mkdirSync(artifactsDir, { recursive: true });

const proof = {
    generated_at:       new Date().toISOString(),
    container_iso_id:   isoId,
    container_object_id: containerObjectId,
    package:            PACKAGE,
    register_tx:        registerDigest,
    gate_in_tx:         gateInDigest,
    gate_in_ms:         gateInMs.toString(),
    gate_in_date:       new Date(Number(gateInMs)).toISOString(),
    free_days:          freeDays.toString(),
    rate_usd_per_day:   rate.toString(),
    days_elapsed:       daysElapsed.toString(),
    days_overdue:       daysOverdue.toString(),
    demurrage_usd:      demurrage.toString(),
    status:             daysOverdue > 0n ? 'DEMURRAGE_ACCRUING' : 'WITHIN_FREE_PERIOD',
    on_chain_formula:   `${PACKAGE}::container::calculate_demurrage`,
    explorer_object:    `https://testnet.suivision.xyz/object/${containerObjectId}`,
    explorer_gate_in:   `https://testnet.suivision.xyz/txblock/${gateInDigest}`,
};

const outPath = join(artifactsDir, `${isoId}-testnet.json`);
writeFileSync(outPath, JSON.stringify(proof, null, 2));

console.log(`\n${sep}`);
console.log('  Proof Artifact');
console.log(sep);
console.log(`  Saved: ${outPath}`);
console.log(`\n  This file proves:`);
console.log(`  · Container ${isoId} registered on Sui Testnet`);
console.log(`  · Gate-in timestamp recorded on-chain (immutable)`);
console.log(`  · Demurrage = same calculation both parties can run`);
console.log(`  · No dispute possible — timestamp is on the blockchain\n`);
console.log(`  Object:  https://testnet.suivision.xyz/object/${containerObjectId}`);
console.log(`  Gate-in: https://testnet.suivision.xyz/txblock/${gateInDigest}\n`);
