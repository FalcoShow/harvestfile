// =============================================================================
// HarvestFile — /check Layout (SEO Metadata Wrapper)
// Phase 4A: SEO Emergency Fix
//
// The /check page (ARC/PLC calculator) is "use client" so it can't export
// metadata directly. This layout provides the page-level SEO tags.
// This is HarvestFile's #1 SEO page — optimize aggressively.
// =============================================================================

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Free ARC/PLC Calculator — Compare Payments for Your County",
  description:
    "Calculate ARC-CO vs PLC payments for your exact county and crop. Uses live USDA NASS data. Covers all 50 states, 3,000+ counties. No registration required. Updated for 2025 OBBBA farm bill.",
  keywords: [
    "ARC PLC calculator",
    "ARC PLC calculator 2026",
    "ARC-CO vs PLC",
    "ARC vs PLC which is better",
    "farm payment calculator",
    "USDA payment estimator",
    "county yield data",
    "agriculture risk coverage calculator",
    "price loss coverage calculator",
    "farm bill calculator 2025",
    "ARC PLC decision tool free",
    "USDA farm program comparison",
  ],
  openGraph: {
    title: "Free ARC/PLC Calculator — See What Your Farm Is Owed",
    description:
      "Compare ARC-CO and PLC estimated payments for your county. Live USDA data, all 50 states, no registration required.",
    url: "https://harvestfile.com/check",
    images: [
      {
        url: "https://harvestfile.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "HarvestFile ARC/PLC Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free ARC/PLC Calculator — Compare Payments for Your County",
    description:
      "Calculate ARC-CO vs PLC payments for your exact county. Live USDA data, all 50 states.",
  },
  alternates: {
    canonical: "https://harvestfile.com/check",
  },
};

export default function CheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
