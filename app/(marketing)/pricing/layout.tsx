// =============================================================================
// HarvestFile — /pricing Layout (SEO Metadata Wrapper)
// Phase 11 Build 1: Updated pricing metadata ($49/mo Pro, $149/mo Team)
// =============================================================================

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Pro Dashboard + Free Calculator | HarvestFile",
  description:
    "Free ARC/PLC calculator for every farmer. Pro dashboard starting at $49/month with saved operations, AI reports, price alerts, and multi-year projections. 14-day free trial, no credit card required.",
  openGraph: {
    title: "HarvestFile Pricing — Plans for Every Farm",
    description:
      "Free calculator forever. Pro dashboard with 14-day trial. Team and Enterprise plans for ag consultants and Farm Credit lenders.",
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
