// =============================================================================
// app/api/weather/route.ts
// HarvestFile — Surface 2 Deploy 2B: Agricultural Weather API
//
// GET /api/weather?lat=40.12&lng=-84.56&crops=CORN,SOYBEANS
// Returns comprehensive ag weather: current conditions, forecast, soil, GDD,
// planting windows, hourly arrays, Delta T, spray safety, and NWS alerts.
//
// Deploy 2B changes:
//   - Returns current conditions block (real-time 15-minute data)
//   - Returns hourly array for mini chart rendering (next 24h)
//   - All values in Fahrenheit/mph/inches (no conversion needed on client)
//   - Delta T and spray_safe computed server-side
//   - Cache: 15 minutes (matches Open-Meteo current block interval)
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
    const [forecast, plantingWindows] = await Promise.all([
      weatherService.getAgForecast(lat, lng),
      weatherService.analyzePlantingWindows({ lat, lng, crops }),
    ]);

    // Calculate cumulative GDD from daily data
    let cumulativeGDD = 0;
    const gddByDay = forecast.daily.map(d => {
      cumulativeGDD += d.gdd_base50;
      return {
        date: d.date,
        daily_gdd: d.gdd_base50,
        cumulative_gdd: Math.round(cumulativeGDD),
      };
    });

    // Extract next 24 hours of hourly data for mini chart
    const now = new Date();
    const next24h = forecast.hourly.filter(h => {
      const hTime = new Date(h.time);
      return hTime >= now && hTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    });

    // Find next spray window from hourly data
    let nextSprayWindow: { start: string; end: string; duration_hours: number } | null = null;
    let windowStart: string | null = null;
    let windowHours = 0;

    for (const h of forecast.hourly) {
      const hTime = new Date(h.time);
      if (hTime < now) continue; // Skip past hours

      if (h.spray_safe) {
        if (!windowStart) windowStart = h.time;
        windowHours++;
      } else {
        if (windowStart && windowHours >= 2) {
          // Found a window of at least 2 hours
          nextSprayWindow = {
            start: windowStart,
            end: h.time,
            duration_hours: windowHours,
          };
          break;
        }
        windowStart = null;
        windowHours = 0;
      }
    }
    // Check if window extends to end of forecast
    if (windowStart && windowHours >= 2 && !nextSprayWindow) {
      const lastHour = forecast.hourly[forecast.hourly.length - 1];
      nextSprayWindow = {
        start: windowStart,
        end: lastHour?.time || windowStart,
        duration_hours: windowHours,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        location: { lat, lng, elevation: forecast.location.elevation },
        generated_at: new Date().toISOString(),
        current: forecast.current,
        forecast: {
          daily: forecast.daily,
          summary: forecast.hourly_summary,
        },
        hourly: next24h,
        soil: forecast.soil,
        gdd: {
          total_7day: Math.round(cumulativeGDD),
          by_day: gddByDay,
        },
        planting_windows: plantingWindows,
        alerts: forecast.alerts || [],
        spray: {
          next_window: nextSprayWindow,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
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
