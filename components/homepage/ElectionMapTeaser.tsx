// =============================================================================
// HarvestFile — ElectionMapTeaser (Client Component)
// Phase 9 Build 1: Homepage Revolution
//
// A premium teaser section that showcases the election choropleth map.
// Lazy-loads the full ElectionMap component to protect performance.
// Dark section with gold accents — this is the "holy shit" moment
// where farmers realize HarvestFile has data nobody else has.
// =============================================================================

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';
import { AnimatedCounter } from './shared/AnimatedCounter';

// Lazy-load the map — it's ~400KB with react-simple-maps + TopoJSON
const ElectionMap = dynamic(
  () => import('@/components/marketing/ElectionMap'),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/10] rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[13px] text-white/30">Loading election data...</span>
        </div>
      </div>
    ),
  }
);

export function ElectionMapTeaser() {
  return (
    <section className="relative overflow-hidden bg-harvest-forest-950 py-20 sm:py-28">
      {/* Noise */}
      <div className="hf-noise-subtle" />

      {/* Gradient accents */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsla(38, 85%, 55%, 0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <RevealOnScroll>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-harvest-gold opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-harvest-gold" />
              </span>
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
                First of Its Kind · County-Level Election Data
              </span>
            </div>

            <h2 className="text-[clamp(28px,4vw,46px)] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
              See what every county{' '}
              <span className="font-serif italic font-normal text-harvest-gold">
                is choosing
              </span>
            </h2>
            <p className="text-[16px] text-white/35 leading-relaxed max-w-[540px] mx-auto">
              The first real-time ARC-CO vs PLC election map. Explore 7 years of
              enrollment data across every farming county in America.
            </p>
          </div>
        </RevealOnScroll>

        {/* Map */}
        <RevealOnScroll delay={150}>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
            <ElectionMap />
          </div>
        </RevealOnScroll>

        {/* Stats + CTA */}
        <RevealOnScroll delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-8">
            {/* Stats */}
            <div className="flex items-center gap-8 sm:gap-12">
              {[
                { value: 3142, label: 'Counties mapped' },
                { value: 7, label: 'Years of history' },
                { value: 16, label: 'Commodities tracked' },
              ].map((stat, i) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <div className="text-[22px] font-extrabold text-white tracking-tight">
                    <AnimatedCounter value={stat.value} duration={1200 + i * 200} />
                  </div>
                  <div className="text-[11px] text-white/25 font-semibold uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <Link
                href="/elections"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-white/[0.06] border border-white/[0.1] text-[14px] font-semibold text-white/70
                  hover:bg-white/[0.1] hover:text-white transition-all duration-200"
              >
                Explore Full Map
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
