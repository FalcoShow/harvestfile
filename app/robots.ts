// =============================================================================
// HarvestFile — Dynamic robots.ts
// Deploy 6B-final: FIXED — Allow /_next/static/ for Google page rendering
//
// CRITICAL FIX: Previous version had `disallow: ['/_next/']` which blocked
// CSS stylesheets and font files. Google Search Console reported 2 pages
// "Blocked by robots.txt" — both were /_next/static/ assets (CSS + woff2).
// Without CSS/fonts, Google cannot properly render or evaluate page quality.
//
// Fix: Changed from blanket /_next/ block to specific /_next/image block.
// Static assets (CSS, JS, fonts) at /_next/static/ are now crawlable.
// =============================================================================

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://harvestfile.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/_next/static/'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/auth/callback',
          '/auth/confirm',
          '/_next/image',       // Block image optimization API only
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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
