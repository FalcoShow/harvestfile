// =============================================================================
// HarvestFile — Grain Bids API Route
// Build 10 Deploy 1: Market-hours-aware Cache-Control headers
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
//
// Cache-Control is market-hours-aware:
//   Active session (8:30 AM - 1:20 PM CT): 5 min fresh, 15 min stale
//   Pre-market / between sessions: 10 min fresh, 30 min stale
//   Post-close / overnight: 30 min fresh, 60 min stale
//   Weekend / holidays: 2 hours fresh, 4 hours stale
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

// ── Market-Hours-Aware Cache TTLs ───────────────────────────────────────

type MarketPeriod =
  | 'premarket'
  | 'active_session'
  | 'between_sessions'
  | 'post_close'
  | 'overnight'
  | 'weekend';

function getMarketPeriod(): MarketPeriod {
  // Convert to Chicago time (Central Time)
  const ct = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  );
  const day = ct.getDay(); // 0=Sun, 6=Sat
  const hour = ct.getHours();
  const minute = ct.getMinutes();
  const timeDecimal = hour + minute / 60;

  // Weekend
  if (day === 0 || day === 6) return 'weekend';

  // CBOT Grain Futures Schedule (Central Time):
  // Regular session: 8:30 AM - 1:20 PM CT
  // Electronic: 7:00 PM - 7:45 AM CT (next day)
  if (timeDecimal >= 8.5 && timeDecimal < 13.33) return 'active_session'; // 8:30 AM - 1:20 PM
  if (timeDecimal >= 5 && timeDecimal < 8.5) return 'premarket';          // 5:00 AM - 8:30 AM
  if (timeDecimal >= 13.33 && timeDecimal < 15) return 'post_close';      // 1:20 PM - 3:00 PM
  if (timeDecimal >= 15 && timeDecimal < 19) return 'between_sessions';   // 3:00 PM - 7:00 PM
  return 'overnight'; // 7:00 PM - 5:00 AM
}

// Cache-Control: s-maxage (CDN fresh), stale-while-revalidate (serve stale)
const CACHE_HEADERS: Record<MarketPeriod, { sMaxAge: number; staleRevalidate: number }> = {
  active_session:   { sMaxAge: 300,   staleRevalidate: 900 },    // 5 min / 15 min
  premarket:        { sMaxAge: 600,   staleRevalidate: 1800 },   // 10 min / 30 min
  between_sessions: { sMaxAge: 600,   staleRevalidate: 1800 },   // 10 min / 30 min
  post_close:       { sMaxAge: 1800,  staleRevalidate: 3600 },   // 30 min / 60 min
  overnight:        { sMaxAge: 1800,  staleRevalidate: 3600 },   // 30 min / 60 min
  weekend:          { sMaxAge: 7200,  staleRevalidate: 14400 },  // 2 hours / 4 hours
};

function getCacheControlHeader(): string {
  const period = getMarketPeriod();
  const { sMaxAge, staleRevalidate } = CACHE_HEADERS[period];
  return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleRevalidate}`;
}

// ── Route Handler ───────────────────────────────────────────────────────

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
    const period = getMarketPeriod();

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
        meta: {
          marketPeriod: period,
          cached: true,
        },
      },
      {
        headers: {
          'Cache-Control': getCacheControlHeader(),
          'Vercel-CDN-Cache-Control': getCacheControlHeader(),
          'X-Market-Period': period,
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
