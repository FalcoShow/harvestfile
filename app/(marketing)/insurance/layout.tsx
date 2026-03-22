// =============================================================================
// HarvestFile — Phase 24A: Free Public Insurance Calculator Layout
// app/(marketing)/insurance/layout.tsx
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crop Insurance Calculator 2026 — SCO + ECO + ARC/PLC Stacking | HarvestFile',
  description:
    'Free crop insurance optimizer for 2026. Compare RP + SCO + ECO coverage stacks with ARC-CO and PLC elections. 10,000 Monte Carlo simulations with real USDA actuarial data. OBBBA 80% subsidies built in.',
  keywords: [
    'crop insurance calculator 2026',
    'SCO ECO calculator',
    'crop insurance premium estimator',
    'ARC PLC crop insurance',
    'OBBBA crop insurance changes',
    'SCO premium calculator',
    'ECO premium calculator',
    'farm safety net optimizer',
    'Revenue Protection calculator',
    'crop insurance stacking',
  ],
  openGraph: {
    title: 'Crop Insurance Calculator 2026 — Free SCO + ECO Optimizer',
    description:
      'The first tool that shows your complete farm safety net: RP + SCO + ECO + ARC/PLC in one view. 10,000 Monte Carlo simulations. Free, no signup.',
    url: 'https://www.harvestfile.com/insurance',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crop Insurance Calculator 2026 | HarvestFile',
    description:
      'Free crop insurance stacking optimizer. Compare SCO + ECO strategies with ARC-CO and PLC. Real USDA data.',
  },
  alternates: {
    canonical: 'https://www.harvestfile.com/insurance',
  },
};

export default function InsuranceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
