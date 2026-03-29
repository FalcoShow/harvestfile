// =============================================================================
// HarvestFile — HeroSection (COMPLETE REWRITE)
// Build 13 Deploy 2 (Deploy 2B): Bold Hero Redesign
//
// WHAT CHANGED:
//   - REMOVED all inline data fetching (grain bids, weather, futures)
//   - REMOVED HeroDataCards, GrainCard, WeatherMiniCard, PaymentMiniCard
//   - REMOVED HeroCardsSkeleton, CROP_PARAMS, calc functions
//   - Data cards were redundant with MarketTicker (now at position 3)
//   - Hero is now: bold headline → subtext → CTA → email capture → trust
//   - Geo-personalization appears in CTA button text and subheadline
//   - File: 32KB → ~8KB | 750 lines → ~180 lines
//
// WHY:
//   Research shows heroes with <44 char headlines and 1 CTA convert best.
//   Live data creates cognitive overload in the 50ms first-impression window.
//   The hero sells the promise; the MarketTicker (below) proves it.
//
// Architecture:
//   - Server Component shell renders headline + CTA instantly
//   - HeroEmailCapture is the only client component (~3KB)
//   - Total client JS: ~3KB (email form only)
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

      {/* Primary radial gradient — creates depth behind headline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(27,67,50,0.5) 0%, rgba(12,31,23,0) 70%)',
        }}
      />

      {/* Gold accent glow — subtle warmth behind the headline */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '300px',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Grain texture */}
      <div className="hf-grain" />

      {/* ─── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1100px] px-5 pt-32 pb-16 sm:pt-36 sm:pb-20 md:pt-40 md:pb-24">

        {/* Eyebrow badge */}
        <div className="text-center mb-6">
          {locationLine ? (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#22C55E',
                  boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                }}
              />
              <span
                className="text-[12px] font-semibold"
                style={{ color: 'rgba(201,168,76,0.8)' }}
              >
                Today in {locationLine}
              </span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <span
                className="text-[12px] font-semibold"
                style={{ color: 'rgba(201,168,76,0.8)' }}
              >
                3,143 counties. Updated daily. Free.
              </span>
            </div>
          )}
        </div>

        {/* ─── Headline ─────────────────────────────────────────────────── */}
        <h1 className="text-center mb-5">
          <span
            className="block text-white"
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw + 0.5rem, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              fontWeight: 700,
            }}
          >
            Your farm&apos;s
          </span>
          <span
            className="block"
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw + 0.5rem, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              fontWeight: 400,
              fontFamily: 'var(--font-instrument)',
              fontStyle: 'italic',
              backgroundImage: 'linear-gradient(135deg, #C9A84C 0%, #E2C366 50%, #C9A84C 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            financial intelligence.
          </span>
        </h1>

        {/* ─── Subheadline ──────────────────────────────────────────────── */}
        <p
          className="text-center max-w-xl mx-auto mb-10 leading-relaxed"
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 'clamp(0.95rem, 1.2vw, 1.125rem)',
          }}
        >
          Live grain prices, ARC/PLC payment estimates, and county election
          data — updated daily
          {locationLine ? ` for ${locationLine}` : ' for every county in America'}.
          {' '}Free. No account needed.
        </p>

        {/* ─── Primary CTA ──────────────────────────────────────────────── */}
        <div className="text-center mb-8">
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
            {locationLine ? `See ${countyName} Data` : 'Get Started Free'}
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

        {/* ─── County fallback ──────────────────────────────────────────── */}
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
