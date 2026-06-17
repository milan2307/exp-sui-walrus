/**
 * speedex-demo.js
 *
 * Interactive terminal demo for Speedex Logistics.
 * Press ENTER to advance each section.
 *
 * Usage:
 *   node scripts/speedex-demo.js
 */

import { createInterface } from 'node:readline';
import { spawnSync }        from 'node:child_process';
import { readFileSync }     from 'node:fs';
import { dirname, join }    from 'node:path';
import { fileURLToPath }    from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const suiCli   = join(dirname(repoRoot), 'MilanGPT-OS', '.tools', 'sui', 'sui.exe');

// ── Live testnet data ─────────────────────────────────────────────────────────

const PACKAGE          = '0x26374b0a84b30d54f8860808f37d66d9b2225ac96350fffa27469c585a0fd3e7';
const CONTAINER_ID     = '0x52071cbb1f4e10eb9ba80c3f36006ec5e95fa31a4c2f28d2652290b6dfc47ecc';
const GATE_IN_TX       = '6LLFtvfJjc5ZLUKhAAczdh8dghVLhWkCioRw37s3Kqgj';
const GATE_IN_MS       = 1781693444550n;
const GATE_IN_DATE     = new Date(Number(GATE_IN_MS));
const DAY_MS           = 86_400_000n;

// ── Helpers ───────────────────────────────────────────────────────────────────

const W  = process.stdout.columns || 70;
const hr = (ch = '─') => ch.repeat(W);
const dbl = () => '═'.repeat(W);

function box(lines) {
    console.log('\n' + dbl());
    lines.forEach(l => console.log('  ' + l));
    console.log(dbl());
}

function section(title) {
    console.log('\n' + hr());
    console.log('  ' + title);
    console.log(hr());
}

function calcDemurrage(gateInMs, freeDays, ratePerDay, currentMs) {
    const freePeriodMs = freeDays * DAY_MS;
    if (currentMs <= gateInMs + freePeriodMs) return 0n;
    const overdueMs = currentMs - gateInMs - freePeriodMs;
    return (overdueMs / DAY_MS) * ratePerDay;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
function pause(prompt = '\n  [ Press ENTER to continue ]') {
    return new Promise(resolve => rl.question(prompt, () => resolve()));
}

function suiObject(id) {
    const r = spawnSync(suiCli, ['client', 'object', id, '--json'], {
        encoding: 'utf8', cwd: repoRoot,
    });
    try { return JSON.parse(r.stdout); } catch { return null; }
}

// ── Demo ──────────────────────────────────────────────────────────────────────

console.clear();

box([
    'TradeProof — Demurrage Dispute Resolution',
    'A live demo for Speedex Logistics',
    '',
    'Built on Sui blockchain + Walrus decentralised storage',
    'Live on Sui Testnet · ' + new Date().toDateString(),
]);

await pause('  Press ENTER to start the demo...');

// ── Slide 1: The Problem ───────────────────────────────────────────────────────

console.clear();
section('THE PROBLEM — You know this better than anyone');

console.log(`
  A container arrives at Mombasa Port.
  The shipping line sends a demurrage invoice.

  You dispute it.

  Not because you're wrong — because you can't prove you're right.

  Shipping line: "The container gated in on June 3rd."
  Speedex:       "Our records show June 5th."
  Free days:     14 days
  Disputed days: 2 days
  Rate:          $150/container/day

  Result:        $300 per container.
                 3 containers? $900.
                 10 containers? $3,000.
                 ...and months of emails, credit notes, and relationship damage.

  Industry-wide: $20–30 billion in disputed demurrage every year.
  The port, the line, the forwarder — everyone has a different spreadsheet.
`);

await pause();

// ── Slide 2: The Root Cause ───────────────────────────────────────────────────

console.clear();
section('THE ROOT CAUSE — There is no single source of truth');

console.log(`
  The shipping line's TOS system records one timestamp.
  Your freight management system records another.
  The port authority has a third.

  All three are controlled by the party that benefits from the dispute.
  None of them are independently verifiable.

  The only way to win a demurrage dispute today:
  · Hope you kept the right email
  · Hope your container tracking screenshot is timestamped
  · Negotiate down from a position of weakness

  There is no neutral, tamper-proof record that both parties trust.

  Until now.
`);

await pause();

// ── Slide 3: TradeProof ───────────────────────────────────────────────────────

console.clear();
section('THE SOLUTION — One timestamp. Both parties. No dispute.');

console.log(`
  TradeProof records the gate-in timestamp on the Sui blockchain.

  The Sui blockchain is:
  · Public — anyone can read it, no login required
  · Immutable — no party can change a timestamp after it's recorded
  · Permanent — it does not rely on any company's servers

  Once the gate-in is recorded on-chain:
  · The shipping line can verify it
  · Speedex can verify it
  · Your customer can verify it
  · A court can verify it

  There is no "our records vs their records."
  There is one record. On the blockchain. Timestamped by the network.

  Demurrage = (days at port − free days) × rate
  Both parties run the same formula on the same timestamp.
  They get the same number. Every time. No dispute possible.
`);

await pause();

// ── Slide 4: Live Demo ────────────────────────────────────────────────────────

console.clear();
section('LIVE DEMO — A real container on Sui Testnet right now');

console.log(`
  This is not a mockup or a screenshot.
  This is a real container object recorded on Sui Testnet
  during this session.

  Container:  MSCU9876543 (40HC)
  Port:       KE MBA  (Mombasa Port, Kenya — UN/LOCODE)
  Gate-in:    ${GATE_IN_DATE.toUTCString()}

  Blockchain object ID:
  ${CONTAINER_ID}

  Explorer link (open in any browser):
  https://testnet.suivision.xyz/object/${CONTAINER_ID}
`);

await pause('  [ Reading live data from Sui Testnet now — press ENTER ]');

// Fetch live object
const obj = suiObject(CONTAINER_ID);
const fields = obj?.content?.fields;

if (fields) {
    const statusNames = ['EMPTY','STUFFED','GATE_IN','ON_VESSEL','DISCHARGED','CUSTOMS_CLEARED','GATE_OUT','RETURNED'];
    console.log(`\n  Live on-chain data:`);
    console.log(`  iso_id:           ${fields.iso_id}`);
    console.log(`  status:           ${fields.status} — ${statusNames[Number(fields.status)] ?? 'UNKNOWN'}`);
    console.log(`  current_location: ${fields.current_location}`);
    console.log(`  last_event_ms:    ${fields.last_event_ms}`);
    console.log(`  gate_in_time:     ${new Date(Number(fields.last_event_ms)).toUTCString()}`);
} else {
    console.log(`\n  (live fetch unavailable — showing recorded data)`);
    console.log(`  iso_id:           MSCU9876543`);
    console.log(`  status:           2 — GATE_IN`);
    console.log(`  current_location: KE MBA`);
    console.log(`  last_event_ms:    ${GATE_IN_MS}`);
    console.log(`  gate_in_time:     ${GATE_IN_DATE.toUTCString()}`);
}

await pause();

// ── Slide 5: The Calculation ──────────────────────────────────────────────────

console.clear();
section('THE CALCULATION — Real Speedex scenario');

// Simulate a real demurrage scenario: container sat 20 days, 14 free, $150/day
const scenarioDate = new Date(Number(GATE_IN_MS) + 20 * Number(DAY_MS));
const scenarioMs   = BigInt(scenarioDate.getTime());
const freeDays     = 14n;
const rate         = 150n;  // $150/container/day
const daysElapsed  = (scenarioMs - GATE_IN_MS) / DAY_MS;
const daysOverdue  = daysElapsed - freeDays;
const demurrage    = calcDemurrage(GATE_IN_MS, freeDays, rate, scenarioMs);

console.log(`
  Container:   MSCU9876543
  Gate-in:     ${GATE_IN_DATE.toDateString()} (from blockchain — immutable)
  Day 20:      ${scenarioDate.toDateString()}

  Free days:   ${freeDays}
  Days at port: ${daysElapsed}
  Days overdue: ${daysOverdue}
  Rate:        $${rate}/container/day

  Demurrage owed: $${demurrage}

  The shipping line calculates this number from the on-chain timestamp.
  Speedex calculates this number from the on-chain timestamp.
  They get $${demurrage}. Both of them. Same formula. Same input. Same answer.

  There is nothing to dispute.
`);

// Also show the formula printed clearly
console.log(`  Formula (same in Move contract and this script):`);
console.log(`  (days_at_port − free_days) × rate_per_day`);
console.log(`  (${daysElapsed} − ${freeDays}) × $${rate} = $${demurrage}`);

await pause();

// ── Slide 6: What This Means for Speedex ─────────────────────────────────────

console.clear();
section('WHAT THIS MEANS FOR SPEEDEX');

console.log(`
  Today, Speedex:
  · Loses time disputing demurrage invoices every month
  · Sometimes pays claims you shouldn't have to pay
  · Can't prove your position without the shipping line's cooperation
  · Has no audit trail that survives a staff change or system migration

  With TradeProof:
  · Every container has an on-chain timestamp at gate-in
  · The calculation is public, deterministic, and runs on the blockchain
  · No email required. No credit note negotiation. No months of back-and-forth.
  · Your customer (the importer) can verify the same record
  · If a dispute goes to arbitration, the timestamp is on a public blockchain

  This is not a new software system to install.
  It is a shared record that lives on the internet.
  No vendor lock-in. No subscription. No platform to trust.
`);

await pause();

// ── Slide 7: The Pilot ────────────────────────────────────────────────────────

console.clear();
section('THE PILOT — What we are asking from Speedex');

console.log(`
  We are not asking for money.
  We are not asking for a contract.
  We are asking for one real scenario to prove this works.

  What we need from Speedex:

  1. ONE container — any active shipment coming through Mombasa Port
     Give us the ISO ID (e.g. MSCU1234567)
     We register it on-chain. You verify it yourself.

  2. ONE past dispute — a demurrage case you've had in the last 12 months
     Tell us: what was the claimed gate-in date? What was yours?
     We show you exactly what the on-chain record would have proved.

  3. Your name — if this works, we want to say:
     "TradeProof is being piloted with Speedex Logistics at Mombasa Port."
     That sentence opens every door in the EAC corridor.

  Timeline:  2 weeks. One container. One calculation. One Explorer link.
  Cost:      Zero. This is testnet. No real money moves.

  If it works — we scale it together.
  If it doesn't — nothing lost, and you have a story to tell.
`);

await pause();

// ── Slide 8: The Bigger Picture ───────────────────────────────────────────────

console.clear();
section('THE BIGGER PICTURE — Beyond demurrage');

console.log(`
  Demurrage is the first problem we are solving because it is the most painful
  and requires the fewest parties to agree.

  The same technology can eventually handle:

  · Bill of Lading as an NFT
    The holder of the BL object on Sui IS the legal holder.
    No platform controls it. No bank can freeze the transfer.
    It transfers when Sui transfers it — instant, borderless, 24/7.

  · Certificate of Origin countersigned by government
    KRA or Kenya Revenue Authority signs on-chain.
    No more paper CoOs lost in transit or forged in transit.

  · Commercial Invoice accepted by buyer on-chain
    Payment triggers when both parties confirm on-chain.
    No more 30-day payment terms with no enforcement mechanism.

  · Container tracking across the entire EAC corridor
    Mombasa → Nairobi ICD → Kampala → Kigali
    One record, visible to every party, updated at every checkpoint.

  We start with demurrage.
  We build the corridor.
  Then we build the standard.
`);

await pause();

// ── Final Slide ───────────────────────────────────────────────────────────────

console.clear();
box([
    'SUMMARY',
    '',
    'Problem:   Demurrage disputes cost the industry $20-30B/year',
    '           because no party controls the trusted timestamp.',
    '',
    'Solution:  TradeProof records gate-in on the Sui blockchain.',
    '           Both parties run the same formula. No dispute.',
    '',
    'Live now:  Container MSCU9876543 is on Sui Testnet.',
    '           Gate-in: ' + GATE_IN_DATE.toDateString(),
    '           Explorer: testnet.suivision.xyz/object/',
    '           ' + CONTAINER_ID,
    '',
    'The ask:   One container. One real scenario. Two weeks.',
    '',
    'Contact:   milan@speedexlogistics.com',
    '           github.com/milan2307/exp-sui-walrus',
]);

console.log('\n  Thank you.\n');
rl.close();
