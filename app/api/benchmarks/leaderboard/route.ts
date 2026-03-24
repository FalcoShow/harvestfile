// =============================================================================
// HarvestFile — Phase 30 Build 4: State Leaderboard
// GET /api/benchmarks/leaderboard?state_fips=XX
//
// Returns the top counties by participation within a state.
// Powers the "McLean County leads Illinois" competitive display.
// Also returns state-level aggregate stats.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// State FIPS → Name mapping (50 states + DC)
const STATE_NAMES: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
  '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
  '11': 'DC', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
  '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
  '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
  '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
  '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
  '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
  '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
  '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
  '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
  '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
  '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateFips = searchParams.get('state_fips');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);

  if (!stateFips || !/^\d{2}$/.test(stateFips)) {
    return NextResponse.json({ error: 'Invalid state FIPS code' }, { status: 400 });
  }

  try {
    // Get top counties in this state from gamification stats
    const { data: counties, error: countiesError } = await supabaseAdmin
      .from('county_gamification_stats')
      .select('county_fips, total_submissions, crops_reported, unique_contributors, data_tier, tier_progress_pct, total_views')
      .eq('state_fips', stateFips)
      .order('total_submissions', { ascending: false })
      .limit(limit);

    if (countiesError) {
      console.error('Leaderboard counties error:', countiesError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Get state aggregate from state leaderboard stats
    const { data: stateStats } = await supabaseAdmin
      .from('state_leaderboard_stats')
      .select('*')
      .eq('state_fips', stateFips)
      .single();

    // Enrich counties with names from the counties table
    const countyFipsList = (counties || []).map(c => c.county_fips);
    const { data: countyNames } = await supabaseAdmin
      .from('counties')
      .select('county_fips, county_name')
      .in('county_fips', countyFipsList);

    const nameMap = new Map((countyNames || []).map(c => [c.county_fips, c.county_name]));

    return NextResponse.json({
      state_fips: stateFips,
      state_name: STATE_NAMES[stateFips] || 'Unknown',
      state_stats: {
        total_submissions: stateStats?.total_submissions || 0,
        counties_reporting: stateStats?.counties_reporting || 0,
        counties_unlocked: stateStats?.counties_unlocked || 0,
        unique_contributors: stateStats?.unique_contributors || 0,
      },
      top_counties: (counties || []).map((c, i) => ({
        rank: i + 1,
        county_fips: c.county_fips,
        county_name: nameMap.get(c.county_fips) || 'Unknown County',
        total_submissions: c.total_submissions,
        crops_reported: c.crops_reported,
        unique_contributors: c.unique_contributors,
        data_tier: c.data_tier,
        tier_progress_pct: c.tier_progress_pct,
        total_views: c.total_views,
      })),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
