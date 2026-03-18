// =============================================================================
// HarvestFile — Auth Layout (Phase 12 v3)
// Rich, substantial, premium. Matches homepage hero energy.
//
// Key fixes from v2:
//   • Background gradient is VISIBLE — matches homepage hero glow
//   • Card has real substance — higher opacity, visible border, stronger shadow
//   • Overall more visual weight and contrast
//   • Decorative grid pattern adds texture without clutter
// =============================================================================

import Link from 'next/link';
import { Logo } from '@/components/marketing/logo';

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
    <div data-theme="auth" className="min-h-screen relative overflow-hidden">
      {/* ── Rich layered background — matches homepage hero ──────── */}
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: '#070d09',
          backgroundImage: `
            radial-gradient(ellipse 90% 60% at 50% -10%, rgba(27,67,50,0.55), transparent 70%),
            radial-gradient(ellipse 50% 50% at 0% 100%, rgba(27,67,50,0.2), transparent 60%),
            radial-gradient(ellipse 50% 50% at 100% 0%, rgba(201,168,76,0.07), transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% 50%, rgba(12,31,23,0.4), transparent 80%)
          `,
        }}
      />

      {/* ── Dot grid pattern — adds visual texture ──────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Noise texture ─────────────────────────────────────── */}
      <div className="hf-noise-subtle fixed inset-0" />

      {/* ── Animated aurora accents ────────────────────────────── */}
      <div
        className="fixed pointer-events-none hf-aurora-blob"
        style={{
          background: 'radial-gradient(circle, rgba(27,67,50,0.3) 0%, transparent 70%)',
          width: '60vw',
          height: '50vh',
          top: '-20%',
          left: '20%',
          filter: 'blur(80px)',
          animationDuration: '20s',
        }}
      />
      <div
        className="fixed pointer-events-none hf-aurora-blob"
        style={{
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          width: '40vw',
          height: '40vh',
          bottom: '-15%',
          right: '10%',
          filter: 'blur(70px)',
          animationDuration: '28s',
          animationDelay: '-8s',
        }}
      />

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 pt-6 sm:pt-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={30} />
            <span className="text-[18px] font-extrabold tracking-[-0.04em] text-white transition-colors group-hover:text-white/80">
              Harvest<span className="text-harvest-gold">File</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-[13px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 font-medium"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to home
          </Link>
        </div>

        {/* Centered form area */}
        <div className="flex-1 flex items-center justify-center px-5 py-8 sm:py-12">
          <div className="w-full max-w-[420px]">
            {/* Form card — substantial, visible, premium */}
            <div
              className="rounded-[20px] p-8 sm:p-9"
              style={{
                background: 'linear-gradient(180deg, rgba(20,43,33,0.85) 0%, rgba(15,32,24,0.9) 100%)',
                backdropFilter: 'blur(24px) saturate(140%)',
                WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: `
                  0 0 0 1px rgba(0,0,0,0.3),
                  0 4px 8px rgba(0,0,0,0.15),
                  0 16px 48px rgba(0,0,0,0.3),
                  0 32px 80px rgba(0,0,0,0.2),
                  inset 0 1px 0 rgba(255,255,255,0.06)
                `,
              }}
            >
              {children}
            </div>

            {/* Bottom copyright */}
            <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-white/15">
              <span>&copy; 2026 HarvestFile LLC</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>Uses NASS API</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>Not affiliated with USDA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
