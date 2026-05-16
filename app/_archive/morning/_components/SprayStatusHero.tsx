// =============================================================================
// app/(marketing)/morning/_components/SprayStatusHero.tsx
// HarvestFile — Surface 2 Deploy 2B-P2: Spray Go/No-Go Hero Card
//
// DEPLOY 2B-P2 REWRITE:
//   - Derives spray from weatherData.current block (real wind/humidity/Delta T)
//     instead of daily forecast maximums — accurate real-time decisions
//   - Wind direction with drift arrow SVG
//   - Shows spray.next_window from API (e.g. "Next: Wed 7PM, 4h window")
//   - Delta T factor added (THE most important spray safety metric)
//   - Falls back gracefully to daily data if current block unavailable
//
// THE card that earns the 6 AM daily open. Shows spray status in under
// 1 second — triple-encoded with color + icon + text. Displays the
// limiting factor when conditions are bad, and the next available
// spray window timestamp (the single most valuable data point per DTN).
// =============================================================================

'use client';

import { useMemo } from 'react';
import type { WeatherData } from '@/lib/hooks/morning';
import { useMorningStore } from '@/lib/stores/morning-store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SprayCondition {
  factor: string;
  value: number;
  unit: string;
  status: 'safe' | 'marginal' | 'unsafe';
  label: string;
  threshold: string;
}

type SprayStatus = 'GO' | 'CAUTION' | 'NO_GO';

interface SprayResult {
  status: SprayStatus;
  conditions: SprayCondition[];
  limitingFactor: SprayCondition | null;
  nextWindowLabel: string | null;
  windowRemaining: string | null;
  windDirection: string | null;
  windDeg: number | null;
}

// ─── Spray Logic — NOW USES CURRENT BLOCK ────────────────────────────────────

function evaluateSprayConditions(
  weather: WeatherData,
  thresholds: { windThresholdMph: number; tempMinF: number; tempMaxF: number; humidityMaxPct: number; inversionAlert: boolean }
): SprayResult {
  // Prefer current block (real-time 15-min data) over daily forecast
  const current = (weather as any).current;
  const today = weather.forecast?.daily?.[0];
  const hasCurrent = !!current;

  if (!hasCurrent && !today) {
    return { status: 'NO_GO', conditions: [], limitingFactor: null, nextWindowLabel: null, windowRemaining: null, windDirection: null, windDeg: null };
  }

  // Extract values — current block takes priority
  const windSpeed = hasCurrent ? (current.wind_speed_mph ?? 0) : (today?.wind_speed_max_mph ?? 0);
  const windGusts = hasCurrent ? (current.wind_gusts_mph ?? 0) : (today?.wind_gusts_mph ?? 0);
  const temp = hasCurrent ? (current.temp_f ?? 72) : ((today?.temp_max_f ?? 72 + (today?.temp_min_f ?? 50)) / 2);
  const humidity = hasCurrent ? (current.humidity ?? 65) : (today?.humidity_avg ?? today?.humidity_mean ?? 65);
  const precipProb = hasCurrent ? (current.precipitation_probability ?? 0) : (today?.precipitation_probability ?? 0);
  const deltaT = hasCurrent ? (current.delta_t_f ?? null) : null;
  const windDir = hasCurrent ? (current.wind_direction_cardinal ?? null) : null;
  const windDeg = hasCurrent ? (current.wind_direction_deg ?? null) : null;

  const conditions: SprayCondition[] = [];

  // Wind check — calm winds (< 3 mph) indicate inversion risk
  const windStatus: 'safe' | 'marginal' | 'unsafe' =
    windSpeed < 3 && thresholds.inversionAlert ? 'unsafe' :
    windSpeed > thresholds.windThresholdMph ? 'unsafe' :
    windSpeed > thresholds.windThresholdMph * 0.8 ? 'marginal' : 'safe';

  conditions.push({
    factor: 'Wind',
    value: Math.round(windSpeed),
    unit: 'mph',
    status: windStatus,
    label: windSpeed < 3 ? 'Inversion likely' : windStatus === 'safe' ? 'Safe range' : windSpeed > thresholds.windThresholdMph ? 'Too high' : 'Near limit',
    threshold: `3–${thresholds.windThresholdMph} mph`,
  });

  // Temperature check — using actual current temp, not daily max
  const tempStatus: 'safe' | 'marginal' | 'unsafe' =
    temp > thresholds.tempMaxF || temp < thresholds.tempMinF ? 'unsafe' :
    temp > thresholds.tempMaxF * 0.95 || temp < thresholds.tempMinF * 1.1 ? 'marginal' : 'safe';

  conditions.push({
    factor: 'Temp',
    value: Math.round(temp),
    unit: '°F',
    status: tempStatus,
    label: temp > thresholds.tempMaxF ? 'Too hot — volatilization risk' : temp < thresholds.tempMinF ? 'Too cold' : 'In range',
    threshold: `${thresholds.tempMinF}–${thresholds.tempMaxF}°F`,
  });

  // Humidity check
  const humidityStatus: 'safe' | 'marginal' | 'unsafe' =
    humidity < 40 ? 'unsafe' :
    humidity > thresholds.humidityMaxPct ? 'marginal' :
    humidity < 50 ? 'marginal' : 'safe';

  conditions.push({
    factor: 'Humidity',
    value: Math.round(humidity),
    unit: '%',
    status: humidityStatus,
    label: humidity < 40 ? 'Extreme evaporation' : humidity > thresholds.humidityMaxPct ? 'High — droplet linger' : 'Adequate',
    threshold: `50–${thresholds.humidityMaxPct}%`,
  });

  // Delta T check — THE critical spray metric (only from current block)
  if (deltaT !== null) {
    const deltaTStatus: 'safe' | 'marginal' | 'unsafe' =
      deltaT >= 3.6 && deltaT <= 14.4 ? 'safe' :
      (deltaT > 14.4 && deltaT <= 18) || (deltaT < 3.6 && deltaT >= 1.8) ? 'marginal' : 'unsafe';

    conditions.push({
      factor: 'Delta T',
      value: Math.round(deltaT * 10) / 10,
      unit: '°F',
      status: deltaTStatus,
      label: deltaT < 1.8 ? 'Inversion risk' : deltaT > 18 ? 'Rapid evaporation' : deltaTStatus === 'safe' ? 'Ideal range' : 'Monitor',
      threshold: '3.6–14.4°F',
    });
  } else {
    // Fallback: Rain check when Delta T unavailable
    const rainStatus: 'safe' | 'marginal' | 'unsafe' =
      precipProb > 70 ? 'unsafe' :
      precipProb > 40 ? 'marginal' : 'safe';

    conditions.push({
      factor: 'Rain',
      value: Math.round(precipProb),
      unit: '% chance',
      status: rainStatus,
      label: precipProb > 70 ? 'Rain likely — washoff risk' : precipProb > 40 ? 'Monitor closely' : 'Low risk',
      threshold: '< 40% preferred',
    });
  }

  // Determine overall status
  const hasUnsafe = conditions.some(c => c.status === 'unsafe');
  const hasMarginal = conditions.some(c => c.status === 'marginal');
  const status: SprayStatus = hasUnsafe ? 'NO_GO' : hasMarginal ? 'CAUTION' : 'GO';

  // Find worst factor
  const limitingFactor = conditions.find(c => c.status === 'unsafe') || conditions.find(c => c.status === 'marginal') || null;

  // Use spray.next_window from API (computed server-side from hourly data)
  let nextWindowLabel: string | null = null;
  const sprayWindow = (weather as any).spray?.next_window;
  if (sprayWindow && status !== 'GO') {
    const start = new Date(sprayWindow.start);
    const now = new Date();
    const isToday = start.toDateString() === now.toDateString();
    const isTomorrow = start.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : start.toLocaleDateString('en-US', { weekday: 'short' });
    const timeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    nextWindowLabel = `${dayLabel} ${timeLabel} · ${sprayWindow.duration_hours}h window`;
  }

  // Estimate remaining window if GO
  let windowRemaining: string | null = null;
  if (status === 'GO') {
    const now = new Date();
    const h = now.getHours();
    const hoursLeft = Math.max(0, 14 - h);
    if (hoursLeft > 0) {
      windowRemaining = `${hoursLeft}h remaining`;
    }
  }

  return { status, conditions, limitingFactor, nextWindowLabel, windowRemaining, windDirection: windDir, windDeg };
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  GO: {
    bg: 'bg-emerald-500/[0.08]',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-300',
    label: 'SAFE TO SPRAY',
    sublabel: 'All conditions within thresholds',
    dotColor: '#22C55E',
  },
  CAUTION: {
    bg: 'bg-amber-500/[0.08]',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-300',
    label: 'CHECK CONDITIONS',
    sublabel: 'One or more factors marginal',
    dotColor: '#F59E0B',
  },
  NO_GO: {
    bg: 'bg-red-500/[0.08]',
    border: 'border-red-500/20',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    textColor: 'text-red-300',
    label: 'DO NOT SPRAY',
    sublabel: 'Conditions exceed safe thresholds',
    dotColor: '#EF4444',
  },
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function CheckIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}

function XIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  );
}

// ─── Wind Direction Arrow ────────────────────────────────────────────────────

function WindArrow({ deg, size = 20 }: { deg: number; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path d="M12 2L8 10h3v12h2V10h3L12 2z" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SprayStatusHeroProps {
  weather: WeatherData;
}

export default function SprayStatusHero({ weather }: SprayStatusHeroProps) {
  const spray = useMorningStore(s => s.spray);

  const result = useMemo(() =>
    evaluateSprayConditions(weather, spray),
    [weather, spray]
  );

  const cfg = STATUS_CONFIG[result.status];
  const StatusIcon = result.status === 'GO' ? CheckIcon : result.status === 'CAUTION' ? AlertIcon : XIcon;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 sm:p-6 relative overflow-hidden`}>
      {/* Subtle glow */}
      <div
        className="absolute top-0 right-0 w-[300px] h-[200px] pointer-events-none opacity-30"
        style={{ background: `radial-gradient(ellipse at top right, ${cfg.dotColor}15, transparent 70%)` }}
      />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
          </svg>
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.1em]">Spray Conditions</span>
          {(weather as any).current && (
            <span className="text-[10px] text-white/20 ml-auto">Live conditions</span>
          )}
        </div>

        {/* Hero status */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${cfg.iconBg} flex items-center justify-center ${cfg.iconColor}`}>
            <StatusIcon size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xl sm:text-2xl font-bold ${cfg.textColor} tracking-tight`}>
              {cfg.label}
            </div>
            <div className="text-xs text-white/30 mt-0.5">{cfg.sublabel}</div>
          </div>
          {/* Wind direction + window info */}
          <div className="flex-shrink-0 text-right hidden sm:flex items-center gap-3">
            {result.windDeg !== null && result.windDirection && (
              <div className="flex items-center gap-1.5">
                <WindArrow deg={result.windDeg} size={18} />
                <div>
                  <div className="text-xs font-bold text-white/60">{result.windDirection}</div>
                  <div className="text-[10px] text-white/25">drift</div>
                </div>
              </div>
            )}
            <div>
              {result.windowRemaining && (
                <div className="text-sm font-bold text-emerald-400 tabular-nums">{result.windowRemaining}</div>
              )}
              {result.nextWindowLabel && (
                <div className="text-[11px] text-white/30">
                  Next: <span className="text-white/60 font-semibold">{result.nextWindowLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Limiting factor callout */}
        {result.limitingFactor && (
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5 mb-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dotColor }} />
            <span className="text-xs text-white/60">
              <span className="font-semibold text-white/80">{result.limitingFactor.factor}:</span>{' '}
              {result.limitingFactor.value}{result.limitingFactor.unit} — {result.limitingFactor.label}
            </span>
            <span className="text-[10px] text-white/25 ml-auto flex-shrink-0">{result.limitingFactor.threshold}</span>
          </div>
        )}

        {/* Condition factor pills */}
        <div className={`grid gap-2 ${result.conditions.length > 4 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {result.conditions.map(c => (
            <div
              key={c.factor}
              className={`rounded-xl px-3 py-2.5 border ${
                c.status === 'safe' ? 'bg-emerald-500/[0.06] border-emerald-500/15' :
                c.status === 'marginal' ? 'bg-amber-500/[0.06] border-amber-500/15' :
                'bg-red-500/[0.06] border-red-500/15'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  c.status === 'safe' ? 'bg-emerald-400' : c.status === 'marginal' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{c.factor}</span>
              </div>
              <div className="text-lg font-bold text-white/90 tabular-nums leading-none">
                {c.value}<span className="text-[10px] font-medium text-white/30 ml-0.5">{c.unit.replace('% chance', '%')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: wind direction + window info */}
        <div className="sm:hidden mt-3">
          {result.windDeg !== null && result.windDirection && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <WindArrow deg={result.windDeg} size={16} />
              <span className="text-xs font-semibold text-white/50">Wind from {result.windDirection}</span>
            </div>
          )}
          {result.windowRemaining && (
            <div className="text-sm font-bold text-emerald-400 tabular-nums text-center">{result.windowRemaining}</div>
          )}
          {result.nextWindowLabel && (
            <div className="text-[11px] text-white/30 text-center mt-1">
              Next: <span className="text-white/60 font-semibold">{result.nextWindowLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
