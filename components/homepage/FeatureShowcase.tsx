// =============================================================================
// HarvestFile — FeatureShowcase (Server Component)
// Phase 9 Build 1: Homepage Revolution
//
// Six feature cards on a warm cream background. Each card highlights
// a key capability that differentiates HarvestFile. Uses RevealOnScroll
// for staggered entrance animations.
// =============================================================================

import { RevealOnScroll } from './shared/RevealOnScroll';
import { SectionBadgeLight } from './shared/SectionBadge';

const features = [
  {
    icon: '📊',
    title: 'ARC/PLC Decision Calculator',
    description:
      'Side-by-side payment comparison using your county\'s real yield history. Updated for 2025 OBBBA reference prices.',
    accent: 'border-harvest-gold/20 hover:border-harvest-gold/40',
    highlight: true,
  },
  {
    icon: '🗺️',
    title: 'County Election Intelligence',
    description:
      '7 years of FSA enrollment history for every farming county. See exactly how your neighbors have voted.',
    accent: 'border-emerald-500/15 hover:border-emerald-500/30',
  },
  {
    icon: '🔮',
    title: 'Multi-Year Scenario Modeler',
    description:
      'Project ARC vs PLC payments across 5 years with interactive price and yield sliders. Model any scenario.',
    accent: 'border-blue-500/15 hover:border-blue-500/30',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Farm Reports',
    description:
      'Claude AI analyzes your operation and generates a professional PDF with projections and FSA prep guide.',
    accent: 'border-purple-500/15 hover:border-purple-500/30',
  },
  {
    icon: '🔔',
    title: 'Commodity Price Alerts',
    description:
      'Get notified instantly when corn, soybeans, or wheat prices cross your thresholds. Never miss a move.',
    accent: 'border-amber-500/15 hover:border-amber-500/30',
  },
  {
    icon: '📋',
    title: 'OBBBA Farm Bill Guide',
    description:
      'The most comprehensive guide to the 2025 farm bill changes. New reference prices, base acres, and ARC+SCO stacking.',
    accent: 'border-teal-500/15 hover:border-teal-500/30',
  },
];

export function FeatureShowcase() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#FAFAF7]">
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Header */}
        <RevealOnScroll>
          <div className="mb-14">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <RevealOnScroll key={feature.title} delay={i * 80}>
              <div
                className={`group relative rounded-2xl bg-white border ${feature.accent}
                  p-7 transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03]
                  hover:-translate-y-0.5 ${feature.highlight ? 'ring-1 ring-harvest-gold/10' : ''}`}
              >
                {/* Highlight badge */}
                {feature.highlight && (
                  <div className="absolute -top-2.5 left-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-harvest-gold/10 border border-harvest-gold/20 text-[10px] font-bold text-harvest-gold-dim uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className="text-[28px] mb-4 leading-none">{feature.icon}</div>

                {/* Title */}
                <h3 className="text-[17px] font-bold text-harvest-forest-950 tracking-[-0.01em] mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] text-[#6B7264] leading-relaxed">
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
