// =============================================================================
// HarvestFile — Homepage
// Build 11 Deploy 2: Premium Product Showcase Sections
//
// ASYNC Server Component — reads Vercel IP geolocation headers, resolves the
// visitor's county (~200ms), and passes personalized data to the hero.
//
// Section order (Deploy 2):
//   CHAPTER 1 (Dark):  Hero → Market Ticker → Election Map → Trust Bar → Bento
//   CHAPTER 2 (Cream): Tabbed Showcase → How It Works
//   CHAPTER 3 (Dark):  Data Confidence → Final CTA
//
// What changed from Deploy 1:
//   REMOVED: FeatureShowcase, old HowItWorks, ReportProduct, SocialProof,
//            BenchmarkTeaser, old FinalCTA
//   ADDED:   TrustBar, BentoShowcase, TabbedShowcase, HowItWorks (new),
//            DataConfidence, FinalCTA (new)
//
// Performance: Hero shell renders instantly. Live data cards stream via
// Suspense. Everything below the hero renders immediately (static sections).
// =============================================================================

import { headers } from 'next/headers';
import { HeroSection } from '@/components/homepage/HeroSection';
import { MarketTicker } from '@/components/homepage/MarketTicker';
import { ElectionMapTeaser } from '@/components/homepage/ElectionMapTeaser';
import { TrustBar } from '@/components/homepage/TrustBar';
import { BentoShowcase } from '@/components/homepage/BentoShowcase';
import { TabbedShowcase } from '@/components/homepage/TabbedShowcase';
import { HowItWorks } from '@/components/homepage/HowItWorksNew';
import { DataConfidence } from '@/components/homepage/DataConfidence';
import { FinalCTA } from '@/components/homepage/FinalCTANew';

// Force dynamic — every visitor gets geo-personalized content
export const dynamic = 'force-dynamic';

// ─── County Resolution ──────────────────────────────────────────────────────

interface ResolvedCounty {
  countyFips: string;
  displayName: string;
  stateAbbr: string;
  stateName: string;
  stateSlug: string;
  countySlug: string;
  hasArcPlcData: boolean;
  topCrop?: {
    name: string;
    recommendation: 'PLC' | 'ARC-CO' | 'NEUTRAL';
    arcPaymentRate: number;
    plcPaymentRate: number;
    advantagePerAcre: number;
    advantageLabel: string;
  };
}

async function resolveVisitorCounty(
  lat: number,
  lng: number,
): Promise<ResolvedCounty | null> {
  try {
    const { resolveCountyFromCoords } = await import(
      '@/lib/geo/county-resolver'
    );
    return await resolveCountyFromCoords(lat, lng);
  } catch (err) {
    console.error('[Homepage] County resolution failed:', err);
    return null;
  }
}

// ─── Section Transitions ────────────────────────────────────────────────────

function DarkGoldSeparator() {
  return (
    <div className="mx-auto max-w-[1000px] px-6" aria-hidden="true">
      <div
        className="h-[1px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.2) 20%, rgba(201,168,76,0.35) 50%, rgba(201,168,76,0.2) 80%, transparent 100%)',
        }}
      />
    </div>
  );
}

function DarkToLightTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '100px', background: '#F5F0E6' }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
          rgba(12,31,23,1) 0%, rgba(12,31,23,0.987) 8.1%, rgba(12,31,23,0.951) 15.5%,
          rgba(12,31,23,0.896) 22.5%, rgba(12,31,23,0.825) 29%, rgba(12,31,23,0.741) 35.3%,
          rgba(12,31,23,0.648) 41.2%, rgba(12,31,23,0.55) 47.1%, rgba(12,31,23,0.45) 52.9%,
          rgba(12,31,23,0.352) 58.8%, rgba(12,31,23,0.259) 64.7%, rgba(12,31,23,0.175) 71%,
          rgba(12,31,23,0.104) 77.5%, rgba(12,31,23,0.049) 84.5%, rgba(12,31,23,0.013) 91.9%,
          rgba(12,31,23,0) 100%)`,
        }}
      />
      <div
        className="absolute left-0 right-0 z-10"
        style={{
          top: '50%',
          height: '1px',
          background:
            'linear-gradient(90deg, transparent 8%, rgba(201,168,76,0.3) 25%, rgba(201,168,76,0.5) 50%, rgba(201,168,76,0.3) 75%, transparent 92%)',
        }}
      />
    </div>
  );
}

function LightToDarkTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '100px', background: '#0C1F17' }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
          rgba(245,240,230,1) 0%, rgba(245,240,230,0.987) 8.1%, rgba(245,240,230,0.951) 15.5%,
          rgba(245,240,230,0.896) 22.5%, rgba(245,240,230,0.825) 29%, rgba(245,240,230,0.741) 35.3%,
          rgba(245,240,230,0.648) 41.2%, rgba(245,240,230,0.55) 47.1%, rgba(245,240,230,0.45) 52.9%,
          rgba(245,240,230,0.352) 58.8%, rgba(245,240,230,0.259) 64.7%, rgba(245,240,230,0.175) 71%,
          rgba(245,240,230,0.104) 77.5%, rgba(245,240,230,0.049) 84.5%, rgba(245,240,230,0.013) 91.9%,
          rgba(245,240,230,0) 100%)`,
        }}
      />
      <div
        className="absolute left-0 right-0 z-10"
        style={{
          top: '50%',
          height: '1px',
          background:
            'linear-gradient(90deg, transparent 8%, rgba(201,168,76,0.3) 25%, rgba(201,168,76,0.5) 50%, rgba(201,168,76,0.3) 75%, transparent 92%)',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT (async Server Component)
// ═══════════════════════════════════════════════════════════════════════════════

export default async function Home() {
  // ─── Geo Detection via Vercel IP Headers ─────────────────────────────────
  const headersList = await headers();
  const ipLat = headersList.get('x-vercel-ip-latitude');
  const ipLng = headersList.get('x-vercel-ip-longitude');
  const ipCountry = headersList.get('x-vercel-ip-country');

  let county: ResolvedCounty | null = null;
  let lat: number | undefined;
  let lng: number | undefined;
  let detected = false;

  if (
    ipLat &&
    ipLng &&
    (!ipCountry || ipCountry === 'US')
  ) {
    lat = parseFloat(ipLat);
    lng = parseFloat(ipLng);

    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= 24 &&
      lat <= 72 &&
      lng >= -180 &&
      lng <= -65
    ) {
      county = await resolveVisitorCounty(lat, lng);
      detected = !!county;
    }
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 1 — DARK: Hero → Ticker → Map → Trust → Bento Showcase
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <HeroSection
          countyFips={county?.countyFips}
          countyName={county?.displayName}
          stateAbbr={county?.stateAbbr}
          stateName={county?.stateName}
          lat={lat}
          lng={lng}
          detected={detected}
        />
        <DarkGoldSeparator />
        <MarketTicker />
        <DarkGoldSeparator />
        <ElectionMapTeaser />
        <DarkGoldSeparator />
        <TrustBar />
        <DarkGoldSeparator />
        <BentoShowcase />
      </div>

      <DarkToLightTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 2 — CREAM: Tabbed Product Showcase → How It Works
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="light" style={{ background: '#F5F0E6' }}>
        <TabbedShowcase />
        <HowItWorks />
      </div>

      <LightToDarkTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 3 — DARK: Data Confidence → Final CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <DataConfidence />
        <DarkGoldSeparator />
        <FinalCTA />
      </div>
    </>
  );
}
