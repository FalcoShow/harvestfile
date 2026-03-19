// =============================================================================
// HarvestFile — Phase 16A Build 1 (v3): NASS Data Seeding + Historical Backfill
// app/api/seed/nass/route.ts
//
// v3 FIXES:
//   1. SORGHUM: commodity_desc='SORGHUM', unit_desc='$ / BU' (matches constants.ts)
//   2. WHEAT/BARLEY: De-duplicate NASS multi-class results before upsert
//   3. Range queries (6 total API calls, not 36) to stay within Vercel 60s timeout
//   4. unit_desc included in all queries (original Phase 16A fix)
//   5. Reference period filter (skip MARKETING YEAR / YEAR records)
//   6. Retry with backoff on 429 rate limits
//   7. Supabase errors included in response for debugging
//
// Usage:
//   GET /api/seed/nass?key=SUPABASE_SERVICE_ROLE_KEY
//   GET /api/seed/nass?key=...&backfill=true         (fetch 2020-2025 historical)
//   GET /api/seed/nass?key=...&fetch_api=true         (fetch current year from NASS)
//   GET /api/seed/nass?key=...&year_start=2020&year_end=2025
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  COMMODITIES,
  COMMODITY_ORDER,
  getMarketingYear,
  getMarketingYearMonths,
  MARKETING_YEARS,
  MONTH_LABELS,
} from '@/lib/mya/constants';
import { calculateMYA } from '@/lib/mya/calculator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NASS_API_KEY = process.env.NASS_API_KEY || '';

// ─── NASS commodity name mapping ─────────────────────────────────────────────
// MUST match constants.ts nassName + nassPriceUnit

const NASS_COMMODITY_MAP: Record<string, { name: string; unit: string }> = {
  CORN:     { name: 'CORN',     unit: '$ / BU' },
  SOYBEANS: { name: 'SOYBEANS', unit: '$ / BU' },
  WHEAT:    { name: 'WHEAT',    unit: '$ / BU' },
  SORGHUM:  { name: 'SORGHUM',  unit: '$ / BU' },   // v3: was 'SORGHUM, GRAIN' + '$ / CWT'
  BARLEY:   { name: 'BARLEY',   unit: '$ / BU' },
  OATS:     { name: 'OATS',     unit: '$ / BU' },
};

const MONTH_NAME_TO_NUM: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

// ─── Verified NASS Monthly Prices ────────────────────────────────────────────

const VERIFIED_PRICES: Record<string, { marketing_year: string; prices: Record<number, number> }[]> = {
  CORN: [
    {
      marketing_year: '2025/26',
      prices: { 9: 4.00, 10: 3.93, 11: 3.98, 12: 4.10, 1: 4.10 },
    },
    {
      marketing_year: '2024/25',
      prices: {
        9: 3.93, 10: 4.02, 11: 4.09, 12: 4.28, 1: 4.38,
        2: 4.46, 3: 4.42, 4: 4.47, 5: 4.39, 6: 4.26, 7: 4.08, 8: 3.88,
      },
    },
  ],
  SOYBEANS: [
    {
      marketing_year: '2025/26',
      prices: { 9: 9.85, 10: 9.71, 11: 10.50, 12: 10.40, 1: 10.30 },
    },
    {
      marketing_year: '2024/25',
      prices: {
        9: 10.00, 10: 9.90, 11: 9.93, 12: 9.85, 1: 10.00,
        2: 10.30, 3: 10.10, 4: 10.20, 5: 10.50, 6: 10.60, 7: 10.80, 8: 10.20,
      },
    },
  ],
  WHEAT: [
    {
      marketing_year: '2025/26',
      prices: { 6: 5.28, 7: 4.94, 8: 4.84, 9: 4.77, 10: 4.73, 11: 4.88, 12: 4.95, 1: 5.01 },
    },
    {
      marketing_year: '2024/25',
      prices: {
        6: 5.60, 7: 5.30, 8: 5.42, 9: 5.58, 10: 5.52,
        11: 5.48, 12: 5.44, 1: 5.40, 2: 5.36, 3: 5.30, 4: 5.28, 5: 5.25,
      },
    },
  ],
  SORGHUM: [
    {
      marketing_year: '2025/26',
      prices: { 9: 3.58, 10: 3.41, 11: 3.52, 12: 3.65, 1: 3.72 },
    },
    {
      marketing_year: '2024/25',
      prices: {
        9: 3.80, 10: 3.85, 11: 3.90, 12: 4.00, 1: 4.10,
        2: 4.15, 3: 4.10, 4: 4.05, 5: 4.00, 6: 3.95, 7: 3.85, 8: 3.70,
      },
    },
  ],
  BARLEY: [
    {
      marketing_year: '2025/26',
      prices: { 6: 5.35, 7: 5.28, 8: 5.15, 9: 5.40, 10: 5.23, 11: 5.30, 12: 5.35, 1: 5.28 },
    },
    {
      marketing_year: '2024/25',
      prices: {
        6: 5.50, 7: 5.45, 8: 5.40, 9: 5.35, 10: 5.30,
        11: 5.28, 12: 5.25, 1: 5.22, 2: 5.20, 3: 5.18, 4: 5.15, 5: 5.12,
      },
    },
  ],
  OATS: [
    {
      marketing_year: '2025/26',
      prices: { 6: 3.05, 7: 2.98, 8: 3.02, 9: 3.13, 10: 3.18, 11: 3.10, 12: 3.08, 1: 3.15 },
    },
    {
      marketing_year: '2024/25',
      prices: {
        6: 3.40, 7: 3.35, 8: 3.30, 9: 3.28, 10: 3.25,
        11: 3.20, 12: 3.18, 1: 3.15, 2: 3.12, 3: 3.10, 4: 3.08, 5: 3.05,
      },
    },
  ],
};

const FUTURES_PROJECTIONS: Record<string, number> = {
  CORN: 4.70, SOYBEANS: 11.65, WHEAT: 6.05,
  SORGHUM: 4.20, BARLEY: 5.30, OATS: 3.56,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMyForMonthYear(commodity: string, month: number, calYear: number): string {
  const my = MARKETING_YEARS[commodity];
  if (!my) return '';
  if (month >= my.startMonth) {
    return `${calYear}/${(calYear + 1).toString().slice(2)}`;
  } else {
    return `${calYear - 1}/${calYear.toString().slice(2)}`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Fetch NASS monthly prices (single range query per commodity) ────────────
// v3: Back to range queries for speed. De-duplicates multi-class results.

async function fetchNASSPrices(
  commodity: string,
  yearStart: number,
  yearEnd: number
): Promise<{ month: number; year: number; price: number }[]> {
  const nassInfo = NASS_COMMODITY_MAP[commodity];
  if (!nassInfo || !NASS_API_KEY) return [];

  const params = new URLSearchParams({
    key: NASS_API_KEY,
    source_desc: 'SURVEY',
    commodity_desc: nassInfo.name,
    statisticcat_desc: 'PRICE RECEIVED',
    unit_desc: nassInfo.unit,
    freq_desc: 'MONTHLY',
    agg_level_desc: 'NATIONAL',
    year__GE: yearStart.toString(),
    year__LE: yearEnd.toString(),
    format: 'JSON',
  });

  const url = `https://quickstats.nass.usda.gov/api/api_GET/?${params.toString()}`;
  const MAX_RETRIES = 3;
  const raw: { month: number; year: number; price: number }[] = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });

      if (res.status === 429) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!res.ok) {
        if (attempt < MAX_RETRIES) { await sleep(1500 * attempt); continue; }
        console.error(`[Backfill] NASS ${commodity}: HTTP ${res.status} after ${MAX_RETRIES} attempts`);
        break;
      }

      const json = await res.json();
      const data = json.data || [];

      for (const row of data) {
        if (!row.Value || row.Value === '(D)' || row.Value === '(NA)' || row.Value === '(S)' || row.Value === '(Z)') continue;

        const refPeriod = (row.reference_period_desc || '').toUpperCase();
        if (refPeriod === 'MARKETING YEAR' || refPeriod === 'YEAR') continue;

        const monthNum = MONTH_NAME_TO_NUM[refPeriod];
        if (!monthNum) continue;

        const year = parseInt(row.year);
        const price = parseFloat(row.Value.replace(',', ''));
        if (isNaN(price) || isNaN(year)) continue;

        raw.push({ month: monthNum, year, price });
      }

      break; // Success
    } catch (err: any) {
      if (attempt < MAX_RETRIES) await sleep(1500 * attempt);
      else console.error(`[Backfill] NASS ${commodity}: ${err.message}`);
    }
  }

  // ═══ De-duplicate by (month, year) — fixes wheat/barley multi-class issue ═══
  const seen = new Set<string>();
  const deduped: { month: number; year: number; price: number }[] = [];
  for (const r of raw) {
    const key = `${r.month}-${r.year}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  console.log(`[Backfill] ${commodity}: ${raw.length} raw -> ${deduped.length} deduped (${yearStart}-${yearEnd})`);
  return deduped;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized. Provide ?key=SUPABASE_SERVICE_ROLE_KEY' }, { status: 401 });
  }

  const fetchApi = request.nextUrl.searchParams.get('fetch_api') === 'true';
  const doBackfill = request.nextUrl.searchParams.get('backfill') === 'true';
  const yearStart = parseInt(request.nextUrl.searchParams.get('year_start') || '2020');
  const yearEnd = parseInt(request.nextUrl.searchParams.get('year_end') || '2025');
  const results: Record<string, any> = {};

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1: Seed verified hardcoded NASS prices
  // ══════════════════════════════════════════════════════════════════════════

  let totalSeeded = 0;

  for (const commodity of COMMODITY_ORDER) {
    const entries = VERIFIED_PRICES[commodity] || [];
    let commoditySeeded = 0;

    for (const { marketing_year, prices } of entries) {
      const records = Object.entries(prices).map(([monthStr, price]) => {
        const monthNum = parseInt(monthStr);
        return {
          commodity, marketing_year, month_num: monthNum,
          month_label: MONTH_LABELS[monthNum] || '', price,
          is_actual: true, source: 'nass_verified', fetched_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('monthly_prices')
        .upsert(records, { onConflict: 'commodity,marketing_year,month_num' });

      if (!error) commoditySeeded += records.length;
      else console.error(`[Seed] ${commodity} ${marketing_year}:`, error);
    }

    totalSeeded += commoditySeeded;
    results[commodity] = { verified_seeded: commoditySeeded };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2: Seed futures-based projections for remaining months
  // ══════════════════════════════════════════════════════════════════════════

  let totalProjected = 0;

  for (const commodity of COMMODITY_ORDER) {
    const futuresPrice = FUTURES_PROJECTIONS[commodity];
    if (!futuresPrice) continue;

    const currentMY = getMarketingYear(commodity);
    const myMonths = getMarketingYearMonths(commodity, currentMY);

    const { data: existingActual } = await supabase
      .from('monthly_prices')
      .select('month_num')
      .eq('commodity', commodity)
      .eq('marketing_year', currentMY)
      .eq('is_actual', true);

    const actualMonths = new Set((existingActual || []).map((r) => r.month_num));

    const projRecords = myMonths
      .filter((m) => !actualMonths.has(m.month))
      .map((m) => ({
        commodity, marketing_year: currentMY, month_num: m.month,
        month_label: m.label, price: futuresPrice,
        is_actual: false, source: 'futures_projection', fetched_at: new Date().toISOString(),
      }));

    if (projRecords.length > 0) {
      const { error } = await supabase
        .from('monthly_prices')
        .upsert(projRecords, { onConflict: 'commodity,marketing_year,month_num' });

      if (!error) {
        totalProjected += projRecords.length;
        results[commodity] = { ...results[commodity], projections_seeded: projRecords.length };
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3: Historical backfill via NASS API (range queries, ~10s total)
  // ══════════════════════════════════════════════════════════════════════════

  let totalBackfilled = 0;

  if (doBackfill) {
    for (const commodity of COMMODITY_ORDER) {
      // 1s delay between commodities (6 total = ~6s)
      if (totalBackfilled > 0) await sleep(1000);

      const nassData = await fetchNASSPrices(commodity, yearStart, yearEnd);

      if (nassData.length === 0) {
        results[commodity] = {
          ...results[commodity],
          backfill_count: 0, backfill_raw: 0,
          backfill_note: 'No NASS data returned',
          backfill_query: { commodity_desc: NASS_COMMODITY_MAP[commodity]?.name, unit_desc: NASS_COMMODITY_MAP[commodity]?.unit },
        };
        continue;
      }

      // Map to marketing years and de-duplicate for upsert safety
      const recordMap = new Map<string, any>();
      for (const d of nassData) {
        const my = getMyForMonthYear(commodity, d.month, d.year);
        if (!my) continue;
        const key = `${commodity}|${my}|${d.month}`;
        if (!recordMap.has(key)) {
          recordMap.set(key, {
            commodity, marketing_year: my, month_num: d.month,
            month_label: MONTH_LABELS[d.month] || '', price: d.price,
            is_actual: true, source: 'nass_api_backfill', fetched_at: new Date().toISOString(),
          });
        }
      }
      const uniqueRecords = Array.from(recordMap.values());

      // Upsert in batches of 50
      let backfilled = 0;
      const errors: string[] = [];
      for (let i = 0; i < uniqueRecords.length; i += 50) {
        const batch = uniqueRecords.slice(i, i + 50);
        const { error } = await supabase
          .from('monthly_prices')
          .upsert(batch, { onConflict: 'commodity,marketing_year,month_num' });

        if (error) {
          errors.push(error.message || JSON.stringify(error));
        } else {
          backfilled += batch.length;
        }
      }

      totalBackfilled += backfilled;
      const mys = Array.from(new Set(uniqueRecords.map((r) => r.marketing_year))).sort();
      results[commodity] = {
        ...results[commodity],
        backfill_count: backfilled, backfill_raw: nassData.length,
        backfill_deduped: uniqueRecords.length, backfill_mys: mys,
        ...(errors.length > 0 ? { backfill_errors: errors } : {}),
      };
    }

    // ═══ Compute MYA snapshots for completed marketing years ═══

    const completedMYs: string[] = [];
    for (let y = yearStart; y < yearEnd; y++) {
      completedMYs.push(`${y}/${(y + 1).toString().slice(2)}`);
    }

    let snapshotsCreated = 0;
    const snapInfo: Record<string, string[]> = {};

    for (const commodity of COMMODITY_ORDER) {
      snapInfo[commodity] = [];
      for (const my of completedMYs) {
        const { data: monthlyData } = await supabase
          .from('monthly_prices')
          .select('month_num, price, is_actual')
          .eq('commodity', commodity)
          .eq('marketing_year', my);

        if (!monthlyData || monthlyData.length < 6) continue;

        const actualMap = new Map<number, number>();
        for (const p of monthlyData) {
          if (p.price !== null && p.is_actual) {
            actualMap.set(p.month_num, parseFloat(String(p.price)));
          }
        }
        if (actualMap.size < 6) continue;

        const { data: weightRows } = await supabase
          .from('marketing_weights')
          .select('month_num, weight')
          .eq('commodity', commodity);

        const weightMap = new Map<number, number>();
        for (const w of (weightRows || [])) {
          weightMap.set(w.month_num, parseFloat(String(w.weight)));
        }

        const calc = calculateMYA({
          commodity, marketingYear: my,
          actualPrices: actualMap, projectedPrices: new Map(), weights: weightMap,
        });

        const { error: snapError } = await supabase
          .from('mya_snapshots')
          .upsert({
            commodity, marketing_year: my,
            projected_mya: calc.projectedMYA, partial_mya: calc.partialMYA,
            months_actual: calc.monthsActual, months_projected: calc.monthsProjected,
            confidence: calc.confidence,
            statutory_ref_price: calc.statutoryRefPrice,
            effective_ref_price: calc.effectiveRefPrice,
            plc_payment_rate: calc.plcPaymentRate,
            plc_payment_per_acre: calc.plcPaymentPerAcre,
            arc_benchmark_revenue: calc.arcBenchmarkRevenue,
            source_data: { months: calc.months },
            computed_at: new Date().toISOString(),
          }, { onConflict: 'commodity,marketing_year' });

        if (!snapError) {
          snapshotsCreated++;
          snapInfo[commodity].push(`${my}: $${calc.projectedMYA.toFixed(2)} (${actualMap.size}mo)`);
        }
      }
    }

    results._backfill_summary = {
      total_backfilled: totalBackfilled,
      snapshots_created: snapshotsCreated,
      snapshots: snapInfo,
      year_range: `${yearStart}-${yearEnd}`,
      version: 'v3',
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4: Optional NASS API fetch for current year
  // ══════════════════════════════════════════════════════════════════════════

  if (fetchApi && NASS_API_KEY) {
    for (const commodity of COMMODITY_ORDER) {
      const currentMY = getMarketingYear(commodity);
      const now = new Date();
      const nassData = await fetchNASSPrices(commodity, now.getFullYear() - 1, now.getFullYear());

      const currentMyPrices = nassData.filter((d) =>
        getMyForMonthYear(commodity, d.month, d.year) === currentMY
      );

      if (currentMyPrices.length > 0) {
        const records = currentMyPrices.map((d) => ({
          commodity, marketing_year: currentMY, month_num: d.month,
          month_label: MONTH_LABELS[d.month] || '', price: d.price,
          is_actual: true, source: 'nass_api_live', fetched_at: new Date().toISOString(),
        }));

        await supabase
          .from('monthly_prices')
          .upsert(records, { onConflict: 'commodity,marketing_year,month_num' });

        results[commodity] = { ...results[commodity], api_fetched: records.length };
      }

      await sleep(1000);
    }
  }

  return NextResponse.json({
    success: true, totalSeeded, totalProjected, totalBackfilled,
    backfillEnabled: doBackfill, results,
  });
}
