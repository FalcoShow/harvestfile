// scripts/backfill-berrien-recovery.mjs
// One-off recovery for MI/Berrien (Cargill US Decatur, locationId 6612).
// Constructs basis rolling symbols using Cargill's verified commodity ID
// pattern (5398 corn / 5399 soy) from successful Pickaway and Tippecanoe runs.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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
if (!SUPABASE_URL) { console.error('Supabase URL missing'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const COUNTY_FIPS = '26021';                        // Berrien County, MI
const ELEVATOR_LABEL = 'Decatur, CAH (Cargill US, locationId 6612)';
const SYMBOLS = {
  corn:     'ZCBA-6612-5398.CM',
  soybeans: 'ZSBA-6612-5399.CM',
};

const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const today = new Date();
const fiveYearsAgo = new Date(today);
fiveYearsAgo.setFullYear(today.getFullYear() - 5);
const START = fmt(fiveYearsAgo);
const END = fmt(today);

console.log(`MI/Berrien recovery — ${ELEVATOR_LABEL}\n`);

let totalInserted = 0;

for (const [crop, symbol] of Object.entries(SYMBOLS)) {
  console.log(`${crop}: ${symbol}`);
  const url = new URL('https://ondemand.websol.barchart.com/getHistory.json');
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('type', 'daily');
  url.searchParams.set('startDate', START);
  url.searchParams.set('endDate', END);
  url.searchParams.set('maxRecords', '2000');

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.log(`  ✗ HTTP ${res.status}\n`);
    continue;
  }
  const data = await res.json();
  const rows = data.results || [];
  if (rows.length === 0) {
    console.log(`  ⚠ 0 rows — symbol pattern guess did not match this elevator\n`);
    continue;
  }

  const records = rows.map(r => ({
    county_fips: COUNTY_FIPS,
    crop,
    observation_date: r.tradingDay,
    cash_price: null,
    futures_price: null,
    basis: r.close / 100,
    source: 'barchart_rolling',
  }));

  const BATCH = 500;
  let inserted = 0;
  let dbErr = null;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const { error } = await supabase
      .from('county_basis_history')
      .upsert(chunk, { onConflict: 'county_fips,crop,observation_date' });
    if (error) { dbErr = error; break; }
    inserted += chunk.length;
  }

  if (dbErr) {
    console.log(`  ✗ DB error: ${dbErr.message}\n`);
  } else {
    const dates = rows.map(r => r.tradingDay).sort();
    console.log(`  ✓ ${inserted} rows  (${dates[0]} → ${dates[dates.length - 1]})\n`);
    totalInserted += inserted;
  }

  await new Promise(r => setTimeout(r, 250));
}

console.log(`Total rows inserted: ${totalInserted}`);