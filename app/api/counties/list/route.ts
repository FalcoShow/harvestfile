// =============================================================================
// HarvestFile — County List API
// Phase 6A: Returns all counties with state info for the homepage search widget
//
// Cached aggressively — county list changes only when we backfill new data.
// Returns ~2,000 items as a compact JSON array (~80KB gzipped).
// =============================================================================

import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';

export const revalidate = 86400; // ISR: 24 hours

export async function GET() {
  try {
    // Paginate through all counties (Supabase caps at 1000 per query)
    let allCounties: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabasePublic
        .from('counties')
        .select(`
          county_fips,
          display_name,
          slug,
          state_fips,
          has_arc_plc_data,
          states!inner (
            name,
            slug,
            abbreviation
          )
        `)
        .eq('has_arc_plc_data', true)
        .order('display_name')
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('County list API error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch counties' },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allCounties = allCounties.concat(data);
        offset += pageSize;
        if (data.length < pageSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    // Transform to compact format for the search widget
    const counties = allCounties.map((c: any) => ({
      n: c.display_name,                // name
      s: c.slug,                         // county slug
      sn: c.states.name,                 // state name
      ss: c.states.slug,                 // state slug
      sa: c.states.abbreviation,         // state abbreviation
    }));

    return NextResponse.json(counties, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('County list API unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
