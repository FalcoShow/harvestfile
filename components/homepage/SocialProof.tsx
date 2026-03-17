// =============================================================================
// HarvestFile — SocialProof (Server Component)
// Phase 9 Build 3: The Visceral Upgrade
//
// CHANGES:
//   - Section bg changed to green-tinted #EFF5F2 for differentiation
//   - Stat card bg changed to white with premium green-tinted shadows
//   - Stat numbers bumped to larger size with tighter tracking
//   - Data sources section redesigned with icons
//   - Grain texture overlay added
//   - Trust badges with better visual treatment
// =============================================================================

import { RevealOnScroll } from './shared/RevealOnScroll';

const stats = [
  { value: '50', suffix: '', label: 'States Covered', detail: 'Every state in the US' },
  { value: '3,142', suffix: '', label: 'Counties', detail: 'Full USDA coverage' },
  { value: '16', suffix: '', label: 'Crop Programs', detail: 'All covered commodities' },
  { value: '$0', suffix: '', label: 'To Start', detail: 'Free calculator forever' },
];

const dataSources = [
  { name: 'USDA NASS', detail: 'County yield data via Quick Stats API' },
  { name: 'Farm Service Agency', detail: 'ARC/PLC program rules & formulas' },
  { name: 'OBBBA 2025', detail: 'Updated statutory reference prices' },
  { name: 'USDA ERS', detail: 'Season-average price forecasts' },
];

export function SocialProof() {
  return (
    <section
      className="relative py-[120px] lg:py-[140px] overflow-hidden"
      style={{ background: '#EFF5F2' }}
    >
      {/* Grain texture */}
      <div className="hf-grain" />

      {/* Subtle ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse 600px 400px at 50% 30%, rgba(12,31,23,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        {/* Stats Grid */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white p-7 text-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  boxShadow: '0 1px 2px rgba(12,31,23,0.06), 0 2px 4px rgba(12,31,23,0.04), 0 4px 8px rgba(12,31,23,0.03)',
                  border: '1px solid rgba(12,31,23,0.04)',
                }}
              >
                <div className="text-[clamp(32px,4.5vw,48px)] font-extrabold text-harvest-forest-950 tracking-[-0.04em] leading-none">
                  {stat.value}
                </div>
                <div className="text-[15px] font-semibold text-harvest-forest-800 mt-2">
                  {stat.label}
                </div>
                <div className="text-[13px] text-[#7A8A7E] mt-0.5">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Data Sources */}
        <RevealOnScroll delay={150}>
          <div
            className="rounded-2xl bg-white p-8 sm:p-10"
            style={{
              boxShadow: '0 1px 2px rgba(12,31,23,0.06), 0 2px 4px rgba(12,31,23,0.04), 0 4px 8px rgba(12,31,23,0.03)',
              border: '1px solid rgba(12,31,23,0.04)',
            }}
          >
            <div className="text-center mb-10">
              <h3 className="text-[22px] font-bold text-harvest-forest-950 tracking-[-0.02em] mb-2">
                Transparent data. Real sources.
              </h3>
              <p className="text-[16px] text-[#5A6356]">
                Every number on HarvestFile comes from official USDA data. Here&apos;s
                exactly where.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {dataSources.map((source) => (
                <div key={source.name} className="text-center">
                  <div className="text-[15px] font-bold text-harvest-forest-950 mb-1">
                    {source.name}
                  </div>
                  <div className="text-[14px] text-[#7A8274] leading-relaxed">
                    {source.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-[#E2DDD3]/40 flex-wrap">
              {['256-bit encryption', 'We never sell your data', 'Ag Data Transparent aligned'].map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[#7A8A7E]"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500/70" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
