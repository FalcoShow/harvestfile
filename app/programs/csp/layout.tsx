import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "CSP Guide — Conservation Stewardship Program Explained",
  description:
    "Complete guide to CSP (Conservation Stewardship Program). Annual payments for existing conservation, enhancement activities, bundles, contract terms, and how CSP differs from EQIP.",
  keywords: ["CSP", "conservation stewardship program", "CSP payments", "CSP vs EQIP", "CSP enhancements", "NRCS CSP", "CSP contract"],
  alternates: { canonical: "https://harvestfile.com/programs/csp" },
  openGraph: {
    title: "CSP Guide — Conservation Stewardship Program",
    description: "Complete guide to CSP payments, enhancement activities, and how CSP differs from EQIP.",
    url: "https://harvestfile.com/programs/csp",
  },
};

export default function CspLayout({ children }: { children: React.ReactNode }) {
  return children;
}
