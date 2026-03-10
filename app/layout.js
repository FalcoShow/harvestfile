import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "HarvestFile — ARC/PLC Decision Calculator for Farmers",
  description:
    "Compare ARC-CO and PLC payments for your exact county using live USDA data. Free, private, and covers all 50 states. Updated for 2025 OBBBA rules.",
  keywords: [
    "ARC-CO", "PLC", "USDA", "farm programs", "ARC PLC calculator",
    "farm payment estimator", "USDA NASS", "agriculture risk coverage",
    "price loss coverage", "farm bill 2025",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "HarvestFile — Know Exactly What Your Farm Is Owed",
    description:
      "Free ARC-CO vs PLC payment calculator using live USDA county yield data. Updated for 2025 One Big Beautiful Bill Act.",
    url: "https://harvestfile.com",
    siteName: "HarvestFile",
    type: "website",
    images: [{ url: "https://harvestfile.com/og-image.png", width: 1200, height: 630, alt: "HarvestFile — ARC/PLC Decision Calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HarvestFile — ARC/PLC Decision Calculator",
    description:
      "Compare ARC-CO and PLC payments for your county. Free, private, all 50 states.",
    images: ["https://harvestfile.com/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        style={{
          fontFamily:
            "'Bricolage Grotesque', 'DM Sans', system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
