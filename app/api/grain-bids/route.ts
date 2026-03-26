// =============================================================================
// HarvestFile — Grain Bids API Route
// GET /api/grain-bids?zip=44278           (by zip)
// GET /api/grain-bids?fips=39153          (by county FIPS)
// GET /api/grain-bids?lat=41.1&lng=-81.4  (by coordinates)
//
// Server-side only. Proxies Barchart getGrainBids with caching.
// Never exposes the Barchart API key to the client.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getGrainBids, getGrainBidsByFips, getGrainBidsByCoords, getQueryStats } from '@/lib/barchart/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const zip = searchParams.get('zip');
    const fips = searchParams.get('fips');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!zip && !fips && !(lat && lng)) {
      return NextResponse.json(
        { error: 'Provide zip, fips, or lat+lng parameters' },
        { status: 400 }
      );
    }

    const commoditiesParam = searchParams.get('commodities');
    const commodities = commoditiesParam
      ? commoditiesParam.split(',').map((c) => c.trim())
      : undefined;

    const maxStr = searchParams.get('max');
    const maxLocations = maxStr ? Math.min(parseInt(maxStr, 10), 30) : 20;

    let elevators;

    if (zip && /^\d{5}$/.test(zip)) {
      elevators = await getGrainBids(zip, { commodities, maxLocations });
    } else if (fips && /^\d{4,5}$/.test(fips)) {
      elevators = await getGrainBidsByFips(fips, { commodities, maxLocations });
    } else if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 });
      }
      elevators = await getGrainBidsByCoords(latitude, longitude, { commodities, maxLocations });
    } else {
      return NextResponse.json({ error: 'Invalid location parameters' }, { status: 400 });
    }

    const stats = getQueryStats();

    return NextResponse.json(
      {
        query: { zip, fips, lat, lng },
        count: elevators.length,
        elevators,
        attribution: 'Market data provided by Barchart. Cash grain bids are for informational purposes only and subject to change.',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
          'X-Query-Budget': `${stats.todayCount}/${stats.dailyLimit} (${stats.percentUsed}%)`,
        },
      }
    );
  } catch (error) {
    console.error('[grain-bids] Route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grain bids', elevators: [] },
      { status: 500 }
    );
  }
}
