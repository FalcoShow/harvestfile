// =============================================================================
// HarvestFile — Phase 26 Build 3: Public Commodity Markets Dashboard
// app/(marketing)/markets/layout.tsx
//
// SEO metadata for the free public commodity futures + ARC/PLC payment tool.
// This is free tool #10 on the platform.
// =============================================================================

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Agricultural Commodity Prices & ARC/PLC Payment Impact | HarvestFile",
  description:
    "Free real-time agricultural commodity futures with ARC/PLC payment projections. See corn, soybeans, wheat, oats & rice settlement prices connected to USDA program payments. Updated daily.",
  keywords: [
    "commodity futures prices",
    "corn futures",
    "soybean futures",
    "wheat futures",
    "agricultural commodity prices",
    "ARC PLC payment projections",
    "USDA farm program payments",
    "grain prices today",
    "farm commodity markets",
    "OBBBA reference prices",
    "PLC payment calculator",
    "marketing year average",
  ],
  openGraph: {
    title: "Live Ag Commodity Prices + ARC/PLC Payment Impact | HarvestFile",
    description:
      "The only free tool that connects commodity futures to USDA ARC/PLC payment projections. See what today's prices mean for your farm payments.",
    url: "https://harvestfile.com/markets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Ag Commodity Prices + ARC/PLC Payment Impact",
    description:
      "Free commodity futures dashboard with real-time ARC/PLC payment projections. No competitor offers this.",
  },
  alternates: {
    canonical: "https://harvestfile.com/markets",
  },
};

export default function MarketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
