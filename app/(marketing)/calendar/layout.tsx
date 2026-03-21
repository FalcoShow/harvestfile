// =============================================================================
// HarvestFile — /calendar Layout (SEO Metadata)
// Phase 21C: Policy Paycheck Calendar — When Every USDA Payment Hits Your Account
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'USDA Payment Calendar 2026–2027 — When Every Farm Payment Hits Your Account | HarvestFile',
  description:
    'See exactly when every USDA payment arrives — ARC-CO, PLC, CRP, EQIP, SDRP, FBA, DMC, crop insurance indemnities, and more. Enrollment deadlines, payment windows, and countdown timers. Free, no signup required.',
  keywords: [
    'USDA payment calendar',
    'USDA payment schedule 2026',
    'when do ARC PLC payments come',
    'ARC-CO payment date',
    'PLC payment date',
    'CRP payment schedule',
    'EQIP payment timeline',
    'SDRP payment date',
    'FBA payment date',
    'DMC payment schedule',
    'farm payment calendar',
    'USDA enrollment deadlines',
    'crop insurance indemnity timeline',
    'farm program deadlines 2026',
    'USDA program dates',
    'farm payment tracker',
  ],
  openGraph: {
    title: 'USDA Payment Calendar — Every Farm Payment Date in One Place',
    description:
      'Stop guessing when your money arrives. ARC, PLC, CRP, EQIP, SDRP, FBA, DMC, crop insurance — every payment date and enrollment deadline through 2027. Free.',
    url: 'https://www.harvestfile.com/calendar',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'USDA Payment Calendar 2026–2027 — Free',
    description:
      'Every USDA payment date and enrollment deadline in one visual calendar. ARC, PLC, CRP, SDRP, FBA, and more. Free tool by HarvestFile.',
  },
  alternates: {
    canonical: 'https://www.harvestfile.com/calendar',
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
