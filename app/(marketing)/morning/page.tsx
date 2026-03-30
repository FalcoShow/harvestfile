// =============================================================================
// app/(marketing)/morning/page.tsx
// HarvestFile — Build 17 Deploy 2: Morning Dashboard Visual Redesign
//
// SERVER COMPONENT — renders static sections instantly (zero JS), wraps
// the interactive data sections in a client boundary.
//
// Architecture:
//   Server-rendered (zero JS, instant): page shell, USDA calendar, bottom CTA
//   Client-rendered (interactive): header, payment estimate, weather, markets,
//     grain bids — all managed by MorningDashboardClient with shared state
//
// Build 17 changes:
//   1. Consistent card styling (border-gray-100/80, no shadows by default)
//   2. tabular-nums on countdown numbers
//   3. Typography restraint (font-semibold not font-bold on titles)
//   4. Refined calendar card with better imminent-report styling
//   5. Bottom CTA with improved visual hierarchy
//
// Performance targets:
//   FCP: < 1.0s (server HTML streams immediately)
//   LCP: < 2.5s on rural LTE
//   Client JS: < 100KB gzipped
// =============================================================================

import { Suspense } from 'react';
import Link from 'next/link';
import MorningDashboardClient from './_components/MorningDashboardClient';

// Force dynamic rendering — greeting and calendar change with time
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// USDA REPORT CALENDAR (server-rendered — no JS required)
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
    { name: 'Export Sales', date: '2026-04-02', impact: 'medium', shortDesc: 'Weekly export commitments' },
    { name: 'Crop Progress', date: '2026-04-06', impact: 'medium', shortDesc: 'Weekly planting & conditions' },
    { name: 'WASDE', date: '2026-04-09', impact: 'high', shortDesc: 'Supply & demand estimates' },
    { name: 'Export Sales', date: '2026-04-09', impact: 'medium', shortDesc: 'Weekly export commitments' },
    { name: 'Crop Progress', date: '2026-04-13', impact: 'medium', shortDesc: 'Weekly planting & conditions' },
    { name: 'WASDE', date: '2026-05-12', impact: 'high', shortDesc: 'First new-crop estimates' },
    { name: 'Acreage Report', date: '2026-06-30', impact: 'high', shortDesc: 'Actual planted acres' },
    { name: 'WASDE', date: '2026-06-11', impact: 'high', shortDesc: 'Updated balance sheets' },
    { name: 'WASDE', date: '2026-07-10', impact: 'high', shortDesc: 'Mid-year estimates' },
    { name: 'WASDE', date: '2026-08-12', impact: 'high', shortDesc: 'First production estimates' },
  ];

  return reports
    .filter((r) => {
      const reportDate = new Date(r.date + 'T12:00:00');
      return reportDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function CalendarCard({ reports }: { reports: USDAReport[] }) {
  if (reports.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100/80 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
        </svg>
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight">USDA Reports That Move Markets</h2>
      </div>

      <div className="space-y-2">
        {reports.map((r, i) => {
          const days = daysUntil(r.date);
          const isImminent = days <= 3;
          const dateObj = new Date(r.date + 'T12:00:00');

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
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isImminent ? 'text-amber-500' : 'text-gray-400'
                  }`}
                >
                  {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className={`text-lg font-bold tabular-nums ${isImminent ? 'text-amber-700' : 'text-gray-800'}`}>
                  {dateObj.getDate()}
                </div>
              </div>

              {/* Report info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{r.name}</span>
                  {r.impact === 'high' && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 uppercase">
                      High Impact
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{r.shortDesc}</p>
              </div>

              {/* Days countdown */}
              <div className={`flex-shrink-0 text-xs font-bold tabular-nums ${isImminent ? 'text-amber-600' : 'text-gray-400'}`}>
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
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM CTA (server-rendered — no JS)
// ═══════════════════════════════════════════════════════════════════════════════

function BottomCTA() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0C1F17] to-[#1B4332] p-6 text-center relative overflow-hidden">
      <div className="hf-noise-subtle" />
      <div className="relative z-10">
        <h3 className="text-lg font-bold text-white tracking-[-0.02em] mb-2">
          See what today&apos;s prices mean for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
            your farm
          </span>
        </h3>
        <p className="text-white/40 text-sm mb-4 max-w-md mx-auto">
          Enter your county and crops to get personalized ARC/PLC payment projections based on live market data.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/check"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] text-sm font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Calculate My Payment
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
          <Link href="/signup" className="text-white/40 hover:text-white text-sm font-medium transition-colors">
            Create free account →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SKELETON (shown while client component loads)
// ═══════════════════════════════════════════════════════════════════════════════

function MorningSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <section className="relative bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0f2b1e] pt-24 pb-8 sm:pt-28 sm:pb-10">
        <div className="mx-auto max-w-[680px] px-5">
          <div className="w-48 h-8 rounded-lg bg-white/10 animate-[hf-shimmer_1.4s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-white/10 via-white/5 to-white/10 mb-2" />
          <div className="w-64 h-4 rounded bg-white/5 animate-[hf-shimmer_1.4s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-white/5 via-white/[0.02] to-white/5 mb-5" />
          <div className="w-36 h-9 rounded-xl bg-white/5 animate-[hf-shimmer_1.4s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-white/5 via-white/[0.02] to-white/5" />
        </div>
      </section>

      {/* Cards skeleton */}
      <div className="mx-auto max-w-[680px] px-5 -mt-3 space-y-4">
        {/* Quick actions skeleton */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[72px] rounded-xl bg-white border border-gray-100/80 animate-pulse" />
          ))}
        </div>

        {/* Payment card skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0C1F17] to-[#1B4332] p-6 h-[260px] animate-pulse" />

        {/* Weather skeleton */}
        <div className="rounded-2xl border border-gray-100/80 bg-white p-6 h-[200px] animate-pulse" />

        {/* Markets skeleton */}
        <div className="rounded-2xl border border-gray-100/80 bg-white p-6 h-[280px] animate-pulse" />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT (Server Component — orchestrator)
// ═══════════════════════════════════════════════════════════════════════════════

export default function MorningPage() {
  const reports = getUpcomingReports();

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* ═══ INTERACTIVE SECTIONS (Client Component) ═══ */}
      <Suspense fallback={<MorningSkeleton />}>
        <MorningDashboardClient />
      </Suspense>

      {/* ═══ SERVER-RENDERED SECTIONS (zero JS, instant) ═══ */}
      <div className="mx-auto max-w-[680px] px-5 space-y-4 pb-20">
        {/* USDA Calendar */}
        <CalendarCard reports={reports} />

        {/* Bottom CTA */}
        <BottomCTA />

        {/* Data freshness note */}
        <p className="text-center text-[10px] text-gray-300 px-4">
          Futures: CME settlement prices via Nasdaq Data Link, updated daily after 1:15 PM CT.
          Weather: Open-Meteo, updated hourly. Market data provided by Barchart. Data for educational purposes only.
        </p>
      </div>
    </div>
  );
}
