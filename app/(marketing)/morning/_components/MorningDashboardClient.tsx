// =============================================================================
// app/(marketing)/morning/_components/MorningDashboardClient.tsx
// HarvestFile — Surface 2 Deploy 2B-P2: UI Component Rewrites
//
// DEPLOY 2B-P2 CHANGES:
//   - CurrentWeatherCard: shows current.temp_f (real-time) not daily max
//   - CurrentWeatherCard: wind direction cardinal + dew point + Delta T badge
//   - CurrentWeatherCard: mini 12-hour Recharts ComposedChart (temp line + precip bars)
//   - LiveClock wired into morning header greeting
//   - "Full USDA calendar" broken link removed (was 301 loop)
//   - Bottom CTA redesigned as premium card matching dashboard aesthetic
//   - QuickActions updated: removed /calendar link, added /morning self-reference fix
//
// Data architecture (unchanged from Deploy 2):
//   - TanStack Query manages all server data (weather, prices, grain bids)
//   - Zustand morning-store manages UI state (sections, preferences)
//   - Zustand location-store provides shared coordinates from /check
//   - Zero useState for server data — only for ephemeral UI state
// =============================================================================

'use client';

import { useMemo, useRef, useEffect, useState, useCallback, lazy, Suspense } from 'react';
import Link from 'next/link';
import { GrainBidCard } from '@/components/grain/GrainBidCard';
import { PaymentEstimateCard } from '@/components/morning/PaymentEstimateCard';
import { useLocationStore } from '@/lib/stores/location-store';
import { useMarketPrices } from '@/lib/hooks/morning/use-market-prices';
import { useWeather } from '@/lib/hooks/morning/use-weather';
import SprayStatusHero from './SprayStatusHero';
import ForecastGrid from './ForecastGrid';
import SoilConditions from './SoilConditions';
import PlantingWindows from './PlantingWindows';
import LiveClock from './LiveClock';
import CommodityDetailCard from './CommodityDetailCard';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area,
} from 'recharts';

const LazySparkline = lazy(() => import('./SparklineChart'));

// ═══════════════════════════════════════════════════════════════════════════════
// SCROLL ANIMATION (preserved from Deploy 5)
// ═══════════════════════════════════════════════════════════════════════════════

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('hf-animate-in'); observer.unobserve(el); } },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function AnimateIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useScrollAnimation();
  return (
    <div ref={ref} className={`hf-animate-target ${className}`} style={{ '--stagger': `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION EYEBROW
// ═══════════════════════════════════════════════════════════════════════════════

function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.1em] whitespace-nowrap">{label}</span>
      <div className="hf-eyebrow-line" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FRESHNESS TIMESTAMP
// ═══════════════════════════════════════════════════════════════════════════════

function FreshnessTimestamp({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => { const t = setInterval(() => forceUpdate(n => n + 1), 30000); return () => clearInterval(t); }, []);
  if (!dataUpdatedAt) return null;
  const seconds = Math.floor((Date.now() - dataUpdatedAt) / 1000);
  const label = seconds < 60 ? 'Just now' : seconds < 3600 ? `${Math.floor(seconds / 60)} min ago` : `${Math.floor(seconds / 3600)}h ago`;
  return (
    <div className="flex items-center gap-1.5">
      <span className="hf-live-dot" />
      <span className="text-[10px] text-white/25 tabular-nums">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMODITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface CommodityConfig {
  code: string; name: string; unit: string; unitLabel: string;
  effectiveRefPrice: number; loanRate: number; color: string;
  nationalAvgYield: number;
}

const COMMODITIES: Record<string, CommodityConfig> = {
  CORN: { code: 'CORN', name: 'Corn', unit: '$/bu', unitLabel: 'bu', effectiveRefPrice: 4.42, loanRate: 2.20, color: '#F59E0B', nationalAvgYield: 177 },
  SOYBEANS: { code: 'SOYBEANS', name: 'Soybeans', unit: '$/bu', unitLabel: 'bu', effectiveRefPrice: 10.71, loanRate: 6.20, color: '#059669', nationalAvgYield: 51 },
  WHEAT: { code: 'WHEAT', name: 'Wheat', unit: '$/bu', unitLabel: 'bu', effectiveRefPrice: 6.35, loanRate: 3.38, color: '#D97706', nationalAvgYield: 52 },
};

const COMMODITY_ORDER = ['CORN', 'SOYBEANS', 'WHEAT'];

// ═══════════════════════════════════════════════════════════════════════════════
// CROP ICONS
// ═══════════════════════════════════════════════════════════════════════════════

function CropIcon({ code, size = 20 }: { code: string; size?: number }) {
  const color = COMMODITIES[code]?.color || '#6B7280';
  if (code === 'CORN') return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M8 6c0 0 4 2 4 6s-4 6-4 6" /><path d="M16 6c0 0-4 2-4 6s4 6 4 6" /></svg>);
  if (code === 'SOYBEANS') return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" /><path d="M12 8v-4" /></svg>);
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10" /><path d="M8 6l4-4 4 4" /><path d="M4 22c0-4 4-8 8-10" /><path d="M20 22c0-4-4-8-8-10" /></svg>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET STATUS
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketStatus { label: string; color: string; isLive: boolean; nextEvent: string; }

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const day = ct.getDay();
  const h = ct.getHours() + ct.getMinutes() / 60;
  if (day === 6 || (day === 0 && h < 19)) return { label: 'Weekend', color: '#6B7280', isLive: false, nextEvent: 'Opens Sun 7 PM CT' };
  if (day === 5 && h >= 13.333) return { label: 'Weekend', color: '#6B7280', isLive: false, nextEvent: 'Opens Sun 7 PM CT' };
  if (h >= 19 || h < 7.75) return { label: 'Overnight', color: '#3B82F6', isLive: true, nextEvent: 'Day session 8:30 AM' };
  if (h >= 7.75 && h < 8.5) return { label: 'Pre-Market', color: '#F59E0B', isLive: false, nextEvent: 'Opens 8:30 AM CT' };
  if (h >= 8.5 && h < 13.333) return { label: 'Markets Open', color: '#22C55E', isLive: true, nextEvent: 'Settle 1:15 PM CT' };
  return { label: 'After Hours', color: '#6B7280', isLive: false, nextEvent: 'Overnight 7 PM CT' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLC CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calcPLC(price: number, cfg: CommodityConfig) {
  const rate = Math.max(0, cfg.effectiveRefPrice - Math.max(price, cfg.loanRate));
  const perAcre = rate * cfg.nationalAvgYield * 0.85;
  const status = price >= cfg.effectiveRefPrice ? ('above' as const) : price >= cfg.effectiveRefPrice * 0.95 ? ('near' as const) : ('below' as const);
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
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHT LINE
// ═══════════════════════════════════════════════════════════════════════════════

function InsightLine({ prices, weatherData }: { prices: Record<string, any>; weatherData: any }) {
  const insights: string[] = [];

  let biggestMove = { code: '', pct: 0 };
  for (const code of COMMODITY_ORDER) {
    const d = prices[code];
    if (d?.changePct !== null && d?.changePct !== undefined) {
      if (Math.abs(d.changePct) > Math.abs(biggestMove.pct)) {
        biggestMove = { code, pct: d.changePct };
      }
    }
  }
  if (biggestMove.code) {
    const cfg = COMMODITIES[biggestMove.code];
    const dir = biggestMove.pct >= 0 ? '+' : '';
    insights.push(`${cfg.name} ${dir}${biggestMove.pct.toFixed(1)}% overnight`);
  }

  for (const code of COMMODITY_ORDER) {
    const d = prices[code];
    const cfg = COMMODITIES[code];
    if (d?.latestSettle && cfg) {
      const pctFromRef = ((cfg.effectiveRefPrice - d.latestSettle) / cfg.effectiveRefPrice) * 100;
      if (pctFromRef > 0 && pctFromRef < 8) {
        insights.push(`${cfg.name} ${pctFromRef.toFixed(0)}% below ref price`);
        break;
      }
    }
  }

  if (weatherData?.forecast?.daily) {
    const daily = weatherData.forecast.daily;
    const rainDay = daily.find((d: any, i: number) => i > 0 && (d.precipitation_probability ?? 0) > 50);
    if (rainDay) {
      const dayName = new Date(rainDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
      insights.push(`Rain likely ${dayName}`);
    }
  }

  if (insights.length === 0) return null;

  return (
    <p className="text-[13px] text-white/35 mt-2 leading-relaxed">
      {insights.map((insight, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2 text-white/15">·</span>}
          <span className={
            insight.includes('+') ? 'text-emerald-400/70' :
            insight.includes('-') ? 'text-red-400/70' :
            insight.includes('Rain') || insight.includes('wind') ? 'text-blue-400/70' :
            insight.includes('below ref') ? 'text-amber-400/70' :
            'text-white/35'
          }>{insight}</span>
        </span>
      ))}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT STAT CARD (preserved from Deploy 5)
// ═══════════════════════════════════════════════════════════════════════════════

function CommodityStatCard({ code, data, flash }: { code: string; data: any; flash: 'up' | 'down' | null }) {
  const cfg = COMMODITIES[code];
  if (!cfg || !data?.latestSettle) {
    return (
      <div className="rounded-2xl bg-[#0f2518] border border-white/[0.08] p-4 sm:p-5 animate-pulse">
        <div className="w-16 h-3 rounded bg-white/[0.06] mb-2" />
        <div className="w-20 h-7 rounded bg-white/[0.06]" />
      </div>
    );
  }

  const price = data.latestSettle;
  const change = data.change ?? 0;
  const changePct = data.changePct ?? 0;
  const isUp = change >= 0;
  const plc = calcPLC(price, cfg);

  return (
    <div className={`rounded-2xl bg-[#0f2518] border border-white/[0.08] p-4 sm:p-5 transition-colors ${
      flash === 'up' ? 'hf-flash-up' : flash === 'down' ? 'hf-flash-down' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CropIcon code={code} size={16} />
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{cfg.name}</span>
        </div>
        <span className={`w-1.5 h-1.5 rounded-full ${plc.status === 'above' ? 'bg-emerald-400' : plc.status === 'near' ? 'bg-amber-400' : 'bg-red-400'}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-[28px] font-bold text-[#E8ECE9] tabular-nums tracking-tight">
          ${price.toFixed(2)}
        </span>
        <span className={`text-xs font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePct.toFixed(1)}%
        </span>
      </div>
      <div className="text-[10px] text-white/25 mt-1 tabular-nums">
        vs ${cfg.effectiveRefPrice.toFixed(2)} ERP
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETONS
// ═══════════════════════════════════════════════════════════════════════════════

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] bg-[length:200%_100%] animate-[hf-shimmer_1.4s_ease-in-out_infinite] ${className}`} />;
}

function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6 h-full">
      <div className="flex items-center gap-2 mb-4"><Shimmer className="w-5 h-5 rounded" /><Shimmer className="w-36 h-4" /></div>
      <div className="flex items-start gap-4 mb-5"><Shimmer className="w-14 h-14 rounded-xl flex-shrink-0" /><div className="flex-1 space-y-2"><Shimmer className="w-20 h-8" /><Shimmer className="w-36 h-4" /></div></div>
      <Shimmer className="w-full h-[100px] rounded-xl mb-4" />
      <div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map(i => <div key={i} className="rounded-xl bg-white/[0.03] p-2.5"><Shimmer className="w-full h-3 mb-2" /><Shimmer className="w-full h-4" /></div>)}</div>
    </div>
  );
}

function MarketsSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden h-full">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Shimmer className="w-5 h-5 rounded" /><Shimmer className="w-36 h-4" /></div></div>
        {[1,2,3].map(i => <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"><div className="flex items-center gap-3"><Shimmer className="w-8 h-8 rounded-lg" /><div className="space-y-1.5"><Shimmer className="w-20 h-4" /><Shimmer className="w-32 h-3" /></div></div><div className="text-right space-y-1.5"><Shimmer className="w-16 h-5 ml-auto" /><Shimmer className="w-20 h-3 ml-auto" /></div></div>)}
      </div>
    </div>
  );
}

function SpraySkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6 animate-pulse">
      <Shimmer className="w-32 h-4 mb-4" />
      <div className="flex items-center gap-4 mb-4">
        <Shimmer className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="space-y-2 flex-1"><Shimmer className="w-40 h-7" /><Shimmer className="w-56 h-3" /></div>
      </div>
      <div className="grid grid-cols-4 gap-2">{[1,2,3,4].map(i => <Shimmer key={i} className="h-[56px] rounded-xl" />)}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER ICONS
// ═══════════════════════════════════════════════════════════════════════════════

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  if (code === 0) return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="6" fill="#F59E0B" />{[0,45,90,135,180,225,270,315].map(a => <line key={a} x1="16" y1="4" x2="16" y2="7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 16 16)`} />)}</svg>);
  if (code <= 3) return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none"><circle cx="12" cy="12" r="5" fill="#F59E0B" />{[0,60,120,180,240,300].map(a => <line key={a} x1="12" y1="4" x2="12" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />)}<path d="M10 20a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 25 21a4 4 0 0 1-4 4H12a4 4 0 0 1-2-7Z" fill="#94A3B8" /></svg>);
  if (code <= 48) return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="M10 10a4 4 0 0 1 3.9-3 3 3 0 0 1 5.5.8A3.5 3.5 0 0 1 22 11a3.5 3.5 0 0 1-3.5 3h-7A3.5 3.5 0 0 1 8 11" fill="#CBD5E1" /></svg>);
  if (code <= 65) return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="M8 16a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 17a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" /><line x1="12" y1="24" x2="11" y2="28" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" /><line x1="17" y1="24" x2="16" y2="28" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" /><line x1="22" y1="24" x2="21" y2="27" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" /></svg>);
  if (code <= 77) return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="M8 16a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 17a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#94A3B8" /><circle cx="12" cy="26" r="1.2" fill="#93C5FD" /><circle cx="17" cy="25" r="1.2" fill="#93C5FD" /><circle cx="22" cy="27" r="1.2" fill="#93C5FD" /></svg>);
  return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="M8 14a5 5 0 0 1 4.9-4 3.5 3.5 0 0 1 6.6 1A4 4 0 0 1 23 15a4 4 0 0 1-4 4H10a4 4 0 0 1-2-5Z" fill="#64748B" /><path d="M17 22l-2 4h4l-2 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="22" x2="11" y2="26" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" /></svg>);
}

function getAtmosphericTint(code: number): string {
  if (code === 0) return 'rgba(245,158,11,0.03)';
  if (code <= 3) return 'rgba(148,163,184,0.02)';
  if (code <= 48) return 'rgba(148,163,184,0.03)';
  if (code <= 65) return 'rgba(59,130,246,0.03)';
  if (code <= 77) return 'rgba(203,213,225,0.03)';
  if (code <= 99) return 'rgba(139,92,246,0.03)';
  return 'transparent';
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky'; if (code <= 3) return 'Partly cloudy'; if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Light drizzle'; if (code <= 65) return 'Rain'; if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers'; if (code <= 86) return 'Snow showers'; if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELTA T STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getDeltaTStatus(deltaT: number): { label: string; color: string; bg: string; border: string } {
  // Delta T in °F: safe spray range is 3.6–14.4°F (2–8°C per Stull 2011)
  if (deltaT >= 3.6 && deltaT <= 14.4) return { label: 'Ideal', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' };
  if (deltaT > 14.4 && deltaT <= 18) return { label: 'Marginal', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' };
  if (deltaT < 3.6 && deltaT >= 1.8) return { label: 'Marginal', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' };
  if (deltaT < 1.8) return { label: 'Inversion', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' };
  return { label: 'Too Dry', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI 12-HOUR CHART TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function MiniChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#0C1F17] border border-white/[0.1] px-2.5 py-1.5 shadow-lg">
      <p className="text-[10px] text-white/40 mb-0.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[11px] font-semibold tabular-nums" style={{ color: p.color }}>
          {p.name === 'temp' ? `${p.value}°F` : `${p.value}"`}
        </p>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENT WEATHER CARD — DEPLOY 2B-P2 REWRITE
// Now uses weatherData.current (real-time 15-min) instead of daily forecast max.
// Adds: wind direction, dew point, Delta T badge, mini 12h chart.
// ═══════════════════════════════════════════════════════════════════════════════

function CurrentWeatherCard({ weatherData, dataUpdatedAt }: { weatherData: any; dataUpdatedAt: number }) {
  const current = weatherData?.current;
  const today = weatherData?.forecast?.daily?.[0];

  // Graceful fallback: if no current block, use daily data (backward compat)
  const hasCurrent = !!current;
  const weatherCode = hasCurrent
    ? (current.weather_code ?? 0)
    : (today?.weather_code ?? today?.weathercode ?? today?.condition_code ?? 0);
  const tint = getAtmosphericTint(weatherCode);

  // Temperature: current actual vs daily forecast max
  const temp = hasCurrent ? Math.round(current.temp_f) : Math.round(today?.temp_max_f ?? 72);
  const feelsLike = hasCurrent ? Math.round(current.feels_like_f) : Math.round(today?.temp_max_f ?? 72);
  const description = hasCurrent ? (current.conditions || getWeatherDescription(weatherCode)) : (today?.conditions || getWeatherDescription(weatherCode));

  // Wind — now with cardinal direction from current block
  const wind = hasCurrent ? Math.round(current.wind_speed_mph) : Math.round(today?.wind_speed_max_mph ?? 8);
  const windGusts = hasCurrent ? Math.round(current.wind_gusts_mph ?? 0) : Math.round(today?.wind_gusts_mph ?? 0);
  const windDir = hasCurrent ? (current.wind_direction_cardinal ?? 'N') : (() => {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round((today?.wind_direction_dominant ?? 0) / 22.5) % 16];
  })();

  // Dew point and Delta T — only available from current block
  const dewPoint = hasCurrent ? Math.round(current.dew_point_f) : null;
  const deltaT = hasCurrent ? current.delta_t_f : null;
  const deltaTStatus = deltaT !== null ? getDeltaTStatus(deltaT) : null;
  const humidity = hasCurrent ? current.humidity : Math.round(today?.humidity_mean ?? 65);

  // High/Low from daily forecast (always useful context)
  const highTemp = today ? Math.round(today.temp_max_f) : null;
  const lowTemp = today ? Math.round(today.temp_min_f) : null;

  // Mini 12-hour chart data from hourly array
  const hourlyData = useMemo(() => {
    const hourly = weatherData?.hourly;
    if (!hourly || !Array.isArray(hourly)) return [];
    return hourly.slice(0, 12).map((h: any) => {
      const time = new Date(h.time);
      return {
        label: time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        temp: Math.round(h.temp_f),
        precip: h.precipitation_in ?? 0,
      };
    });
  }, [weatherData?.hourly]);

  // 5-day mini forecast
  const fiveDays = (weatherData?.forecast?.daily || []).slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden h-full flex flex-col" style={{ background: `linear-gradient(135deg, ${tint}, rgba(27,67,50,0.30))` }}>
      <div className="p-5 sm:p-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Agricultural Weather</h2>
            <FreshnessTimestamp dataUpdatedAt={dataUpdatedAt} />
          </div>
          {hasCurrent && <span className="text-[10px] text-white/20 tabular-nums">Real-time</span>}
        </div>

        {/* Hero: Icon + Temperature + Description */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center border border-white/[0.06]">
            <WeatherIcon code={weatherCode} size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[36px] font-bold text-white leading-none tracking-tight tabular-nums">{temp}°</span>
              <span className="text-sm text-white/30 font-medium">F</span>
              {highTemp !== null && lowTemp !== null && (
                <span className="text-xs text-white/25 ml-2 tabular-nums">
                  H:{highTemp}° L:{lowTemp}°
                </span>
              )}
            </div>
            <p className="text-sm text-white/60 font-medium mt-0.5">{description}</p>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-xs text-white/30">Feels {feelsLike}°</span>
              <span className="text-xs text-white/30">
                <span className="font-semibold text-white/50">{windDir}</span> {wind} mph
                {windGusts > wind + 5 && <span className="text-white/20"> (gusts {windGusts})</span>}
              </span>
              <span className="text-xs text-white/30">{humidity}% humid</span>
              {dewPoint !== null && (
                <span className="text-xs text-white/30">Dew {dewPoint}°</span>
              )}
            </div>
          </div>
        </div>

        {/* Delta T Badge — critical for spray decisions */}
        {deltaTStatus && deltaT !== null && (
          <div className={`inline-flex items-center gap-2 rounded-lg ${deltaTStatus.bg} border ${deltaTStatus.border} px-3 py-1.5 mb-4`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={deltaTStatus.color}>
              <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
            </svg>
            <span className={`text-xs font-bold ${deltaTStatus.color}`}>
              Delta T {deltaT.toFixed(1)}°F
            </span>
            <span className={`text-[10px] font-semibold ${deltaTStatus.color} opacity-70`}>
              {deltaTStatus.label}
            </span>
          </div>
        )}

        {/* Mini 12-Hour Chart */}
        {hourlyData.length > 0 && (
          <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
            <div className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-2">Next 12 Hours</div>
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    yAxisId="temp"
                    domain={['dataMin - 5', 'dataMax + 5']}
                    hide
                  />
                  <YAxis
                    yAxisId="precip"
                    orientation="right"
                    domain={[0, 'auto']}
                    hide
                  />
                  <Tooltip content={<MiniChartTooltip />} />
                  <Bar
                    yAxisId="precip"
                    dataKey="precip"
                    name="precip"
                    fill="rgba(96,165,250,0.3)"
                    radius={[2, 2, 0, 0]}
                    barSize={6}
                  />
                  <Area
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temp"
                    name="temp"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="rgba(245,158,11,0.06)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#F59E0B', stroke: 'rgba(245,158,11,0.3)', strokeWidth: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 5-day mini row */}
        <div className="grid grid-cols-5 gap-1.5">
          {fiveDays.map((d: any, i: number) => {
            const dayCode = d.weather_code ?? d.weathercode ?? d.condition_code ?? 0;
            const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={d.date} className={`rounded-xl p-2 text-center ${i === 0 ? 'bg-emerald-500/[0.08] border border-emerald-500/15' : 'bg-white/[0.03] border border-white/[0.04]'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${i === 0 ? 'text-emerald-400' : 'text-white/30'}`}>{dayName}</div>
                <div className="flex justify-center mb-1"><WeatherIcon code={dayCode} size={18} /></div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-bold text-white/90 tabular-nums">{Math.round(d.temp_max_f)}°</span>
                  <span className="text-[10px] text-white/30 tabular-nums">{Math.round(d.temp_min_f)}°</span>
                </div>
                {(d.precipitation_probability ?? 0) > 0 && <div className="text-[10px] text-blue-400 font-semibold mt-0.5 tabular-nums">{d.precipitation_probability}%</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETS CARD (preserved from Deploy 5, adapted for TanStack Query)
// ═══════════════════════════════════════════════════════════════════════════════

function MarketsCard({ data, status, dataUpdatedAt, flashStates }: { data: Record<string, any>; status: MarketStatus; dataUpdatedAt: number; flashStates: Record<string, 'up' | 'down' | null> }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden h-full flex flex-col">
      <div className="p-5 sm:p-6 flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Commodity Prices</h2>
            <FreshnessTimestamp dataUpdatedAt={dataUpdatedAt} />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: status.color, boxShadow: status.isLive ? `0 0 6px ${status.color}` : 'none', animation: status.isLive ? 'hf-pulse 2s ease-in-out infinite' : 'none' }} />
            <span className="text-[11px] font-semibold text-white/50">{status.label}</span>
          </div>
        </div>
        <p className="text-[11px] text-white/25 mb-3">CME settlement prices with ARC/PLC payment impact</p>
        <div>
          {COMMODITY_ORDER.map((code, idx) => {
            const d = data[code]; const cfg = COMMODITIES[code]; if (!cfg) return null;
            const price = d?.latestSettle ?? null; const change = d?.change ?? null;
            const isUp = change !== null && change >= 0;
            const plc = price ? calcPLC(price, cfg) : null;
            const priceHistory = (d?.prices || []).filter((p: any) => p.settle !== null);
            const flash = flashStates[code];
            return (
              <div key={code}>
                <div className={`flex items-center gap-3 py-3 rounded-lg transition-colors ${flash === 'up' ? 'hf-flash-up' : flash === 'down' ? 'hf-flash-down' : ''}`}>
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center"><CropIcon code={code} size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white/90">{cfg.name}</div>
                    {plc && (<div className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold ${plc.status === 'above' ? 'text-emerald-400' : plc.status === 'near' ? 'text-amber-400' : 'text-red-400'}`}><span className={`w-1 h-1 rounded-full ${plc.status === 'above' ? 'bg-emerald-400' : plc.status === 'near' ? 'bg-amber-400' : 'bg-red-400'}`} />{plc.status === 'above' ? 'Above ref price' : plc.status === 'near' ? 'Near ref — watch closely' : `PLC: $${plc.rate.toFixed(2)}/${cfg.unitLabel}`}</div>)}
                  </div>
                  <div className="w-[72px] h-[28px] flex-shrink-0">
                    {priceHistory.length > 3 && (<Suspense fallback={<div className="w-full h-full bg-white/[0.04] rounded animate-pulse" />}><LazySparkline data={priceHistory.slice(-20)} color={cfg.color} refPrice={cfg.effectiveRefPrice} code={code} /></Suspense>)}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[17px] font-bold text-white tracking-[-0.02em] tabular-nums">{price !== null ? `$${price.toFixed(2)}` : '—'}</div>
                    {change !== null && (<div className={`text-[11px] font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{isUp ? '▲' : '▼'} {isUp ? '+' : ''}{change.toFixed(2)}{d?.changePct !== null && d?.changePct !== undefined && <span className="opacity-60 ml-0.5">({isUp ? '+' : ''}{d.changePct.toFixed(1)}%)</span>}</div>)}
                  </div>
                </div>
                {plc && plc.rate > 0 && (<div className="ml-11 mb-1 rounded-lg bg-red-500/[0.08] border border-red-500/15 px-3 py-1.5 flex items-center justify-between"><span className="text-[11px] text-red-300 font-medium">Est. PLC payment on national avg yield</span><span className="text-[11px] text-red-200 font-bold tabular-nums">≈ ${plc.perAcre.toFixed(0)}/acre</span></div>)}
                {idx < COMMODITY_ORDER.length - 1 && <div className="ml-11 h-px bg-white/[0.04]" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-white/[0.04] px-5 sm:px-6 py-3 flex items-center justify-between bg-white/[0.02]">
        <span className="text-xs text-white/25">CME settlement · 30-day trend</span>
        <Link href="/check" className="text-xs font-semibold text-[#C9A84C] hover:text-[#E2C366] transition-colors">Calculate your payment →</Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NWS ALERT BANNER
// ═══════════════════════════════════════════════════════════════════════════════

function AlertBanner({ alerts }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map((a, i) => (
        <div key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5 flex items-start gap-3">
          <span className="text-amber-400 mt-0.5 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-amber-300">{a.event}</div>
            <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{a.headline}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS — Deploy 2B-P2: Removed /calendar (301 loop), premium CTA
// ═══════════════════════════════════════════════════════════════════════════════

function QuickActions() {
  const actions = [
    { href: '/check', label: 'ARC/PLC Calculator', dotColor: '#C9A84C', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg> },
    { href: '/advisor', label: 'AI Farm Advisor', dotColor: '#34D399', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg> },
    { href: '/signup', label: 'Create Account', dotColor: '#60A5FA', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
    { href: '/founding-farmer', label: 'Founding Farmer', dotColor: '#F59E0B', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" /></svg> },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map(a => (
        <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] py-3.5 px-2 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all group min-h-[72px] justify-center relative">
          <span className="absolute top-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: a.dotColor }} />
          <div className="group-hover:scale-110 transition-transform">{a.icon}</div>
          <span className="text-[10px] font-semibold text-white/40 group-hover:text-white/70 text-center leading-tight transition-colors">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM BOTTOM CTA — Deploy 2B-P2 Redesign
// Replaces bland "See what today's prices mean" box with a premium conversion card
// ═══════════════════════════════════════════════════════════════════════════════

function BottomCTA() {
  return (
    <div className="relative rounded-2xl border border-[#C9A84C]/20 overflow-hidden">
      {/* Gold gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/[0.08] via-transparent to-[#1B4332]/40" />
      <div className="absolute top-0 right-0 w-[400px] h-[250px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(201,168,76,0.1), transparent 70%)' }} />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Left: value prop */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#C9A84C]" />
              <span className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-[0.1em]">Free Decision Tool</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2">
              See what today&apos;s prices mean for your farm
            </h3>
            <p className="text-sm text-white/40 leading-relaxed max-w-lg">
              Enter your county and crops to get personalized ARC vs PLC projections using the live market data above. Takes 30 seconds, no account required.
            </p>
          </div>

          {/* Right: CTA button */}
          <div className="flex-shrink-0">
            <Link
              href="/check"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-[#0C1F17] text-sm transition-all hf-btn-hover"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E2C366, #D4B55A)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
              Run ARC/PLC Calculator
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <p className="text-[10px] text-white/20 mt-2 text-center">3,000+ counties · Updated daily</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT — Deploy 2B-P2: Farm Command Center
// ═══════════════════════════════════════════════════════════════════════════════

export default function MorningDashboardClient() {
  // ── Location from shared store (replaces useGeolocation) ──
  const locationStore = useLocationStore();
  const lat = locationStore.lat;
  const lng = locationStore.lng;
  const locationName = locationStore.locationName;
  const isDefaultLocation = locationStore.isDefault;

  // ── TanStack Query: Weather (replaces manual fetchWeather) ──
  const {
    data: weatherData,
    isLoading: weatherLoading,
    error: weatherError,
    dataUpdatedAt: weatherUpdatedAt,
    refetch: refetchWeather,
  } = useWeather({ lat, lng, crops: ['CORN', 'SOYBEANS', 'WHEAT'], enabled: true });

  // ── TanStack Query: Market Prices (replaces manual fetchPrices) ──
  const {
    data: pricesResponse,
    isLoading: pricesLoading,
    error: pricesError,
    dataUpdatedAt: pricesUpdatedAt,
  } = useMarketPrices({ commodities: ['CORN', 'SOYBEANS', 'WHEAT'], days: 30, enabled: true });

  const prices = pricesResponse?.data || {};

  // ── Price flash detection ──
  const prevPricesRef = useRef<Record<string, number | null>>({});
  const [flashStates, setFlashStates] = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    if (!pricesResponse?.data) return;
    const newFlash: Record<string, 'up' | 'down' | null> = {};
    for (const code of COMMODITY_ORDER) {
      const newPrice = pricesResponse.data[code]?.latestSettle ?? null;
      const oldPrice = prevPricesRef.current[code] ?? null;
      if (oldPrice !== null && newPrice !== null && oldPrice !== newPrice) {
        newFlash[code] = newPrice > oldPrice ? 'up' : 'down';
      } else {
        newFlash[code] = null;
      }
      prevPricesRef.current[code] = newPrice;
    }
    const hadPrevious = Object.values(prevPricesRef.current).some(v => v !== null);
    if (hadPrevious && Object.values(newFlash).some(v => v !== null)) {
      setFlashStates(newFlash);
      setTimeout(() => setFlashStates({}), 700);
    }
  }, [pricesResponse]);

  const marketStatus = useMemo(() => getMarketStatus(), []);
  const [expandedCommodity, setExpandedCommodity] = useState<string | null>(null);
  const handleToggleCommodity = useCallback((code: string) => {
    setExpandedCommodity(prev => prev === code ? null : code);
  }, []);

  let staggerIdx = 0;
  const nextStagger = () => (staggerIdx++) * 60;

  return (
    <>
      {/* ═══ MORNING HEADER — Deploy 2B-P2: LiveClock wired in ═══ */}
      <section className="relative bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0f2b1e] pt-24 pb-8 sm:pt-28 sm:pb-10 overflow-hidden">
        <div className="hf-noise-subtle" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-[-0.03em]">{getGreeting()}</h1>
            <LiveClock />
          </div>
          <p className="text-white/40 text-sm font-medium">
            {formatDateHeader()}
            {!isDefaultLocation && locationName && (
              <span className="text-white/25 ml-2">· {locationName}</span>
            )}
          </p>
          {!pricesLoading && <InsightLine prices={prices} weatherData={weatherData} />}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm mt-4">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: marketStatus.color, boxShadow: marketStatus.isLive ? `0 0 8px ${marketStatus.color}` : 'none', animation: marketStatus.isLive ? 'hf-pulse 2s ease-in-out infinite' : 'none' }} />
            <span className="text-xs font-semibold text-white/80">{marketStatus.label}</span>
            <span className="text-[11px] text-white/30 ml-1">{marketStatus.nextEvent}</span>
          </div>
        </div>
      </section>

      {/* ═══ BENTO GRID DASHBOARD — Deploy 2B-P2: Farm Command Center ═══ */}
      <div className="mx-auto max-w-7xl px-4 lg:px-6 -mt-3 pb-4 space-y-6">

        {/* ─── NWS ALERT BANNER (conditional, full-width) ─── */}
        {weatherData?.alerts && weatherData.alerts.length > 0 && (
          <AnimateIn delay={nextStagger()}>
            <AlertBanner alerts={weatherData.alerts} />
          </AnimateIn>
        )}

        {/* ─── ROW 1: Spray Status Hero (full-width) ─── */}
        <AnimateIn delay={nextStagger()}>
          {weatherLoading ? <SpraySkeleton /> : weatherError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center">
              <p className="text-sm text-red-400 font-medium">Unable to load spray conditions</p>
              <button onClick={() => refetchWeather()} className="mt-2 text-xs font-semibold text-red-300 underline hover:text-red-200 transition-colors">Retry</button>
            </div>
          ) : weatherData ? <SprayStatusHero weather={weatherData} /> : null}
        </AnimateIn>

        {/* ─── ROW 2: Compact Stat Cards — 3 commodities at a glance ─── */}
        <AnimateIn delay={nextStagger()}>
          <SectionEyebrow label="Commodity Markets" />
          <div className="grid grid-cols-1 gap-3">
            {COMMODITY_ORDER.map(code => (
              <CommodityDetailCard
                key={code}
                code={code}
                config={COMMODITIES[code]}
                data={prices[code]}
                flash={flashStates[code] || null}
                isExpanded={expandedCommodity === code}
                onToggle={handleToggleCommodity}
              />
            ))}
          </div>
        </AnimateIn>

        {/* ─── ROW 3: Payment Estimate + Grain Bids — 4/3 split ─── */}
        <div>
          <AnimateIn delay={nextStagger()}>
            <SectionEyebrow label="Farm Financials" />
          </AnimateIn>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <AnimateIn delay={nextStagger()} className="lg:col-span-4">
              <PaymentEstimateCard prices={prices} loading={pricesLoading} />
            </AnimateIn>
            <AnimateIn delay={nextStagger()} className="lg:col-span-3">
              <GrainBidCard
                lat={lat} lng={lng} compact={true} darkMode={true}
                countyName={isDefaultLocation ? 'Summit County' : locationName.split(',')[0] || 'Your Area'}
                stateAbbr={isDefaultLocation ? 'OH' : locationName.split(',')[1]?.trim() || 'US'}
              />
            </AnimateIn>
          </div>
        </div>

        {/* ─── ROW 4: Weather + Markets — 1/2 + 1/2 ─── */}
        <div>
          <AnimateIn delay={nextStagger()}>
            <SectionEyebrow label="Intelligence" />
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimateIn delay={nextStagger()}>
              {weatherLoading ? <WeatherSkeleton /> : weatherError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center h-full flex items-center justify-center">
                  <div>
                    <p className="text-sm text-red-400 font-medium">Weather unavailable</p>
                    <button onClick={() => refetchWeather()} className="mt-2 text-xs font-semibold text-red-300 underline hover:text-red-200 transition-colors">Retry</button>
                  </div>
                </div>
              ) : weatherData ? <CurrentWeatherCard weatherData={weatherData} dataUpdatedAt={weatherUpdatedAt} /> : null}
            </AnimateIn>
            <AnimateIn delay={nextStagger()}>
              {pricesLoading ? <MarketsSkeleton /> : pricesError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center h-full flex items-center justify-center">
                  <div><p className="text-sm text-red-400 font-medium">Markets unavailable</p></div>
                </div>
              ) : <MarketsCard data={prices} status={marketStatus} dataUpdatedAt={pricesUpdatedAt} flashStates={flashStates} />}
            </AnimateIn>
          </div>
        </div>

        {/* ─── ROW 5: 14-Day Forecast (full-width) ─── */}
        {weatherData?.forecast?.daily && weatherData.forecast.daily.length > 0 && (
          <AnimateIn delay={nextStagger()}>
            <SectionEyebrow label="Extended Forecast" />
            <ForecastGrid daily={weatherData.forecast.daily} />
          </AnimateIn>
        )}

        {/* ─── ROW 6: Soil + Planting Windows — 1/2 + 1/2 ─── */}
        {weatherData && (weatherData.soil || weatherData.planting_windows) && (
          <div>
            <AnimateIn delay={nextStagger()}>
              <SectionEyebrow label="Field Conditions" />
            </AnimateIn>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {weatherData.soil && (
                <AnimateIn delay={nextStagger()}>
                  <SoilConditions soil={weatherData.soil as any} />
                </AnimateIn>
              )}
              {weatherData.planting_windows && (
                <AnimateIn delay={nextStagger()}>
                  <PlantingWindows windows={weatherData.planting_windows as any} />
                </AnimateIn>
              )}
            </div>
          </div>
        )}

        {/* ─── ROW 7: Premium Bottom CTA — Deploy 2B-P2 redesign ─── */}
        <AnimateIn delay={nextStagger()}>
          <BottomCTA />
        </AnimateIn>

        {/* ─── ROW 8: Quick Actions ─── */}
        <AnimateIn delay={nextStagger()}>
          <QuickActions />
        </AnimateIn>
      </div>
    </>
  );
}
