// =============================================================================
// HarvestFile — HowItWorks (Server Component)
// Build 11 Deploy 2: Simplified three-step section on cream background
//
// Reduces perceived complexity for the older farmer demographic (avg age 58).
// Three horizontal cards with large step numbers in Instrument Serif.
// No more than 15 words per step. Body text at 18px minimum.
// =============================================================================

import { RevealOnScroll } from '@/components/homepage/shared/RevealOnScroll';

const steps = [
  {
    number: '01',
    headline: 'Enter your county',
    description: 'Type your county name. We pull your local data instantly — no account needed.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      className="relative py-16 md:py-20"
      style={{ background: '#F5F0E6' }}
      aria-label="How it works"
    >
      {/* Top separator */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.12) 30%, rgba(201,168,76,0.2) 50%, rgba(201,168,76,0.12) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-6">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2
              className="font-bold tracking-[-0.02em] text-harvest-forest-950"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', lineHeight: 1.2 }}
            >
              Three steps.{' '}
              <span
                className="font-serif italic text-harvest-forest-700"
                style={{ fontFamily: 'var(--font-instrument)' }}
              >
                Thirty seconds.
              </span>
            </h2>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <RevealOnScroll key={step.number} delay={i * 100}>
              <div className="relative rounded-2xl bg-white border border-harvest-forest-800/[0.05] p-7 md:p-8 shadow-[0_1px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-300">
                {/* Step number */}
                <span
                  className="block font-serif text-harvest-gold/40 mb-4"
                  style={{
                    fontFamily: 'var(--font-instrument)',
                    fontSize: 'clamp(2rem, 3vw, 2.5rem)',
                    lineHeight: 1,
                  }}
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-harvest-forest-800/[0.04] border border-harvest-forest-800/[0.06] flex items-center justify-center text-harvest-forest-700/60 mb-4">
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-harvest-forest-950 tracking-[-0.01em]">
                  {step.headline}
                </h3>
                <p
                  className="mt-2 text-harvest-forest-700/50 leading-relaxed"
                  style={{ fontSize: '15px' }}
                >
                  {step.description}
                </p>

                {/* Connecting line (hidden on mobile, visible on desktop between cards) */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-1/2 -right-4 md:-right-5 w-8 md:w-10 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.05) 100%)',
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
