// =============================================================================
// HarvestFile — Consolidation Phase 1, Build 1: Dynamic robots.ts
//
// REPLACES: public/robots.txt (DELETE that file after adding this one)
//
// Why dynamic robots.ts instead of static robots.txt:
// 1. Next.js App Router's app/robots.ts takes precedence over public/robots.txt
// 2. We reference the working sitemap segment URLs directly
// 3. The sitemap index at /sitemap.xml was returning 404 — these segments work
// 4. We can programmatically generate sitemap references as segments grow
//
// After deploying: verify at https://harvestfile.com/robots.txt
// =============================================================================

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://harvestfile.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/auth/callback',
          '/auth/confirm',
          '/_next/',
          '/founding-farmer',
        ],
      },
      {
        // Block AI training crawlers from scraping our proprietary USDA data
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'CCBot',
          'anthropic-ai',
          'ClaudeBot',
        ],
        disallow: ['/'],
      },
    ],
    sitemap: [
      // Reference each working sitemap segment directly
      // Segment 0 = Core pages (tools, programs, auth, legal)
      `${baseUrl}/sitemap/0.xml`,
      // Segment 1 = State hub pages (/{state}/arc-plc)
      `${baseUrl}/sitemap/1.xml`,
      // Segment 2+ = County pages (paginated in batches of 2,000)
      `${baseUrl}/sitemap/2.xml`,
      // Add more segments here if county count exceeds 4,000
      // `${baseUrl}/sitemap/3.xml`,
    ],
  };
}
