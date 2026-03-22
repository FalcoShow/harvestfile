// =============================================================================
// app/(marketing)/weather/layout.tsx
// HarvestFile — Phase 26 Build 2: Agricultural Weather Dashboard SEO
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agricultural Weather Dashboard — Free Farm Forecast & GDD Tracker | HarvestFile',
  description:
    'Free agricultural weather dashboard with Growing Degree Day tracking, soil temperature and moisture, 14-day farm forecast, planting window analysis, and frost alerts. GPS-precise data for any field in America.',
  keywords: [
    'agricultural weather',
    'farm weather forecast',
    'growing degree days',
    'GDD tracker',
    'soil temperature',
    'planting conditions',
    'frost alert',
    'farm forecast',
    'crop weather',
    'soil moisture',
    'agricultural forecast',
    'farming weather app',
  ],
  openGraph: {
    title: 'Agricultural Weather Dashboard — Free Farm Forecast & GDD Tracker',
    description:
      'GDD tracking, soil conditions, 14-day ag forecast, planting windows, and frost alerts — all free, GPS-precise, for any field in America.',
    url: 'https://harvestfile.com/weather',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agricultural Weather Dashboard — Free Farm Forecast & GDD Tracker',
    description:
      'GDD tracking, soil conditions, 14-day forecast, planting windows, and frost alerts — free for any field in America.',
  },
  alternates: {
    canonical: 'https://harvestfile.com/weather',
  },
};

export default function WeatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
