// =============================================================================
// HarvestFile — Calculator Counties API
// Phase 10 Build 1: Returns counties for a given state abbreviation
//
// GET /api/calculator/counties?state=OH
// Returns: { counties: [{ county_fips, display_name, slug }] }
//
// Uses the `states` + `counties` tables.
// Only returns counties with has_arc_plc_data = true.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';

export async function GET(request: NextRequest) {
  const stateAbbr = request.nextUrl.searchParams.get('state');

  if (!stateAbbr || stateAbbr.length !== 2) {
    return NextResponse.json({ counties: [], error: 'Invalid state parameter' }, { status: 400 });
  }

  try {
    // Step 1: Look up state_fips from abbreviation
    const { data: stateData, error: stateError } = await supabasePublic
      .from('states')
      .select('state_fips')
      .eq('abbreviation', stateAbbr.toUpperCase())
      .single();

    if (stateError || !stateData) {
      return NextResponse.json({ counties: [], error: 'State not found' }, { status: 404 });
    }

    // Step 2: Fetch counties for this state with ARC/PLC data
    const { data: counties, error: countyError } = await supabasePublic
      .from('counties')
      .select('county_fips, display_name, slug')
      .eq('state_fips', stateData.state_fips)
      .eq('has_arc_plc_data', true)
      .order('display_name', { ascending: true });

    if (countyError) {
      console.error('Counties query error:', countyError);
      return NextResponse.json({ counties: [], error: countyError.message }, { status: 500 });
    }

    // Cache for 1 hour — county lists don't change often
    const response = NextResponse.json({ counties: counties || [] });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return response;
  } catch (err) {
    console.error('Counties API error:', err);
    return NextResponse.json({ counties: [], error: 'Internal server error' }, { status: 500 });
  }
}
