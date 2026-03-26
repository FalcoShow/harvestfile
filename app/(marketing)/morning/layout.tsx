// =============================================================================
// app/(marketing)/morning/layout.tsx
// HarvestFile — Consolidation Phase 2 Build 1: Morning Dashboard Layout
//
// SEO metadata + wrapper for the daily engagement dashboard.
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Morning Dashboard — HarvestFile | Weather, Prices & Farm Intelligence',
  description:
    'Your daily farm briefing: commodity prices with ARC/PLC payment impact, agricultural weather, USDA report calendar, and crop condition alerts. The only dashboard built for the 5 AM coffee check.',
  openGraph: {
    title: 'Morning Dashboard — HarvestFile',
    description:
      'Weather, prices, and payment projections — everything a farmer needs at 5 AM. Free, no account required.',
    type: 'website',
  },
};

export default function MorningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
