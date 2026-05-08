// scripts/test-history-pull.mjs
// Smoke test: pull 5 years of daily basis history for ONE symbol from
// representative-elevators.json. Validates that getHistory accepts basis
// symbols before we commit to the full 50-call backfill in Task 3.2.

import { readFileSync } from 'node:fs';

const API_KEY = process.env.BARCHART_API_KEY;
if (!API_KEY) {
  console.error('BARCHART_API_KEY not set.');
  process.exit(1);
}

const elevators = JSON.parse(readFileSync('scripts/representative-elevators.json', 'utf8'));
const target = elevators.find(e => e.state === 'IA' && e.county_name === 'Clinton');
if (!target) {
  console.error('Could not find IA/Clinton in representative-elevators.json.');
  process.exit(1);
}

console.log(`Target elevator: ${target.elevator_name} (${target.company})`);
console.log(`Location: ${target.city}, ${target.elevator_state} — locationId ${target.elevator_id}\n`);

// Step 1: re-fetch getGrainBids for this county to capture the current basisRollingSymbol
console.log('Step 1: fetch current bids for this elevator...');
const bidsUrl = new URL('https://ondemand.websol.barchart.com/getGrainBids.json');
bidsUrl.searchParams.set('apikey', API_KEY);
bidsUrl.searchParams.set('latitude', '41.897');
bidsUrl.searchParams.set('longitude', '-90.530');
bidsUrl.searchParams.set('totalLocations', '25');
bidsUrl.searchParams.set('bidsPerCom', '5');

const bidsRes = await fetch(bidsUrl.toString());
const bidsData = await bidsRes.json();
const matchingLoc = (bidsData.results || []).find(r => String(r.locationId) === target.elevator_id);

if (!matchingLoc) {
  console.error(`Could not find locationId ${target.elevator_id} in current bids response.`);
  process.exit(1);
}

const cornBid = (matchingLoc.bids || []).find(b => /corn/i.test(b.commodity || '') && b.basisRollingSymbol);
const soyBid = (matchingLoc.bids || []).find(b => /(soy|bean)/i.test(b.commodity || '') && b.basisRollingSymbol);

console.log(`  Corn rolling symbol: ${cornBid?.basisRollingSymbol || 'NOT FOUND'}`);
console.log(`  Soy rolling symbol:  ${soyBid?.basisRollingSymbol || 'NOT FOUND'}\n`);

if (!cornBid?.basisRollingSymbol) {
  console.error('No corn rolling basis symbol found. Cannot proceed with history test.');
  process.exit(1);
}

// Step 2: pull 5 years of daily history for the corn basis symbol
console.log('Step 2: pull 5y daily history for corn basis symbol...');
const today = new Date();
const fiveYearsAgo = new Date(today);
fiveYearsAgo.setFullYear(today.getFullYear() - 5);
const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');

const histUrl = new URL('https://ondemand.websol.barchart.com/getHistory.json');
histUrl.searchParams.set('apikey', API_KEY);
histUrl.searchParams.set('symbol', cornBid.basisRollingSymbol);
histUrl.searchParams.set('type', 'daily');
histUrl.searchParams.set('startDate', fmt(fiveYearsAgo));
histUrl.searchParams.set('endDate', fmt(today));
histUrl.searchParams.set('maxRecords', '2000');

console.log(`  URL: ${histUrl.toString().replace(API_KEY, '***')}\n`);

const histRes = await fetch(histUrl.toString());
console.log(`  HTTP ${histRes.status} ${histRes.statusText}`);

if (!histRes.ok) {
  const body = await histRes.text();
  console.log(`  Body: ${body.slice(0, 500)}`);
  process.exit(1);
}

const histData = await histRes.json();
console.log(`  Status: ${histData.status?.code} - ${histData.status?.message}`);
const rows = histData.results || [];
console.log(`  Daily rows returned: ${rows.length}`);

if (rows.length > 0) {
  console.log(`\n  First row: ${JSON.stringify(rows[0])}`);
  console.log(`  Last row:  ${JSON.stringify(rows[rows.length - 1])}`);

  const earliest = rows.reduce((min, r) => r.tradingDay < min ? r.tradingDay : min, rows[0].tradingDay);
  const latest = rows.reduce((max, r) => r.tradingDay > max ? r.tradingDay : max, rows[0].tradingDay);
  console.log(`\n  Date range: ${earliest} to ${latest}`);
} else {
  console.log('\n  Zero rows returned — basis symbol may not be supported by getHistory.');
}