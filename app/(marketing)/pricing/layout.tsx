// =============================================================================
// HarvestFile — /pricing Layout (SEO Metadata)
// Phase 1 Migration (May 16, 2026): Updated for Sell Score + Founding Farmer
// =============================================================================

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell Score Pricing — $79/yr Founding or $149/yr Standard | HarvestFile",
  description:
    "Daily grain marketing recommendation for row crop farmers. Free ARC/PLC calculator and AI Farm Advisor. Sell Score $149/yr standard, or $79/yr lifetime for the first 500 Founding Farmers.",
  openGraph: {
    title: "HarvestFile Pricing — Sell Score for Row Crop Farmers",
    description:
      "Free ARC/PLC calculator and AI Farm Advisor. Sell Score $149/yr — one number every morning telling you when to price grain. First 500 farmers get lifetime $79/yr Founding pricing.",
    url: "https://www.harvestfile.com/pricing",
  },
  alternates: {
    canonical: "https://www.harvestfile.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
