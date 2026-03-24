// =============================================================================
// HarvestFile — HeroSection (Client Component)
// Phase 9 Build 3: Dark Chapter Harmonization
//
// CHANGES FROM BUILD 1.5:
//   - Subheadline opacity: text-white/40 → text-white/50 (more readable)
//   - Stat labels opacity: text-white/25 → text-white/35 (no longer invisible)
//   - Trust strip opacity: text-white/25 → text-white/30
// =============================================================================

'use client';

import Link from 'next/link';
import { AnimatedCounter } from './shared/AnimatedCounter';

export function HeroSection() {
  return (
    <section className="relative min-h-[92dvh] flex flex-col items-center justify-center overflow-hidden bg-harvest-forest-950 pt-24">
      {/* ── Gradient Mesh Background ────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 60% 50% at 20% 30%, hsla(152, 68%, 28%, 0.25) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 60% at 75% 60%, hsla(38, 85%, 55%, 0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse 80% 40% at 50% 100%, hsla(152, 50%, 20%, 0.2) 0%, transparent 50%)',
            'radial-gradient(ellipse 30% 30% at 90% 10%, hsla(38, 80%, 50%, 0.06) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* ── Noise Texture ───────────────────────────────────────────── */}
      <div className="hf-noise-subtle" />

      {/* ── Subtle Top Border Glow ──────────────────────────────────── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)',
        }}
      />

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[900px] px-6 py-16 sm:py-20 text-center">

        {/* Badge */}
        <div
          className="flex justify-center mb-8"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out both' }}
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[12px] font-semibold text-white/50 tracking-wide">
              Updated for 2025 OBBBA Farm Bill · Live USDA Data
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="text-[clamp(36px,6vw,72px)] font-extrabold text-white tracking-[-0.04em] leading-[1.05] mb-6"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.1s both' }}
        >
          Know{' '}
          <span
            className="font-serif italic font-normal"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #E2C366, #C9A84C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            exactly
          </span>
          {' '}what your
          <br className="hidden sm:block" />
          {' '}farm is owed
        </h1>

        {/* Subheadline — bumped from white/40 to white/50 */}
        <p
          className="text-[clamp(16px,2vw,20px)] text-white/50 leading-relaxed max-w-[620px] mx-auto mb-10"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.2s both' }}
        >
          Compare ARC-CO vs PLC payments for your county, your crops, your farm.
          Powered by real USDA data. Free, instant, nationwide.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.3s both' }}
        >
          {/* Primary CTA — Gold shimmer */}
          <Link
            href="/check"
            className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-xl
              text-[16px] font-bold text-harvest-forest-950 overflow-hidden
              transition-all duration-300 hover:-translate-y-0.5
              hover:shadow-[0_12px_40px_rgba(201,168,76,0.3)]
              active:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)',
              backgroundSize: '200% auto',
            }}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)',
                backgroundSize: '200% auto',
                animation: 'hf-shimmer 2s ease-in-out infinite',
              }}
            />
            <span className="relative">Calculate My Payment</span>
            <svg className="relative w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Secondary CTA — Ghost */}
          <Link
            href="/elections"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-xl
              text-[15px] font-semibold text-white/60 border border-white/10
              hover:text-white/90 hover:border-white/20 hover:bg-white/[0.04]
              transition-all duration-300"
          >
            Explore Election Map
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Trust Strip — bumped from white/25 to white/30 */}
        <div
          className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap mb-12"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.4s both' }}
        >
          {[
            'No signup required',
            'All 50 states',
            '3,000+ counties',
            '16 covered crops',
          ].map((text) => (
            <span key={text} className="flex items-center gap-1.5 text-[13px] text-white/30">
              <svg className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {text}
            </span>
          ))}
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-[700px] mx-auto"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.5s both' }}
        >
          {[
            { value: 50, suffix: '', label: 'States Covered' },
            { value: 3000, suffix: '+', label: 'Counties' },
            { value: 16, suffix: '', label: 'Crop Programs' },
            { value: 2025, suffix: '', label: 'OBBBA Updated' },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-[clamp(24px,3.5vw,36px)] font-extrabold text-white tracking-[-0.03em]">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={1400 + i * 200}
                  formatter={(n) =>
                    stat.label === 'OBBBA Updated'
                      ? n.toString()
                      : n.toLocaleString()
                  }
                />
              </div>
              {/* Stat labels — bumped from white/25 to white/35 */}
              <div className="text-[12px] font-semibold text-white/35 tracking-wide uppercase mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subtle gradient hint that content continues below ───────── */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-harvest-forest-950/50 to-transparent" />
    </section>
  );
}
