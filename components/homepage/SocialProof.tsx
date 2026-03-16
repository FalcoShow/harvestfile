// =============================================================================
// HarvestFile — SocialProof (Server Component)
// Phase 9 Build 1: Homepage Revolution
//
// Stats + trust signals + data source credibility. Shows the scale
// of HarvestFile's coverage and the quality of its data sources.
// Warm cream background with premium stat cards.
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
    <section className="relative py-24 sm:py-28 bg-[#FAFAF7]">
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Stats Grid */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white border border-[#E2DDD3]/60 p-6 text-center
                  hover:shadow-md hover:shadow-black/[0.02] transition-shadow duration-300"
              >
                <div className="text-[clamp(28px,4vw,40px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em]">
                  {stat.value}
                </div>
                <div className="text-[14px] font-semibold text-harvest-forest-800 mt-1">
                  {stat.label}
                </div>
                <div className="text-[12px] text-[#9CA3A0] mt-0.5">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Data Sources — credibility section */}
        <RevealOnScroll delay={150}>
          <div className="rounded-2xl bg-white border border-[#E2DDD3]/60 p-8 sm:p-10">
            <div className="text-center mb-8">
              <h3 className="text-[20px] font-bold text-harvest-forest-950 tracking-[-0.02em] mb-2">
                Transparent data. Real sources.
              </h3>
              <p className="text-[14px] text-[#6B7264]">
                Every number on HarvestFile comes from official USDA data. Here&apos;s
                exactly where.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dataSources.map((source) => (
                <div
                  key={source.name}
                  className="rounded-xl bg-[#FAFAF7] border border-[#E2DDD3]/40 p-4"
                >
                  <div className="text-[14px] font-bold text-harvest-forest-950 mb-1">
                    {source.name}
                  </div>
                  <div className="text-[12px] text-[#6B7264] leading-relaxed">
                    {source.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-[#E2DDD3]/40">
              {[
                '256-bit encryption',
                'We never sell your data',
                'Ag Data Transparent aligned',
              ].map((badge) => (
                <span key={badge} className="flex items-center gap-1.5 text-[12px] text-[#9CA3A0]">
                  <svg className="w-3.5 h-3.5 text-emerald-500/50 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
