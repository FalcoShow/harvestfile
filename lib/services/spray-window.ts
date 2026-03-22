// =============================================================================
// lib/services/spray-window.ts
// HarvestFile — Phase 26 Build 1: Spray Window Intelligence Engine
//
// The most advanced spray decision tool available to American farmers.
// Combines 7 weather parameters into a single GO/CAUTION/NO-GO rating
// for every hour of the next 72 hours.
//
// No competitor offers this as a free, real-time, location-based tool.
// =============================================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

// ── Types ───────────────────────────────────────────────────────────────────

export type SprayRating = 'GO' | 'CAUTION' | 'NO_GO';

export interface SprayHour {
  time: string;                    // ISO 8601
  hour: number;                    // 0-23
  rating: SprayRating;
  score: number;                   // 0-100 (100 = perfect conditions)
  reasons: string[];               // Human-readable reasons for rating
  factors: {
    wind_speed_mph: number;
    wind_gusts_mph: number;
    wind_direction_deg: number;
    wind_direction_label: string;
    temperature_f: number;
    relative_humidity: number;
    dew_point_f: number;
    delta_t_c: number;             // Dry bulb - Wet bulb (Celsius)
    precipitation_probability: number;
    precipitation_mm: number;
    cloud_cover: number;
    inversion_risk: boolean;
    rain_free_hours_ahead: number;
    is_daylight: boolean;
  };
}

export interface SprayWindowResult {
  location: { lat: number; lng: number };
  generated_at: string;
  current_rating: SprayRating;
  current_score: number;
  current_reasons: string[];
  next_go_window: string | null;     // ISO time of next GO window
  best_window_today: { start: string; end: string } | null;
  best_window_tomorrow: { start: string; end: string } | null;
  hours: SprayHour[];
  daily_summary: DailySummary[];
  alerts: WeatherAlert[];
}

export interface DailySummary {
  date: string;
  label: string;                     // "Today", "Tomorrow", "Wednesday"
  go_hours: number;
  caution_hours: number;
  no_go_hours: number;
  best_window: { start: string; end: string } | null;
  high_f: number;
  low_f: number;
  wind_max_mph: number;
  rain_chance: number;
}

export interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
  onset: string;
  expires: string;
}

// ── Spray threshold constants ───────────────────────────────────────────────
// Based on EPA, university extension, and pesticide stewardship guidelines

const THRESHOLDS = {
  wind: {
    ideal_min: 3,      // mph — below this = inversion risk
    ideal_max: 10,     // mph — above this = drift risk
    caution_max: 15,   // mph — above this = absolute no-go
    gust_max: 20,      // mph — gust threshold
  },
  temperature: {
    ideal_min: 50,     // °F
    ideal_max: 85,     // °F
    caution_min: 40,   // °F — below = poor performance
    caution_max: 90,   // °F — above = volatile compounds
    no_go_max: 95,     // °F — extreme heat
  },
  humidity: {
    ideal_min: 40,     // %
    ideal_max: 80,     // %
    caution_min: 30,   // % — rapid evaporation
    caution_max: 90,   // % — poor drying
  },
  delta_t: {
    ideal_min: 2,      // °C — below = inversion conditions
    ideal_max: 8,      // °C — above = rapid evaporation
    caution_max: 10,   // °C — extreme evaporation
  },
  rain: {
    min_free_hours: 6, // hours rain-free needed after application
    probability_caution: 30, // % — caution threshold
    probability_no_go: 60,   // % — no-go threshold
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function mpsToMph(mps: number): number {
  return mps * 2.237;
}

function kmhToMph(kmh: number): number {
  return kmh * 0.6214;
}

/**
 * Calculate wet bulb temperature using Stull (2011) approximation.
 * Accurate to ±0.3°C for RH 5-99% and T -20 to 50°C.
 */
function calculateWetBulb(tempC: number, rh: number): number {
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/**
 * Calculate Delta T (dry bulb - wet bulb) in Celsius.
 * Delta T is the single most important spray timing indicator.
 * 2-8°C = ideal. <2°C = inversion risk. >8°C = rapid evaporation.
 */
function calculateDeltaT(tempC: number, rh: number): number {
  const wetBulb = calculateWetBulb(tempC, rh);
  return Math.max(0, tempC - wetBulb);
}

function windDirectionLabel(degrees: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(degrees / 22.5) % 16];
}

/**
 * Estimate if it's daylight based on approximate sunrise/sunset.
 * Simple solar calculation — accurate enough for spray timing.
 */
function isDaylight(hour: number, lat: number, dayOfYear: number): boolean {
  // Simplified sunrise/sunset based on latitude and day of year
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const declRad = (declination * Math.PI) / 180;
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declRad));
  const daylightHours = (2 * hourAngle * 180) / (Math.PI * 15);
  const sunrise = 12 - daylightHours / 2;
  const sunset = 12 + daylightHours / 2;
  return hour >= sunrise && hour <= sunset;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ── Core spray rating engine ────────────────────────────────────────────────

function rateSprayHour(
  tempC: number,
  rh: number,
  windSpeedKmh: number,
  windGustsKmh: number,
  windDirDeg: number,
  precipProb: number,
  precipMm: number,
  cloudCover: number,
  rainFreeHoursAhead: number,
  hour: number,
  lat: number,
  dayOfYear: number,
): { rating: SprayRating; score: number; reasons: string[]; factors: SprayHour['factors'] } {
  const windMph = kmhToMph(windSpeedKmh);
  const gustsMph = kmhToMph(windGustsKmh);
  const tempF = celsiusToFahrenheit(tempC);
  const dewPointC = tempC - ((100 - rh) / 5); // Approximate
  const dewPointF = celsiusToFahrenheit(dewPointC);
  const deltaT = calculateDeltaT(tempC, rh);
  const daylight = isDaylight(hour, lat, dayOfYear);

  const reasons: string[] = [];
  let score = 100;
  let hasNoGo = false;
  let hasCaution = false;

  // ── Wind assessment ─────────────────────────────────────────────────
  if (windMph > THRESHOLDS.wind.caution_max || gustsMph > THRESHOLDS.wind.gust_max) {
    hasNoGo = true;
    score -= 40;
    reasons.push(`Wind too high: ${windMph.toFixed(0)} mph (gusts ${gustsMph.toFixed(0)} mph) — severe drift risk`);
  } else if (windMph > THRESHOLDS.wind.ideal_max) {
    hasCaution = true;
    score -= 20;
    reasons.push(`Wind elevated: ${windMph.toFixed(0)} mph — increased drift risk, use larger droplets`);
  } else if (windMph < THRESHOLDS.wind.ideal_min) {
    // Low wind alone isn't no-go, but combined with other factors = inversion
    hasCaution = true;
    score -= 10;
    reasons.push(`Wind calm: ${windMph.toFixed(1)} mph — potential inversion conditions`);
  }

  // ── Temperature assessment ──────────────────────────────────────────
  if (tempF > THRESHOLDS.temperature.no_go_max) {
    hasNoGo = true;
    score -= 30;
    reasons.push(`Temperature extreme: ${tempF.toFixed(0)}°F — chemical volatilization risk`);
  } else if (tempF > THRESHOLDS.temperature.caution_max) {
    hasCaution = true;
    score -= 15;
    reasons.push(`Temperature high: ${tempF.toFixed(0)}°F — reduced herbicide efficacy, potential volatility`);
  } else if (tempF < THRESHOLDS.temperature.caution_min) {
    hasCaution = true;
    score -= 15;
    reasons.push(`Temperature low: ${tempF.toFixed(0)}°F — poor plant uptake, reduced efficacy`);
  }

  // ── Humidity assessment ─────────────────────────────────────────────
  if (rh > THRESHOLDS.humidity.caution_max) {
    hasCaution = true;
    score -= 10;
    reasons.push(`Humidity very high: ${rh.toFixed(0)}% — slow drying, potential runoff`);
  } else if (rh < THRESHOLDS.humidity.caution_min) {
    hasCaution = true;
    score -= 15;
    reasons.push(`Humidity low: ${rh.toFixed(0)}% — rapid evaporation, reduced coverage`);
  }

  // ── Delta T assessment (most important single indicator) ────────────
  if (deltaT < THRESHOLDS.delta_t.ideal_min) {
    // Delta T < 2 is a strong inversion indicator
    hasNoGo = true;
    score -= 35;
    reasons.push(`Delta T too low: ${deltaT.toFixed(1)}°C — inversion conditions likely, fine droplets will suspend and drift`);
  } else if (deltaT > THRESHOLDS.delta_t.caution_max) {
    hasCaution = true;
    score -= 15;
    reasons.push(`Delta T very high: ${deltaT.toFixed(1)}°C — rapid evaporation, use higher water volume`);
  } else if (deltaT > THRESHOLDS.delta_t.ideal_max) {
    hasCaution = true;
    score -= 5;
    reasons.push(`Delta T elevated: ${deltaT.toFixed(1)}°C — monitor for evaporation`);
  }

  // ── Inversion risk (compound assessment) ────────────────────────────
  const inversionRisk =
    windMph < 3 &&
    deltaT < 2.5 &&
    (!daylight || (hour >= 17 || hour <= 8)) &&
    cloudCover < 30;

  if (inversionRisk && !hasNoGo) {
    hasNoGo = true;
    score -= 30;
    reasons.push('Inversion conditions detected: calm wind + low Delta T + clear skies — DO NOT spray');
  }

  // ── Precipitation assessment ────────────────────────────────────────
  if (precipMm > 0.5) {
    hasNoGo = true;
    score -= 40;
    reasons.push(`Active precipitation: ${precipMm.toFixed(1)}mm — do not spray during rain`);
  } else if (rainFreeHoursAhead < THRESHOLDS.rain.min_free_hours) {
    if (precipProb > THRESHOLDS.rain.probability_no_go) {
      hasNoGo = true;
      score -= 30;
      reasons.push(`Rain likely within ${rainFreeHoursAhead}h (${precipProb}% chance) — insufficient drying time`);
    } else if (precipProb > THRESHOLDS.rain.probability_caution) {
      hasCaution = true;
      score -= 15;
      reasons.push(`Rain possible within ${rainFreeHoursAhead}h (${precipProb}% chance) — monitor closely`);
    }
  }

  // ── Nighttime penalty ───────────────────────────────────────────────
  if (!daylight) {
    score -= 5;
    if (reasons.length === 0) {
      reasons.push('Nighttime — increased inversion risk, reduced visibility');
    }
  }

  // ── Determine final rating ──────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  let rating: SprayRating;
  if (hasNoGo || score < 40) {
    rating = 'NO_GO';
  } else if (hasCaution || score < 70) {
    rating = 'CAUTION';
  } else {
    rating = 'GO';
  }

  // If GO with no specific reasons, add positive note
  if (rating === 'GO' && reasons.length === 0) {
    reasons.push('All conditions within ideal ranges — good spray window');
  }

  return {
    rating,
    score,
    reasons,
    factors: {
      wind_speed_mph: Math.round(windMph * 10) / 10,
      wind_gusts_mph: Math.round(gustsMph * 10) / 10,
      wind_direction_deg: windDirDeg,
      wind_direction_label: windDirectionLabel(windDirDeg),
      temperature_f: Math.round(tempF * 10) / 10,
      relative_humidity: Math.round(rh),
      dew_point_f: Math.round(dewPointF * 10) / 10,
      delta_t_c: Math.round(deltaT * 10) / 10,
      precipitation_probability: precipProb,
      precipitation_mm: precipMm,
      cloud_cover: cloudCover,
      inversion_risk: inversionRisk,
      rain_free_hours_ahead: rainFreeHoursAhead,
      is_daylight: daylight,
    },
  };
}

// ── Open-Meteo hourly fetch ─────────────────────────────────────────────────

async function fetchHourlyWeather(lat: number, lng: number): Promise<{
  times: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  cloud_cover: number[];
}> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'precipitation_probability',
      'precipitation',
      'cloud_cover',
    ].join(','),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'auto',
    forecast_days: '3',
  });

  const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, {
    next: { revalidate: 300 }, // Cache 5 minutes
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    times: data.hourly.time,
    temperature_2m: data.hourly.temperature_2m,
    relative_humidity_2m: data.hourly.relative_humidity_2m,
    wind_speed_10m: data.hourly.wind_speed_10m,
    wind_gusts_10m: data.hourly.wind_gusts_10m,
    wind_direction_10m: data.hourly.wind_direction_10m,
    precipitation_probability: data.hourly.precipitation_probability,
    precipitation: data.hourly.precipitation,
    cloud_cover: data.hourly.cloud_cover,
  };
}

// ── NWS Alerts ──────────────────────────────────────────────────────────────

async function fetchNWSAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat},${lng}`,
      {
        headers: { 'User-Agent': '(HarvestFile, hello@harvestfile.com)' },
        next: { revalidate: 600 }, // Cache 10 min
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline,
      onset: f.properties.onset,
      expires: f.properties.expires,
    }));
  } catch {
    return [];
  }
}

// ── Calculate rain-free hours ahead for each hour ───────────────────────────

function calculateRainFreeHours(
  precipProbs: number[],
  precipAmounts: number[],
  startIndex: number,
): number {
  let hours = 0;
  for (let i = startIndex + 1; i < precipAmounts.length; i++) {
    if (precipAmounts[i] > 0.2 || precipProbs[i] > 50) break;
    hours++;
    if (hours >= 12) break; // Cap at 12 for display
  }
  return hours;
}

// ── Find best contiguous spray window ───────────────────────────────────────

function findBestWindow(
  hours: SprayHour[],
  dateFilter: string,
): { start: string; end: string } | null {
  const filtered = hours.filter(h => h.time.startsWith(dateFilter));
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i].rating === 'GO') {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestStart === -1 || bestLen < 2) return null;
  return {
    start: filtered[bestStart].time,
    end: filtered[bestStart + bestLen - 1].time,
  };
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function getSprayWindowForecast(
  lat: number,
  lng: number,
): Promise<SprayWindowResult> {
  const [hourly, alerts] = await Promise.all([
    fetchHourlyWeather(lat, lng),
    fetchNWSAlerts(lat, lng),
  ]);

  const sprayHours: SprayHour[] = [];

  for (let i = 0; i < hourly.times.length; i++) {
    const time = hourly.times[i];
    const date = new Date(time);
    const hour = date.getHours();
    const dayOfYear = getDayOfYear(date);
    const rainFreeHours = calculateRainFreeHours(
      hourly.precipitation_probability,
      hourly.precipitation,
      i,
    );

    const result = rateSprayHour(
      hourly.temperature_2m[i],
      hourly.relative_humidity_2m[i],
      hourly.wind_speed_10m[i],
      hourly.wind_gusts_10m[i] || hourly.wind_speed_10m[i] * 1.3,
      hourly.wind_direction_10m[i],
      hourly.precipitation_probability[i],
      hourly.precipitation[i],
      hourly.cloud_cover[i],
      rainFreeHours,
      hour,
      lat,
      dayOfYear,
    );

    sprayHours.push({
      time,
      hour,
      ...result,
    });
  }

  // Current conditions (nearest hour)
  const now = new Date();
  const currentIndex = sprayHours.findIndex(h => {
    const hDate = new Date(h.time);
    return hDate >= now;
  });
  const current = currentIndex >= 0 ? sprayHours[currentIndex] : sprayHours[0];

  // Next GO window
  const nextGo = sprayHours.find((h, idx) => idx >= currentIndex && h.rating === 'GO');

  // Build daily summaries
  const dayMap = new Map<string, SprayHour[]>();
  for (const h of sprayHours) {
    const dateKey = h.time.split('T')[0];
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey)!.push(h);
  }

  const dailySummary: DailySummary[] = [];
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const [dateKey, dayHours] of Array.from(dayMap.entries())) {
    const label =
      dateKey === today ? 'Today' :
      dateKey === tomorrow ? 'Tomorrow' :
      dayNames[new Date(dateKey + 'T12:00:00').getDay()];

    const goHours = dayHours.filter(h => h.rating === 'GO').length;
    const cautionHours = dayHours.filter(h => h.rating === 'CAUTION').length;
    const noGoHours = dayHours.filter(h => h.rating === 'NO_GO').length;
    const temps = dayHours.map(h => h.factors.temperature_f);
    const winds = dayHours.map(h => h.factors.wind_speed_mph);
    const rainChances = dayHours.map(h => h.factors.precipitation_probability);

    dailySummary.push({
      date: dateKey,
      label,
      go_hours: goHours,
      caution_hours: cautionHours,
      no_go_hours: noGoHours,
      best_window: findBestWindow(sprayHours, dateKey),
      high_f: Math.round(Math.max(...temps)),
      low_f: Math.round(Math.min(...temps)),
      wind_max_mph: Math.round(Math.max(...winds)),
      rain_chance: Math.round(Math.max(...rainChances)),
    });
  }

  return {
    location: { lat, lng },
    generated_at: new Date().toISOString(),
    current_rating: current.rating,
    current_score: current.score,
    current_reasons: current.reasons,
    next_go_window: nextGo?.time || null,
    best_window_today: findBestWindow(sprayHours, today),
    best_window_tomorrow: findBestWindow(sprayHours, tomorrow),
    hours: sprayHours,
    daily_summary: dailySummary,
    alerts,
  };
}
