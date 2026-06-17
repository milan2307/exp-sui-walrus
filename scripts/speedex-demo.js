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

const PACKAGE          = '0xdf6082e26679444b163801398b7ab49654c5d2f4922db5512fe2760eca248aa0';
const CONTAINER_ID     = '0x55c994ae0d0bc00a2929cfb42e912b69466f9bf46d22869bbc4bb53bcdac4560';
const GATE_IN_TX       = '5xNX8XhJAxWjLFaxwL2Matvb2GbXkvTCrrMpUNK5GQt7';
const GATE_IN_MS       = 1781700307629n;
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

// ── Slide 3.5: Privacy ────────────────────────────────────────────────────────

console.clear();
section('PRIVACY — What TradeLens got catastrophically wrong');

console.log(`
  TradeLens (IBM + Maersk) shut down in 2022.
  Contour (banks) shut down in 2023.
  we.trade shut down in 2023.
  Marco Polo shut down in 2023.

  All four failed for the same reason: PRIVACY.

  Hapag-Lloyd, ONE Line, and Yang Ming were not going to let their
  biggest competitor — Maersk — see their customer list, their routes,
  their cargo volumes, and their negotiated rates.

  Neither would any bank that competed with the other banks in Contour.

  The consortium model requires everyone to share data on a shared ledger.
  No company shares data with its competitors. The network never formed.

  TradeProof solves privacy at the protocol level.
  Not as a feature. As the foundation.

  ════════════════════════════════════════════════════════════════════
  THREE PRIVACY LAYERS — ALL BUILT INTO THE SUI ECOSYSTEM
  ════════════════════════════════════════════════════════════════════

  1. 🔐 SEAL — Document Encryption (Mysten Labs · Sui Testnet)
  ─────────────────────────────────────────────────────────────────
  BL documents are encrypted client-side BEFORE upload to Walrus.
  Only authorized parties hold key shares: shipper, consignee, bank.
  The on-chain record stores only the SHA-256 hash.
  The Seal service checks the AllowList object on-chain before releasing
  any key share to anyone.

  What a competitor reads on-chain: "encrypted blob exists"
  What they cannot read:           cargo details, routes, customers, prices

  TradeProof stores this on the BillOfLading object:
    seal_id:       → Sui object ID of the Seal AllowList
    is_encrypted:  → true (Walrus blob is Seal-encrypted)

  2. 🛡️ CONFIDENTIAL TRANSACTIONS — Private Settlement (Sui Testnet)
  ─────────────────────────────────────────────────────────────────
  Demurrage is settled on-chain using Sui's Confidential Transactions.
  Homomorphic encryption hides the payment amount.

  Both parties verify: "this settlement is correct and complete."
  No one else sees: the amount, the rate, or who paid what.

  Your negotiated freight rates with shipping lines stay private.
  Your competitors cannot price-benchmark off your on-chain settlements.

  3. 🪪 zkLOGIN — Zero-friction Onboarding (Sui Mainnet · Live)
  ─────────────────────────────────────────────────────────────────
  Any party joins with Google, Microsoft, or Facebook.
  A zero-knowledge proof maps their OAuth identity to a Sui address.
  Their email is never stored on-chain. No one can link their address
  to their identity without their cooperation.

  Nairobi clearing agent onboards: opens browser → Google login → done.
  No seed phrase. No wallet app. No blockchain training. 30 seconds.

  ════════════════════════════════════════════════════════════════════
  RESULT: Competitors can coexist on the same protocol.
          Each party's data is private to them.
          The network can actually form.
          The consortium problem is solved.
  ════════════════════════════════════════════════════════════════════
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

// ── Slide 8: The Sui Ecosystem ────────────────────────────────────────────────

console.clear();
section('THE SUI ECOSYSTEM — Why TradeProof is built here and nowhere else');

console.log(`
  TradeProof is not just using Sui's smart contracts.
  It is using every layer of the Sui ecosystem — by design.

  ════════════════════════════════════════════════════════════════════
  THE SUI STACK — FIVE LAYERS, ONE PROTOCOL
  ════════════════════════════════════════════════════════════════════

  ⚡ SUI MOVE — Smart Contracts
  ──────────────────────────────────────────────────────────────────
  9 trade finance modules (Container, BL, CoO, Invoice, AWB, CMR, ...)
  Owned objects model: only the BL holder can endorse or surrender.
  Parallel execution: 100+ containers tracked simultaneously.
  Sub-second finality: gate-in recorded in under a second.
  Package: 0x26374b0a84b30d54f8860808f37d66d9b2225ac96350fffa27469c585a0fd3e7

  🌊 WALRUS — Decentralised Document Storage
  ──────────────────────────────────────────────────────────────────
  Full DCSA BL JSON documents stored on Walrus — not on TradeProof servers.
  Erasure-coded across validator nodes.
  2-year minimum retention guarantee.
  If TradeProof shuts down: documents still exist on Walrus.
  If a validator goes offline: blob is reconstructed from other nodes.

  🔐 SEAL — Threshold Encryption (Mysten Labs)
  ──────────────────────────────────────────────────────────────────
  Documents encrypted before Walrus upload.
  AllowList is a shared Sui object — access managed on-chain.
  Seal service releases key shares only to AllowList members.
  New participant (e.g. bank) added with one on-chain transaction.

  🛡️ CONFIDENTIAL TRANSACTIONS — Private Payments
  ──────────────────────────────────────────────────────────────────
  Homomorphic encryption on Sui's native token layer.
  Demurrage settled on-chain without revealing the amount.
  Verifiable settlement without disclosure.

  🪪 ZKLOGI N — Barrier-free Onboarding
  ──────────────────────────────────────────────────────────────────
  Google login → ZK proof → Sui address.
  Any counterparty, anywhere, in 30 seconds.
  No wallet. No seed phrase. No training.

  ════════════════════════════════════════════════════════════════════
  THE BIGGER PICTURE — Beyond Speedex, beyond demurrage
  ════════════════════════════════════════════════════════════════════

  · Bill of Lading as an NFT (Seal-encrypted)
    Holder rights enforced by Sui. No platform controls the transfer.
    Instant, borderless, 24/7 — from Mombasa to Felixstowe.

  · Certificate of Origin countersigned by KRA on-chain
    No more paper CoOs lost or forged in transit.

  · Commercial Invoice paid on-chain (CT-private)
    Payment triggers when both parties confirm. 30-day terms enforced.

  · Container tracking: Mombasa → Nairobi ICD → Kampala → Kigali
    One EAC corridor. One record. Every party reads it.

  We start with demurrage.
  We build the corridor.
  We make the Sui ecosystem the infrastructure for African trade.
  The ecosystem wins with every shipment.
`);

await pause();

// ── Final Slide ───────────────────────────────────────────────────────────────

console.clear();
box([
    'SUMMARY',
    '',
    'Problem:   Demurrage disputes cost the industry $20-30B/year.',
    '           No neutral, private, tamper-proof record exists.',
    '',
    'Solution:  TradeProof on the Sui ecosystem.',
    '           On-chain timestamp + Seal encryption + CT settlement',
    '           + zkLogin onboarding = end-to-end trade finance.',
    '',
    'Privacy:   Seal (docs) · CT (payments) · zkLogin (identity)',
    '           Competitors coexist. Network can form. Protocol wins.',
    '',
    'Live now:  Container MSCU9876543 is on Sui Testnet.',
    '           Gate-in: ' + GATE_IN_DATE.toDateString(),
    '           Explorer: testnet.suivision.xyz/object/',
    '           ' + CONTAINER_ID,
    '',
    'Ecosystem: Sui Move · Walrus · Seal · CT · zkLogin',
    '           Every transaction is a win for the Sui ecosystem.',
    '',
    'The ask:   One container. One real scenario. Two weeks. Zero cost.',
    '',
    'Contact:   milan@speedexlogistics.com',
    '           github.com/milan2307/exp-sui-walrus',
]);

console.log('\n  Thank you.\n');
rl.close();
