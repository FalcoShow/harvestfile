// =============================================================================
// app/(marketing)/weather/page.tsx
// HarvestFile — Phase 26 Build 2: Agricultural Weather Dashboard
//
// The most comprehensive free agricultural weather tool in America.
// GDD tracking, soil conditions, 14-day forecast, planting windows,
// frost alerts — all on one screen, GPS-precise.
//
// No competitor offers this combination for free. DTN charges $500+/yr.
// Climate FieldView doesn't have half these features.
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────────────────────────

interface DailyWeather {
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

interface SoilData {
  date: string;
  soil_temp_2in_f: number;
  soil_temp_6in_f: number;
  soil_moisture_0_4in: number;
  soil_moisture_4_16in: number;
}

interface GDDDay {
  date: string;
  daily_gdd: number;
  cumulative_gdd: number;
}

interface PlantingWindow {
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

interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
  description: string;
  onset: string;
  expires: string;
}

interface WeatherData {
  location: { lat: number; lng: number };
  generated_at: string;
  forecast: {
    daily: DailyWeather[];
    summary: {
      frost_risk_hours: number;
      heat_stress_hours: number;
      total_precipitation_mm: number;
      growing_degree_days: number;
    };
  };
  soil: SoilData[];
  gdd: {
    total_14day: number;
    by_day: GDDDay[];
  };
  planting_windows: PlantingWindow[];
  alerts: WeatherAlert[];
}

interface GeoResult {
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
  });
}

function mmToInches(mm: number): string {
  return (mm / 25.4).toFixed(2);
}

function getConditionEmoji(conditions: string): string {
  const c = conditions.toLowerCase();
  if (c.includes('rain') || c.includes('shower')) return '🌧️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('partly')) return '⛅';
  if (c.includes('snow')) return '🌨️';
  if (c.includes('fog')) return '🌫️';
  if (c.includes('wind')) return '💨';
  return '☀️';
}

// ── Location Search ─────────────────────────────────────────────────────────

function LocationSearch({
  onSelect,
  loading: externalLoading,
}: {
  onSelect: (lat: number, lng: number, name: string) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchLocation = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json&country_code=US`
      );
      const data = await res.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (query) searchLocation(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, searchLocation]);

  const useGeolocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelect(pos.coords.latitude, pos.coords.longitude, 'Your Location');
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        alert('Could not access your location. Please search by city or zip code.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search city, county, or zip code..."
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
          {showResults && results.length > 0 && (
            <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSelect(r.latitude, r.longitude, `${r.name}, ${r.admin1}`);
                    setQuery(`${r.name}, ${r.admin1}`);
                    setShowResults(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="text-emerald-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-sm text-gray-500">{r.admin1}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          onClick={useGeolocation}
          disabled={geoLoading || externalLoading}
          className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
        >
          {geoLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
            </svg>
          )}
          <span className="hidden sm:inline">Use My Location</span>
        </button>
      </div>
    </div>
  );
}

// ── Current Conditions Card ─────────────────────────────────────────────────

function CurrentConditions({ day, soil }: { day: DailyWeather; soil: SoilData | null }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Current Conditions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-xl bg-gray-50">
          <div className="text-3xl mb-1">{getConditionEmoji(day.conditions)}</div>
          <div className="text-2xl font-bold text-gray-900">{Math.round(day.temp_max_f)}°</div>
          <div className="text-sm text-gray-500">/ {Math.round(day.temp_min_f)}°F</div>
          <div className="text-xs text-gray-400 mt-1">{day.conditions}</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500 mb-1">Wind</div>
          <div className="text-2xl font-bold text-gray-900">{Math.round(day.wind_speed_max_mph)}</div>
          <div className="text-sm text-gray-500">mph max</div>
          <div className="text-xs text-gray-400 mt-1">Gusts {Math.round(day.wind_gusts_mph)}</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500 mb-1">Rain</div>
          <div className="text-2xl font-bold text-gray-900">{day.precipitation_probability}%</div>
          <div className="text-sm text-gray-500">chance</div>
          <div className="text-xs text-gray-400 mt-1">{mmToInches(day.precipitation_mm)}&quot; expected</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500 mb-1">Humidity</div>
          <div className="text-2xl font-bold text-gray-900">{Math.round(day.humidity_mean)}%</div>
          <div className="text-sm text-gray-500">average</div>
          <div className="text-xs text-gray-400 mt-1">ET₀ {day.et0_mm.toFixed(1)}mm</div>
        </div>
      </div>

      {/* Frost warning */}
      {day.frost_risk && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-center gap-3">
          <span className="text-blue-600 text-xl">❄️</span>
          <div>
            <div className="font-semibold text-blue-900 text-sm">Frost Risk Today</div>
            <div className="text-xs text-blue-700">Low of {Math.round(day.temp_min_f)}°F — protect sensitive crops</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Soil Conditions Card ────────────────────────────────────────────────────

function SoilConditions({ soil }: { soil: SoilData | null }) {
  if (!soil) return null;

  function tempStatus(f: number): { color: string; label: string } {
    if (f >= 50) return { color: 'text-emerald-700', label: 'Plantable' };
    if (f >= 40) return { color: 'text-amber-700', label: 'Warming' };
    return { color: 'text-blue-700', label: 'Cold' };
  }

  function moistureStatus(val: number): { color: string; label: string } {
    if (val > 0.4) return { color: 'text-blue-700', label: 'Saturated' };
    if (val > 0.25) return { color: 'text-emerald-700', label: 'Good' };
    if (val > 0.15) return { color: 'text-amber-700', label: 'Drying' };
    return { color: 'text-red-700', label: 'Dry' };
  }

  const temp2 = tempStatus(soil.soil_temp_2in_f);
  const temp6 = tempStatus(soil.soil_temp_6in_f);
  const moist0 = moistureStatus(soil.soil_moisture_0_4in);
  const moist4 = moistureStatus(soil.soil_moisture_4_16in);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Soil Conditions</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-sm text-gray-500 mb-1">Soil Temp (2&quot; depth)</div>
          <div className="text-2xl font-bold text-gray-900">{soil.soil_temp_2in_f.toFixed(1)}°F</div>
          <span className={`text-xs font-medium ${temp2.color}`}>{temp2.label}</span>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-sm text-gray-500 mb-1">Soil Temp (6&quot; depth)</div>
          <div className="text-2xl font-bold text-gray-900">{soil.soil_temp_6in_f.toFixed(1)}°F</div>
          <span className={`text-xs font-medium ${temp6.color}`}>{temp6.label}</span>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-sm text-gray-500 mb-1">Moisture (0–4&quot;)</div>
          <div className="text-2xl font-bold text-gray-900">{(soil.soil_moisture_0_4in * 100).toFixed(0)}%</div>
          <span className={`text-xs font-medium ${moist0.color}`}>{moist0.label}</span>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-sm text-gray-500 mb-1">Moisture (4–16&quot;)</div>
          <div className="text-2xl font-bold text-gray-900">{(soil.soil_moisture_4_16in * 100).toFixed(0)}%</div>
          <span className={`text-xs font-medium ${moist4.color}`}>{moist4.label}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">Corn and soybeans need 50°F+ soil temp at 2&quot; depth for germination. Wheat needs 40°F+.</p>
    </div>
  );
}

// ── GDD Tracker Card ────────────────────────────────────────────────────────

function GDDTracker({ gdd }: { gdd: { total_14day: number; by_day: GDDDay[] } }) {
  // GDD milestones for corn (base 50°F)
  const milestones = [
    { gdd: 120, stage: 'VE — Emergence' },
    { gdd: 200, stage: 'V2 — 2nd leaf' },
    { gdd: 475, stage: 'V6 — Growing point above soil' },
    { gdd: 870, stage: 'V12 — Ear size determination' },
    { gdd: 1135, stage: 'VT — Tasseling' },
    { gdd: 1400, stage: 'R1 — Silking' },
    { gdd: 2450, stage: 'R5 — Dent' },
    { gdd: 2700, stage: 'R6 — Black layer (maturity)' },
  ];

  const maxGDD = Math.max(...gdd.by_day.map(d => d.cumulative_gdd), 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Growing Degree Days (Base 50°F)</h2>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-700">{gdd.total_14day}</div>
          <div className="text-xs text-gray-500">14-day forecast</div>
        </div>
      </div>

      {/* GDD bar chart */}
      <div className="flex items-end gap-[3px] h-24 mb-4">
        {gdd.by_day.map((d, i) => {
          const height = maxGDD > 0 ? (d.daily_gdd / maxGDD) * 100 : 0;
          const isToday = i === 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${formatDate(d.date)}: ${d.daily_gdd.toFixed(0)} GDD`}>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(height, 4)}%`,
                  backgroundColor: isToday ? '#059669' : d.daily_gdd > 15 ? '#34D399' : '#D1FAE5',
                }}
              />
              <span className="text-[9px] text-gray-400">
                {i % 2 === 0 ? formatDateShort(d.date) : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cumulative GDD progress */}
      <div className="text-sm text-gray-600 mb-2 font-medium">Corn Growth Stage Reference</div>
      <div className="space-y-1.5">
        {milestones.slice(0, 4).map(m => {
          const pct = Math.min((gdd.total_14day / m.gdd) * 100, 100);
          return (
            <div key={m.gdd} className="flex items-center gap-3 text-sm">
              <div className="w-16 text-xs text-gray-500 text-right shrink-0">{m.gdd} GDD</div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#059669' : '#FCD34D' }}
                />
              </div>
              <div className="w-36 text-xs text-gray-600 shrink-0">{m.stage}</div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">GDD calculated from 14-day forecast only. Cumulative season GDD requires a planting date.</p>
    </div>
  );
}

// ── Planting Windows Card ───────────────────────────────────────────────────

function PlantingWindows({ windows }: { windows: PlantingWindow[] }) {
  if (windows.length === 0) return null;

  function riskColor(level: 'low' | 'moderate' | 'high'): string {
    if (level === 'low') return 'bg-emerald-100 text-emerald-800';
    if (level === 'moderate') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  }

  function confidenceColor(c: number): string {
    if (c >= 70) return 'text-emerald-600';
    if (c >= 50) return 'text-amber-600';
    return 'text-red-600';
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Planting Window Analysis</h2>
      <div className="space-y-4">
        {windows.map((w, i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">{w.crop}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${confidenceColor(w.confidence)}`}>
                  {w.confidence}% ready
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColor(w.frost_risk_level)}`}>
                  {w.frost_risk_level === 'low' ? 'Low frost risk' : w.frost_risk_level === 'moderate' ? 'Moderate frost risk' : 'High frost risk'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Soil Temp</div>
                <div className="font-semibold">
                  {w.soil_temp_current_f}°F
                  <span className="text-gray-400 font-normal"> / {w.soil_temp_needed_f}°F needed</span>
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Optimal Window</div>
                <div className="font-semibold">{w.optimal_start} – {w.optimal_end}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Soil Ready</div>
                <div className="font-semibold">
                  {w.soil_temp_ready ? (
                    <span className="text-emerald-600">✓ Yes</span>
                  ) : (
                    <span className="text-amber-600">~{w.days_until_safe} days</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              {w.recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 14-Day Forecast Table ───────────────────────────────────────────────────

function ForecastTable({ daily }: { daily: DailyWeather[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 pb-3">
        <h2 className="text-lg font-bold text-gray-900">14-Day Agricultural Forecast</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left pl-6 pr-2 py-3 font-medium">Day</th>
              <th className="text-center px-2 py-3 font-medium">Conditions</th>
              <th className="text-center px-2 py-3 font-medium">High/Low</th>
              <th className="text-center px-2 py-3 font-medium">Rain</th>
              <th className="text-center px-2 py-3 font-medium">Wind</th>
              <th className="text-center px-2 py-3 font-medium">Humidity</th>
              <th className="text-center px-2 py-3 font-medium">GDD</th>
              <th className="text-center px-2 py-3 font-medium">Sun</th>
              <th className="text-center pr-6 pl-2 py-3 font-medium">Frost</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d, i) => {
              const today = new Date().toISOString().split('T')[0];
              const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
              const label = d.date === today ? 'Today' : d.date === tomorrow ? 'Tomorrow' : formatDate(d.date);
              const isWeekend = [0, 6].includes(new Date(d.date + 'T12:00:00').getDay());

              return (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${d.frost_risk ? 'bg-blue-50/50' : isWeekend ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="pl-6 pr-2 py-3 font-medium text-gray-900 whitespace-nowrap">{label}</td>
                  <td className="text-center px-2 py-3">
                    <span title={d.conditions}>{getConditionEmoji(d.conditions)}</span>
                  </td>
                  <td className="text-center px-2 py-3 font-semibold">
                    <span className="text-gray-900">{Math.round(d.temp_max_f)}°</span>
                    <span className="text-gray-400"> / {Math.round(d.temp_min_f)}°</span>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className={d.precipitation_probability > 50 ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                      {d.precipitation_probability}%
                    </span>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className={d.wind_speed_max_mph > 15 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {Math.round(d.wind_speed_max_mph)}
                    </span>
                    <span className="text-gray-400 text-xs"> mph</span>
                  </td>
                  <td className="text-center px-2 py-3 text-gray-600">{Math.round(d.humidity_mean)}%</td>
                  <td className="text-center px-2 py-3">
                    <span className={`font-medium ${d.gdd_base50 > 15 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {d.gdd_base50.toFixed(0)}
                    </span>
                  </td>
                  <td className="text-center px-2 py-3 text-gray-600">{d.sunshine_hours.toFixed(1)}h</td>
                  <td className="text-center pr-6 pl-2 py-3">
                    {d.frost_risk ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                        ❄️ Risk
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Alert Banner ────────────────────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts: WeatherAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <span className="text-amber-600 mt-0.5 shrink-0">⚠️</span>
          <div>
            <div className="font-semibold text-amber-900">{a.event}</div>
            <div className="text-sm text-amber-800 mt-0.5">{a.headline}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');

  const fetchWeather = useCallback(async (lat: number, lng: number, name: string) => {
    setLoading(true);
    setError('');
    setLocationName(name);

    try {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}&crops=CORN,SOYBEANS,WHEAT`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load weather data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      fetchWeather(data.location.lat, data.location.lng, locationName);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [data, locationName, fetchWeather]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Free Tool — No Account Required
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Agricultural Weather Dashboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              GDD tracking, soil temperature and moisture, 14-day farm forecast, planting window analysis, and frost alerts — GPS-precise for any field in America.
            </p>
          </div>
          <LocationSearch onSelect={fetchWeather} loading={loading} />
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading agricultural weather for {locationName}...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Location header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{locationName}</h2>
              <p className="text-sm text-gray-500">Updated {new Date(data.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
            </div>
            <Link
              href="/spray-window"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
              </svg>
              Spray Window Calculator
            </Link>
          </div>

          {/* Alerts */}
          <AlertBanner alerts={data.alerts} />

          {/* Top row: Current + Soil */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CurrentConditions day={data.forecast.daily[0]} soil={data.soil[0] || null} />
            <SoilConditions soil={data.soil[0] || null} />
          </div>

          {/* GDD Tracker */}
          <GDDTracker gdd={data.gdd} />

          {/* Planting Windows */}
          <PlantingWindows windows={data.planting_windows} />

          {/* 14-Day Forecast */}
          <ForecastTable daily={data.forecast.daily} />

          {/* 14-Day Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{data.gdd.total_14day}</div>
              <div className="text-sm text-gray-500">Total GDD (14-day)</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {mmToInches(data.forecast.summary.total_precipitation_mm)}&quot;
              </div>
              <div className="text-sm text-gray-500">Total Precip (14-day)</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.forecast.summary.frost_risk_hours}</div>
              <div className="text-sm text-gray-500">Frost-Risk Hours</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{data.forecast.summary.heat_stress_hours}</div>
              <div className="text-sm text-gray-500">Heat-Stress Hours</div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Get Daily Weather Alerts for Your Fields
            </h2>
            <p className="text-emerald-200 mb-6 max-w-lg mx-auto">
              Create a free account to save multiple locations, receive frost and spray window alerts, track GDD through the season, and access commodity prices and USDA program tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-emerald-900 font-semibold rounded-xl hover:bg-emerald-50 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/spray-window"
                className="inline-flex items-center justify-center px-6 py-3 border border-emerald-400 text-emerald-100 font-semibold rounded-xl hover:bg-emerald-900 transition-colors"
              >
                Spray Window Calculator
              </Link>
            </div>
          </div>

          {/* Attribution */}
          <div className="text-center text-xs text-gray-400 pb-8">
            <p>Weather data provided by Open-Meteo. Alerts provided by the National Weather Service.</p>
            <p className="mt-1">Data refreshes every 10 minutes. GDD calculated using base 50°F (modified sine method).</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Enter your location to get started</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Search by city, county, or zip code — or use GPS for the most accurate field-level agricultural weather data.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3 text-lg">🌱</div>
                <h3 className="font-semibold text-gray-900 mb-1">GDD Tracking</h3>
                <p className="text-sm text-gray-600">Growing Degree Day accumulation with corn growth stage milestones and daily breakdown.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3 text-lg">🌡️</div>
                <h3 className="font-semibold text-gray-900 mb-1">Soil Conditions</h3>
                <p className="text-sm text-gray-600">Temperature at 2&quot; and 6&quot; depth plus moisture levels — know when soil is ready for planting.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3 text-lg">🌾</div>
                <h3 className="font-semibold text-gray-900 mb-1">Planting Windows</h3>
                <p className="text-sm text-gray-600">Crop-specific planting readiness based on soil temp, frost risk, and optimal timing for your area.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
