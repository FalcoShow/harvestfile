// =============================================================================
// HarvestFile — Homepage
// Phase 9 Build 1.5: Cinematic Homepage Polish
//
// KEY CHANGES from Build 1:
//   1. Every section has data-nav-theme="dark"|"light" so the adaptive
//      navigation knows what color to be
//   2. Gradient bridge divs between sections eliminate hard color boundaries
//   3. Tighter spacing — no "dead air" between sections
//   4. Sections flow into each other as one continuous experience
//
// Section flow with visual continuity:
//   DARK: Hero → Election Map (continuous dark, no break)
//   BRIDGE: dark→light gradient (120px)
//   LIGHT: Features → How It Works (continuous light)
//   BRIDGE: light→dark gradient (120px)
//   DARK: Benchmark Teaser (continuous dark)
//   BRIDGE: dark→light gradient (120px)
//   LIGHT: Report Product → Social Proof (continuous light)
//   BRIDGE: light→dark gradient (120px)
//   DARK: County Search → Final CTA → Footer (continuous dark to end)
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

// Gradient bridge component — smooth transition between dark/light sections
function GradientBridge({
  from,
  to,
  height = 120,
}: {
  from: string;
  to: string;
  height?: number;
}) {
  return (
    <div
      className="w-full pointer-events-none"
      style={{
        height: `${height}px`,
        background: `linear-gradient(to bottom, ${from}, ${to})`,
      }}
    />
  );
}

export default function Home() {
  return (
    <>
      {/* ═══ DARK CHAPTER: Hero + Election Map ═══ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <HeroSection />
        <ElectionMapTeaser />
      </div>

      {/* ═══ BRIDGE: Dark → Light ═══ */}
      <GradientBridge from="#0C1F17" to="#FAFAF7" height={140} />

      {/* ═══ LIGHT CHAPTER: Features + How It Works ═══ */}
      <div data-nav-theme="light" className="bg-[#FAFAF7]">
        <FeatureShowcase />
        <HowItWorks />
      </div>

      {/* ═══ BRIDGE: Light → Dark ═══ */}
      <GradientBridge from="#FAFAF7" to="#0C1F17" height={140} />

      {/* ═══ DARK CHAPTER: Benchmark Teaser ═══ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <BenchmarkTeaser />
      </div>

      {/* ═══ BRIDGE: Dark → Light ═══ */}
      <GradientBridge from="#0C1F17" to="#FFFFFF" height={120} />

      {/* ═══ LIGHT CHAPTER: Report + Social Proof ═══ */}
      <div data-nav-theme="light" className="bg-[#FAFAF7]">
        <ReportProduct />
        <SocialProof />
      </div>

      {/* ═══ BRIDGE: Light → Dark ═══ */}
      <GradientBridge from="#FAFAF7" to="#0C1F17" height={140} />

      {/* ═══ DARK CHAPTER: County Search + Final CTA ═══ */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <CountySearchSection />
        <FinalCTA />
      </div>
    </>
  );
}
