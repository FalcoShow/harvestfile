// =============================================================================
// HarvestFile — Calculator Estimate API
// Phase 10 Build 4: County-specific ARC/PLC payment estimates
//
// GET /api/calculator/estimate?county_fips=39037&crop=CORN&acres=500
//
// Returns real county-specific payment estimates using:
//   1. USDA NASS county yield data (from county_crop_data table)
//   2. The arc-plc-engine.ts projection engine (same math as county pages)
//
// Falls back gracefully when insufficient data is available.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';
import { projectScenario, type HistoricalYear } from '@/lib/arc-plc-engine';

export async function GET(request: NextRequest) {
  const countyFips = request.nextUrl.searchParams.get('county_fips');
  const cropCode = request.nextUrl.searchParams.get('crop');
  const acresParam = request.nextUrl.searchParams.get('acres');

  if (!countyFips || !cropCode) {
    return NextResponse.json({ error: 'county_fips and crop are required' }, { status: 400 });
  }

  const acres = parseInt(acresParam || '0') || 0;

  try {
    // Fetch historical crop data for this county + crop
    const { data: cropData, error: cropError } = await supabasePublic
      .from('county_crop_data')
      .select('crop_year, county_yield, benchmark_yield, benchmark_revenue, arc_guarantee, arc_actual_revenue, arc_payment_rate, mya_price, plc_payment_rate')
      .eq('county_fips', countyFips)
      .eq('commodity_code', cropCode)
      .order('crop_year', { ascending: true });

    if (cropError) {
      console.error('Estimate query error:', cropError);
      return NextResponse.json({ error: 'Database error', hasCountyData: false }, { status: 500 });
    }

    // Check if we have enough data for the projection engine
    if (!cropData || cropData.length < 3) {
      return NextResponse.json({
        hasCountyData: false,
        message: 'Insufficient historical data for county-specific estimate',
        yearsAvailable: cropData?.length || 0,
      });
    }

    // Convert to the format expected by the projection engine
    const historicalYears: HistoricalYear[] = cropData.map(row => ({
      cropYear: row.crop_year,
      countyYield: row.county_yield,
      myaPrice: row.mya_price,
      benchmarkYield: row.benchmark_yield,
      benchmarkRevenue: row.benchmark_revenue,
      arcGuarantee: row.arc_guarantee,
      arcPaymentRate: row.arc_payment_rate,
      plcPaymentRate: row.plc_payment_rate,
    }));

    // Run the projection engine with baseline assumptions
    const result = projectScenario(cropCode, historicalYears, {
      priceMultiplier: 1.0,
      yieldMultiplier: 1.0,
      plcYieldFraction: 0.80,
    });

    if (!result || result.years.length === 0) {
      return NextResponse.json({
        hasCountyData: false,
        message: 'Could not generate projections for this county/crop combination',
      });
    }

    // Get the 2025 crop year projection (or the first available)
    const year2025 = result.years.find(y => y.cropYear === 2025) || result.years[0];

    // Calculate total payments
    const arcTotal = Math.round(year2025.arcPaymentPerAcre * acres);
    const plcTotal = Math.round(year2025.plcPaymentPerAcre * acres);
    const diff = Math.abs(arcTotal - plcTotal);
    const diffPerAcre = Math.round(Math.abs(year2025.arcPaymentPerAcre - year2025.plcPaymentPerAcre) * 100) / 100;
    const winner = year2025.winner;

    // Also compute cumulative advantage across all projected years
    const cumulativeArcPerAcre = result.years.reduce((s, y) => s + y.arcPaymentPerAcre, 0);
    const cumulativePlcPerAcre = result.years.reduce((s, y) => s + y.plcPaymentPerAcre, 0);

    const response = NextResponse.json({
      hasCountyData: true,
      cropYear: year2025.cropYear,
      arc: arcTotal,
      plc: plcTotal,
      arcPerAcre: Math.round(year2025.arcPaymentPerAcre * 100) / 100,
      plcPerAcre: Math.round(year2025.plcPaymentPerAcre * 100) / 100,
      best: winner,
      diff,
      diffPerAcre,
      // Multi-year summary
      overallWinner: result.overallWinner,
      cumulativeArcPerAcre: Math.round(cumulativeArcPerAcre * 100) / 100,
      cumulativePlcPerAcre: Math.round(cumulativePlcPerAcre * 100) / 100,
      summary: result.summary,
      // Metadata
      dataYears: cropData.length,
      projectedYears: result.years.length,
      // Key calculation inputs for transparency
      benchmarkYield: year2025.olympicAvgYield,
      benchmarkPrice: year2025.olympicAvgPrice,
      effectiveRefPrice: year2025.effectiveRefPrice,
      projectedMYA: year2025.projectedMYA,
      projectedYield: year2025.projectedCountyYield,
    });

    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return response;
  } catch (err) {
    console.error('Estimate API error:', err);
    return NextResponse.json({ error: 'Internal server error', hasCountyData: false }, { status: 500 });
  }
}
