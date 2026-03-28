// =============================================================================
// HarvestFile — FinalCTA (Server Component)
// Build 11 Deploy 2: Premium final CTA with aurora glow effect
//
// Calm confidence pattern: generous whitespace, short direct headline,
// single primary gold button, benefit/outcome language. Aurora glow is
// CSS-only (keyframe animation in globals.css), no client JS needed.
//
// Geo-personalization: If we had the county from the hero, we could
// personalize the CTA. For now, it's generic but premium.
// =============================================================================

import { RevealOnScroll } from '@/components/homepage/shared/RevealOnScroll';

export function FinalCTA() {
  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden bg-harvest-forest-950"
      aria-label="Get started"
    >
      {/* Aurora glow background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%]"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(201, 168, 76, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(27, 67, 50, 0.35) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, rgba(226, 195, 102, 0.06) 0%, transparent 50%)
            `,
            filter: 'blur(80px)',
            animation: 'hf-aurora-slow 20s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Noise overlay */}
      <div className="hf-noise-subtle" aria-hidden="true" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <RevealOnScroll>
          {/* Headline */}
          <h2
            className="font-bold tracking-[-0.025em] text-white/90"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1.1 }}
          >
            Know your numbers
            <br />
            <span className="text-harvest-gold">before election day.</span>
          </h2>

          {/* Subtext */}
          <p className="mt-5 text-white/35 text-[16px] leading-relaxed max-w-md mx-auto">
            Built on official USDA, NOAA, and Barchart data.
            <br />
            Free to use. Updated daily.
          </p>

          {/* CTA button */}
          <div className="mt-10">
            <a
              href="/check"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl
                text-base font-semibold text-harvest-forest-950
                bg-gradient-to-br from-harvest-gold to-harvest-gold-bright
                shadow-[0_4px_20px_rgba(201,168,76,0.25)]
                hover:shadow-[0_6px_30px_rgba(201,168,76,0.4)]
                hover:translate-y-[-2px]
                active:translate-y-0
                transition-all duration-200"
            >
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Trust micro-copy */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-white/25">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-harvest-gold/40">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              No credit card required
            </span>
            <span className="text-white/10">·</span>
            <span>No registration wall</span>
            <span className="text-white/10">·</span>
            <span>Your data stays yours</span>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
