// =============================================================================
// HarvestFile — Premium Auth Layout
// Phase 12: World-class split-screen authentication experience
//
// Server Component wrapper with:
//   Left panel  → Aurora background, value prop, rotating testimonials, trust
//   Right panel → Glassmorphic card container for login/signup forms
//
// The left panel disappears on mobile → single-column centered form
// =============================================================================

import Link from 'next/link';
import { TestimonialRotator } from './_components/TestimonialRotator';

export const metadata = {
  title: 'HarvestFile — Sign In or Create Account',
  description:
    'Access the most advanced USDA farm program optimization platform. Compare ARC-CO vs PLC, get AI-powered reports, and maximize your farm payments.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="auth" className="min-h-screen bg-[#0C1F17] flex">
      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANEL — Brand, value prop, testimonials (desktop only)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[46%] relative overflow-hidden">
        {/* ── Aurora background ───────────────────────────────────────── */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C1F17] via-[#0F2A1D] to-[#0C1F17]">
          {/* Blob 1 — forest green, top-right drift */}
          <div
            className="hf-aurora-blob"
            style={{
              background:
                'radial-gradient(circle, rgba(27,67,50,0.45) 0%, transparent 70%)',
              width: '50vw',
              height: '50vw',
              top: '-10%',
              right: '-15%',
              animationDuration: '18s',
              animationDelay: '0s',
            }}
          />
          {/* Blob 2 — gold, center-left drift */}
          <div
            className="hf-aurora-blob"
            style={{
              background:
                'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
              width: '45vw',
              height: '45vw',
              bottom: '5%',
              left: '-10%',
              animationDuration: '22s',
              animationDelay: '-6s',
            }}
          />
          {/* Blob 3 — emerald, bottom-right */}
          <div
            className="hf-aurora-blob"
            style={{
              background:
                'radial-gradient(circle, rgba(45,106,79,0.35) 0%, transparent 70%)',
              width: '40vw',
              height: '40vw',
              bottom: '-15%',
              right: '10%',
              animationDuration: '25s',
              animationDelay: '-12s',
            }}
          />
        </div>

        {/* ── Noise overlay ──────────────────────────────────────────── */}
        <div className="hf-noise-subtle" />

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/20 flex items-center justify-center transition-all duration-300 group-hover:bg-[#C9A84C]/25 group-hover:border-[#C9A84C]/35">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A84C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 20h10" />
                <path d="M12 20V10" />
                <path d="M12 10c-2-2.96-6-3-6 0s4 4 6 2" />
                <path d="M12 10c2-2.96 6-3 6 0s-4 4-6 2" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white/90 tracking-tight">
              HarvestFile
            </span>
          </Link>

          {/* Main value proposition */}
          <div className="space-y-10 max-w-md">
            <div className="space-y-5">
              <h1 className="text-[clamp(28px,3.5vw,40px)] font-bold text-white leading-[1.15] tracking-tight">
                See which USDA program
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, #C9A84C, #E2C366, #C9A84C)',
                  }}
                >
                  pays more for your farm.
                </span>
              </h1>
              <p
                className="text-[16px] leading-relaxed max-w-sm"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Compare ARC-CO and PLC side by side with real USDA data.
                AI-powered reports show exactly which program maximizes your
                payments — county by county, crop by crop.
              </p>
            </div>

            {/* Value checkmarks */}
            <div className="space-y-3.5">
              {[
                'Compare ARC & PLC with live USDA data',
                'AI reports in 30 seconds, not 30 hours',
                'Price alerts so you never miss a move',
                'Free for 14 days — no credit card required',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#C9A84C]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#C9A84C"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[14px] text-white/55 leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="pt-4 border-t border-white/[0.06]">
              <TestimonialRotator />
            </div>
          </div>

          {/* Bottom trust bar */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-[11px] text-white/25 font-medium">
                256-bit encryption
              </span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[11px] text-white/25 font-medium">
              Data powered by USDA
            </span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[11px] text-white/25 font-medium">
              SOC 2 compliant
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Auth form (always visible, centered)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-5 sm:p-8 lg:p-12">
        {/* Subtle background gradient for right panel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(27,67,50,0.15) 0%, transparent 60%)',
          }}
        />

        {/* Mobile-only: condensed header */}
        <div className="lg:hidden w-full max-w-[420px] mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/20 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A84C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 20h10" />
                <path d="M12 20V10" />
                <path d="M12 10c-2-2.96-6-3-6 0s4 4 6 2" />
                <path d="M12 10c2-2.96 6-3 6 0s-4 4-6 2" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white/90 tracking-tight">
              HarvestFile
            </span>
          </Link>
          <p className="text-sm text-white/40 mt-1">
            See which USDA program pays more for your farm
          </p>
        </div>

        {/* Glassmorphic form card */}
        <div className="relative w-full max-w-[420px]">
          {/* Gradient border glow */}
          <div
            className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,168,76,0.2) 0%, rgba(27,67,50,0.15) 50%, rgba(201,168,76,0.1) 100%)',
              mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '1px',
              borderRadius: '16px',
            }}
          />

          <div
            className="relative rounded-2xl p-7 sm:p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow:
                '0 8px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {children}
          </div>
        </div>

        {/* Bottom copyright — mobile + desktop */}
        <p className="mt-8 text-[11px] text-white/20 text-center">
          &copy; 2026 HarvestFile LLC. All rights reserved.
        </p>
      </div>
    </div>
  );
}
