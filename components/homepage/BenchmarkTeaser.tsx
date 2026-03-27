// =============================================================================
// HarvestFile — BenchmarkTeaser (Server Component)
// Phase 9 Build 3: Dark Chapter Harmonization
//
// CHANGES FROM BUILD 1:
//   - Padding: py-24 sm:py-32 → py-[120px] lg:py-[160px]
//   - Body text: text-[16px] text-white/35 → text-[18px] text-white/45
//   - Bullet items: text-[14px] text-white/40 → text-[16px] text-white/45
//   - CTA button text bumped to 15px
// =============================================================================

import Link from 'next/link';
import { RevealOnScroll } from './shared/RevealOnScroll';

export function BenchmarkTeaser() {
  return (
    <section className="relative overflow-hidden bg-harvest-forest-950 py-[80px] lg:py-[100px]">
      {/* Noise */}
      <div className="hf-noise-subtle" />

      {/* Gradient accents */}
      <div
        className="absolute bottom-0 left-1/3 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsla(152, 60%, 30%, 0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1000px] px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <RevealOnScroll>
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.15] mb-6">
                <span className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-[0.12em]">
                  The Coffee-Shop Conversation, Digitized
                </span>
              </div>

              <h2 className="text-[clamp(26px,3.5vw,40px)] font-extrabold text-white tracking-[-0.03em] leading-[1.12] mb-5">
                What is your county{' '}
                <span className="font-serif italic font-normal text-emerald-400">
                  choosing?
                </span>
              </h2>

              <p className="text-[18px] text-white/45 leading-[1.65] mb-6">
                Share your ARC/PLC election anonymously. Instantly see what
                percentage of your county neighbors chose ARC-CO vs PLC.
                It&apos;s the conversation you&apos;d have at the coffee shop —
                but with real data from real farms.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Completely anonymous — only county totals are shown',
                  'Minimum 5 farms before any data is revealed',
                  'Updated in real-time as farmers contribute',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-emerald-500/70 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[16px] text-white/45">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/check"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-emerald-500 text-[15px] font-semibold text-white
                  hover:bg-emerald-400 transition-all duration-200
                  shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30
                  hover:-translate-y-0.5"
              >
                Find Your County
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </RevealOnScroll>

          {/* Right: Visual mockup of benchmark results */}
          <RevealOnScroll delay={200}>
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 rounded-3xl bg-emerald-500/[0.04] blur-2xl" />

              {/* Card */}
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-400/60 uppercase tracking-wider mb-0.5">
                        Live · 2026 Election Data
                      </div>
                      <div className="text-[16px] font-bold text-white">
                        Darke County, Ohio
                      </div>
                    </div>
                    <div className="text-[11px] text-white/20">
                      47 farms reported
                    </div>
                  </div>
                </div>

                {/* Benchmark bars */}
                <div className="px-6 py-5 space-y-4">
                  {/* Corn */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-white/60">
                        🌽 Corn
                      </span>
                      <span className="text-[12px] text-white/30">23 farms</span>
                    </div>
                    <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-center rounded-l-lg bg-emerald-500/30 border border-emerald-500/20"
                        style={{ width: '67%' }}
                      >
                        <span className="text-[12px] font-bold text-emerald-300">
                          ARC-CO 67%
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center rounded-r-lg bg-blue-500/20 border border-blue-500/15"
                        style={{ width: '33%' }}
                      >
                        <span className="text-[12px] font-bold text-blue-300">
                          PLC 33%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Soybeans */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-white/60">
                        🫘 Soybeans
                      </span>
                      <span className="text-[12px] text-white/30">18 farms</span>
                    </div>
                    <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-center rounded-l-lg bg-emerald-500/30 border border-emerald-500/20"
                        style={{ width: '44%' }}
                      >
                        <span className="text-[12px] font-bold text-emerald-300">
                          ARC 44%
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center rounded-r-lg bg-blue-500/20 border border-blue-500/15"
                        style={{ width: '56%' }}
                      >
                        <span className="text-[12px] font-bold text-blue-300">
                          PLC 56%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wheat */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-white/60">
                        🌾 Wheat
                      </span>
                      <span className="text-[12px] text-white/30">6 farms</span>
                    </div>
                    <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-center rounded-l-lg bg-emerald-500/30 border border-emerald-500/20"
                        style={{ width: '28%' }}
                      >
                        <span className="text-[11px] font-bold text-emerald-300">
                          28%
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center rounded-r-lg bg-blue-500/20 border border-blue-500/15"
                        style={{ width: '72%' }}
                      >
                        <span className="text-[12px] font-bold text-blue-300">
                          PLC 72%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/[0.04] bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 text-[11px] text-white/20">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Anonymous · Only county totals shown
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
