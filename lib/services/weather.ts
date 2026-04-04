// =============================================================================
// lib/services/weather.ts
// HarvestFile — Surface 2 Deploy 2B: Agricultural Weather Service
//
// DEPLOY 2B REWRITE — adds current conditions, Delta T, dew point, wind
// direction, hourly arrays for mini charts, and native F/mph/inch units.
//
// Uses Open-Meteo (free, no API key) + NWS (free) for comprehensive ag weather.
//
// Key changes from Deploy 2:
//   - &current= parameter for real-time 15-minute conditions
//   - temperature_unit=fahrenheit, wind_speed_unit=mph, precipitation_unit=inch
//   - Hourly dew_point_2m, wind_direction_10m, apparent_temperature, weather_code
//   - calculateDeltaT() for spray decision support
//   - Hourly arrays returned for mini chart rendering
//   - No more celsius→fahrenheit conversion bugs
// =============================================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1';
const NWS_BASE = 'https://api.weather.gov';

// ── Types ───────────────────────────────────────────────────────────────────

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

export interface DailyWeather {
  date: string;
  temp_max_f: number;
  temp_min_f: number;
  temp_avg_f: number;
  precipitation_in: number;
  precipitation_mm: number;            // Backward compat (= precipitation_in × 25.4)
  precipitation_probability: number;
  wind_speed_max_mph: number;
  wind_gusts_mph: number;
  wind_direction_dominant: number;
  humidity_mean: number;
  sunshine_hours: number;
  uv_index_max: number;
  et0_in: number;
  et0_mm: number;                      // Backward compat (= et0_in × 25.4)
  gdd_base50: number;
  frost_risk: boolean;
  conditions: string;
  weather_code: number;
  sunrise: string;
  sunset: string;
}

export interface SoilData {
  date: string;
  soil_temp_2in_f: number;
  soil_temp_6in_f: number;
  soil_moisture_0_4in: number;
  soil_moisture_4_16in: number;
}

export interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
  description: string;
  onset: string;
  expires: string;
  sender: string;
}

export interface AgWeatherForecast {
  location: { lat: number; lng: number; elevation?: number };
  current: CurrentConditions;
  daily: DailyWeather[];
  hourly: HourlyPoint[];
  hourly_summary: {
    frost_risk_hours: number;
    heat_stress_hours: number;
    total_precipitation_in: number;
    total_precipitation_mm: number;    // Backward compat (= total_precipitation_in × 25.4)
    growing_degree_days: number;
  };
  soil: SoilData[];
  alerts: WeatherAlert[];
}

export interface HistoricalWeatherSummary {
  location: { lat: number; lng: number };
  period: { start: string; end: string };
  annual_summaries: AnnualSummary[];
  climate_normals: {
    avg_annual_precip_in: number;
    avg_annual_precip_mm: number;      // Backward compat
    avg_growing_season_days: number;
    avg_first_frost: string;
    avg_last_frost: string;
    avg_gdd_accumulation: number;
  };
}

export interface AnnualSummary {
  year: number;
  total_precip_in: number;
  total_precip_mm: number;             // Backward compat
  avg_temp_f: number;
  max_temp_f: number;
  min_temp_f: number;
  frost_free_days: number;
  total_gdd_base50: number;
  drought_days: number;
}

// ── Planting Windows ────────────────────────────────────────────────────────

export interface PlantingWindow {
  crop: string;
  optimal_start: string;
  optimal_end: string;
  soil_temp_ready: boolean;
  soil_temp_current_f: number;
  soil_temp_needed_f: number;
  frost_risk_level: 'low' | 'moderate' | 'high';
  days_until_safe: number;
  confidence: number;
  recommendation: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const CARDINAL_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

function degreesToCardinal(degrees: number): string {
  const index = Math.round(((degrees % 360 + 360) % 360) / 22.5) % 16;
  return CARDINAL_DIRECTIONS[index];
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function mmToInches(mm: number): number {
  return mm / 25.4;
}

/**
 * GDD using the 86/50 corn system:
 * GDD = [(Min(MaxTemp, 86) + Max(MinTemp, 50)) / 2] – 50
 */
function calcGDD(maxF: number, minF: number, base: number = 50): number {
  const avg = (Math.min(maxF, 86) + Math.max(minF, base)) / 2;
  return Math.max(0, avg - base);
}

/**
 * Calculate Delta T (dry bulb – wet bulb) in Fahrenheit.
 * Uses the Stull (2011) wet bulb approximation from temperature (°C) and RH.
 * Returns value in °F for consistency with our unit system.
 *
 * Safe spray range: 3.6–14.4°F (2–8°C)
 * Below 3.6°F: inversion risk, do NOT spray
 * Above 18°F: too dry, droplets evaporate
 */
function calculateDeltaT(tempF: number, rh: number): number {
  // Convert to Celsius for the Stull formula
  const tempC = (tempF - 32) * 5 / 9;
  const wetBulbC =
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  const deltaTC = tempC - wetBulbC;
  // Convert delta back to Fahrenheit scale
  return deltaTC * 9 / 5;
}

function getDeltaTStatus(
  deltaT_F: number,
  windMph: number
): 'ideal' | 'marginal_dry' | 'marginal_wet' | 'too_dry' | 'inversion_risk' {
  // Calm winds + low Delta T = inversion
  if (windMph < 3 && deltaT_F < 3.6) return 'inversion_risk';
  if (deltaT_F < 3.6) return 'marginal_wet';    // < 2°C
  if (deltaT_F <= 14.4) return 'ideal';           // 2–8°C
  if (deltaT_F <= 18) return 'marginal_dry';       // 8–10°C
  return 'too_dry';                                 // > 10°C
}

/**
 * Determine if an hour is safe for spraying.
 * Combines wind, Delta T, precipitation, and temperature.
 */
function isSpraySafe(point: {
  wind_speed_mph: number;
  delta_t_f: number;
  precipitation_in: number;
  temp_f: number;
}): boolean {
  if (point.wind_speed_mph < 3) return false;     // Inversion risk
  if (point.wind_speed_mph > 10) return false;     // Too windy
  if (point.delta_t_f < 3.6) return false;         // Inversion/too humid
  if (point.delta_t_f > 18) return false;           // Too dry
  if (point.precipitation_in > 0) return false;     // Raining
  if (point.temp_f < 40 || point.temp_f > 85) return false; // Temp limits
  return true;
}

function getWeatherCondition(weatherCode: number): string {
  if (weatherCode === 0) return 'Clear';
  if (weatherCode <= 3) return 'Partly Cloudy';
  if (weatherCode <= 48) return 'Foggy';
  if (weatherCode <= 55) return 'Drizzle';
  if (weatherCode <= 57) return 'Freezing Drizzle';
  if (weatherCode <= 65) return 'Rain';
  if (weatherCode <= 67) return 'Freezing Rain';
  if (weatherCode <= 75) return 'Snow';
  if (weatherCode <= 77) return 'Snow Grains';
  if (weatherCode <= 82) return 'Rain Showers';
  if (weatherCode <= 86) return 'Snow Showers';
  if (weatherCode <= 95) return 'Thunderstorm';
  if (weatherCode <= 99) return 'Thunderstorm w/ Hail';
  return 'Unknown';
}


// ═════════════════════════════════════════════════════════════════════════════
// 7-DAY AGRICULTURAL FORECAST WITH CURRENT CONDITIONS
// ═════════════════════════════════════════════════════════════════════════════

export async function getAgForecast(lat: number, lng: number): Promise<AgWeatherForecast> {
  // ── Build the API URL with current + hourly + daily ──
  const currentVars = [
    'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
    'dew_point_2m', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
    'weather_code', 'cloud_cover', 'precipitation',
  ].join(',');

  const hourlyVars = [
    'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
    'dew_point_2m', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
    'weather_code', 'cloud_cover', 'precipitation', 'precipitation_probability',
    'soil_temperature_6cm', 'soil_temperature_18cm',
    'soil_moisture_0_to_1cm', 'soil_moisture_3_to_9cm',
  ].join(',');

  const dailyVars = [
    'weather_code', 'temperature_2m_max', 'temperature_2m_min',
    'precipitation_sum', 'precipitation_probability_max',
    'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant',
    'relative_humidity_2m_mean',
    'sunrise', 'sunset', 'sunshine_duration',
    'et0_fao_evapotranspiration', 'uv_index_max',
  ].join(',');

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: currentVars,
    hourly: hourlyVars,
    daily: dailyVars,
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: '7',
  });

  const forecastRes = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, {
    next: { revalidate: 900 },   // 15-minute cache — matches current block interval
  });

  if (!forecastRes.ok) {
    throw new Error(`Open-Meteo forecast failed: ${forecastRes.status}`);
  }

  const data = await forecastRes.json();

  // ── Parse CURRENT conditions ──
  const cur = data.current;
  const curDeltaT = calculateDeltaT(cur.temperature_2m, cur.relative_humidity_2m);
  const curDeltaTStatus = getDeltaTStatus(curDeltaT, cur.wind_speed_10m);

  const current: CurrentConditions = {
    time: cur.time,
    temp_f: Math.round(cur.temperature_2m * 10) / 10,
    feels_like_f: Math.round(cur.apparent_temperature * 10) / 10,
    humidity: Math.round(cur.relative_humidity_2m),
    dew_point_f: Math.round(cur.dew_point_2m * 10) / 10,
    wind_speed_mph: Math.round(cur.wind_speed_10m * 10) / 10,
    wind_direction_deg: Math.round(cur.wind_direction_10m),
    wind_direction_cardinal: degreesToCardinal(cur.wind_direction_10m),
    wind_gusts_mph: Math.round(cur.wind_gusts_10m * 10) / 10,
    weather_code: cur.weather_code,
    conditions: getWeatherCondition(cur.weather_code),
    cloud_cover: Math.round(cur.cloud_cover),
    precipitation_in: Math.round((cur.precipitation ?? 0) * 1000) / 1000,
    precipitation_probability: 0,  // Not available in current block
    delta_t_f: Math.round(curDeltaT * 10) / 10,
    delta_t_status: curDeltaTStatus,
  };

  // ── Parse HOURLY data ──
  const hourly = data.hourly;
  const hourlyPoints: HourlyPoint[] = [];
  let frostHours = 0;
  let heatHours = 0;
  let totalHourlyPrecip = 0;

  const hourCount = hourly.time.length;
  for (let i = 0; i < hourCount; i++) {
    const temp = hourly.temperature_2m[i];
    const rh = hourly.relative_humidity_2m[i] ?? 50;
    const wind = hourly.wind_speed_10m[i] ?? 0;
    const precip = hourly.precipitation[i] ?? 0;
    const dT = calculateDeltaT(temp, rh);

    if (temp <= 32) frostHours++;
    if (temp >= 95) heatHours++;
    totalHourlyPrecip += precip;

    hourlyPoints.push({
      time: hourly.time[i],
      temp_f: Math.round(temp * 10) / 10,
      feels_like_f: Math.round((hourly.apparent_temperature[i] ?? temp) * 10) / 10,
      humidity: Math.round(rh),
      dew_point_f: Math.round((hourly.dew_point_2m[i] ?? 40) * 10) / 10,
      wind_speed_mph: Math.round(wind * 10) / 10,
      wind_direction_deg: Math.round(hourly.wind_direction_10m[i] ?? 0),
      wind_gusts_mph: Math.round((hourly.wind_gusts_10m[i] ?? 0) * 10) / 10,
      weather_code: hourly.weather_code[i] ?? 0,
      cloud_cover: Math.round(hourly.cloud_cover[i] ?? 0),
      precipitation_in: Math.round(precip * 1000) / 1000,
      precipitation_probability: hourly.precipitation_probability[i] ?? 0,
      delta_t_f: Math.round(dT * 10) / 10,
      spray_safe: isSpraySafe({ wind_speed_mph: wind, delta_t_f: dT, precipitation_in: precip, temp_f: temp }),
    });
  }

  // ── Parse DAILY data ──
  const daily = data.daily;
  const dailyWeather: DailyWeather[] = [];
  let totalGDD = 0;

  for (let i = 0; i < daily.time.length; i++) {
    const maxF = daily.temperature_2m_max[i];
    const minF = daily.temperature_2m_min[i];
    const avgF = (maxF + minF) / 2;
    const gdd = calcGDD(maxF, minF);
    const precipIn = daily.precipitation_sum[i] || 0;
    const wCode = daily.weather_code[i] ?? 0;

    totalGDD += gdd;

    dailyWeather.push({
      date: daily.time[i],
      temp_max_f: Math.round(maxF * 10) / 10,
      temp_min_f: Math.round(minF * 10) / 10,
      temp_avg_f: Math.round(avgF * 10) / 10,
      precipitation_in: Math.round(precipIn * 1000) / 1000,
      precipitation_mm: Math.round(precipIn * 25.4 * 10) / 10,
      precipitation_probability: daily.precipitation_probability_max[i] || 0,
      wind_speed_max_mph: Math.round((daily.wind_speed_10m_max[i] || 0) * 10) / 10,
      wind_gusts_mph: Math.round((daily.wind_gusts_10m_max[i] || 0) * 10) / 10,
      wind_direction_dominant: Math.round(daily.wind_direction_10m_dominant[i] ?? 0),
      humidity_mean: Math.round(daily.relative_humidity_2m_mean[i] || 0),
      sunshine_hours: Math.round((daily.sunshine_duration[i] || 0) / 3600 * 10) / 10,
      uv_index_max: daily.uv_index_max[i] || 0,
      et0_in: Math.round((daily.et0_fao_evapotranspiration[i] || 0) * 1000) / 1000,
      et0_mm: Math.round((daily.et0_fao_evapotranspiration[i] || 0) * 25.4 * 10) / 10,
      gdd_base50: Math.round(gdd * 10) / 10,
      frost_risk: minF <= 32,
      conditions: getWeatherCondition(wCode),
      weather_code: wCode,
      sunrise: daily.sunrise[i] || '',
      sunset: daily.sunset[i] || '',
    });
  }

  // ── Parse SOIL data (aggregate hourly → daily) ──
  const soilData: SoilData[] = [];
  const hoursPerDay = 24;

  for (let d = 0; d < Math.min(daily.time.length, 7); d++) {
    const startIdx = d * hoursPerDay;
    const endIdx = startIdx + hoursPerDay;

    let soilTemp6cm = 0, soilTemp18cm = 0;
    let soilMoist01 = 0, soilMoist39 = 0;
    let count = 0;

    for (let h = startIdx; h < endIdx && h < (hourly?.soil_temperature_6cm?.length || 0); h++) {
      soilTemp6cm += hourly.soil_temperature_6cm[h] || 0;
      soilTemp18cm += hourly.soil_temperature_18cm[h] || 0;
      soilMoist01 += hourly.soil_moisture_0_to_1cm[h] || 0;
      soilMoist39 += hourly.soil_moisture_3_to_9cm[h] || 0;
      count++;
    }

    if (count > 0) {
      soilData.push({
        date: daily.time[d],
        // Open-Meteo returns soil temps in the requested unit (fahrenheit)
        soil_temp_2in_f: Math.round((soilTemp6cm / count) * 10) / 10,
        soil_temp_6in_f: Math.round((soilTemp18cm / count) * 10) / 10,
        soil_moisture_0_4in: Math.round((soilMoist01 / count) * 1000) / 1000,
        soil_moisture_4_16in: Math.round((soilMoist39 / count) * 1000) / 1000,
      });
    }
  }

  // ── Fetch NWS alerts ──
  const alerts = await getNWSAlerts(lat, lng);

  return {
    location: { lat, lng, elevation: data.elevation },
    current,
    daily: dailyWeather,
    hourly: hourlyPoints,
    hourly_summary: {
      frost_risk_hours: frostHours,
      heat_stress_hours: heatHours,
      total_precipitation_in: Math.round(totalHourlyPrecip * 1000) / 1000,
      total_precipitation_mm: Math.round(totalHourlyPrecip * 25.4 * 10) / 10,
      growing_degree_days: Math.round(totalGDD * 10) / 10,
    },
    soil: soilData,
    alerts,
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// NWS WEATHER ALERTS
// ═════════════════════════════════════════════════════════════════════════════

async function getNWSAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(
      `${NWS_BASE}/alerts/active?point=${lat},${lng}`,
      {
        headers: { 'User-Agent': '(HarvestFile, contact@harvestfile.com)' },
        next: { revalidate: 900 },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline,
      description: f.properties.description?.substring(0, 500),
      onset: f.properties.onset,
      expires: f.properties.expires,
      sender: f.properties.senderName,
    }));
  } catch {
    return [];
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// HISTORICAL WEATHER (for risk analysis)
// ═════════════════════════════════════════════════════════════════════════════

export async function getHistoricalWeather(opts: {
  lat: number;
  lng: number;
  startYear?: number;
  endYear?: number;
}): Promise<HistoricalWeatherSummary> {
  const endYear = opts.endYear || new Date().getFullYear() - 1;
  const startYear = opts.startYear || endYear - 9;

  const params = new URLSearchParams({
    latitude: opts.lat.toString(),
    longitude: opts.lng.toString(),
    start_date: `${startYear}-01-01`,
    end_date: `${endYear}-12-31`,
    daily: [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum',
      'soil_moisture_0_to_7cm_mean',
    ].join(','),
    temperature_unit: 'celsius',
    timezone: 'America/New_York',
  });

  const res = await fetch(`${OPEN_METEO_ARCHIVE}/era5?${params}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo historical failed: ${res.status}`);
  }

  const data = await res.json();
  const daily = data.daily;

  // Aggregate by year
  const yearObj: Record<number, {
    temps: number[];
    maxTemps: number[];
    minTemps: number[];
    precip: number;
    frostFreeDays: number;
    gdd: number;
    droughtDays: number;
    lastSpringFrost: string;
    firstFallFrost: string;
  }> = {};

  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    const year = parseInt(date.substring(0, 4));
    const month = parseInt(date.substring(5, 7));
    const maxC = daily.temperature_2m_max[i];
    const minC = daily.temperature_2m_min[i];

    if (maxC === null || minC === null) continue;

    const maxF = celsiusToFahrenheit(maxC);
    const minF = celsiusToFahrenheit(minC);
    const avgF = (maxF + minF) / 2;

    if (!yearObj[year]) {
      yearObj[year] = {
        temps: [], maxTemps: [], minTemps: [],
        precip: 0, frostFreeDays: 0, gdd: 0,
        droughtDays: 0, lastSpringFrost: '', firstFallFrost: '',
      };
    }

    const entry = yearObj[year];
    entry.temps.push(avgF);
    entry.maxTemps.push(maxF);
    entry.minTemps.push(minF);
    entry.precip += daily.precipitation_sum[i] || 0;

    if (minF > 32) entry.frostFreeDays++;

    if (month >= 4 && month <= 10) {
      entry.gdd += calcGDD(maxF, minF);
    }

    const soilMoisture = daily.soil_moisture_0_to_7cm_mean?.[i];
    if (soilMoisture !== null && soilMoisture !== undefined && soilMoisture < 0.15) {
      entry.droughtDays++;
    }

    if (minF <= 32) {
      if (month <= 6) entry.lastSpringFrost = date;
      if (month >= 8 && !entry.firstFallFrost) entry.firstFallFrost = date;
    }
  }

  // Build annual summaries
  const annualSummaries: AnnualSummary[] = [];
  const allLastFrost: string[] = [];
  const allFirstFrost: string[] = [];
  let totalPrecip = 0;
  let totalGrowingDays = 0;
  let totalGDD = 0;
  let yearCount = 0;

  const years = Object.keys(yearObj).map(Number);
  for (let yi = 0; yi < years.length; yi++) {
    const year = years[yi];
    const entry = yearObj[year];
    yearCount++;

    const avgTemp = entry.temps.reduce((a, b) => a + b, 0) / entry.temps.length;

    annualSummaries.push({
      year,
      total_precip_in: Math.round(mmToInches(entry.precip) * 10) / 10,
      total_precip_mm: Math.round(entry.precip),
      avg_temp_f: Math.round(avgTemp * 10) / 10,
      max_temp_f: Math.round(Math.max(...entry.maxTemps) * 10) / 10,
      min_temp_f: Math.round(Math.min(...entry.minTemps) * 10) / 10,
      frost_free_days: entry.frostFreeDays,
      total_gdd_base50: Math.round(entry.gdd),
      drought_days: entry.droughtDays,
    });

    if (entry.lastSpringFrost) allLastFrost.push(entry.lastSpringFrost);
    if (entry.firstFallFrost) allFirstFrost.push(entry.firstFallFrost);
    totalPrecip += entry.precip;
    totalGrowingDays += entry.frostFreeDays;
    totalGDD += entry.gdd;
  }

  if (yearCount === 0) yearCount = 1;

  return {
    location: { lat: opts.lat, lng: opts.lng },
    period: { start: `${startYear}-01-01`, end: `${endYear}-12-31` },
    annual_summaries: annualSummaries.sort((a, b) => a.year - b.year),
    climate_normals: {
      avg_annual_precip_in: Math.round(mmToInches(totalPrecip / yearCount) * 10) / 10,
      avg_annual_precip_mm: Math.round(totalPrecip / yearCount),
      avg_growing_season_days: Math.round(totalGrowingDays / yearCount),
      avg_first_frost: allFirstFrost.length > 0
        ? allFirstFrost.sort()[Math.floor(allFirstFrost.length / 2)]
        : 'N/A',
      avg_last_frost: allLastFrost.length > 0
        ? allLastFrost.sort()[Math.floor(allLastFrost.length / 2)]
        : 'N/A',
      avg_gdd_accumulation: Math.round(totalGDD / yearCount),
    },
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// PLANTING WINDOW ANALYSIS
// ═════════════════════════════════════════════════════════════════════════════

export async function analyzePlantingWindows(opts: {
  lat: number;
  lng: number;
  crops: string[];
}): Promise<PlantingWindow[]> {
  const forecast = await getAgForecast(opts.lat, opts.lng);

  const cropThresholds: Record<string, { soilTemp: number; optimalStart: string; optimalEnd: string }> = {
    'CORN': { soilTemp: 50, optimalStart: 'Apr 15', optimalEnd: 'May 20' },
    'SOYBEANS': { soilTemp: 55, optimalStart: 'May 1', optimalEnd: 'Jun 10' },
    'WHEAT': { soilTemp: 40, optimalStart: 'Sep 15', optimalEnd: 'Oct 25' },
    'SPRING WHEAT': { soilTemp: 38, optimalStart: 'Mar 20', optimalEnd: 'Apr 30' },
    'OATS': { soilTemp: 40, optimalStart: 'Mar 15', optimalEnd: 'Apr 20' },
    'COTTON': { soilTemp: 65, optimalStart: 'May 1', optimalEnd: 'Jun 1' },
    'RICE': { soilTemp: 60, optimalStart: 'Apr 1', optimalEnd: 'May 15' },
    'SORGHUM': { soilTemp: 60, optimalStart: 'May 15', optimalEnd: 'Jun 15' },
    'SUNFLOWER': { soilTemp: 50, optimalStart: 'May 1', optimalEnd: 'Jun 15' },
  };

  const windows: PlantingWindow[] = [];
  const currentSoilTemp = forecast.soil.length > 0 ? forecast.soil[0].soil_temp_2in_f : 45;

  for (let ci = 0; ci < opts.crops.length; ci++) {
    const crop = opts.crops[ci];
    const key = crop.toUpperCase();
    const threshold = cropThresholds[key] || { soilTemp: 50, optimalStart: 'May 1', optimalEnd: 'Jun 1' };

    const soilReady = currentSoilTemp >= threshold.soilTemp;

    let daysUntilSafe = 0;
    if (!soilReady) {
      for (let si = 0; si < forecast.soil.length; si++) {
        daysUntilSafe++;
        if (forecast.soil[si].soil_temp_2in_f >= threshold.soilTemp) break;
      }
    }

    const frostDays = forecast.daily.filter(d => d.frost_risk).length;
    const frostRisk: 'low' | 'moderate' | 'high' =
      frostDays === 0 ? 'low' : frostDays <= 3 ? 'moderate' : 'high';

    const confidence = soilReady && frostRisk === 'low' ? 85 :
                       soilReady && frostRisk === 'moderate' ? 65 :
                       !soilReady && frostRisk === 'low' ? 50 : 30;

    let recommendation: string;
    if (soilReady && frostRisk === 'low') {
      recommendation = `Conditions are favorable for ${crop.toLowerCase()} planting. Soil temperature is ${currentSoilTemp.toFixed(1)}°F (needs ${threshold.soilTemp}°F). No frost risk in the 7-day forecast.`;
    } else if (soilReady && frostRisk === 'moderate') {
      recommendation = `Soil is warm enough at ${currentSoilTemp.toFixed(1)}°F but ${frostDays} frost risk days in the forecast. Consider waiting 5-7 days for safer conditions.`;
    } else if (!soilReady) {
      recommendation = `Soil temperature is ${currentSoilTemp.toFixed(1)}°F — needs to reach ${threshold.soilTemp}°F. Estimated ${daysUntilSafe} days until soil is ready based on forecast trends.`;
    } else {
      recommendation = `High frost risk with ${frostDays} days below freezing expected. Delay planting until conditions stabilize.`;
    }

    windows.push({
      crop,
      optimal_start: threshold.optimalStart,
      optimal_end: threshold.optimalEnd,
      soil_temp_ready: soilReady,
      soil_temp_current_f: Math.round(currentSoilTemp * 10) / 10,
      soil_temp_needed_f: threshold.soilTemp,
      frost_risk_level: frostRisk,
      days_until_safe: daysUntilSafe,
      confidence,
      recommendation,
    });
  }

  return windows;
}


// ── Export ───────────────────────────────────────────────────────────────────
export const weatherService = {
  getAgForecast,
  getHistoricalWeather,
  analyzePlantingWindows,
  getNWSAlerts,
};
