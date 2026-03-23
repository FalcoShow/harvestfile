// =============================================================================
// HarvestFile — Phase 26 Build 4: Morning Farm Dashboard
// app/(marketing)/morning/layout.tsx
//
// SEO metadata for the free public morning briefing — tool #11.
// "The farmer's Bloomberg Terminal" — one page, every morning.
// =============================================================================

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Morning Farm Dashboard — Weather, Markets & Spray Conditions | HarvestFile",
  description:
    "Free daily farm briefing: local weather, soil temps, commodity futures with ARC/PLC payment impact, spray window conditions, and USDA report calendar — all on one page. Updated by 5 AM CT.",
  keywords: [
    "morning farm dashboard",
    "daily farm briefing",
    "farm weather today",
    "commodity prices today",
    "spray conditions today",
    "agricultural morning report",
    "farmer daily dashboard",
    "farm market update",
    "USDA report calendar",
    "ARC PLC payment tracker",
    "growing degree days",
    "soil temperature today",
  ],
  openGraph: {
    title: "Morning Farm Dashboard — Your Daily Briefing | HarvestFile",
    description:
      "Weather, markets, spray conditions, and USDA calendar — everything a farmer needs every morning, on one free page.",
    url: "https://harvestfile.com/morning",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Morning Farm Dashboard — Your Daily Briefing",
    description:
      "The farmer's Bloomberg Terminal. Weather + markets + spray + USDA calendar on one free page.",
  },
  alternates: {
    canonical: "https://harvestfile.com/morning",
  },
};

export default function MorningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
