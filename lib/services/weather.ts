// =============================================================================
// lib/services/weather.ts
// Agricultural Weather Service for HarvestFile
// Uses Open-Meteo (free) + NWS API (free) for comprehensive ag weather
// =============================================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1';
const NWS_BASE = 'https://api.weather.gov';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AgWeatherForecast {
  location: { lat: number; lng: number; elevation?: number };
  daily: DailyWeather[];
  hourly_summary: {
    frost_risk_hours: number;
    heat_stress_hours: number;
    total_precipitation_mm: number;
    growing_degree_days: number;
  };
  soil: SoilData[];
  alerts: WeatherAlert[];
}

export interface DailyWeather {
  date: string;
  temp_max_f: number;
  temp_min_f: number;
  temp_avg_f: number;
  precipitation_mm: number;
  precipitation_probability: number;
  wind_speed_max_mph: number;
  wind_gusts_mph: number;
  humidity_mean: number;
  sunshine_hours: number;
  uv_index_max: number;
  et0_mm: number;
  gdd_base50: number;
  frost_risk: boolean;
  conditions: string;
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

export interface HistoricalWeatherSummary {
  location: { lat: number; lng: number };
  period: { start: string; end: string };
  annual_summaries: AnnualSummary[];
  climate_normals: {
    avg_annual_precip_mm: number;
    avg_growing_season_days: number;
    avg_first_frost: string;
    avg_last_frost: string;
    avg_gdd_accumulation: number;
  };
}

export interface AnnualSummary {
  year: number;
  total_precip_mm: number;
  avg_temp_f: number;
  max_temp_f: number;
  min_temp_f: number;
  frost_free_days: number;
  total_gdd_base50: number;
  drought_days: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function calcGDD(maxF: number, minF: number, base: number = 50): number {
  const avg = (Math.min(maxF, 86) + Math.max(minF, base)) / 2;
  return Math.max(0, avg - base);
}

function getWeatherCondition(precip: number, cloudCover: number, windSpeed: number): string {
  if (precip > 10) return 'Rainy';
  if (precip > 2) return 'Showers';
  if (windSpeed > 30) return 'Windy';
  if (cloudCover > 75) return 'Overcast';
  if (cloudCover > 40) return 'Partly Cloudy';
  return 'Clear';
}


// ═════════════════════════════════════════════════════════════════════════════
// 16-DAY AGRICULTURAL FORECAST
// ═════════════════════════════════════════════════════════════════════════════

export async function getAgForecast(lat: number, lng: number): Promise<AgWeatherForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'precipitation_probability_max',
      'wind_speed_10m_max', 'wind_gusts_10m_max',
      'relative_humidity_2m_mean',
      'sunshine_duration',
      'uv_index_max',
      'et0_fao_evapotranspiration',
    ].join(','),
    hourly: [
      'temperature_2m',
      'soil_temperature_6cm', 'soil_temperature_18cm',
      'soil_moisture_0_to_1cm', 'soil_moisture_1_to_3cm',
      'soil_moisture_3_to_9cm', 'soil_moisture_9_to_27cm',
    ].join(','),
    temperature_unit: 'celsius',
    wind_speed_unit: 'mph',
    precipitation_unit: 'mm',
    timezone: 'America/New_York',
    forecast_days: '16',
  });

  const forecastRes = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, {
    next: { revalidate: 1800 }
  });

  if (!forecastRes.ok) {
    throw new Error(`Open-Meteo forecast failed: ${forecastRes.status}`);
  }

  const data = await forecastRes.json();
  const daily = data.daily;
  const hourly = data.hourly;

  const dailyWeather: DailyWeather[] = [];
  let totalPrecip = 0;
  let totalGDD = 0;
  let frostHours = 0;
  let heatHours = 0;

  for (let i = 0; i < daily.time.length; i++) {
    const maxC = daily.temperature_2m_max[i];
    const minC = daily.temperature_2m_min[i];
    const maxF = celsiusToFahrenheit(maxC);
    const minF = celsiusToFahrenheit(minC);
    const avgF = (maxF + minF) / 2;
    const gdd = calcGDD(maxF, minF);
    const precip = daily.precipitation_sum[i] || 0;

    totalPrecip += precip;
    totalGDD += gdd;

    dailyWeather.push({
      date: daily.time[i],
      temp_max_f: Math.round(maxF * 10) / 10,
      temp_min_f: Math.round(minF * 10) / 10,
      temp_avg_f: Math.round(avgF * 10) / 10,
      precipitation_mm: Math.round(precip * 10) / 10,
      precipitation_probability: daily.precipitation_probability_max[i] || 0,
      wind_speed_max_mph: daily.wind_speed_10m_max[i] || 0,
      wind_gusts_mph: daily.wind_gusts_10m_max[i] || 0,
      humidity_mean: daily.relative_humidity_2m_mean[i] || 0,
      sunshine_hours: Math.round((daily.sunshine_duration[i] || 0) / 3600 * 10) / 10,
      uv_index_max: daily.uv_index_max[i] || 0,
      et0_mm: Math.round((daily.et0_fao_evapotranspiration[i] || 0) * 10) / 10,
      gdd_base50: Math.round(gdd * 10) / 10,
      frost_risk: minF <= 32,
      conditions: getWeatherCondition(
        precip,
        50,
        daily.wind_speed_10m_max[i] || 0
      ),
    });
  }

  // Count frost/heat hours from hourly data
  if (hourly?.temperature_2m) {
    const temps = hourly.temperature_2m as number[];
    for (let i = 0; i < temps.length; i++) {
      const tempC = temps[i];
      if (tempC !== null) {
        const tempF = celsiusToFahrenheit(tempC);
        if (tempF <= 32) frostHours++;
        if (tempF >= 95) heatHours++;
      }
    }
  }

  // Process soil data (aggregate hourly to daily)
  const soilData: SoilData[] = [];
  const hoursPerDay = 24;

  for (let d = 0; d < Math.min(daily.time.length, 16); d++) {
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
        soil_temp_2in_f: Math.round(celsiusToFahrenheit(soilTemp6cm / count) * 10) / 10,
        soil_temp_6in_f: Math.round(celsiusToFahrenheit(soilTemp18cm / count) * 10) / 10,
        soil_moisture_0_4in: Math.round((soilMoist01 / count) * 1000) / 1000,
        soil_moisture_4_16in: Math.round((soilMoist39 / count) * 1000) / 1000,
      });
    }
  }

  const alerts = await getNWSAlerts(lat, lng);

  return {
    location: { lat, lng, elevation: data.elevation },
    daily: dailyWeather,
    hourly_summary: {
      frost_risk_hours: frostHours,
      heat_stress_hours: heatHours,
      total_precipitation_mm: Math.round(totalPrecip * 10) / 10,
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
        next: { revalidate: 900 }
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
    next: { revalidate: 86400 }
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo historical failed: ${res.status}`);
  }

  const data = await res.json();
  const daily = data.daily;

  // Aggregate by year — using object instead of Map to avoid iteration issues
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

export async function analyzePlantingWindows(opts: {
  lat: number;
  lng: number;
  crops: string[];
}): Promise<PlantingWindow[]> {
  const forecast = await getAgForecast(opts.lat, opts.lng);

  const cropThresholds: Record<string, { soilTemp: number; optimalStart: string; optimalEnd: string }> = {
    'CORN': { soilTemp: 50, optimalStart: 'Apr 15', optimalEnd: 'May 20' },
    'SOYBEANS': { soilTemp: 50, optimalStart: 'May 1', optimalEnd: 'Jun 10' },
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
      recommendation = `Conditions are favorable for ${crop.toLowerCase()} planting. Soil temperature is ${currentSoilTemp.toFixed(1)}°F (needs ${threshold.soilTemp}°F). No frost risk in the 14-day forecast.`;
    } else if (soilReady && frostRisk === 'moderate') {
      recommendation = `Soil is warm enough at ${currentSoilTemp.toFixed(1)}°F but ${frostDays} frost risk days in the forecast. Consider waiting 5-7 days for safer conditions.`;
    } else if (!soilReady) {
      recommendation = `Soil temperature is ${currentSoilTemp.toFixed(1)}°F — needs to reach ${threshold.soilTemp}°F. Estimated ${daysUntilSafe} days until soil is ready based on forecast trends.`;
    } else {
      recommendation = `High frost risk with ${frostDays} days below freezing expected. Delay planting until conditions stabilize.`;
    }

    windows.push({
      crop: crop,
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
