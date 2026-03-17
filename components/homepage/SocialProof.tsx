// =============================================================================
// HarvestFile — SocialProof (Server Component)
// Phase 9 Build 2.5: Light Chapter Polish
//
// CHANGES FROM BUILD 1:
//   - Section padding bumped to 120-160px
//   - Body text increased: stat labels 15px, detail 13px, source detail 15px
//   - Data source descriptions bumped from 14px → 15px
//   - Overall text colors warmer for better readability on cream
//   - Stat value size increased slightly for more punch
// =============================================================================

import { RevealOnScroll } from './shared/RevealOnScroll';

const stats = [
  { value: '50', label: 'States Covered', detail: 'Every state in the US' },
  { value: '3,142', label: 'Counties', detail: 'Full USDA coverage' },
  { value: '16', label: 'Crop Programs', detail: 'All covered commodities' },
  { value: '$0', label: 'To Start', detail: 'Free calculator forever' },
];

const dataSources = [
  {
    name: 'USDA NASS',
    detail: 'County yield data via Quick Stats API',
  },
  {
    name: 'Farm Service Agency',
    detail: 'ARC/PLC program rules & formulas',
  },
  {
    name: 'OBBBA 2025',
    detail: 'Updated statutory reference prices',
  },
  {
    name: 'USDA ERS',
    detail: 'Season-average price forecasts',
  },
];

export function SocialProof() {
  return (
    <section className="relative py-[120px] lg:py-[140px] bg-[#FAFAF7]">
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Stats Grid */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white border border-[#E2DDD3]/60 p-7 text-center
                  hover:shadow-md hover:shadow-black/[0.03] transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="text-[clamp(32px,4.5vw,44px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em]">
                  {stat.value}
                </div>
                <div className="text-[15px] font-semibold text-harvest-forest-800 mt-1.5">
                  {stat.label}
                </div>
                <div className="text-[13px] text-[#8B9484] mt-0.5">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Data Sources — credibility section */}
        <RevealOnScroll delay={150}>
          <div className="rounded-2xl bg-white border border-[#E2DDD3]/60 p-8 sm:p-10">
            <div className="text-center mb-10">
              <h3 className="text-[22px] font-bold text-harvest-forest-950 tracking-[-0.02em] mb-2">
                Transparent data. Real sources.
              </h3>
              <p className="text-[16px] text-[#6B7264]">
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
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-[#E2DDD3]/40">
              {['256-bit encryption', 'We never sell your data', 'Ag Data Transparent aligned'].map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3A0]"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500/60" viewBox="0 0 20 20" fill="currentColor">
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
