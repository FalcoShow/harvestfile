// =============================================================================
// HarvestFile — Phase 30 Build 3: State Benchmarking Leaderboard API (v2)
// GET /api/benchmarks/leaderboard
//
// FIXED: County counts now pulled from actual historical_enrollment data
// instead of hardcoded approximations. Uses 2025 (latest complete year)
// as the baseline for "total farming counties."
//
// Returns state-level benchmarking statistics for the Election Night Dashboard.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATE_NAMES: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
  '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
  '12': 'Florida', '13': 'Georgia', '15': 'Hawaii', '16': 'Idaho',
  '17': 'Illinois', '18': 'Indiana', '19': 'Iowa', '20': 'Kansas',
  '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine', '24': 'Maryland',
  '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota', '28': 'Mississippi',
  '29': 'Missouri', '30': 'Montana', '31': 'Nebraska', '32': 'Nevada',
  '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico', '36': 'New York',
  '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio', '40': 'Oklahoma',
  '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island', '45': 'South Carolina',
  '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas', '49': 'Utah',
  '50': 'Vermont', '51': 'Virginia', '53': 'Washington', '54': 'West Virginia',
  '55': 'Wisconsin', '56': 'Wyoming',
};

const STATE_ABBRS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID',
  '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA',
  '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ',
  '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK',
  '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN',
  '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// ─── Get real farming county counts from historical_enrollment ───────────────

async function getFarmingCountiesByState(): Promise<Record<string, number>> {
  // Query unique county_fips per state from the most recent complete year (2025)
  // Paginate to bypass 1000-row default limit
  const allRows: { county_fips: string }[] = [];
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('historical_enrollment')
      .select('county_fips')
      .eq('program_year', 2025)
      .range(offset, offset + pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }

  // Count unique counties per state (first 2 digits of FIPS = state)
  const stateCounts: Record<string, Set<string>> = {};
  for (const row of allRows) {
    const stateFips = row.county_fips.substring(0, 2);
    if (!stateCounts[stateFips]) {
      stateCounts[stateFips] = new Set();
    }
    stateCounts[stateFips].add(row.county_fips);
  }

  const result: Record<string, number> = {};
  for (const [stateFips, counties] of Object.entries(stateCounts)) {
    result[stateFips] = counties.size;
  }
  return result;
}

export async function GET() {
  try {
    // ── Get real farming county counts from database ───────────────────
    const farmingCountiesByState = await getFarmingCountiesByState();

    // ── Fetch all activity data ─────────────────────────────────────────
    const { data: activityRows, error: activityError } = await supabase
      .from('benchmark_activity')
      .select('state_fips, week_start, submission_count, unique_counties');

    if (activityError) {
      console.error('Leaderboard activity fetch error:', activityError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
    }

    const weekStart = getWeekStart();

    // ── Aggregate by state ──────────────────────────────────────────────
    const stateAgg: Record<string, {
      total_submissions: number;
      unique_counties: number;
      this_week: number;
    }> = {};

    for (const row of (activityRows || [])) {
      const sf = row.state_fips;
      if (!stateAgg[sf]) {
        stateAgg[sf] = { total_submissions: 0, unique_counties: 0, this_week: 0 };
      }
      stateAgg[sf].total_submissions += row.submission_count || 0;

      if ((row.unique_counties || 0) > stateAgg[sf].unique_counties) {
        stateAgg[sf].unique_counties = row.unique_counties;
      }

      if (row.week_start === weekStart) {
        stateAgg[sf].this_week += row.submission_count || 0;
      }
    }

    // Also get unique counties from county_benchmark_cache directly for accuracy
    const { data: cacheRows } = await supabase
      .from('county_benchmark_cache')
      .select('county_fips, total_count')
      .eq('program_year', 2026)
      .gt('total_count', 0);

    const countiesWithDataByState: Record<string, Set<string>> = {};
    for (const row of (cacheRows || [])) {
      const stateFips = row.county_fips.substring(0, 2);
      if (!countiesWithDataByState[stateFips]) {
        countiesWithDataByState[stateFips] = new Set();
      }
      countiesWithDataByState[stateFips].add(row.county_fips);
    }

    // ── Build state leaderboard using REAL county counts ────────────────
    const allStateFips = new Set([
      ...Object.keys(stateAgg),
      ...Object.keys(countiesWithDataByState),
      ...Object.keys(farmingCountiesByState),
    ]);

    const states = Array.from(allStateFips)
      .filter(sf => STATE_NAMES[sf])
      .map(sf => {
        const agg = stateAgg[sf] || { total_submissions: 0, unique_counties: 0, this_week: 0 };
        const countiesWithData = countiesWithDataByState[sf]?.size || 0;
        // Use REAL county count from database
        const farmingCounties = farmingCountiesByState[sf] || 0;

        return {
          state_fips: sf,
          state_abbr: STATE_ABBRS[sf],
          state_name: STATE_NAMES[sf],
          total_submissions: agg.total_submissions,
          unique_counties: Math.max(agg.unique_counties, countiesWithData),
          total_farming_counties: farmingCounties,
          completion_pct: farmingCounties > 0
            ? Math.min(100, Math.round((Math.max(agg.unique_counties, countiesWithData) / farmingCounties) * 100))
            : 0,
          this_week: agg.this_week,
        };
      })
      .sort((a, b) => b.total_submissions - a.total_submissions);

    // ── National totals using REAL counts ────────────────────────────────
    const totalSubmissions = states.reduce((s, st) => s + st.total_submissions, 0);
    const totalCountiesWithData = states.reduce((s, st) => s + st.unique_counties, 0);
    const totalFarmingCounties = Object.values(farmingCountiesByState).reduce((a, b) => a + b, 0);
    const thisWeekSubmissions = states.reduce((s, st) => s + st.this_week, 0);

    // ── Response ────────────────────────────────────────────────────────
    const response = NextResponse.json({
      states,
      national: {
        total_submissions: totalSubmissions,
        total_counties_with_data: totalCountiesWithData,
        total_farming_counties: totalFarmingCounties,
        completion_pct: totalFarmingCounties > 0
          ? Math.round((totalCountiesWithData / totalFarmingCounties) * 100)
          : 0,
        this_week_submissions: thisWeekSubmissions,
      },
      updated_at: new Date().toISOString(),
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=120, stale-while-revalidate=600'
    );

    return response;
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
