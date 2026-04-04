// =============================================================================
// app/(marketing)/morning/page.tsx
// HarvestFile — Surface 2 Deploy 2B-P2 Final: Farm Command Center
//
// SERVER COMPONENT — renders static sections (zero JS), wraps interactive
// data sections in client boundary.
//
// Deploy 2B-P2 Final changes:
//   - "Full USDA calendar" link removed (was 301 loop back to /morning)
//   - Duplicate BottomCTA removed (premium CTA now lives in client component)
//   - Calendar section is now full-width instead of 1/2 + 1/2 grid
// =============================================================================

import { Suspense } from 'react';
import MorningDashboardClient from './_components/MorningDashboardClient';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// USDA REPORT CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

interface USDAReport {
  name: string; date: string; impact: 'high' | 'medium'; shortDesc: string;
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
    .filter(r => new Date(r.date + 'T12:00:00') >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
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
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
        <h2 className="text-sm font-semibold text-white/90 tracking-tight">USDA Reports That Move Markets</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {reports.map((r, i) => {
          const days = daysUntil(r.date);
          const isImminent = days <= 3;
          const dateObj = new Date(r.date + 'T12:00:00');
          return (
            <div key={`${r.name}-${r.date}-${i}`} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${isImminent ? 'bg-amber-500/[0.08] border border-amber-500/20' : 'bg-white/[0.03] border border-white/[0.04]'}`}>
              <div className="flex-shrink-0 text-center w-12">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isImminent ? 'text-amber-400' : 'text-white/30'}`}>{dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
                <div className={`text-lg font-bold tabular-nums ${isImminent ? 'text-amber-300' : 'text-white/80'}`}>{dateObj.getDate()}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white/90 truncate">{r.name}</span>
                  {r.impact === 'high' && <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 uppercase">High Impact</span>}
                </div>
                <p className="text-[11px] text-white/30 mt-0.5 truncate">{r.shortDesc}</p>
              </div>
              <div className={`flex-shrink-0 text-xs font-bold tabular-nums ${isImminent ? 'text-amber-400' : 'text-white/25'}`}>{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION EYEBROW (server-side version)
// ═══════════════════════════════════════════════════════════════════════════════

function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.1em] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SKELETON — Deploy 2: Expanded for Farm Command Center
// ═══════════════════════════════════════════════════════════════════════════════

function MorningSkeleton() {
  return (
    <>
      <section className="relative bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0f2b1e] pt-24 pb-8 sm:pt-28 sm:pb-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="w-48 h-8 rounded-lg bg-white/[0.06] animate-[hf-shimmer_1.4s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] mb-2" />
          <div className="w-64 h-4 rounded bg-white/[0.04] animate-[hf-shimmer_1.4s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] mb-4" />
          <div className="w-36 h-9 rounded-xl bg-white/[0.04] animate-[hf-shimmer_1.4s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04]" />
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 lg:px-6 -mt-3 space-y-6">
        <div className="h-[160px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-[100px] rounded-2xl bg-[#0f2518] border border-white/[0.08] animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-4 h-[280px] rounded-2xl bg-gradient-to-br from-[#0C1F17] to-[#1B4332] border border-white/[0.06] animate-pulse" />
          <div className="lg:col-span-3 h-[280px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[320px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
          <div className="h-[320px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
        </div>
        <div className="h-[300px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[240px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
          <div className="h-[240px] rounded-2xl bg-[rgba(27,67,50,0.30)] border border-white/[0.06] animate-pulse" />
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MorningPage() {
  const reports = getUpcomingReports();

  return (
    <div className="min-h-screen bg-[#050f09] relative overflow-hidden">
      {/* Aurora mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: [
          'radial-gradient(at 40% 20%, rgba(16,185,129,0.06) 0px, transparent 50%)',
          'radial-gradient(at 80% 0%, rgba(6,95,70,0.05) 0px, transparent 50%)',
          'radial-gradient(at 0% 80%, rgba(5,150,105,0.04) 0px, transparent 50%)',
          'radial-gradient(at 60% 60%, rgba(201,168,76,0.03) 0px, transparent 50%)',
        ].join(','),
      }} />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        {/* Interactive sections */}
        <Suspense fallback={<MorningSkeleton />}>
          <MorningDashboardClient />
        </Suspense>

        {/* Server-rendered sections */}
        <div className="mx-auto max-w-7xl px-4 lg:px-6 pb-20 space-y-6">
          {/* USDA Calendar — full width, no duplicate CTA */}
          {reports.length > 0 && (
            <div>
              <SectionEyebrow label="Upcoming & Actions" />
              <CalendarCard reports={reports} />
            </div>
          )}

          {/* Data freshness note */}
          <p className="text-center text-[10px] text-white/15 px-4 mt-4">
            Futures: CME settlement prices via Nasdaq Data Link, updated daily after 1:15 PM CT.
            Weather: Open-Meteo, updated every 30 minutes. Soil data: Open-Meteo ERA5 Land model.
            Market data provided by Barchart. Data for educational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
