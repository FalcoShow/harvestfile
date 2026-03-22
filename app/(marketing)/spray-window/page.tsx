// =============================================================================
// app/(marketing)/spray-window/page.tsx
// HarvestFile — Phase 26 Build 1: Spray Window Calculator
//
// The most advanced free spray decision tool available to American farmers.
// Shows real-time GO/CAUTION/NO-GO ratings based on 7 weather parameters
// for the next 72 hours at any location in America.
//
// No competitor offers this. Not DTN ($500/yr). Not Climate FieldView.
// Not any university extension. This is free, beautiful, and instant.
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

// ── Types ───────────────────────────────────────────────────────────────────

interface SprayHour {
  time: string;
  hour: number;
  rating: 'GO' | 'CAUTION' | 'NO_GO';
  score: number;
  reasons: string[];
  factors: {
    wind_speed_mph: number;
    wind_gusts_mph: number;
    wind_direction_deg: number;
    wind_direction_label: string;
    temperature_f: number;
    relative_humidity: number;
    dew_point_f: number;
    delta_t_c: number;
    precipitation_probability: number;
    precipitation_mm: number;
    cloud_cover: number;
    inversion_risk: boolean;
    rain_free_hours_ahead: number;
    is_daylight: boolean;
  };
}

interface DailySummary {
  date: string;
  label: string;
  go_hours: number;
  caution_hours: number;
  no_go_hours: number;
  best_window: { start: string; end: string } | null;
  high_f: number;
  low_f: number;
  wind_max_mph: number;
  rain_chance: number;
}

interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
  onset: string;
  expires: string;
}

interface SprayData {
  location: { lat: number; lng: number };
  generated_at: string;
  current_rating: 'GO' | 'CAUTION' | 'NO_GO';
  current_score: number;
  current_reasons: string[];
  next_go_window: string | null;
  best_window_today: { start: string; end: string } | null;
  best_window_tomorrow: { start: string; end: string } | null;
  hours: SprayHour[];
  daily_summary: DailySummary[];
  alerts: WeatherAlert[];
}

interface GeoResult {
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
}

// ── Colors ──────────────────────────────────────────────────────────────────

const COLORS = {
  GO: { bg: '#059669', bgLight: '#D1FAE5', text: '#065F46', label: 'GO' },
  CAUTION: { bg: '#D97706', bgLight: '#FEF3C7', text: '#92400E', label: 'CAUTION' },
  NO_GO: { bg: '#DC2626', bgLight: '#FEE2E2', text: '#991B1B', label: 'NO-GO' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// ── Location Search Component ───────────────────────────────────────────────

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
                    <div className="text-sm text-gray-500">{r.admin1}, {r.country}</div>
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

// ── Rating Badge ────────────────────────────────────────────────────────────

function RatingBadge({ rating, size = 'lg' }: { rating: 'GO' | 'CAUTION' | 'NO_GO'; size?: 'sm' | 'md' | 'lg' }) {
  const c = COLORS[rating];
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-5 py-2 text-lg',
  };
  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: c.bg, color: 'white' }}
    >
      {c.label}
    </span>
  );
}

// ── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, rating, size = 160 }: { score: number; rating: 'GO' | 'CAUTION' | 'NO_GO'; size?: number }) {
  const c = COLORS[rating];
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={c.bg} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: c.bg }}>{score}</span>
        <span className="text-sm text-gray-500 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ── Condition Card ──────────────────────────────────────────────────────────

function ConditionCard({
  label, value, unit, status, icon,
}: {
  label: string;
  value: string;
  unit: string;
  status: 'good' | 'caution' | 'bad';
  icon: React.ReactNode;
}) {
  const statusColors = {
    good: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    bad: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  };
  const s = statusColors[status];

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm font-medium">{label}</span>
        <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-gray-400">{icon}</span>
        <span className={`text-2xl font-bold ${s.text}`}>{value}</span>
        <span className="text-sm text-gray-500 mb-0.5">{unit}</span>
      </div>
    </div>
  );
}

// ── Timeline Bar ────────────────────────────────────────────────────────────

function TimelineBar({ hours, onHourClick }: { hours: SprayHour[]; onHourClick: (h: SprayHour) => void }) {
  // Group by day
  const days = new Map<string, SprayHour[]>();
  for (const h of hours) {
    const dateKey = h.time.split('T')[0];
    if (!days.has(dateKey)) days.set(dateKey, []);
    days.get(dateKey)!.push(h);
  }

  return (
    <div className="space-y-4">
      {Array.from(days.entries()).map(([dateKey, dayHours]) => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const label = dateKey === today ? 'Today' : dateKey === tomorrow ? 'Tomorrow' : formatDate(dateKey);

        return (
          <div key={dateKey}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              <span className="text-xs text-gray-400">
                {dayHours.filter(h => h.rating === 'GO').length}h spray time
              </span>
            </div>
            <div className="flex gap-[2px] rounded-lg overflow-hidden">
              {dayHours.map((h, i) => {
                const c = COLORS[h.rating];
                return (
                  <button
                    key={i}
                    onClick={() => onHourClick(h)}
                    className="flex-1 group relative"
                    style={{ minWidth: 0 }}
                    title={`${formatTime(h.time)}: ${c.label} (${h.score}/100)`}
                  >
                    <div
                      className="h-8 sm:h-10 transition-all hover:brightness-110"
                      style={{ backgroundColor: c.bg, opacity: h.factors.is_daylight ? 1 : 0.5 }}
                    />
                    {/* Hour labels every 3 hours */}
                    {h.hour % 3 === 0 && (
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
                        {h.hour === 0 ? '12a' : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? '12p' : `${h.hour - 12}p`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div className="flex items-center gap-4 pt-2">
        {(['GO', 'CAUTION', 'NO_GO'] as const).map(r => (
          <div key={r} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[r].bg }} />
            <span className="text-xs text-gray-500">{COLORS[r].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-3 h-3 rounded-sm bg-gray-300 opacity-50" />
          <span className="text-xs text-gray-500">Night</span>
        </div>
      </div>
    </div>
  );
}

// ── Hour Detail Panel ───────────────────────────────────────────────────────

function HourDetail({ hour }: { hour: SprayHour }) {
  const f = hour.factors;
  const c = COLORS[hour.rating];

  function getWindStatus(): 'good' | 'caution' | 'bad' {
    if (f.wind_speed_mph > 15 || f.wind_gusts_mph > 20) return 'bad';
    if (f.wind_speed_mph > 10 || f.wind_speed_mph < 3) return 'caution';
    return 'good';
  }
  function getTempStatus(): 'good' | 'caution' | 'bad' {
    if (f.temperature_f > 95 || f.temperature_f < 40) return 'bad';
    if (f.temperature_f > 85 || f.temperature_f < 50) return 'caution';
    return 'good';
  }
  function getHumidityStatus(): 'good' | 'caution' | 'bad' {
    if (f.relative_humidity > 90 || f.relative_humidity < 30) return 'bad';
    if (f.relative_humidity > 80 || f.relative_humidity < 40) return 'caution';
    return 'good';
  }
  function getDeltaTStatus(): 'good' | 'caution' | 'bad' {
    if (f.delta_t_c < 2) return 'bad';
    if (f.delta_t_c > 10) return 'bad';
    if (f.delta_t_c > 8) return 'caution';
    return 'good';
  }
  function getRainStatus(): 'good' | 'caution' | 'bad' {
    if (f.precipitation_mm > 0.5 || f.precipitation_probability > 60) return 'bad';
    if (f.precipitation_probability > 30) return 'caution';
    return 'good';
  }
  function getInversionStatus(): 'good' | 'caution' | 'bad' {
    return f.inversion_risk ? 'bad' : 'good';
  }

  const windIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>;
  const tempIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>;
  const humidityIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
  const deltaTIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l7 7-7 7"/><line x1="14" y1="4" x2="14" y2="18"/></svg>;
  const rainIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16l-2 4"/><path d="M12 16l-2 4"/><path d="M16 16l-2 4"/></svg>;
  const inversionIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0z"/><path d="M12 17h.01"/></svg>;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg font-bold text-gray-900">
            {new Date(hour.time).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
            })}
          </div>
          <div className="text-sm text-gray-500">
            {new Date(hour.time).toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric',
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing score={hour.score} rating={hour.rating} size={72} />
          <RatingBadge rating={hour.rating} size="md" />
        </div>
      </div>

      {/* Reasons */}
      <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: c.bgLight }}>
        {hour.reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm" style={{ color: c.text }}>
            <span className="mt-0.5 shrink-0">{hour.rating === 'GO' ? '✓' : hour.rating === 'CAUTION' ? '⚠' : '✕'}</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      {/* Condition grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ConditionCard label="Wind" value={f.wind_speed_mph.toFixed(0)} unit={`mph ${f.wind_direction_label}`} status={getWindStatus()} icon={windIcon} />
        <ConditionCard label="Temperature" value={f.temperature_f.toFixed(0)} unit="°F" status={getTempStatus()} icon={tempIcon} />
        <ConditionCard label="Humidity" value={`${f.relative_humidity}`} unit="%" status={getHumidityStatus()} icon={humidityIcon} />
        <ConditionCard label="Delta T" value={f.delta_t_c.toFixed(1)} unit="°C" status={getDeltaTStatus()} icon={deltaTIcon} />
        <ConditionCard label="Rain Risk" value={`${f.precipitation_probability}`} unit={`% (${f.rain_free_hours_ahead}h free)`} status={getRainStatus()} icon={rainIcon} />
        <ConditionCard label="Inversion" value={f.inversion_risk ? 'YES' : 'No'} unit="risk" status={getInversionStatus()} icon={inversionIcon} />
      </div>
    </div>
  );
}

// ── Daily Summary Card ──────────────────────────────────────────────────────

function DaySummaryCard({ day }: { day: DailySummary }) {
  const totalHours = day.go_hours + day.caution_hours + day.no_go_hours;
  const goPercent = (day.go_hours / totalHours) * 100;
  const cautionPercent = (day.caution_hours / totalHours) * 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-gray-900">{day.label}</span>
        <span className="text-sm text-emerald-600 font-semibold">{day.go_hours}h spray</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
        {day.go_hours > 0 && <div style={{ width: `${goPercent}%`, backgroundColor: COLORS.GO.bg }} />}
        {day.caution_hours > 0 && <div style={{ width: `${cautionPercent}%`, backgroundColor: COLORS.CAUTION.bg }} />}
        {day.no_go_hours > 0 && <div style={{ flex: 1, backgroundColor: COLORS.NO_GO.bg }} />}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-500">High / Low</div>
        <div className="text-right font-medium text-gray-900">{day.high_f}° / {day.low_f}°F</div>
        <div className="text-gray-500">Max Wind</div>
        <div className="text-right font-medium text-gray-900">{day.wind_max_mph} mph</div>
        <div className="text-gray-500">Rain Chance</div>
        <div className="text-right font-medium text-gray-900">{day.rain_chance}%</div>
      </div>

      {day.best_window && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600">Best window:</span>
            <span className="text-sm font-semibold text-emerald-700">
              {formatTimeRange(day.best_window.start, day.best_window.end)}
            </span>
          </div>
        </div>
      )}
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
          <span className="text-amber-600 mt-0.5 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0z"/><path d="M12 17h.01"/>
            </svg>
          </span>
          <div>
            <div className="font-semibold text-amber-900">{a.event}</div>
            <div className="text-sm text-amber-800 mt-0.5">{a.headline}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function SprayWindowPage() {
  const [data, setData] = useState<SprayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedHour, setSelectedHour] = useState<SprayHour | null>(null);

  const fetchSprayData = useCallback(async (lat: number, lng: number, name: string) => {
    setLoading(true);
    setError('');
    setLocationName(name);
    setSelectedHour(null);

    try {
      const res = await fetch(`/api/spray-window?lat=${lat}&lng=${lng}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        // Default selected hour to current
        const now = new Date();
        const current = json.data.hours.find((h: SprayHour) => new Date(h.time) >= now);
        if (current) setSelectedHour(current);
      } else {
        setError(json.error || 'Failed to load spray window data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 minutes when data is loaded
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      fetchSprayData(data.location.lat, data.location.lng, locationName);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [data, locationName, fetchSprayData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Free Tool — No Account Required
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Spray Window Calculator
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real-time GO / NO-GO spray decisions based on wind, temperature, humidity, Delta T, inversion risk, and rain probability. Updated every 5 minutes for any location in America.
            </p>
          </div>

          <LocationSearch onSelect={fetchSprayData} loading={loading} />
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analyzing spray conditions for {locationName}...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <p className="text-red-500 text-sm mt-2">Please try a different location or try again in a moment.</p>
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Alerts */}
          <AlertBanner alerts={data.alerts} />

          {/* Current Status Hero */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={data.current_score} rating={data.current_rating} size={160} />
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  <RatingBadge rating={data.current_rating} size="lg" />
                  <span className="text-gray-400 text-sm">Right now at {locationName}</span>
                </div>
                <div className="space-y-1 mt-3">
                  {data.current_reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="mt-1 shrink-0 text-sm">
                        {data.current_rating === 'GO' ? '✓' : data.current_rating === 'CAUTION' ? '⚠' : '✕'}
                      </span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                {data.current_rating !== 'GO' && data.next_go_window && (
                  <div className="mt-4 flex items-center gap-2 text-emerald-700 font-medium">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Next GO window: {new Date(data.next_go_window).toLocaleTimeString('en-US', {
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Best Windows Quick View */}
          {(data.best_window_today || data.best_window_tomorrow) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.best_window_today && (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-medium text-emerald-600 mb-1">Best Window Today</div>
                  <div className="text-xl font-bold text-emerald-800">
                    {formatTimeRange(data.best_window_today.start, data.best_window_today.end)}
                  </div>
                </div>
              )}
              {data.best_window_tomorrow && (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-medium text-emerald-600 mb-1">Best Window Tomorrow</div>
                  <div className="text-xl font-bold text-emerald-800">
                    {formatTimeRange(data.best_window_tomorrow.start, data.best_window_tomorrow.end)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 72-Hour Timeline */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">72-Hour Spray Forecast</h2>
            <TimelineBar hours={data.hours} onHourClick={setSelectedHour} />
          </div>

          {/* Selected Hour Detail */}
          {selectedHour && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Hour Detail — Tap any hour above</h2>
              <HourDetail hour={selectedHour} />
            </div>
          )}

          {/* Daily Summary Cards */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3-Day Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.daily_summary.map(day => (
                <DaySummaryCard key={day.date} day={day} />
              ))}
            </div>
          </div>

          {/* Educational Section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Understanding Spray Conditions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Wind Speed (3–10 mph ideal)</h3>
                <p>Below 3 mph signals temperature inversion risk — fine droplets will suspend and drift unpredictably. Above 10 mph causes spray drift off-target. Above 15 mph is a hard no-go.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Delta T (2–8°C ideal)</h3>
                <p>The difference between dry bulb and wet bulb temperature. Below 2°C indicates inversion conditions. Above 8°C means rapid evaporation — increase water volume or use larger droplets.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Temperature (50–85°F ideal)</h3>
                <p>Below 50°F reduces plant uptake and herbicide performance. Above 85°F increases chemical volatilization, especially for dicamba and 2,4-D formulations.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Rain-Free Window (6+ hours)</h3>
                <p>Most herbicides need 4–6 hours minimum to absorb before rainfall. Fungicides and insecticides may need less. Always check your product label for specific requirements.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Inversion Risk</h3>
                <p>Temperature inversions trap a layer of cool air near the ground. Spray droplets suspend in this layer and can drift miles. Common in early morning, late evening, and calm clear nights.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Humidity (40–80% ideal)</h3>
                <p>Below 40% causes rapid droplet evaporation before reaching the target. Above 90% slows drying and can cause product runoff. The sweet spot maintains droplet integrity through impact.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Get Daily Spray Alerts + Market Prices
            </h2>
            <p className="text-emerald-200 mb-6 max-w-lg mx-auto">
              Create a free account to save your locations, get push notifications when spray windows open, and track commodity prices and USDA program deadlines — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-emerald-900 font-semibold rounded-xl hover:bg-emerald-50 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/check"
                className="inline-flex items-center justify-center px-6 py-3 border border-emerald-400 text-emerald-100 font-semibold rounded-xl hover:bg-emerald-900 transition-colors"
              >
                Try ARC/PLC Calculator
              </Link>
            </div>
          </div>

          {/* Footer attribution */}
          <div className="text-center text-xs text-gray-400 pb-8">
            <p>Weather data provided by Open-Meteo and the National Weather Service.</p>
            <p className="mt-1">Spray conditions are advisory only — always follow your product label requirements.</p>
            <p className="mt-1">Data refreshes every 5 minutes. Last updated: {new Date(data.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
          </div>
        </div>
      )}

      {/* Empty state — no data loaded yet */}
      {!data && !loading && !error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
                <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Enter your location to get started</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Search for your farm by city, county, or zip code — or use your current GPS location for the most accurate spray window analysis.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">7-Factor Analysis</h3>
                <p className="text-sm text-gray-600">Wind, temperature, humidity, Delta T, rain risk, inversion, and daylight — all combined into one clear rating.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">72-Hour Forecast</h3>
                <p className="text-sm text-gray-600">See every spray window for the next 3 days. Plan your week without checking five different weather apps.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">GPS Precision</h3>
                <p className="text-sm text-gray-600">Uses 3km-resolution HRRR weather model data. Not county-level averages — actual conditions at your field.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
