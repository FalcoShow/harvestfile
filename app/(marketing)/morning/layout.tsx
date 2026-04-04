// =============================================================================
// app/(marketing)/morning/layout.tsx
// HarvestFile — Surface 2 Deploy 1: Consolidated SEO Metadata
//
// This layout now carries the SEO weight of 5 merged pages:
//   /markets  → commodity futures, grain prices, ARC/PLC payment projections
//   /grain    → grain marketing, Marketing Score, sell signals
//   /weather  → agricultural weather, GDD, soil, planting windows
//   /calendar → USDA report calendar, WASDE dates
//   /spray-window → spray window calculator, wind/temp conditions
//
// All 5 old routes 301-redirect here. The metadata absorbs their keywords
// and descriptions so /morning ranks for all previous queries.
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farm Command Center — Weather, Markets, Grain Bids & ARC/PLC Payments | HarvestFile',
  description:
    'Your daily farm briefing: live commodity futures with ARC/PLC payment projections, agricultural weather with GDD tracking, local grain bids with Marketing Score, USDA report calendar, and spray window conditions. Everything a farmer needs at 5 AM — free, personalized, all in one screen.',
  keywords: [
    // Morning Dashboard (original)
    'farm morning dashboard',
    'daily farm briefing',
    'farm intelligence dashboard',
    // Markets (absorbed from /markets)
    'commodity futures prices',
    'corn futures',
    'soybean futures',
    'wheat futures',
    'agricultural commodity prices',
    'ARC PLC payment projections',
    'grain prices today',
    'OBBBA reference prices',
    // Grain Marketing (absorbed from /grain)
    'grain marketing tool',
    'grain marketing score',
    'when to sell grain',
    'grain position tracker',
    'grain storage calculator',
    'grain basis tracker',
    'should I sell my grain',
    'grain breakeven price',
    // Weather (absorbed from /weather)
    'agricultural weather',
    'farm weather forecast',
    'growing degree days',
    'GDD tracker',
    'soil temperature',
    'planting conditions',
    'frost alert',
    'crop weather',
    'soil moisture',
    // Spray Window (absorbed from /spray-window)
    'spray window calculator',
    'spray conditions',
    'wind speed spraying',
    'temperature inversion',
    // USDA Calendar
    'USDA report calendar',
    'WASDE report dates',
    'crop progress report',
    'USDA acreage report',
  ],
  openGraph: {
    title: 'Farm Command Center — HarvestFile',
    description:
      'Weather, commodity prices, grain bids, ARC/PLC payment estimates, Marketing Score, spray windows, and USDA calendar — everything a farmer needs in one daily briefing. Free, no account required.',
    url: 'https://harvestfile.com/morning',
    siteName: 'HarvestFile',
    type: 'website',
    images: [
      {
        url: 'https://harvestfile.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HarvestFile Farm Command Center — Daily Farm Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farm Command Center — Daily Farm Intelligence | HarvestFile',
    description:
      'Live commodity prices + ARC/PLC projections + ag weather + grain bids + spray windows + USDA calendar. One screen, every morning. Free.',
  },
  alternates: {
    canonical: 'https://harvestfile.com/morning',
  },
};

export default function MorningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
