// =============================================================================
// HarvestFile — JSON-LD Structured Data
// Phase 4A: SEO Emergency Fix → Phase 1 Build 1: Duplicate FAQPage Fix
//
// Provides rich structured data for Google Search:
// - Organization schema (brand identity)
// - WebApplication schema (calculator tool)
//
// IMPORTANT: FAQPage schema was REMOVED from this global component.
// County pages generate their own FAQPage via generateCountyJsonLd() in
// lib/county-data.ts. Having FAQPage here AND on county pages caused
// Google to flag "Duplicate field FAQPage" on all 3,000+ county pages,
// invalidating FAQ rich snippets site-wide.
//
// The FAQ schema now lives ONLY where it belongs:
// - County pages: via generateCountyJsonLd() (county-specific questions)
// - Homepage/check page: can add page-specific FAQ if needed
//
// Usage: Import and add <JsonLd /> to your root layout.
// =============================================================================

export function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HarvestFile',
    url: 'https://harvestfile.com',
    logo: 'https://harvestfile.com/favicon.svg',
    description:
      'The most advanced ARC/PLC decision platform for American farmers. Compare program payments, track USDA prices, and optimize farm program elections using live county-level data.',
    foundingDate: '2025',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@harvestfile.com',
      contactType: 'customer support',
    },
  };

  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'HarvestFile ARC/PLC Calculator',
    url: 'https://harvestfile.com/check',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free ARC-CO vs PLC payment calculator for all 50 states',
    },
    description:
      'Free ARC-CO vs PLC decision calculator using live USDA NASS county yield data. Compare estimated payments for your exact county and crop. Covers all 50 states, updated for 2025 OBBBA farm bill changes.',
    featureList: [
      'ARC-CO vs PLC payment comparison',
      'All 50 US states covered',
      'Live USDA NASS county yield data',
      'Updated for 2025 OBBBA farm bill',
      'Multi-crop analysis (corn, soybeans, wheat, sorghum, barley, oats, rice, peanuts, cotton)',
      'No registration required',
      'Mobile-optimized interface',
      'AI-powered farm program reports',
    ],
    screenshot: 'https://harvestfile.com/og-image.png',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
    </>
  );
}
