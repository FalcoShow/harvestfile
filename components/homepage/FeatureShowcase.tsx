// =============================================================================
// HarvestFile — FeatureShowcase (Server Component)
// Phase 9 Build 2.5: Light Chapter Polish
//
// CHANGES FROM BUILD 1:
//   - Emoji icons → custom SVG icons with colored background circles
//   - Section padding bumped to 120-160px (py-[120px] lg:py-[160px])
//   - Body text increased from 14px → 16px (meets 18px min via line-height)
//   - Card hover: subtle glow border effect on dark → translateY lift on light
//   - Description text color warmer, more readable
// =============================================================================

import { RevealOnScroll } from './shared/RevealOnScroll';
import { SectionBadgeLight } from './shared/SectionBadge';

// ─── SVG Icon Components ─────────────────────────────────────────────────────
// Clean, thin-stroke (1.5px) icons matching the premium aesthetic.
// Each renders at 24x24 in the brand color assigned to its feature.

function IconCalculator({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="18" x2="8" y2="18.01" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  );
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function IconTrendUp({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconBrain({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8Z" />
      <path d="M10 22h4" />
      <path d="M9 13h2" />
      <path d="M13 13h2" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconFileText({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ─── Feature Data ────────────────────────────────────────────────────────────

const features = [
  {
    Icon: IconCalculator,
    title: 'ARC/PLC Decision Calculator',
    description:
      'Side-by-side payment comparison using your county\'s real yield history. Updated for 2025 OBBBA reference prices.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    borderAccent: 'border-harvest-gold/20 hover:border-harvest-gold/40',
    highlight: true,
  },
  {
    Icon: IconMap,
    title: 'County Election Intelligence',
    description:
      '7 years of FSA enrollment history for every farming county. See exactly how your neighbors have voted.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    borderAccent: 'border-emerald-500/15 hover:border-emerald-500/30',
  },
  {
    Icon: IconTrendUp,
    title: 'Multi-Year Scenario Modeler',
    description:
      'Project ARC vs PLC payments across 5 years with interactive price and yield sliders. Model any scenario.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-700',
    borderAccent: 'border-blue-500/15 hover:border-blue-500/30',
  },
  {
    Icon: IconBrain,
    title: 'AI-Powered Farm Reports',
    description:
      'Our AI analyzes your operation and generates a professional PDF with projections and an FSA prep guide.',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-700',
    borderAccent: 'border-purple-500/15 hover:border-purple-500/30',
  },
  {
    Icon: IconBell,
    title: 'Commodity Price Alerts',
    description:
      'Get notified instantly when corn, soybeans, or wheat prices cross your thresholds. Never miss a move.',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-700',
    borderAccent: 'border-amber-500/15 hover:border-amber-500/30',
  },
  {
    Icon: IconFileText,
    title: 'OBBBA Farm Bill Guide',
    description:
      'The most comprehensive guide to the 2025 farm bill changes. New reference prices, base acres, and ARC+SCO stacking.',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-700',
    borderAccent: 'border-teal-500/15 hover:border-teal-500/30',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function FeatureShowcase() {
  return (
    <section className="relative py-[120px] lg:py-[160px] bg-[#FAFAF7]">
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Header */}
        <RevealOnScroll>
          <div className="mb-16">
            <SectionBadgeLight variant="gold" className="mb-5">
              Built for Farmers
            </SectionBadgeLight>
            <h2 className="text-[clamp(28px,4vw,46px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em] leading-[1.1] max-w-[480px]">
              Government data,{' '}
              <span className="font-serif italic font-normal">
                finally useful
              </span>
            </h2>
          </div>
        </RevealOnScroll>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <RevealOnScroll key={feature.title} delay={i * 80}>
              <div
                className={`group relative rounded-2xl bg-white border ${feature.borderAccent}
                  p-8 transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.04]
                  hover:-translate-y-1 ${feature.highlight ? 'ring-1 ring-harvest-gold/10' : ''}`}
              >
                {/* Highlight badge */}
                {feature.highlight && (
                  <div className="absolute -top-2.5 left-7">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-harvest-gold/10 border border-harvest-gold/20 text-[10px] font-bold text-harvest-gold-dim uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon with colored background */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.iconBg} mb-5`}>
                  <feature.Icon className={feature.iconColor} />
                </div>

                {/* Title */}
                <h3 className="text-[18px] font-bold text-harvest-forest-950 tracking-[-0.01em] mb-3">
                  {feature.title}
                </h3>

                {/* Description — 16px with generous line-height for readability */}
                <p className="text-[16px] text-[#5A6356] leading-[1.65]">
                  {feature.description}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
