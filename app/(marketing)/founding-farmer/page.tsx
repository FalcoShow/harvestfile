// =============================================================================
// HarvestFile — Phase 32 Build 1: Founding Farmer 500 Landing Page
// Route: /founding-farmer
//
// Premium campaign page with live counter, email capture, referral system,
// tiered rewards, and social proof. Designed to convert at 40%+ using
// Robinhood-style positional waitlist mechanics.
//
// This page must make farmers feel like they're joining something historic.
// =============================================================================

import type { Metadata } from 'next';
import { FoundingFarmerClient } from './founding-farmer-client';

export const metadata: Metadata = {
  title: 'Founding Farmer 500 — Be First. Shape the Future of Farming. | HarvestFile',
  description:
    'Only 500 spots. Join the founding farmers who will shape the most powerful farm decision platform ever built. Lifetime pricing, exclusive access, and your name on the Founders Wall.',
  openGraph: {
    title: 'Founding Farmer 500 — Only 500 Spots Available',
    description:
      'Join the founding farmers shaping the future of agricultural technology. Exclusive lifetime pricing and direct access to the founding team.',
    url: 'https://www.harvestfile.com/founding-farmer',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Founding Farmer 500 — Only 500 Spots',
    description: 'Be one of the first 500 farmers to shape the most powerful farm decision platform ever built.',
  },
  alternates: {
    canonical: 'https://www.harvestfile.com/founding-farmer',
  },
};

export default function FoundingFarmerPage() {
  return <FoundingFarmerClient />;
}
