// =============================================================================
// HarvestFile — TabbedShowcase (Client Component)
// Build 12: Premium Visual Overhaul
//
// Changes from Build 11 Deploy 2:
//   - REMOVED inline background — parent hf-section-cream handles noise + glow
//   - Preview cards now use hf-card-cream layered shadow system
//   - Tab buttons: active state uses forest green, inactive gets cream card style
//   - Typography uses hf-heading-section and hf-heading-card scale classes
//   - Feature checkmarks use gold circles instead of pale green
//   - CTA button uses gold gradient (matches hero CTA) instead of forest green
//   - Overall: editorial quality, not template quality
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { SectionBadgeLight } from '@/components/homepage/shared/SectionBadge';

// ─── Tab data ─────────────────────────────────────────────────────────────────

const tabs = [
  {
    id: 'morning',
    label: 'Your morning briefing',
    headline: 'Start every day knowing your numbers.',
    body: 'Grain bids from 2,000+ elevators, real-time weather, and your ARC/PLC payment estimates — personalized to your county, updated before sunrise. One screen. Everything that matters.',
    features: [
      'Live grain futures and local basis data',
      'County-specific weather and spray conditions',
      'PLC payment estimates that update with market prices',
    ],
    ctaText: 'See a sample briefing',
    ctaHref: '/check',
  },
  {
    id: 'calculator',
    label: 'Optimize your elections',
    headline: 'Run the scenarios your FSA office can\u2019t.',
    body: 'Compare ARC-CO vs PLC for every covered commodity in your county using the same USDA data and formulas as the Farm Service Agency. See which election maximizes your payment — in seconds, not spreadsheets.',
    features: [
      'All 16 ARC/PLC covered commodities',
      'Multi-year scenario modeling with live prices',
      'OBBBA farm bill compliant calculations',
    ],
    ctaText: 'Try the calculator free',
    ctaHref: '/check',
  },
  {
    id: 'map',
    label: 'See your county\u2019s data',
    headline: 'Know what your neighbors decided.',
    body: 'The only interactive map of ARC/PLC elections across all 3,100+ U.S. counties. See historical election patterns, county-level payment data, and benchmark your decisions against your area.',
    features: [
      'Election data for every U.S. county',
      'Historical enrollment trends by crop',
      'County-level payment projections',
    ],
    ctaText: 'Explore the map',
    ctaHref: '/check',
  },
];

// ─── Tab Preview Components ────────────────────────────────────────────────────

function MorningPreview() {
  return (
    <div className="hf-card-cream rounded-2xl p-5 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { crop: 'Corn', price: '$4.62', change: '+0.03', up: true },
          { crop: 'Soybeans', price: '$10.34', change: '-0.08', up: false },
          { crop: 'Wheat', price: '$5.41', change: '+0.11', up: true },
        ].map((item) => (
          <div
            key={item.crop}
            className="rounded-xl bg-harvest-forest-800/[0.03] border border-harvest-forest-800/[0.06] p-3 text-center"
          >
            <div className="text-[10px] text-harvest-forest-800/50 uppercase tracking-wider font-semibold">
              {item.crop}
            </div>
            <div className="text-base font-bold text-harvest-forest-950 mt-0.5">
              {item.price}
            </div>
            <div className={`text-[10px] font-medium mt-0.5 ${item.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {item.change}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-harvest-forest-800/[0.02] border border-harvest-forest-800/[0.05] p-3">
        <div className="text-harvest-gold text-lg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold text-harvest-forest-950">72°F Clear</div>
          <div className="text-[10px] text-harvest-forest-800/60">Wind 5 mph SW · Spray: GO</div>
        </div>
      </div>

      <div className="rounded-xl bg-harvest-gold/[0.08] border border-harvest-gold/20 p-3">
        <div className="text-[10px] text-harvest-gold-dim uppercase tracking-wider font-semibold">
          2026 PLC Estimate — Corn
        </div>
        <div className="text-xl font-bold text-harvest-forest-950 mt-1">$47.22<span className="text-sm font-normal text-harvest-forest-800/50">/acre</span></div>
      </div>
    </div>
  );
}

function CalculatorPreview() {
  return (
    <div className="hf-card-cream rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-harvest-forest-800/50 font-medium">Darke County, Ohio</div>
          <div className="text-sm font-bold text-harvest-forest-950 mt-0.5">Corn — 2026 Crop Year</div>
        </div>
        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
          ARC-CO Recommended
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="font-semibold text-harvest-forest-950">ARC-CO Payment</span>
            <span className="font-bold text-emerald-600">$47.22/acre</span>
          </div>
          <div className="h-2.5 rounded-full bg-harvest-forest-800/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 w-[85%]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="font-semibold text-harvest-forest-950">PLC Payment</span>
            <span className="font-bold text-harvest-forest-800/40">$0.00/acre</span>
          </div>
          <div className="h-2.5 rounded-full bg-harvest-forest-800/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-harvest-forest-800/15 w-[2%]" />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-50 border border-emerald-200/50 p-3 mt-2">
        <div className="text-[11px] font-bold text-emerald-700">
          ARC-CO saves $47.22 per base acre
        </div>
        <div className="text-[10px] text-emerald-600/80 mt-0.5">
          Based on current USDA NASS yields and live market prices
        </div>
      </div>
    </div>
  );
}

function MapPreview() {
  return (
    <div className="hf-card-cream rounded-2xl p-5">
      <svg viewBox="0 0 320 180" className="w-full rounded-xl">
        <rect width="320" height="180" fill="#F8F6F0" />
        <path d="M40 60 Q80 30 130 40 Q170 25 210 35 Q250 20 280 45 Q295 65 285 85 Q270 100 240 105 Q215 115 190 110 L175 125 Q160 122 130 115 Q90 120 65 105 Q35 95 40 60Z" fill="none" stroke="#D4CFC5" strokeWidth="1" />
        {[
          { x: 90, y: 55, w: 25, h: 18, color: 'rgba(52,211,153,0.3)' },
          { x: 118, y: 50, w: 22, h: 20, color: 'rgba(201,168,76,0.3)' },
          { x: 143, y: 48, w: 28, h: 18, color: 'rgba(52,211,153,0.35)' },
          { x: 174, y: 45, w: 22, h: 22, color: 'rgba(52,211,153,0.25)' },
          { x: 199, y: 42, w: 26, h: 18, color: 'rgba(201,168,76,0.35)' },
          { x: 228, y: 40, w: 22, h: 20, color: 'rgba(52,211,153,0.3)' },
          { x: 90, y: 76, w: 26, h: 18, color: 'rgba(201,168,76,0.25)' },
          { x: 119, y: 73, w: 24, h: 20, color: 'rgba(52,211,153,0.4)' },
          { x: 146, y: 70, w: 28, h: 18, color: 'rgba(201,168,76,0.25)' },
          { x: 177, y: 70, w: 22, h: 22, color: 'rgba(52,211,153,0.25)' },
          { x: 202, y: 63, w: 26, h: 18, color: 'rgba(52,211,153,0.35)' },
          { x: 231, y: 63, w: 22, h: 20, color: 'rgba(201,168,76,0.3)' },
        ].map((cell, i) => (
          <rect key={i} x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx="3" fill={cell.color} stroke="#D4CFC5" strokeWidth="0.5" />
        ))}
        <rect x="143" y="48" width="28" height="18" rx="3" fill="rgba(52,211,153,0.55)" stroke="#34D399" strokeWidth="1.5" />
        <g transform="translate(135, 25)">
          <rect x="0" y="0" width="82" height="22" rx="4" fill="#1B4332" />
          <text x="41" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">Darke Co, OH</text>
        </g>
      </svg>

      <div className="flex items-center justify-center gap-5 mt-3 text-[10px] text-harvest-forest-800/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/50" />
          ARC-CO favored
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-harvest-gold/50" />
          PLC favored
        </span>
      </div>
    </div>
  );
}

const previews: Record<string, () => React.JSX.Element> = {
  morning: MorningPreview,
  calculator: CalculatorPreview,
  map: MapPreview,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function TabbedShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const advance = useCallback(() => {
    setActiveTab((prev) => (prev + 1) % tabs.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(advance, 6000);
    return () => clearInterval(timer);
  }, [isPaused, advance]);

  const tab = tabs[activeTab];
  const PreviewComponent = previews[tab.id];

  return (
    <section
      className="relative py-20 md:py-28"
      aria-label="Product deep-dive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <SectionBadgeLight variant="default">Built for Farmers</SectionBadgeLight>
          <h2 className="mt-5 hf-heading-section text-harvest-forest-950">
            Three tools.{' '}
            <span className="font-serif italic text-harvest-forest-700" style={{ fontFamily: 'var(--font-instrument)' }}>
              One platform.
            </span>
          </h2>
        </div>

        {/* Tab selectors — premium with cream card inactive style */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-12">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(i)}
              className={`
                relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                ${i === activeTab
                  ? 'bg-harvest-forest-800 text-white shadow-[0_2px_12px_rgba(27,67,50,0.18),0_4px_8px_rgba(27,67,50,0.08)]'
                  : 'bg-white/80 text-harvest-forest-800/70 hover:text-harvest-forest-950 border border-black/[0.04] shadow-[0_1px_2px_hsla(36,20%,50%,0.06),0_4px_12px_hsla(36,20%,40%,0.05)]'
                }
              `}
            >
              {t.label}
              {/* Gold progress bar on active tab */}
              {i === activeTab && !isPaused && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-harvest-gold rounded-full"
                  style={{
                    animation: 'hf-tab-progress 6s linear forwards',
                    width: '0%',
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center"
          key={tab.id}
          style={{
            animation: 'hf-tab-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          {/* Left: copy */}
          <div>
            <h3 className="hf-heading-card text-harvest-forest-950">
              {tab.headline}
            </h3>
            <p className="mt-4 text-harvest-forest-800/80 hf-body-lg leading-relaxed">
              {tab.body}
            </p>

            {/* Feature list — gold checkmark circles */}
            <ul className="mt-7 space-y-3.5">
              {tab.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-harvest-gold/15 border border-harvest-gold/25 flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9E7E30" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-harvest-forest-800 leading-snug">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA — gold gradient to match hero */}
            <a
              href={tab.ctaHref}
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl
                text-sm font-semibold text-harvest-forest-950
                bg-gradient-to-br from-harvest-gold to-harvest-gold-bright
                shadow-[0_2px_8px_rgba(201,168,76,0.15),0_8px_24px_rgba(201,168,76,0.10)]
                hover:shadow-[0_4px_12px_rgba(201,168,76,0.20),0_12px_40px_rgba(201,168,76,0.15)]
                hover:translate-y-[-1px]
                transition-all duration-200"
            >
              {tab.ctaText}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Right: preview */}
          <div>
            <PreviewComponent />
          </div>
        </div>
      </div>
    </section>
  );
}
