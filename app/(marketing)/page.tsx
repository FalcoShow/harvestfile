// =============================================================================
// HarvestFile — Homepage
// Phase 9 Build 3.5: Final Homepage Polish
//
// ALL cream backgrounds — zero white sections:
//   Features: #F5F0E6 (golden cream)
//   How It Works: #F7F3EC (warm cream)
//   Report Product: #F5F0E6 (golden cream)
//   Social Proof: #F7F3EC (warm cream)
//
// Scrim transitions updated to match first/last section colors.
// Dark chapter gold separators between sections.
// =============================================================================

import { HeroSection } from '@/components/homepage/HeroSection';
import { ElectionMapTeaser } from '@/components/homepage/ElectionMapTeaser';
import { FeatureShowcase } from '@/components/homepage/FeatureShowcase';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import { BenchmarkTeaser } from '@/components/homepage/BenchmarkTeaser';
import { ReportProduct } from '@/components/homepage/ReportProduct';
import { SocialProof } from '@/components/homepage/SocialProof';
import { CountySearchSection } from '@/components/marketing/CountySearchSection';
import { FinalCTA } from '@/components/homepage/FinalCTA';

// ─── Gold Separator ──────────────────────────────────────────────────────────
function GoldSeparator() {
  return (
    <div className="mx-auto max-w-[1100px] px-6" aria-hidden="true">
      <div
        className="h-[1px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 20%, rgba(201,168,76,0.25) 50%, rgba(201,168,76,0.15) 80%, transparent 100%)',
        }}
      />
    </div>
  );
}

// ─── Dark Gold Separator ─────────────────────────────────────────────────────
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

// ─── Scrim Transition: Dark → Golden Cream ───────────────────────────────────
// Destination: #F5F0E6 (FeatureShowcase bg)
function DarkToLightTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '160px', background: '#F5F0E6' }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
            rgba(12,31,23,1) 0%,
            rgba(12,31,23,0.987) 8.1%,
            rgba(12,31,23,0.951) 15.5%,
            rgba(12,31,23,0.896) 22.5%,
            rgba(12,31,23,0.825) 29%,
            rgba(12,31,23,0.741) 35.3%,
            rgba(12,31,23,0.648) 41.2%,
            rgba(12,31,23,0.55) 47.1%,
            rgba(12,31,23,0.45) 52.9%,
            rgba(12,31,23,0.352) 58.8%,
            rgba(12,31,23,0.259) 64.7%,
            rgba(12,31,23,0.175) 71%,
            rgba(12,31,23,0.104) 77.5%,
            rgba(12,31,23,0.049) 84.5%,
            rgba(12,31,23,0.013) 91.9%,
            rgba(12,31,23,0) 100%
          )`,
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

// ─── Scrim Transition: Warm Cream → Dark ─────────────────────────────────────
// Source: #F7F3EC (SocialProof bg)
function LightToDarkTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '160px', background: '#0C1F17' }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
            rgba(247,243,236,1) 0%,
            rgba(247,243,236,0.987) 8.1%,
            rgba(247,243,236,0.951) 15.5%,
            rgba(247,243,236,0.896) 22.5%,
            rgba(247,243,236,0.825) 29%,
            rgba(247,243,236,0.741) 35.3%,
            rgba(247,243,236,0.648) 41.2%,
            rgba(247,243,236,0.55) 47.1%,
            rgba(247,243,236,0.45) 52.9%,
            rgba(247,243,236,0.352) 58.8%,
            rgba(247,243,236,0.259) 64.7%,
            rgba(247,243,236,0.175) 71%,
            rgba(247,243,236,0.104) 77.5%,
            rgba(247,243,236,0.049) 84.5%,
            rgba(247,243,236,0.013) 91.9%,
            rgba(247,243,236,0) 100%
          )`,
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

export default function Home() {
  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 1 — DARK: The Dramatic Opening
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <HeroSection />
        <ElectionMapTeaser />
      </div>

      {/* ═══ TRANSITION: Dark → Golden Cream ═══ */}
      <DarkToLightTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 2 — CREAM: The Value Story
          Alternating warm cream tones — zero white backgrounds.
            Features: #F5F0E6 (golden cream)
            How It Works: #F7F3EC (warm cream)
            Report Product: #F5F0E6 (golden cream)
            Social Proof: #F7F3EC (warm cream)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="light">
        <FeatureShowcase />
        <GoldSeparator />
        <HowItWorks />
        <GoldSeparator />
        <ReportProduct />
        <GoldSeparator />
        <SocialProof />
      </div>

      {/* ═══ TRANSITION: Warm Cream → Dark ═══ */}
      <LightToDarkTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 3 — DARK: The Conversion Close
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <BenchmarkTeaser />
        <DarkGoldSeparator />
        <CountySearchSection />
        <DarkGoldSeparator />
        <FinalCTA />
      </div>
    </>
  );
}
