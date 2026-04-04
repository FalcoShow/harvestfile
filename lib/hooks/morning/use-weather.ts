// =============================================================================
// HarvestFile — Surface 2 Deploy 1: Weather Query Hook
// lib/hooks/morning/use-weather.ts
//
// TanStack Query hook wrapping /api/weather.
// Polls every 30 minutes. Location-aware — re-fetches when coordinates change.
//
// Response shape from API:
// {
//   success: boolean,
//   data: {
//     location: { lat, lng },
//     generated_at: string,
//     forecast: {
//       daily: Array<{ date, temp_max_f, temp_min_f, temp_avg_f, ... }>,
//       summary: object,
//     },
//     soil: object,
//     gdd: { total_14day, by_day: Array<{ date, daily_gdd, cumulative_gdd }> },
//     planting_windows: object,
//     alerts: Array<object>,
//   }
// }
// =============================================================================

import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DailyForecast {
  date: string;
  temp_max_f: number;
  temp_min_f: number;
  temp_avg_f: number;
  precipitation_mm: number;
  precipitation_probability: number;
  wind_speed_max_mph: number;
  wind_direction_dominant: number;
  humidity_avg: number;
  gdd_base50: number;
  condition: string;
  condition_code: number;
}

export interface SoilData {
  temp_2in_f: number;
  temp_6in_f: number;
  moisture_pct: number;
}

export interface GDDData {
  total_14day: number;
  by_day: Array<{
    date: string;
    daily_gdd: number;
    cumulative_gdd: number;
  }>;
}

export interface WeatherAlert {
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  areas: string;
  effective: string;
  expires: string;
}

export interface WeatherData {
  location: { lat: number; lng: number };
  generated_at: string;
  forecast: {
    daily: DailyForecast[];
    summary: Record<string, unknown>;
  };
  soil: SoilData;
  gdd: GDDData;
  planting_windows: Record<string, unknown>;
  alerts: WeatherAlert[];
}

export interface WeatherResponse {
  success: boolean;
  data: WeatherData;
}

// ─── Fetch Function ──────────────────────────────────────────────────────────

async function fetchWeather(
  lat: number,
  lng: number,
  crops: string[]
): Promise<WeatherData> {
  const cropsParam = crops.join(',');
  const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}&crops=${cropsParam}`);
  if (!res.ok) {
    throw new Error(`Weather fetch failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Weather data unavailable');
  }
  return json.data;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseWeatherOptions {
  lat: number;
  lng: number;
  crops?: string[];
  enabled?: boolean;
}

export function useWeather(options: UseWeatherOptions) {
  const {
    lat,
    lng,
    crops = ['CORN', 'SOYBEANS', 'WHEAT'],
    enabled = true,
  } = options;

  // Round coords to 3 decimal places for cache key stability
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  return useQuery({
    queryKey: ['weather', roundedLat, roundedLng, crops.sort().join(',')],
    queryFn: () => fetchWeather(roundedLat, roundedLng, crops),
    enabled: enabled && roundedLat !== 0 && roundedLng !== 0,
    staleTime: 10 * 60 * 1000,    // 10 minutes (weather doesn't change that fast)
    gcTime: 30 * 60 * 1000,       // 30 minutes
    // Poll every 30 minutes
    refetchInterval: 30 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
