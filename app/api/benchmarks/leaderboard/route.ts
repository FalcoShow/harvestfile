// =============================================================================
// HarvestFile — Phase 30 Build 1: State Benchmarking Leaderboard API
// GET /api/benchmarks/leaderboard
//
// Returns state-level benchmarking statistics for the Election Night Dashboard:
// - States ranked by total submissions
// - County completion rates per state
// - Weekly activity trends
// - National totals
//
// Response: {
//   states: [{ state_fips, state_abbr, state_name, total_submissions,
//              unique_counties, total_farming_counties, completion_pct,
//              this_week }],
//   national: { total_submissions, total_counties_with_data, total_farming_counties,
//               this_week_submissions },
//   updated_at
// }
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Approximate number of farming counties per state (counties with >1000 base acres)
// Source: USDA FSA enrolled base acre data
const FARMING_COUNTIES_BY_STATE: Record<string, number> = {
  '01': 52, '02': 5, '04': 10, '05': 55, '06': 42, '08': 40, '09': 6,
  '10': 3, '12': 35, '13': 105, '15': 3, '16': 30, '17': 95, '18': 82,
  '19': 96, '20': 95, '21': 85, '22': 45, '23': 10, '24': 18, '25': 8,
  '26': 62, '27': 72, '28': 60, '29': 98, '30': 42, '31': 82, '32': 10,
  '33': 5, '34': 12, '35': 18, '36': 40, '37': 70, '38': 48, '39': 72,
  '40': 65, '41': 25, '42': 48, '44': 3, '45': 35, '46': 55, '47': 70,
  '48': 180, '49': 15, '50': 8, '51': 70, '53': 28, '54': 30, '55': 60,
  '56': 18,
};

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

export async function GET() {
  try {
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

      // unique_counties is cumulative per week — take max across all weeks
      if ((row.unique_counties || 0) > stateAgg[sf].unique_counties) {
        stateAgg[sf].unique_counties = row.unique_counties;
      }

      // This week's activity
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

    // Count unique counties with data per state
    const countiesWithDataByState: Record<string, Set<string>> = {};
    for (const row of (cacheRows || [])) {
      const stateFips = row.county_fips.substring(0, 2);
      if (!countiesWithDataByState[stateFips]) {
        countiesWithDataByState[stateFips] = new Set();
      }
      countiesWithDataByState[stateFips].add(row.county_fips);
    }

    // ── Build state leaderboard ─────────────────────────────────────────
    const states = Object.keys({ ...stateAgg, ...countiesWithDataByState })
      .filter(sf => STATE_NAMES[sf])
      .map(sf => {
        const agg = stateAgg[sf] || { total_submissions: 0, unique_counties: 0, this_week: 0 };
        const countiesWithData = countiesWithDataByState[sf]?.size || 0;
        const farmingCounties = FARMING_COUNTIES_BY_STATE[sf] || 50;

        return {
          state_fips: sf,
          state_abbr: STATE_ABBRS[sf],
          state_name: STATE_NAMES[sf],
          total_submissions: agg.total_submissions,
          unique_counties: Math.max(agg.unique_counties, countiesWithData),
          total_farming_counties: farmingCounties,
          completion_pct: Math.min(
            100,
            Math.round((Math.max(agg.unique_counties, countiesWithData) / farmingCounties) * 100)
          ),
          this_week: agg.this_week,
        };
      })
      .sort((a, b) => b.total_submissions - a.total_submissions);

    // ── National totals ─────────────────────────────────────────────────
    const totalSubmissions = states.reduce((s, st) => s + st.total_submissions, 0);
    const totalCountiesWithData = states.reduce((s, st) => s + st.unique_counties, 0);
    const totalFarmingCounties = Object.values(FARMING_COUNTIES_BY_STATE).reduce((a, b) => a + b, 0);
    const thisWeekSubmissions = states.reduce((s, st) => s + st.this_week, 0);

    // ── Response ────────────────────────────────────────────────────────
    const response = NextResponse.json({
      states,
      national: {
        total_submissions: totalSubmissions,
        total_counties_with_data: totalCountiesWithData,
        total_farming_counties: totalFarmingCounties,
        completion_pct: Math.round((totalCountiesWithData / totalFarmingCounties) * 100),
        this_week_submissions: thisWeekSubmissions,
      },
      updated_at: new Date().toISOString(),
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );

    return response;
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
