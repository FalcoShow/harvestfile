import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "PLC Guide — Price Loss Coverage Program Explained",
  description:
    "Complete guide to PLC (Price Loss Coverage). How payments are calculated, effective reference prices, payment yields, no payment cap advantage, and when PLC beats ARC-CO. Updated for 2025 OBBBA.",
  keywords: ["PLC", "price loss coverage", "PLC explained", "PLC vs ARC-CO", "PLC payment calculation", "effective reference price", "PLC payment yield"],
  alternates: { canonical: "https://harvestfile.com/programs/plc" },
  openGraph: {
    title: "PLC Guide — How Price Loss Coverage Works",
    description: "Complete guide to PLC payments, reference prices, and when to choose PLC over ARC-CO.",
    url: "https://harvestfile.com/programs/plc",
  },
};

export default function PlcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
