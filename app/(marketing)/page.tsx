// =============================================================================
// HarvestFile — Homepage
// Build 13 Deploy 1 (Deploy 2A): Structural Surgery
//
// ASYNC Server Component — reads Vercel IP geolocation headers, resolves the
// visitor's county (~200ms), and passes personalized data to the hero.
//
// WHAT CHANGED (Deploy 2A):
//   - REMOVED TabbedShowcase (redundant — showed same 3 products as BentoShowcase)
//   - REMOVED cream chapter entirely — unified dark experience, no theme-switching
//   - REMOVED DarkToLightTransition and LightToDarkTransition (no cream section)
//   - MOVED TrustBar to position 2 (right after hero, before MarketTicker)
//     → Trust signals now appear within first scroll (peak attention window)
//   - Reordered to 7 purposeful sections:
//     Hero → TrustBar → MarketTicker → ElectionMapTeaser →
//     BentoShowcase → HowItWorks → DataConfidence → FinalCTA
//
// WHY:
//   - BentoShowcase + TabbedShowcase were redundant (both showed Morning Dashboard,
//     ARC/PLC Calculator, and County Election Map)
//   - TrustBar at position 4 meant most visitors never saw it during peak attention
//   - The dark→cream→dark theme switching created arrhythmic visual flow
//   - Removing one section + two transitions cuts ~40% of page length
//
// Architecture: Single dark chapter, gold separators between sections
// =============================================================================

import { headers } from 'next/headers';
import { HeroSection } from '@/components/homepage/HeroSection';
import { MarketTicker } from '@/components/homepage/MarketTicker';
import { ElectionMapTeaser } from '@/components/homepage/ElectionMapTeaser';
import { TrustBar } from '@/components/homepage/TrustBar';
import { BentoShowcase } from '@/components/homepage/BentoShowcase';
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

// ─── Section Separator ──────────────────────────────────────────────────────

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
    <div data-nav-theme="dark" className="bg-harvest-forest-950">
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
          Geo-personalized headline + live data cards + email capture
          ═══════════════════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — TRUST BAR (moved up from position 4)
          USDA/NOAA/RMA badges + activity counters
          Now within first scroll — peak attention window
          ═══════════════════════════════════════════════════════════════════ */}
      <TrustBar />

      <DarkGoldSeparator />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — MARKET TICKER
          Live corn/soybeans/wheat CME prices with PLC payment status
          ═══════════════════════════════════════════════════════════════════ */}
      <MarketTicker />

      <DarkGoldSeparator />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — ELECTION MAP
          Interactive choropleth of ARC/PLC elections across 3,100+ counties
          The "wow moment" — nothing like this exists in the market
          ═══════════════════════════════════════════════════════════════════ */}
      <ElectionMapTeaser />

      <DarkGoldSeparator />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — PRODUCT SHOWCASE (Bento Grid)
          Three surfaces: Morning Dashboard, ARC/PLC Calculator, Election Map
          Plus stat cards (elevator bids tracked, commodities covered)
          ═══════════════════════════════════════════════════════════════════ */}
      <BentoShowcase />

      <DarkGoldSeparator />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — HOW IT WORKS
          Three steps: Enter county → See data → Make decisions
          ═══════════════════════════════════════════════════════════════════ */}
      <HowItWorks />

      <DarkGoldSeparator />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7 — DATA CONFIDENCE
          Stats + data sources + independence commitment
          ═══════════════════════════════════════════════════════════════════ */}
      <DataConfidence />

      <DarkGoldSeparator />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8 — FINAL CTA
          "Know your numbers before election day" + email capture
          ═══════════════════════════════════════════════════════════════════ */}
      <FinalCTA />
    </div>
  );
}
