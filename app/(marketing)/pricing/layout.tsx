// =============================================================================
// HarvestFile — /pricing Layout (SEO Metadata)
// Phase 11 Build 2: Updated for 4-tier pricing
// =============================================================================

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Plans from $29/mo + Free Calculator | HarvestFile",
  description:
    "Free ARC/PLC calculator for every farmer. Starter plans from $29/month, Pro at $59/month with unlimited reports and scenario modeling. 14-day free trial, no credit card required.",
  openGraph: {
    title: "HarvestFile Pricing — Plans for Every Farm",
    description:
      "Free calculator forever. Pro dashboard starting at $29/mo with 14-day trial. Team and Enterprise plans for ag consultants and Farm Credit lenders.",
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
