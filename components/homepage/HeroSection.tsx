// =============================================================================
// HarvestFile — HeroSection (v2 — Research-Informed Redesign)
// Build 13 Deploy 2B: Bold, Trustworthy, Farmer-First Hero
//
// DESIGN PRINCIPLES (from typography + farmer trust research):
//   - Zero italic serif — Bricolage Grotesque only, using weight contrast
//   - Headline leads with benefit: "Know exactly what your farm is owed"
//   - Gold gradient applied to only 1-2 accent words, not entire lines
//   - Geo-personalized eyebrow: "Live ARC/PLC data for [County], [State]"
//   - CTA shows detected county name for 202% conversion lift
//   - USDA data attribution adjacent to CTA (farmer trust signal)
//   - No data cards in hero (MarketTicker at position 3 handles this)
//
// Architecture:
//   - Server Component (zero client JS except HeroEmailCapture ~3KB)
//   - All hover effects via CSS classes (no JS event handlers)
//   - Off-white text (#F0EDE6) on dark (#0C1F17) — 15:1 contrast ratio
// =============================================================================

import Link from 'next/link';
import { HeroEmailCapture } from './HeroEmailCapture';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface HeroSectionProps {
  countyFips?: string | null;
  countyName?: string | null;
  stateAbbr?: string | null;
  stateName?: string | null;
  lat?: number | null;
  lng?: number | null;
  detected: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HERO SECTION EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function HeroSection({
  countyFips,
  countyName,
  stateAbbr,
  detected,
}: HeroSectionProps) {
  const locationLine = detected && countyName && stateAbbr
    ? `${countyName}, ${stateAbbr}`
    : null;

  return (
    <section className="relative overflow-hidden" style={{ background: '#0C1F17' }}>
      {/* ─── Background layers ──────────────────────────────────────────── */}

      {/* Primary radial — creates depth behind headline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(27,67,50,0.5) 0%, rgba(12,31,23,0) 70%)',
        }}
      />

      {/* Gold accent glow — subtle warmth, not dominant */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '250px',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Grain texture */}
      <div className="hf-grain" />

      {/* ─── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1100px] px-5 pt-32 pb-16 sm:pt-36 sm:pb-20 md:pt-40 md:pb-24">

        {/* ─── Geo-Personalized Eyebrow ─────────────────────────────────── */}
        <div className="text-center mb-7">
          {locationLine ? (
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: '#22C55E',
                  boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                }}
              />
              <span
                className="text-[12px] font-semibold tracking-wide"
                style={{ color: 'rgba(201,168,76,0.85)' }}
              >
                Live ARC/PLC data for {locationLine}
              </span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: '#22C55E',
                  boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                }}
              />
              <span
                className="text-[12px] font-semibold tracking-wide"
                style={{ color: 'rgba(201,168,76,0.85)' }}
              >
                Live ARC/PLC data for 3,143 U.S. counties
              </span>
            </div>
          )}
        </div>

        {/* ─── Headline ─────────────────────────────────────────────────── */}
        {/*
          Research: benefit-driven, specific, under 44 characters.
          Weight contrast within Bricolage Grotesque creates hierarchy:
          - "Know exactly what" = Bold (700)
          - "your farm" = ExtraBold (800) + gold gradient accent
          - "is owed." = Bold (700)
          All one font family. Zero italic serif. Zero decorative fonts.
        */}
        <h1
          className="text-center mb-6"
          style={{
            fontSize: 'clamp(2.25rem, 5vw + 0.5rem, 4rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
          }}
        >
          <span className="text-white/90 font-bold">
            Know exactly what{' '}
          </span>
          <span
            className="font-extrabold"
            style={{
              backgroundImage: 'linear-gradient(135deg, #C9A84C, #E2C366, #D4B55A)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            your&nbsp;farm
          </span>
          <span className="text-white/90 font-bold">
            {' '}is&nbsp;owed.
          </span>
        </h1>

        {/* ─── Subheadline ──────────────────────────────────────────────── */}
        <p
          className="text-center max-w-lg mx-auto mb-10 leading-relaxed"
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 'clamp(0.95rem, 1.1vw + 0.1rem, 1.1rem)',
          }}
        >
          Live grain prices, ARC/PLC payment estimates, and county election
          data{locationLine ? ` for ${locationLine}` : ''} — updated daily
          from official USDA sources. Free. No account needed.
        </p>

        {/* ─── Primary CTA ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <Link
            href="/check"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl
              text-base font-semibold text-harvest-forest-950
              bg-gradient-to-br from-harvest-gold to-harvest-gold-bright
              hf-shadow-gold-lg
              hover:shadow-[0_6px_30px_rgba(201,168,76,0.4)]
              hover:translate-y-[-2px]
              active:translate-y-0
              transition-all duration-200"
          >
            {locationLine
              ? `See ${countyName}\u2019s Data \u2014 Free`
              : 'Find Your County \u2014 Free'}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          {/* USDA attribution — critical farmer trust signal */}
          <span
            className="text-[11px] font-medium flex items-center gap-1.5"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(201,168,76,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18M4 18h16M6 18V9m4 9V9m4 9V9m4 9V9M2 9l10-6 10 6" />
            </svg>
            Data sourced from USDA NASS, FSA, and Barchart
          </span>
        </div>

        {/* ─── Email Capture ────────────────────────────────────────────── */}
        <div className="mb-8">
          <HeroEmailCapture
            countyName={countyName || undefined}
            stateAbbr={stateAbbr || undefined}
            countyFips={countyFips || undefined}
          />
        </div>

        {/* ─── Trust micro-copy ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          {[
            {
              icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1 8.618 3.04A12.02 12.02 0 0 0 12 21.944 12.02 12.02 0 0 0 3.382 5.984',
              label: 'Independent',
            },
            {
              icon: 'M4 7V4h16v3M9 20h6M12 4v16',
              label: 'USDA Data',
            },
            {
              icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
              label: 'Your Data Stays Yours',
            },
            {
              icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
              label: 'Free Forever',
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(201,168,76,0.4)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* ─── County fallback link ─────────────────────────────────────── */}
        {detected && locationLine && (
          <div className="text-center mt-6">
            <Link
              href="/check"
              className="text-[12px] font-medium transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Not in {locationLine}? Find your county &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
