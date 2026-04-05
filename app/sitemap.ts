// =============================================================================
// HarvestFile — Segmented Sitemap Generator
// Phase B/C Deploy: Consolidated after Surface 2 route cleanup
//
// CHANGES:
//   - Removed 9 redirected URLs: /markets, /grain, /weather, /calendar,
//     /spray-window, /sdrp, /optimize, /payments, /fba, /elections
//   - /morning elevated to priority 1.0 with changeFrequency 'daily'
//   - /check remains at 0.95 (primary acquisition tool)
//   - Kept segmented structure for 3,000+ county pages
//
// Segments:
//   0 = Core pages (tools, programs, OBBBA, auth, legal)
//   1 = State hub pages (/{state}/arc-plc)
//   2+ = County pages (paginated in batches of 2,000)
// =============================================================================

import { MetadataRoute } from 'next';
import { supabasePublic } from '@/lib/supabase/public';

// ── Generate sitemap index entries ──────────────────────────────────────
export async function generateSitemaps() {
  let totalCounties = 0;
  try {
    const { count } = await supabasePublic
      .from('counties')
      .select('*', { count: 'exact', head: true })
      .eq('has_arc_plc_data', true);
    totalCounties = count || 0;
  } catch {
    totalCounties = 2500;
  }

  const countySitemapCount = Math.ceil(totalCounties / 2000);

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
  // ONLY canonical 200-OK URLs. All redirected routes removed.
  if (id === 0) {
    return [
      // Homepage
      { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },

      // Daily habit tool (highest engagement)
      { url: `${baseUrl}/morning`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },

      // Primary acquisition tool
      { url: `${baseUrl}/check`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },

      // Active tools (not yet consolidated into surfaces)
      { url: `${baseUrl}/insurance`, lastModified: now, changeFrequency: 'weekly', priority: 0.90 },
      { url: `${baseUrl}/advisor`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
      { url: `${baseUrl}/navigator`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
      { url: `${baseUrl}/founding-farmer`, lastModified: now, changeFrequency: 'weekly', priority: 0.80 },

      // Standalone tools (future Surface 3 candidates)
      { url: `${baseUrl}/cashflow`, lastModified: now, changeFrequency: 'weekly', priority: 0.80 },
      { url: `${baseUrl}/breakeven`, lastModified: now, changeFrequency: 'weekly', priority: 0.80 },
      { url: `${baseUrl}/farm-score`, lastModified: now, changeFrequency: 'weekly', priority: 0.80 },

      // OBBBA content hub
      { url: `${baseUrl}/obbba`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
      { url: `${baseUrl}/obbba/arc-sco-stacking`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
      { url: `${baseUrl}/obbba/new-base-acres`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },

      // Program guides
      { url: `${baseUrl}/programs/arc-co`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
      { url: `${baseUrl}/programs/plc`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
      { url: `${baseUrl}/programs/eqip`, lastModified: now, changeFrequency: 'monthly', priority: 0.70 },
      { url: `${baseUrl}/programs/crp`, lastModified: now, changeFrequency: 'monthly', priority: 0.70 },
      { url: `${baseUrl}/programs/csp`, lastModified: now, changeFrequency: 'monthly', priority: 0.70 },

      // Company pages
      { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.70 },
      { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.50 },

      // Auth pages
      { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.30 },
      { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.30 },

      // Legal
      { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.20 },
      { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.20 },
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
        priority: 0.70,
      }));
    }
  } catch (err) {
    console.error(`Sitemap segment ${id} (counties batch ${countyBatchIndex}) error:`, err);
  }

  return [];
}
