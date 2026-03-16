// =============================================================================
// HarvestFile — Phase 8B: Election Map Data API
// GET /api/elections/map
//
// Returns county-level ARC/PLC election data for the choropleth map.
// Primary source: historical_enrollment (FSA data, 2019–2025)
// Secondary source: county_benchmark_cache (live crowdsourced, 2026)
//
// Query params:
//   year     — program year (default: 2025)
//   commodity — commodity code or "ALL" (default: ALL)
//
// Response: { counties, names, kpi, year, commodity }
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cache headers: revalidate every 5 minutes during non-peak, 60s during enrollment
const CACHE_MAX_AGE = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '2025');
  const commodity = (searchParams.get('commodity') || 'ALL').toUpperCase();

  // Validate
  if (year < 2019 || year > 2031) {
    return NextResponse.json({ error: 'Year must be between 2019 and 2031' }, { status: 400 });
  }

  try {
    // ── Fetch enrollment data ─────────────────────────────────────────────
    let enrollmentData: any[] = [];

    if (year <= 2025) {
      // Historical FSA data — paginate to bypass 1000-row default limit
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('historical_enrollment')
          .select('county_fips, commodity_code, arcco_acres, plc_acres')
          .eq('program_year', year)
          .range(offset, offset + pageSize - 1);

        if (commodity !== 'ALL') {
          query = query.eq('commodity_code', commodity);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Historical enrollment fetch error:', error);
          return NextResponse.json({ error: 'Failed to fetch enrollment data' }, { status: 500 });
        }

        if (data && data.length > 0) {
          enrollmentData.push(...data);
          offset += pageSize;
          if (data.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }
    }

    // ── Aggregate by county ───────────────────────────────────────────────
    const countyAgg: Record<string, { arc: number; plc: number; total: number }> = {};

    for (const row of enrollmentData) {
      const fips = row.county_fips;
      if (!countyAgg[fips]) {
        countyAgg[fips] = { arc: 0, plc: 0, total: 0 };
      }
      countyAgg[fips].arc += row.arcco_acres || 0;
      countyAgg[fips].plc += row.plc_acres || 0;
      countyAgg[fips].total += (row.arcco_acres || 0) + (row.plc_acres || 0);
    }

    // ── For 2026, overlay live crowdsourced data ──────────────────────────
    if (year === 2026) {
      let benchQuery = supabase
        .from('county_benchmark_cache')
        .select('county_fips, commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible')
        .eq('program_year', 2026);

      if (commodity !== 'ALL') {
        benchQuery = benchQuery.eq('commodity_code', commodity);
      }

      const { data: benchRows } = await benchQuery;

      for (const row of (benchRows || [])) {
        if (!row.is_visible || row.total_count < 1) continue;
        const fips = row.county_fips;
        if (!countyAgg[fips]) {
          countyAgg[fips] = { arc: 0, plc: 0, total: 0 };
        }
        countyAgg[fips].arc += row.arc_co_count || 0;
        countyAgg[fips].plc += row.plc_count || 0;
        countyAgg[fips].total += row.total_count || 0;
      }
    }

    // ── Calculate percentages ─────────────────────────────────────────────
    const counties: Record<string, { arc_pct: number; plc_pct: number; total: number }> = {};
    let globalArc = 0;
    let globalPlc = 0;
    let globalTotal = 0;

    for (const [fips, data] of Object.entries(countyAgg)) {
      if (data.total > 0) {
        counties[fips] = {
          arc_pct: Math.round((data.arc / data.total) * 1000) / 10,
          plc_pct: Math.round((data.plc / data.total) * 1000) / 10,
          total: data.total,
        };
        globalArc += data.arc;
        globalPlc += data.plc;
        globalTotal += data.total;
      }
    }

    // ── Fetch county names for tooltip ────────────────────────────────────
    const fipsList = Object.keys(counties);
    const names: Record<string, { name: string; state: string }> = {};

    if (fipsList.length > 0) {
      // Fetch in batches to avoid URL length limits
      const batchSize = 500;
      for (let i = 0; i < fipsList.length; i += batchSize) {
        const batch = fipsList.slice(i, i + batchSize);
        const { data: countyRows } = await supabase
          .from('counties')
          .select('county_fips, display_name, state_fips')
          .in('county_fips', batch);

        for (const row of (countyRows || [])) {
          names[row.county_fips] = {
            name: row.display_name || row.county_fips,
            state: row.state_fips || '',
          };
        }
      }

      // Fetch state abbreviations
      const stateFipsList = Array.from(new Set(Object.values(names).map(n => n.state)));
      if (stateFipsList.length > 0) {
        const { data: stateRows } = await supabase
          .from('states')
          .select('state_fips, abbreviation')
          .in('state_fips', stateFipsList);

        const stateMap: Record<string, string> = {};
        for (const s of (stateRows || [])) {
          stateMap[s.state_fips] = s.abbreviation;
        }
        for (const fips of Object.keys(names)) {
          names[fips].state = stateMap[names[fips].state] || names[fips].state;
        }
      }
    }

    // ── Build response ────────────────────────────────────────────────────
    const response = NextResponse.json({
      counties,
      names,
      kpi: {
        total_counties: Object.keys(counties).length,
        total_acres: globalTotal,
        arc_pct: globalTotal > 0 ? Math.round((globalArc / globalTotal) * 1000) / 10 : 0,
        plc_pct: globalTotal > 0 ? Math.round((globalPlc / globalTotal) * 1000) / 10 : 0,
      },
      year,
      commodity,
    });

    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=600`
    );

    return response;
  } catch (err) {
    console.error('Election map API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
