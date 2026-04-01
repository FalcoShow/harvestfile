// =============================================================================
// HarvestFile — County Elections API
// Build 18 Deploy 4: County-level ARC-CO vs PLC enrollment data
//
// GET /api/county-elections?county_fips=39037
//
// Returns 7 years of aggregated enrollment data showing what percentage
// of base acres in a county chose ARC-CO vs PLC. Aggregates across ALL
// crops for the county-wide view. Data from historical_enrollment table
// (165,000+ rows seeded from FSA Excel files).
//
// Response is ~400 bytes gzipped — negligible on rural 4G.
// CDN cached for 1 hour with 24hr stale-while-revalidate.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AggregatedYear {
  programYear: number;
  arccoAcres: number;
  plcAcres: number;
  totalAcres: number;
  arccoPct: number;
  plcPct: number;
}

interface ElectionInsightsData {
  dominant: 'ARC-CO' | 'PLC' | 'SPLIT';
  dominantPct: number;
  trendDirection: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE';
  trendShift: number;
  streak: number;
  latestYear: number;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const countyFips = request.nextUrl.searchParams.get('county_fips');

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: 'county_fips query parameter is required (5-digit FIPS code)' },
      { status: 400 }
    );
  }

  try {
    // Fetch all enrollment rows for this county (all crops, all years)
    const { data: rows, error } = await supabasePublic
      .from('historical_enrollment')
      .select('program_year, crop_name, arcco_acres, plc_acres, total_acres, state_name, county_name')
      .eq('county_fips', countyFips)
      .order('program_year', { ascending: true });

    if (error) {
      console.error('County elections query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        data: [],
        insights: null,
        countyName: null,
        stateName: null,
        message: 'No enrollment data available for this county.',
      });
    }

    // Extract county/state names from first row
    const countyName = rows[0].county_name || '';
    const stateName = rows[0].state_name || '';

    // Aggregate by program_year across all crops
    const yearMap = new Map<number, { arc: number; plc: number }>();
    for (const row of rows) {
      const y = row.program_year;
      if (!yearMap.has(y)) yearMap.set(y, { arc: 0, plc: 0 });
      const agg = yearMap.get(y)!;
      agg.arc += Number(row.arcco_acres) || 0;
      agg.plc += Number(row.plc_acres) || 0;
    }

    // Convert to sorted array with percentages
    const data: AggregatedYear[] = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, agg]) => {
        const total = agg.arc + agg.plc;
        return {
          programYear: year,
          arccoAcres: Math.round(agg.arc),
          plcAcres: Math.round(agg.plc),
          totalAcres: Math.round(total),
          arccoPct: total > 0 ? Math.round((agg.arc / total) * 1000) / 10 : 0,
          plcPct: total > 0 ? Math.round((agg.plc / total) * 1000) / 10 : 0,
        };
      });

    // Compute insights
    const latest = data[data.length - 1];
    const dominant: 'ARC-CO' | 'PLC' | 'SPLIT' =
      latest.arccoPct > 55 ? 'ARC-CO' :
      latest.plcPct > 55 ? 'PLC' : 'SPLIT';
    const dominantPct = Math.max(latest.arccoPct, latest.plcPct);

    // Trend: compare latest to 2 years ago
    const twoYearsAgo = data.find((d) => d.programYear === latest.programYear - 2);
    let trendDirection: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE' = 'STABLE';
    let trendShift = 0;
    if (twoYearsAgo) {
      trendShift = Math.round((latest.arccoPct - twoYearsAgo.arccoPct) * 10) / 10;
      if (trendShift >= 3) trendDirection = 'TOWARD_ARC';
      else if (trendShift <= -3) trendDirection = 'TOWARD_PLC';
    }

    // Streak: how many consecutive years the dominant program won
    let streak = 1;
    const latestDominant = latest.arccoPct >= latest.plcPct ? 'ARC-CO' : 'PLC';
    for (let i = data.length - 2; i >= 0; i--) {
      const d = data[i];
      const winner = d.arccoPct >= d.plcPct ? 'ARC-CO' : 'PLC';
      if (winner === latestDominant) streak++;
      else break;
    }

    const insights: ElectionInsightsData = {
      dominant,
      dominantPct,
      trendDirection,
      trendShift: Math.abs(trendShift),
      streak,
      latestYear: latest.programYear,
    };

    // Count unique crops for metadata
    const uniqueCrops = new Set(rows.map((r) => r.crop_name)).size;

    const response = NextResponse.json({
      data,
      insights,
      countyName,
      stateName,
      countyFips,
      totalCrops: uniqueCrops,
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );

    return response;
  } catch (err) {
    console.error('County elections API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
