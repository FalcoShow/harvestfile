// =============================================================================
// HarvestFile — FinalCTA (Server Component)
// Phase 9 Build 1: Homepage Revolution
//
// The final conversion section before the footer. Dark forest green
// background matching the hero for visual bookending. Urgent but
// genuine — references real USDA deadlines, not fake scarcity.
// =============================================================================

import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-harvest-forest-950 py-24 sm:py-32">
      {/* Noise */}
      <div className="hf-noise-subtle" />

      {/* Gradient accents */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse at center, hsla(38, 85%, 55%, 0.08) 0%, transparent 60%)',
            'radial-gradient(ellipse at 30% 70%, hsla(152, 60%, 30%, 0.1) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* Top border line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[640px] px-6 text-center">
        <RevealOnScroll>
          <h2 className="text-[clamp(28px,4.5vw,48px)] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-5">
            Stop leaving money{' '}
            <span className="font-serif italic font-normal text-harvest-gold">
              on the table
            </span>
          </h2>

          <p className="text-[16px] text-white/35 leading-relaxed mb-10 max-w-[480px] mx-auto">
            The difference between ARC-CO and PLC can be $15 to $80+ per base acre.
            For a 500-acre farm, that&apos;s up to $40,000 you could be missing.
          </p>

          {/* CTA */}
          <Link
            href="/check"
            className="group relative inline-flex items-center gap-2.5 px-10 py-4.5 rounded-xl
              text-[17px] font-bold text-harvest-forest-950 overflow-hidden
              transition-all duration-300 hover:-translate-y-0.5
              hover:shadow-[0_16px_48px_rgba(201,168,76,0.35)]"
            style={{
              background: 'linear-gradient(135deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)',
              backgroundSize: '200% auto',
            }}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)',
                backgroundSize: '200% auto',
                animation: 'hf-shimmer 2s ease-in-out infinite',
              }}
            />
            <span className="relative">Calculate My Payment — Free</span>
            <svg className="relative w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Sub-CTA links */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <Link
              href="/elections"
              className="text-[13px] font-medium text-white/25 hover:text-white/50 transition-colors"
            >
              Explore Election Map →
            </Link>
            <Link
              href="/pricing"
              className="text-[13px] font-medium text-white/25 hover:text-white/50 transition-colors"
            >
              View Pricing →
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
