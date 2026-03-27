// =============================================================================
// HarvestFile — Dynamic robots.ts
// Build 6 Deploy 1: Added missing sitemap/3.xml (was only listing 3 of 4)
//
// All 4 segment sitemaps are now listed:
//   0 = Core pages (tools, programs, auth, legal)
//   1 = State hub pages (/{state}/arc-plc)
//   2 = County pages batch 1 (paginated ~2,000 per segment)
//   3 = County pages batch 2 (remaining counties)
//
// Verify at: https://harvestfile.com/robots.txt
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
        // Block AI training crawlers from scraping proprietary USDA data
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
      `${baseUrl}/sitemap/0.xml`,
      `${baseUrl}/sitemap/1.xml`,
      `${baseUrl}/sitemap/2.xml`,
      `${baseUrl}/sitemap/3.xml`,
    ],
  };
}
