// =============================================================================
// HarvestFile — Phase 15 Build 1: MYA Price Data API
// app/api/prices/mya/route.ts
//
// GET /api/prices/mya?commodity=CORN&marketing_year=2025/26
// GET /api/prices/mya?commodities=CORN,SOYBEANS,WHEAT  (multiple)
// GET /api/prices/mya?commodities=CORN,SOYBEANS&include_history=true  (+ prior year)
//
// Returns the latest MYA snapshot with monthly breakdown, reference price
// comparison, and PLC payment projection. This is the primary endpoint
// consumed by the Markets dashboard.
//
// Phase 15 addition: include_history=true returns prior year's final MYA
// for year-over-year comparison on the Markets dashboard.
//
// Falls back to real-time calculation if no snapshot exists.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  COMMODITIES,
  COMMODITY_ORDER,
  getMarketingYear,
  getMarketingYearMonths,
} from '@/lib/mya/constants';
import { calculateMYA, type MYACalculation } from '@/lib/mya/calculator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helper: get the prior marketing year string ─────────────────────────────

function getPriorMarketingYear(currentMY: string): string {
  // e.g., '2025/26' → '2024/25'
  const parts = currentMY.split('/');
  if (parts.length !== 2) return '';
  const startYear = parseInt(parts[0]);
  if (isNaN(startYear)) return '';
  return `${startYear - 1}/${parts[0].slice(2)}`;
}

// ─── Helper: reconstruct MYACalculation from snapshot ────────────────────────

function snapshotToCalc(
  snapshot: any,
  commodity: string,
  marketingYear: string
): MYACalculation {
  const config = COMMODITIES[commodity];
  const projectedMYA = parseFloat(snapshot.projected_mya) || 0;
  const effectiveRefPrice = parseFloat(snapshot.effective_ref_price) || 0;
  const plcPaymentRate = parseFloat(snapshot.plc_payment_rate) || 0;

  return {
    commodity,
    marketingYear,
    computedAt: snapshot.computed_at,
    months: (snapshot.source_data as any)?.months || [],
    monthsActual: snapshot.months_actual,
    monthsProjected: snapshot.months_projected,
    monthsRemaining: 12 - snapshot.months_actual - snapshot.months_projected,
    partialMYA: snapshot.partial_mya ? parseFloat(snapshot.partial_mya) : null,
    projectedMYA,
    confidence: (snapshot.confidence as any) || 'low',
    config,
    statutoryRefPrice: parseFloat(snapshot.statutory_ref_price),
    effectiveRefPrice,
    plcPaymentRate,
    plcPaymentPerAcre: parseFloat(snapshot.plc_payment_per_acre) || 0,
    arcBenchmarkRevenue: snapshot.arc_benchmark_revenue
      ? parseFloat(snapshot.arc_benchmark_revenue)
      : null,
    myaVsRefPrice: projectedMYA - effectiveRefPrice,
    myaVsRefPricePct: effectiveRefPrice > 0
      ? (projectedMYA / effectiveRefPrice * 100 - 100)
      : 0,
    paymentLikelihood: plcPaymentRate > 0
      ? (snapshot.months_actual >= 10 ? 'certain' : snapshot.months_actual >= 6 ? 'likely' : 'possible')
      : 'none',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const singleCommodity = searchParams.get('commodity')?.toUpperCase();
  const multipleCommodities = searchParams.get('commodities');
  const myParam = searchParams.get('marketing_year');
  const includeHistory = searchParams.get('include_history') === 'true';

  // Determine which commodities to fetch
  let commodities: string[];
  if (singleCommodity) {
    commodities = [singleCommodity];
  } else if (multipleCommodities) {
    commodities = multipleCommodities.split(',').map((c) => c.trim().toUpperCase());
  } else {
    // Default: top 3
    commodities = ['CORN', 'SOYBEANS', 'WHEAT'];
  }

  // Validate
  commodities = commodities.filter((c) => COMMODITIES[c]);
  if (commodities.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid commodities specified' },
      { status: 400 }
    );
  }

  try {
    const results: Record<string, MYACalculation> = {};
    const priorYearMYA: Record<string, { mya: number; marketingYear: string } | null> = {};

    await Promise.all(
      commodities.map(async (commodity) => {
        const marketingYear = myParam || getMarketingYear(commodity);

        // ─── Fetch current year snapshot ───
        const { data: snapshot } = await supabase
          .from('mya_snapshots')
          .select('*')
          .eq('commodity', commodity)
          .eq('marketing_year', marketingYear)
          .order('computed_at', { ascending: false })
          .limit(1)
          .single();

        if (snapshot?.source_data) {
          results[commodity] = snapshotToCalc(snapshot, commodity, marketingYear);
        } else {
          // No snapshot — calculate from raw monthly_prices data
          const myMonths = getMarketingYearMonths(commodity, marketingYear);

          // Fetch actual NASS monthly prices
          const { data: monthlyPrices } = await supabase
            .from('monthly_prices')
            .select('month_num, price, is_actual, source')
            .eq('commodity', commodity)
            .eq('marketing_year', marketingYear)
            .eq('is_actual', true);

          // Fetch projected prices (futures-based)
          const { data: projectedPrices } = await supabase
            .from('monthly_prices')
            .select('month_num, price, source')
            .eq('commodity', commodity)
            .eq('marketing_year', marketingYear)
            .eq('is_actual', false);

          // Fetch marketing weights
          const { data: weightRows } = await supabase
            .from('marketing_weights')
            .select('month_num, weight')
            .eq('commodity', commodity);

          // Build maps
          const actualMap = new Map<number, number>();
          (monthlyPrices || []).forEach((p) => {
            if (p.price !== null) actualMap.set(p.month_num, parseFloat(p.price));
          });

          const projMap = new Map<number, number>();
          (projectedPrices || []).forEach((p) => {
            if (p.price !== null && !actualMap.has(p.month_num)) {
              projMap.set(p.month_num, parseFloat(p.price));
            }
          });

          const weightMap = new Map<number, number>();
          (weightRows || []).forEach((w) => {
            weightMap.set(w.month_num, parseFloat(w.weight));
          });

          // Calculate MYA
          const calc = calculateMYA({
            commodity,
            marketingYear,
            actualPrices: actualMap,
            projectedPrices: projMap,
            weights: weightMap,
          });

          results[commodity] = calc;
        }

        // ─── Fetch prior year's final MYA (if requested) ───
        if (includeHistory) {
          const priorMY = getPriorMarketingYear(marketingYear);
          if (priorMY) {
            const { data: priorSnapshot } = await supabase
              .from('mya_snapshots')
              .select('projected_mya, marketing_year')
              .eq('commodity', commodity)
              .eq('marketing_year', priorMY)
              .order('computed_at', { ascending: false })
              .limit(1)
              .single();

            if (priorSnapshot?.projected_mya) {
              priorYearMYA[commodity] = {
                mya: parseFloat(priorSnapshot.projected_mya),
                marketingYear: priorSnapshot.marketing_year,
              };
            } else {
              priorYearMYA[commodity] = null;
            }
          }
        }
      })
    );

    // Sort results by COMMODITY_ORDER
    const ordered: Record<string, MYACalculation> = {};
    for (const code of COMMODITY_ORDER) {
      if (results[code]) ordered[code] = results[code];
    }
    // Add any remaining
    for (const code of Object.keys(results)) {
      if (!ordered[code]) ordered[code] = results[code];
    }

    // Build response
    const response: any = {
      success: true,
      data: ordered,
      timestamp: new Date().toISOString(),
      commodityCount: Object.keys(ordered).length,
    };

    if (includeHistory) {
      response.priorYear = priorYearMYA;
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err: any) {
    console.error('[MYA API] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
