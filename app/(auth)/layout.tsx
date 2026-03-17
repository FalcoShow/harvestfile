// =============================================================================
// HarvestFile — Auth Layout (Phase 12 v2)
// CENTERED single-column form on brand-saturated background.
//
// Design philosophy: The form IS the page. Brand confidence comes from the
// aesthetic environment — layered gradients, noise, gold accents — not from
// filling space with marketing copy. Matches the homepage DNA exactly.
//
// No split-screen. No testimonial panel. Billion-dollar restraint.
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
      {/* ── Layered gradient background (matches homepage treatment) ── */}
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: '#080f0b',
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(27,67,50,0.4), transparent),
            radial-gradient(ellipse 60% 40% at 15% 80%, rgba(27,67,50,0.12), transparent),
            radial-gradient(ellipse 40% 40% at 85% 25%, rgba(201,168,76,0.045), transparent),
            radial-gradient(ellipse 70% 60% at 50% 120%, rgba(12,31,23,0.5), transparent)
          `,
        }}
      />

      {/* ── Noise texture (same as homepage) ── */}
      <div className="hf-noise-subtle fixed inset-0" />

      {/* ── Subtle animated aurora glow (very understated) ── */}
      <div
        className="fixed pointer-events-none hf-aurora-blob"
        style={{
          background:
            'radial-gradient(circle, rgba(27,67,50,0.18) 0%, transparent 70%)',
          width: '50vw',
          height: '50vh',
          top: '-15%',
          left: '25%',
          filter: 'blur(100px)',
          animationDuration: '25s',
        }}
      />
      <div
        className="fixed pointer-events-none hf-aurora-blob"
        style={{
          background:
            'radial-gradient(circle, rgba(201,168,76,0.035) 0%, transparent 70%)',
          width: '35vw',
          height: '35vh',
          bottom: '-10%',
          right: '15%',
          filter: 'blur(80px)',
          animationDuration: '30s',
          animationDelay: '-10s',
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar: logo left, back link right */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={28} />
            <span className="text-[17px] font-extrabold tracking-[-0.04em] text-white/90 transition-colors group-hover:text-white">
              Harvest<span className="text-harvest-gold">File</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-[13px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
        </div>

        {/* Centered form area */}
        <div className="flex-1 flex items-center justify-center px-5 py-8 sm:py-12">
          <div className="w-full max-w-[400px]">
            {/* Glassmorphic card */}
            <div
              className="rounded-2xl p-7 sm:p-8"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px) saturate(130%)',
                WebkitBackdropFilter: 'blur(20px) saturate(130%)',
                border: '1px solid rgba(255, 255, 255, 0.055)',
                boxShadow: `
                  0 0 0 0.5px rgba(255,255,255,0.03),
                  0 2px 4px rgba(0,0,0,0.08),
                  0 12px 40px rgba(0,0,0,0.2),
                  inset 0 1px 0 rgba(255,255,255,0.035)
                `,
              }}
            >
              {children}
            </div>

            {/* Bottom copyright */}
            <p className="mt-8 text-[11px] text-white/12 text-center">
              &copy; 2026 HarvestFile LLC · Uses NASS API · Not affiliated with USDA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
