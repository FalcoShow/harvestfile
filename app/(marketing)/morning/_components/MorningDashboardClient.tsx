// =============================================================================
// app/(marketing)/morning/_components/MorningDashboardClient.tsx
// HarvestFile — Build 17 Deploy 3: Morning Dashboard FULL DARK THEME
//
// CLIENT COMPONENT — handles all interactive/data-driven sections:
//   - Morning header with greeting + market status
//   - Quick action links
//   - Payment estimate card (via PaymentEstimateCard — already dark)
//   - Weather card with geolocation + API fetching
//   - Markets card with price polling + PLC impact
//   - Grain bid card (via GrainBidCard)
//
// Build 17 Deploy 3 — FULL DARK THEME:
//   All cards: bg-white → rgba(27,67,50,0.30) with white/6% borders
//   Text hierarchy: white at 90%/60%/30% opacity
//   Borders: gray-100 → white/[0.06]
//   Skeletons: dark shimmer gradients
//   Icons: strokes adjusted for dark backgrounds
//   Accents: gold (#C9A84C) for CTAs, emerald (#34D399) for positive
//   Status colors: desaturated for dark bg readability
//
// Recharts sparklines lazy-loaded to reduce initial JS bundle.
// All data fetches execute in parallel on mount.
// =============================================================================

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import Link from 'next/link';
import { GrainBidCard } from '@/components/grain/GrainBidCard';
import { PaymentEstimateCard } from '@/components/morning/PaymentEstimateCard';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

// Lazy-load Recharts — saves ~80KB from initial bundle
const LazySparkline = lazy(() => import('./SparklineChart'));

// ═══════════════════════════════════════════════════════════════════════════════
// SCROLL ANIMATION HOOK (~500 bytes — CSS-only animations, JS for triggering)
// ═══════════════════════════════════════════════════════════════════════════════

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('hf-animate-in');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/** Wrapper component for scroll-triggered fade-up */
function AnimateIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useScrollAnimation();
  return (
    <div
      ref={ref}
      className={`hf-animate-target ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMODITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface CommodityConfig {
  code: string;
  name: string;
  unit: string;
  unitLabel: string;
  effectiveRefPrice: number;
  loanRate: number;
  color: string;
  nationalAvgYield: number;
  marketingYear: string;
}

const COMMODITIES: Record<string, CommodityConfig> = {
  CORN: {
    code: 'CORN', name: 'Corn', unit: '$/bu', unitLabel: 'bu',
    effectiveRefPrice: 4.42, loanRate: 2.20, color: '#F59E0B',
    nationalAvgYield: 177, marketingYear: 'Sep–Aug',
  },
  SOYBEANS: {
    code: 'SOYBEANS', name: 'Soybeans', unit: '$/bu', unitLabel: 'bu',
    effectiveRefPrice: 10.71, loanRate: 6.20, color: '#059669',
    nationalAvgYield: 51, marketingYear: 'Sep–Aug',
  },
  WHEAT: {
    code: 'WHEAT', name: 'Wheat', unit: '$/bu', unitLabel: 'bu',
    effectiveRefPrice: 6.35, loanRate: 3.38, color: '#D97706',
    nationalAvgYield: 52, marketingYear: 'Jun–May',
  },
};

const COMMODITY_ORDER = ['CORN', 'SOYBEANS', 'WHEAT'];

// ═══════════════════════════════════════════════════════════════════════════════
// CROP ICONS (SVG — premium botanical style, adjusted for dark backgrounds)
// ═══════════════════════════════════════════════════════════════════════════════

function CropIcon({ code, size = 20 }: { code: string; size?: number }) {
  const cfg = COMMODITIES[code];
  const color = cfg?.color || '#6B7280';

  if (code === 'CORN') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" /><path d="M8 6c0 0 4 2 4 6s-4 6-4 6" /><path d="M16 6c0 0-4 2-4 6s4 6 4 6" />
      </svg>
    );
  }
  if (code === 'SOYBEANS') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" /><path d="M12 8v-4" />
      </svg>
    );
  }
  // WHEAT
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v10" /><path d="M8 6l4-4 4 4" /><path d="M4 22c0-4 4-8 8-10" /><path d="M20 22c0-4-4-8-8-10" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET STATUS
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketStatus {
  label: string;
  color: string;
  isLive: boolean;
  nextEvent: string;
}

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const day = ct.getDay();
  const h = ct.getHours() + ct.getMinutes() / 60;

  if (day === 6 || (day === 0 && h < 19))
    return { label: 'Weekend', color: '#6B7280', isLive: false, nextEvent: 'Opens Sun 7 PM CT' };
  if (day === 5 && h >= 13.333)
    return { label: 'Weekend', color: '#6B7280', isLive: false, nextEvent: 'Opens Sun 7 PM CT' };
  if (h >= 19 || h < 7.75)
    return { label: 'Overnight', color: '#3B82F6', isLive: true, nextEvent: 'Day session 8:30 AM' };
  if (h >= 7.75 && h < 8.5)
    return { label: 'Pre-Market', color: '#F59E0B', isLive: false, nextEvent: 'Opens 8:30 AM CT' };
  if (h >= 8.5 && h < 13.333)
    return { label: 'Markets Open', color: '#22C55E', isLive: true, nextEvent: 'Settle 1:15 PM CT' };
  return { label: 'After Hours', color: '#6B7280', isLive: false, nextEvent: 'Overnight 7 PM CT' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLC PAYMENT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calcPLC(price: number, cfg: CommodityConfig) {
  const rate = Math.max(0, cfg.effectiveRefPrice - Math.max(price, cfg.loanRate));
  const perAcre = rate * cfg.nationalAvgYield * 0.85;
  const status = price >= cfg.effectiveRefPrice
    ? ('above' as const)
    : price >= cfg.effectiveRefPrice * 0.95
      ? ('near' as const)
      : ('below' as const);
  return { rate, perAcre, status };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDateHeader(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIMMER SKELETON — DARK THEME (premium loading state)
// ═══════════════════════════════════════════════════════════════════════════════

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] bg-[length:200%_100%] animate-[hf-shimmer_1.4s_ease-in-out_infinite] ${className}`}
    />
  );
}

function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shimmer className="w-5 h-5 rounded" />
        <Shimmer className="w-36 h-4" />
        <div className="flex-1" />
        <Shimmer className="w-24 h-6 rounded-full" />
      </div>
      <div className="flex items-start gap-4 mb-5">
        <Shimmer className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="w-20 h-8" />
          <Shimmer className="w-36 h-4" />
          <Shimmer className="w-48 h-3" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] p-2.5">
            <Shimmer className="w-full h-3 mb-2" />
            <Shimmer className="w-full h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketsSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shimmer className="w-5 h-5 rounded" />
            <Shimmer className="w-36 h-4" />
          </div>
          <Shimmer className="w-24 h-6 rounded-full" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-3">
              <Shimmer className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Shimmer className="w-20 h-4" />
                <Shimmer className="w-32 h-3" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <Shimmer className="w-16 h-5 ml-auto" />
              <Shimmer className="w-20 h-3 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER ICONS (SVG — no external dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  if (code === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="6" fill="#F59E0B" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line key={angle} x1="16" y1="4" x2="16" y2="7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angle} 16 16)`} />
        ))}
      </svg>
    );
  }
  if (code <= 3) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="12" cy="12" r="5" fill="#F59E0B" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <line key={angle} x1="12" y1="4" x2="12" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${angle} 12 12)`} />
        ))}
        <path d="M10 20a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 25 21a4 4 0 0 1-4 4H12a4 4 0 0 1-2-7Z" fill="#94A3B8" />
      </svg>
    );
  }
  if (code <= 48) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M6 14h20M8 18h16M6 22h20" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 10a4 4 0 0 1 3.9-3 3 3 0 0 1 5.5.8A3.5 3.5 0 0 1 22 11a3.5 3.5 0 0 1-3.5 3h-7A3.5 3.5 0 0 1 8 11" fill="#CBD5E1" />
      </svg>
    );
  }
  if (code <= 65) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M8 16a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 17a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
        <line x1="12" y1="24" x2="11" y2="28" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="24" x2="16" y2="28" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="24" x2="21" y2="27" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (code <= 77) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M8 16a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 17a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
        <circle cx="12" cy="26" r="1.2" fill="#93C5FD" />
        <circle cx="17" cy="25" r="1.2" fill="#93C5FD" />
        <circle cx="22" cy="27" r="1.2" fill="#93C5FD" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 14a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 15a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#64748B" />
      <path d="M17 22l-2 4h4l-2 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="22" x2="11" y2="26" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER CARD — DARK THEME
// ═══════════════════════════════════════════════════════════════════════════════

interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDir: string;
    weatherCode: number;
    description: string;
    precip: number;
  };
  daily: Array<{
    date: string;
    dayName: string;
    high: number;
    low: number;
    weatherCode: number;
    precipProb: number;
    precipSum: number;
    windMax: number;
    gdd: number;
  }>;
  soil: {
    temp2in: number;
    temp6in: number;
    moisture: number;
  } | null;
  alerts: Array<{ headline: string; severity: string }>;
  sprayOk: boolean;
}

function parseWeatherResponse(data: any): WeatherData | null {
  if (!data?.data?.forecast?.daily) return null;

  const daily = data.data.forecast.daily;
  const today = daily[0];
  if (!today) return null;

  const windDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  const current = {
    temp: Math.round(today.temp_max_f ?? today.temp_max ?? today.temperature_2m_max ?? 72),
    feelsLike: Math.round(today.apparent_temperature_max ?? today.temp_max_f ?? today.temp_max ?? 72),
    humidity: Math.round(today.humidity_mean ?? today.relative_humidity_2m_mean ?? 65),
    windSpeed: Math.round(today.wind_speed_max_mph ?? today.wind_speed_10m_max ?? today.windspeed_10m_max ?? 8),
    windDir: windDirections[Math.round((today.wind_direction_10m_dominant ?? 0) / 22.5) % 16],
    weatherCode: today.weather_code ?? today.weathercode ?? 0,
    description: today.conditions || getWeatherDescription(today.weather_code ?? today.weathercode ?? 0),
    precip: today.precipitation_mm ?? today.precipitation_sum ?? 0,
  };

  const parsedDaily = daily.slice(0, 5).map((d: any, i: number) => {
    const date = new Date(d.date || d.time);
    return {
      date: d.date || d.time,
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' }),
      high: Math.round(d.temp_max_f ?? d.temp_max ?? d.temperature_2m_max ?? 72),
      low: Math.round(d.temp_min_f ?? d.temp_min ?? d.temperature_2m_min ?? 55),
      weatherCode: d.weather_code ?? d.weathercode ?? 0,
      precipProb: Math.round(d.precipitation_probability ?? d.precipitation_probability_max ?? d.precip_probability ?? 0),
      precipSum: d.precipitation_mm ?? d.precipitation_sum ?? 0,
      windMax: Math.round(d.wind_speed_max_mph ?? d.wind_speed_10m_max ?? d.windspeed_10m_max ?? 8),
      gdd: Math.round(d.gdd_base50 ?? 0),
    };
  });

  const soil = data.data.soil
    ? {
        temp2in: Math.round((data.data.soil.temperature_0cm ?? data.data.soil.soil_temperature_0_to_7cm ?? 55) * 10) / 10,
        temp6in: Math.round((data.data.soil.temperature_18cm ?? data.data.soil.soil_temperature_7_to_28cm ?? 52) * 10) / 10,
        moisture: Math.round((data.data.soil.moisture_1_3cm ?? data.data.soil.soil_moisture_0_to_7cm ?? 0.3) * 100),
      }
    : null;

  const alerts = (data.data.alerts || []).map((a: any) => ({
    headline: a.headline || a.event || 'Weather Alert',
    severity: a.severity || 'moderate',
  }));

  const sprayOk = current.windSpeed < 10 && current.precip < 0.1 && (parsedDaily[0]?.precipProb ?? 0) < 40;

  return { current, daily: parsedDaily, soil, alerts, sprayOk };
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Light drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function WeatherCard({ data }: { data: WeatherData }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header with spray status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Agricultural Weather</h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${
            data.sprayOk
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.sprayOk ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            Spray: {data.sprayOk ? 'GO' : 'HOLD'}
          </span>
        </div>

        {/* Current conditions */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center border border-white/[0.06]">
            <WeatherIcon code={data.current.weatherCode} size={36} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[36px] font-bold text-white leading-none tracking-tight tabular-nums">
                {data.current.temp}°
              </span>
              <span className="text-sm text-white/30 font-medium">F</span>
            </div>
            <p className="text-sm text-white/60 font-medium mt-0.5">{data.current.description}</p>
            <p className="text-xs text-white/30 mt-0.5">
              Feels {data.current.feelsLike}°
              <span className="mx-1.5 text-white/10">·</span>
              Wind {data.current.windSpeed} mph {data.current.windDir}
              <span className="mx-1.5 text-white/10">·</span>
              {data.current.humidity}% humid
            </p>
          </div>
        </div>

        {/* 5-day forecast */}
        <div className="grid grid-cols-5 gap-1.5">
          {data.daily.map((d, i) => (
            <div
              key={d.date}
              className={`rounded-xl p-2.5 text-center transition-colors ${
                i === 0
                  ? 'bg-emerald-500/[0.08] border border-emerald-500/15'
                  : 'bg-white/[0.03] border border-white/[0.04]'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                i === 0 ? 'text-emerald-400' : 'text-white/30'
              }`}>
                {d.dayName}
              </div>
              <div className="flex justify-center mb-1.5">
                <WeatherIcon code={d.weatherCode} size={20} />
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs font-bold text-white/90 tabular-nums">{d.high}°</span>
                <span className="text-[10px] text-white/30 tabular-nums">{d.low}°</span>
              </div>
              {d.precipProb > 0 && (
                <div className="text-[10px] text-blue-400 font-semibold mt-0.5 tabular-nums">{d.precipProb}%</div>
              )}
            </div>
          ))}
        </div>

        {/* Soil + GDD + Wind metrics */}
        {(data.soil || (data.daily[0]?.gdd ?? 0) > 0) && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {data.soil && (
              <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/10 p-3">
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Soil Temp</div>
                <div className="text-lg font-bold text-amber-300 mt-0.5 tabular-nums">
                  {data.soil.temp2in}°<span className="text-[10px] font-medium text-amber-500/60 ml-0.5">2&quot;</span>
                </div>
                {data.soil.temp2in >= 50 && <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Corn: plantable</div>}
              </div>
            )}
            {(data.daily[0]?.gdd ?? 0) > 0 && (
              <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 p-3">
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Today GDD</div>
                <div className="text-lg font-bold text-emerald-300 mt-0.5 tabular-nums">
                  {data.daily[0].gdd}<span className="text-[10px] font-medium text-emerald-500/60 ml-0.5">base 50</span>
                </div>
              </div>
            )}
            <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/10 p-3">
              <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Max Wind</div>
              <div className="text-lg font-bold text-blue-300 mt-0.5 tabular-nums">
                {data.daily[0]?.windMax ?? data.current.windSpeed}
                <span className="text-[10px] font-medium text-blue-500/60 ml-0.5">mph</span>
              </div>
              {(data.daily[0]?.windMax ?? data.current.windSpeed) > 10 && (
                <div className="text-[10px] text-amber-400 font-semibold mt-0.5">Drift risk</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETS CARD — DARK THEME
// ═══════════════════════════════════════════════════════════════════════════════

interface PriceData {
  latestSettle: number | null;
  previousSettle: number | null;
  change: number | null;
  changePct: number | null;
  prices: Array<{ date: string; settle: number | null }>;
}

function MarketsCard({ data, status }: { data: Record<string, PriceData>; status: MarketStatus }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
            </svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Commodity Prices</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: status.color,
                boxShadow: status.isLive ? `0 0 6px ${status.color}` : 'none',
                animation: status.isLive ? 'hf-pulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span className="text-[11px] font-semibold text-white/50">{status.label}</span>
          </div>
        </div>
        <p className="text-[11px] text-white/25 mb-4">CME settlement prices with ARC/PLC payment impact</p>

        <div className="divide-y divide-white/[0.04]">
          {COMMODITY_ORDER.map((code) => {
            const d = data[code];
            const cfg = COMMODITIES[code];
            if (!cfg) return null;

            const price = d?.latestSettle ?? null;
            const change = d?.change ?? null;
            const isUp = change !== null && change >= 0;
            const plc = price ? calcPLC(price, cfg) : null;
            const priceHistory = (d?.prices || []).filter((p) => p.settle !== null);

            return (
              <div key={code} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {/* Crop icon badge */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                    <CropIcon code={code} size={20} />
                  </div>

                  {/* Crop info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white/90">{cfg.name}</div>
                    {plc && (
                      <div
                        className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold ${
                          plc.status === 'above' ? 'text-emerald-400' : plc.status === 'near' ? 'text-amber-400' : 'text-red-400'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${plc.status === 'above' ? 'bg-emerald-400' : plc.status === 'near' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        {plc.status === 'above'
                          ? 'Above ref price'
                          : plc.status === 'near'
                            ? 'Near ref — watch closely'
                            : `PLC: $${plc.rate.toFixed(2)}/${cfg.unitLabel}`}
                      </div>
                    )}
                  </div>

                  {/* Lazy-loaded sparkline */}
                  <div className="w-[80px] h-[36px] flex-shrink-0 hidden sm:block">
                    {priceHistory.length > 3 && (
                      <Suspense fallback={<div className="w-full h-full bg-white/[0.04] rounded animate-pulse" />}>
                        <LazySparkline data={priceHistory.slice(-20)} color={cfg.color} refPrice={cfg.effectiveRefPrice} code={code} />
                      </Suspense>
                    )}
                  </div>

                  {/* Price + change */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-white tracking-[-0.02em] tabular-nums">
                      {price !== null ? `$${price.toFixed(2)}` : '—'}
                    </div>
                    {change !== null && (
                      <div className={`text-xs font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{change.toFixed(2)}
                        {d?.changePct !== null && d?.changePct !== undefined && (
                          <span className="opacity-60 ml-0.5">({isUp ? '+' : ''}{d.changePct.toFixed(1)}%)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* PLC payment projection bar */}
                {plc && plc.rate > 0 && (
                  <div className="mt-2.5 ml-[52px] rounded-lg bg-red-500/[0.08] border border-red-500/15 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] text-red-300 font-medium">Est. PLC payment on national avg yield</span>
                    <span className="text-[11px] text-red-200 font-bold tabular-nums">
                      ≈ ${plc.perAcre.toFixed(0)}/acre
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] px-5 sm:px-6 py-3 flex items-center justify-between bg-white/[0.02]">
        <Link href="/markets" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
          Full market dashboard
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
        <Link href="/check" className="text-xs font-semibold text-[#C9A84C] hover:text-[#E2C366] transition-colors">
          Calculate your payment →
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS BAR — DARK THEME
// ═══════════════════════════════════════════════════════════════════════════════

function QuickActions() {
  const actions = [
    {
      href: '/check',
      label: 'ARC/PLC Calculator',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
    {
      href: '/farm-score',
      label: 'Farm Score',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
        </svg>
      ),
    },
    {
      href: '/weather',
      label: 'Full Weather',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      ),
    },
    {
      href: '/markets',
      label: 'All Markets',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] py-3 px-2 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all group min-h-[72px] justify-center"
        >
          <div className="group-hover:scale-110 transition-transform">{action.icon}</div>
          <span className="text-[10px] font-semibold text-white/40 group-hover:text-white/70 text-center leading-tight transition-colors">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MorningDashboardClient() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [pricesError, setPricesError] = useState('');
  const geo = useGeolocation();

  const marketStatus = useMemo(() => getMarketStatus(), []);

  // ── Fetch Weather ─────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`/api/weather?lat=${geo.lat}&lng=${geo.lng}&crops=CORN,SOYBEANS,WHEAT`);
      if (!res.ok) throw new Error('Weather fetch failed');
      const json = await res.json();
      const parsed = parseWeatherResponse(json);
      if (parsed) setWeather(parsed);
      else throw new Error('Invalid weather data');
    } catch (err: any) {
      setWeatherError(err.message || 'Unable to load weather');
    } finally {
      setWeatherLoading(false);
    }
  }, [geo.lat, geo.lng]);

  // ── Fetch Prices ──────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const codes = COMMODITY_ORDER.join(',');
      const res = await fetch(`/api/prices/futures?commodities=${codes}&days=30`);
      if (!res.ok) throw new Error('Price fetch failed');
      const json = await res.json();
      if (json.success && json.data) {
        setPrices(json.data);
      } else {
        throw new Error(json.error || 'No price data');
      }
    } catch (err: any) {
      setPricesError(err.message || 'Unable to load prices');
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // ── Initial Load (parallel fetch) ────────────────────────────────
  useEffect(() => {
    fetchWeather();
    fetchPrices();
  }, [fetchWeather, fetchPrices]);

  // ── Price Polling (market-aware) ──────────────────────────────────
  useEffect(() => {
    const interval = marketStatus.isLive ? 5 * 60 * 1000 : 30 * 60 * 1000;
    const timer = setInterval(fetchPrices, interval);
    return () => clearInterval(timer);
  }, [marketStatus.isLive, fetchPrices]);

  return (
    <>
      {/* ═══ MORNING HEADER ═══ */}
      <section className="relative bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0f2b1e] pt-24 pb-8 sm:pt-28 sm:pb-10 overflow-hidden">
        <div className="hf-noise-subtle" />
        <div className="relative z-10 mx-auto max-w-[680px] px-5">
          <div className="mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-[-0.03em]">{getGreeting()}</h1>
          </div>
          <p className="text-white/40 text-sm font-medium mb-5">
            {formatDateHeader()}
            {!geo.isDefault && geo.locationName && (
              <span className="text-white/25 ml-2">· {geo.locationName}</span>
            )}
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: marketStatus.color,
                boxShadow: marketStatus.isLive ? `0 0 8px ${marketStatus.color}` : 'none',
                animation: marketStatus.isLive ? 'hf-pulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span className="text-xs font-semibold text-white/80">{marketStatus.label}</span>
            <span className="text-[11px] text-white/30 ml-1">{marketStatus.nextEvent}</span>
          </div>
        </div>
      </section>

      {/* ═══ DASHBOARD CARDS ═══ */}
      <div className="mx-auto max-w-[680px] px-5 -mt-3 space-y-4 pb-4">
        {/* Quick Actions */}
        <AnimateIn>
          <QuickActions />
        </AnimateIn>

        {/* Payment Estimate — THE hero metric (already dark themed) */}
        <AnimateIn delay={75}>
          <PaymentEstimateCard prices={prices} loading={pricesLoading} />
        </AnimateIn>

        {/* Weather Card */}
        <AnimateIn delay={150}>
          {weatherLoading ? (
            <WeatherSkeleton />
          ) : weatherError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center">
              <p className="text-sm text-red-400 font-medium">{weatherError}</p>
              <button
                onClick={() => { setWeatherLoading(true); setWeatherError(''); fetchWeather(); }}
                className="mt-2 text-xs font-semibold text-red-300 underline hover:text-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : weather ? (
            <WeatherCard data={weather} />
          ) : null}
        </AnimateIn>

        {/* Markets Card */}
        <AnimateIn delay={225}>
          {pricesLoading ? (
            <MarketsSkeleton />
          ) : pricesError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center">
              <p className="text-sm text-red-400 font-medium">{pricesError}</p>
              <button
                onClick={() => { setPricesLoading(true); setPricesError(''); fetchPrices(); }}
                className="mt-2 text-xs font-semibold text-red-300 underline hover:text-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <MarketsCard data={prices} status={marketStatus} />
          )}
        </AnimateIn>

        {/* Local Grain Bids */}
        <AnimateIn delay={300}>
          <GrainBidCard
            lat={geo.lat}
            lng={geo.lng}
            compact={true}
            darkMode={true}
            countyName={geo.isDefault ? 'Summit County' : geo.locationName.split(',')[0] || 'Your Area'}
            stateAbbr={geo.isDefault ? 'OH' : geo.locationName.split(',')[1]?.trim() || 'US'}
          />
        </AnimateIn>
      </div>
    </>
  );
}
