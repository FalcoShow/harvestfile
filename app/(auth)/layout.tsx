// =============================================================================
// HarvestFile — Auth Layout (Phase 12 v4.1)
// Same structure as v4 but SCALED UP — everything was too small.
//
// Changes from v4:
//   • Form card: max-w-[400px] → max-w-[460px], padding p-8 → p-9/p-10
//   • Left headline: 36/42px → 42/50px
//   • Left description: 16px → 17px
//   • Left stats: 15px → 16px
//   • Logo: 36px → 40px, text 22px → 24px
//   • Left panel padding: p-12/p-16 → p-14/p-20
// =============================================================================

import Link from 'next/link';
import { Logo } from '@/components/marketing/logo';

export const metadata = {
  title: 'HarvestFile — Sign In or Create Account',
  description:
    'Access the most advanced USDA farm program optimization platform. Compare ARC-CO vs PLC, get AI-powered reports, and maximize your farm payments.',
};

const TOPO_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.04' stroke-width='1'%3E%3Cellipse cx='300' cy='300' rx='280' ry='180'/%3E%3Cellipse cx='300' cy='300' rx='220' ry='140'/%3E%3Cellipse cx='300' cy='300' rx='160' ry='100'/%3E%3Cellipse cx='300' cy='300' rx='100' ry='60'/%3E%3Cellipse cx='300' cy='300' rx='50' ry='28'/%3E%3Cellipse cx='150' cy='150' rx='120' ry='80'/%3E%3Cellipse cx='150' cy='150' rx='80' ry='50'/%3E%3Cellipse cx='150' cy='150' rx='40' ry='22'/%3E%3Cellipse cx='480' cy='450' rx='100' ry='70'/%3E%3Cellipse cx='480' cy='450' rx='60' ry='38'/%3E%3Cellipse cx='480' cy='450' rx='25' ry='14'/%3E%3Cellipse cx='100' cy='480' rx='90' ry='55'/%3E%3Cellipse cx='100' cy='480' rx='50' ry='30'/%3E%3Cellipse cx='500' cy='120' rx='80' ry='50'/%3E%3Cellipse cx='500' cy='120' rx='40' ry='24'/%3E%3C/g%3E%3C/svg%3E")`;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="auth" className="h-dvh overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] h-full">
        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className="hidden lg:flex relative overflow-hidden">
          {/* Layer 1: Base gradient */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#0C1F17',
              backgroundImage: `
                radial-gradient(ellipse at 25% 75%, rgba(27,67,50,0.6) 0%, transparent 60%),
                radial-gradient(ellipse at 75% 25%, rgba(12,31,23,0.8) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 0%, rgba(27,67,50,0.3) 0%, transparent 50%)
              `,
            }}
          />

          {/* Layer 2: Topo contours */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: TOPO_PATTERN,
              backgroundSize: '600px 600px',
              backgroundRepeat: 'repeat',
            }}
          />

          {/* Layer 3: Gold glow orbs */}
          <div
            className="absolute pointer-events-none rounded-full hf-aurora-blob"
            style={{
              top: '15%', left: '10%', width: '450px', height: '450px',
              background: 'rgba(201,168,76,0.06)', filter: 'blur(100px)',
              animationDuration: '22s',
            }}
          />
          <div
            className="absolute pointer-events-none rounded-full hf-aurora-blob"
            style={{
              bottom: '5%', right: '20%', width: '350px', height: '350px',
              background: 'rgba(226,195,102,0.04)', filter: 'blur(120px)',
              animationDuration: '28s', animationDelay: '-10s',
            }}
          />

          {/* Layer 4: Noise */}
          <div className="hf-noise-subtle" />

          {/* Layer 5: Content */}
          <div className="relative z-10 flex flex-col justify-between p-14 xl:p-20 w-full">
            {/* Top: Bold wordmark */}
            <Link href="/" className="flex items-center gap-3.5 group w-fit">
              <Logo size={40} />
              <span className="text-[24px] font-extrabold tracking-[-0.04em] text-white transition-colors group-hover:text-white/80">
                Harvest<span className="text-harvest-gold">File</span>
              </span>
            </Link>

            {/* Center: Value proposition */}
            <div className="max-w-[480px]">
              <h1 className="text-[42px] xl:text-[50px] font-extrabold text-white leading-[1.08] tracking-[-0.03em] mb-6">
                Know{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, #C9A84C 0%, #E2C366 50%, #C9A84C 100%)',
                  }}
                >
                  exactly
                </span>{' '}
                what your farm is owed
              </h1>

              <p className="text-[17px] text-white/40 leading-relaxed mb-12 max-w-[400px]">
                The fastest way to compare ARC-CO vs PLC payments.
                Built for farmers, Farm Credit officers, and crop insurance
                agents.
              </p>

              {/* Stats with gold check marks */}
              <div className="space-y-5">
                {[
                  { num: '50', label: 'States covered' },
                  { num: '3,142', label: 'Counties mapped' },
                  { num: '16', label: 'Programs supported' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#C9A84C"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-[17px] text-white/80 font-bold">
                      {s.num}
                    </span>
                    <span className="text-[16px] text-white/35">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: OBBBA badge */}
            <div className="flex items-center gap-5">
              <span
                className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.06em] uppercase rounded-full px-3.5 py-1.5"
                style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.15)',
                  color: 'rgba(201,168,76,0.6)',
                }}
              >
                <span className="w-[5px] h-[5px] rounded-full bg-[#4ADE80]" />
                2025 OBBBA Updated
              </span>
              <span className="text-[12px] text-white/15">
                Powered by USDA NASS data
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL ═══════════ */}
        <div
          className="relative flex flex-col items-center justify-center px-6 sm:px-10 lg:px-14"
          style={{
            backgroundColor: '#0a1510',
            backgroundImage:
              'radial-gradient(ellipse at 50% 0%, rgba(27,67,50,0.2) 0%, transparent 60%)',
          }}
        >
          {/* Mobile-only: logo + tagline */}
          <div className="lg:hidden w-full max-w-[460px] mb-6 pt-6">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <Logo size={32} />
              <span className="text-[20px] font-extrabold tracking-[-0.04em] text-white">
                Harvest<span className="text-harvest-gold">File</span>
              </span>
            </Link>
            <p className="text-[14px] text-white/35">
              Know exactly what your farm is owed
            </p>
          </div>

          {/* Desktop: back link */}
          <div className="hidden lg:block absolute top-8 right-12">
            <Link
              href="/"
              className="text-[13px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </Link>
          </div>

          {/* Form card — WIDER */}
          <div className="w-full max-w-[460px]">
            <div
              className="rounded-2xl p-8 sm:p-10"
              style={{
                background:
                  'linear-gradient(180deg, rgba(20,43,33,0.8) 0%, rgba(14,32,23,0.85) 100%)',
                backdropFilter: 'blur(16px) saturate(140%)',
                WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: `
                  0 4px 8px rgba(0,0,0,0.12),
                  0 16px 48px rgba(0,0,0,0.25),
                  inset 0 1px 0 rgba(255,255,255,0.05)
                `,
              }}
            >
              {children}
            </div>

            <p className="mt-6 text-[11px] text-white/12 text-center">
              &copy; 2026 HarvestFile LLC · Not affiliated with USDA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
