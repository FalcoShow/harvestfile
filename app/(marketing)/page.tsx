// =============================================================================
// HarvestFile — Homepage
// Phase 9 Build 1: Homepage Revolution
//
// The most important page in the entire product. Every farmer who hears
// about HarvestFile lands here first. This page must create an immediate
// "Woah, who built this?" reaction within 2 seconds of landing.
//
// Architecture:
//   - Server Component orchestrator (this file)
//   - Client islands for interactive elements (calculator, map, counters)
//   - Progressive reveal via Intersection Observer
//   - Dark hero → light content → dark CTA (visual bookending)
//
// Section flow:
//   1. Hero (dark)       — Jaw-drop headline + gold CTA + stats
//   2. Election Map (dark) — "Holy shit" moment — county-level data nobody else has
//   3. Features (light)  — 6 capabilities that differentiate
//   4. How It Works       — 3-step path to decision
//   5. Benchmark (dark)  — The "Facebook moment" network effect
//   6. Report (light)    — $39 AI report showcase
//   7. Social Proof       — Stats + data sources + trust
//   8. County Search (dark) — Bridge to 2,500+ county SEO pages
//   9. Final CTA (dark)  — Bottom conversion
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

export default function Home() {
  return (
    <>
      <HeroSection />
      <ElectionMapTeaser />
      <FeatureShowcase />
      <HowItWorks />
      <BenchmarkTeaser />
      <ReportProduct />
      <SocialProof />
      <CountySearchSection />
      <FinalCTA />
    </>
  );
}
