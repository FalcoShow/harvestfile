// =============================================================================
// HarvestFile — Dynamic robots.ts
// Build 17 Deploy 6: Sitemap fix for Google Search Console
//
// KEY CHANGE: Points to single /sitemap.xml index instead of individual
// /sitemap/0.xml, /sitemap/1.xml etc. Next.js 14.2's generateSitemaps()
// automatically creates a sitemap index at /sitemap.xml that references
// all child sitemaps. Google should discover the children through the index.
//
// Previous approach (4 individual sitemaps) caused "Couldn't fetch" errors
// in GSC because the non-standard /sitemap/ path format triggered caching
// issues and the middleware was intercepting requests.
//
// Segments:
//   0 = Core pages (tools, programs, auth, legal)
//   1 = State hub pages (/{state}/arc-plc)
//   2+ = County pages (paginated in batches of 2,000)
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
    // Single sitemap index URL — Next.js auto-generates this from generateSitemaps()
    // This replaces the previous 4 individual sitemap URLs that caused GSC errors
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
