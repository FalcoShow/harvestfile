// =============================================================================
// HarvestFile — Phase 30 Build 4: County Impact Stats
// GET /api/benchmarks/impact?county_fips=XXXXX
//
// Returns impact data for a county — total views, weekly views,
// submission count, data tier. Used by the ImpactCounter component
// to show contributors how many farmers their data is helping.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countyFips = searchParams.get('county_fips');
  const programYear = parseInt(searchParams.get('program_year') || '2026');

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json({ error: 'Invalid county FIPS' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_county_impact', {
      p_county_fips: countyFips,
      p_program_year: programYear,
    });

    if (error) {
      console.error('Impact stats error:', error);
      // Fallback: return zeros rather than failing
      return NextResponse.json({
        county_fips: countyFips,
        total_views: 0,
        views_this_week: 0,
        views_today: 0,
        total_submissions: 0,
        data_tier: 0,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      });
    }

    const stats = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      county_fips: countyFips,
      total_views: stats?.total_views || 0,
      views_this_week: stats?.views_this_week || 0,
      views_today: stats?.views_today || 0,
      total_submissions: stats?.total_submissions || 0,
      data_tier: stats?.data_tier || 0,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('Impact API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
