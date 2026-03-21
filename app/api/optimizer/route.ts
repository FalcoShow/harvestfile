// =============================================================================
// HarvestFile — Phase 22: OBBBA Election Optimizer API
// app/api/optimizer/route.ts
//
// GET /api/optimizer?county_fips=39037&crop=CORN&acres=500
//
// Runs 1,000 Monte Carlo iterations against historical county data and returns
// probabilistic ARC-CO vs PLC recommendations. This is the #1 differentiating
// feature — no competitor offers probabilistic farm program optimization.
//
// Response includes per-year probabilities, expected payments, percentile
// distributions, and a confidence-rated recommendation.
//
// ~100-200ms compute time. Cached for 5 minutes (prices don't change intraday).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  runMonteCarloOptimizer,
  type MonteCarloInput,
} from '@/lib/optimizer/monte-carlo';
import type { HistoricalYear } from '@/lib/arc-plc-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  const countyFips = request.nextUrl.searchParams.get('county_fips');
  const cropCode = request.nextUrl.searchParams.get('crop');
  const acresParam = request.nextUrl.searchParams.get('acres');
  const plcYieldParam = request.nextUrl.searchParams.get('plc_yield');
  const iterationsParam = request.nextUrl.searchParams.get('iterations');

  // ── Validate inputs ─────────────────────────────────────────────────────

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: 'Valid 5-digit county_fips is required' },
      { status: 400 },
    );
  }

  if (!cropCode) {
    return NextResponse.json(
      { error: 'crop parameter is required (e.g., CORN, SOYBEANS, WHEAT)' },
      { status: 400 },
    );
  }

  const baseAcres = acresParam ? parseInt(acresParam) : undefined;
  const plcPaymentYield = plcYieldParam ? parseFloat(plcYieldParam) : undefined;
  const iterations = iterationsParam
    ? Math.min(5000, Math.max(100, parseInt(iterationsParam)))
    : 1000;

  try {
    // ── Fetch historical data from county_crop_data ──────────────────────

    const { data: cropData, error: cropError } = await supabase
      .from('county_crop_data')
      .select(
        'crop_year, county_yield, benchmark_yield, benchmark_revenue, arc_guarantee, arc_actual_revenue, arc_payment_rate, mya_price, plc_payment_rate',
      )
      .eq('county_fips', countyFips)
      .eq('commodity_code', cropCode.toUpperCase())
      .order('crop_year', { ascending: true });

    if (cropError) {
      console.error('[Optimizer] DB error:', cropError);
      return NextResponse.json(
        { error: 'Database error fetching county data' },
        { status: 500 },
      );
    }

    if (!cropData || cropData.length < 3) {
      return NextResponse.json(
        {
          error: 'Insufficient historical data',
          message: `Need at least 3 years of data for ${cropCode} in county ${countyFips}. Found ${cropData?.length || 0} years.`,
        },
        { status: 422 },
      );
    }

    // ── Fetch county name for display ─────────────────────────────────────

    const { data: countyInfo } = await supabase
      .from('counties')
      .select('display_name, state_fips')
      .eq('county_fips', countyFips)
      .single();

    let countyName: string | undefined;
    if (countyInfo) {
      const { data: stateInfo } = await supabase
        .from('states')
        .select('abbreviation')
        .eq('state_fips', countyInfo.state_fips)
        .single();
      countyName = stateInfo
        ? `${countyInfo.display_name}, ${stateInfo.abbreviation}`
        : countyInfo.display_name;
    }

    // ── Convert to HistoricalYear format ──────────────────────────────────

    const historicalYears: HistoricalYear[] = cropData.map((row) => ({
      cropYear: row.crop_year,
      countyYield: row.county_yield,
      myaPrice: row.mya_price,
      benchmarkYield: row.benchmark_yield,
      benchmarkRevenue: row.benchmark_revenue,
      arcGuarantee: row.arc_guarantee,
      arcPaymentRate: row.arc_payment_rate,
      plcPaymentRate: row.plc_payment_rate,
    }));

    // ── Run Monte Carlo optimizer ─────────────────────────────────────────

    const mcInput: MonteCarloInput = {
      commodityCode: cropCode.toUpperCase(),
      historicalYears,
      baseAcres,
      plcPaymentYield,
      iterations,
    };

    const result = runMonteCarloOptimizer(mcInput);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not generate optimization. Insufficient data variability.' },
        { status: 422 },
      );
    }

    // Attach county info
    result.countyFips = countyFips;
    result.countyName = countyName;

    // ── Return with caching ───────────────────────────────────────────────

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600',
    );

    return response;
  } catch (err: any) {
    console.error('[Optimizer] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: err.message },
      { status: 500 },
    );
  }
}
