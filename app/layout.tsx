import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JsonLd } from "@/components/seo/JsonLd";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { cn } from "@/lib/utils";

// =============================================================================
// HarvestFile — Root Layout
// Build 14: shadcn/ui integration — Geist removed, Bricolage Grotesque primary
// =============================================================================

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://harvestfile.com"),

  title: {
    default:
      "HarvestFile — ARC/PLC Decision Calculator for Farmers | Free, All 50 States",
    template: "%s | HarvestFile",
  },

  description:
    "Compare ARC-CO and PLC payments for your exact county using live USDA data. The only commercial farm program decision platform. Free calculator, all 50 states, updated for 2025 OBBBA farm bill. No registration required.",

  keywords: [
    "ARC PLC calculator",
    "ARC-CO vs PLC",
    "ARC PLC calculator 2026",
    "ARC PLC decision tool",
    "USDA farm programs",
    "farm payment estimator",
    "agriculture risk coverage",
    "price loss coverage",
    "USDA NASS county yields",
    "farm bill 2025 OBBBA",
    "ARC PLC election deadline 2026",
    "farm program optimizer",
    "county ARC PLC comparison",
    "free farm calculator",
    "USDA payment calculator",
  ],

  authors: [{ name: "HarvestFile", url: "https://harvestfile.com" }],
  creator: "HarvestFile",
  publisher: "HarvestFile",

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
      "Free ARC-CO vs PLC payment calculator using live USDA county yield data. The only commercial ARC/PLC decision platform. Updated for 2025 OBBBA farm bill.",
    url: "https://harvestfile.com",
    siteName: "HarvestFile",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://harvestfile.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "HarvestFile — ARC/PLC Decision Calculator for American Farmers",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "HarvestFile — ARC/PLC Decision Calculator",
    description:
      "Compare ARC-CO and PLC payments for your county. Free, private, all 50 states. Updated for 2025 OBBBA.",
    images: ["https://harvestfile.com/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "https://harvestfile.com",
  },

  category: "agriculture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f0d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(bricolage.variable, instrumentSerif.variable, "font-sans")}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <JsonLd />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
