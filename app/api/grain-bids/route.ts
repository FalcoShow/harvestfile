// =============================================================================
// HarvestFile — Grain Bids API Route
// Build 6 Deploy 1
//
// GET /api/grain-bids?fips=39153          (by county FIPS — primary)
// GET /api/grain-bids?zip=44278           (by ZIP code — fallback)
// GET /api/grain-bids?lat=41.1&lng=-81.4  (by coordinates)
//
// Optional query params:
//   commodities=Corn|Soybeans|Wheat  (pipe-delimited filter)
//   max=20                           (max locations, capped at 30)
//
// Proxies Barchart getGrainBids. Never exposes the API key to the client.
// Returns normalized elevator + bid data with Barchart attribution.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getGrainBids,
  getGrainBidsByFips,
  getGrainBidsByCoords,
  getQueryStats,
} from '@/lib/barchart/client';

export const dynamic = 'force-dynamic';

// Barchart-required attribution text
const ATTRIBUTION =
  'Market data provided by Barchart Solutions. Cash grain bids are based on delayed futures prices and are subject to change. Information is provided as-is for informational purposes only, not for trading purposes or advice.';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const fips = searchParams.get('fips');
    const zip = searchParams.get('zip');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!fips && !zip && !(lat && lng)) {
      return NextResponse.json(
        {
          error: 'Provide fips, zip, or lat+lng parameters',
          elevators: [],
          attribution: ATTRIBUTION,
        },
        { status: 400 }
      );
    }

    // Parse commodity filter (pipe-delimited to match Barchart format)
    const commoditiesParam = searchParams.get('commodities');
    const commodities = commoditiesParam
      ? commoditiesParam.split('|').map((c) => c.trim()).filter(Boolean)
      : undefined;

    // Max locations (capped at 30 to limit API usage)
    const maxStr = searchParams.get('max');
    const maxLocations = maxStr ? Math.min(parseInt(maxStr, 10) || 20, 30) : 20;

    let elevators;

    if (fips && /^\d{4,5}$/.test(fips)) {
      // Primary: FIPS code lookup (maps to county pages)
      elevators = await getGrainBidsByFips(fips, { commodities, maxLocations });
    } else if (zip && /^\d{5}$/.test(zip)) {
      // Fallback: ZIP code lookup
      elevators = await getGrainBids(zip, { commodities, maxLocations });
    } else if (lat && lng) {
      // Coordinate-based lookup
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid lat/lng values', elevators: [], attribution: ATTRIBUTION },
          { status: 400 }
        );
      }
      elevators = await getGrainBidsByCoords(latitude, longitude, {
        commodities,
        maxLocations,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid location parameters', elevators: [], attribution: ATTRIBUTION },
        { status: 400 }
      );
    }

    const stats = getQueryStats();

    // Count unique commodities across all elevators
    const commoditySet = new Set<string>();
    for (const e of elevators) {
      for (const b of e.bids) {
        commoditySet.add(b.commodity);
      }
    }

    return NextResponse.json(
      {
        query: { fips, zip, lat, lng },
        count: elevators.length,
        commodities: Array.from(commoditySet),
        elevators,
        attribution: ATTRIBUTION,
      },
      {
        headers: {
          // CDN cache: 5 min fresh, serve stale up to 30 min while revalidating
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
          'X-Query-Budget': `${stats.todayCount}/${stats.dailyLimit} (${stats.percentUsed}%)`,
        },
      }
    );
  } catch (error) {
    console.error('[grain-bids] Route error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch grain bids. Please try again later.',
        elevators: [],
        attribution: ATTRIBUTION,
      },
      {
        status: 500,
        headers: {
          // Cache errors briefly to prevent hammering
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  }
}
