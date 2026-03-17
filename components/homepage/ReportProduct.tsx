// =============================================================================
// HarvestFile — ReportProduct (Server Component)
// Phase 9 Build 3.5: Final Homepage Polish
//
// FIX: Background changed to warm cream #F5F0E6 (not white or plain cream)
// Cards use #FFFDF9 with warm-tinted layered shadows
// Grain texture overlay. Dot pattern uses warmer tones.
// =============================================================================

import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';
import { SectionBadgeLight } from './shared/SectionBadge';

// ─── SVG Icon Components ─────────────────────────────────────────────────────

function IconChart() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
}
function IconTrend() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>);
}
function IconClipboard() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>);
}
function IconBuilding() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" /></svg>);
}
function IconWheat() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-harvest-gold-dim"><path d="M2 22L16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M20 2 8 14" /></svg>);
}
function IconCalendar() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /></svg>);
}

const reportSections = [
  { Icon: IconChart, title: 'Executive Summary', detail: 'Which program pays more and by how much' },
  { Icon: IconTrend, title: '5-Year Payment Projections', detail: 'ARC vs PLC across multiple price scenarios' },
  { Icon: IconClipboard, title: 'FSA Forms Checklist', detail: 'Every form you need, pre-identified' },
  { Icon: IconBuilding, title: 'FSA Office Game Plan', detail: 'What to bring and what to ask' },
  { Icon: IconWheat, title: 'Crop Insurance Analysis', detail: 'How SCO/ECO interacts with your election' },
  { Icon: IconCalendar, title: 'Deadline Calendar', detail: 'Every date you can\'t miss' },
];

export function ReportProduct() {
  return (
    <section
      className="relative py-[120px] lg:py-[160px] overflow-hidden"
      style={{ background: '#F5F0E6' }}
    >
      {/* Grain texture */}
      <div className="hf-grain" />

      {/* Warm dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(#D5CEBC 0.5px, transparent 0.5px)',
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

              <p className="text-[18px] text-[#4A5E52] leading-[1.65] mb-10">
                Our AI analyzes your specific operation — your county, your crops,
                your acres — and generates a professional report you can take
                straight to your FSA office.
              </p>

              {/* Report sections list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reportSections.map((section) => (
                  <div key={section.title} className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <section.Icon />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-harvest-forest-950">
                        {section.title}
                      </div>
                      <div className="text-[14px] text-[#6B7264]">
                        {section.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-10 flex items-center gap-4 flex-wrap">
                <Link
                  href="/check"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl
                    bg-harvest-forest-950 text-[15px] font-bold text-white
                    hover:bg-harvest-forest-800 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    boxShadow: '0 4px 12px rgba(12,31,23,0.20), 0 1px 3px rgba(12,31,23,0.15)',
                  }}
                >
                  Run Free Calculator First
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <span className="text-[14px] font-medium text-[#9CA3A0]">
                  Full report: $39 one-time
                </span>
              </div>
            </div>
          </RevealOnScroll>

          {/* Right: Report Preview Card */}
          <RevealOnScroll delay={200}>
            <div className="relative">
              {/* Gold glow behind card */}
              <div
                className="absolute -inset-6 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
              />

              <div
                className="relative rounded-2xl bg-harvest-forest-950 border border-white/[0.06] overflow-hidden"
                style={{
                  boxShadow: '0 4px 8px rgba(12,31,23,0.1), 0 8px 16px rgba(12,31,23,0.08), 0 16px 32px rgba(12,31,23,0.06), 0 32px 64px rgba(12,31,23,0.04)',
                }}
              >
                {/* Card header */}
                <div className="px-7 pt-7 pb-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-harvest-gold text-[18px]">◆</span>
                    <span className="text-[13px] font-extrabold text-white/50 uppercase tracking-[0.08em]">
                      Farm Program Report
                    </span>
                  </div>
                  <div className="text-[13px] text-white/25">
                    Darke County, OH · Corn · 450 base acres
                  </div>
                </div>

                {/* Card body */}
                <div className="px-7 py-6">
                  <div className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em] mb-3">
                    Executive Summary
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    <div>
                      <div className="text-[11px] font-semibold text-white/30 mb-1">Recommended</div>
                      <div className="text-[22px] font-extrabold text-emerald-400 tracking-[-0.02em]">ARC-CO</div>
                    </div>
                    <div className="w-[1px] h-10 bg-white/[0.08]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white/30 mb-1">Advantage</div>
                      <div className="text-[22px] font-extrabold text-harvest-gold tracking-[-0.02em]">+$47/acre</div>
                    </div>
                  </div>

                  <p className="text-[13px] text-white/30 leading-relaxed mb-6">
                    Based on Darke County&apos;s 5-year Olympic average yield of 186.4
                    bu/acre and projected MYA price of $4.15/bu, ARC-CO is projected
                    to pay $21,150 more than PLC across your 450 base acres.
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    {['Payment Projections', 'Scenario Analysis', 'FSA Forms Guide'].map((tab, i) => (
                      <span
                        key={tab}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg ${
                          i === 0 ? 'bg-white/[0.08] text-white/50' : 'text-white/20'
                        }`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-7 py-4 border-t border-white/[0.04] bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/20">Full report includes 6 detailed sections</span>
                    <span className="text-[11px] font-semibold text-harvest-gold/60">Instant PDF download · $39 one-time</span>
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
