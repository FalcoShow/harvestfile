import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'USDA Program Navigator — Find Every Program You Qualify For | HarvestFile',
  description:
    'Answer 8 simple questions and instantly discover which USDA programs your farm qualifies for. Covers 43+ programs across FSA, NRCS, and Rural Development. Free, no signup required.',
  openGraph: {
    title: 'USDA Program Navigator — Find Every Program You Qualify For',
    description:
      'Answer 8 simple questions and instantly discover which USDA programs your farm qualifies for. 43+ programs scanned. Free.',
    url: 'https://www.harvestfile.com/navigator',
    siteName: 'HarvestFile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'USDA Program Navigator — Find Every Program You Qualify For',
    description:
      'Answer 8 simple questions and instantly discover which USDA programs your farm qualifies for. 43+ programs. Free.',
  },
};

export default function NavigatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
