// =============================================================================
// HarvestFile — HowItWorks (Server Component)
// Phase 9 Build 1: Homepage Revolution
//
// Simple 3-step visual showing the path from landing to decision.
// Cream background, connected timeline, gold step numbers.
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
    <section className="relative py-24 sm:py-32 bg-[#FAFAF7]">
      <div className="mx-auto max-w-[900px] px-6">
        {/* Header */}
        <RevealOnScroll>
          <div className="text-center mb-16">
            <SectionBadgeLight className="mb-5">How It Works</SectionBadgeLight>
            <h2 className="text-[clamp(28px,4vw,44px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em] leading-[1.1]">
              Three steps.{' '}
              <span className="font-serif italic font-normal">Real money.</span>
            </h2>
          </div>
        </RevealOnScroll>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden sm:block absolute left-[39px] top-[60px] bottom-[60px] w-[2px] bg-gradient-to-b from-harvest-gold/30 via-harvest-gold/15 to-harvest-gold/30" />

          <div className="space-y-8 sm:space-y-12">
            {steps.map((step, i) => (
              <RevealOnScroll key={step.number} delay={i * 120}>
                <div className="flex gap-6 sm:gap-8">
                  {/* Step number */}
                  <div className="shrink-0">
                    <div className="w-[80px] h-[80px] rounded-2xl bg-harvest-forest-950 flex items-center justify-center shadow-lg shadow-harvest-forest-950/20 relative z-10">
                      <span className="text-[22px] font-extrabold text-harvest-gold tracking-[-0.04em]">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-2">
                    <h3 className="text-[20px] font-bold text-harvest-forest-950 tracking-[-0.02em] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-[15px] text-[#6B7264] leading-relaxed mb-2">
                      {step.description}
                    </p>
                    <span className="text-[12px] font-semibold text-harvest-gold-dim uppercase tracking-wider">
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
          <div className="text-center mt-14">
            <Link
              href="/check"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl
                bg-harvest-forest-950 text-[15px] font-bold text-white
                hover:bg-harvest-forest-800 transition-all duration-200
                shadow-lg shadow-harvest-forest-950/20 hover:shadow-harvest-forest-800/30
                hover:-translate-y-0.5"
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
