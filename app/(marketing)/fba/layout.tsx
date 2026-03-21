// =============================================================================
// HarvestFile — /fba Layout (SEO Metadata)
// Phase 21A: FBA Payment Calculator
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FBA Payment Calculator — Free Farmer Bridge Assistance Estimator | HarvestFile',
  description:
    'Calculate your Farmer Bridge Assistance (FBA) payment instantly. $11 billion in per-acre payments — corn $44.36, soybeans $30.88, wheat $39.35. Free, no signup required. Deadline: April 17, 2026.',
  keywords: [
    'FBA payment calculator',
    'farmer bridge assistance',
    'FBA estimator',
    'USDA bridge payments',
    'FBA per acre rates',
    'farmer bridge assistance program',
    'FBA 2026',
    'USDA farm payments',
  ],
  openGraph: {
    title: 'FBA Payment Calculator — How Much Are You Owed?',
    description:
      '$11 billion in Farmer Bridge Assistance payments. Calculate your estimated payment in 60 seconds — free.',
    url: 'https://www.harvestfile.com/fba',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FBA Payment Calculator — Free Instant Estimate',
    description:
      'Calculate your Farmer Bridge Assistance payment. $11B program, deadline April 17. Free tool by HarvestFile.',
  },
  alternates: {
    canonical: 'https://www.harvestfile.com/fba',
  },
};

export default function FBALayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
