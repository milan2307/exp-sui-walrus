/**
 * track-container.js
 *
 * CLI container track & trace using Sui blockchain events.
 * Mirrors what seacargotracking.net shows, but the source of truth
 * is the immutable Sui blockchain â€” not a carrier's mutable database.
 *
 * Usage:
 *   node scripts/track-container.js MSCU9876543
 *   node scripts/track-container.js 0x55c994ae0d0bc00a2929cfb42e912b69466f9bf46d22869bbc4bb53bcdac4560
 *   node scripts/track-container.js MSCU9876543 --free-days 21 --rate 200
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const suiCli   = join(dirname(repoRoot), 'MilanGPT-OS', '.tools', 'sui', 'sui.exe');

const PACKAGE  = '0xbf5d2104cdc531abff9f307b035df214793314ee92a661d190bc90b580ab1697';
const EXPLORER = 'https://testnet.suivision.xyz';
const DAY_MS   = 86_400_000;

// â”€â”€ Carriers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CARRIERS = {
  MSCU: { name: 'MSC',         url: id => `https://www.msc.com/en/search-a-schedule-and-a-tariff/tracking?trackingNumber=${id}` },
  MAEU: { name: 'Maersk',      url: id => `https://www.maersk.com/tracking/${id}` },
  MARU: { name: 'Maersk',      url: id => `https://www.maersk.com/tracking/${id}` },
  CMDU: { name: 'CMA CGM',     url: id => `https://www.cma-cgm.com/ebusiness/tracking/search?reference=${id}` },
  CLHU: { name: 'CMA CGM',     url: id => `https://www.cma-cgm.com/ebusiness/tracking/search?reference=${id}` },
  EGLV: { name: 'Evergreen',   url: id => `https://www.evergreen-line.com/timetable/containerSearch.do?searchCriteria.criteriaContainerNo=${id}` },
  HLCU: { name: 'Hapag-Lloyd', url: id => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${id}` },
  ONEY: { name: 'ONE Line',    url: id => `https://ecomm.one-line.com/ecom/CUP_HOM_3301.do?blNo=${id}` },
  YMLU: { name: 'Yang Ming',   url: id => `https://www.yangming.com/e-service/Track_Trace/Track_Trace_Search.aspx?type=1&number=${id}` },
  ZIMU: { name: 'ZIM',         url: id => `https://www.zim.com/tools/track-a-shipment` },
  COSU: { name: 'COSCO',       url: id => `https://elines.coscoshipping.com/ebusiness/cargotracking` },
};

const STATUS_NAMES = ['EMPTY','STUFFED','GATE_IN','ON_VESSEL','DISCHARGED','CUSTOMS_CLEARED','GATE_OUT','RETURNED'];
const EVENT_TYPES  = {
  ContainerStuffed:        'Cargo Stuffed',
  ContainerGateIn:         'Gate In â€” entered port terminal',
  ContainerLoadedOnVessel: 'Loaded on Vessel',
  ContainerDischarged:     'Discharged from Vessel',
  ContainerCustomsCleared: 'Customs Cleared',
  ContainerGateOut:        'Gate Out â€” released to consignee',
  ContainerReturned:       'Returned Empty',
};

// â”€â”€ Args â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const argv        = process.argv.slice(2);
const input       = argv[0];
const fdIdx       = argv.indexOf('--free-days');
const rIdx        = argv.indexOf('--rate');
const freeDays    = fdIdx >= 0 ? Number(argv[fdIdx + 1]) : 14;
const rate        = rIdx  >= 0 ? Number(argv[rIdx  + 1]) : 150;

if (!input) {
  console.error('Usage: node scripts/track-container.js <ISO-ID or object-ID>');
  process.exit(1);
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const W   = Math.min(process.stdout.columns || 70, 80);
const hr  = () => 'â”€'.repeat(W);
const dbl = () => 'â•'.repeat(W);

function fmtDate(ms) {
  return new Date(Number(ms)).toUTCString();
}

function suiCall(args) {
  const r = spawnSync(suiCli, args, { encoding: 'utf8', cwd: repoRoot });
  if (r.error) throw r.error;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

function calcDemurrage(gateInMs, freeDays, ratePerDay, currentMs) {
  const freePeriodMs = freeDays * DAY_MS;
  if (currentMs <= gateInMs + freePeriodMs) return { days: 0, amount: 0 };
  const overdueMs = currentMs - gateInMs - freePeriodMs;
  const days = Math.floor(overdueMs / DAY_MS);
  return { days, amount: days * ratePerDay };
}

// â”€â”€ RPC via sui client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function suiObject(id) {
  return suiCall(['client', 'object', id, '--json']);
}

function suiQueryEvents() {
  return suiCall([
    'client', 'events', '--json',
    '--sender', '0x26374b0a84b30d54f8860808f37d66d9b2225ac96350fffa27469c585a0fd3e7',
  ]);
}

// For events we hit the RPC directly using node's fetch (Node 18+)
async function fetchEvents(isoId) {
  const body = {
    jsonrpc: '2.0', id: 1,
    method: 'suix_queryEvents',
    params: [
      { MoveEventModule: { package: PACKAGE, module: 'container' } },
      null, 50, false,
    ],
  };
  const r = await fetch('https://fullnode.testnet.sui.io:443', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const all = j?.result?.data ?? [];
  return all.filter(e => e.parsedJson?.iso_id === isoId);
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const isObjId = /^0x[0-9a-f]{64}$/i.test(input);

console.log('\n' + dbl());
console.log('  TradeProof â€” Container Track & Trace');
console.log('  Source: Sui Testnet (immutable blockchain record)');
console.log(dbl());

let fields  = null;
let isoId   = null;
let objId   = null;

if (isObjId) {
  objId = input;
  console.log(`\n  Fetching object ${objId.slice(0,20)}â€¦`);
  const obj = suiObject(objId);
  fields = obj?.content?.fields;
  if (!fields) { console.error('  Object not found or not a Container'); process.exit(1); }
  isoId = fields.iso_id;
} else {
  isoId = input.toUpperCase();
  objId = null;
}

// Fetch events
console.log(`  Fetching on-chain events for ${isoId}â€¦\n`);
let events = [];
try {
  events = await fetchEvents(isoId);
} catch (e) {
  console.warn(`  (Event query failed: ${e.message})`);
}

// â”€â”€ Container info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

if (fields) {
  const statusCode = Number(fields.status);
  const statusName = STATUS_NAMES[statusCode] ?? 'UNKNOWN';

  console.log(hr());
  console.log('  Container Details');
  console.log(hr());
  console.log(`  ISO ID:           ${fields.iso_id}`);
  console.log(`  Size / Type:      ${fields.size_type}`);
  console.log(`  Status:           ${statusCode} â€” ${statusName}`);
  console.log(`  Operator:         ${fields.operator_name}`);
  console.log(`  Current Location: ${fields.current_location}`);
  console.log(`  Last Event:       ${fmtDate(fields.last_event_ms)}`);
  console.log(`  Manufactured:     ${fields.manufactured_year}`);
  if (objId) {
    console.log(`  Object ID:        ${objId}`);
    console.log(`  Explorer:         ${EXPLORER}/object/${objId}`);
  }
} else {
  console.log(hr());
  console.log(`  Container: ${isoId}  (no object ID â€” enter object ID for full details)`);
  console.log(hr());
}

// â”€â”€ Event timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.log('\n' + hr());
console.log('  On-Chain Event Timeline');
console.log(hr());

if (!events.length) {
  console.log('  No events found on-chain for this container.');
  console.log('  Register the container first: npm run container:testnet');
} else {
  const sorted = [...events].sort(
    (a, b) => Number(a.parsedJson?.timestamp_ms ?? 0) - Number(b.parsedJson?.timestamp_ms ?? 0)
  );

  sorted.forEach((ev, i) => {
    const shortType = ev.type.split('::').pop();
    const label     = EVENT_TYPES[shortType] ?? shortType;
    const pj        = ev.parsedJson ?? {};
    const ts        = pj.timestamp_ms;
    const prefix    = i === sorted.length - 1 ? '  â””â”€' : '  â”œâ”€';

    console.log(`${prefix} ${label}`);
    if (pj.port)              console.log(`     Location: ${pj.port}`);
    if (pj.vessel)            console.log(`     Vessel:   ${pj.vessel}`);
    if (pj.port_of_loading)   console.log(`     POL:      ${pj.port_of_loading}`);
    if (pj.port_of_discharge) console.log(`     POD:      ${pj.port_of_discharge}`);
    if (ts)                   console.log(`     Time:     ${fmtDate(ts)}`);
    console.log(`     Tx:       ${EXPLORER}/txblock/${ev.id.txDigest}`);
    if (i < sorted.length - 1) console.log('     â”‚');
  });
}

// â”€â”€ Demurrage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const gateInEv = events.find(e => e.type.includes('ContainerGateIn'));
const gateInMs = gateInEv?.parsedJson?.timestamp_ms
              ?? (fields && Number(fields.status) >= 2 ? fields?.last_event_ms : null);

if (gateInMs) {
  const now    = Date.now();
  const elapsed = Math.floor((now - Number(gateInMs)) / DAY_MS);
  const { days: overdue, amount } = calcDemurrage(Number(gateInMs), freeDays, rate, now);

  console.log('\n' + hr());
  console.log('  Live Demurrage Calculation');
  console.log(hr());
  console.log(`  Gate-in (on-chain): ${fmtDate(gateInMs)}`);
  console.log(`  Current time:       ${new Date().toUTCString()}`);
  console.log(`  Days at port:       ${elapsed}`);
  console.log(`  Free days:          ${freeDays}`);
  console.log(`  Rate:               $${rate}/container/day`);

  if (overdue > 0) {
    console.log(`\n  STATUS:    DEMURRAGE ACCRUING`);
    console.log(`  Overdue:   ${overdue} days`);
    console.log(`  OWED:      $${amount.toLocaleString()}`);
    console.log(`\n  Formula:   (${elapsed} âˆ’ ${freeDays}) Ã— $${rate} = $${amount}`);
  } else {
    const remaining = freeDays - elapsed;
    console.log(`\n  STATUS:    WITHIN FREE PERIOD`);
    console.log(`  Remaining: ${remaining} days before demurrage starts`);
  }
  console.log('\n  Both parties run this formula on the same on-chain timestamp.');
  console.log('  Same input. Same output. No dispute possible.');
}

// â”€â”€ Carrier tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const prefix  = isoId.slice(0, 4).toUpperCase();
const carrier = CARRIERS[prefix];

console.log('\n' + hr());
console.log('  Carrier Tracking');
console.log(hr());
if (carrier) {
  console.log(`  Carrier: ${carrier.name}`);
  console.log(`  URL:     ${carrier.url(isoId)}`);
  console.log(`\n  TradeProof records the carrier's own timestamps on-chain.`);
  console.log(`  The carrier cannot later dispute a timestamp they published.`);
} else {
  console.log(`  Carrier prefix "${prefix}" not in lookup table.`);
  console.log(`  Try: https://www.track-trace.com/container#${isoId}`);
}

// â”€â”€ TradeProof web page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.log('\n' + hr());
console.log('  TradeProof Track & Trace Page');
console.log(hr());
const trackUrl = objId
  ? `file://${repoRoot}/web/track/index.html?id=${objId}`
  : `file://${repoRoot}/web/track/index.html?id=${isoId}`;
console.log(`  ${trackUrl}`);
console.log(`\n  Share this URL with any party â€” no login, no account.\n`);
