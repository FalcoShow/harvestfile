// =============================================================================
// HarvestFile — Homepage
// Build 7 Deploy 1: Added MarketTicker between Hero and Election Map
//
// Section order:
//   CHAPTER 1 (Dark):  Hero w/ county search → MARKET TICKER (NEW) → Election Map
//   CHAPTER 2 (Cream): Features → How It Works → AI Report → Social Proof
//   CHAPTER 3 (Dark):  Benchmark Teaser → Final CTA
// =============================================================================

import { HeroSection } from '@/components/homepage/HeroSection';
import { MarketTicker } from '@/components/homepage/MarketTicker';
import { ElectionMapTeaser } from '@/components/homepage/ElectionMapTeaser';
import { FeatureShowcase } from '@/components/homepage/FeatureShowcase';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import { BenchmarkTeaser } from '@/components/homepage/BenchmarkTeaser';
import { ReportProduct } from '@/components/homepage/ReportProduct';
import { SocialProof } from '@/components/homepage/SocialProof';
import { FinalCTA } from '@/components/homepage/FinalCTA';

function GoldSeparator() {
  return (
    <div className="mx-auto max-w-[1100px] px-6" style={{ background: '#F5F0E6' }} aria-hidden="true">
      <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 20%, rgba(201,168,76,0.25) 50%, rgba(201,168,76,0.15) 80%, transparent 100%)' }} />
    </div>
  );
}

function DarkGoldSeparator() {
  return (
    <div className="mx-auto max-w-[1000px] px-6" aria-hidden="true">
      <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.2) 20%, rgba(201,168,76,0.35) 50%, rgba(201,168,76,0.2) 80%, transparent 100%)' }} />
    </div>
  );
}

// Scrim: Dark → Golden Cream (#F5F0E6)
function DarkToLightTransition() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: '100px', background: '#F5F0E6' }} aria-hidden="true">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(to bottom,
          rgba(12,31,23,1) 0%, rgba(12,31,23,0.987) 8.1%, rgba(12,31,23,0.951) 15.5%,
          rgba(12,31,23,0.896) 22.5%, rgba(12,31,23,0.825) 29%, rgba(12,31,23,0.741) 35.3%,
          rgba(12,31,23,0.648) 41.2%, rgba(12,31,23,0.55) 47.1%, rgba(12,31,23,0.45) 52.9%,
          rgba(12,31,23,0.352) 58.8%, rgba(12,31,23,0.259) 64.7%, rgba(12,31,23,0.175) 71%,
          rgba(12,31,23,0.104) 77.5%, rgba(12,31,23,0.049) 84.5%, rgba(12,31,23,0.013) 91.9%,
          rgba(12,31,23,0) 100%)`,
      }} />
      <div className="absolute left-0 right-0 z-10" style={{ top: '50%', height: '1px', background: 'linear-gradient(90deg, transparent 8%, rgba(201,168,76,0.3) 25%, rgba(201,168,76,0.5) 50%, rgba(201,168,76,0.3) 75%, transparent 92%)' }} />
    </div>
  );
}

// Scrim: Golden Cream (#F5F0E6) → Dark
function LightToDarkTransition() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: '100px', background: '#0C1F17' }} aria-hidden="true">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(to bottom,
          rgba(245,240,230,1) 0%, rgba(245,240,230,0.987) 8.1%, rgba(245,240,230,0.951) 15.5%,
          rgba(245,240,230,0.896) 22.5%, rgba(245,240,230,0.825) 29%, rgba(245,240,230,0.741) 35.3%,
          rgba(245,240,230,0.648) 41.2%, rgba(245,240,230,0.55) 47.1%, rgba(245,240,230,0.45) 52.9%,
          rgba(245,240,230,0.352) 58.8%, rgba(245,240,230,0.259) 64.7%, rgba(245,240,230,0.175) 71%,
          rgba(245,240,230,0.104) 77.5%, rgba(245,240,230,0.049) 84.5%, rgba(245,240,230,0.013) 91.9%,
          rgba(245,240,230,0) 100%)`,
      }} />
      <div className="absolute left-0 right-0 z-10" style={{ top: '50%', height: '1px', background: 'linear-gradient(90deg, transparent 8%, rgba(201,168,76,0.3) 25%, rgba(201,168,76,0.5) 50%, rgba(201,168,76,0.3) 75%, transparent 92%)' }} />
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* CHAPTER 1 — DARK: Hero → Market Ticker → Election Map */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <HeroSection />
        <DarkGoldSeparator />
        <MarketTicker />
        <DarkGoldSeparator />
        <ElectionMapTeaser />
      </div>

      <DarkToLightTransition />

      {/* CHAPTER 2 — UNIFIED GOLDEN CREAM: Features + How It Works + Report + Trust */}
      <div data-nav-theme="light" style={{ background: '#F5F0E6' }}>
        <FeatureShowcase />
        <GoldSeparator />
        <HowItWorks />
        <GoldSeparator />
        <ReportProduct />
        <GoldSeparator />
        <SocialProof />
      </div>

      <LightToDarkTransition />

      {/* CHAPTER 3 — DARK: Benchmark + Final CTA */}
      <div data-nav-theme="dark" className="bg-harvest-forest-950">
        <BenchmarkTeaser />
        <DarkGoldSeparator />
        <FinalCTA />
      </div>
    </>
  );
}
