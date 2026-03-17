// =============================================================================
// HarvestFile — SocialProof (Server Component)
// Phase 9 Build 4: Unified Cream — COMPLETE OVERHAUL
//
// The old version felt like "words on a blank canvas." This redesign:
//   - Unified #F5F0E6 golden cream bg
//   - Stats section: dark forest green accent band for visual punch
//   - Data sources: redesigned with icon badges in a card
//   - Trust badges: pill-shaped with borders
//   - Grain texture + ambient glows throughout
// =============================================================================

import { RevealOnScroll } from './shared/RevealOnScroll';

const stats = [
  { value: '50', label: 'States', detail: 'Every state covered' },
  { value: '3,142', label: 'Counties', detail: 'Full USDA coverage' },
  { value: '16', label: 'Commodities', detail: 'All covered crops' },
  { value: '$0', label: 'To Start', detail: 'Free forever' },
];

const dataSources = [
  { abbr: 'NASS', name: 'USDA NASS', detail: 'County yield data via Quick Stats API' },
  { abbr: 'FSA', name: 'Farm Service Agency', detail: 'ARC/PLC program rules & formulas' },
  { abbr: '2025', name: 'OBBBA Farm Bill', detail: 'Updated statutory reference prices' },
  { abbr: 'ERS', name: 'USDA ERS', detail: 'Season-average price forecasts' },
];

export function SocialProof() {
  return (
    <section className="relative py-[120px] lg:py-[140px] overflow-hidden" style={{ background: '#F5F0E6' }}>
      {/* Grain texture */}
      <div className="hf-grain" />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: [
          'radial-gradient(ellipse 500px 400px at 50% 20%, rgba(12,31,23,0.04) 0%, transparent 70%)',
          'radial-gradient(ellipse 400px 300px at 80% 70%, rgba(201,168,76,0.05) 0%, transparent 70%)',
        ].join(', '),
      }} />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">

        {/* ─── Stats: Dark accent band ──────────────────────────────── */}
        <RevealOnScroll>
          <div
            className="rounded-2xl overflow-hidden mb-16"
            style={{
              background: '#0C1F17',
              boxShadow: '0 4px 8px rgba(12,31,23,0.1), 0 8px 16px rgba(12,31,23,0.08), 0 16px 32px rgba(12,31,23,0.06)',
            }}
          >
            <div className="hf-noise-subtle" />
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.06]">
              {stats.map((stat) => (
                <div key={stat.label} className="p-7 sm:p-8 text-center">
                  <div className="text-[clamp(32px,4.5vw,48px)] font-extrabold text-white tracking-[-0.04em] leading-none">
                    {stat.value}
                  </div>
                  <div className="text-[15px] font-semibold text-white/60 mt-2">
                    {stat.label}
                  </div>
                  <div className="text-[12px] text-white/25 mt-0.5">
                    {stat.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* ─── Data Sources: Redesigned with icon badges ────────────── */}
        <RevealOnScroll delay={150}>
          <div
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: '#FFFDF9',
              border: '1px solid rgba(12,31,23,0.05)',
              boxShadow: '0 1px 2px rgba(12,31,23,0.05), 0 2px 4px rgba(12,31,23,0.04), 0 4px 8px rgba(12,31,23,0.03), 0 8px 16px rgba(12,31,23,0.02)',
            }}
          >
            <div className="text-center mb-10">
              <h3 className="text-[22px] font-bold text-harvest-forest-950 tracking-[-0.02em] mb-2">
                Transparent data. Real sources.
              </h3>
              <p className="text-[16px] text-[#5A6356]">
                Every number on HarvestFile comes from official USDA data.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {dataSources.map((source) => (
                <div key={source.name} className="text-center">
                  {/* Icon badge */}
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-harvest-forest-950/[0.06] mb-3">
                    <span className="text-[13px] font-extrabold text-harvest-forest-950 tracking-tight">
                      {source.abbr}
                    </span>
                  </div>
                  <div className="text-[15px] font-bold text-harvest-forest-950 mb-1">
                    {source.name}
                  </div>
                  <div className="text-[14px] text-[#7A8274] leading-relaxed">
                    {source.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges — pill-shaped with borders */}
            <div className="flex items-center justify-center gap-4 mt-10 pt-6 border-t border-[#E5DFD3] flex-wrap">
              {['256-bit encryption', 'We never sell your data', 'Ag Data Transparent aligned'].map((badge) => (
                <div
                  key={badge}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium text-[#5A6356]"
                  style={{
                    border: '1px solid rgba(12,31,23,0.08)',
                    background: 'rgba(12,31,23,0.02)',
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
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
