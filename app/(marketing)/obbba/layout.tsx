// =============================================================================
// HarvestFile — /obbba Layout (SEO Metadata + Article Schema)
// Phase 8C Build 4A: OBBBA Pillar Content Page
//
// Comprehensive SEO: metadata, OG, Twitter, canonical, Article schema,
// BreadcrumbList schema. Updated for OBBBA (Pub. L. 119-21).
// =============================================================================

import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "OBBBA ARC/PLC Changes 2026 — Everything Farmers Need to Know | HarvestFile",
  description:
    "Complete guide to ARC-CO and PLC changes under the One Big Beautiful Bill Act (OBBBA). New 90% ARC guarantee, higher reference prices, 30 million new base acres, ARC+SCO stacking, $155K payment limits. Updated March 2026.",
  keywords: [
    "OBBBA",
    "One Big Beautiful Bill Act",
    "ARC PLC changes 2026",
    "ARC-CO 90 percent guarantee",
    "PLC reference prices 2026",
    "new base acres",
    "ARC SCO stacking",
    "farm bill 2025",
    "USDA farm programs 2026",
    "ARC vs PLC 2026",
    "ARC PLC election deadline 2026",
    "OBBBA farm bill changes",
    "farm safety net 2026",
    "payment limits 155000",
  ],
  openGraph: {
    title: "OBBBA ARC/PLC Changes — Complete 2026 Farmer's Guide",
    description:
      "Everything that changed for ARC-CO and PLC under the One Big Beautiful Bill Act. 90% ARC guarantee, higher reference prices, 30M new base acres, and more.",
    url: "https://harvestfile.com/obbba",
    type: "article",
    images: [
      {
        url: "https://harvestfile.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "OBBBA ARC/PLC Changes Guide — HarvestFile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBBBA ARC/PLC Changes — Complete 2026 Farmer's Guide",
    description:
      "Everything that changed for ARC-CO and PLC under the One Big Beautiful Bill Act. Updated for 2026.",
  },
  alternates: {
    canonical: "https://harvestfile.com/obbba",
  },
};

export default function ObbbaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Article schema for the pillar page
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "OBBBA ARC/PLC Changes 2026: Everything Farmers Need to Know",
    description:
      "Complete guide to ARC-CO and PLC program changes under the One Big Beautiful Bill Act (OBBBA). Covers the 90% ARC guarantee, updated PLC reference prices, 30 million new base acres, ARC+SCO stacking, and raised payment limits.",
    datePublished: "2026-03-16T00:00:00Z",
    dateModified: "2026-03-16T00:00:00Z",
    author: {
      "@type": "Organization",
      name: "HarvestFile",
      url: "https://harvestfile.com",
    },
    publisher: {
      "@type": "Organization",
      name: "HarvestFile",
      url: "https://harvestfile.com",
      logo: {
        "@type": "ImageObject",
        url: "https://harvestfile.com/icon.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://harvestfile.com/obbba",
    },
    about: [
      { "@type": "Thing", name: "Agriculture Risk Coverage" },
      { "@type": "Thing", name: "Price Loss Coverage" },
      { "@type": "Thing", name: "One Big Beautiful Bill Act" },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://harvestfile.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "OBBBA Guide",
        item: "https://harvestfile.com/obbba",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      {children}
    </>
  );
}
