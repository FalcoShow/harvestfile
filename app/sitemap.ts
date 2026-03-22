// =============================================================================
// HarvestFile — Segmented Sitemap Generator
// Phase 25 Build 2 Part 2: Segmented sitemaps for better GSC monitoring
//
// Next.js 14.2+ supports generateSitemaps() which creates a sitemap index
// at /sitemap.xml pointing to /sitemap/0.xml, /sitemap/1.xml, etc.
//
// Segments:
//   0 = Core pages (tools, programs, OBBBA, auth, legal)
//   1 = State hub pages (/{state}/arc-plc)
//   2+ = County pages (paginated in batches of 2,000)
//
// Google ignores <priority> and <changefreq> but we keep lastmod accurate.
// =============================================================================

import { MetadataRoute } from 'next';
import { supabasePublic } from '@/lib/supabase/public';

// ── Generate sitemap index entries ──────────────────────────────────────
export async function generateSitemaps() {
  // Count total counties for pagination
  let totalCounties = 0;
  try {
    const { count } = await supabasePublic
      .from('counties')
      .select('*', { count: 'exact', head: true })
      .eq('has_arc_plc_data', true);
    totalCounties = count || 0;
  } catch {
    totalCounties = 2500; // Fallback estimate
  }

  const countySitemapCount = Math.ceil(totalCounties / 2000);

  // Segment 0 = core pages, Segment 1 = state hubs, Segment 2+ = counties
  const ids = [
    { id: 0 },  // Core pages
    { id: 1 },  // State hubs
  ];

  for (let i = 0; i < countySitemapCount; i++) {
    ids.push({ id: 2 + i });
  }

  return ids;
}

// ── Generate sitemap for each segment ───────────────────────────────────
export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://harvestfile.com';
  const now = new Date();

  // ── Segment 0: Core pages ─────────────────────────────────────────────
  if (id === 0) {
    return [
      // Homepage
      { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },

      // Free tools (highest value pages)
      { url: `${baseUrl}/check`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
      { url: `${baseUrl}/spray-window`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
      { url: `${baseUrl}/weather`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
      { url: `${baseUrl}/insurance`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
      { url: `${baseUrl}/optimize`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
      { url: `${baseUrl}/payments`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${baseUrl}/fba`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${baseUrl}/sdrp`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${baseUrl}/calendar`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },

      // Data pages
      { url: `${baseUrl}/elections`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },

      // OBBBA content hub
      { url: `${baseUrl}/obbba`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
      { url: `${baseUrl}/obbba/arc-sco-stacking`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/obbba/new-base-acres`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

      // Program guides
      { url: `${baseUrl}/programs/arc-co`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
      { url: `${baseUrl}/programs/plc`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
      { url: `${baseUrl}/programs/eqip`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${baseUrl}/programs/crp`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${baseUrl}/programs/csp`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

      // Company pages
      { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

      // Auth pages
      { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
      { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },

      // Legal
      { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    ];
  }

  // ── Segment 1: State hub pages ────────────────────────────────────────
  if (id === 1) {
    try {
      const { data: states } = await supabasePublic
        .from('states')
        .select('slug')
        .gt('county_count', 0);

      if (states) {
        return states.map((s) => ({
          url: `${baseUrl}/${s.slug}/arc-plc`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.85,
        }));
      }
    } catch (err) {
      console.error('Sitemap segment 1 (states) error:', err);
    }
    return [];
  }

  // ── Segment 2+: County pages (paginated) ──────────────────────────────
  const countyBatchIndex = id - 2;
  const batchSize = 2000;
  const offset = countyBatchIndex * batchSize;

  try {
    const { data } = await supabasePublic
      .from('counties')
      .select('slug, states!inner(slug)')
      .eq('has_arc_plc_data', true)
      .order('county_fips')
      .range(offset, offset + batchSize - 1);

    if (data) {
      return data.map((c: any) => ({
        url: `${baseUrl}/${c.states.slug}/${c.slug}/arc-plc`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error(`Sitemap segment ${id} (counties batch ${countyBatchIndex}) error:`, err);
  }

  return [];
}
