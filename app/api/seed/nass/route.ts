// =============================================================================
// HarvestFile — Phase 16A Build 1: NASS Data Seeding + Historical Backfill
// app/api/seed/nass/route.ts
//
// One-time (or repeatable) endpoint to seed the monthly_prices table with:
//   1. Hardcoded verified NASS monthly prices from USDA Agricultural Prices
//   2. Live NASS Quick Stats API fetch for any missing data
//   3. Futures-based projections for remaining months
//   4. Historical backfill for 2020–2025 marketing years
//
// Phase 16A FIX: Added missing unit_desc parameter to fetchNASSPrices that
// caused backfill to return only 4 records instead of 300+. Added retry
// logic with exponential backoff, per-commodity logging, and filter for
// MARKETING YEAR reference periods that were contaminating monthly results.
//
// Usage:
//   GET /api/seed/nass?key=YOUR_SUPABASE_SERVICE_ROLE_KEY
//   GET /api/seed/nass?key=...&fetch_api=true       (also hit NASS API)
//   GET /api/seed/nass?key=...&backfill=true         (fetch 2020-2025 historical)
//   GET /api/seed/nass?key=...&year_start=2020       (custom start year)
//
// Protected by service role key comparison.
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
// CRITICAL: unit values must EXACTLY match NASS Quick Stats (spacing matters)

const NASS_COMMODITY_MAP: Record<string, { name: string; unit: string }> = {
  CORN:     { name: 'CORN',           unit: '$ / BU' },
  SOYBEANS: { name: 'SOYBEANS',       unit: '$ / BU' },
  WHEAT:    { name: 'WHEAT',          unit: '$ / BU' },
  SORGHUM:  { name: 'SORGHUM, GRAIN', unit: '$ / CWT' },
  BARLEY:   { name: 'BARLEY',         unit: '$ / BU' },
  OATS:     { name: 'OATS',           unit: '$ / BU' },
};

// Month name → number mapping
const MONTH_NAME_TO_NUM: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

// ─── Verified NASS Monthly Prices (from USDA Agricultural Prices reports) ────
// Source: https://esmis.nal.usda.gov Agricultural Prices reports
// All prices in $/bushel except sorghum ($/cwt)
// Last verified: March 19, 2026 (data through January 2026)

const VERIFIED_PRICES: Record<string, { marketing_year: string; prices: Record<number, number> }[]> = {
  CORN: [
    {
      marketing_year: '2025/26',
      prices: {
        9: 4.00, 10: 3.93, 11: 3.98, 12: 4.10, 1: 4.10,
      },
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
      prices: {
        9: 9.85, 10: 9.71, 11: 10.50, 12: 10.40, 1: 10.30,
      },
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
      prices: {
        6: 5.28, 7: 4.94, 8: 4.84, 9: 4.77, 10: 4.73,
        11: 4.88, 12: 4.95, 1: 5.01,
      },
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
      prices: {
        9: 3.58, 10: 3.41, 11: 3.52, 12: 3.65, 1: 3.72,
      },
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
      prices: {
        6: 5.35, 7: 5.28, 8: 5.15, 9: 5.40, 10: 5.23,
        11: 5.30, 12: 5.35, 1: 5.28,
      },
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
      prices: {
        6: 3.05, 7: 2.98, 8: 3.02, 9: 3.13, 10: 3.18,
        11: 3.10, 12: 3.08, 1: 3.15,
      },
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

// ─── Futures-based projection prices ─────────────────────────────────────────
// Used for months not yet reported by NASS (current marketing year only)

const FUTURES_PROJECTIONS: Record<string, number> = {
  CORN: 4.70,
  SOYBEANS: 11.65,
  WHEAT: 6.05,
  SORGHUM: 4.20,
  BARLEY: 5.30,
  OATS: 3.56,
};

// ─── Helper: determine marketing year for a commodity given month + calendar year ─

function getMyForMonthYear(commodity: string, month: number, calYear: number): string {
  const my = MARKETING_YEARS[commodity];
  if (!my) return '';
  // If month >= start month, it's calYear/(calYear+1)
  // If month < start month, it's (calYear-1)/calYear
  if (month >= my.startMonth) {
    return `${calYear}/${(calYear + 1).toString().slice(2)}`;
  } else {
    return `${calYear - 1}/${calYear.toString().slice(2)}`;
  }
}

// ─── Helper: sleep for a given number of milliseconds ────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Helper: fetch NASS monthly prices with retry + exponential backoff ──────
// Phase 16A FIX: Added unit_desc parameter (was missing, causing empty results)
// Phase 16A NEW: Retry logic, exponential backoff, better filtering

async function fetchNASSPrices(
  commodity: string,
  yearStart: number,
  yearEnd: number
): Promise<{ month: number; year: number; price: number }[]> {
  const nassInfo = NASS_COMMODITY_MAP[commodity];
  if (!nassInfo || !NASS_API_KEY) {
    console.log(`[Backfill] Skipping ${commodity}: ${!nassInfo ? 'no NASS mapping' : 'no API key'}`);
    return [];
  }

  const results: { month: number; year: number; price: number }[] = [];

  // ═══ Phase 16A FIX: Added unit_desc — this was the bug ═══
  // Without unit_desc, NASS returns mixed-unit results or nothing for
  // commodities like sorghum that have nonstandard units ($/CWT vs $/BU).
  const params = new URLSearchParams({
    key: NASS_API_KEY,
    source_desc: 'SURVEY',
    commodity_desc: nassInfo.name,
    statisticcat_desc: 'PRICE RECEIVED',
    unit_desc: nassInfo.unit,            // ← THE FIX: was missing entirely
    freq_desc: 'MONTHLY',
    agg_level_desc: 'NATIONAL',
    year__GE: yearStart.toString(),
    year__LE: yearEnd.toString(),
    format: 'JSON',
  });

  const url = `https://quickstats.nass.usda.gov/api/api_GET/?${params.toString()}`;

  // Retry up to 3 times with exponential backoff
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Backfill] Fetching ${commodity} ${yearStart}-${yearEnd} (attempt ${attempt}/${MAX_RETRIES})...`);
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

      // Handle rate limiting with backoff
      if (res.status === 429) {
        const backoffMs = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        console.warn(`[Backfill] Rate limited on ${commodity}, waiting ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        console.error(`[Backfill] NASS API error for ${commodity}: ${res.status} (attempt ${attempt})`);
        if (attempt < MAX_RETRIES) {
          await sleep(2000 * attempt);
          continue;
        }
        break;
      }

      const json = await res.json();
      const data = json.data || [];

      console.log(`[Backfill] Raw NASS response for ${commodity}: ${data.length} records`);

      for (const row of data) {
        // Filter out suppressed/unavailable values
        if (!row.Value || row.Value === '(D)' || row.Value === '(NA)' || row.Value === '(S)' || row.Value === '(Z)') continue;

        // Filter to MONTHLY data only — NASS sometimes returns MARKETING YEAR
        // and ANNUAL records even when freq_desc=MONTHLY is specified
        const refPeriod = (row.reference_period_desc || '').toUpperCase();
        if (refPeriod === 'MARKETING YEAR' || refPeriod === 'YEAR') continue;

        const monthName = refPeriod;
        const monthNum = MONTH_NAME_TO_NUM[monthName];
        if (!monthNum) continue;

        const year = parseInt(row.year);
        const price = parseFloat(row.Value.replace(',', ''));
        if (isNaN(price) || isNaN(year)) continue;

        results.push({ month: monthNum, year, price });
      }

      console.log(`[Backfill] Parsed ${results.length} valid monthly prices for ${commodity}`);
      break; // Success — exit retry loop

    } catch (err: any) {
      lastError = err.message;
      console.error(`[Backfill] Fetch error for ${commodity} (attempt ${attempt}):`, err.message);
      if (attempt < MAX_RETRIES) {
        await sleep(2000 * attempt);
      }
    }
  }

  if (results.length === 0 && lastError) {
    console.error(`[Backfill] All attempts failed for ${commodity}: ${lastError}`);
  }

  return results;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide ?key=SUPABASE_SERVICE_ROLE_KEY' },
      { status: 401 }
    );
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
          commodity,
          marketing_year,
          month_num: monthNum,
          month_label: MONTH_LABELS[monthNum] || '',
          price,
          is_actual: true,
          source: 'nass_verified',
          fetched_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('monthly_prices')
        .upsert(records, { onConflict: 'commodity,marketing_year,month_num' });

      if (error) {
        console.error(`[Seed] Error seeding ${commodity} ${marketing_year}:`, error);
      } else {
        commoditySeeded += records.length;
      }
    }

    totalSeeded += commoditySeeded;
    results[commodity] = { verified_seeded: commoditySeeded };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2: Seed futures-based projections for remaining months (current MY)
  // ══════════════════════════════════════════════════════════════════════════

  let totalProjected = 0;

  for (const commodity of COMMODITY_ORDER) {
    const futuresPrice = FUTURES_PROJECTIONS[commodity];
    if (!futuresPrice) continue;

    const currentMY = getMarketingYear(commodity);
    const myMonths = getMarketingYearMonths(commodity, currentMY);

    // Get existing actual prices for this MY
    const { data: existingActual } = await supabase
      .from('monthly_prices')
      .select('month_num')
      .eq('commodity', commodity)
      .eq('marketing_year', currentMY)
      .eq('is_actual', true);

    const actualMonths = new Set((existingActual || []).map((r) => r.month_num));

    // Create projection records for months without actual data
    const projRecords = myMonths
      .filter((m) => !actualMonths.has(m.month))
      .map((m) => ({
        commodity,
        marketing_year: currentMY,
        month_num: m.month,
        month_label: m.label,
        price: futuresPrice,
        is_actual: false,
        source: 'futures_projection',
        fetched_at: new Date().toISOString(),
      }));

    if (projRecords.length > 0) {
      const { error } = await supabase
        .from('monthly_prices')
        .upsert(projRecords, { onConflict: 'commodity,marketing_year,month_num' });

      if (error) {
        console.error(`[Seed] Error seeding projections for ${commodity}:`, error);
      } else {
        totalProjected += projRecords.length;
        results[commodity] = {
          ...results[commodity],
          projections_seeded: projRecords.length,
        };
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3: Historical backfill via NASS API (2020–2025)
  // Phase 16A: Fixed unit_desc bug, added retry logic, better logging
  // ══════════════════════════════════════════════════════════════════════════

  let totalBackfilled = 0;

  if (doBackfill) {
    for (const commodity of COMMODITY_ORDER) {
      // 2s delay between commodities to avoid NASS throttling
      if (totalBackfilled > 0) {
        await sleep(2000);
      }

      const nassData = await fetchNASSPrices(commodity, yearStart, yearEnd);
      if (nassData.length === 0) {
        results[commodity] = {
          ...results[commodity],
          backfill_count: 0,
          backfill_note: 'No NASS API data returned (check unit_desc match)',
          backfill_query: {
            commodity_desc: NASS_COMMODITY_MAP[commodity]?.name,
            unit_desc: NASS_COMMODITY_MAP[commodity]?.unit,
            years: `${yearStart}-${yearEnd}`,
          },
        };
        continue;
      }

      // Map each price to its marketing year
      const records = nassData.map((d) => {
        const my = getMyForMonthYear(commodity, d.month, d.year);
        return {
          commodity,
          marketing_year: my,
          month_num: d.month,
          month_label: MONTH_LABELS[d.month] || '',
          price: d.price,
          is_actual: true,
          source: 'nass_api_backfill',
          fetched_at: new Date().toISOString(),
        };
      }).filter((r) => r.marketing_year !== '');

      // Upsert in batches of 50 to avoid hitting Supabase limits
      let backfilled = 0;
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase
          .from('monthly_prices')
          .upsert(batch, { onConflict: 'commodity,marketing_year,month_num' });

        if (error) {
          console.error(`[Backfill] Error upserting ${commodity} batch:`, error);
        } else {
          backfilled += batch.length;
        }
      }

      totalBackfilled += backfilled;

      // Per-commodity detail in response
      const marketingYears = Array.from(new Set(records.map((r) => r.marketing_year))).sort();
      results[commodity] = {
        ...results[commodity],
        backfill_count: backfilled,
        backfill_raw_from_nass: nassData.length,
        backfill_marketing_years: marketingYears,
        backfill_year_range: `${yearStart}-${yearEnd}`,
      };
    }

    // ═══ Compute MYA snapshots for completed marketing years ═══

    const completedMYs: string[] = [];
    for (let y = yearStart; y < yearEnd; y++) {
      completedMYs.push(`${y}/${(y + 1).toString().slice(2)}`);
    }

    let snapshotsCreated = 0;

    for (const commodity of COMMODITY_ORDER) {
      for (const my of completedMYs) {
        // Fetch all monthly prices for this commodity + MY
        const { data: monthlyData } = await supabase
          .from('monthly_prices')
          .select('month_num, price, is_actual')
          .eq('commodity', commodity)
          .eq('marketing_year', my);

        if (!monthlyData || monthlyData.length < 6) continue;

        const actualMap = new Map<number, number>();
        (monthlyData || []).forEach((p) => {
          if (p.price !== null && p.is_actual) {
            actualMap.set(p.month_num, parseFloat(String(p.price)));
          }
        });

        if (actualMap.size < 6) continue;

        // Fetch marketing weights
        const { data: weightRows } = await supabase
          .from('marketing_weights')
          .select('month_num, weight')
          .eq('commodity', commodity);

        const weightMap = new Map<number, number>();
        (weightRows || []).forEach((w) => {
          weightMap.set(w.month_num, parseFloat(String(w.weight)));
        });

        // Calculate MYA
        const calc = calculateMYA({
          commodity,
          marketingYear: my,
          actualPrices: actualMap,
          projectedPrices: new Map(),
          weights: weightMap,
        });

        // Upsert snapshot
        const { error: snapError } = await supabase
          .from('mya_snapshots')
          .upsert({
            commodity,
            marketing_year: my,
            projected_mya: calc.projectedMYA,
            partial_mya: calc.partialMYA,
            months_actual: calc.monthsActual,
            months_projected: calc.monthsProjected,
            confidence: calc.confidence,
            statutory_ref_price: calc.statutoryRefPrice,
            effective_ref_price: calc.effectiveRefPrice,
            plc_payment_rate: calc.plcPaymentRate,
            plc_payment_per_acre: calc.plcPaymentPerAcre,
            arc_benchmark_revenue: calc.arcBenchmarkRevenue,
            source_data: { months: calc.months },
            computed_at: new Date().toISOString(),
          }, {
            onConflict: 'commodity,marketing_year',
          });

        if (!snapError) snapshotsCreated++;
      }
    }

    results._backfill_summary = {
      total_backfilled: totalBackfilled,
      snapshots_created: snapshotsCreated,
      year_range: `${yearStart}-${yearEnd}`,
      fix_applied: 'Phase 16A — added unit_desc to NASS query, retry logic, ref_period filter',
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4: Optional NASS API fetch for current year missing months
  // ══════════════════════════════════════════════════════════════════════════

  if (fetchApi && NASS_API_KEY) {
    for (const commodity of COMMODITY_ORDER) {
      const currentMY = getMarketingYear(commodity);
      const now = new Date();
      const nassData = await fetchNASSPrices(commodity, now.getFullYear() - 1, now.getFullYear());

      // Only seed prices that map to the current marketing year
      const currentMyPrices = nassData.filter((d) => {
        return getMyForMonthYear(commodity, d.month, d.year) === currentMY;
      });

      if (currentMyPrices.length > 0) {
        const records = currentMyPrices.map((d) => ({
          commodity,
          marketing_year: currentMY,
          month_num: d.month,
          month_label: MONTH_LABELS[d.month] || '',
          price: d.price,
          is_actual: true,
          source: 'nass_api_live',
          fetched_at: new Date().toISOString(),
        }));

        await supabase
          .from('monthly_prices')
          .upsert(records, { onConflict: 'commodity,marketing_year,month_num' });

        results[commodity] = {
          ...results[commodity],
          api_fetched: records.length,
        };
      }

      // Delay between API calls
      await sleep(2000);
    }
  }

  return NextResponse.json({
    success: true,
    totalSeeded,
    totalProjected,
    totalBackfilled,
    backfillEnabled: doBackfill,
    results,
  });
}
