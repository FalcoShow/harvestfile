// =============================================================================
// app/api/weather/route.ts
// HarvestFile — Phase 26 Build 2: Agricultural Weather API
//
// GET /api/weather?lat=40.12&lng=-84.56&crops=CORN,SOYBEANS
// Returns comprehensive ag weather: forecast, soil, GDD, planting windows, alerts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/lib/services/weather';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const cropsParam = searchParams.get('crops') || 'CORN,SOYBEANS';
    const crops = cropsParam.split(',').map(c => c.trim().toUpperCase());

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Missing or invalid lat/lng parameters' },
        { status: 400 }
      );
    }

    if (lat < 24 || lat > 50 || lng < -125 || lng > -66) {
      return NextResponse.json(
        { error: 'Coordinates must be within the continental United States' },
        { status: 400 }
      );
    }

    // Fetch all weather data in parallel
    const [forecast, plantingWindows, alerts] = await Promise.all([
      weatherService.getAgForecast(lat, lng),
      weatherService.analyzePlantingWindows({ lat, lng, crops }),
      weatherService.getNWSAlerts(lat, lng),
    ]);

    // Calculate cumulative GDD from forecast data
    let cumulativeGDD = 0;
    const gddByDay = forecast.daily.map(d => {
      cumulativeGDD += d.gdd_base50;
      return {
        date: d.date,
        daily_gdd: d.gdd_base50,
        cumulative_gdd: Math.round(cumulativeGDD),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        location: { lat, lng },
        generated_at: new Date().toISOString(),
        forecast: {
          daily: forecast.daily,
          summary: forecast.hourly_summary,
        },
        soil: forecast.soil,
        gdd: {
          total_14day: Math.round(cumulativeGDD),
          by_day: gddByDay,
        },
        planting_windows: plantingWindows,
        alerts: alerts || [],
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error: any) {
    console.error('[Weather API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
