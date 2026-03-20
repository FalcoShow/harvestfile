// =============================================================================
// HarvestFile — Phase 17 Build 1: County Benchmark API
// GET /api/benchmarks/county?county_fips=39037&commodity=CORN
//
// Returns historical ARC/PLC enrollment splits + live 2026 crowdsourced
// benchmarks for a single county/commodity. This powers the BenchmarkWidget
// on the calculator results page — the network effect engine.
//
// Response shape:
// {
//   county_fips, county_name, state_abbr, commodity,
//   historical: [{ year, arc_acres, plc_acres, total, arc_pct, plc_pct }],
//   live_2026: { arc_co_count, plc_count, total, arc_co_pct, plc_pct, is_visible },
//   social_proof: { state_this_week, state_counties_this_week, state_total, county_total },
// }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countyFips = searchParams.get('county_fips');
  const commodity = (searchParams.get('commodity') || 'ALL').toUpperCase();

  // ── Validate inputs ─────────────────────────────────────────────────────
  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json({ error: 'Invalid county_fips' }, { status: 400 });
  }

  try {
    // ── Fetch county name + state ───────────────────────────────────────
    const { data: countyRow } = await supabase
      .from('counties')
      .select('county_fips, display_name, state_fips')
      .eq('county_fips', countyFips)
      .single();

    let countyName = countyRow?.display_name || '';
    let stateAbbr = '';

    if (countyRow?.state_fips) {
      const { data: stateRow } = await supabase
        .from('states')
        .select('abbreviation')
        .eq('state_fips', countyRow.state_fips)
        .single();
      stateAbbr = stateRow?.abbreviation || '';
    }

    // ── Fetch historical enrollment (2019–2025) ─────────────────────────
    let histQuery = supabase
      .from('historical_enrollment')
      .select('program_year, commodity_code, arcco_acres, plc_acres')
      .eq('county_fips', countyFips)
      .order('program_year', { ascending: true });

    if (commodity !== 'ALL') {
      histQuery = histQuery.eq('commodity_code', commodity);
    }

    const { data: histRows, error: histError } = await histQuery;

    if (histError) {
      console.error('Historical enrollment error:', histError);
    }

    // Aggregate by year (sum across commodities if ALL)
    const yearAgg: Record<number, { arc: number; plc: number }> = {};
    for (const row of histRows || []) {
      const y = row.program_year;
      if (!yearAgg[y]) yearAgg[y] = { arc: 0, plc: 0 };
      yearAgg[y].arc += row.arcco_acres || 0;
      yearAgg[y].plc += row.plc_acres || 0;
    }

    const historical = Object.entries(yearAgg)
      .map(([year, data]) => {
        const total = data.arc + data.plc;
        return {
          year: parseInt(year),
          arc_acres: Math.round(data.arc),
          plc_acres: Math.round(data.plc),
          total: Math.round(total),
          arc_pct: total > 0 ? Math.round((data.arc / total) * 1000) / 10 : 0,
          plc_pct: total > 0 ? Math.round((data.plc / total) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => a.year - b.year);

    // ── Fetch live 2026 crowdsourced benchmarks ─────────────────────────
    let liveQuery = supabase
      .from('county_benchmark_cache')
      .select('commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible')
      .eq('county_fips', countyFips)
      .eq('program_year', 2026);

    if (commodity !== 'ALL') {
      liveQuery = liveQuery.eq('commodity_code', commodity);
    }

    const { data: liveRows } = await liveQuery;

    // Aggregate live data
    let liveArc = 0;
    let livePlc = 0;
    let liveTotal = 0;
    let liveVisible = false;

    for (const row of liveRows || []) {
      liveArc += row.arc_co_count || 0;
      livePlc += row.plc_count || 0;
      liveTotal += row.total_count || 0;
      if (row.is_visible) liveVisible = true;
    }

    const live2026 = {
      arc_co_count: liveArc,
      plc_count: livePlc,
      total: liveTotal,
      arc_co_pct: liveVisible && liveTotal > 0
        ? Math.round((liveArc / liveTotal) * 1000) / 10
        : null,
      plc_pct: liveVisible && liveTotal > 0
        ? Math.round((livePlc / liveTotal) * 1000) / 10
        : null,
      is_visible: liveVisible,
    };

    // ── Social proof ────────────────────────────────────────────────────
    const stateFips = countyFips.substring(0, 2);
    const weekStart = getWeekStart();

    const { data: activity } = await supabase
      .from('benchmark_activity')
      .select('submission_count, unique_counties')
      .eq('state_fips', stateFips)
      .eq('week_start', weekStart)
      .single();

    // Total state submissions
    const { data: totalActivity } = await supabase
      .from('benchmark_activity')
      .select('submission_count')
      .eq('state_fips', stateFips);

    const stateTotal = (totalActivity || []).reduce(
      (sum, row) => sum + (row.submission_count || 0), 0
    );

    // Total county submissions (from election_submissions directly)
    const { count: countyTotal } = await supabase
      .from('election_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('county_fips', countyFips);

    // ── Response ────────────────────────────────────────────────────────
    return NextResponse.json({
      county_fips: countyFips,
      county_name: countyName,
      state_abbr: stateAbbr,
      commodity,
      historical,
      live_2026: live2026,
      social_proof: {
        state_this_week: activity?.submission_count || 0,
        state_counties_this_week: activity?.unique_counties || 0,
        state_total: stateTotal,
        county_total: countyTotal || 0,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('County benchmark API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}
