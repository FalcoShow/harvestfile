// components/sellscore/FarmConditions.tsx
// =============================================================================
// HarvestFile Sell Score — Weather + Spray Conditions (A5 + A6, spec §4.1)
//
// One fetch to the existing GET /api/weather?lat&lng route (Open-Meteo,
// no API key — the /morning legacy weather chain) feeds both cards:
//   A5 — small 7-day forecast strip
//   A6 — spray conditions (seasonal: parent only renders it April–October)
//
// Spray status derives from current conditions using the same thresholds
// as the legacy SprayStatusHero / weather-service spray_safe flag:
//   wind 3–10 mph, temp 45–85°F, Delta-T 3.6–14.4°F ideal (to 18 marginal).
// The morning-store threshold coupling is severed — defaults are inlined.
//
// 58+ rules: 18px body floor, plain-language reason lines.
// =============================================================================
'use client';

import { useEffect, useState } from 'react';
import { colors, fonts, tabularNums } from './_tokens';

interface DailyForecast {
  date: string;
  temp_max_f: number;
  temp_min_f: number;
  precipitation_probability: number;
  wind_speed_max_mph: number;
  conditions: string;
  weather_code: number;
}

interface CurrentConditions {
  temp_f: number;
  humidity: number;
  wind_speed_mph: number;
  wind_gusts_mph: number;
  wind_direction_cardinal: string;
  delta_t_f: number;
  conditions: string;
}

interface WeatherPayload {
  current: CurrentConditions;
  forecast: { daily: DailyForecast[] };
  spray: {
    next_window: { start: string; end: string; duration_hours: number } | null;
  };
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: WeatherPayload };

interface FarmConditionsProps {
  lat: number;
  lng: number;
  /** Spray card is seasonal (April–October); resolved by the host page */
  showSpray: boolean;
}

export default function FarmConditions({ lat, lng, showSpray }: FarmConditionsProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.success || !json.data) throw new Error('bad payload');
        if (!cancelled) setState({ status: 'ready', data: json.data });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (state.status === 'error') {
    return (
      <section
        className="px-6 sm:px-10 py-8 sm:py-10"
        style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
      >
        <SectionLabel>Weather</SectionLabel>
        <p
          className="text-[18px]"
          style={{ color: colors.textSecondary, fontFamily: fonts.body }}
        >
          Weather is unavailable right now.
        </p>
      </section>
    );
  }

  const data = state.status === 'ready' ? state.data : null;

  return (
    <>
      {/* A5 — 7-day weather */}
      <section
        className="px-6 sm:px-10 py-8 sm:py-10"
        style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
      >
        <SectionLabel>7-day weather</SectionLabel>
        {data ? (
          <ForecastStrip daily={data.forecast.daily.slice(0, 7)} />
        ) : (
          <LoadingBlock height={96} />
        )}
      </section>

      {/* A6 — spray conditions (April–October) */}
      {showSpray && (
        <section
          className="px-6 sm:px-10 py-8 sm:py-10"
          style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
        >
          <SectionLabel>Spray conditions</SectionLabel>
          {data ? <SprayCard data={data} /> : <LoadingBlock height={72} />}
        </section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A5 — forecast strip
// ─────────────────────────────────────────────────────────────────────────

function ForecastStrip({ daily }: { daily: DailyForecast[] }) {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {daily.map((d) => {
        const day = new Date(`${d.date}T12:00:00Z`);
        const dayLabel = day.toLocaleDateString('en-US', {
          weekday: 'short',
          timeZone: 'UTC',
        });
        const showPrecip = d.precipitation_probability >= 20;
        return (
          <div key={d.date} className="flex flex-col items-center text-center py-1">
            <div
              className="text-[14px] uppercase mb-2"
              style={{
                color: colors.textTertiary,
                fontFamily: fonts.body,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              {dayLabel}
            </div>
            <div
              className="text-[18px]"
              style={{
                ...tabularNums,
                color: colors.textPrimary,
                fontFamily: fonts.body,
                fontWeight: 600,
              }}
            >
              {Math.round(d.temp_max_f)}°
            </div>
            <div
              className="text-[16px] mt-0.5"
              style={{
                ...tabularNums,
                color: colors.textTertiary,
                fontFamily: fonts.body,
                fontWeight: 400,
              }}
            >
              {Math.round(d.temp_min_f)}°
            </div>
            <div
              className="text-[14px] mt-1.5"
              style={{
                ...tabularNums,
                color: showPrecip ? '#7DD3FC' : 'transparent',
                fontFamily: fonts.body,
                fontWeight: 600,
              }}
              aria-hidden={!showPrecip}
            >
              {showPrecip ? `${Math.round(d.precipitation_probability)}%` : '0'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A6 — spray conditions
// ─────────────────────────────────────────────────────────────────────────

// Inlined legacy defaults (formerly useMorningStore spray thresholds).
const WIND_MIN_MPH = 3;
const WIND_MAX_MPH = 10;
const TEMP_MIN_F = 45;
const TEMP_MAX_F = 85;
const DELTA_T_IDEAL_MIN = 3.6;
const DELTA_T_IDEAL_MAX = 14.4;
const DELTA_T_MARGINAL_MAX = 18;

type SprayStatus = 'GO' | 'CAUTION' | 'NO_GO';

function classifySpray(c: CurrentConditions): { status: SprayStatus; reason: string } {
  if (c.wind_speed_mph < WIND_MIN_MPH) {
    return {
      status: 'NO_GO',
      reason: `Wind under ${WIND_MIN_MPH} mph — inversion risk.`,
    };
  }
  if (c.wind_speed_mph > WIND_MAX_MPH) {
    return {
      status: 'NO_GO',
      reason: `Wind ${Math.round(c.wind_speed_mph)} mph — too windy to spray.`,
    };
  }
  if (c.temp_f < TEMP_MIN_F || c.temp_f > TEMP_MAX_F) {
    return {
      status: 'NO_GO',
      reason: `${Math.round(c.temp_f)}°F is outside the ${TEMP_MIN_F}–${TEMP_MAX_F}°F range.`,
    };
  }
  if (c.delta_t_f < DELTA_T_IDEAL_MIN) {
    return {
      status: 'NO_GO',
      reason: `Delta-T ${c.delta_t_f.toFixed(1)}°F — inversion / too humid.`,
    };
  }
  if (c.delta_t_f > DELTA_T_MARGINAL_MAX) {
    return {
      status: 'NO_GO',
      reason: `Delta-T ${c.delta_t_f.toFixed(1)}°F — too dry, droplets evaporate.`,
    };
  }
  if (c.delta_t_f > DELTA_T_IDEAL_MAX) {
    return {
      status: 'CAUTION',
      reason: `Delta-T ${c.delta_t_f.toFixed(1)}°F is on the dry side. Coarser droplets help.`,
    };
  }
  return {
    status: 'GO',
    reason: `Wind ${Math.round(c.wind_speed_mph)} mph ${c.wind_direction_cardinal} · ${Math.round(c.temp_f)}°F · Delta-T ${c.delta_t_f.toFixed(1)}°F.`,
  };
}

const SPRAY_TONES: Record<SprayStatus, { color: string; label: string }> = {
  GO: { color: colors.emerald, label: 'GO' },
  CAUTION: { color: colors.amber, label: 'CAUTION' },
  NO_GO: { color: colors.warmRed, label: 'NO GO' },
};

function SprayCard({ data }: { data: WeatherPayload }) {
  const { status, reason } = classifySpray(data.current);
  const tone = SPRAY_TONES[status];
  const nextWindow = data.spray.next_window;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="text-[26px]"
          style={{
            color: tone.color,
            fontFamily: fonts.display,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          {tone.label}
        </span>
        <span
          className="text-[16px]"
          style={{
            color: colors.textTertiary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          right now
        </span>
      </div>

      <p
        className="text-[18px]"
        style={{
          ...tabularNums,
          color: colors.textSecondary,
          fontFamily: fonts.body,
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        {reason}
      </p>

      {status !== 'GO' && nextWindow && (
        <p
          className="text-[18px] mt-2"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          Next window:{' '}
          <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
            {formatWindow(nextWindow.start)} · {nextWindow.duration_hours}h
          </span>
        </p>
      )}
    </div>
  );
}

function formatWindow(startIso: string): string {
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return startIso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    hour: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[14px] uppercase mb-6"
      style={{
        color: colors.textTertiary,
        letterSpacing: '0.22em',
        fontWeight: 700,
        fontFamily: fonts.body,
      }}
    >
      {children}
    </div>
  );
}

function LoadingBlock({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl animate-pulse"
      style={{
        height: `${height}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
      }}
      aria-hidden="true"
    />
  );
}
