// =============================================================================
// HarvestFile — Historical Payments API
// Build 18 Deploy 3: County-specific ARC-CO vs PLC historical payment data
//
// GET /api/historical-payments/[county_fips]/[commodity_code]
//
// Returns 7-10 years of ARC-CO and PLC per-acre payment rates for a given
// county + crop combination. Data sourced from county_crop_data table.
//
// ARC-CO rates come directly from the arc_payment_rate column (already $/acre).
// PLC per-acre values are computed server-side from:
//   PLC_per_acre = max(0, effective_ref_price - max(mya_price, loan_rate))
//                  × benchmark_yield × 0.85
//
// Dynamic route segments enable CDN cache keying per county/crop path.
// Response is ~600 bytes gzipped — negligible even on rural 4G.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';

// ─── Reference Prices by Commodity (2018 Farm Bill + OBBBA) ──────────────────
// Source: USDA FSA published reference prices
// 2019-2024: 2018 Farm Bill statutory reference prices
// 2025+: OBBBA (2024 Farm Bill) updated reference prices

interface CommodityRef {
  /** 2018 Farm Bill statutory reference price */
  ref2018: number;
  /** OBBBA (2025+) statutory reference price */
  refOBBBA: number;
  /** Commodity loan rate */
  loanRate: number;
  /** Unit for display (bu, cwt, lb, ton) */
  unit: string;
}

const COMMODITY_REFS: Record<string, CommodityRef> = {
  CORN:     { ref2018: 3.70,   refOBBBA: 4.10,   loanRate: 2.20,   unit: 'bu' },
  SOYBEANS: { ref2018: 8.40,   refOBBBA: 10.00,  loanRate: 6.20,   unit: 'bu' },
  WHEAT:    { ref2018: 5.50,   refOBBBA: 6.35,   loanRate: 3.38,   unit: 'bu' },
  SORGHUM:  { ref2018: 3.95,   refOBBBA: 4.40,   loanRate: 2.20,   unit: 'bu' },
  BARLEY:   { ref2018: 4.95,   refOBBBA: 5.65,   loanRate: 2.50,   unit: 'bu' },
  OATS:     { ref2018: 2.40,   refOBBBA: 2.80,   loanRate: 1.43,   unit: 'bu' },
  RICE:     { ref2018: 14.00,  refOBBBA: 16.90,  loanRate: 7.00,   unit: 'cwt' },
  PEANUTS:  { ref2018: 535.00, refOBBBA: 630.00, loanRate: 355.00, unit: 'ton' },
  COTTON:   { ref2018: 0.367,  refOBBBA: 0.420,  loanRate: 0.52,   unit: 'lb' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEffectiveRefPrice(
  commodity: string,
  cropYear: number,
  historicalMYAs: number[]
): number {
  const refs = COMMODITY_REFS[commodity.toUpperCase()];
  if (!refs) return 0;

  const statutoryRef = cropYear >= 2025 ? refs.refOBBBA : refs.ref2018;

  // Effective reference price calculation:
  // For 2018 Farm Bill (2019-2024):
  //   ERP = min(1.15 × statutory, max(statutory, 0.85 × olympic_avg_5yr_MYA))
  // For OBBBA (2025+):
  //   ERP = min(1.13 × statutory, max(statutory, 0.88 × olympic_avg_5yr_MYA))

  if (historicalMYAs.length < 3) return statutoryRef;

  // Olympic average: drop highest and lowest from 5 years
  const sorted = [...historicalMYAs].sort((a, b) => a - b);
  let olympicAvg: number;
  if (sorted.length >= 5) {
    // Drop first (lowest) and last (highest)
    const middle = sorted.slice(1, -1);
    olympicAvg = middle.reduce((s, v) => s + v, 0) / middle.length;
  } else {
    // Not enough years — use simple average
    olympicAvg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  }

  const escalatorCap = cropYear >= 2025 ? 1.13 : 1.15;
  const yieldFraction = cropYear >= 2025 ? 0.88 : 0.85;

  const erp = Math.min(
    escalatorCap * statutoryRef,
    Math.max(statutoryRef, yieldFraction * olympicAvg)
  );

  return erp;
}

function computePlcPerAcre(
  commodity: string,
  cropYear: number,
  myaPrice: number,
  plcYieldProxy: number,
  historicalMYAs: number[]
): number {
  const refs = COMMODITY_REFS[commodity.toUpperCase()];
  if (!refs) return 0;

  const effectiveRef = getEffectiveRefPrice(commodity, cropYear, historicalMYAs);
  const effectivePrice = Math.max(myaPrice, refs.loanRate);
  const plcRate = Math.max(0, effectiveRef - effectivePrice);
  const plcPerAcre = plcRate * plcYieldProxy * 0.85;

  return Math.round(plcPerAcre * 100) / 100;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ county_fips: string; commodity_code: string }> }
) {
  const { county_fips, commodity_code } = await params;

  // Validate county FIPS (must be 5 digits)
  if (!/^\d{5}$/.test(county_fips)) {
    return NextResponse.json({ error: 'Invalid county FIPS code' }, { status: 400 });
  }

  // Validate commodity code
  const upperCommodity = commodity_code.toUpperCase();
  if (!COMMODITY_REFS[upperCommodity]) {
    return NextResponse.json({ error: 'Unsupported commodity' }, { status: 400 });
  }

  try {
    // Fetch all historical data for this county + crop
    const { data: rawData, error } = await supabasePublic
      .from('county_crop_data')
      .select('crop_year, county_yield, arc_payment_rate, plc_payment_rate, mya_price, benchmark_yield')
      .eq('county_fips', county_fips)
      .eq('commodity_code', upperCommodity)
      .order('crop_year', { ascending: true });

    if (error) {
      console.error('Historical payments query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        data: [],
        message: 'No historical data available for this county and crop.',
      });
    }

    // Build MYA history for effective reference price calculation
    const myaHistory = rawData
      .filter((r) => r.mya_price != null)
      .map((r) => ({ year: r.crop_year, mya: Number(r.mya_price) }));

    // Transform rows — filter to years with valid data (skip NULLs like 2014)
    const transformed = rawData
      .filter((row) => row.benchmark_yield != null && row.mya_price != null)
      .map((row) => {
        const cropYear = row.crop_year;
        const arcPerAcre = Number(row.arc_payment_rate) || 0;

        // Get 5 prior years of MYA for effective ref price calculation
        const priorMYAs = myaHistory
          .filter((m) => m.year < cropYear && m.year >= cropYear - 5)
          .map((m) => m.mya);

        // Compute PLC per-acre using standard formula
        const plcPerAcre = computePlcPerAcre(
          upperCommodity,
          cropYear,
          Number(row.mya_price),
          Number(row.benchmark_yield),
          priorMYAs
        );

        // Determine winner
        let winner: 'ARC-CO' | 'PLC' | 'TIE' = 'TIE';
        if (arcPerAcre > plcPerAcre) winner = 'ARC-CO';
        else if (plcPerAcre > arcPerAcre) winner = 'PLC';

        // Data status: 2024+ may have estimated MYA prices
        let dataStatus: 'final' | 'estimated' = 'final';
        if (cropYear >= 2024) dataStatus = 'estimated';

        return {
          cropYear,
          arcPerAcre: Math.round(arcPerAcre * 100) / 100,
          plcPerAcre,
          winner,
          dataStatus,
          // Context data for tooltips
          myaPrice: Number(row.mya_price),
          countyYield: Number(row.county_yield),
          benchmarkYield: Number(row.benchmark_yield),
        };
      });

    // Filter to the 2018 Farm Bill era forward (2019-2025) for primary display
    // but include 2015-2018 (2014 Farm Bill) as extended history
    const primaryYears = transformed.filter((r) => r.cropYear >= 2019);
    const extendedYears = transformed.filter((r) => r.cropYear >= 2015);

    // Compute summary stats for primary years
    const displayData = primaryYears.length >= 3 ? primaryYears : extendedYears;
    const arcWins = displayData.filter((r) => r.winner === 'ARC-CO').length;
    const plcWins = displayData.filter((r) => r.winner === 'PLC').length;
    const totalArcPerAcre = displayData.reduce((s, r) => s + r.arcPerAcre, 0);
    const totalPlcPerAcre = displayData.reduce((s, r) => s + r.plcPerAcre, 0);
    const avgArcPerAcre = displayData.length > 0
      ? Math.round((totalArcPerAcre / displayData.length) * 100) / 100
      : 0;
    const avgPlcPerAcre = displayData.length > 0
      ? Math.round((totalPlcPerAcre / displayData.length) * 100) / 100
      : 0;

    const response = NextResponse.json({
      data: displayData,
      summary: {
        years: displayData.length,
        arcWins,
        plcWins,
        ties: displayData.length - arcWins - plcWins,
        totalArcPerAcre: Math.round(totalArcPerAcre * 100) / 100,
        totalPlcPerAcre: Math.round(totalPlcPerAcre * 100) / 100,
        avgArcPerAcre,
        avgPlcPerAcre,
        overallWinner: totalArcPerAcre > totalPlcPerAcre ? 'ARC-CO'
          : totalPlcPerAcre > totalArcPerAcre ? 'PLC' : 'TIE',
      },
      countyFips: county_fips,
      commodityCode: upperCommodity,
    });

    // Cache for 24 hours — payment data changes at most once per crop year
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=3600'
    );

    return response;
  } catch (err) {
    console.error('Historical payments API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
