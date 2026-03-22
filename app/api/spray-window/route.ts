// =============================================================================
// app/api/spray-window/route.ts
// HarvestFile — Phase 26 Build 1: Spray Window API
//
// GET /api/spray-window?lat=40.12&lng=-84.56
// Returns 72-hour spray window forecast with hourly GO/CAUTION/NO-GO ratings
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSprayWindowForecast } from '@/lib/services/spray-window';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Missing or invalid lat/lng parameters' },
        { status: 400 }
      );
    }

    // Validate coordinates are within US bounds (roughly)
    if (lat < 24 || lat > 50 || lng < -125 || lng > -66) {
      return NextResponse.json(
        { error: 'Coordinates must be within the continental United States' },
        { status: 400 }
      );
    }

    const result = await getSprayWindowForecast(lat, lng);

    return NextResponse.json({
      success: true,
      data: result,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[Spray Window API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch spray window data' },
      { status: 500 }
    );
  }
}
