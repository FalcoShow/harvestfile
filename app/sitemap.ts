// =============================================================================
// HarvestFile — Dynamic Sitemap Generator
// Phase 24A Build 2: Added /insurance to core pages (7 free tools)
//
// Next.js App Router automatically serves this at /sitemap.xml
// Now generates ~2,500+ URLs for county SEO pages + election map + OBBBA
// =============================================================================

import { MetadataRoute } from 'next';
import { supabasePublic } from '@/lib/supabase/public';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      url: `${baseUrl}/insurance`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/fba`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/sdrp`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/calendar`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/optimize`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/payments`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/elections`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/obbba`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
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

  // ── USDA program guide pages ──────────────────────────────────────────
  const programPages: MetadataRoute.Sitemap = [
    'arc-co', 'plc', 'eqip', 'crp', 'csp',
  ].map((program) => ({
    url: `${baseUrl}/programs/${program}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // ── OBBBA content cluster pages ───────────────────────────────────────
  const obbbaPages: MetadataRoute.Sitemap = [
    'new-base-acres', 'arc-sco-stacking',
  ].map((slug) => ({
    url: `${baseUrl}/obbba/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // ── Auth pages ────────────────────────────────────────────────────────
  const authPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // ── Legal pages ───────────────────────────────────────────────────────
  const legalPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // ── State hub pages (high priority — hub in hub-and-spoke) ────────────
  let statePages: MetadataRoute.Sitemap = [];
  try {
    const { data: states } = await supabasePublic
      .from('states')
      .select('slug')
      .gt('county_count', 0);

    if (states) {
      statePages = states.map((s) => ({
        url: `${baseUrl}/${s.slug}/arc-plc`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      }));
    }
  } catch (err) {
    console.error('Sitemap: Failed to fetch states:', err);
  }

  // ── County pages (the 2,000+ SEO pages) ───────────────────────────────
  let countyPages: MetadataRoute.Sitemap = [];
  try {
    // Fetch all counties with their state slug via a join
    // Supabase JS client limits to 1000 rows, so we paginate
    let allCounties: { slug: string; states: { slug: string } }[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabasePublic
        .from('counties')
        .select('slug, states!inner(slug)')
        .eq('has_arc_plc_data', true)
        .range(offset, offset + pageSize - 1);

      if (data && data.length > 0) {
        allCounties = allCounties.concat(data as any);
        offset += pageSize;
        if (data.length < pageSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    countyPages = allCounties.map((c: any) => ({
      url: `${baseUrl}/${c.states.slug}/${c.slug}/arc-plc`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (err) {
    console.error('Sitemap: Failed to fetch counties:', err);
  }

  return [
    ...corePages,
    ...programPages,
    ...obbbaPages,
    ...statePages,
    ...countyPages,
    ...authPages,
    ...legalPages,
  ];
}
