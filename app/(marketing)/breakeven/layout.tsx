// =============================================================================
// app/(marketing)/breakeven/layout.tsx
// HarvestFile — Phase 27 Build 1: Breakeven Calculator SEO Metadata
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farm Breakeven Calculator — Free Per-Crop Cost Analysis | HarvestFile',
  description:
    'Free breakeven price calculator for corn, soybeans, wheat, and more. Enter your input costs, see your breakeven price per bushel vs. live CME futures. Know instantly if you\'re profitable — updated daily.',
  keywords: [
    'farm breakeven calculator',
    'breakeven price per bushel',
    'cost of production calculator',
    'farm cost analysis',
    'crop breakeven',
    'corn breakeven price',
    'soybean breakeven price',
    'wheat breakeven price',
    'farm profit calculator',
    'agriculture cost calculator',
    'farm profitability tool',
    'farm financial planning',
    'input cost tracker',
    'cost per acre calculator',
  ],
  openGraph: {
    title: 'Farm Breakeven Calculator — Know Your Numbers Before You Sell',
    description:
      'Free breakeven calculator with live CME futures comparison. Enter costs, see your breakeven price per bushel, know instantly if you\'re profitable. No account required.',
    url: 'https://harvestfile.com/breakeven',
    siteName: 'HarvestFile',
    type: 'website',
    images: [
      {
        url: '/og-breakeven.png',
        width: 1200,
        height: 630,
        alt: 'HarvestFile Breakeven Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farm Breakeven Calculator — Know Your Numbers Before You Sell',
    description:
      'Enter your input costs, see breakeven per bushel vs. live futures. Green = profitable. Red = underwater. Free, no account required.',
  },
  alternates: {
    canonical: 'https://harvestfile.com/breakeven',
  },
};

export default function BreakevenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
