// =============================================================================
// HarvestFile — Homepage
// Phase 9 Build 2.5: Light Chapter Polish
//
// CHANGES FROM BUILD 2:
//   - Added GoldSeparator component between light chapter sections
//   - Separators create visual breathing room within the continuous cream
//   - Thin gold gradient line with consistent container width
//   - Prevents the 4-section light chapter from reading as one endless block
//
// FLOW (unchanged from Build 2):
//   CHAPTER 1 — DARK: Hero → Election Map
//   ── Scrim transition (dark→light) ──
//   CHAPTER 2 — LIGHT: Features → How It Works → Report → Social Proof
//   ── Scrim transition (light→dark) ──
//   CHAPTER 3 — DARK: Benchmark → County Search → Final CTA → Footer
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
// Thin horizontal gold accent line between light chapter sections.
// Creates visual breathing room without any color shift.
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

// ─── Scrim Transition: Dark → Light ──────────────────────────────────────────
function DarkToLightTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '160px', background: '#FAFAF7' }}
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
            rgba(250,250,247,1) 0%,
            rgba(250,250,247,0.987) 8.1%,
            rgba(250,250,247,0.951) 15.5%,
            rgba(250,250,247,0.896) 22.5%,
            rgba(250,250,247,0.825) 29%,
            rgba(250,250,247,0.741) 35.3%,
            rgba(250,250,247,0.648) 41.2%,
            rgba(250,250,247,0.55) 47.1%,
            rgba(250,250,247,0.45) 52.9%,
            rgba(250,250,247,0.352) 58.8%,
            rgba(250,250,247,0.259) 64.7%,
            rgba(250,250,247,0.175) 71%,
            rgba(250,250,247,0.104) 77.5%,
            rgba(250,250,247,0.049) 84.5%,
            rgba(250,250,247,0.013) 91.9%,
            rgba(250,250,247,0) 100%
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

      {/* ═══ TRANSITION: Dark → Light ═══ */}
      <DarkToLightTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 2 — LIGHT: The Value Story
          Gold separators between sections provide visual pacing within
          the continuous cream background — no color changes needed.
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="light" className="bg-[#FAFAF7]">
        <FeatureShowcase />
        <GoldSeparator />
        <HowItWorks />
        <GoldSeparator />
        <ReportProduct />
        <GoldSeparator />
        <SocialProof />
      </div>

      {/* ═══ TRANSITION: Light → Dark ═══ */}
      <LightToDarkTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 3 — DARK: The Conversion Close
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <BenchmarkTeaser />
        <CountySearchSection />
        <FinalCTA />
      </div>
    </>
  );
}
