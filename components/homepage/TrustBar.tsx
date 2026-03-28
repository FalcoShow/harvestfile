// =============================================================================
// HarvestFile — TrustBar (Server Component)
// Build 11 Deploy 2: Institutional trust badges with animated counters
//
// Immediately below the hero's dark Chapter 1 section. Establishes data
// credibility through institutional logos and activity metrics. This is
// HarvestFile's strongest early-stage social proof — leveraging USDA, NOAA,
// and RMA authority that farmers already trust.
// =============================================================================

import { AnimatedCounter } from '@/components/homepage/shared/AnimatedCounter';

// --- SVG Icons (inline, no external deps) ---

function USDAIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M4 18h16M6 18V9m4 9V9m4 9V9m4 9V9M2 9l10-6 10 6" />
    </svg>
  );
}

function ChartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18M7 16l4-4 4 4 5-6" />
    </svg>
  );
}

function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5.25-3.5 8.75-8 10-4.5-1.25-8-4.75-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function MapIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
      <path d="M8 2v16M16 6v16" />
    </svg>
  );
}

const trustItems = [
  {
    icon: USDAIcon,
    label: 'USDA Data',
    sublabel: 'Official NASS yields',
  },
  {
    icon: ChartIcon,
    label: 'NOAA Weather',
    sublabel: 'Real-time forecasts',
  },
  {
    icon: ShieldIcon,
    label: 'RMA Compliant',
    sublabel: 'Program-accurate math',
  },
  {
    icon: MapIcon,
    label: '3,100+ Counties',
    sublabel: 'Every U.S. state',
  },
];

export function TrustBar() {
  return (
    <section className="relative py-12 md:py-16" aria-label="Data trust and credibility">
      {/* Subtle top border glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.2) 30%, rgba(201,168,76,0.35) 50%, rgba(201,168,76,0.2) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Trust badges grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {trustItems.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center text-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center transition-all duration-300 group-hover:border-harvest-gold/20 group-hover:bg-harvest-gold/[0.04]">
                <item.icon className="w-4.5 h-4.5 text-harvest-gold/70" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white/80 tracking-[-0.01em]">
                  {item.label}
                </div>
                <div className="text-[11px] text-white/35 mt-0.5">
                  {item.sublabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity counters */}
        <div className="mt-10 pt-8 border-t border-white/[0.04]">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px] text-white/30">
            <span>
              <AnimatedCounter
                value={47000}
                suffix="+"
                className="text-white/50 font-medium"
              />{' '}
              ARC/PLC scenarios calculated
            </span>
            <span className="hidden md:inline text-white/10">·</span>
            <span>
              <AnimatedCounter
                value={3143}
                className="text-white/50 font-medium"
              />{' '}
              counties mapped
            </span>
            <span className="hidden md:inline text-white/10">·</span>
            <span className="text-white/50 font-medium">Updated daily</span>
          </div>
        </div>
      </div>
    </section>
  );
}
