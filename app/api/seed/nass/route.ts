// =============================================================================
// HarvestFile — Phase 14B: NASS Historical Data Seeding API
// app/api/seed/nass/route.ts
//
// One-time (or repeatable) endpoint to seed the monthly_prices table with:
//   1. Hardcoded verified NASS monthly prices from USDA Agricultural Prices
//   2. Live NASS Quick Stats API fetch for any missing data
//   3. Futures-based projections for remaining months
//
// Usage:
//   GET /api/seed/nass?key=YOUR_SUPABASE_SERVICE_ROLE_KEY
//   GET /api/seed/nass?key=...&fetch_api=true   (also hit NASS API)
//   GET /api/seed/nass?key=...&year_start=2020   (fetch historical)
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
} from '@/lib/mya/constants';
import { calculateMYA } from '@/lib/mya/calculator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NASS_API_KEY = process.env.NASS_API_KEY || '';

// ─── Verified NASS Monthly Prices (from USDA Agricultural Prices reports) ────
// Source: https://esmis.nal.usda.gov Agricultural Prices reports
// All prices in $/bushel (national average, "Price Received")
// Last verified: March 19, 2026 (data through January 2026)

const VERIFIED_PRICES: Record<string, { marketing_year: string; prices: Record<number, number> }[]> = {
  CORN: [
    {
      marketing_year: '2025/26',
      prices: {
        9: 4.00,   // Sep 2025
        10: 3.93,  // Oct 2025
        11: 3.98,  // Nov 2025
        12: 4.10,  // Dec 2025
        1: 4.10,   // Jan 2026
      },
    },
    {
      marketing_year: '2024/25',
      prices: {
        9: 3.93,   // Sep 2024
        10: 4.02,  // Oct 2024
        11: 4.09,  // Nov 2024
        12: 4.28,  // Dec 2024
        1: 4.38,   // Jan 2025
        2: 4.46,   // Feb 2025
        3: 4.42,   // Mar 2025
        4: 4.47,   // Apr 2025
        5: 4.39,   // May 2025
        6: 4.26,   // Jun 2025
        7: 4.08,   // Jul 2025
        8: 3.88,   // Aug 2025
      },
    },
  ],
  SOYBEANS: [
    {
      marketing_year: '2025/26',
      prices: {
        9: 9.85,   // Sep 2025
        10: 9.71,  // Oct 2025
        11: 10.50, // Nov 2025
        12: 10.40, // Dec 2025
        1: 10.30,  // Jan 2026
      },
    },
    {
      marketing_year: '2024/25',
      prices: {
        9: 10.00,  // Sep 2024
        10: 9.90,  // Oct 2024
        11: 9.93,  // Nov 2024
        12: 9.85,  // Dec 2024
        1: 10.00,  // Jan 2025
        2: 10.30,  // Feb 2025
        3: 10.10,  // Mar 2025
        4: 10.20,  // Apr 2025
        5: 10.50,  // May 2025
        6: 10.70,  // Jun 2025
        7: 10.40,  // Jul 2025
        8: 9.95,   // Aug 2025
      },
    },
  ],
  WHEAT: [
    {
      marketing_year: '2025/26',
      prices: {
        6: 5.28,   // Jun 2025
        7: 4.94,   // Jul 2025
        8: 4.84,   // Aug 2025
        9: 4.77,   // Sep 2025
        10: 4.73,  // Oct 2025
        11: 4.88,  // Nov 2025
        12: 4.95,  // Dec 2025
        1: 5.01,   // Jan 2026
      },
    },
    {
      marketing_year: '2024/25',
      prices: {
        6: 5.55,   // Jun 2024
        7: 5.35,   // Jul 2024
        8: 5.18,   // Aug 2024
        9: 5.33,   // Sep 2024
        10: 5.44,  // Oct 2024
        11: 5.33,  // Nov 2024
        12: 5.27,  // Dec 2024
        1: 5.28,   // Jan 2025
        2: 5.35,   // Feb 2025
        3: 5.42,   // Mar 2025
        4: 5.25,   // Apr 2025
        5: 5.18,   // May 2025
      },
    },
  ],
  SORGHUM: [
    {
      marketing_year: '2025/26',
      prices: {
        9: 3.58,   // Sep 2025
        10: 3.41,  // Oct 2025
        11: 3.52,  // Nov 2025
        12: 3.65,  // Dec 2025
        1: 3.72,   // Jan 2026
      },
    },
    {
      marketing_year: '2024/25',
      prices: {
        9: 3.70,   // Sep 2024
        10: 3.78,  // Oct 2024
        11: 3.85,  // Nov 2024
        12: 3.92,  // Dec 2024
        1: 4.02,   // Jan 2025
        2: 4.10,   // Feb 2025
        3: 4.05,   // Mar 2025
        4: 4.00,   // Apr 2025
        5: 3.95,   // May 2025
        6: 3.80,   // Jun 2025
        7: 3.65,   // Jul 2025
        8: 3.50,   // Aug 2025
      },
    },
  ],
  BARLEY: [
    {
      marketing_year: '2025/26',
      prices: {
        6: 5.35,   // Jun 2025
        7: 5.28,   // Jul 2025
        8: 5.15,   // Aug 2025
        9: 5.40,   // Sep 2025
        10: 5.23,  // Oct 2025
        11: 5.30,  // Nov 2025
        12: 5.35,  // Dec 2025
        1: 5.28,   // Jan 2026
      },
    },
  ],
  OATS: [
    {
      marketing_year: '2025/26',
      prices: {
        6: 3.05,   // Jun 2025
        7: 2.98,   // Jul 2025
        8: 3.02,   // Aug 2025
        9: 3.13,   // Sep 2025
        10: 3.18,  // Oct 2025
        11: 3.10,  // Nov 2025
        12: 3.08,  // Dec 2025
        1: 3.15,   // Jan 2026
      },
    },
  ],
};

// ─── Futures-based projections for remaining months ──────────────────────────
// Based on CME settlement prices as of March 18-19, 2026
// Used as proxy for months without NASS actual data yet

const FUTURES_PROJECTIONS: Record<string, number> = {
  CORN: 4.70,       // May 2026 corn ~$4.63-4.72
  SOYBEANS: 11.65,  // May 2026 soybeans ~$11.61-11.66
  WHEAT: 6.05,      // May 2026 SRW wheat ~$6.04
  SORGHUM: 4.20,    // Derived from corn + basis
  BARLEY: 5.30,     // WASDE season-avg projection
  OATS: 3.56,       // May 2026 oats ~$3.56
};

// ─── Month label lookup ──────────────────────────────────────────────────────

const MONTH_LABELS = [
  '', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const maxDuration = 120; // Allow up to 2 minutes for API calls

export async function GET(request: NextRequest) {
  try {
    // ── Auth check ──
    const key = request.nextUrl.searchParams.get('key');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!key || key !== serviceKey) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide ?key=SUPABASE_SERVICE_ROLE_KEY' },
        { status: 401 }
      );
    }

    const fetchApi = request.nextUrl.searchParams.get('fetch_api') === 'true';
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

        const { error, count } = await supabase
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
    // STEP 2: Seed futures-based projections for remaining months
    // ══════════════════════════════════════════════════════════════════════════

    let totalProjected = 0;

    for (const commodity of COMMODITY_ORDER) {
      const futuresPrice = FUTURES_PROJECTIONS[commodity];
      if (!futuresPrice) continue;

      const marketingYear = getMarketingYear(commodity);
      if (!marketingYear) continue;

      const myMonths = getMarketingYearMonths(commodity, marketingYear);

      // Get already-seeded actual months for this MY
      const { data: existingActual } = await supabase
        .from('monthly_prices')
        .select('month_num')
        .eq('commodity', commodity)
        .eq('marketing_year', marketingYear)
        .eq('is_actual', true);

      const actualMonths = new Set((existingActual || []).map(r => r.month_num));

      // Insert projections for months without actuals
      const projRecords = myMonths
        .filter(m => !actualMonths.has(m.month))
        .map(m => ({
          commodity,
          marketing_year: marketingYear,
          month_num: m.month,
          month_label: MONTH_LABELS[m.month] || '',
          price: futuresPrice,
          is_actual: false,
          source: 'futures_projection',
          fetched_at: new Date().toISOString(),
        }));

      if (projRecords.length > 0) {
        const { error } = await supabase
          .from('monthly_prices')
          .upsert(projRecords, { onConflict: 'commodity,marketing_year,month_num' });

        if (!error) {
          totalProjected += projRecords.length;
          results[commodity] = {
            ...results[commodity],
            projected_seeded: projRecords.length,
            projection_price: futuresPrice,
          };
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 3: (Optional) Fetch from NASS API for additional historical data
    // ══════════════════════════════════════════════════════════════════════════

    let nassApiResults: Record<string, number> = {};

    if (fetchApi && NASS_API_KEY) {
      for (const commodity of COMMODITY_ORDER) {
        const config = COMMODITIES[commodity];
        if (!config) continue;

        try {
          const url = new URL('https://quickstats.nass.usda.gov/api/api_GET/');
          url.searchParams.set('key', NASS_API_KEY);
          url.searchParams.set('format', 'JSON');
          url.searchParams.set('source_desc', 'SURVEY');
          url.searchParams.set('commodity_desc', config.nassName);
          url.searchParams.set('statisticcat_desc', 'PRICE RECEIVED');
          url.searchParams.set('unit_desc', config.nassPriceUnit);
          url.searchParams.set('freq_desc', 'MONTHLY');
          url.searchParams.set('agg_level_desc', 'NATIONAL');
          url.searchParams.set('year__GE', '2020');

          const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });

          if (!res.ok) {
            console.error(`[Seed] NASS API error for ${commodity}: ${res.status}`);
            continue;
          }

          const json = await res.json();
          const records = json?.data || [];
          let stored = 0;

          for (const rec of records) {
            const val = rec.Value?.replace(/,/g, '').trim();
            if (!val || ['(D)', '(Z)', '(NA)', '(S)', '(X)'].includes(val)) continue;

            const price = parseFloat(val);
            if (isNaN(price) || price <= 0) continue;

            const monthNum = parseInt(rec.begin_code);
            const year = parseInt(rec.year);
            if (!monthNum || !year || monthNum < 1 || monthNum > 12) continue;

            // Determine marketing year
            const dateForMY = new Date(year, monthNum - 1, 15);
            const my = getMarketingYear(commodity, dateForMY);
            if (!my) continue;

            const { error } = await supabase
              .from('monthly_prices')
              .upsert({
                commodity,
                marketing_year: my,
                month_num: monthNum,
                month_label: MONTH_LABELS[monthNum] || '',
                price,
                is_actual: true,
                source: 'nass_api',
                fetched_at: new Date().toISOString(),
              }, { onConflict: 'commodity,marketing_year,month_num' });

            if (!error) stored++;
          }

          nassApiResults[commodity] = stored;
        } catch (err: any) {
          console.error(`[Seed] NASS API fetch error for ${commodity}:`, err.message);
          nassApiResults[commodity] = -1;
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 4: Recompute MYA snapshots for current marketing year
    // ══════════════════════════════════════════════════════════════════════════

    const myaResults: Record<string, any> = {};

    for (const commodity of COMMODITY_ORDER) {
      try {
        const config = COMMODITIES[commodity];
        if (!config) continue;

        const marketingYear = getMarketingYear(commodity);
        if (!marketingYear) continue;

        // Fetch all monthly prices
        const { data: monthlyPrices } = await supabase
          .from('monthly_prices')
          .select('month_num, price, is_actual, source')
          .eq('commodity', commodity)
          .eq('marketing_year', marketingYear);

        // Fetch marketing weights
        const { data: weightRows } = await supabase
          .from('marketing_weights')
          .select('month_num, weight')
          .eq('commodity', commodity);

        // Build maps
        const actualMap = new Map<number, number>();
        const projMap = new Map<number, number>();

        (monthlyPrices || []).forEach((p) => {
          if (p.price !== null) {
            const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
            if (p.is_actual) {
              actualMap.set(p.month_num, price);
            } else if (!actualMap.has(p.month_num)) {
              projMap.set(p.month_num, price);
            }
          }
        });

        const weightMap = new Map<number, number>();
        (weightRows || []).forEach((w) => {
          const weight = typeof w.weight === 'string' ? parseFloat(w.weight) : w.weight;
          weightMap.set(w.month_num, weight);
        });

        // Calculate MYA
        const calc = calculateMYA({
          commodity,
          marketingYear,
          actualPrices: actualMap,
          projectedPrices: projMap,
          weights: weightMap,
        });

        // Store snapshot (insert new — MYA API reads latest by computed_at)
        const { error: snapError } = await supabase
          .from('mya_snapshots')
          .insert({
            commodity,
            marketing_year: marketingYear,
            months_actual: calc.monthsActual,
            months_projected: calc.monthsProjected,
            partial_mya: calc.partialMYA,
            projected_mya: calc.projectedMYA,
            confidence: calc.confidence,
            statutory_ref_price: calc.statutoryRefPrice,
            effective_ref_price: calc.effectiveRefPrice,
            plc_payment_rate: calc.plcPaymentRate,
            plc_payment_per_acre: calc.plcPaymentPerAcre,
            arc_benchmark_revenue: calc.arcBenchmarkRevenue,
            methodology: 'seed_verified',
            source_data: { months: calc.months },
          });

        myaResults[commodity] = {
          marketingYear,
          monthsActual: calc.monthsActual,
          monthsProjected: calc.monthsProjected,
          projectedMYA: calc.projectedMYA,
          effectiveRefPrice: calc.effectiveRefPrice,
          plcPaymentRate: calc.plcPaymentRate,
          plcPaymentPerAcre: calc.plcPaymentPerAcre,
          confidence: calc.confidence,
          paymentLikelihood: calc.paymentLikelihood,
          snapshotError: snapError?.message,
        };
      } catch (err: any) {
        myaResults[commodity] = { error: err.message };
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      summary: {
        verifiedPricesSeeded: totalSeeded,
        futuresProjectionsSeeded: totalProjected,
        nassApiFetched: fetchApi ? nassApiResults : 'skipped (add ?fetch_api=true)',
      },
      commodityDetails: results,
      myaSnapshots: myaResults,
      seededAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Seed] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
