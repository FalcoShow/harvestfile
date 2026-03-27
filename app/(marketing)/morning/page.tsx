// =============================================================================
// app/(marketing)/morning/page.tsx
// HarvestFile — Consolidation Phase 2, Build 1: Morning Dashboard MVP
//
// THE daily engagement page. The "5 AM coffee check" that turns HarvestFile
// from a seasonal tool into a daily habit. This is HarvestFile's Credit Karma
// home screen — the first thing 50,000 farmers see every morning.
//
// Build 1 delivers: Morning header, Weather card, Markets card with PLC
// payment impact, USDA report calendar, and skeleton loading states.
// All mobile-first. All premium. LCP target: < 2.5s on 3G.
//
// Data sources:
//   Weather: /api/weather (Open-Meteo via lib/services/weather)
//   Prices:  /api/prices/futures (Nasdaq Data Link / Yahoo Finance)
//
// Architecture: Single client component with parallel data fetching,
// stale-while-revalidate caching, and shimmer skeleton states.
// =============================================================================

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { GrainBidCard } from '@/components/grain/GrainBidCard';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

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
// USDA REPORT CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

interface USDAReport {
  name: string;
  date: string;
  impact: 'high' | 'medium';
  shortDesc: string;
}

function getUpcomingReports(): USDAReport[] {
  const now = new Date();
  const reports: USDAReport[] = [
    { name: 'Prospective Plantings', date: '2026-03-31', impact: 'high', shortDesc: '2026 planted acre intentions' },
    { name: 'Grain Stocks', date: '2026-03-31', impact: 'high', shortDesc: 'Quarterly stocks report' },
    { name: 'WASDE', date: '2026-04-09', impact: 'high', shortDesc: 'Supply & demand estimates' },
    { name: 'Crop Progress', date: '2026-04-06', impact: 'medium', shortDesc: 'Weekly planting & conditions' },
    { name: 'Export Sales', date: '2026-03-26', impact: 'medium', shortDesc: 'Weekly export commitments' },
    { name: 'Export Sales', date: '2026-04-02', impact: 'medium', shortDesc: 'Weekly export commitments' },
    { name: 'WASDE', date: '2026-05-12', impact: 'high', shortDesc: 'First new-crop estimates' },
    { name: 'Acreage Report', date: '2026-06-30', impact: 'high', shortDesc: 'Actual planted acres' },
    { name: 'WASDE', date: '2026-06-11', impact: 'high', shortDesc: 'Updated balance sheets' },
    { name: 'WASDE', date: '2026-07-10', impact: 'high', shortDesc: 'Mid-year estimates' },
    { name: 'WASDE', date: '2026-08-12', impact: 'high', shortDesc: 'First production estimates' },
  ];
  return reports
    .filter(r => new Date(r.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLC PAYMENT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calcPLC(price: number, cfg: CommodityConfig) {
  const rate = Math.max(0, cfg.effectiveRefPrice - Math.max(price, cfg.loanRate));
  const perAcre = rate * cfg.nationalAvgYield * 0.85;
  const status = price >= cfg.effectiveRefPrice
    ? 'above' as const
    : price >= cfg.effectiveRefPrice * 0.95
    ? 'near' as const
    : 'below' as const;
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

// Default coordinates (Akron/Summit County, Ohio)
const DEFAULT_LAT = 41.085;
const DEFAULT_LNG = -81.518;

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`}
      style={{ animation: 'hf-shimmer 1.5s ease-in-out infinite' }}
    />
  );
}

function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <SkeletonPulse className="w-5 h-5 rounded" />
        <SkeletonPulse className="w-32 h-4" />
      </div>
      <div className="flex items-start gap-4 mb-5">
        <SkeletonPulse className="w-20 h-16 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="w-48 h-5" />
          <SkeletonPulse className="w-36 h-4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-xl bg-gray-50 p-3">
            <SkeletonPulse className="w-12 h-3 mb-2" />
            <SkeletonPulse className="w-16 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketsSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-5 h-5 rounded" />
          <SkeletonPulse className="w-36 h-4" />
        </div>
        <SkeletonPulse className="w-24 h-5 rounded-full" />
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <SkeletonPulse className="w-20 h-4" />
              <SkeletonPulse className="w-28 h-3" />
            </div>
          </div>
          <div className="text-right space-y-1.5">
            <SkeletonPulse className="w-16 h-5 ml-auto" />
            <SkeletonPulse className="w-20 h-3 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER ICONS (SVG — no external dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  // WMO weather codes → SVG icons (no emojis)
  const s = size;
  const half = s / 2;

  if (code === 0) {
    // Clear sky — sun
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="6" fill="#F59E0B" />
        {[0,45,90,135,180,225,270,315].map(angle => (
          <line key={angle} x1="16" y1="4" x2="16" y2="7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${angle} 16 16)`} />
        ))}
      </svg>
    );
  }
  if (code <= 3) {
    // Partly cloudy — sun + cloud
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <circle cx="12" cy="12" r="5" fill="#F59E0B" />
        {[0,60,120,180,240,300].map(angle => (
          <line key={angle} x1="12" y1="4" x2="12" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"
            transform={`rotate(${angle} 12 12)`} />
        ))}
        <path d="M10 20a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 25 21a4 4 0 0 1-4 4H12a4 4 0 0 1-2-7Z" fill="#94A3B8" />
      </svg>
    );
  }
  if (code <= 48) {
    // Fog
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <path d="M6 14h20M8 18h16M6 22h20" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 10a4 4 0 0 1 3.9-3 3 3 0 0 1 5.5.8A3.5 3.5 0 0 1 22 11a3.5 3.5 0 0 1-3.5 3h-7A3.5 3.5 0 0 1 8 11" fill="#CBD5E1" />
      </svg>
    );
  }
  if (code <= 65) {
    // Rain
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <path d="M8 16a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 17a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
        <line x1="12" y1="24" x2="11" y2="28" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="24" x2="16" y2="28" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="24" x2="21" y2="27" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (code <= 77) {
    // Snow
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <path d="M8 16a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 17a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" />
        <circle cx="12" cy="26" r="1.2" fill="#93C5FD" />
        <circle cx="17" cy="25" r="1.2" fill="#93C5FD" />
        <circle cx="22" cy="27" r="1.2" fill="#93C5FD" />
      </svg>
    );
  }
  // Thunderstorm / showers
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M8 14a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 15a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#64748B" />
      <path d="M17 22l-2 4h4l-2 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="22" x2="11" y2="26" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER CARD
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

  const windDirections = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

  // Build current conditions from today's data
  const current = {
    temp: Math.round(today.temp_max ?? today.temperature_2m_max ?? 72),
    feelsLike: Math.round(today.apparent_temperature_max ?? today.temp_max ?? 72),
    humidity: Math.round(today.relative_humidity_2m_mean ?? 65),
    windSpeed: Math.round(today.wind_speed_10m_max ?? today.windspeed_10m_max ?? 8),
    windDir: windDirections[Math.round((today.wind_direction_10m_dominant ?? 0) / 22.5) % 16],
    weatherCode: today.weather_code ?? today.weathercode ?? 0,
    description: getWeatherDescription(today.weather_code ?? today.weathercode ?? 0),
    precip: today.precipitation_sum ?? 0,
  };

  const parsedDaily = daily.slice(0, 5).map((d: any, i: number) => {
    const date = new Date(d.date || d.time);
    return {
      date: d.date || d.time,
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' }),
      high: Math.round(d.temp_max ?? d.temperature_2m_max ?? 72),
      low: Math.round(d.temp_min ?? d.temperature_2m_min ?? 55),
      weatherCode: d.weather_code ?? d.weathercode ?? 0,
      precipProb: Math.round(d.precipitation_probability_max ?? d.precip_probability ?? 0),
      precipSum: d.precipitation_sum ?? 0,
      windMax: Math.round(d.wind_speed_10m_max ?? d.windspeed_10m_max ?? 8),
      gdd: Math.round(d.gdd_base50 ?? 0),
    };
  });

  const soil = data.data.soil ? {
    temp2in: Math.round((data.data.soil.temperature_0cm ?? data.data.soil.soil_temperature_0_to_7cm ?? 55) * 10) / 10,
    temp6in: Math.round((data.data.soil.temperature_18cm ?? data.data.soil.soil_temperature_7_to_28cm ?? 52) * 10) / 10,
    moisture: Math.round((data.data.soil.moisture_1_3cm ?? data.data.soil.soil_moisture_0_to_7cm ?? 0.3) * 100),
  } : null;

  const alerts = (data.data.alerts || []).map((a: any) => ({
    headline: a.headline || a.event || 'Weather Alert',
    severity: a.severity || 'moderate',
  }));

  // Spray conditions: wind < 10 mph and no precip
  const sprayOk = current.windSpeed < 10 && current.precip < 0.1 &&
    (parsedDaily[0]?.precipProb ?? 0) < 40;

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
  return 'Thunderstorm';
}

function WeatherCard({ data }: { data: WeatherData }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Alerts banner */}
      {data.alerts.length > 0 && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>
            {data.alerts[0].headline}
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Agricultural Weather</h2>
          </div>
          {/* Spray status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            data.sprayOk
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.sprayOk ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            Spray: {data.sprayOk ? 'GO' : 'HOLD'}
          </div>
        </div>

        {/* Current conditions hero */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-shrink-0 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center border border-blue-100/50">
            <WeatherIcon code={data.current.weatherCode} size={38} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-gray-900 tracking-[-0.03em]">
                {data.current.temp}°
              </span>
              <span className="text-sm text-gray-400 font-medium">F</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{data.current.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span>Feels {data.current.feelsLike}°</span>
              <span>·</span>
              <span>Wind {data.current.windSpeed} mph {data.current.windDir}</span>
              <span>·</span>
              <span>{data.current.humidity}% humid</span>
            </div>
          </div>
        </div>

        {/* 5-day forecast strip */}
        <div className="grid grid-cols-5 gap-2">
          {data.daily.map((d, i) => (
            <div
              key={d.date}
              className={`rounded-xl p-2.5 text-center transition-colors ${
                i === 0 ? 'bg-[#1B4332]/[0.04] border border-[#1B4332]/10' : 'bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                {d.dayName}
              </div>
              <WeatherIcon code={d.weatherCode} size={20} />
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-xs font-bold text-gray-900">{d.high}°</span>
                <span className="text-[10px] text-gray-400">{d.low}°</span>
              </div>
              {d.precipProb > 0 && (
                <div className="text-[10px] text-blue-500 font-semibold mt-0.5">
                  {d.precipProb}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ag-specific metrics */}
        {(data.soil || data.daily[0]?.gdd > 0) && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {data.soil && (
              <div className="rounded-xl bg-amber-50/60 border border-amber-100/50 p-3">
                <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Soil Temp</div>
                <div className="text-lg font-extrabold text-amber-800 mt-0.5">
                  {data.soil.temp2in}°
                  <span className="text-[10px] font-medium text-amber-500 ml-0.5">2"</span>
                </div>
                {data.soil.temp2in >= 50 && (
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Corn: plantable</div>
                )}
              </div>
            )}
            {data.daily[0]?.gdd > 0 && (
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100/50 p-3">
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Today GDD</div>
                <div className="text-lg font-extrabold text-emerald-800 mt-0.5">
                  {data.daily[0].gdd}
                  <span className="text-[10px] font-medium text-emerald-500 ml-0.5">base 50</span>
                </div>
              </div>
            )}
            <div className="rounded-xl bg-blue-50/60 border border-blue-100/50 p-3">
              <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Max Wind</div>
              <div className="text-lg font-extrabold text-blue-800 mt-0.5">
                {data.daily[0]?.windMax ?? data.current.windSpeed}
                <span className="text-[10px] font-medium text-blue-500 ml-0.5">mph</span>
              </div>
              {(data.daily[0]?.windMax ?? data.current.windSpeed) > 10 && (
                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Drift risk</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETS CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface PriceData {
  latestSettle: number | null;
  previousSettle: number | null;
  change: number | null;
  changePct: number | null;
  prices: Array<{ date: string; settle: number | null }>;
}

function MarketsCard({
  data,
  status,
}: {
  data: Record<string, PriceData>;
  status: MarketStatus;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header with market status */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>
            </svg>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Commodity Prices</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: status.color,
                boxShadow: status.isLive ? `0 0 6px ${status.color}` : 'none',
                animation: status.isLive ? 'hf-pulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span className="text-[11px] font-semibold text-gray-500">{status.label}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mb-4">
          CME settlement prices with ARC/PLC payment impact
        </p>

        {/* Commodity rows */}
        <div className="divide-y divide-gray-50">
          {COMMODITY_ORDER.map((code) => {
            const d = data[code];
            const cfg = COMMODITIES[code];
            if (!cfg) return null;

            const price = d?.latestSettle ?? null;
            const change = d?.change ?? null;
            const isUp = change !== null && change >= 0;
            const plc = price ? calcPLC(price, cfg) : null;
            const priceHistory = (d?.prices || []).filter(p => p.settle !== null);

            return (
              <div key={code} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {/* Commodity icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${cfg.color}12` }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {code === 'CORN' ? (
                        <><path d="M12 2v20"/><path d="M8 6c0 0 4 2 4 6s-4 6-4 6"/><path d="M16 6c0 0-4 2-4 6s4 6 4 6"/></>
                      ) : code === 'SOYBEANS' ? (
                        <><circle cx="9" cy="12" r="4"/><circle cx="15" cy="12" r="4"/><path d="M12 8v-4"/></>
                      ) : (
                        <><path d="M12 2v10"/><path d="M8 6l4-4 4 4"/><path d="M4 22c0-4 4-8 8-10"/><path d="M20 22c0-4-4-8-8-10"/></>
                      )}
                    </svg>
                  </div>

                  {/* Name + PLC badge */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">{cfg.name}</div>
                    {plc && (
                      <div className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold ${
                        plc.status === 'above' ? 'text-emerald-600' :
                        plc.status === 'near' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          plc.status === 'above' ? 'bg-emerald-500' :
                          plc.status === 'near' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        {plc.status === 'above' ? 'Above ref price' :
                         plc.status === 'near' ? `Near ref — watch closely` :
                         `PLC: $${plc.rate.toFixed(2)}/${cfg.unitLabel}`}
                      </div>
                    )}
                  </div>

                  {/* Mini sparkline */}
                  <div className="w-[80px] h-[36px] flex-shrink-0 hidden sm:block">
                    {priceHistory.length > 3 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceHistory.slice(-20)}>
                          <defs>
                            <linearGradient id={`morn-${code}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={cfg.color} stopOpacity={0.15} />
                              <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="settle"
                            stroke={cfg.color}
                            strokeWidth={1.5}
                            fill={`url(#morn-${code})`}
                            isAnimationActive={false}
                            dot={false}
                          />
                          <ReferenceLine
                            y={cfg.effectiveRefPrice}
                            stroke="#EF4444"
                            strokeDasharray="2 2"
                            strokeWidth={0.8}
                            strokeOpacity={0.5}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Price + change */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-extrabold text-gray-900 tracking-[-0.02em]">
                      {price !== null ? `$${price.toFixed(2)}` : '—'}
                    </div>
                    {change !== null && (
                      <div className={`text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{change.toFixed(2)}
                        {d?.changePct !== null && d?.changePct !== undefined && (
                          <span className="opacity-60 ml-0.5">
                            ({isUp ? '+' : ''}{d.changePct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* PLC payment estimate row (only when below ref) */}
                {plc && plc.rate > 0 && (
                  <div className="mt-2 ml-[52px] rounded-lg bg-red-50/70 border border-red-100/50 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] text-red-700 font-medium">
                      Est. PLC payment on national avg yield
                    </span>
                    <span className="text-[11px] text-red-800 font-bold">
                      ≈ ${plc.perAcre.toFixed(0)}/acre
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-gray-50 px-5 sm:px-6 py-3 flex items-center justify-between bg-gray-50/40">
        <Link
          href="/markets"
          className="text-xs font-semibold text-[#1B4332] hover:text-emerald-600 transition-colors flex items-center gap-1"
        >
          Full market dashboard
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Link>
        <Link
          href="/check"
          className="text-xs font-semibold text-[#C9A84C] hover:text-amber-600 transition-colors"
        >
          Calculate your payment →
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USDA CALENDAR CARD
// ═══════════════════════════════════════════════════════════════════════════════

function CalendarCard({ reports }: { reports: USDAReport[] }) {
  if (reports.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
        </svg>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">USDA Reports That Move Markets</h2>
      </div>

      <div className="space-y-2">
        {reports.map((r, i) => {
          const days = daysUntil(r.date);
          const isImminent = days <= 3;
          const dateObj = new Date(r.date);

          return (
            <div
              key={`${r.name}-${r.date}-${i}`}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${
                isImminent
                  ? 'bg-amber-50/70 border border-amber-100'
                  : 'bg-gray-50/70 border border-gray-100/50'
              }`}
            >
              {/* Date chip */}
              <div className="flex-shrink-0 text-center w-12">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${
                  isImminent ? 'text-amber-500' : 'text-gray-400'
                }`}>
                  {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className={`text-lg font-extrabold ${
                  isImminent ? 'text-amber-700' : 'text-gray-800'
                }`}>
                  {dateObj.getDate()}
                </div>
              </div>

              {/* Report info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 truncate">{r.name}</span>
                  {r.impact === 'high' && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 uppercase">
                      High Impact
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{r.shortDesc}</p>
              </div>

              {/* Days countdown */}
              <div className={`flex-shrink-0 text-xs font-bold ${
                isImminent ? 'text-amber-600' : 'text-gray-400'
              }`}>
                {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/calendar"
        className="flex items-center justify-center gap-1 mt-3 text-xs font-semibold text-[#1B4332] hover:text-emerald-600 transition-colors"
      >
        Full USDA calendar
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS BAR
// ═══════════════════════════════════════════════════════════════════════════════

function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Link href="/check" className="flex flex-col items-center gap-1.5 rounded-xl bg-white border border-gray-100 py-3 px-2 hover:border-emerald-200 hover:shadow-sm transition-all group">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
          <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
        </svg>
        <span className="text-[10px] font-semibold text-gray-500 group-hover:text-emerald-700 text-center leading-tight transition-colors">ARC/PLC Calculator</span>
      </Link>
      <Link href="/farm-score" className="flex flex-col items-center gap-1.5 rounded-xl bg-white border border-gray-100 py-3 px-2 hover:border-emerald-200 hover:shadow-sm transition-all group">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
        <span className="text-[10px] font-semibold text-gray-500 group-hover:text-emerald-700 text-center leading-tight transition-colors">Farm Score</span>
      </Link>
      <Link href="/weather" className="flex flex-col items-center gap-1.5 rounded-xl bg-white border border-gray-100 py-3 px-2 hover:border-emerald-200 hover:shadow-sm transition-all group">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
        </svg>
        <span className="text-[10px] font-semibold text-gray-500 group-hover:text-emerald-700 text-center leading-tight transition-colors">Full Weather</span>
      </Link>
      <Link href="/markets" className="flex flex-col items-center gap-1.5 rounded-xl bg-white border border-gray-100 py-3 px-2 hover:border-emerald-200 hover:shadow-sm transition-all group">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
          <path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>
        </svg>
        <span className="text-[10px] font-semibold text-gray-500 group-hover:text-emerald-700 text-center leading-tight transition-colors">All Markets</span>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MorningDashboard() {
  // ── State ─────────────────────────────────────────────────────────
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [pricesError, setPricesError] = useState('');

  const marketStatus = useMemo(() => getMarketStatus(), []);
  const usdaReports = useMemo(() => getUpcomingReports(), []);

  // ── Fetch Weather ─────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    try {
      // Try to get saved location from localStorage
      let lat = DEFAULT_LAT;
      let lng = DEFAULT_LNG;

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('hf_location');
        if (saved) {
          try {
            const loc = JSON.parse(saved);
            if (loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
          } catch {}
        }
      }

      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}&crops=CORN,SOYBEANS,WHEAT`);
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
  }, []);

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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* ═══ MORNING HEADER ═══ */}
      <section className="relative bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0f2b1e] pt-24 pb-8 sm:pt-28 sm:pb-10 overflow-hidden">
        {/* Subtle noise texture */}
        <div className="hf-noise-subtle" />

        <div className="relative z-10 mx-auto max-w-[680px] px-5">
          {/* Greeting */}
          <div className="mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em]">
              {getGreeting()}
            </h1>
          </div>
          <p className="text-white/40 text-sm font-medium mb-5">
            {formatDateHeader()}
          </p>

          {/* Market status pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
            <span
              className="w-2 h-2 rounded-full"
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
      <main className="mx-auto max-w-[680px] px-5 -mt-3 pb-20 space-y-4">
        {/* Quick Actions */}
        <QuickActions />

        {/* Weather Card */}
        {weatherLoading ? (
          <WeatherSkeleton />
        ) : weatherError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 text-center">
            <p className="text-sm text-red-600 font-medium">{weatherError}</p>
            <button
              onClick={() => { setWeatherLoading(true); setWeatherError(''); fetchWeather(); }}
              className="mt-2 text-xs font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        ) : weather ? (
          <WeatherCard data={weather} />
        ) : null}

        {/* Markets Card */}
        {pricesLoading ? (
          <MarketsSkeleton />
        ) : pricesError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 text-center">
            <p className="text-sm text-red-600 font-medium">{pricesError}</p>
            <button
              onClick={() => { setPricesLoading(true); setPricesError(''); fetchPrices(); }}
              className="mt-2 text-xs font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <MarketsCard data={prices} status={marketStatus} />
        )}

        {/* Local Grain Bids */}
        <GrainBidCard
          lat={DEFAULT_LAT}
          lng={DEFAULT_LNG}
          compact={true}
          countyName="Summit County"
          stateAbbr="OH"
        />

        {/* USDA Calendar Card */}
        <CalendarCard reports={usdaReports} />

        {/* CTA Card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0C1F17] to-[#1B4332] p-6 text-center relative overflow-hidden">
          <div className="hf-noise-subtle" />
          <div className="relative z-10">
            <h3 className="text-lg font-extrabold text-white tracking-[-0.02em] mb-2">
              See what today&apos;s prices mean for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
                your farm
              </span>
            </h3>
            <p className="text-white/40 text-sm mb-4 max-w-md mx-auto">
              Enter your county and crops to get personalized ARC/PLC payment projections
              based on live market data.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/check"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] text-sm font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Calculate My Payment
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
              <Link
                href="/signup"
                className="text-white/40 hover:text-white text-sm font-medium transition-colors"
              >
                Create free account →
              </Link>
            </div>
          </div>
        </div>

        {/* Data freshness note */}
        <p className="text-center text-[10px] text-gray-300 px-4">
          Futures: CME settlement prices via Nasdaq Data Link, updated daily after 1:15 PM CT.
          Weather: Open-Meteo, updated hourly. Data for educational purposes only.
        </p>
      </main>
    </div>
  );
}
