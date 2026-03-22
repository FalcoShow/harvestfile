// =============================================================================
// app/(marketing)/spray-window/layout.tsx
// HarvestFile — Phase 26 Build 1: Spray Window SEO Metadata
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spray Window Calculator — Free Real-Time Spray Conditions | HarvestFile',
  description:
    'Free spray window calculator with real-time GO/NO-GO ratings. Analyzes wind, temperature, humidity, Delta T, inversion risk, and rain probability for any location in America. Updated every 5 minutes.',
  keywords: [
    'spray window calculator',
    'spray conditions today',
    'when to spray',
    'spray drift risk',
    'Delta T calculator',
    'inversion risk',
    'spray weather',
    'pesticide spray conditions',
    'herbicide spray window',
    'farm spray forecast',
    'agricultural spray conditions',
    'crop spraying weather',
  ],
  openGraph: {
    title: 'Spray Window Calculator — Free Real-Time Spray Conditions',
    description:
      'GO or NO-GO? Check real-time spray conditions for any location in America. Analyzes 7 weather factors every 5 minutes. Free, no account required.',
    url: 'https://harvestfile.com/spray-window',
    siteName: 'HarvestFile',
    type: 'website',
    images: [
      {
        url: '/og-spray-window.png',
        width: 1200,
        height: 630,
        alt: 'HarvestFile Spray Window Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spray Window Calculator — Free Real-Time Spray Conditions',
    description:
      'GO or NO-GO? Check real-time spray conditions for any location. Wind, Delta T, inversion risk, rain probability — all in one place.',
  },
  alternates: {
    canonical: 'https://harvestfile.com/spray-window',
  },
};

export default function SprayWindowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
