// =============================================================================
// app/(marketing)/farm-score/layout.tsx
// HarvestFile — Phase 27 Build 3: Farm Score SEO Metadata
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farm Score — Free Farm Financial Health Rating 0–850 | HarvestFile',
  description:
    'Get your free Farm Score — a 0–850 financial health rating for your farm based on FFSC standards used by every major ag lender. See how your liquidity, solvency, profitability, repayment capacity, and efficiency compare to USDA benchmarks. No account required.',
  keywords: [
    'farm score',
    'farm financial health',
    'farm financial analysis',
    'FFSC ratios',
    'farm financial ratios',
    'farm solvency',
    'farm profitability',
    'debt to asset ratio farm',
    'current ratio farm',
    'farm benchmarking',
    'farm credit score',
    'farm financial planning',
    'agricultural financial health',
    'farm health check',
    'farm financial calculator',
    'operating expense ratio farm',
    'term debt coverage ratio',
    'farm financial standards council',
  ],
  openGraph: {
    title: 'Farm Score — What\'s Your Farm\'s Financial Health Rating?',
    description:
      'Free 0–850 Farm Score based on the same FFSC standards used by Farm Credit, USDA, and every major ag lender. Five sub-scores, peer benchmarking, actionable recommendations. No account required.',
    url: 'https://harvestfile.com/farm-score',
    siteName: 'HarvestFile',
    type: 'website',
    images: [
      {
        url: '/og-farm-score.png',
        width: 1200,
        height: 630,
        alt: 'HarvestFile Farm Score — 0 to 850 Financial Health Rating',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farm Score — What\'s Your Farm\'s Financial Health Rating?',
    description:
      'Free 0–850 Farm Score based on FFSC standards. See your liquidity, solvency, profitability, repayment capacity, and efficiency grades. Used by Farm Credit and USDA.',
  },
  alternates: {
    canonical: 'https://harvestfile.com/farm-score',
  },
};

export default function FarmScoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
