import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "HarvestFile - ARC/PLC Decision Calculator for Farmers",
  description:
    "Compare ARC-CO and PLC payments for your exact county using live USDA data. Free, private, and covers all 50 states. Updated for 2025 OBBBA rules.",
  keywords: [
    "ARC-CO", "PLC", "USDA", "farm programs", "ARC PLC calculator",
    "farm payment estimator", "USDA NASS", "agriculture risk coverage",
    "price loss coverage", "farm bill 2025",
  ],
  openGraph: {
    title: "HarvestFile - Know Exactly What Your Farm Is Owed",
    description:
      "Free ARC-CO vs PLC payment calculator using live USDA county yield data. Updated for 2025 One Big Beautiful Bill Act.",
    url: "https://harvestfile.com",
    siteName: "HarvestFile",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HarvestFile - ARC/PLC Decision Calculator",
    description:
      "Compare ARC-CO and PLC payments for your county. Free, private, all 50 states.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif" }}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
