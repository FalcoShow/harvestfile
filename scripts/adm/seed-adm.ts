// =============================================================================
// HarvestFile — Phase 16B Build 2A: RMA ADM Parser + Supabase Seeder
// scripts/adm/seed-adm.ts
//
// Parses RMA Actuarial Data Master pipe-delimited files, filters for
// 5 major commodities (corn, soybeans, wheat, sorghum, cotton), and
// uploads county-specific premium rate data to Supabase.
//
// Run: npx tsx scripts/adm/seed-adm.ts
//
// Prerequisites:
//   - ADM YTD files in data/adm-2026/2026_ADM_YTD/
//   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('   Add SUPABASE_SERVICE_ROLE_KEY=your-service-role-key to .env.local');
  console.error('   Find it in Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADM_DIR = path.join(process.cwd(), 'data', 'adm-2026', '2026_ADM_YTD');
const CROP_YEAR = 2026;

// ─── Target commodities ──────────────────────────────────────────────────────
const TARGET_COMMODITIES = new Set(['0041', '0081', '0011', '0051', '0021']);
const COMMODITY_NAMES: Record<string, string> = {
  '0041': 'Corn',
  '0081': 'Soybeans',
  '0011': 'Wheat',
  '0051': 'Sorghum',
  '0021': 'Cotton',
};

// Individual plans: 01=YP, 02=RP, 03=RP-HPE, 04=APH (Dollar)
const INDIVIDUAL_PLANS = new Set(['01', '02', '03', '04']);
// Area-based plans (for SCO/ECO): various plan codes
const AREA_PLANS = new Set(['44', '45', '55', '56', '87', '88', '89', '90']);
// All plans we care about
const ALL_TARGET_PLANS = new Set([...INDIVIDUAL_PLANS, ...AREA_PLANS]);

// ─── Utility: Stream parse a pipe-delimited file ─────────────────────────────

interface ParseOptions {
  /** Return true to include this row */
  filter?: (row: Record<string, string>) => boolean;
  /** Max rows to collect (0 = unlimited) */
  limit?: number;
  /** Log progress every N lines */
  progressEvery?: number;
}

async function parsePipeFile(
  fileName: string,
  opts: ParseOptions = {}
): Promise<Record<string, string>[]> {
  const filePath = path.join(ADM_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ File not found: ${fileName}`);
    return [];
  }

  const fileSize = fs.statSync(filePath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
  console.log(`  📄 Parsing ${fileName} (${fileSizeMB} MB)...`);

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  let lineNum = 0;
  let matchCount = 0;
  const results: Record<string, string>[] = [];
  const progressEvery = opts.progressEvery || 500000;

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      // Header row
      headers = line.split('|').map(h => h.trim());
      continue;
    }

    if (opts.limit && matchCount >= opts.limit) break;

    if (lineNum % progressEvery === 0) {
      process.stdout.write(`    ${lineNum.toLocaleString()} lines scanned, ${matchCount.toLocaleString()} matched\r`);
    }

    const values = line.split('|');
    if (values.length < 3) continue; // skip malformed lines

    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length && i < values.length; i++) {
      row[headers[i]] = values[i]?.trim() || '';
    }

    // Skip deleted records
    if (row['Deleted Date'] && row['Deleted Date'].length > 0) continue;

    if (!opts.filter || opts.filter(row)) {
      results.push(row);
      matchCount++;
    }
  }

  console.log(`    ✓ ${lineNum.toLocaleString()} lines → ${matchCount.toLocaleString()} records kept`);
  return results;
}

// ─── Utility: Stream parse and call callback per matching row ────────────────
// For very large files where we don't want to hold everything in memory

async function streamPipeFile(
  fileName: string,
  filter: (row: Record<string, string>) => boolean,
  callback: (row: Record<string, string>) => void,
  progressEvery = 1000000
): Promise<number> {
  const filePath = path.join(ADM_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ File not found: ${fileName}`);
    return 0;
  }

  const fileSize = fs.statSync(filePath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
  console.log(`  📄 Streaming ${fileName} (${fileSizeMB} MB)...`);

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  let lineNum = 0;
  let matchCount = 0;

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      headers = line.split('|').map(h => h.trim());
      continue;
    }

    if (lineNum % progressEvery === 0) {
      process.stdout.write(`    ${lineNum.toLocaleString()} lines scanned, ${matchCount.toLocaleString()} matched\r`);
    }

    const values = line.split('|');
    if (values.length < 3) continue;

    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length && i < values.length; i++) {
      row[headers[i]] = values[i]?.trim() || '';
    }

    if (row['Deleted Date'] && row['Deleted Date'].length > 0) continue;

    if (filter(row)) {
      callback(row);
      matchCount++;
    }
  }

  console.log(`    ✓ ${lineNum.toLocaleString()} lines → ${matchCount.toLocaleString()} records`);
  return matchCount;
}

// ─── Utility: Batch insert to Supabase ───────────────────────────────────────

async function batchInsert(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 500
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: '' }).select('id');

    if (error) {
      // Try insert instead of upsert
      const { error: insertError } = await supabase.from(table).insert(batch);
      if (insertError) {
        console.error(`    ❌ Insert error on ${table} batch ${i}-${i + batch.length}: ${insertError.message}`);
        // Try individual inserts for this batch to find problematic row
        for (const row of batch) {
          const { error: singleError } = await supabase.from(table).insert(row);
          if (!singleError) inserted++;
        }
        continue;
      }
    }
    inserted += batch.length;

    if ((i + batchSize) % 5000 === 0 || i + batchSize >= rows.length) {
      process.stdout.write(`    Inserted ${Math.min(i + batchSize, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}\r`);
    }
  }

  console.log(`    ✓ ${inserted.toLocaleString()} rows inserted into ${table}`);
  return inserted;
}

// ─── Parse helper: safe numeric conversion ───────────────────────────────────

function num(val: string | undefined): number | null {
  if (!val || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function bool(val: string | undefined): boolean {
  return val === 'Y' || val === 'y';
}

// ─── Step 1: Parse States ────────────────────────────────────────────────────

async function loadStates(): Promise<Map<string, string>> {
  console.log('\n═══ Step 1: States ═══');
  const rows = await parsePipeFile('2026_A00520_State_YTD.txt');

  const stateMap = new Map<string, string>();
  const dbRows: Record<string, unknown>[] = [];

  for (const row of rows) {
    const fips = row['State Code'];
    const name = row['State Name'] || row['State Abbreviation'] || fips;
    stateMap.set(fips, name);
    dbRows.push({
      crop_year: CROP_YEAR,
      state_fips: fips,
      state_name: name,
      state_abbreviation: row['State Abbreviation'] || null,
    });
  }

  await batchInsert('adm_states', dbRows);
  return stateMap;
}

// ─── Step 2: Parse Counties ──────────────────────────────────────────────────

async function loadCounties(): Promise<Map<string, string>> {
  console.log('\n═══ Step 2: Counties ═══');
  const rows = await parsePipeFile('2026_A00440_County_YTD.txt');

  const countyMap = new Map<string, string>(); // "SS-CCC" → name
  const dbRows: Record<string, unknown>[] = [];

  for (const row of rows) {
    const key = `${row['State Code']}-${row['County Code']}`;
    countyMap.set(key, row['County Name']);
    dbRows.push({
      crop_year: CROP_YEAR,
      state_fips: row['State Code'],
      county_fips: row['County Code'],
      county_name: row['County Name'],
    });
  }

  await batchInsert('adm_counties', dbRows);
  console.log(`  ${countyMap.size} counties loaded`);
  return countyMap;
}

// ─── Step 3: Parse Commodities ───────────────────────────────────────────────

async function loadCommodities(): Promise<void> {
  console.log('\n═══ Step 3: Commodities ═══');
  const rows = await parsePipeFile('2026_A00420_Commodity_YTD.txt', {
    filter: (r) => TARGET_COMMODITIES.has(r['Commodity Code']),
  });

  const dbRows = rows.map(r => ({
    crop_year: CROP_YEAR,
    commodity_code: r['Commodity Code'],
    commodity_name: r['Commodity Name'],
    commodity_abbreviation: r['Commodity Abbreviation'],
  }));

  // Deduplicate by commodity code (may have multiple commodity_year records)
  const seen = new Set<string>();
  const unique = dbRows.filter(r => {
    if (seen.has(r.commodity_code)) return false;
    seen.add(r.commodity_code);
    return true;
  });

  await batchInsert('adm_commodities', unique);
}

// ─── Step 4: Parse Subsidy Rates ─────────────────────────────────────────────

async function loadSubsidyRates(): Promise<void> {
  console.log('\n═══ Step 4: Subsidy Rates ═══');
  const rows = await parsePipeFile('2026_A00070_SubsidyPercent_YTD.txt');

  const dbRows = rows.map(r => ({
    crop_year: CROP_YEAR,
    commodity_code: r['Commodity Code'] || null,
    unit_structure: r['Unit Structure Code'],
    insurance_plan_code: r['Insurance Plan Code'],
    coverage_level: num(r['Coverage Level Percent']),
    coverage_type: r['Coverage Type Code'] || null,
    deductible_amount: num(r['Deductible Amount']),
    subsidy_percent: num(r['Subsidy Percent']),
  }));

  await batchInsert('adm_subsidy_rates', dbRows);
}

// ─── Step 5: Parse Unit Discounts ────────────────────────────────────────────

async function loadUnitDiscounts(): Promise<void> {
  console.log('\n═══ Step 5: Unit Discounts ═══');
  const rows = await parsePipeFile('2026_A01090_UnitDiscount_YTD.txt');

  const dbRows = rows.map(r => ({
    crop_year: CROP_YEAR,
    unit_discount_id: r['Unit Discount ID'],
    coverage_level: num(r['Coverage Level Percent']),
    area_low: num(r['Area Low Quantity']),
    area_high: num(r['Area High Quantity']),
    optional_discount: num(r['Optional Unit Discount Factor']),
    basic_discount: num(r['Basic Unit Discount Factor']),
    enterprise_discount: num(r['Enterprise Unit Discount Factor']),
    area_description: r['Area Description'] || null,
  }));

  await batchInsert('adm_unit_discounts', dbRows);
}

// ─── Step 6: Parse Insurance Offers (FILTERED) ───────────────────────────────

async function loadInsuranceOffers(): Promise<Map<string, Record<string, string>>> {
  console.log('\n═══ Step 6: Insurance Offers (filtered for 5 commodities) ═══');

  const offerMap = new Map<string, Record<string, string>>();
  const dbRows: Record<string, unknown>[] = [];

  const rows = await parsePipeFile('2026_A00030_InsuranceOffer_YTD.txt', {
    filter: (r) =>
      TARGET_COMMODITIES.has(r['Commodity Code']) &&
      ALL_TARGET_PLANS.has(r['Insurance Plan Code']),
    progressEvery: 200000,
  });

  for (const r of rows) {
    const offerId = r['ADM Insurance Offer ID'];
    offerMap.set(offerId, r);

    dbRows.push({
      crop_year: CROP_YEAR,
      offer_id: parseInt(offerId),
      commodity_code: r['Commodity Code'],
      insurance_plan_code: r['Insurance Plan Code'],
      state_fips: r['State Code'],
      county_fips: r['County Code'],
      type_code: r['Type Code'] || '997',
      practice_code: r['Practice Code'] || '997',
      commodity_type_code: r['Commodity Type Code'] || null,
      intended_use_code: r['Intended Use Code'] || null,
      irrigation_practice_code: r['Irrigation Practice Code'] || null,
      cropping_practice_code: r['Cropping Practice Code'] || null,
      organic_practice_code: r['Organic Practice Code'] || null,
      unit_of_measure: r['Unit Of Measure Abbreviation'] || null,
      beta_id: r['Beta ID'] || null,
      unit_discount_id: r['Unit Discount ID'] || null,
      enterprise_unit_allowed: bool(r['Enterprise Unit Allowed Flag']),
      basic_unit_allowed: bool(r['Basic Unit Allowed Flag']),
      optional_unit_allowed: bool(r['Optional Unit Allowed Flag']),
    });
  }

  console.log(`  ${offerMap.size} insurance offers for target commodities`);
  await batchInsert('adm_insurance_offers', dbRows);
  return offerMap;
}

// ─── Step 7: Parse Base Rates (FILTERED by offer IDs) ────────────────────────

async function loadBaseRates(
  offerIds: Set<string>
): Promise<void> {
  console.log('\n═══ Step 7: Base Rates (filtered) ═══');

  const dbRows: Record<string, unknown>[] = [];

  await streamPipeFile(
    '2026_A01010_BaseRate_YTD.txt',
    (r) => offerIds.has(r['ADM Insurance Offer ID']),
    (r) => {
      const refAmount = num(r['Reference Amount']);
      const refRate = num(r['Reference Rate']);
      const exponent = num(r['Exponent Value']);
      const fixedRate = num(r['Fixed Rate']);
      const baseRate = num(r['Base Rate']);

      // Compute base rate if not pre-computed
      let computedBase = baseRate;
      if (computedBase === null && refAmount && refRate && exponent !== null && fixedRate !== null) {
        computedBase = refRate * Math.pow(refAmount, exponent) + fixedRate;
      }

      // Apply 20% year-over-year cap
      const priorRefAmount = num(r['Prior Year Reference Amount']);
      const priorRefRate = num(r['Prior Year Reference Rate']);
      const priorExponent = num(r['Prior Year Exponent Value']);
      const priorFixedRate = num(r['Prior Year Fixed Rate']);
      const priorBase = num(r['Prior Year Base Rate']);

      let priorComputed = priorBase;
      if (priorComputed === null && priorRefAmount && priorRefRate && priorExponent !== null && priorFixedRate !== null) {
        priorComputed = priorRefRate * Math.pow(priorRefAmount, priorExponent) + priorFixedRate;
      }

      if (computedBase !== null && priorComputed !== null) {
        computedBase = Math.min(computedBase, priorComputed * 1.20);
      }

      dbRows.push({
        crop_year: CROP_YEAR,
        offer_id: parseInt(r['ADM Insurance Offer ID']),
        commodity_code: r['Commodity Code'],
        insurance_plan_code: r['Insurance Plan Code'],
        state_fips: r['State Code'],
        county_fips: r['County Code'],
        type_code: r['Type Code'] || '997',
        practice_code: r['Practice Code'] || '997',
        coverage_level: num(r['Coverage Level Percent']),
        reference_amount: refAmount,
        reference_rate: refRate,
        exponent_value: exponent,
        fixed_rate: fixedRate,
        base_rate: baseRate,
        prior_year_reference_amount: priorRefAmount,
        prior_year_reference_rate: priorRefRate,
        prior_year_exponent_value: priorExponent,
        prior_year_fixed_rate: priorFixedRate,
        prior_year_base_rate: priorBase,
        computed_base_rate: computedBase !== null ? parseFloat(computedBase.toFixed(8)) : null,
      });
    },
    500000
  );

  await batchInsert('adm_base_rates', dbRows);
}

// ─── Step 8: Parse Coverage Level Differentials (FILTERED — big file!) ───────

async function loadCoverageDifferentials(
  offerIds: Set<string>
): Promise<void> {
  console.log('\n═══ Step 8: Coverage Level Differentials (2.6 GB — this takes a few minutes) ═══');

  const dbRows: Record<string, unknown>[] = [];
  let batchNum = 0;
  const FLUSH_SIZE = 10000;

  await streamPipeFile(
    '2026_A01040_CoverageLevelDifferential_YTD.txt',
    (r) => offerIds.has(r['ADM Insurance Offer ID']),
    (r) => {
      dbRows.push({
        crop_year: CROP_YEAR,
        offer_id: parseInt(r['ADM Insurance Offer ID']),
        commodity_code: r['Commodity Code'],
        insurance_plan_code: r['Insurance Plan Code'],
        state_fips: r['State Code'],
        county_fips: r['County Code'],
        type_code: r['Type Code'] || '997',
        practice_code: r['Practice Code'] || '997',
        sub_county_code: r['Sub County Code'] || null,
        coverage_level: num(r['Coverage Level Percent']),
        coverage_type: r['Coverage Type Code'] || null,
        rate_differential: num(r['Rate Differential Factor']),
        unit_residual: num(r['Unit Residual Factor']),
        enterprise_residual: num(r['Enterprise Unit Residual Factor']),
        whole_farm_residual: num(r['Whole Farm Unit Residual Factor']),
        prior_rate_differential: num(r['Prior Year Rate Differential Factor']),
        prior_unit_residual: num(r['Prior Year Unit Residual Factor']),
        prior_enterprise_residual: num(r['Prior Year Enterprise Unit Residual Factor']),
      });
    },
    500000
  );

  // Insert all at once (will be batched internally)
  await batchInsert('adm_coverage_differentials', dbRows);
}

// ─── Step 9: Parse Price Parameters (FILTERED) ──────────────────────────────

async function loadPrices(
  offerIds: Set<string>
): Promise<void> {
  console.log('\n═══ Step 9: Price Parameters (1 GB — filtering for target commodities) ═══');

  const dbRows: Record<string, unknown>[] = [];

  await streamPipeFile(
    '2026_A00810_Price_YTD.txt',
    (r) =>
      TARGET_COMMODITIES.has(r['Commodity Code']) &&
      ALL_TARGET_PLANS.has(r['Insurance Plan Code']),
    (r) => {
      dbRows.push({
        crop_year: CROP_YEAR,
        offer_id: r['ADM Insurance Offer ID'] ? parseInt(r['ADM Insurance Offer ID']) : null,
        commodity_code: r['Commodity Code'],
        insurance_plan_code: r['Insurance Plan Code'],
        state_fips: r['State Code'],
        county_fips: r['County Code'],
        type_code: r['Type Code'] || '997',
        practice_code: r['Practice Code'] || '997',
        projected_price: num(r['Projected Price']),
        harvest_price: num(r['Harvest Price']),
        volatility_factor: num(r['Price Volatility Factor']),
        catastrophic_price: num(r['Catastrophic Price']),
        established_price: num(r['Established Price']),
        maximum_protection_per_acre: num(r['Maximum Protection Per Acre']),
      });
    },
    500000
  );

  await batchInsert('adm_prices', dbRows);
}

// ─── Step 10: Parse Area Coverage Levels (SCO/ECO) ──────────────────────────

async function loadAreaCoverage(
  offerIds: Set<string>
): Promise<Set<string>> {
  console.log('\n═══ Step 10: Area Coverage Levels (SCO/ECO) ═══');

  const areaRateIds = new Set<string>();
  const dbRows: Record<string, unknown>[] = [];

  await streamPipeFile(
    '2026_A01130_AreaCoverageLevel_YTD.txt',
    (r) => offerIds.has(r['ADM Insurance Offer ID']),
    (r) => {
      const areaRateId = r['Area Rate ID'];
      if (areaRateId) areaRateIds.add(areaRateId);

      dbRows.push({
        crop_year: CROP_YEAR,
        offer_id: parseInt(r['ADM Insurance Offer ID']),
        sub_county_code: r['Sub County Code'] || null,
        coverage_level: num(r['Coverage Level Percent']),
        coverage_type: r['Coverage Type Code'] || null,
        insurance_option_code: r['Insurance Option Code'] || null,
        area_loss_start: num(r['Area Loss Start Percent']),
        area_loss_end: num(r['Area Loss End Percent']),
        payment_factor: num(r['Payment Factor']),
        area_rate_id: areaRateId ? parseInt(areaRateId) : null,
      });
    },
    500000
  );

  await batchInsert('adm_area_coverage', dbRows);
  console.log(`  ${areaRateIds.size} unique area rate IDs to look up`);
  return areaRateIds;
}

// ─── Step 11: Parse Area Rates (filtered by collected IDs) ───────────────────

async function loadAreaRates(
  areaRateIds: Set<string>
): Promise<void> {
  console.log('\n═══ Step 11: Area Rates (776 MB — filtering by collected IDs) ═══');

  const dbRows: Record<string, unknown>[] = [];

  await streamPipeFile(
    '2026_A01135_AreaRate_YTD.txt',
    (r) => areaRateIds.has(r['Area Rate ID']),
    (r) => {
      dbRows.push({
        crop_year: CROP_YEAR,
        area_rate_id: parseInt(r['Area Rate ID']),
        volatility_factor: num(r['Price Volatility Factor']),
        base_rate: num(r['Base Rate']),
      });
    },
    1000000
  );

  await batchInsert('adm_area_rates', dbRows);
}

// ─── Main ETL Pipeline ──────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  HarvestFile — Phase 16B Build 2A: ADM Data Pipeline        ║');
  console.log('║  Parsing RMA Actuarial Data Master for 5 major commodities  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nADM Directory: ${ADM_DIR}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Target: ${Array.from(TARGET_COMMODITIES).map(c => `${c} (${COMMODITY_NAMES[c]})`).join(', ')}`);

  // Verify ADM directory exists
  if (!fs.existsSync(ADM_DIR)) {
    console.error(`❌ ADM directory not found: ${ADM_DIR}`);
    process.exit(1);
  }

  const startTime = Date.now();

  // Log ETL start
  const { data: loadRecord } = await supabase.from('adm_data_loads').insert({
    crop_year: CROP_YEAR,
    source_file: '2026_ADM_YTD',
    load_started_at: new Date().toISOString(),
    status: 'running',
  }).select().single();

  try {
    // ── Phase 1: Small reference tables ──
    const stateMap = await loadStates();
    const countyMap = await loadCounties();
    await loadCommodities();
    await loadSubsidyRates();
    await loadUnitDiscounts();

    // ── Phase 2: Insurance offers (the hub table) ──
    const offerMap = await loadInsuranceOffers();
    const offerIds = new Set(offerMap.keys());

    console.log(`\n  📊 Filtered offer IDs: ${offerIds.size.toLocaleString()}`);

    // ── Phase 3: Rate tables (big files, filtered by offer IDs) ──
    await loadBaseRates(offerIds);
    await loadCoverageDifferentials(offerIds);
    await loadPrices(offerIds);

    // ── Phase 4: Area-based rates for SCO/ECO ──
    const areaRateIds = await loadAreaCoverage(offerIds);
    await loadAreaRates(areaRateIds);

    // ── Done ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  ✅ ADM ETL Complete — ${elapsed} seconds                       `);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Update load record
    if (loadRecord) {
      await supabase.from('adm_data_loads').update({
        load_completed_at: new Date().toISOString(),
        status: 'completed',
        records_loaded: offerIds.size,
      }).eq('id', loadRecord.id);
    }

    // Quick validation
    console.log('\n═══ Validation ═══');
    const { count: offerCount } = await supabase.from('adm_insurance_offers').select('*', { count: 'exact', head: true });
    const { count: baseCount } = await supabase.from('adm_base_rates').select('*', { count: 'exact', head: true });
    const { count: cldCount } = await supabase.from('adm_coverage_differentials').select('*', { count: 'exact', head: true });
    const { count: priceCount } = await supabase.from('adm_prices').select('*', { count: 'exact', head: true });
    const { count: areaCount } = await supabase.from('adm_area_coverage').select('*', { count: 'exact', head: true });
    const { count: areaRateCount } = await supabase.from('adm_area_rates').select('*', { count: 'exact', head: true });

    console.log(`  Insurance Offers: ${offerCount?.toLocaleString()}`);
    console.log(`  Base Rates: ${baseCount?.toLocaleString()}`);
    console.log(`  Coverage Differentials: ${cldCount?.toLocaleString()}`);
    console.log(`  Prices: ${priceCount?.toLocaleString()}`);
    console.log(`  Area Coverage: ${areaCount?.toLocaleString()}`);
    console.log(`  Area Rates: ${areaRateCount?.toLocaleString()}`);

    // Test: Get corn premium data for a sample county (Story County, Iowa)
    console.log('\n═══ Sample Query: Corn RP in Story County, Iowa (19-169) ═══');
    const { data: sampleData } = await supabase.rpc('calculate_county_premium', {
      p_state_fips: '19',
      p_county_fips: '169',
      p_commodity_code: '0041',
      p_coverage_level: 0.75,
      p_aph_yield: 190,
      p_acres: 500,
      p_plan_code: '02',
    });
    if (sampleData) {
      console.log(JSON.stringify(sampleData, null, 2));
    } else {
      console.log('  (Premium calculation function not yet available — run migration first)');
    }

  } catch (error) {
    console.error('\n❌ ETL Failed:', error);
    if (loadRecord) {
      await supabase.from('adm_data_loads').update({
        status: 'failed',
        error_message: String(error),
      }).eq('id', loadRecord.id);
    }
    process.exit(1);
  }
}

main().catch(console.error);
