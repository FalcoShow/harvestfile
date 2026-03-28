// =============================================================================
// HarvestFile — BentoShowcase (Server Component + Client wrappers)
// Build 11 Deploy 2: Premium bento grid product showcase
//
// The centerpiece of the homepage. Shows all three HarvestFile products
// in a visually rich, asymmetric bento grid with hover effects and
// scroll-triggered reveals. This single section replaces FeatureShowcase
// and creates the strongest "this is not farm software" reaction.
//
// Layout (desktop): 4-column grid
//   [Morning Dashboard — 2×2]  [ARC/PLC Calculator — 2×1]
//                               [County Map — 2×1        ]
//   [Metric 1×1] [Metric 1×1]
//
// Mobile: single column, all cards full-width
// =============================================================================

import { SectionBadge } from '@/components/homepage/shared/SectionBadge';
import { RevealOnScroll } from '@/components/homepage/shared/RevealOnScroll';

// --- Inline SVG icons ---

function SunriseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 1 0-10 0" />
      <path d="M12 2v3M4.22 10.22l1.42 1.42M1 18h3M20 18h3M18.36 11.64l1.42-1.42" />
      <path d="M23 22H1M8 6l4-4 4 4" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10A15 15 0 0 1 12 2z" />
    </svg>
  );
}

// --- Bento Card wrapper with premium hover ---

function BentoCard({
  children,
  className = '',
  span = '',
}: {
  children: React.ReactNode;
  className?: string;
  span?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-harvest-forest-800/60 border border-white/[0.06]
        transition-all duration-300 ease-out
        hover:border-harvest-gold/15
        hover:shadow-[0_12px_40px_rgba(201,168,76,0.08)]
        hover:translate-y-[-2px]
        ${span}
        ${className}
      `}
    >
      {/* Subtle inner glow on hover via gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.04) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

// --- Mock Dashboard Preview (SVG-based, no images needed) ---

function DashboardPreview() {
  return (
    <div className="mt-5 rounded-xl overflow-hidden border border-white/[0.04] bg-harvest-forest-950/60">
      {/* Mock browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.04]">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="ml-3 flex-1 h-4 rounded-md bg-white/[0.03] max-w-[180px]" />
      </div>

      {/* Mock dashboard content */}
      <div className="p-4 space-y-3">
        {/* Top metric cards row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.04]">
            <div className="text-[9px] text-white/25 uppercase tracking-wider">Corn</div>
            <div className="text-sm font-bold text-harvest-gold mt-0.5">$4.62</div>
            <div className="text-[9px] text-emerald-400/70 mt-0.5">+$0.03</div>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.04]">
            <div className="text-[9px] text-white/25 uppercase tracking-wider">Soybeans</div>
            <div className="text-sm font-bold text-harvest-gold mt-0.5">$10.34</div>
            <div className="text-[9px] text-red-400/70 mt-0.5">-$0.08</div>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.04]">
            <div className="text-[9px] text-white/25 uppercase tracking-wider">Wheat</div>
            <div className="text-sm font-bold text-harvest-gold mt-0.5">$5.41</div>
            <div className="text-[9px] text-emerald-400/70 mt-0.5">+$0.11</div>
          </div>
        </div>

        {/* Mock weather row */}
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.04]">
          <div className="w-7 h-7 rounded-full bg-harvest-gold/10 flex items-center justify-center">
            <SunriseIcon />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-white/40">Today in Darke County, OH</div>
            <div className="text-xs text-white/70 font-medium">72°F Clear · Wind 5 mph SW · Spray: GO</div>
          </div>
        </div>

        {/* Mock chart area */}
        <div className="rounded-lg bg-white/[0.03] p-3 border border-white/[0.04]">
          <div className="text-[9px] text-white/25 uppercase tracking-wider mb-2">
            PLC Payment Estimate
          </div>
          <div className="flex items-end gap-1 h-[48px]">
            {[35, 55, 45, 70, 60, 80, 65, 75, 85, 50, 40, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-harvest-gold/20"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Mock Calculator Preview ---

function CalculatorPreview() {
  return (
    <div className="mt-4 space-y-3">
      {/* Result comparison */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-3 text-center">
          <div className="text-[9px] text-white/25 uppercase tracking-wider">ARC-CO</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">$47.22</div>
          <div className="text-[10px] text-white/30 mt-0.5">per base acre</div>
        </div>
        <div className="rounded-lg bg-harvest-gold/[0.06] border border-harvest-gold/15 p-3 text-center">
          <div className="text-[9px] text-harvest-gold/60 uppercase tracking-wider">PLC</div>
          <div className="text-lg font-bold text-harvest-gold mt-1">$0.00</div>
          <div className="text-[10px] text-white/30 mt-0.5">per base acre</div>
        </div>
      </div>

      {/* Recommendation badge */}
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <span className="text-[11px] font-medium text-emerald-400/90">
          ARC-CO recommended — $47.22/acre advantage
        </span>
      </div>
    </div>
  );
}

// --- Mock Map Preview ---

function MapPreview() {
  return (
    <div className="mt-4 relative rounded-xl overflow-hidden border border-white/[0.04] bg-harvest-forest-950/40 p-4">
      {/* Simplified US map with county dots */}
      <svg viewBox="0 0 400 200" className="w-full h-auto opacity-60">
        {/* Rough US outline */}
        <path
          d="M50 80 Q80 30 150 40 Q200 20 250 35 Q300 25 350 50 Q370 70 360 100 Q340 120 300 130 Q260 145 220 140 L200 160 Q180 155 150 145 Q100 150 70 130 Q40 120 50 80Z"
          fill="none"
          stroke="rgba(201,168,76,0.15)"
          strokeWidth="1"
        />
        {/* Scattered county dots */}
        {[
          [120, 70], [140, 85], [160, 65], [180, 90], [200, 75],
          [220, 85], [240, 70], [260, 95], [280, 80], [300, 65],
          [140, 100], [170, 110], [200, 100], [230, 110], [260, 105],
          [150, 55], [190, 50], [230, 55], [270, 50], [310, 75],
          [100, 90], [130, 115], [185, 125], [250, 120], [290, 110],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={i % 7 === 0 ? 3 : 2}
            fill={i % 5 === 0 ? 'rgba(201,168,76,0.5)' : i % 3 === 0 ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-white/30">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400/50" />
          ARC-CO favored
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-harvest-gold/50" />
          PLC favored
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/15" />
          Neutral
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function BentoShowcase() {
  return (
    <section className="relative py-20 md:py-28" aria-label="Product showcase">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <RevealOnScroll>
          <div className="text-center mb-14 md:mb-20">
            <SectionBadge variant="gold">Three Surfaces · One Platform</SectionBadge>
            <h2
              className="mt-5 font-bold tracking-[-0.02em] text-white/90"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.15 }}
            >
              Everything you need.
              <br />
              <span className="text-harvest-gold">Nothing you don&apos;t.</span>
            </h2>
            <p className="mt-4 text-white/40 max-w-lg mx-auto text-[15px] leading-relaxed">
              Live grain bids, ARC/PLC election optimization, and county-level intelligence — 
              personalized to your operation. Free forever.
            </p>
          </div>
        </RevealOnScroll>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          {/* ─── Morning Dashboard (2×2 hero card) ─── */}
          <RevealOnScroll delay={0}>
            <BentoCard span="md:col-span-2 md:row-span-2" className="p-6 md:p-8">
              <div className="flex items-center gap-2.5 text-harvest-gold/70">
                <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center">
                  <SunriseIcon />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
                  Morning Dashboard
                </span>
              </div>

              <h3
                className="mt-4 font-bold text-white/90 tracking-[-0.01em]"
                style={{ fontSize: 'clamp(1.25rem, 2vw, 1.625rem)' }}
              >
                Start every day informed
              </h3>
              <p className="mt-2 text-white/35 text-sm leading-relaxed max-w-sm">
                Grain bids, weather, market prices, and ARC/PLC payment estimates — 
                personalized to your county, updated before sunrise.
              </p>

              <DashboardPreview />
            </BentoCard>
          </RevealOnScroll>

          {/* ─── ARC/PLC Calculator (2×1 wide) ─── */}
          <RevealOnScroll delay={100}>
            <BentoCard span="md:col-span-2" className="p-6">
              <div className="flex items-center gap-2.5 text-harvest-gold/70">
                <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center">
                  <CalculatorIcon />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
                  ARC/PLC Calculator
                </span>
              </div>

              <h3 className="mt-4 font-bold text-white/90 tracking-[-0.01em] text-lg">
                Optimize your farm bill elections
              </h3>
              <p className="mt-1.5 text-white/35 text-sm leading-relaxed">
                Run unlimited ARC vs PLC scenarios using official USDA data. See exactly 
                which election maximizes your payment.
              </p>

              <CalculatorPreview />
            </BentoCard>
          </RevealOnScroll>

          {/* ─── County Election Map (2×1 wide) ─── */}
          <RevealOnScroll delay={150}>
            <BentoCard span="md:col-span-2" className="p-6">
              <div className="flex items-center gap-2.5 text-harvest-gold/70">
                <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center">
                  <GlobeIcon />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
                  County Election Map
                </span>
              </div>

              <h3 className="mt-4 font-bold text-white/90 tracking-[-0.01em] text-lg">
                See what your county chose
              </h3>
              <p className="mt-1.5 text-white/35 text-sm leading-relaxed">
                The only interactive map of ARC/PLC elections for every U.S. county. 
                Know what your neighbors decided.
              </p>

              <MapPreview />
            </BentoCard>
          </RevealOnScroll>

          {/* ─── Metric cards (1×1 each) ─── */}
          <RevealOnScroll delay={200}>
            <BentoCard className="p-6 flex flex-col justify-between min-h-[140px]">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/25">
                Elevator Bids Tracked
              </div>
              <div>
                <div
                  className="font-bold text-harvest-gold tracking-[-0.02em]"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
                >
                  2,000+
                </div>
                <div className="text-[12px] text-white/25 mt-1">
                  Daily via Barchart
                </div>
              </div>
            </BentoCard>
          </RevealOnScroll>

          <RevealOnScroll delay={250}>
            <BentoCard className="p-6 flex flex-col justify-between min-h-[140px]">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/25">
                Commodities Covered
              </div>
              <div>
                <div
                  className="font-bold text-harvest-gold tracking-[-0.02em]"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
                >
                  16
                </div>
                <div className="text-[12px] text-white/25 mt-1">
                  All ARC/PLC crops
                </div>
              </div>
            </BentoCard>
          </RevealOnScroll>

          {/* ─── Wide bottom CTA card ─── */}
          <RevealOnScroll delay={300}>
            <BentoCard span="md:col-span-2" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/25">
                    Free Forever
                  </div>
                  <div className="mt-2 text-white/70 font-semibold">
                    No credit card. No registration wall. Just your county&apos;s data.
                  </div>
                </div>
                <a
                  href="/check"
                  className="shrink-0 ml-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                    text-sm font-semibold text-harvest-forest-950
                    bg-gradient-to-br from-harvest-gold to-harvest-gold-bright
                    hover:shadow-[0_4px_20px_rgba(201,168,76,0.3)]
                    hover:translate-y-[-1px] transition-all duration-200"
                >
                  Try the Calculator
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </BentoCard>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
