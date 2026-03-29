// =============================================================================
// HarvestFile — ElectionMapTeaser (Client Component)
// Build 13 Deploy 2C+2D: Typography Consistency
//
// CHANGES FROM PHASE 9 BUILD 4.5:
//   - REMOVED Instrument Serif italic from "is choosing" accent text
//   - Now uses Bricolage Grotesque ExtraBold + gold gradient (matching hero)
//   - All mobile polish fixes from Build 4.5 preserved
//   - All other styling preserved
// =============================================================================

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';
import { AnimatedCounter } from './shared/AnimatedCounter';

// Gold gradient text style — matches HeroSection pattern exactly
const goldGradientStyle = {
  backgroundImage: 'linear-gradient(135deg, #C9A84C, #E2C366, #D4B55A)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
} as const;

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
    <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-24">
      {/* Noise — continuity with hero */}
      <div className="hf-noise-subtle" />

      {/* Subtle gradient accent */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsla(38, 85%, 55%, 0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-5 sm:px-6">
        <RevealOnScroll>
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-harvest-gold opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-harvest-gold" />
              </span>
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
                First of Its Kind · County-Level Election Data
              </span>
            </div>

            <h2 className="text-[clamp(24px,4vw,46px)] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
              See what every county{' '}
              <span className="font-extrabold" style={goldGradientStyle}>
                is choosing
              </span>
            </h2>
            <p className="text-[15px] sm:text-[16px] text-white/45 leading-relaxed max-w-[540px] mx-auto">
              The first real-time ARC-CO vs PLC election map. Explore 7 years of
              enrollment data across every farming county in America.
            </p>
          </div>
        </RevealOnScroll>

        {/* Map container — overflow-hidden prevents bleed on mobile */}
        <RevealOnScroll delay={100}>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
            <ElectionMap />
          </div>
        </RevealOnScroll>

        {/* Stats + CTA row — grid on mobile for better wrapping */}
        <RevealOnScroll delay={200}>
          <div className="mt-6 sm:mt-8">
            {/* Stats grid — 3 cols on mobile, inline with CTA on desktop */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="grid grid-cols-3 gap-4 sm:gap-8 lg:gap-12 w-full sm:w-auto">
                {[
                  { value: 3142, label: 'Counties mapped' },
                  { value: 7, label: 'Years of history' },
                  { value: 16, label: 'Commodities tracked' },
                ].map((stat, i) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-[20px] sm:text-[22px] font-extrabold text-white tracking-tight">
                      <AnimatedCounter value={stat.value} duration={1200 + i * 200} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-white/25 font-semibold uppercase tracking-wider mt-0.5">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/elections"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
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
