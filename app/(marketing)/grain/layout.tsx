// =============================================================================
// app/(marketing)/grain/layout.tsx
// HarvestFile — Phase 28 Build 1: Grain Marketing Command Center SEO Metadata
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grain Marketing Command Center — Free Position Tracker & Sell Score | HarvestFile',
  description:
    'Free grain marketing tool with a 0–100 Marketing Score telling you if now is the right time to sell. Track grain positions, storage costs, and breakeven prices against live CME futures. Build a marketing plan. No account required.',
  keywords: [
    'grain marketing tool',
    'grain marketing score',
    'when to sell grain',
    'grain position tracker',
    'grain storage calculator',
    'corn marketing plan',
    'soybean marketing plan',
    'wheat marketing plan',
    'grain basis tracker',
    'farm grain inventory',
    'grain selling strategy',
    'scale up selling grain',
    'grain marketing plan builder',
    'commodity marketing',
    'grain elevator bids',
    'grain storage costs',
    'should I sell my grain',
    'grain breakeven price',
    'farm grain management',
    'harvest marketing plan',
  ],
  openGraph: {
    title: 'Grain Marketing Command Center — Should You Sell Now?',
    description:
      'The industry\'s first Marketing Score: a single 0–100 number that tells you if conditions favor selling your stored grain. Free, no account required.',
    url: 'https://harvestfile.com/grain',
    siteName: 'HarvestFile',
    type: 'website',
    images: [
      {
        url: '/og-grain.png',
        width: 1200,
        height: 630,
        alt: 'HarvestFile Grain Marketing Command Center',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grain Marketing Command Center — Should You Sell Now?',
    description:
      'A single score: 0–100. Above 70 = strong sell conditions. Below 40 = consider waiting. Free grain marketing intelligence.',
  },
  alternates: {
    canonical: 'https://harvestfile.com/grain',
  },
};

export default function GrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
