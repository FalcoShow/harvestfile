// =============================================================================
// app/(marketing)/morning/_components/ForecastGrid.tsx
// HarvestFile — Surface 2 Deploy 2: Agricultural Forecast Grid
//
// Shows 7-day forecast as compact cards, expandable to 14-day table.
// Each day card shows: weather icon, high/low with temp color bar,
// precipitation %, wind speed, GDD, and a spray suitability dot.
//
// Tapping a card expands it to show humidity, wind gusts, frost risk,
// sunshine hours, and ET₀. Progressive disclosure for mobile.
// =============================================================================

'use client';

import { useState, useMemo } from 'react';
import type { DailyForecast } from '@/lib/hooks/morning';

// ─── Weather Icons (dark-theme optimized, SVG) ───────────────────────────────

function WeatherIcon({ code, size = 24 }: { code: number; size?: number }) {
  if (code === 0) return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="6" fill="#F59E0B" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a} x1="16" y1="4" x2="16" y2="7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 16 16)`} />
      ))}
    </svg>
  );
  if (code <= 3) return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="12" cy="12" r="5" fill="#F59E0B" />
      {[0,60,120,180,240,300].map(a => (
        <line key={a} x1="12" y1="4" x2="12" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
      ))}
      <path d="M10 20a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 25 21a4 4 0 0 1-4 4H12a4 4 0 0 1-2-7Z" fill="#94A3B8" />
    </svg>
  );
  if (code <= 48) return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 14a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 15a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
    </svg>
  );
  if (code <= 65) return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 14a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 15a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
      <line x1="12" y1="22" x2="11" y2="26" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="22" x2="16" y2="26" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="22" x2="21" y2="25" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (code <= 77) return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 14a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 15a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
      <circle cx="12" cy="24" r="1.2" fill="#93C5FD" />
      <circle cx="17" cy="23" r="1.2" fill="#93C5FD" />
      <circle cx="22" cy="25" r="1.2" fill="#93C5FD" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 12a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 13a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#64748B" />
      <path d="M17 20l-2 4h4l-2 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="20" x2="11" y2="24" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tempColor(f: number): string {
  if (f <= 32) return '#60A5FA';
  if (f <= 49) return '#06B6D4';
  if (f <= 64) return '#34D399';
  if (f <= 79) return '#A3E635';
  if (f <= 89) return '#FBBF24';
  if (f <= 99) return '#F97316';
  return '#EF4444';
}

function isSprayFriendly(d: DailyForecast): boolean {
  const wind = d.wind_speed_max_mph ?? 0;
  const precip = d.precipitation_probability ?? 0;
  const temp = d.temp_max_f ?? 72;
  return wind >= 3 && wind <= 10 && precip < 40 && temp <= 85 && temp >= 40;
}

function getConditionLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Overcast';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return '';
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ForecastGridProps {
  daily: DailyForecast[];
}

export default function ForecastGrid({ daily }: ForecastGridProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleDays = useMemo(() => {
    return showAll ? daily.slice(0, 14) : daily.slice(0, 7);
  }, [daily, showAll]);

  if (!daily || daily.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
          </svg>
          <h2 className="text-sm font-semibold text-white/90 tracking-tight">
            {showAll ? '14' : '7'}-Day Agricultural Forecast
          </h2>
        </div>
        {daily.length > 7 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {showAll ? 'Show 7 days' : 'Show 14 days'}
          </button>
        )}
      </div>

      {/* Forecast cards */}
      <div className="space-y-1.5">
        {visibleDays.map((d, i) => {
          const isExpanded = expandedDay === i;
          const isToday = i === 0;
          const spray = isSprayFriendly(d);
          const hasFrostRisk = d.temp_min_f <= 32;
          const weatherCode = (d as any).weather_code ?? (d as any).weathercode ?? (d as any).condition_code ?? 0;

          return (
            <div key={d.date}>
              {/* Compact row */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className={`w-full flex items-center gap-2 sm:gap-3 rounded-xl px-3 py-2.5 transition-colors text-left ${
                  isToday ? 'bg-emerald-500/[0.06] border border-emerald-500/15' :
                  isExpanded ? 'bg-white/[0.06] border border-white/[0.08]' :
                  'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {/* Day label */}
                <div className="w-[52px] sm:w-[60px] flex-shrink-0">
                  <div className={`text-xs font-bold ${isToday ? 'text-emerald-400' : 'text-white/70'}`}>
                    {getDayLabel(d.date, i)}
                  </div>
                  <div className="text-[10px] text-white/25 tabular-nums">{getDateLabel(d.date)}</div>
                </div>

                {/* Weather icon */}
                <div className="flex-shrink-0">
                  <WeatherIcon code={weatherCode} size={22} />
                </div>

                {/* High/Low with inline temp bar */}
                <div className="flex items-center gap-1.5 w-[80px] sm:w-[90px] flex-shrink-0">
                  <span className="text-sm font-bold text-white/90 tabular-nums" style={{ color: tempColor(d.temp_max_f) }}>
                    {Math.round(d.temp_max_f)}°
                  </span>
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(10, ((d.temp_max_f - 20) / 80) * 100))}%`,
                        background: `linear-gradient(90deg, ${tempColor(d.temp_min_f)}, ${tempColor(d.temp_max_f)})`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-white/30 tabular-nums">{Math.round(d.temp_min_f)}°</span>
                </div>

                {/* Precip */}
                <div className="w-[36px] text-center flex-shrink-0 hidden sm:block">
                  <span className={`text-[11px] font-semibold tabular-nums ${
                    d.precipitation_probability > 50 ? 'text-blue-400' : 'text-white/30'
                  }`}>
                    {Math.round(d.precipitation_probability)}%
                  </span>
                </div>

                {/* Wind */}
                <div className="w-[40px] text-center flex-shrink-0 hidden sm:block">
                  <span className={`text-[11px] tabular-nums ${
                    d.wind_speed_max_mph > 15 ? 'text-red-400 font-semibold' :
                    d.wind_speed_max_mph > 10 ? 'text-amber-400' : 'text-white/30'
                  }`}>
                    {Math.round(d.wind_speed_max_mph)}
                    <span className="text-[9px] text-white/20 ml-0.5">mph</span>
                  </span>
                </div>

                {/* GDD */}
                <div className="w-[32px] text-center flex-shrink-0 hidden md:block">
                  <span className={`text-[11px] font-medium tabular-nums ${
                    d.gdd_base50 > 15 ? 'text-emerald-400' : 'text-white/25'
                  }`}>
                    {Math.round(d.gdd_base50)}
                  </span>
                </div>

                {/* Spray dot */}
                <div className="w-[16px] flex-shrink-0 flex justify-center">
                  <span className={`w-2 h-2 rounded-full ${spray ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </div>

                {/* Expand chevron */}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="mt-1.5 ml-4 mr-4 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Conditions</div>
                    <div className="text-xs text-white/70 mt-0.5">{(d as any).conditions || getConditionLabel(weatherCode)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Rain</div>
                    <div className="text-xs text-white/70 mt-0.5 tabular-nums">
                      {Math.round(d.precipitation_probability)}% chance
                      {d.precipitation_mm > 0 && <span className="text-white/40"> · {(d.precipitation_mm / 25.4).toFixed(2)}&quot;</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Wind</div>
                    <div className="text-xs text-white/70 mt-0.5 tabular-nums">
                      {Math.round(d.wind_speed_max_mph)} mph max
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Humidity</div>
                    <div className="text-xs text-white/70 mt-0.5 tabular-nums">
                      {Math.round(d.humidity_avg ?? (d as any).humidity_mean ?? 0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">GDD (base 50)</div>
                    <div className="text-xs text-white/70 mt-0.5 tabular-nums">{d.gdd_base50.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Frost Risk</div>
                    <div className="text-xs mt-0.5">
                      {hasFrostRisk ? (
                        <span className="text-blue-400 font-semibold">Yes — {Math.round(d.temp_min_f)}°F low</span>
                      ) : (
                        <span className="text-white/40">None</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Sunshine</div>
                    <div className="text-xs text-white/70 mt-0.5 tabular-nums">
                      {((d as any).sunshine_hours ?? 0).toFixed(1)}h
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Spray</div>
                    <div className="text-xs mt-0.5">
                      {spray ? (
                        <span className="text-emerald-400 font-semibold">Favorable</span>
                      ) : (
                        <span className="text-red-400 font-semibold">Unfavorable</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-white/25">Spray OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] text-white/25">Not recommended</span>
        </div>
        <span className="text-[10px] text-white/15 ml-auto">Tap row for details</span>
      </div>
    </div>
  );
}
