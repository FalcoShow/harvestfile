// =============================================================================
// HarvestFile — DataConfidence (Server Component)
// Build 12 Deploy 3: Premium visual overhaul
//
// Changes: Stats use hf-card-dark with gold border accent on hover.
// Data source cards use hf-card-dark. Typography uses scale classes.
// Gold ambient glow behind stats row. Independence section gets gold rule.
// =============================================================================

import { AnimatedCounter } from '@/components/homepage/shared/AnimatedCounter';
import { SectionBadge } from '@/components/homepage/shared/SectionBadge';
import { RevealOnScroll } from '@/components/homepage/shared/RevealOnScroll';

const stats = [
  { value: 3143, suffix: '', label: 'U.S. counties mapped', sublabel: 'Every state covered' },
  { value: 16, suffix: '', label: 'ARC/PLC commodities', sublabel: 'Complete OBBBA coverage' },
  { value: 100, suffix: '%', label: 'free to use', sublabel: 'No credit card ever' },
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
      <div className="hf-noise-subtle" aria-hidden="true" />

      {/* Ambient gold glow behind stats */}
      <div
        className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section header */}
        <RevealOnScroll>
          <div className="text-center mb-14 md:mb-20">
            <SectionBadge variant="emerald">Transparent · Verified · Independent</SectionBadge>
            <h2 className="mt-5 hf-heading-section text-white/90">
              Built on data you{' '}
              <span className="font-serif italic text-harvest-gold" style={{ fontFamily: 'var(--font-instrument)' }}>
                already trust.
              </span>
            </h2>
            <p className="mt-4 text-white/35 max-w-lg mx-auto hf-body-lg leading-relaxed">
              The same datasets and formulas used by USDA&apos;s Farm Service Agency — 
              delivered in a modern interface you can actually use.
            </p>
          </div>
        </RevealOnScroll>

        {/* Stats row — premium cards */}
        <RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14 md:mb-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="hf-card-dark text-center py-8 px-6 rounded-2xl"
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

        {/* Data sources grid — premium cards */}
        <RevealOnScroll delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dataSources.map((source) => (
              <div
                key={source.name}
                className="hf-card-dark flex items-start gap-4 p-5 rounded-xl"
              >
                <div className="w-9 h-9 rounded-lg bg-harvest-gold/[0.08] border border-harvest-gold/15 flex items-center justify-center text-harvest-gold/60 shrink-0">
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

        {/* Independence statement with gold rule */}
        <RevealOnScroll delay={200}>
          <div className="mt-14">
            <div className="max-w-[500px] mx-auto mb-8">
              <div className="hf-gold-rule h-px" />
            </div>
            <div className="text-center">
              <div className="inline-flex flex-col items-center gap-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-harvest-gold/50">
                    <path d="M12 2l8 4v6c0 5.25-3.5 8.75-8 10-4.5-1.25-8-4.75-8-10V6l8-4z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span className="hf-eyebrow text-white/30">
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
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
