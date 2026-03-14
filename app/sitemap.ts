// =============================================================================
// HarvestFile — Dynamic Sitemap Generator
// Phase 4A: SEO Emergency Fix
// 
// Next.js App Router automatically serves this at /sitemap.xml
// Includes all public marketing pages, program guides, and legal pages
// Dashboard/auth routes are excluded (private)
// =============================================================================

import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://harvestfile.com';
  const now = new Date();

  // ── Core marketing pages (highest priority) ───────────────────────────
  const corePages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/report`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
  ];

  // ── USDA program guide pages (high SEO value — long-tail keywords) ────
  const programPages: MetadataRoute.Sitemap = [
    'arc-co',
    'plc',
    'eqip',
    'crp',
    'csp',
  ].map((program) => ({
    url: `${baseUrl}/programs/${program}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // ── Auth pages (crawlable for sign-up discovery) ──────────────────────
  const authPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // ── Legal pages ───────────────────────────────────────────────────────
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  return [...corePages, ...programPages, ...authPages, ...legalPages];
}
