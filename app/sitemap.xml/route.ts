// =============================================================================
// app/sitemap.xml/route.ts
// HarvestFile — Explicit Sitemap Index Route
//
// WHY THIS EXISTS: Next.js 14.2's generateSitemaps() creates child sitemaps
// at /sitemap/0.xml, /sitemap/1.xml, etc. but the auto-generated sitemap
// index at /sitemap.xml collides with the dynamic [state] route which
// catches "sitemap.xml" as a state parameter and redirects to
// /sitemap.xml/arc-plc (404).
//
// This explicit route handler at app/sitemap.xml/route.ts takes filesystem
// priority over the dynamic [state] route, serving a proper XML sitemap
// index that references all child sitemaps.
//
// The child sitemap count must match what generateSitemaps() returns in
// app/sitemap.ts. Currently: 0 (core), 1 (states), 2+ (counties).
// =============================================================================

import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  const baseUrl = 'https://harvestfile.com';
  const now = new Date().toISOString();

  // Count total counties to determine how many sitemap segments exist
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

  // Build sitemap entries: segment 0 (core), segment 1 (states), segment 2+ (counties)
  const totalSegments = 2 + countySitemapCount;

  let sitemapEntries = '';
  for (let i = 0; i < totalSegments; i++) {
    sitemapEntries += `  <sitemap>
    <loc>${baseUrl}/sitemap/${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>\n`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
