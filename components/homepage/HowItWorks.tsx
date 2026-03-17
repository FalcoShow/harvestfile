// =============================================================================
// HarvestFile — HowItWorks (Server Component)
// Phase 9 Build 3.5: Final Homepage Polish
//
// REDESIGN: Each step now lives in its own elevated card with warm-tinted
// shadows on cream #F7F3EC bg. Gold connecting dotted line between cards.
// Step badges are forest green circles. Grain texture overlay.
// No more "words on a screen" — every step feels like a designed moment.
// =============================================================================

import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';
import { SectionBadgeLight } from './shared/SectionBadge';

const steps = [
  {
    number: '01',
    title: 'Enter your county & crop',
    description:
      'Select your state, county, and crop. We pull real USDA yield data from the NASS API — the same source FSA uses.',
    detail: 'All 50 states · 3,000+ counties · 16 commodities',
  },
  {
    number: '02',
    title: 'See the money difference',
    description:
      'Get an instant side-by-side comparison showing exactly what ARC-CO and PLC would pay for your specific farm.',
    detail: 'Updated OBBBA reference prices · County-level precision',
  },
  {
    number: '03',
    title: 'Make your election with confidence',
    description:
      'View your county\'s historical trends, run scenario models, or get a full AI-powered report for your FSA visit.',
    detail: '$39 full report · Or free calculator forever',
  },
];

export function HowItWorks() {
  return (
    <section
      className="relative py-[120px] lg:py-[160px] overflow-hidden"
      style={{ background: '#F7F3EC' }}
    >
      {/* Grain texture */}
      <div className="hf-grain" />

      {/* Subtle ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse 500px 400px at 70% 30%, rgba(201,168,76,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[900px] px-6">
        {/* Header */}
        <RevealOnScroll>
          <div className="text-center mb-20">
            <SectionBadgeLight className="mb-5">How It Works</SectionBadgeLight>
            <h2 className="text-[clamp(28px,4vw,44px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em] leading-[1.1]">
              Three steps.{' '}
              <span className="font-serif italic font-normal">Real money.</span>
            </h2>
          </div>
        </RevealOnScroll>

        {/* Steps — each in its own card */}
        <div className="relative">
          {/* Gold dotted connecting line (desktop only) */}
          <div
            className="hidden sm:block absolute left-[39px] top-[60px] bottom-[60px] w-[2px]"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, rgba(201,168,76,0.3) 0px, rgba(201,168,76,0.3) 4px, transparent 4px, transparent 12px)',
            }}
          />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <RevealOnScroll key={step.number} delay={i * 120}>
                <div className="flex gap-6 sm:gap-8">
                  {/* Step number badge — forest green circle */}
                  <div className="shrink-0">
                    <div
                      className="w-[80px] h-[80px] rounded-2xl bg-harvest-forest-950 flex items-center justify-center relative z-10"
                      style={{
                        boxShadow: '0 4px 12px rgba(12,31,23,0.20), 0 1px 3px rgba(12,31,23,0.15)',
                      }}
                    >
                      <span className="text-[22px] font-extrabold text-harvest-gold tracking-[-0.04em]">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Step card */}
                  <div
                    className="flex-1 rounded-2xl p-7 sm:p-8"
                    style={{
                      background: '#FFFDF9',
                      border: '1px solid rgba(12,31,23,0.05)',
                      boxShadow: '0 1px 2px rgba(12,31,23,0.05), 0 2px 4px rgba(12,31,23,0.04), 0 4px 8px rgba(12,31,23,0.03), 0 8px 16px rgba(12,31,23,0.02)',
                    }}
                  >
                    <h3 className="text-[22px] font-bold text-harvest-forest-950 tracking-[-0.02em] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-[18px] text-[#4A5E52] leading-[1.65] mb-3">
                      {step.description}
                    </p>
                    <span className="text-[13px] font-semibold text-harvest-gold-dim uppercase tracking-wider">
                      {step.detail}
                    </span>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        {/* CTA */}
        <RevealOnScroll delay={400}>
          <div className="text-center mt-16">
            <Link
              href="/check"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl
                bg-harvest-forest-950 text-[16px] font-bold text-white
                hover:bg-harvest-forest-800 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                boxShadow: '0 4px 12px rgba(12,31,23,0.20), 0 1px 3px rgba(12,31,23,0.15)',
              }}
            >
              Start Your Free Calculation
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
