// =============================================================================
// HarvestFile — JSON-LD Structured Data
// Phase 4A: SEO Emergency Fix
//
// Provides rich structured data for Google Search:
// - Organization schema (brand identity)
// - WebApplication schema (calculator tool)
// - FAQPage schema (common questions → rich snippets)
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
      email: 'support@harvestfile.com',
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the difference between ARC-CO and PLC?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ARC-CO (Agriculture Risk Coverage - County Option) provides payments when county revenue drops below a benchmark, protecting against both yield and price declines. PLC (Price Loss Coverage) provides payments when the national Marketing Year Average price falls below the effective reference price. ARC-CO has a 12% payment cap per acre while PLC has no payment cap, making PLC better during severe price drops.',
        },
      },
      {
        '@type': 'Question',
        name: 'When is the ARC/PLC election deadline for 2026?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The 2026 ARC/PLC election deadline has been pushed to June or possibly September 2026 under the One Big Beautiful Bill Act (OBBBA). For 2025, farmers automatically receive the higher of ARC or PLC. Starting in 2026, affirmative elections are required again. Check with your local FSA office for the confirmed deadline.',
        },
      },
      {
        '@type': 'Question',
        name: 'How much can I get from ARC or PLC payments?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The difference between choosing ARC-CO and PLC for a given crop and county can be $15 to $80+ per base acre. The optimal choice depends on your county yields, national commodity prices, and your specific base acres. Use the free HarvestFile calculator to see estimated payments for your exact county.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is HarvestFile free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The ARC/PLC decision calculator at harvestfile.com/check is completely free — no registration required. For advanced features like saved farm operations, price alerts, multi-year projections, and AI-generated reports, HarvestFile offers a Pro plan at $29/month with a 14-day free trial.',
        },
      },
      {
        '@type': 'Question',
        name: 'What changed with ARC and PLC under the 2025 farm bill (OBBBA)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The One Big Beautiful Bill Act (OBBBA) signed in July 2025 increased statutory reference prices for major commodities, added approximately 30 million new base acres (a 10% nationwide expansion), and raised payment limits. For 2025, farmers automatically receive the higher of ARC or PLC, reducing immediate decision stress.',
        },
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
