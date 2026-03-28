// =============================================================================
// HarvestFile — BentoShowcase (Server Component + Client wrappers)
// Build 12 Deploy 3: Fixed Morning Dashboard dead space
//
// FIX: Morning Dashboard card uses h-full flex flex-col with DashboardPreview
// set to flex-1 so it stretches to fill the full 2x2 grid cell height.
// The RevealOnScroll wrapper also gets h-full to propagate grid height.
// The bar chart inside DashboardPreview uses flex-1 to absorb extra space.
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

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// --- Bento Card ---

function BentoCard({
  children,
  className = '',
  variant = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'deep';
}) {
  const bgMap = {
    default: 'bg-harvest-forest-800/40',
    accent: 'bg-[#1a3a2c]',
    deep: 'bg-harvest-forest-950/70',
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl h-full
        ${bgMap[variant]}
        border border-white/[0.06]
        hf-card-dark
        ${className}
      `}
    >
      <div
        className="absolute top-0 left-[10%] right-[10%] h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)',
        }}
      />
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.05) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

// --- Mock Dashboard Preview (fills remaining card space via flex-1) ---

function DashboardPreview() {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.04] bg-harvest-forest-950/60 flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.04]">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="ml-3 flex-1 h-4 rounded-md bg-white/[0.03] max-w-[180px]" />
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { crop: 'Corn', price: '$4.62', change: '+$0.03', up: true },
            { crop: 'Soybeans', price: '$10.34', change: '-$0.08', up: false },
            { crop: 'Wheat', price: '$5.41', change: '+$0.11', up: true },
          ].map((item) => (
            <div key={item.crop} className="rounded-lg bg-white/[0.03] p-2 border border-white/[0.04]">
              <div className="text-[9px] text-white/25 uppercase tracking-wider">{item.crop}</div>
              <div className="text-sm font-bold text-harvest-gold mt-0.5">{item.price}</div>
              <div className={`text-[9px] mt-0.5 ${item.up ? 'text-emerald-400/70' : 'text-red-400/70'}`}>{item.change}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] p-2 border border-white/[0.04]">
          <div className="w-6 h-6 rounded-full bg-harvest-gold/10 flex items-center justify-center text-harvest-gold/60 shrink-0">
            <SunriseIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-white/35">Today in Darke County, OH</div>
            <div className="text-[11px] text-white/65 font-medium">72°F Clear · Wind 5 mph SW · Spray: GO</div>
          </div>
        </div>

        {/* Bar chart — flex-1 absorbs ALL remaining vertical space */}
        <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.04] flex-1 flex flex-col min-h-[60px]">
          <div className="text-[9px] text-white/25 uppercase tracking-wider mb-2">PLC Payment Estimate</div>
          <div className="flex items-end gap-[3px] flex-1">
            {[35, 55, 45, 70, 60, 80, 65, 75, 85, 50, 40, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-harvest-gold/20" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10 p-2">
          <span className="text-[10px] text-emerald-400/80 font-medium">ARC-CO est.</span>
          <span className="text-sm font-bold text-emerald-400">$47.22/ac</span>
        </div>
      </div>
    </div>
  );
}

function CalculatorPreview() {
  return (
    <div className="mt-3.5 space-y-2.5">
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
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <CheckIcon />
        </div>
        <span className="text-[11px] font-medium text-emerald-400/90">ARC-CO recommended — $47.22/acre advantage</span>
      </div>
    </div>
  );
}

function MapPreview() {
  return (
    <div className="mt-3.5 relative rounded-xl overflow-hidden border border-white/[0.04] bg-harvest-forest-950/40 p-4">
      <svg viewBox="0 0 400 200" className="w-full h-auto opacity-60">
        <path d="M50 80 Q80 30 150 40 Q200 20 250 35 Q300 25 350 50 Q370 70 360 100 Q340 120 300 130 Q260 145 220 140 L200 160 Q180 155 150 145 Q100 150 70 130 Q40 120 50 80Z" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="1" />
        {[
          [120, 70], [140, 85], [160, 65], [180, 90], [200, 75],
          [220, 85], [240, 70], [260, 95], [280, 80], [300, 65],
          [140, 100], [170, 110], [200, 100], [230, 110], [260, 105],
          [150, 55], [190, 50], [230, 55], [270, 50], [310, 75],
          [100, 90], [130, 115], [185, 125], [250, 120], [290, 110],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 7 === 0 ? 3 : 2} fill={i % 5 === 0 ? 'rgba(201,168,76,0.5)' : i % 3 === 0 ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'} />
        ))}
        <rect x="225" y="55" width="18" height="14" rx="2" fill="rgba(52,211,153,0.3)" stroke="rgba(52,211,153,0.5)" strokeWidth="0.5" />
        <text x="234" y="86" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="7" fontWeight="600">Darke Co, OH</text>
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-white/30">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400/50" />ARC-CO favored</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-harvest-gold/50" />PLC favored</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

export function BentoShowcase() {
  return (
    <section className="relative py-20 md:py-24" aria-label="Product showcase">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)' }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-16">
            <SectionBadge variant="gold">Three Surfaces · One Platform</SectionBadge>
            <h2 className="mt-5 hf-heading-section text-white/90">
              Everything you need.<br />
              <span className="text-harvest-gold">Nothing you don&apos;t.</span>
            </h2>
            <p className="mt-4 text-white/40 max-w-lg mx-auto hf-body-lg leading-relaxed">
              Live grain bids, ARC/PLC election optimization, and county-level intelligence — personalized to your operation. Free forever.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <RevealOnScroll delay={0} className="md:col-span-2 md:row-span-2">
            <BentoCard className="p-5 md:p-6 flex flex-col" variant="accent">
              <div className="flex items-center gap-2.5 text-harvest-gold/70">
                <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center"><SunriseIcon /></div>
                <span className="hf-eyebrow text-harvest-gold/70">Morning Dashboard</span>
              </div>
              <h3 className="mt-3 hf-heading-card text-white/90">Start every day informed</h3>
              <p className="mt-1.5 text-white/35 text-sm leading-relaxed max-w-sm">Grain bids, weather, market prices, and ARC/PLC payment estimates — personalized to your county, updated before sunrise.</p>
              <DashboardPreview />
            </BentoCard>
          </RevealOnScroll>

          <RevealOnScroll delay={100} className="md:col-span-2">
            <BentoCard className="p-5 md:p-6">
              <div className="flex items-center gap-2.5 text-harvest-gold/70">
                <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center"><CalculatorIcon /></div>
                <span className="hf-eyebrow text-harvest-gold/70">ARC/PLC Calculator</span>
              </div>
              <h3 className="mt-3 hf-heading-card text-white/90 text-lg">Optimize your farm bill elections</h3>
              <p className="mt-1 text-white/35 text-sm leading-relaxed">Run unlimited ARC vs PLC scenarios using official USDA data. See exactly which election maximizes your payment.</p>
              <CalculatorPreview />
            </BentoCard>
          </RevealOnScroll>

          <RevealOnScroll delay={150} className="md:col-span-2">
            <BentoCard className="p-5 md:p-6" variant="deep">
              <div className="flex items-center gap-2.5 text-harvest-gold/70">
                <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center"><GlobeIcon /></div>
                <span className="hf-eyebrow text-harvest-gold/70">County Election Map</span>
              </div>
              <h3 className="mt-3 hf-heading-card text-white/90 text-lg">See what your county chose</h3>
              <p className="mt-1 text-white/35 text-sm leading-relaxed">The only interactive map of ARC/PLC elections for every U.S. county. Know what your neighbors decided.</p>
              <MapPreview />
            </BentoCard>
          </RevealOnScroll>

          <RevealOnScroll delay={200} className="md:col-span-1">
            <BentoCard className="p-5 flex flex-col justify-between min-h-[140px]">
              <div className="hf-eyebrow text-white/25">Elevator Bids Tracked</div>
              <div>
                <div className="font-bold text-harvest-gold tracking-[-0.02em]" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>2,000+</div>
                <div className="text-[12px] text-white/25 mt-1">Daily via Barchart</div>
              </div>
            </BentoCard>
          </RevealOnScroll>

          <RevealOnScroll delay={250} className="md:col-span-1">
            <BentoCard className="p-5 flex flex-col justify-between min-h-[140px]">
              <div className="hf-eyebrow text-white/25">Commodities Covered</div>
              <div>
                <div className="font-bold text-harvest-gold tracking-[-0.02em]" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>16</div>
                <div className="text-[12px] text-white/25 mt-1">All ARC/PLC crops</div>
              </div>
            </BentoCard>
          </RevealOnScroll>

          <RevealOnScroll delay={300} className="md:col-span-2">
            <BentoCard className="p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="hf-eyebrow text-harvest-gold/50">Free Forever</div>
                  <div className="mt-2 text-white/80 font-semibold text-base">No credit card. No registration wall. Just your county&apos;s data.</div>
                </div>
                <a href="/check" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shrink-0 text-sm font-semibold text-harvest-forest-950 bg-gradient-to-br from-harvest-gold to-harvest-gold-bright hf-shadow-gold hover:translate-y-[-1px] transition-all duration-200">
                  Try the Calculator <ArrowRightIcon />
                </a>
              </div>
            </BentoCard>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
