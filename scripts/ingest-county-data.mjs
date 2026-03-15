#!/usr/bin/env node
// =============================================================================
// HarvestFile — Phase 5A-1: County Data Ingestion (v2 — State-by-State)
// =============================================================================
//
// v2 FIX: Fetches one state at a time instead of bulk queries.
// The NASS API times out (504) on queries spanning all counties + all years.
//
// HOW TO RUN:
//   cd C:\Users\Andrew\harvestfile
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"
//   node scripts/ingest-county-data.mjs
//
// RUNTIME: ~15-25 minutes
// =============================================================================

import { createClient } from '@supabase/supabase-js';

// ─── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://fzduyjxjdcxbdwjlwrpu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';
const NASS_API_KEY = 'E3837A13-9EC3-3BF9-84EB-B475A476D4A7';
const NASS_BASE_URL = 'https://quickstats.nass.usda.gov/api/api_GET/';

// All 50 states — major ag states first
const ALL_STATES = [
  'IA','IL','NE','MN','IN','OH','SD','KS','ND','WI','MO','MI',
  'TX','GA','AR','MS','NC','AL','KY','TN','OK','CO','MT','WA',
  'OR','CA','ID','WY','PA','NY','VA','SC','LA','FL','MD','DE',
  'NJ','WV','VT','ME','NH','MA','CT','RI','NM','AZ','NV','UT','HI','AK'
];

const STATE_FIPS = {
  'AL':'01','AK':'02','AZ':'04','AR':'05','CA':'06','CO':'08','CT':'09','DE':'10',
  'FL':'12','GA':'13','HI':'15','ID':'16','IL':'17','IN':'18','IA':'19','KS':'20',
  'KY':'21','LA':'22','ME':'23','MD':'24','MA':'25','MI':'26','MN':'27','MS':'28',
  'MO':'29','MT':'30','NE':'31','NV':'32','NH':'33','NJ':'34','NM':'35','NY':'36',
  'NC':'37','ND':'38','OH':'39','OK':'40','OR':'41','PA':'42','RI':'44','SC':'45',
  'SD':'46','TN':'47','TX':'48','UT':'49','VT':'50','VA':'51','WA':'53','WV':'54',
  'WI':'55','WY':'56'
};

const COMMODITIES = [
  { code: 'CORN',      nass: 'CORN',       unit: 'BU / ACRE' },
  { code: 'SOYBEANS',  nass: 'SOYBEANS',   unit: 'BU / ACRE' },
  { code: 'WHEAT',     nass: 'WHEAT',      unit: 'BU / ACRE' },
  { code: 'SORGHUM',   nass: 'SORGHUM',    unit: 'BU / ACRE' },
  { code: 'BARLEY',    nass: 'BARLEY',     unit: 'BU / ACRE' },
  { code: 'OATS',      nass: 'OATS',       unit: 'BU / ACRE' },
  { code: 'COTTON',    nass: 'COTTON',     unit: 'LB / ACRE' },
  { code: 'PEANUTS',   nass: 'PEANUTS',    unit: 'LB / ACRE' },
  { code: 'RICE_LONG', nass: 'RICE',       unit: 'CWT / ACRE' },
  { code: 'SUNFLOWER', nass: 'SUNFLOWERS', unit: 'LB / ACRE' },
];

// ─── Supabase Client ─────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ─── Utilities ───────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-county';
}

function titleCase(str) {
  return str.toLowerCase().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function olympicAverage(values) {
  const valid = values.filter(v => v != null && !isNaN(v));
  if (valid.length < 3) {
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  }
  valid.sort((a, b) => a - b);
  const middle = valid.slice(1, -1);
  return middle.reduce((a, b) => a + b, 0) / middle.length;
}

// ─── NASS API with Retry ─────────────────────────────────────────────────────

async function fetchNASS(params, retries = 3) {
  const url = new URL(NASS_BASE_URL);
  url.searchParams.set('key', NASS_API_KEY);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (response.status === 504 || response.status === 503 || response.status === 502) {
        if (attempt < retries) {
          const wait = attempt * 5000;
          process.stdout.write(` retry(${response.status})...`);
          await sleep(wait);
          continue;
        }
        return [];
      }

      if (response.status === 429) {
        process.stdout.write(` rate-limited, waiting 30s...`);
        await sleep(30000);
        continue;
      }

      if (!response.ok) {
        if (attempt < retries) { await sleep(3000); continue; }
        return [];
      }

      const text = await response.text();
      // Handle HTML error pages
      if (text.startsWith('<')) {
        if (attempt < retries) {
          process.stdout.write(` html-error, retry...`);
          await sleep(5000);
          continue;
        }
        return [];
      }

      const data = JSON.parse(text);
      if (data.error) return [];
      return data.data || [];

    } catch (err) {
      if (err.name === 'AbortError' && attempt < retries) {
        process.stdout.write(` timeout, retry...`);
        await sleep(5000);
        continue;
      }
      if (attempt < retries) { await sleep(3000); continue; }
      return [];
    }
  }
  return [];
}

// ─── Parse NASS records ──────────────────────────────────────────────────────

function parseRecords(records, commodityCode) {
  const counties = new Map();
  const yields = [];

  for (const rec of records) {
    const stateFips = rec.state_fips_code?.padStart(2, '0');
    const countyCode = rec.county_code?.padStart(3, '0');
    if (!stateFips || !countyCode) continue;
    if (countyCode === '998' || countyCode === '999') continue;

    const fips = `${stateFips}${countyCode}`;
    const year = parseInt(rec.year);
    const val = rec.Value?.replace(/,/g, '');

    if (!counties.has(fips)) {
      const rawName = rec.county_name?.trim() || '';
      counties.set(fips, {
        county_fips: fips,
        state_fips: stateFips,
        name: rawName.toUpperCase(),
        display_name: titleCase(rawName) + ' County',
        slug: slugify(rawName || fips),
      });
    }

    if (val && val !== '(D)' && val !== '(Z)' && val !== '(NA)' && !isNaN(parseFloat(val))) {
      yields.push({
        county_fips: fips,
        commodity_code: commodityCode,
        crop_year: year,
        county_yield: parseFloat(val),
      });
    }
  }

  return { counties: Array.from(counties.values()), yields };
}

// ─── Upsert to Supabase ─────────────────────────────────────────────────────

async function upsertCounties(countyList) {
  if (countyList.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < countyList.length; i += chunkSize) {
    const chunk = countyList.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('counties')
      .upsert(chunk, { onConflict: 'county_fips', ignoreDuplicates: true });
    if (error) console.error(`\n   ❌ County upsert: ${error.message}`);
  }
}

async function insertYields(yieldRows) {
  if (yieldRows.length === 0) return;
  const chunkSize = 1000;
  for (let i = 0; i < yieldRows.length; i += chunkSize) {
    const chunk = yieldRows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('county_crop_data')
      .upsert(chunk, { onConflict: 'county_fips,commodity_code,crop_year' });
    if (error) console.error(`\n   ❌ Yield insert: ${error.message}`);
  }
}

// ─── Calculate ARC-CO benchmarks ─────────────────────────────────────────────

async function calculateBenchmarks() {
  console.log('\n🧮 Calculating ARC-CO benchmarks...');

  const { data: myaPrices } = await supabase.from('mya_prices').select('*');
  const myaLookup = {};
  for (const row of myaPrices || []) {
    myaLookup[`${row.commodity_code}-${row.crop_year}`] = parseFloat(row.mya_price);
  }

  const { data: refPrices } = await supabase.from('commodity_reference').select('*');
  const refLookup = {};
  for (const r of refPrices || []) refLookup[r.commodity_code] = r;

  let offset = 0;
  const pageSize = 10000;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: rows } = await supabase
      .from('county_crop_data')
      .select('id, county_fips, commodity_code, crop_year, county_yield')
      .order('county_fips').order('commodity_code').order('crop_year')
      .range(offset, offset + pageSize - 1);

    if (!rows || rows.length === 0) { hasMore = false; break; }

    const grouped = {};
    for (const row of rows) {
      const key = `${row.county_fips}-${row.commodity_code}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    const updates = [];
    for (const [, groupRows] of Object.entries(grouped)) {
      const commodityCode = groupRows[0].commodity_code;
      const ref = refLookup[commodityCode];
      if (!ref) continue;

      groupRows.sort((a, b) => a.crop_year - b.crop_year);

      for (const row of groupRows) {
        if (!row.county_yield) continue;
        const year = row.crop_year;

        const prevYields = groupRows
          .filter(r => r.crop_year >= year - 5 && r.crop_year < year && r.county_yield)
          .map(r => parseFloat(r.county_yield));

        const prevPrices = [];
        for (let y = year - 5; y < year; y++) {
          const p = myaLookup[`${commodityCode}-${y}`];
          if (p) prevPrices.push(Math.max(p, parseFloat(ref.effective_ref_price || ref.statutory_ref_price)));
        }

        const benchYield = prevYields.length >= 3 ? olympicAverage(prevYields) : null;
        const benchPrice = prevPrices.length >= 3 ? olympicAverage(prevPrices) : null;

        if (benchYield && benchPrice) {
          const benchRevenue = benchYield * benchPrice;
          const arcGuarantee = benchRevenue * parseFloat(ref.arc_guarantee_pct);
          const myaPrice = myaLookup[`${commodityCode}-${year}`];
          const actualPrice = myaPrice ? Math.max(myaPrice, parseFloat(ref.loan_rate)) : null;
          const arcActualRev = actualPrice ? parseFloat(row.county_yield) * actualPrice : null;

          let arcPayment = null;
          if (arcActualRev !== null) {
            const shortfall = Math.max(0, arcGuarantee - arcActualRev);
            arcPayment = Math.min(shortfall, benchRevenue * 0.10);
          }

          let plcPayment = null;
          if (myaPrice) {
            const erp = parseFloat(ref.effective_ref_price || ref.statutory_ref_price);
            plcPayment = Math.max(0, erp - myaPrice) * 0.85;
          }

          updates.push({
            id: row.id,
            benchmark_yield: Math.round(benchYield * 100) / 100,
            benchmark_price: Math.round(benchPrice * 10000) / 10000,
            benchmark_revenue: Math.round(benchRevenue * 100) / 100,
            arc_guarantee: Math.round(arcGuarantee * 100) / 100,
            arc_actual_revenue: arcActualRev ? Math.round(arcActualRev * 100) / 100 : null,
            arc_payment_rate: arcPayment !== null ? Math.round(arcPayment * 100) / 100 : null,
            mya_price: myaPrice || null,
            plc_payment_rate: plcPayment !== null ? Math.round(plcPayment * 100) / 100 : null,
          });
        }
      }
    }

    // Batch update
    for (const upd of updates) {
      const { id, ...data } = upd;
      await supabase.from('county_crop_data').update(data).eq('id', id);
    }

    totalUpdated += updates.length;
    process.stdout.write(`   📊 Benchmarks: ${totalUpdated.toLocaleString()} records\r`);

    offset += pageSize;
    if (rows.length < pageSize) hasMore = false;
  }

  console.log(`\n   ✅ ${totalUpdated.toLocaleString()} benchmarks calculated`);
}

// ─── Update county metadata ──────────────────────────────────────────────────

async function updateCountyMetadata() {
  console.log('\n📋 Updating county metadata...');

  const { data: rows } = await supabase
    .from('county_crop_data')
    .select('county_fips')
    .not('county_yield', 'is', null);

  if (rows) {
    const uniqueFips = [...new Set(rows.map(r => r.county_fips))];
    console.log(`   Marking ${uniqueFips.length} counties with data...`);

    for (let i = 0; i < uniqueFips.length; i += 500) {
      await supabase
        .from('counties')
        .update({ has_arc_plc_data: true })
        .in('county_fips', uniqueFips.slice(i, i + 500));
    }
  }

  const { data: countyRows } = await supabase
    .from('counties').select('state_fips').eq('has_arc_plc_data', true);

  if (countyRows) {
    const counts = {};
    for (const r of countyRows) counts[r.state_fips] = (counts[r.state_fips] || 0) + 1;
    for (const [fips, count] of Object.entries(counts)) {
      await supabase.from('states').update({ county_count: count }).eq('state_fips', fips);
    }
    console.log(`   ✅ Updated ${Object.keys(counts).length} state counts`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  HarvestFile — County Data Ingestion v2 (state-by-state)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY first.');
    process.exit(1);
  }

  console.log('🔌 Testing Supabase...');
  const { error } = await supabase.from('states').select('state_fips').limit(1);
  if (error) { console.error('❌ Connection failed:', error.message); process.exit(1); }
  console.log('   ✅ Connected\n');

  const startTime = Date.now();
  const allCounties = new Map();
  let totalYields = 0;

  for (const commodity of COMMODITIES) {
    console.log(`\n━━━ ${commodity.code} ${'━'.repeat(50 - commodity.code.length)}`);
    let cYields = 0;

    for (let si = 0; si < ALL_STATES.length; si++) {
      const state = ALL_STATES[si];
      const pct = Math.round(((si + 1) / ALL_STATES.length) * 100);
      process.stdout.write(`   ${state} [${pct}%]...`);

      const records = await fetchNASS({
        source_desc: 'SURVEY',
        sector_desc: 'CROPS',
        commodity_desc: commodity.nass,
        statisticcat_desc: 'YIELD',
        unit_desc: commodity.unit,
        agg_level_desc: 'COUNTY',
        state_alpha: state,
        year__GE: '2014',
        year__LE: '2024',
      });

      if (records.length === 0) {
        process.stdout.write(` skip\n`);
        await sleep(300);
        continue;
      }

      const { counties, yields } = parseRecords(records, commodity.code);
      for (const c of counties) {
        if (!allCounties.has(c.county_fips)) allCounties.set(c.county_fips, c);
      }

      await upsertCounties(counties);
      await insertYields(yields);

      cYields += yields.length;
      process.stdout.write(` ✅ ${counties.length} counties, ${yields.length} rows\n`);
      await sleep(500); // Be nice to NASS
    }

    totalYields += cYields;
    console.log(`   TOTAL: ${cYields.toLocaleString()} records`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Collection done: ${allCounties.size} counties, ${totalYields.toLocaleString()} yields`);
  console.log(`  Time: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log('═══════════════════════════════════════════════════════════════');

  await calculateBenchmarks();
  await updateCountyMetadata();

  const mins = Math.floor((Date.now() - startTime) / 60000);
  const secs = Math.round(((Date.now() - startTime) % 60000) / 1000);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ COMPLETE');
  console.log(`  Time: ${mins}m ${secs}s`);
  console.log(`  Counties: ${allCounties.size}`);
  console.log(`  Yields: ${totalYields.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n  Next: Return to Claude for Build 5A-2');
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
