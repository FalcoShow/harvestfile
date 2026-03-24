// =============================================================================
// HarvestFile — Phase 30 Build 1: Election Intelligence Page (Enhanced)
// /elections — The Election Night Dashboard
//
// Upgraded from Phase 8B static map to a CNN-election-night-style dashboard
// with national KPI bar, state leaderboards, live activity tracking,
// and county completion meters.
//
// The ElectionMap component is unchanged — it handles its own data fetching.
// ElectionDashboard wraps it with the new dashboard features.
// =============================================================================

import { Metadata } from 'next';
import dynamic from 'next/dynamic';

// ─── Dynamic Imports ─────────────────────────────────────────────────────────

const ElectionMap = dynamic(
  () => import('@/components/marketing/ElectionMap'),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

const ElectionDashboard = dynamic(
  () => import('@/components/elections/ElectionDashboard'),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  }
);

function MapSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-center gap-8 mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-6 w-16 rounded bg-white/[0.06]" />
            <div className="h-3 w-12 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 rounded-lg bg-white/[0.04]" />
        ))}
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c1222] aspect-[980/600] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-white/30">Loading the map...</span>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center">
              <div className="h-9 w-20 mx-auto rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-16 mx-auto rounded bg-white/[0.04] animate-pulse mt-2" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <MapSkeleton />
        </div>
        <div className="w-[320px] rounded-2xl border border-white/[0.06] bg-white/[0.02] h-[500px] animate-pulse" />
      </div>
    </div>
  );
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'ARC/PLC Election Map — See What Every County Chose | HarvestFile',
  description:
    'Interactive county-level map showing ARC-CO vs PLC enrollment across America. ' +
    'Live 2026 benchmarking data from farmers nationwide. Real USDA FSA data for 2,000+ farming counties.',
  openGraph: {
    title: 'ARC/PLC Election Map — HarvestFile',
    description:
      'See what every county in America chose: ARC-CO or PLC. Live 2026 benchmarking + 7 years of USDA data.',
    type: 'website',
    url: 'https://harvestfile.com/elections',
  },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ElectionsPage() {
  return (
    <div className="min-h-screen bg-[#080e0b]">
      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05] mix-blend-soft-light z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient orbs */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-emerald-600/[0.04] blur-[150px] z-0" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.03] blur-[120px] z-0" />

      <div className="relative z-10">
        {/* ═══ HERO ═══ */}
        <section className="pt-20 sm:pt-28 pb-8 px-6">
          <div className="max-w-[1400px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm mb-6">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.12em]">
                Live 2026 Benchmarking · USDA FSA Data · 2,000+ Counties
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(30px,5vw,56px)] font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-5">
              What is America{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #10b981, #3b82f6)',
                }}
              >
                choosing?
              </span>
            </h1>

            <p className="text-[15px] sm:text-[17px] text-white/35 leading-relaxed max-w-[650px] mx-auto mb-3">
              The first real-time ARC/PLC election benchmark in American agriculture.
              County-by-county enrollment data powered by USDA FSA records and live farmer contributions.
            </p>

            <p className="text-[12px] text-white/15 max-w-[500px] mx-auto">
              7 years of historical data · 16 covered commodities · Live 2026 election tracking
            </p>
          </div>
        </section>

        {/* ═══ DASHBOARD + MAP ═══ */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-[1400px] mx-auto">
            <ElectionDashboard>
              <ElectionMap />
            </ElectionDashboard>
          </div>
        </section>
      </div>
    </div>
  );
}
