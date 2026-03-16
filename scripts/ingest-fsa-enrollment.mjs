#!/usr/bin/env node
// =============================================================================
// HarvestFile — Phase 7B: FSA Historical Enrollment Ingestion
// =============================================================================
//
// Parses 7 years of FSA "Enrolled Base Acres by County by Commodity by Program"
// Excel files and uploads to the historical_enrollment Supabase table.
//
// HOW TO RUN:
//   cd C:\Users\Andrew\harvestfile
//   npm install xlsx
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"
//   node scripts/ingest-fsa-enrollment.mjs
//
// RUNTIME: ~30 seconds for all 7 files (~165,000 total rows)
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Configuration ───────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://fzduyjxjdcxbdwjlwrpu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Run: $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = join(process.cwd(), 'data', 'fsa-enrollment');
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const BATCH_SIZE = 500; // Supabase upsert batch size

// ─── Crop Name → Commodity Code Mapping ──────────────────────────────────────
// Maps FSA crop names to HarvestFile's internal commodity codes.
// These match the codes used in lib/constants/arc-plc.ts and county-queries.ts.

const CROP_CODE_MAP = {
  'Corn':                    'CORN',
  'Soybeans':                'SOYBEANS',
  'Wheat':                   'WHEAT',
  'Grain Sorghum':           'SORGHUM',
  'Barley':                  'BARLEY',
  'Oats':                    'OATS',
  'Seed Cotton':             'COTTON',
  'Peanuts':                 'PEANUTS',
  'Rice_Long Grain':         'RICE_LONG',
  'Rice_Med/Short Grain':    'RICE_MED',
  'Rice_Temperate Japonica': 'RICE_JAPONICA',
  'Sunflower Seed':          'SUNFLOWER',
  'Canola':                  'CANOLA',
  'Flaxseed':                'FLAXSEED',
  'Dry Peas':                'DRY_PEAS',
  'Lentils':                 'LENTILS',
  'Safflower':               'SAFFLOWER',
  'Chickpeas_Large':         'CHICKPEAS_LG',
  'Chickpeas_Small':         'CHICKPEAS_SM',
  'Mustard Seed':            'MUSTARD',
  'Sesame Seed':             'SESAME',
  'Crambe':                  'CRAMBE',
  'Rapeseed':                'RAPESEED',
};

// ─── Parse a single Excel file ───────────────────────────────────────────────

function parseEnrollmentFile(filePath, year) {
  console.log(`\n📂 Parsing ${year}...`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON — XLSX handles header detection automatically
  // But we need to handle the two formats:
  //   2019-2021: Row 1 = headers, Row 2+ = data
  //   2022-2025: Row 1 = title, Row 2 = blank, Row 3 = headers, Row 4+ = data

  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find the header row (the one starting with 'ST_CTY')
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    if (rawData[i] && String(rawData[i][0]).trim() === 'ST_CTY') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.error(`  ❌ Could not find header row in ${year} file`);
    return [];
  }

  const dataRows = rawData.slice(headerRowIdx + 1);
  console.log(`  Found ${dataRows.length} data rows (header at row ${headerRowIdx + 1})`);

  // Pivot: group by county_fips + crop_name, accumulate ARCCO and PLC acres
  const pivotMap = new Map();

  let skipped = 0;
  for (const row of dataRows) {
    const fips = String(row[0] || '').trim();
    const stateName = String(row[1] || '').trim();
    const countyName = String(row[2] || '').trim();
    const cropName = String(row[3] || '').trim();
    const program = String(row[4] || '').trim();
    const acres = parseFloat(row[5]) || 0;

    // Validate
    if (!fips || fips.length !== 5 || !cropName || !program || acres <= 0) {
      skipped++;
      continue;
    }

    const key = `${fips}|${cropName}`;

    if (!pivotMap.has(key)) {
      pivotMap.set(key, {
        county_fips: fips,
        state_name: stateName,
        county_name: countyName,
        crop_name: cropName,
        commodity_code: CROP_CODE_MAP[cropName] || cropName.toUpperCase().replace(/\s+/g, '_'),
        program_year: year,
        arcco_acres: 0,
        plc_acres: 0,
      });
    }

    const entry = pivotMap.get(key);
    if (program === 'ARCCO') {
      entry.arcco_acres += acres;
    } else if (program === 'PLC') {
      entry.plc_acres += acres;
    }
  }

  // Calculate totals and percentages
  const records = [];
  for (const entry of pivotMap.values()) {
    const total = entry.arcco_acres + entry.plc_acres;
    records.push({
      county_fips: entry.county_fips,
      state_name: entry.state_name,
      county_name: entry.county_name,
      crop_name: entry.crop_name,
      commodity_code: entry.commodity_code,
      program_year: entry.program_year,
      arcco_acres: Math.round(entry.arcco_acres * 100) / 100,
      plc_acres: Math.round(entry.plc_acres * 100) / 100,
      total_acres: Math.round(total * 100) / 100,
      arcco_pct: total > 0 ? Math.round((entry.arcco_acres / total) * 1000) / 10 : 0,
      plc_pct: total > 0 ? Math.round((entry.plc_acres / total) * 1000) / 10 : 0,
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠️  Skipped ${skipped} invalid/empty rows`);
  }
  console.log(`  ✅ ${records.length} county×crop records for ${year}`);

  return records;
}

// ─── Upload to Supabase in batches ───────────────────────────────────────────

async function uploadBatch(records) {
  const { error } = await supabase
    .from('historical_enrollment')
    .upsert(records, {
      onConflict: 'county_fips,crop_name,program_year',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }
}

async function uploadRecords(allRecords) {
  console.log(`\n🚀 Uploading ${allRecords.length} total records to Supabase...`);

  let uploaded = 0;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    await uploadBatch(batch);
    uploaded += batch.length;

    const pct = Math.round((uploaded / allRecords.length) * 100);
    process.stdout.write(`\r  📤 ${uploaded.toLocaleString()} / ${allRecords.length.toLocaleString()} (${pct}%)`);
  }

  console.log('\n  ✅ Upload complete!');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(' HarvestFile — Phase 7B: FSA Enrollment Ingestion');
  console.log('═══════════════════════════════════════════════════');

  // Verify all files exist
  const missingFiles = [];
  for (const year of YEARS) {
    const filePath = join(DATA_DIR, `enrollment-${year}.xlsx`);
    if (!existsSync(filePath)) {
      missingFiles.push(`enrollment-${year}.xlsx`);
    }
  }

  if (missingFiles.length > 0) {
    console.error(`\n❌ Missing files in ${DATA_DIR}:`);
    missingFiles.forEach(f => console.error(`   - ${f}`));
    process.exit(1);
  }

  console.log(`\n✅ Found all ${YEARS.length} enrollment files`);

  // Parse all files
  const allRecords = [];
  for (const year of YEARS) {
    const filePath = join(DATA_DIR, `enrollment-${year}.xlsx`);
    const records = parseEnrollmentFile(filePath, year);
    allRecords.push(...records);
  }

  console.log(`\n📊 Total: ${allRecords.length.toLocaleString()} records across ${YEARS.length} years`);

  // Upload
  await uploadRecords(allRecords);

  // Verify with a sample query
  console.log('\n🔍 Verification — Darke County, OH (39037):');
  const { data, error } = await supabase
    .from('historical_enrollment')
    .select('crop_name, program_year, arcco_pct, plc_pct, total_acres')
    .eq('county_fips', '39037')
    .eq('program_year', 2025)
    .order('total_acres', { ascending: false })
    .limit(5);

  if (error) {
    console.error(`  ❌ Verification query failed: ${error.message}`);
  } else {
    for (const row of data) {
      console.log(`  ${row.crop_name.padEnd(20)} ${row.arcco_pct}% ARC-CO | ${row.plc_pct}% PLC | ${Number(row.total_acres).toLocaleString()} acres`);
    }
  }

  // Count unique counties
  const { count } = await supabase
    .from('historical_enrollment')
    .select('county_fips', { count: 'exact', head: true });

  console.log(`\n🎯 Total records in database: ${count?.toLocaleString() || 'unknown'}`);

  // Count unique counties for latest year
  const { data: uniqueCounties } = await supabase
    .from('historical_enrollment')
    .select('county_fips')
    .eq('program_year', 2025);

  const uniqueFips = new Set(uniqueCounties?.map(r => r.county_fips) || []);
  console.log(`📍 Unique counties with 2025 data: ${uniqueFips.size.toLocaleString()}`);

  console.log('\n═══════════════════════════════════════════════════');
  console.log(' ✅ Phase 7B ingestion complete!');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
