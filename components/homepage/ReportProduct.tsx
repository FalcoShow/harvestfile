// =============================================================================
// HarvestFile — ReportProduct (Server Component)
// Phase 9 Build 1: Homepage Revolution
//
// Showcases the $39 AI-powered farm report. Shows what's inside,
// why it's worth it, and how to get one. Light background with
// a dark report preview card.
// =============================================================================

import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';
import { SectionBadgeLight } from './shared/SectionBadge';

const reportSections = [
  {
    icon: '📊',
    title: 'Executive Summary',
    detail: 'Which program pays more and by how much',
  },
  {
    icon: '📈',
    title: '5-Year Payment Projections',
    detail: 'ARC vs PLC across multiple price scenarios',
  },
  {
    icon: '📋',
    title: 'FSA Forms Checklist',
    detail: 'Every form you need, pre-identified',
  },
  {
    icon: '🏛️',
    title: 'FSA Office Game Plan',
    detail: 'What to bring and what to ask',
  },
  {
    icon: '🌾',
    title: 'Crop Insurance Analysis',
    detail: 'How SCO/ECO interacts with your election',
  },
  {
    icon: '📅',
    title: 'Deadline Calendar',
    detail: 'Every date you can\'t miss',
  },
];

export function ReportProduct() {
  return (
    <section className="relative py-24 sm:py-32 bg-white overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(#e2ddd3 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <RevealOnScroll>
            <div>
              <SectionBadgeLight variant="emerald" className="mb-5">
                Your Complete Analysis
              </SectionBadgeLight>

              <h2 className="text-[clamp(28px,4vw,44px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em] leading-[1.1] mb-5">
                Take the guesswork out{' '}
                <span className="font-serif italic font-normal">
                  permanently
                </span>
              </h2>

              <p className="text-[16px] text-[#6B7264] leading-relaxed mb-8">
                Our AI analyzes your specific operation — your county, your crops,
                your acres — and generates a professional report you can take
                straight to your FSA office.
              </p>

              {/* What's inside */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {reportSections.map((section) => (
                  <div
                    key={section.title}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#FAFAF7]"
                  >
                    <span className="text-[18px] leading-none shrink-0 mt-0.5">
                      {section.icon}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-harvest-forest-950">
                        {section.title}
                      </div>
                      <div className="text-[12px] text-[#6B7264]">
                        {section.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price + CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  href="/check"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl
                    bg-harvest-forest-950 text-[15px] font-bold text-white
                    hover:bg-harvest-forest-800 transition-all duration-200
                    shadow-lg shadow-harvest-forest-950/15
                    hover:-translate-y-0.5"
                >
                  Run Free Calculator First
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <div className="text-[13px] text-[#9CA3A0]">
                  Full report: <span className="font-bold text-harvest-forest-950">$39</span> one-time
                </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Right: Report Preview Card */}
          <RevealOnScroll delay={200}>
            <div className="relative">
              {/* Shadow/glow */}
              <div className="absolute -inset-4 rounded-3xl bg-harvest-forest-950/[0.03] blur-2xl" />

              {/* Report mockup */}
              <div
                className="relative rounded-2xl bg-harvest-forest-950 overflow-hidden shadow-2xl shadow-harvest-forest-950/30"
                style={{ transform: 'perspective(1200px) rotateY(-3deg) rotateX(2deg)' }}
              >
                {/* Report header */}
                <div className="px-7 py-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-harvest-gold/20 flex items-center justify-center">
                      <span className="text-harvest-gold text-[14px]">◆</span>
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-white">
                        Farm Program Report
                      </div>
                      <div className="text-[11px] text-white/30">
                        Darke County, OH · Corn · 450 base acres
                      </div>
                    </div>
                  </div>
                </div>

                {/* Executive Summary Preview */}
                <div className="px-7 py-5 border-b border-white/[0.06]">
                  <div className="text-[11px] font-bold text-emerald-400/60 uppercase tracking-wider mb-3">
                    Executive Summary
                  </div>
                  <div className="flex items-end gap-4 mb-3">
                    <div>
                      <div className="text-[11px] text-white/25 mb-1">Recommended</div>
                      <div className="text-[28px] font-extrabold text-emerald-400 tracking-tight leading-none">
                        ARC-CO
                      </div>
                    </div>
                    <div className="mb-1">
                      <div className="text-[11px] text-white/25 mb-1">Advantage</div>
                      <div className="text-[20px] font-extrabold text-harvest-gold tracking-tight leading-none">
                        +$47/acre
                      </div>
                    </div>
                  </div>
                  <div className="text-[12px] text-white/30 leading-relaxed">
                    Based on Darke County&apos;s 5-year Olympic average yield of 186.4 bu/acre
                    and projected MYA price of $4.15/bu, ARC-CO is projected to pay $21,150
                    more than PLC across your 450 base acres.
                  </div>
                </div>

                {/* Blurred preview sections */}
                <div className="px-7 py-4 space-y-3">
                  {['Payment Projections', 'Scenario Analysis', 'FSA Forms Guide'].map(
                    (section) => (
                      <div
                        key={section}
                        className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-3"
                      >
                        <div className="text-[11px] font-semibold text-white/20 mb-1.5">
                          {section}
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 w-full rounded bg-white/[0.04]" />
                          <div className="h-2 w-4/5 rounded bg-white/[0.03]" />
                          <div className="h-2 w-3/5 rounded bg-white/[0.02]" />
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Unlock overlay hint */}
                <div className="px-7 py-4 bg-gradient-to-t from-harvest-forest-950 via-harvest-forest-950/80 to-transparent">
                  <div className="text-center">
                    <div className="text-[12px] text-white/20 mb-1">
                      Full report includes 6 detailed sections
                    </div>
                    <div className="text-[13px] font-semibold text-harvest-gold/60">
                      Instant PDF download · $39 one-time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
