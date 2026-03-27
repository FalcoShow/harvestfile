// =============================================================================
// HarvestFile — Geo Detection API Route
// Build 5 Deploy 1: IP Geolocation Personalization
//
// Called client-side from the homepage HeroSection on mount.
// Reads Vercel's automatic IP geolocation headers (free on all plans),
// resolves coordinates to a US county via FCC API, and returns
// personalized county data with top crop ARC/PLC recommendation.
//
// Vercel adds these headers to every request automatically:
//   x-vercel-ip-latitude, x-vercel-ip-longitude
//   x-vercel-ip-city, x-vercel-ip-country-region, x-vercel-ip-country
//
// Response is short-lived cached (5 min) since the personalization
// is tied to the user's IP which doesn't change within a session.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveCountyFromCoords } from '@/lib/geo/county-resolver';

export const runtime = 'nodejs';

// Cache response for 5 minutes — same IP = same location
export const revalidate = 300;

export async function GET(request: NextRequest) {
  // ── Read Vercel geo headers ─────────────────────────────────────────────
  const lat = request.headers.get('x-vercel-ip-latitude');
  const lon = request.headers.get('x-vercel-ip-longitude');
  const city = request.headers.get('x-vercel-ip-city');
  const region = request.headers.get('x-vercel-ip-country-region');
  const country = request.headers.get('x-vercel-ip-country');

  // ── Reject non-US requests early ────────────────────────────────────────
  if (country && country !== 'US') {
    return NextResponse.json(
      { detected: false, reason: 'non-us' },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  }

  // ── No geo data (local dev or geo headers unavailable) ──────────────────
  if (!lat || !lon) {
    return NextResponse.json(
      { detected: false, reason: 'no-geo-headers' },
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  // ── Validate coordinates ────────────────────────────────────────────────
  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < 24 ||
    latitude > 72 ||
    longitude < -180 ||
    longitude > -65
  ) {
    return NextResponse.json(
      { detected: false, reason: 'coords-out-of-range' },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  }

  try {
    // ── Resolve county ──────────────────────────────────────────────────────
    const county = await resolveCountyFromCoords(latitude, longitude);

    if (!county) {
      return NextResponse.json(
        {
          detected: false,
          reason: 'no-county-match',
          nearCity: city || null,
          nearRegion: region || null,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=1800, s-maxage=1800',
          },
        }
      );
    }

    // ── Success — return personalized county data ───────────────────────────
    return NextResponse.json(
      {
        detected: true,
        countyFips: county.countyFips,
        displayName: county.displayName,
        stateAbbr: county.stateAbbr,
        stateName: county.stateName,
        stateSlug: county.stateSlug,
        countySlug: county.countySlug,
        hasArcPlcData: county.hasArcPlcData,
        topCrop: county.topCrop,
        nearCity: city || null,
      },
      {
        headers: {
          // Cache for 5 minutes — county data changes slowly
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      }
    );
  } catch (error) {
    console.error('[GeoDetect] Error resolving county:', error);
    return NextResponse.json(
      { detected: false, reason: 'server-error' },
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
