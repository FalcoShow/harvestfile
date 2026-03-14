// =============================================================================
// HarvestFile — /pricing Layout (SEO Metadata Wrapper)
// Phase 4A: SEO Emergency Fix
// =============================================================================

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Pricing — Free Calculator + Pro Dashboard",
  description:
    "Free ARC/PLC calculator for every farmer. Pro dashboard with saved farm operations, price alerts, AI-powered reports, and multi-year projections. $29/month with 14-day free trial. No credit card required.",
  openGraph: {
    title: "HarvestFile Pricing — Plans for Every Farm",
    description:
      "Free calculator forever. Pro dashboard with 14-day trial. Enterprise plans for Farm Credit lenders and ag consultants.",
    url: "https://harvestfile.com/pricing",
  },
  alternates: {
    canonical: "https://harvestfile.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
