// =============================================================================
// app/(marketing)/morning/_components/SprayStatusHero.tsx
// HarvestFile — Surface 2 Deploy 2: Spray Go/No-Go Hero Card
//
// THE card that earns the 6 AM daily open. Shows spray status in under
// 1 second — triple-encoded with color + icon + text. Displays the
// limiting factor when conditions are bad, and the next available
// spray window timestamp (the single most valuable data point per DTN).
//
// Derives spray conditions from useWeather() data + Zustand spray slice.
// No additional API calls — pure client-side derivation.
// =============================================================================

'use client';

import { useMemo } from 'react';
import type { WeatherData, DailyForecast } from '@/lib/hooks/morning';
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
}

// ─── Spray Logic ─────────────────────────────────────────────────────────────

function evaluateSprayConditions(
  weather: WeatherData,
  thresholds: { windThresholdMph: number; tempMinF: number; tempMaxF: number; humidityMaxPct: number; inversionAlert: boolean }
): SprayResult {
  const today = weather.forecast?.daily?.[0];
  if (!today) {
    return { status: 'NO_GO', conditions: [], limitingFactor: null, nextWindowLabel: null, windowRemaining: null };
  }

  const windSpeed = today.wind_speed_max_mph ?? 0;
  const tempMax = today.temp_max_f ?? 72;
  const tempMin = today.temp_min_f ?? 50;
  const humidity = today.humidity_avg ?? 65;
  const precipProb = today.precipitation_probability ?? 0;
  const precipMm = today.precipitation_mm ?? 0;

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

  // Temperature check
  const tempCurrent = Math.round((tempMax + tempMin) / 2);
  const tempStatus: 'safe' | 'marginal' | 'unsafe' =
    tempMax > thresholds.tempMaxF || tempMin < thresholds.tempMinF ? 'unsafe' :
    tempMax > thresholds.tempMaxF * 0.95 ? 'marginal' : 'safe';

  conditions.push({
    factor: 'Temp',
    value: tempCurrent,
    unit: '°F',
    status: tempStatus,
    label: tempMax > thresholds.tempMaxF ? 'Too hot — volatilization risk' : tempMin < thresholds.tempMinF ? 'Too cold' : 'In range',
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

  // Rain check — need 4h rain-free minimum
  const rainStatus: 'safe' | 'marginal' | 'unsafe' =
    precipProb > 70 || precipMm > 5 ? 'unsafe' :
    precipProb > 40 ? 'marginal' : 'safe';

  conditions.push({
    factor: 'Rain',
    value: Math.round(precipProb),
    unit: '% chance',
    status: rainStatus,
    label: precipProb > 70 ? 'Rain likely — washoff risk' : precipProb > 40 ? 'Monitor closely' : 'Low risk',
    threshold: '< 40% preferred',
  });

  // Determine overall status
  const hasUnsafe = conditions.some(c => c.status === 'unsafe');
  const hasMarginal = conditions.some(c => c.status === 'marginal');
  const status: SprayStatus = hasUnsafe ? 'NO_GO' : hasMarginal ? 'CAUTION' : 'GO';

  // Find worst factor
  const limitingFactor = conditions.find(c => c.status === 'unsafe') || conditions.find(c => c.status === 'marginal') || null;

  // Estimate next window (simple: check next few days)
  let nextWindowLabel: string | null = null;
  if (status === 'NO_GO' && weather.forecast?.daily) {
    const daily = weather.forecast.daily;
    for (let i = 1; i < Math.min(daily.length, 5); i++) {
      const d = daily[i];
      const w = d.wind_speed_max_mph ?? 0;
      const p = d.precipitation_probability ?? 0;
      const tMax = d.temp_max_f ?? 72;
      if (w >= 3 && w <= thresholds.windThresholdMph && p < 40 && tMax <= thresholds.tempMaxF) {
        const dayDate = new Date(d.date + 'T12:00:00');
        const dayName = i === 1 ? 'Tomorrow' : dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        nextWindowLabel = `${dayName} 6:00 AM`;
        break;
      }
    }
  }

  // Estimate remaining window if GO
  let windowRemaining: string | null = null;
  if (status === 'GO') {
    const now = new Date();
    const h = now.getHours();
    // Assume spray window closes at ~2 PM (wind typically picks up)
    const hoursLeft = Math.max(0, 14 - h);
    if (hoursLeft > 0) {
      windowRemaining = `${hoursLeft}h remaining`;
    }
  }

  return { status, conditions, limitingFactor, nextWindowLabel, windowRemaining };
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
    sublabel: 'Conditions within thresholds',
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
          {/* Window info */}
          <div className="flex-shrink-0 text-right hidden sm:block">
            {result.windowRemaining && (
              <div className="text-sm font-bold text-emerald-400 tabular-nums">{result.windowRemaining}</div>
            )}
            {result.nextWindowLabel && (
              <div className="text-[11px] text-white/30">
                Next window: <span className="text-white/60 font-semibold">{result.nextWindowLabel}</span>
              </div>
            )}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

        {/* Mobile: window info */}
        <div className="sm:hidden mt-3">
          {result.windowRemaining && (
            <div className="text-sm font-bold text-emerald-400 tabular-nums text-center">{result.windowRemaining}</div>
          )}
          {result.nextWindowLabel && (
            <div className="text-[11px] text-white/30 text-center mt-1">
              Next window: <span className="text-white/60 font-semibold">{result.nextWindowLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
