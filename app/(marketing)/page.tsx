// =============================================================================
// HarvestFile — Homepage
// Phase 9 Build 3: The Visceral Upgrade
//
// CHANGES FROM BUILD 2.5:
//   - Light chapter: each section gets its own bg for variety
//     Features: golden cream #F5F0E6 (warm)
//     How It Works: base cream #FAFAF7 (clean)
//     Report: base cream #FAFAF7
//     Social Proof: green-tinted #EFF5F2 (differentiated)
//   - Dark chapter: gold separators between Benchmark/Search/CTA
//   - Light chapter wrapper removed bg (sections own their bg)
//   - DarkToLight scrim destination updated to #F5F0E6
//   - LightToDark scrim source updated to #EFF5F2
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

// ─── Gold Separator (Light chapter) ──────────────────────────────────────────
function GoldSeparator() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 bg-[#FAFAF7]" aria-hidden="true">
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

// ─── Gold Separator (Dark chapter) ───────────────────────────────────────────
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

// ─── Scrim Transition: Dark → Light ──────────────────────────────────────────
// Destination is now #F5F0E6 (golden cream — the FeatureShowcase bg)
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

// ─── Scrim Transition: Light → Dark ──────────────────────────────────────────
// Source is now #EFF5F2 (green tint — the SocialProof bg)
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
            rgba(239,245,242,1) 0%,
            rgba(239,245,242,0.987) 8.1%,
            rgba(239,245,242,0.951) 15.5%,
            rgba(239,245,242,0.896) 22.5%,
            rgba(239,245,242,0.825) 29%,
            rgba(239,245,242,0.741) 35.3%,
            rgba(239,245,242,0.648) 41.2%,
            rgba(239,245,242,0.55) 47.1%,
            rgba(239,245,242,0.45) 52.9%,
            rgba(239,245,242,0.352) 58.8%,
            rgba(239,245,242,0.259) 64.7%,
            rgba(239,245,242,0.175) 71%,
            rgba(239,245,242,0.104) 77.5%,
            rgba(239,245,242,0.049) 84.5%,
            rgba(239,245,242,0.013) 91.9%,
            rgba(239,245,242,0) 100%
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
          CHAPTER 2 — LIGHT: The Value Story
          Sections own their backgrounds — no more flat cream wall.
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="light">
        <FeatureShowcase />
        <GoldSeparator />
        <HowItWorks />
        <GoldSeparator />
        <ReportProduct />
        <SocialProof />
      </div>

      {/* ═══ TRANSITION: Green Tint → Dark ═══ */}
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
