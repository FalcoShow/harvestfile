import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "CRP Guide — Conservation Reserve Program Explained",
  description:
    "Complete guide to CRP (Conservation Reserve Program). General vs continuous signup, rental rates, EBI scoring, CRP Grasslands, CLEAR30, and how CRP interacts with ARC/PLC eligibility.",
  keywords: ["CRP", "conservation reserve program", "CRP signup", "CRP rental rates", "CRP eligibility", "CRP continuous signup", "CRP grasslands", "CLEAR30"],
  alternates: { canonical: "https://harvestfile.com/programs/crp" },
  openGraph: {
    title: "CRP Guide — Conservation Reserve Program Explained",
    description: "Complete guide to CRP signup types, rental rates, and how CRP affects ARC/PLC eligibility.",
    url: "https://harvestfile.com/programs/crp",
  },
};

export default function CrpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
