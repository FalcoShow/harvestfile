// =============================================================================
// HarvestFile — Homepage
// Phase 9 Build 2: Section Architecture Revolution
//
// PROBLEM SOLVED: Build 1.5 had 4 GradientBridge components creating muddy
// olive-green bands. CSS linear-gradient between #0C1F17 and #FAFAF7 mixes
// RGB channels, hitting a dead grayish-olive at 50%.
//
// SOLUTION: 3 chapters with 2 transitions. Each transition uses the SCRIM
// technique: a base color underneath, with an overlay of the OTHER color
// at varying opacity. Because only ONE hue is present in each gradient
// (varying only in opacity), there is zero muddy midtone.
//
// FLOW:
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

// ─── Scrim Transition: Dark → Light ──────────────────────────────────────────
// Base: cream (#FAFAF7) — the destination color
// Overlay: dark green at varying opacity — fades from 100% to 0%
// Result: top looks fully dark, bottom looks fully cream, middle is
//         cream showing through semi-transparent dark (NOT olive mud)
function DarkToLightTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '160px', background: '#FAFAF7' }}
      aria-hidden="true"
    >
      {/* Dark green overlay — opacity ramp from 1 → 0 (sine curve) */}
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

      {/* Gold accent line — centered in the transition zone */}
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
// Base: dark green (#0C1F17) — the destination color
// Overlay: cream at varying opacity — fades from 100% to 0%
// Result: top looks fully cream, bottom looks fully dark, middle is
//         dark showing through semi-transparent cream (NOT olive mud)
function LightToDarkTransition() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '160px', background: '#0C1F17' }}
      aria-hidden="true"
    >
      {/* Cream overlay — opacity ramp from 1 → 0 (sine curve) */}
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

      {/* Gold accent line — centered in the transition zone */}
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
          Hero + Election Map — continuous dark, zero breaks
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <HeroSection />
        <ElectionMapTeaser />
      </div>

      {/* ═══ TRANSITION: Dark → Light (scrim + gold accent) ═══ */}
      <DarkToLightTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 2 — LIGHT: The Value Story
          All light-background content grouped together under ONE continuous
          cream background. No more light→dark→light sandwich.
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="light" className="bg-[#FAFAF7]">
        <FeatureShowcase />
        <HowItWorks />
        <ReportProduct />
        <SocialProof />
      </div>

      {/* ═══ TRANSITION: Light → Dark (scrim + gold accent) ═══ */}
      <LightToDarkTransition />

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAPTER 3 — DARK: The Conversion Close
          Benchmark Teaser (moved from middle) + County Search + CTA
          Flows seamlessly into the dark footer
          ═══════════════════════════════════════════════════════════════════════ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <BenchmarkTeaser />
        <CountySearchSection />
        <FinalCTA />
      </div>
    </>
  );
}
