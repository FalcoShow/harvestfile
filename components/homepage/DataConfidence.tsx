// =============================================================================
// HarvestFile — DataConfidence (Server Component)
// Build 11 Deploy 2: Quantitative trust through data density
//
// Dark background section with animated stat counters, methodology
// transparency, and early-stage social proof. Replaces the old
// SocialProof and BenchmarkTeaser sections.
//
// Strategy: Emphasize data scope (not user counts) for early-stage
// credibility. Activity counters → institutional attribution →
// methodology card → founder credibility.
// =============================================================================

import { AnimatedCounter } from '@/components/homepage/shared/AnimatedCounter';
import { SectionBadge } from '@/components/homepage/shared/SectionBadge';
import { RevealOnScroll } from '@/components/homepage/shared/RevealOnScroll';

const stats = [
  {
    value: 3143,
    suffix: '',
    label: 'U.S. counties mapped',
    sublabel: 'Every state covered',
  },
  {
    value: 16,
    suffix: '',
    label: 'ARC/PLC commodities',
    sublabel: 'Complete OBBBA coverage',
  },
  {
    value: 100,
    suffix: '%',
    label: 'free to use',
    sublabel: 'No credit card ever',
  },
];

const dataSources = [
  {
    name: 'USDA NASS',
    description: 'County yields and planted acreage',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18M4 18h16M6 18V9m4 9V9m4 9V9m4 9V9M2 9l10-6 10 6" />
      </svg>
    ),
  },
  {
    name: 'USDA FSA',
    description: 'Program parameters and reference prices',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l8 4v6c0 5.25-3.5 8.75-8 10-4.5-1.25-8-4.75-8-10V6l8-4z" />
      </svg>
    ),
  },
  {
    name: 'Barchart',
    description: 'Live grain futures and elevator bids',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18M7 16l4-4 4 4 5-6" />
      </svg>
    ),
  },
  {
    name: 'Open-Meteo',
    description: 'Hyper-local weather forecasts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      </svg>
    ),
  },
];

export function DataConfidence() {
  return (
    <section
      className="relative py-20 md:py-28 bg-harvest-forest-950"
      aria-label="Data confidence and methodology"
    >
      {/* Noise overlay */}
      <div className="hf-noise-subtle" aria-hidden="true" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section header */}
        <RevealOnScroll>
          <div className="text-center mb-16 md:mb-20">
            <SectionBadge variant="emerald">Transparent · Verified · Independent</SectionBadge>
            <h2
              className="mt-5 font-bold tracking-[-0.02em] text-white/90"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.15 }}
            >
              Built on data you{' '}
              <span
                className="font-serif italic text-harvest-gold"
                style={{ fontFamily: 'var(--font-instrument)' }}
              >
                already trust.
              </span>
            </h2>
            <p className="mt-4 text-white/35 max-w-lg mx-auto text-[15px] leading-relaxed">
              The same datasets and formulas used by USDA&apos;s Farm Service Agency — 
              delivered in a modern interface you can actually use.
            </p>
          </div>
        </RevealOnScroll>

        {/* Stats row */}
        <RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center py-8 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div
                  className="font-bold text-harvest-gold tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1 }}
                >
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-3 text-sm font-semibold text-white/60">
                  {stat.label}
                </div>
                <div className="text-[12px] text-white/25 mt-1">
                  {stat.sublabel}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Data sources grid */}
        <RevealOnScroll delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source) => (
              <div
                key={source.name}
                className="flex items-start gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-harvest-gold/60 shrink-0">
                  {source.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/70">
                    {source.name}
                  </div>
                  <div className="text-[13px] text-white/30 mt-0.5">
                    {source.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Methodology statement */}
        <RevealOnScroll delay={200}>
          <div className="mt-12 text-center">
            <div className="inline-flex flex-col items-center gap-4 max-w-xl">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-harvest-gold/50">
                  <path d="M12 2l8 4v6c0 5.25-3.5 8.75-8 10-4.5-1.25-8-4.75-8-10V6l8-4z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
                  Independence Commitment
                </span>
              </div>
              <p className="text-sm text-white/30 leading-relaxed">
                HarvestFile is not owned by, affiliated with, or funded by any seed company, 
                chemical manufacturer, equipment dealer, or grain buyer. Your data stays yours. 
                We never sell farmer data. Period.
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
