// =============================================================================
// HarvestFile — /optimize Layout (SEO Metadata)
// Phase 22: OBBBA Election Optimizer — Monte Carlo ARC/PLC Decision Engine
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    '2026 ARC vs PLC Optimizer — Monte Carlo Election Decision Tool | HarvestFile',
  description:
    'The only ARC/PLC optimizer powered by Monte Carlo simulation. 1,000 probabilistic scenarios tell you exactly whether ARC-CO or PLC pays more for your county and crop under OBBBA. Free, instant, no signup.',
  keywords: [
    'ARC vs PLC 2026',
    'ARC-CO or PLC calculator',
    'OBBBA ARC PLC decision',
    'ARC PLC election 2026',
    'ARC-CO vs PLC optimizer',
    'farm program election tool',
    'Monte Carlo farm program',
    'ARC PLC payment projections',
    'USDA ARC PLC calculator 2026',
    'which is better ARC or PLC',
    'ARC-CO payment estimate',
    'PLC payment estimate 2026',
    'farm bill election optimizer',
    'OBBBA election tool',
    'ARC PLC county comparison',
    'farm program optimization',
  ],
  openGraph: {
    title: '2026 ARC vs PLC Optimizer — Which Program Pays You More?',
    description:
      'Stop guessing. 1,000 Monte Carlo simulations analyze your county\'s data to recommend ARC-CO or PLC with a confidence score. The only probabilistic farm program optimizer. Free.',
    url: 'https://www.harvestfile.com/optimize',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2026 ARC vs PLC Optimizer — Monte Carlo Decision Engine',
    description:
      'Which USDA program pays you more? 1,000 simulations, your county\'s real data, one clear answer. Free tool by HarvestFile.',
  },
  alternates: {
    canonical: 'https://www.harvestfile.com/optimize',
  },
};

export default function OptimizeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
