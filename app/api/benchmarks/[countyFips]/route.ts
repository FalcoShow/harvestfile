// =============================================================================
// HarvestFile — Phase 7A: County Benchmark Read API
// GET /api/benchmarks/[countyFips]
//
// Returns cached benchmark data for all crops in a county.
// Public endpoint — no auth required.
// Used by BenchmarkWidget via SWR polling (30s intervals).
// =============================================================================

import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';

const CURRENT_PROGRAM_YEAR = 2026;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ countyFips: string }> }
) {
  const { countyFips } = await params;

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json({ error: 'Invalid county FIPS code' }, { status: 400 });
  }

  // Parse optional year from query params
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(CURRENT_PROGRAM_YEAR));

  try {
    // Fetch benchmarks from cache table
    const { data: benchmarks, error } = await supabasePublic
      .from('county_benchmark_cache')
      .select('commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible, last_updated')
      .eq('county_fips', countyFips)
      .eq('program_year', year);

    if (error) {
      console.error('Benchmark read error:', error);
      return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 });
    }

    // Fetch state-level activity for social proof
    const stateFips = countyFips.substring(0, 2);
    const weekStart = getWeekStart();

    const { data: activity } = await supabasePublic
      .from('benchmark_activity')
      .select('submission_count, unique_counties')
      .eq('state_fips', stateFips)
      .eq('week_start', weekStart)
      .single();

    // Get total submissions across all counties in this state for all time
    const { data: totalActivity } = await supabasePublic
      .from('benchmark_activity')
      .select('submission_count')
      .eq('state_fips', stateFips);

    const totalStateSubmissions = (totalActivity || []).reduce(
      (sum, row) => sum + (row.submission_count || 0), 0
    );

    // Return sanitized data — hide percentages if below threshold
    return NextResponse.json({
      county_fips: countyFips,
      program_year: year,
      benchmarks: (benchmarks || []).map(b => ({
        commodity_code: b.commodity_code,
        arc_co_pct: b.is_visible ? Number(b.arc_co_pct) : null,
        plc_pct: b.is_visible ? Number(b.plc_pct) : null,
        total_count: b.total_count,
        is_visible: b.is_visible,
        last_updated: b.last_updated,
      })),
      social_proof: {
        state_this_week: activity?.submission_count || 0,
        state_counties_this_week: activity?.unique_counties || 0,
        state_total: totalStateSubmissions,
      },
    }, {
      headers: {
        // Cache for 30 seconds at the edge, allow stale for 5 minutes
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Benchmark API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}
