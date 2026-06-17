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

// â”€â”€ Live testnet data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PACKAGE          = '0xbf5d2104cdc531abff9f307b035df214793314ee92a661d190bc90b580ab1697';
const CONTAINER_ID     = '0x55c994ae0d0bc00a2929cfb42e912b69466f9bf46d22869bbc4bb53bcdac4560';
const GATE_IN_TX       = '5xNX8XhJAxWjLFaxwL2Matvb2GbXkvTCrrMpUNK5GQt7';
const GATE_IN_MS       = 1781700307629n;
const GATE_IN_DATE     = new Date(Number(GATE_IN_MS));
const DAY_MS           = 86_400_000n;

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const W  = process.stdout.columns || 70;
const hr = (ch = 'â”€') => ch.repeat(W);
const dbl = () => 'â•'.repeat(W);

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

// â”€â”€ Demo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();

box([
    'TradeProof â€” Demurrage Dispute Resolution',
    'A live demo for Speedex Logistics',
    '',
    'Built on Sui blockchain + Walrus decentralised storage',
    'Live on Sui Testnet Â· ' + new Date().toDateString(),
]);

await pause('  Press ENTER to start the demo...');

// â”€â”€ Slide 1: The Problem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('THE PROBLEM â€” You know this better than anyone');

console.log(`
  A container arrives at Mombasa Port.
  The shipping line sends a demurrage invoice.

  You dispute it.

  Not because you're wrong â€” because you can't prove you're right.

  Shipping line: "The container gated in on June 3rd."
  Speedex:       "Our records show June 5th."
  Free days:     14 days
  Disputed days: 2 days
  Rate:          $150/container/day

  Result:        $300 per container.
                 3 containers? $900.
                 10 containers? $3,000.
                 ...and months of emails, credit notes, and relationship damage.

  Industry-wide: $20â€“30 billion in disputed demurrage every year.
  The port, the line, the forwarder â€” everyone has a different spreadsheet.
`);

await pause();

// â”€â”€ Slide 2: The Root Cause â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('THE ROOT CAUSE â€” There is no single source of truth');

console.log(`
  The shipping line's TOS system records one timestamp.
  Your freight management system records another.
  The port authority has a third.

  All three are controlled by the party that benefits from the dispute.
  None of them are independently verifiable.

  The only way to win a demurrage dispute today:
  Â· Hope you kept the right email
  Â· Hope your container tracking screenshot is timestamped
  Â· Negotiate down from a position of weakness

  There is no neutral, tamper-proof record that both parties trust.

  Until now.
`);

await pause();

// â”€â”€ Slide 3: TradeProof â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('THE SOLUTION â€” One timestamp. Both parties. No dispute.');

console.log(`
  TradeProof records the gate-in timestamp on the Sui blockchain.

  The Sui blockchain is:
  Â· Public â€” anyone can read it, no login required
  Â· Immutable â€” no party can change a timestamp after it's recorded
  Â· Permanent â€” it does not rely on any company's servers

  Once the gate-in is recorded on-chain:
  Â· The shipping line can verify it
  Â· Speedex can verify it
  Â· Your customer can verify it
  Â· A court can verify it

  There is no "our records vs their records."
  There is one record. On the blockchain. Timestamped by the network.

  Demurrage = (days at port âˆ’ free days) Ã— rate
  Both parties run the same formula on the same timestamp.
  They get the same number. Every time. No dispute possible.
`);

await pause();

// â”€â”€ Slide 3.5: Privacy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('PRIVACY â€” What TradeLens got catastrophically wrong');

console.log(`
  TradeLens (IBM + Maersk) shut down in 2022.
  Contour (banks) shut down in 2023.
  we.trade shut down in 2023.
  Marco Polo shut down in 2023.

  All four failed for the same reason: PRIVACY.

  Hapag-Lloyd, ONE Line, and Yang Ming were not going to let their
  biggest competitor â€” Maersk â€” see their customer list, their routes,
  their cargo volumes, and their negotiated rates.

  Neither would any bank that competed with the other banks in Contour.

  The consortium model requires everyone to share data on a shared ledger.
  No company shares data with its competitors. The network never formed.

  TradeProof solves privacy at the protocol level.
  Not as a feature. As the foundation.

  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  THREE PRIVACY LAYERS â€” ALL BUILT INTO THE SUI ECOSYSTEM
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  1. ðŸ” SEAL â€” Document Encryption (Mysten Labs Â· Sui Testnet)
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  BL documents are encrypted client-side BEFORE upload to Walrus.
  Only authorized parties hold key shares: shipper, consignee, bank.
  The on-chain record stores only the SHA-256 hash.
  The Seal service checks the AllowList object on-chain before releasing
  any key share to anyone.

  What a competitor reads on-chain: "encrypted blob exists"
  What they cannot read:           cargo details, routes, customers, prices

  TradeProof stores this on the BillOfLading object:
    seal_id:       â†’ Sui object ID of the Seal AllowList
    is_encrypted:  â†’ true (Walrus blob is Seal-encrypted)

  2. ðŸ›¡ï¸ CONFIDENTIAL TRANSACTIONS â€” Private Settlement (Sui Testnet)
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Demurrage is settled on-chain using Sui's Confidential Transactions.
  Homomorphic encryption hides the payment amount.

  Both parties verify: "this settlement is correct and complete."
  No one else sees: the amount, the rate, or who paid what.

  Your negotiated freight rates with shipping lines stay private.
  Your competitors cannot price-benchmark off your on-chain settlements.

  3. ðŸªª zkLOGIN â€” Zero-friction Onboarding (Sui Mainnet Â· Live)
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Any party joins with Google, Microsoft, or Facebook.
  A zero-knowledge proof maps their OAuth identity to a Sui address.
  Their email is never stored on-chain. No one can link their address
  to their identity without their cooperation.

  Nairobi clearing agent onboards: opens browser â†’ Google login â†’ done.
  No seed phrase. No wallet app. No blockchain training. 30 seconds.

  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  RESULT: Competitors can coexist on the same protocol.
          Each party's data is private to them.
          The network can actually form.
          The consortium problem is solved.
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
`);

await pause();

// â”€â”€ Slide 4: Live Demo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('LIVE DEMO â€” A real container on Sui Testnet right now');

console.log(`
  This is not a mockup or a screenshot.
  This is a real container object recorded on Sui Testnet
  during this session.

  Container:  MSCU9876543 (40HC)
  Port:       KE MBA  (Mombasa Port, Kenya â€” UN/LOCODE)
  Gate-in:    ${GATE_IN_DATE.toUTCString()}

  Blockchain object ID:
  ${CONTAINER_ID}

  Explorer link (open in any browser):
  https://testnet.suivision.xyz/object/${CONTAINER_ID}
`);

await pause('  [ Reading live data from Sui Testnet now â€” press ENTER ]');

// Fetch live object
const obj = suiObject(CONTAINER_ID);
const fields = obj?.content?.fields;

if (fields) {
    const statusNames = ['EMPTY','STUFFED','GATE_IN','ON_VESSEL','DISCHARGED','CUSTOMS_CLEARED','GATE_OUT','RETURNED'];
    console.log(`\n  Live on-chain data:`);
    console.log(`  iso_id:           ${fields.iso_id}`);
    console.log(`  status:           ${fields.status} â€” ${statusNames[Number(fields.status)] ?? 'UNKNOWN'}`);
    console.log(`  current_location: ${fields.current_location}`);
    console.log(`  last_event_ms:    ${fields.last_event_ms}`);
    console.log(`  gate_in_time:     ${new Date(Number(fields.last_event_ms)).toUTCString()}`);
} else {
    console.log(`\n  (live fetch unavailable â€” showing recorded data)`);
    console.log(`  iso_id:           MSCU9876543`);
    console.log(`  status:           2 â€” GATE_IN`);
    console.log(`  current_location: KE MBA`);
    console.log(`  last_event_ms:    ${GATE_IN_MS}`);
    console.log(`  gate_in_time:     ${GATE_IN_DATE.toUTCString()}`);
}

await pause();

// â”€â”€ Slide 5: The Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('THE CALCULATION â€” Real Speedex scenario');

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
  Gate-in:     ${GATE_IN_DATE.toDateString()} (from blockchain â€” immutable)
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
console.log(`  (days_at_port âˆ’ free_days) Ã— rate_per_day`);
console.log(`  (${daysElapsed} âˆ’ ${freeDays}) Ã— $${rate} = $${demurrage}`);

await pause();

// â”€â”€ Slide 6: What This Means for Speedex â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('WHAT THIS MEANS FOR SPEEDEX');

console.log(`
  Today, Speedex:
  Â· Loses time disputing demurrage invoices every month
  Â· Sometimes pays claims you shouldn't have to pay
  Â· Can't prove your position without the shipping line's cooperation
  Â· Has no audit trail that survives a staff change or system migration

  With TradeProof:
  Â· Every container has an on-chain timestamp at gate-in
  Â· The calculation is public, deterministic, and runs on the blockchain
  Â· No email required. No credit note negotiation. No months of back-and-forth.
  Â· Your customer (the importer) can verify the same record
  Â· If a dispute goes to arbitration, the timestamp is on a public blockchain

  This is not a new software system to install.
  It is a shared record that lives on the internet.
  No vendor lock-in. No subscription. No platform to trust.
`);

await pause();

// â”€â”€ Slide 7: The Pilot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('THE PILOT â€” What we are asking from Speedex');

console.log(`
  We are not asking for money.
  We are not asking for a contract.
  We are asking for one real scenario to prove this works.

  What we need from Speedex:

  1. ONE container â€” any active shipment coming through Mombasa Port
     Give us the ISO ID (e.g. MSCU1234567)
     We register it on-chain. You verify it yourself.

  2. ONE past dispute â€” a demurrage case you've had in the last 12 months
     Tell us: what was the claimed gate-in date? What was yours?
     We show you exactly what the on-chain record would have proved.

  3. Your name â€” if this works, we want to say:
     "TradeProof is being piloted with Speedex Logistics at Mombasa Port."
     That sentence opens every door in the EAC corridor.

  Timeline:  2 weeks. One container. One calculation. One Explorer link.
  Cost:      Zero. This is testnet. No real money moves.

  If it works â€” we scale it together.
  If it doesn't â€” nothing lost, and you have a story to tell.
`);

await pause();

// â”€â”€ Slide 8: The Sui Ecosystem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.clear();
section('THE SUI ECOSYSTEM â€” Why TradeProof is built here and nowhere else');

console.log(`
  TradeProof is not just using Sui's smart contracts.
  It is using every layer of the Sui ecosystem â€” by design.

  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  THE SUI STACK â€” FIVE LAYERS, ONE PROTOCOL
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  âš¡ SUI MOVE â€” Smart Contracts
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  9 trade finance modules (Container, BL, CoO, Invoice, AWB, CMR, ...)
  Owned objects model: only the BL holder can endorse or surrender.
  Parallel execution: 100+ containers tracked simultaneously.
  Sub-second finality: gate-in recorded in under a second.
  Package: 0x26374b0a84b30d54f8860808f37d66d9b2225ac96350fffa27469c585a0fd3e7

  ðŸŒŠ WALRUS â€” Decentralised Document Storage
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Full DCSA BL JSON documents stored on Walrus â€” not on TradeProof servers.
  Erasure-coded across validator nodes.
  2-year minimum retention guarantee.
  If TradeProof shuts down: documents still exist on Walrus.
  If a validator goes offline: blob is reconstructed from other nodes.

  ðŸ” SEAL â€” Threshold Encryption (Mysten Labs)
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Documents encrypted before Walrus upload.
  AllowList is a shared Sui object â€” access managed on-chain.
  Seal service releases key shares only to AllowList members.
  New participant (e.g. bank) added with one on-chain transaction.

  ðŸ›¡ï¸ CONFIDENTIAL TRANSACTIONS â€” Private Payments
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Homomorphic encryption on Sui's native token layer.
  Demurrage settled on-chain without revealing the amount.
  Verifiable settlement without disclosure.

  ðŸªª ZKLOGI N â€” Barrier-free Onboarding
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Google login â†’ ZK proof â†’ Sui address.
  Any counterparty, anywhere, in 30 seconds.
  No wallet. No seed phrase. No training.

  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  THE BIGGER PICTURE â€” Beyond Speedex, beyond demurrage
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  Â· Bill of Lading as an NFT (Seal-encrypted)
    Holder rights enforced by Sui. No platform controls the transfer.
    Instant, borderless, 24/7 â€” from Mombasa to Felixstowe.

  Â· Certificate of Origin countersigned by KRA on-chain
    No more paper CoOs lost or forged in transit.

  Â· Commercial Invoice paid on-chain (CT-private)
    Payment triggers when both parties confirm. 30-day terms enforced.

  Â· Container tracking: Mombasa â†’ Nairobi ICD â†’ Kampala â†’ Kigali
    One EAC corridor. One record. Every party reads it.

  We start with demurrage.
  We build the corridor.
  We make the Sui ecosystem the infrastructure for African trade.
  The ecosystem wins with every shipment.
`);

await pause();

// â”€â”€ Final Slide â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    'Privacy:   Seal (docs) Â· CT (payments) Â· zkLogin (identity)',
    '           Competitors coexist. Network can form. Protocol wins.',
    '',
    'Live now:  Container MSCU9876543 is on Sui Testnet.',
    '           Gate-in: ' + GATE_IN_DATE.toDateString(),
    '           Explorer: testnet.suivision.xyz/object/',
    '           ' + CONTAINER_ID,
    '',
    'Ecosystem: Sui Move Â· Walrus Â· Seal Â· CT Â· zkLogin',
    '           Every transaction is a win for the Sui ecosystem.',
    '',
    'The ask:   One container. One real scenario. Two weeks. Zero cost.',
    '',
    'Contact:   milan@speedexlogistics.com',
    '           github.com/milan2307/exp-sui-walrus',
]);

console.log('\n  Thank you.\n');
rl.close();
