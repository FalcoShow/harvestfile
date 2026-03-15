// =============================================================================
// HarvestFile — State Hub Page
// Phase 5A-2: /[state]/arc-plc (e.g., /ohio/arc-plc)
//
// Server Component — fully SEO-optimized, no client JS for core content
// Lists all farming counties in the state with links to individual pages
// =============================================================================

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getStateBySlug,
  getCountiesForState,
  getAllStatesWithData,
} from '@/lib/data/county-queries';

// ─── Static Params (pre-render all state pages) ─────────────────────────────

export async function generateStaticParams() {
  const states = await getAllStatesWithData();
  return states.map((s) => ({ state: s.slug }));
}

// ─── Dynamic Metadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return { title: 'State Not Found' };

  const title = `ARC/PLC Calculator by County — ${state.name} | HarvestFile`;
  const description = `Compare ARC-CO vs PLC payments for ${state.county_count} ${state.name} counties. Free county-level data using live USDA NASS yields. Updated for 2026 OBBBA farm bill.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://harvestfile.com/${state.slug}/arc-plc`,
    },
    alternates: {
      canonical: `https://harvestfile.com/${state.slug}/arc-plc`,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export const revalidate = 86400; // ISR: revalidate daily

export default async function StateHubPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();

  const counties = await getCountiesForState(state.state_fips);
  if (counties.length === 0) notFound();

  // Get all states for the sidebar navigation
  const allStates = await getAllStatesWithData();

  // JSON-LD for this page
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${state.name} ARC/PLC County Data`,
    description: `ARC-CO and PLC program data for ${counties.length} ${state.name} counties`,
    url: `https://harvestfile.com/${state.slug}/arc-plc`,
    isPartOf: { '@type': 'WebSite', name: 'HarvestFile', url: 'https://harvestfile.com' },
    numberOfItems: counties.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="hf-noise-subtle" />
          <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-24 pb-16">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span className="text-border">/</span>
              <span className="text-foreground font-medium">{state.name}</span>
            </nav>

            <div className="flex items-start justify-between gap-8 flex-wrap">
              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                  {state.name}
                  <span className="block text-xl sm:text-2xl font-semibold text-harvest-gold mt-2">
                    ARC/PLC County Data
                  </span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                  Compare ARC-CO and PLC estimated payments for{' '}
                  <strong className="text-foreground">{counties.length} {state.name} counties</strong>{' '}
                  using live USDA NASS yield data. Updated for the 2026 OBBBA farm bill with
                  expanded reference prices and 90% ARC-CO guarantee.
                </p>
              </div>

              {/* Quick stats */}
              <div className="flex gap-6 flex-wrap">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{counties.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Counties</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-harvest-gold">Free</div>
                  <div className="text-xs text-muted-foreground mt-1">All Data</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* County Grid */}
        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <h2 className="text-xl font-bold text-foreground mb-8">
            All {state.name} Counties with ARC/PLC Data
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {counties.map((county) => (
              <Link
                key={county.county_fips}
                href={`/${state.slug}/${county.slug}/arc-plc`}
                className="group flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-border/50 hover:border-harvest-gold/30 hover:bg-harvest-gold/[0.03] transition-all"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground group-hover:text-harvest-gold transition-colors truncate">
                    {county.display_name}
                  </div>
                  {county.top_commodity && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Top crop: {county.top_commodity}
                    </div>
                  )}
                </div>
                <svg
                  className="w-4 h-4 text-muted-foreground/50 group-hover:text-harvest-gold transition-colors flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/50 bg-harvest-gold/[0.03]">
          <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Run the Full ARC/PLC Calculator
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Get personalized payment estimates for your exact county, crop, and acreage.
              Free, instant, no registration required.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/check"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-harvest-gold text-harvest-forest-950 font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-harvest-gold/20"
              >
                Free ARC/PLC Calculator →
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-surface transition-all"
              >
                Start Pro Trial — 14 Days Free
              </Link>
            </div>
          </div>
        </section>

        {/* Other States */}
        <section className="border-t border-border/50">
          <div className="mx-auto max-w-[1200px] px-6 py-16">
            <h2 className="text-lg font-bold text-foreground mb-6">
              ARC/PLC Data by State
            </h2>
            <div className="flex flex-wrap gap-2">
              {allStates.map((s) => (
                <Link
                  key={s.state_fips}
                  href={`/${s.slug}/arc-plc`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    s.slug === state.slug
                      ? 'bg-harvest-gold/20 text-harvest-gold border border-harvest-gold/30'
                      : 'bg-surface border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {s.abbreviation}
                  <span className="ml-1 opacity-50">({s.county_count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
