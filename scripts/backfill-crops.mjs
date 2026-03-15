#!/usr/bin/env node
// =============================================================================
// HarvestFile — Backfill Niche Crops (barley, oats, cotton, peanuts, rice, sunflower)
// =============================================================================
//
// HOW TO RUN:
//   cd C:\Users\Andrew\harvestfile
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"
//   node scripts/backfill-crops.mjs
//
// RUNTIME: ~20-30 minutes (slower delays to avoid NASS throttling)
// =============================================================================

import { createClient } from '@supabase/supabase-js';

// ─── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://fzduyjxjdcxbdwjlwrpu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';
const NASS_API_KEY = 'E3837A13-9EC3-3BF9-84EB-B475A476D4A7';
const NASS_BASE_URL = 'https://quickstats.nass.usda.gov/api/api_GET/';

// Only the commodities we're missing from the first run
const COMMODITIES = [
  { code: 'BARLEY',    nass: 'BARLEY',     unit: 'BU / ACRE' },
  { code: 'OATS',      nass: 'OATS',       unit: 'BU / ACRE' },
  { code: 'COTTON',    nass: 'COTTON',     unit: 'LB / ACRE' },
  { code: 'PEANUTS',   nass: 'PEANUTS',    unit: 'LB / ACRE' },
  { code: 'RICE_LONG', nass: 'RICE',       unit: 'CWT / ACRE' },
  { code: 'SUNFLOWER', nass: 'SUNFLOWERS', unit: 'LB / ACRE' },
];

// States ordered by relevance to each crop type
// (cotton/peanut states first, then grain states, then everything else)
const AG_STATES = [
  // Cotton/peanut belt
  'TX','GA','AL','MS','AR','NC','SC','LA','TN','VA','FL','OK','AZ','CA','NM',
  // Rice belt
  'MO',
  // Barley/oats/sunflower belt
  'ND','MT','SD','MN','ID','WA','CO','WY','OR','NE','KS','WI',
  // Remaining ag states
  'IA','IL','IN','OH','MI','KY','PA','NY','MD','NJ','WV','DE',
  'VT','ME','NH','MA','CT','RI','NV','UT','HI','AK'
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

// ─── NASS API with Retry Logic ───────────────────────────────────────────────

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
          const wait = attempt * 8000; // Longer waits: 8s, 16s, 24s
          process.stdout.write(`\n   ⏳ Server busy (${response.status}), retry ${attempt}/${retries} in ${wait/1000}s...`);
          await sleep(wait);
          continue;
        }
        return [];
      }

      if (response.status === 429) {
        const wait = 45000; // Longer rate-limit wait
        process.stdout.write(`\n   ⏳ Rate limited, waiting 45s...`);
        await sleep(wait);
        continue;
      }

      if (!response.ok) {
        if (attempt < retries) {
          await sleep(5000);
          continue;
        }
        return [];
      }

      const data = await response.json();
      if (data.error) return [];

      return data.data || [];
    } catch (err) {
      if (err.name === 'AbortError') {
        if (attempt < retries) {
          process.stdout.write(`\n   ⏳ Timeout, retry ${attempt}/${retries}...`);
          await sleep(8000);
          continue;
        }
        return [];
      }
      if (attempt < retries) {
        await sleep(5000);
        continue;
      }
      return [];
    }
  }
  return [];
}

// ─── Fetch yields for ONE state + ONE commodity ──────────────────────────────

async function fetchStateYields(stateAbbrev, commodity) {
  return await fetchNASS({
    source_desc: 'SURVEY',
    sector_desc: 'CROPS',
    commodity_desc: commodity.nass,
    statisticcat_desc: 'YIELD',
    unit_desc: commodity.unit,
    agg_level_desc: 'COUNTY',
    state_alpha: stateAbbrev,
    year__GE: '2014',
    year__LE: '2025',
  });
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

// ─── Upsert counties ─────────────────────────────────────────────────────────

async function upsertCounties(countyList) {
  if (countyList.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < countyList.length; i += chunkSize) {
    const chunk = countyList.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('counties')
      .upsert(chunk, { onConflict: 'county_fips', ignoreDuplicates: true });
    if (error) console.error(`   ❌ County upsert: ${error.message}`);
  }
}

// ─── Insert yields ───────────────────────────────────────────────────────────

async function insertYields(yieldRows) {
  if (yieldRows.length === 0) return;
  const chunkSize = 1000;
  for (let i = 0; i < yieldRows.length; i += chunkSize) {
    const chunk = yieldRows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('county_crop_data')
      .upsert(chunk, {
        onConflict: 'county_fips,commodity_code,crop_year',
        ignoreDuplicates: false
      });
    if (error) console.error(`   ❌ Yield insert: ${error.message}`);
  }
}

// ─── Update metadata ─────────────────────────────────────────────────────────

async function updateCountyMetadata() {
  console.log('\n📋 Updating county metadata...');

  const { data: rows } = await supabase
    .from('county_crop_data')
    .select('county_fips')
    .not('county_yield', 'is', null);

  if (rows) {
    const uniqueFips = Array.from(new Set(rows.map(r => r.county_fips)));
    console.log(`   Marking ${uniqueFips.length} counties as having data...`);
    for (let i = 0; i < uniqueFips.length; i += 500) {
      const chunk = uniqueFips.slice(i, i + 500);
      await supabase.from('counties').update({ has_arc_plc_data: true }).in('county_fips', chunk);
    }
  }

  const { data: countyRows } = await supabase
    .from('counties')
    .select('state_fips')
    .eq('has_arc_plc_data', true);

  if (countyRows) {
    const counts = {};
    for (const row of countyRows) {
      counts[row.state_fips] = (counts[row.state_fips] || 0) + 1;
    }
    for (const [fips, count] of Object.entries(counts)) {
      await supabase.from('states').update({ county_count: count }).eq('state_fips', fips);
    }
    console.log(`   ✅ Updated counts for ${Object.keys(counts).length} states`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  HarvestFile — Niche Crop Backfill');
  console.log('  Commodities: BARLEY, OATS, COTTON, PEANUTS, RICE, SUNFLOWER');
  console.log('  Strategy: State-by-state with 1s delays (throttle-safe)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY first.');
    console.error('   $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"');
    process.exit(1);
  }

  console.log('🔌 Testing Supabase connection...');
  const { error: testErr } = await supabase.from('states').select('state_fips').limit(1);
  if (testErr) {
    console.error('❌ Supabase connection failed:', testErr.message);
    process.exit(1);
  }
  console.log('   ✅ Connected\n');

  const startTime = Date.now();
  let totalYields = 0;
  let totalNewCounties = 0;

  for (const commodity of COMMODITIES) {
    console.log(`\n━━━ ${commodity.code} (NASS: ${commodity.nass}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let commodityYields = 0;
    let commodityCounties = 0;

    for (let si = 0; si < AG_STATES.length; si++) {
      const state = AG_STATES[si];
      process.stdout.write(`   ${commodity.code} · ${state} (${si+1}/${AG_STATES.length})...`);

      try {
        const records = await fetchStateYields(state, commodity);

        if (records.length === 0) {
          process.stdout.write(` no data\n`);
          await sleep(500);
          continue;
        }

        const { counties, yields } = parseRecords(records, commodity.code);
        await upsertCounties(counties);
        await insertYields(yields);

        commodityYields += yields.length;
        commodityCounties += counties.length;
        process.stdout.write(` ✅ ${counties.length} counties, ${yields.length} records\n`);

      } catch (err) {
        process.stdout.write(` ❌ ${err.message}\n`);
      }

      // 1 second delay between state requests — NASS throttle-safe
      await sleep(1000);
    }

    totalYields += commodityYields;
    totalNewCounties += commodityCounties;
    console.log(`   📊 ${commodity.code} total: ${commodityCounties} counties, ${commodityYields} yield records`);

    // Extra 3s pause between commodities
    console.log(`   ⏳ Pausing 3s before next commodity...\n`);
    await sleep(3000);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Backfill Data Collection Complete`);
  console.log(`  New yield records: ${totalYields.toLocaleString()}`);
  console.log(`  Time: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Update metadata (marks counties + updates state counts)
  await updateCountyMetadata();

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ BACKFILL COMPLETE');
  console.log(`  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
  console.log(`  Yield records added: ${totalYields.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n  Next: Run finalize-data.sql in Supabase SQL Editor');
  console.log('  to calculate benchmarks for the new crop data.');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
