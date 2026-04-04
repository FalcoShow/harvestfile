// =============================================================================
// HarvestFile — Surface 2 Deploy 2B: Weather Query Hook
// lib/hooks/morning/use-weather.ts
//
// TanStack Query hook wrapping /api/weather.
// Polls every 15 minutes (aligned with Open-Meteo current block refresh).
// Location-aware — re-fetches when coordinates change.
//
// Deploy 2B changes:
//   - CurrentConditions type for real-time weather
//   - HourlyPoint type for mini chart rendering
//   - All values in F/mph/inches (no conversion on client)
//   - Delta T and spray safety flags from server
//   - 15-minute polling (was 30 — matches current block interval)
// =============================================================================

import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CurrentConditions {
  time: string;
  temp_f: number;
  feels_like_f: number;
  humidity: number;
  dew_point_f: number;
  wind_speed_mph: number;
  wind_direction_deg: number;
  wind_direction_cardinal: string;
  wind_gusts_mph: number;
  weather_code: number;
  conditions: string;
  cloud_cover: number;
  precipitation_in: number;
  precipitation_probability: number;
  delta_t_f: number;
  delta_t_status: 'ideal' | 'marginal_dry' | 'marginal_wet' | 'too_dry' | 'inversion_risk';
}

export interface HourlyPoint {
  time: string;
  temp_f: number;
  feels_like_f: number;
  humidity: number;
  dew_point_f: number;
  wind_speed_mph: number;
  wind_direction_deg: number;
  wind_gusts_mph: number;
  weather_code: number;
  cloud_cover: number;
  precipitation_in: number;
  precipitation_probability: number;
  delta_t_f: number;
  spray_safe: boolean;
}

export interface DailyForecast {
  date: string;
  temp_max_f: number;
  temp_min_f: number;
  temp_avg_f: number;
  precipitation_in: number;
  precipitation_mm: number;             // Backward compat (computed from inches × 25.4)
  precipitation_probability: number;
  wind_speed_max_mph: number;
  wind_gusts_mph: number;
  wind_direction_dominant: number;
  humidity_mean: number;
  humidity_avg?: number;              // Alias used by some components
  gdd_base50: number;
  frost_risk: boolean;
  conditions: string;
  condition?: string;                 // Alias
  weather_code: number;
  condition_code?: number;            // Alias
  sunshine_hours: number;
  uv_index_max: number;
  et0_in: number;
  sunrise: string;
  sunset: string;
}

export interface SoilData {
  date?: string;
  temp_2in_f: number;
  temp_6in_f: number;
  moisture_pct?: number;
  // Also accept the full names from the API
  soil_temp_2in_f?: number;
  soil_temp_6in_f?: number;
  soil_moisture_0_4in?: number;
  soil_moisture_4_16in?: number;
}

export interface GDDData {
  total_7day: number;
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
  urgency?: string;
  areas?: string;
  effective?: string;
  expires: string;
  sender?: string;
}

export interface SprayWindowData {
  next_window: {
    start: string;
    end: string;
    duration_hours: number;
  } | null;
}

export interface WeatherData {
  location: { lat: number; lng: number; elevation?: number };
  generated_at: string;
  current: CurrentConditions;
  forecast: {
    daily: DailyForecast[];
    summary: Record<string, unknown>;
  };
  hourly: HourlyPoint[];
  soil: SoilData | SoilData[];
  gdd: GDDData;
  planting_windows: Record<string, unknown> | unknown[];
  alerts: WeatherAlert[];
  spray: SprayWindowData;
}

export interface WeatherResponse {
  success: boolean;
  data: WeatherData;
}

// ─── Normalizer ──────────────────────────────────────────────────────────────

/**
 * Normalize soil data: API returns SoilData[] (array of daily soil readings).
 * Components may expect either the array or a single reading.
 * This helper extracts today's reading from the array.
 */
function normalizeSoilData(soil: any): SoilData {
  if (Array.isArray(soil) && soil.length > 0) {
    const today = soil[0];
    return {
      date: today.date,
      temp_2in_f: today.soil_temp_2in_f ?? today.temp_2in_f ?? 0,
      temp_6in_f: today.soil_temp_6in_f ?? today.temp_6in_f ?? 0,
      moisture_pct: today.soil_moisture_0_4in ?? today.moisture_pct ?? 0,
      soil_temp_2in_f: today.soil_temp_2in_f ?? today.temp_2in_f ?? 0,
      soil_temp_6in_f: today.soil_temp_6in_f ?? today.temp_6in_f ?? 0,
      soil_moisture_0_4in: today.soil_moisture_0_4in ?? 0,
      soil_moisture_4_16in: today.soil_moisture_4_16in ?? 0,
    };
  }
  if (soil && typeof soil === 'object' && !Array.isArray(soil)) {
    return soil;
  }
  return {
    temp_2in_f: 0,
    temp_6in_f: 0,
    moisture_pct: 0,
  };
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

  const data = json.data;

  // Ensure daily forecasts have alias fields for backward compatibility
  if (data.forecast?.daily) {
    data.forecast.daily = data.forecast.daily.map((d: any) => ({
      ...d,
      humidity_avg: d.humidity_avg ?? d.humidity_mean,
      condition: d.condition ?? d.conditions,
      condition_code: d.condition_code ?? d.weather_code,
      // Precipitation: support both old mm and new inch naming
      precipitation_mm: d.precipitation_mm ?? (d.precipitation_in != null ? d.precipitation_in * 25.4 : 0),
    }));
  }

  return data;
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
    staleTime: 5 * 60 * 1000,     // 5 minutes (current conditions update every 15)
    gcTime: 30 * 60 * 1000,       // 30 minutes
    // Poll every 15 minutes — matches Open-Meteo current block interval
    refetchInterval: 15 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
