#!/usr/bin/env node
// =============================================================================
// HarvestFile — Phase 5A-1: Finalize Data (run after Ctrl+C on main script)
// =============================================================================
//
// This runs ONLY the benchmark calculations and metadata updates
// on whatever data is already in the database. Quick — 5-10 minutes.
//
// HOW TO RUN:
//   cd C:\Users\Andrew\harvestfile
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"
//   node scripts/finalize-data.mjs
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fzduyjxjdcxbdwjlwrpu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function olympicAverage(values) {
  const valid = values.filter(v => v != null && !isNaN(v));
  if (valid.length < 3) {
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  }
  valid.sort((a, b) => a - b);
  const middle = valid.slice(1, -1);
  return middle.reduce((a, b) => a + b, 0) / middle.length;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  HarvestFile — Finalize County Data');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Quick stats on what we have
  console.log('📊 Current database stats...');

  const { count: countyCount } = await supabase
    .from('counties').select('*', { count: 'exact', head: true });
  console.log(`   Counties: ${countyCount}`);

  const { count: yieldCount } = await supabase
    .from('county_crop_data').select('*', { count: 'exact', head: true });
  console.log(`   Yield records: ${yieldCount}`);

  // Check if benchmarks already calculated
  const { data: sampleBench } = await supabase
    .from('county_crop_data')
    .select('benchmark_yield')
    .not('benchmark_yield', 'is', null)
    .limit(1);

  if (sampleBench && sampleBench.length > 0) {
    const { count: benchCount } = await supabase
      .from('county_crop_data')
      .select('*', { count: 'exact', head: true })
      .not('benchmark_yield', 'is', null);
    console.log(`   Benchmarks already calculated: ${benchCount}`);
    console.log('   Skipping benchmark calculation...\n');
  } else {
    // ── Calculate benchmarks ──────────────────────────────────────────────
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
        .is('benchmark_yield', null)
        .order('county_fips').order('commodity_code').order('crop_year')
        .range(offset, offset + pageSize - 1);

      if (!rows || rows.length === 0) { hasMore = false; break; }

      const grouped = {};
      for (const row of rows) {
        const key = `${row.county_fips}-${row.commodity_code}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }

      // We need ALL years for a county-commodity to calculate benchmarks properly
      // Fetch the full history for each group
      const updates = [];
      for (const [key, groupRows] of Object.entries(grouped)) {
        const [countyFips, commodityCode] = key.split('-');
        const ref = refLookup[commodityCode];
        if (!ref) continue;

        // Get ALL years for this county-commodity (not just this page)
        const { data: allYears } = await supabase
          .from('county_crop_data')
          .select('id, crop_year, county_yield')
          .eq('county_fips', countyFips)
          .eq('commodity_code', commodityCode)
          .order('crop_year');

        if (!allYears) continue;

        for (const row of allYears) {
          if (!row.county_yield) continue;
          const year = row.crop_year;

          const prevYields = allYears
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

      // Write updates
      for (const upd of updates) {
        const { id, ...data } = upd;
        await supabase.from('county_crop_data').update(data).eq('id', id);
      }

      totalUpdated += updates.length;
      process.stdout.write(`   📊 Benchmarks: ${totalUpdated.toLocaleString()}\r`);

      offset += pageSize;
      if (rows.length < pageSize) hasMore = false;
    }

    console.log(`\n   ✅ ${totalUpdated.toLocaleString()} benchmarks calculated`);
  }

  // ── Update county metadata ────────────────────────────────────────────
  console.log('\n📋 Updating county metadata...');

  const { data: dataCounties } = await supabase
    .from('county_crop_data')
    .select('county_fips')
    .not('county_yield', 'is', null);

  if (dataCounties) {
    const uniqueFips = [...new Set(dataCounties.map(r => r.county_fips))];
    console.log(`   Marking ${uniqueFips.length} counties as having data...`);

    for (let i = 0; i < uniqueFips.length; i += 500) {
      await supabase
        .from('counties')
        .update({ has_arc_plc_data: true, updated_at: new Date().toISOString() })
        .in('county_fips', uniqueFips.slice(i, i + 500));
    }
  }

  // State county counts
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

  // ── Final verification ─────────────────────────────────────────────────
  console.log('\n📋 Final verification...');

  const { count: finalCounties } = await supabase
    .from('counties').select('*', { count: 'exact', head: true }).eq('has_arc_plc_data', true);

  const { count: finalYields } = await supabase
    .from('county_crop_data').select('*', { count: 'exact', head: true });

  const { count: finalBenchmarks } = await supabase
    .from('county_crop_data').select('*', { count: 'exact', head: true }).not('benchmark_yield', 'is', null);

  // Top states
  const { data: topStates } = await supabase
    .from('states')
    .select('name, abbreviation, county_count')
    .gt('county_count', 0)
    .order('county_count', { ascending: false })
    .limit(10);

  // Sample: Darke County Ohio
  const { data: darke } = await supabase
    .from('county_crop_data')
    .select('commodity_code, crop_year, county_yield, benchmark_yield, arc_payment_rate')
    .eq('county_fips', '39037')
    .eq('commodity_code', 'CORN')
    .order('crop_year', { ascending: false })
    .limit(5);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ PHASE 5A-1 DATA FOUNDATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Counties with data: ${finalCounties}`);
  console.log(`  Total yield records: ${finalYields}`);
  console.log(`  Benchmarks calculated: ${finalBenchmarks}`);
  console.log('');
  console.log('  Top 10 states:');
  for (const s of topStates || []) {
    console.log(`    ${s.abbreviation} ${s.name}: ${s.county_count} counties`);
  }
  console.log('');
  if (darke && darke.length > 0) {
    console.log('  Sample — Darke County, OH (Corn):');
    for (const d of darke) {
      console.log(`    ${d.crop_year}: yield=${d.county_yield}, bench=${d.benchmark_yield}, arc_pmt=${d.arc_payment_rate || 'N/A'}`);
    }
  }
  console.log('');
  console.log('  Next: Return to Claude for Build 5A-2 (State Hub Pages)');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
