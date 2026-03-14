import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "ARC-CO Guide — Agriculture Risk Coverage County Option Explained",
  description:
    "Complete guide to ARC-CO (Agriculture Risk Coverage - County Option). How payments are calculated, benchmark yields, the 12% revenue cap, and when ARC-CO beats PLC for your farm. Updated for 2025 OBBBA.",
  keywords: ["ARC-CO", "agriculture risk coverage", "ARC-CO explained", "ARC-CO vs PLC", "ARC county option", "ARC-CO payment calculation", "ARC benchmark yield"],
  alternates: { canonical: "https://harvestfile.com/programs/arc-co" },
  openGraph: {
    title: "ARC-CO Guide — How Agriculture Risk Coverage Works",
    description: "Complete guide to ARC-CO payments, benchmark yields, and when to choose ARC-CO over PLC.",
    url: "https://harvestfile.com/programs/arc-co",
  },
};

export default function ArcCoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
