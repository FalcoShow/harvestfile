import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "EQIP Guide — Environmental Quality Incentives Program Explained",
  description:
    "Complete guide to EQIP. Cost-share rates, eligible conservation practices, application ranking, payment schedules, and income limits. How EQIP works with other USDA programs.",
  keywords: ["EQIP", "environmental quality incentives program", "EQIP cost share", "EQIP application", "EQIP eligibility", "NRCS EQIP", "EQIP payment rates"],
  alternates: { canonical: "https://harvestfile.com/programs/eqip" },
  openGraph: {
    title: "EQIP Guide — Environmental Quality Incentives Program",
    description: "Complete guide to EQIP cost-share, eligible practices, and how to apply.",
    url: "https://harvestfile.com/programs/eqip",
  },
};

export default function EqipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
