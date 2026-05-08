// scripts/backfill-basis-history.mjs
// Pulls 5y daily basis history for each of the 25 representative elevators
// (corn + soybeans) and upserts to public.county_basis_history.
// Per-elevator depth varies; script logs actual date range pulled.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- env loader (handles CRLF + LF line endings, trims, ignores comments) ---
function loadEnvLocal() {
  try {
    const content = readFileSync('.env.local', 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) {
        let [, key, val] = m;
        val = val.trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (e) { console.warn(`Could not load .env.local: ${e.message}`); }
}
loadEnvLocal();

const API_KEY = process.env.BARCHART_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY) { console.error('BARCHART_API_KEY missing'); process.exit(1); }
if (!SUPABASE_URL) { console.error('SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL missing'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const elevators = JSON.parse(readFileSync('scripts/representative-elevators.json', 'utf8'));
console.log(`Loaded ${elevators.length} elevators\n`);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');

async function fetchCurrentSymbols(e) {
  const url = new URL('https://ondemand.websol.barchart.com/getGrainBids.json');
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('latitude', String(e.lat));
  url.searchParams.set('longitude', String(e.lng));
  url.searchParams.set('totalLocations', '25');
  url.searchParams.set('bidsPerCom', '5');

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const match = (data.results || []).find(r => String(r.locationId) === e.elevator_id);
  if (!match) return null;

  const cornBid = (match.bids || []).find(b => /corn/i.test(b.commodity || '') && b.basisRollingSymbol);
  const soyBid  = (match.bids || []).find(b => /(soy|bean)/i.test(b.commodity || '') && b.basisRollingSymbol);
  return { corn: cornBid?.basisRollingSymbol || null, soy: soyBid?.basisRollingSymbol || null };
}

async function fetchHistory(symbol, startDate, endDate) {
  const url = new URL('https://ondemand.websol.barchart.com/getHistory.json');
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('type', 'daily');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('maxRecords', '2000');

  const res = await fetch(url.toString());
  if (!res.ok) return { rows: [], error: `HTTP ${res.status}` };
  const data = await res.json();
  return { rows: data.results || [], error: null };
}

async function upsertRows(rows) {
  if (rows.length === 0) return { inserted: 0, error: null };
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('county_basis_history')
      .upsert(chunk, { onConflict: 'county_fips,crop,observation_date' });
    if (error) return { inserted, error };
    inserted += chunk.length;
  }
  return { inserted, error: null };
}

const today = new Date();
const fiveYearsAgo = new Date(today);
fiveYearsAgo.setFullYear(today.getFullYear() - 5);
const START_DATE = fmt(fiveYearsAgo);
const END_DATE = fmt(today);

let totalInserted = 0;
const issues = [];

for (let i = 0; i < elevators.length; i++) {
  const e = elevators[i];
  const tag = `[${String(i + 1).padStart(2)}/${elevators.length}] ${e.state}/${e.county_name.padEnd(11)}`;
  console.log(`${tag} ${e.elevator_name} (${e.company || 'no company'})`);

  const symbols = await fetchCurrentSymbols(e);
  await sleep(250);
  if (!symbols) {
    console.log('  ✗ Could not fetch current symbols\n');
    issues.push({ elevator: e, error: 'no symbols' });
    continue;
  }
  console.log(`  Symbols: corn=${symbols.corn || 'MISSING'}  soy=${symbols.soy || 'MISSING'}`);

  for (const { crop, sym } of [{ crop: 'corn', sym: symbols.corn }, { crop: 'soybeans', sym: symbols.soy }]) {
    if (!sym) {
      console.log(`  ⚠ ${crop}: no rolling symbol`);
      continue;
    }
    const { rows, error } = await fetchHistory(sym, START_DATE, END_DATE);
    if (error) {
      console.log(`  ✗ ${crop} history: ${error}`);
      issues.push({ elevator: e, error: `${crop}: ${error}` });
      await sleep(250);
      continue;
    }
    if (rows.length === 0) {
      console.log(`  ⚠ ${crop}: 0 rows returned`);
      await sleep(250);
      continue;
    }
    const records = rows.map(r => ({
      county_fips: e.county_fips,
      crop,
      observation_date: r.tradingDay,
      cash_price: null,
      futures_price: null,
      basis: r.close / 100,            // cents → dollars
      source: 'barchart_rolling',
    }));
    const { inserted, error: dbErr } = await upsertRows(records);
    if (dbErr) {
      console.log(`  ✗ ${crop} DB: ${dbErr.message}`);
      issues.push({ elevator: e, error: `${crop} db: ${dbErr.message}` });
    } else {
      const dates = rows.map(r => r.tradingDay).sort();
      console.log(`  ✓ ${crop}: ${inserted} rows  (${dates[0]} → ${dates[dates.length - 1]})`);
      totalInserted += inserted;
    }
    await sleep(250);
  }
  console.log('');
}

console.log('═'.repeat(80));
console.log(`Total rows inserted: ${totalInserted}`);
console.log(`Elevators processed: ${elevators.length}`);
console.log(`Issues: ${issues.length}`);
for (const i of issues) {
  console.log(`  - ${i.elevator.state}/${i.elevator.county_name}: ${i.error}`);
}