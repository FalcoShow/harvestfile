// =============================================================================
// HarvestFile — Phase 8B: Election Intelligence Page
// /elections — The national ARC/PLC election map
//
// This is the page farmers share on Facebook and text to neighbors.
// "Look at what our county chose — check yours."
//
// Server Component shell with dynamically imported client map.
// Full dark theme matching the premium HarvestFile brand.
// =============================================================================

import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// ─── Dynamic Import: Map (client-only, no SSR) ──────────────────────────────
// react-simple-maps requires browser APIs. The map + TopoJSON bundle
// loads as a separate chunk (~210KB gzip) only when this page is visited.

const ElectionMap = dynamic(
  () => import('@/components/marketing/ElectionMap'),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

function MapSkeleton() {
  return (
    <div className="animate-pulse">
      {/* KPI bar skeleton */}
      <div className="flex justify-center gap-8 mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-6 w-16 rounded bg-white/[0.06]" />
            <div className="h-3 w-12 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
      {/* Filter skeleton */}
      <div className="flex gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 rounded-lg bg-white/[0.04]" />
        ))}
      </div>
      {/* Map skeleton */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c1222] aspect-[980/600] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-white/30">Loading the map...</span>
        </div>
      </div>
    </div>
  );
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'ARC/PLC Election Map — See What Every County Chose | HarvestFile',
  description:
    'Interactive county-level map showing ARC-CO vs PLC enrollment across America. ' +
    'Real USDA FSA data for 2,000+ farming counties. See what your neighbors chose.',
  openGraph: {
    title: 'ARC/PLC Election Map — HarvestFile',
    description: 'See what every county in America chose: ARC-CO or PLC. Real USDA data, interactive map.',
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
        <section className="pt-20 sm:pt-28 pb-10 px-6">
          <div className="max-w-[1100px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.12em]">
                USDA FSA Data · 2,000+ Counties
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

            <p className="text-[15px] sm:text-[17px] text-white/35 leading-relaxed max-w-[600px] mx-auto mb-4">
              County-by-county ARC-CO vs PLC enrollment for every farming county
              in the United States. Real USDA Farm Service Agency data.
            </p>

            <p className="text-[13px] text-white/20 max-w-[500px] mx-auto">
              Explore 7 years of enrollment history across 16 covered commodities.
              Click any county to see detailed ARC/PLC analysis with payment projections.
            </p>
          </div>
        </section>

        {/* ═══ MAP SECTION ═══ */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-[1100px] mx-auto">
            <ElectionMap />
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section className="px-6 pb-20">
          <div className="max-w-[900px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: '🗺️',
                  title: 'Explore the Map',
                  desc: 'Hover over any county to see its ARC-CO vs PLC enrollment split. Filter by crop or year.',
                },
                {
                  icon: '📊',
                  title: 'Dive Into Your County',
                  desc: 'Click any county for detailed payment projections, scenario modeling, and historical trends.',
                },
                {
                  icon: '🗳️',
                  title: 'Share Your 2026 Election',
                  desc: 'Help build the first real-time ARC/PLC benchmark. Anonymous and secure — only county totals shown.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/10 transition-colors"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                  <p className="text-[13px] text-white/30 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <Link
                href="/check"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/25 transition-all text-sm"
              >
                Run the Free ARC/PLC Calculator
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="text-[11px] text-white/20 mt-3">
                No signup required · Real USDA data · Instant results
              </p>
            </div>
          </div>
        </section>

        {/* ═══ DISCLAIMER ═══ */}
        <div className="px-6 pb-12">
          <div className="max-w-[900px] mx-auto">
            <p className="text-[10px] text-white/15 text-center leading-relaxed">
              Data source: USDA Farm Service Agency &ldquo;Enrolled Base Acres by County by Commodity by Program&rdquo;
              files, 2019–2025. This is not official USDA guidance. HarvestFile is not affiliated with USDA.
              ARC/PLC election decisions should be made in consultation with your local FSA office or agricultural advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
