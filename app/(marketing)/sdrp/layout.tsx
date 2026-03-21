// =============================================================================
// HarvestFile — /sdrp Layout (SEO Metadata)
// Phase 21B: SDRP Eligibility Checker & Payment Estimator
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SDRP Eligibility Checker — Free Disaster Payment Estimator | HarvestFile',
  description:
    'Check your SDRP eligibility and estimate your disaster payment instantly. $16 billion Supplemental Disaster Relief Program — Stage 1 & Stage 2 for 2023–2024 crop losses. Free, no signup required. Deadline: April 30, 2026.',
  keywords: [
    'SDRP eligibility checker',
    'SDRP calculator',
    'supplemental disaster relief program',
    'SDRP payment estimator',
    'SDRP stage 1',
    'SDRP stage 2',
    'USDA disaster relief',
    'crop loss disaster payment',
    'SDRP 2026',
    'SDRP shallow loss',
    'SDRP drought eligibility',
    'farm disaster assistance',
  ],
  openGraph: {
    title: 'SDRP Eligibility Checker — Are You Leaving Disaster Money on the Table?',
    description:
      '$16 billion in Supplemental Disaster Relief. Check your eligibility for 2023–2024 crop losses in 60 seconds — free.',
    url: 'https://www.harvestfile.com/sdrp',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SDRP Eligibility Checker — Free Instant Estimate',
    description:
      'Check your Supplemental Disaster Relief eligibility. $16B program, deadline April 30. Free tool by HarvestFile.',
  },
  alternates: {
    canonical: 'https://www.harvestfile.com/sdrp',
  },
};

export default function SDRPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
