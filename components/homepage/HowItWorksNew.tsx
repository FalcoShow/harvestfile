// =============================================================================
// HarvestFile — HowItWorks (Server Component)
// Build 13 Deploy 2C+2D: Typography Consistency
//
// CHANGES FROM BUILD 12:
//   - REMOVED Instrument Serif italic from "Thirty seconds." accent text
//   - Now uses Bricolage Grotesque ExtraBold + gold gradient (matching hero)
//   - All other styling preserved from Build 12
// =============================================================================

import { RevealOnScroll } from '@/components/homepage/shared/RevealOnScroll';

// Gold gradient text style — matches HeroSection pattern exactly
const goldGradientStyle = {
  backgroundImage: 'linear-gradient(135deg, #C9A84C, #E2C366, #D4B55A)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
} as const;

const steps = [
  {
    number: '01',
    headline: 'Enter your county',
    description: 'Type your county name. We pull your local data instantly — no account needed.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    number: '02',
    headline: 'See your data',
    description: 'Live grain bids, weather, and ARC/PLC payment estimates — all personalized to your county.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    number: '03',
    headline: 'Make smarter decisions',
    description: 'Run ARC vs PLC scenarios, compare elections, and walk into your FSA office confident.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      className="relative py-20 md:py-24 bg-harvest-forest-950 overflow-hidden"
      aria-label="How it works"
    >
      {/* Ambient gold glow behind content */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle noise texture */}
      <div className="hf-noise-subtle" aria-hidden="true" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <h2 className="hf-heading-section text-white/90">
              Three steps.{' '}
              <span className="font-extrabold" style={goldGradientStyle}>
                Thirty seconds.
              </span>
            </h2>
          </div>
        </RevealOnScroll>

        {/* Steps grid with connecting line */}
        <div className="relative">
          {/* Horizontal connecting line (desktop only) */}
          <div
            className="hidden md:block absolute top-[52px] left-[16.67%] right-[16.67%] h-[1px] z-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(201,168,76,0) 0%, rgba(201,168,76,0.3) 15%, rgba(201,168,76,0.3) 85%, rgba(201,168,76,0) 100%)',
            }}
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <RevealOnScroll key={step.number} delay={i * 120}>
                <div className="relative flex flex-col items-center text-center">
                  {/* Gold step number circle */}
                  <div className="relative z-10 w-[44px] h-[44px] rounded-full bg-harvest-gold flex items-center justify-center mb-6 shadow-[0_2px_12px_rgba(201,168,76,0.3)]">
                    <span className="text-sm font-bold text-harvest-forest-950">
                      {step.number}
                    </span>
                  </div>

                  {/* Card */}
                  <div className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-6 md:p-7 transition-all duration-300 hover:bg-white/[0.06] hover:border-harvest-gold/10">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-harvest-gold/10 border border-harvest-gold/15 flex items-center justify-center text-harvest-gold/70 mx-auto mb-4">
                      {step.icon}
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-white/90 tracking-[-0.01em]">
                      {step.headline}
                    </h3>
                    <p className="mt-2.5 text-white/45 leading-relaxed text-[15px]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
