// =============================================================================
// HarvestFile — County ARC/PLC Page
// Phase 5A-2: /[state]/[county]/arc-plc (e.g., /ohio/darke-county/arc-plc)
//
// THE MONEY PAGE — this is what every farmer searching "ARC PLC [county]" lands on.
// Server Component for full SEO. Renders real USDA data.
// =============================================================================

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCountyBySlug,
  getCountyCropData,
  getNeighborCounties,
  getRecommendation,
  type CommodityGroup,
} from '@/lib/data/county-queries';

// ─── Dynamic Metadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; county: string }>;
}): Promise<Metadata> {
  const { state: stateSlug, county: countySlug } = await params;
  const result = await getCountyBySlug(stateSlug, countySlug);
  if (!result) return { title: 'County Not Found' };

  const { county, state } = result;
  const title = `ARC vs PLC — ${county.display_name}, ${state.name} | Free Calculator & Data`;
  const description = `Compare ARC-CO and PLC estimated payments for ${county.display_name}, ${state.name}. Real USDA NASS county yield data, benchmark revenues, and program recommendations. Free, updated for 2026 OBBBA.`;

  return {
    title,
    description,
    keywords: [
      `ARC PLC ${county.display_name} ${state.name}`,
      `ARC vs PLC ${state.abbreviation}`,
      `${county.name} county yield data`,
      `ARC-CO ${county.display_name}`,
      `PLC ${county.display_name}`,
      `farm program ${state.name}`,
      `USDA county data ${state.abbreviation}`,
    ],
    openGraph: {
      title: `ARC vs PLC — ${county.display_name}, ${state.abbreviation}`,
      description,
      url: `https://harvestfile.com/${state.slug}/${county.slug}/arc-plc`,
    },
    alternates: {
      canonical: `https://harvestfile.com/${state.slug}/${county.slug}/arc-plc`,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
}

function fmtDollars(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n === 0) return '$0';
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export const revalidate = 86400; // ISR: revalidate daily

export default async function CountyPage({
  params,
}: {
  params: Promise<{ state: string; county: string }>;
}) {
  const { state: stateSlug, county: countySlug } = await params;
  const result = await getCountyBySlug(stateSlug, countySlug);
  if (!result) notFound();

  const { county, state } = result;
  const cropGroups = await getCountyCropData(county.county_fips);
  const neighbors = await getNeighborCounties(state.state_fips, county.county_fips);

  // Get primary crop (most years of data)
  const primaryCrop = cropGroups.reduce<CommodityGroup | null>(
    (best, curr) => (!best || curr.years.length > best.years.length ? curr : best),
    null,
  );

  const primaryRec = primaryCrop ? getRecommendation(primaryCrop) : null;

  // Most recent year with benchmark data for the hero stats
  const latestBench = primaryCrop?.years.find(y => y.benchmark_yield != null);

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `ARC vs PLC — ${county.display_name}, ${state.name}`,
    description: `ARC-CO and PLC program data for ${county.display_name}, ${state.name}`,
    url: `https://harvestfile.com/${state.slug}/${county.slug}/arc-plc`,
    isPartOf: { '@type': 'WebSite', name: 'HarvestFile', url: 'https://harvestfile.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://harvestfile.com' },
        { '@type': 'ListItem', position: 2, name: state.name, item: `https://harvestfile.com/${state.slug}/arc-plc` },
        { '@type': 'ListItem', position: 3, name: county.display_name },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="hf-noise-subtle" />
          <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-24 pb-16">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span className="text-border">/</span>
              <Link href={`/${state.slug}/arc-plc`} className="hover:text-foreground transition-colors">{state.name}</Link>
              <span className="text-border">/</span>
              <span className="text-foreground font-medium">{county.display_name}</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              {county.display_name}, {state.abbreviation}
              <span className="block text-xl sm:text-2xl font-semibold text-harvest-gold mt-2">
                ARC-CO vs PLC Analysis
              </span>
            </h1>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Real USDA county-level yield data and calculated ARC/PLC benchmarks
              for {county.display_name}. Updated for the 2026 OBBBA farm bill.
            </p>

            {/* Hero stats */}
            {latestBench && primaryCrop && (
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Latest Yield', value: `${fmt(latestBench.county_yield, 1)} ${primaryCrop.unit.split(' / ')[0].toLowerCase()}/ac`, sub: primaryCrop.display_name },
                  { label: 'ARC Benchmark', value: `${fmt(latestBench.benchmark_yield, 1)} ${primaryCrop.unit.split(' / ')[0].toLowerCase()}/ac`, sub: '5yr Olympic Avg' },
                  { label: 'ARC Guarantee', value: fmtDollars(latestBench.arc_guarantee), sub: '90% of benchmark rev' },
                  { label: 'Recommendation', value: primaryRec?.recommendation || '—', sub: `${primaryRec?.confidence || ''} confidence` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border/50 bg-surface/50 px-4 py-4"
                  >
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.label}
                    </div>
                    <div className={`mt-1 text-xl font-bold ${
                      stat.value === 'ARC-CO' ? 'text-emerald-500' :
                      stat.value === 'PLC' ? 'text-blue-400' :
                      'text-foreground'
                    }`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{stat.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══ RECOMMENDATION ═══ */}
        {primaryRec && primaryCrop && (
          <section className="mx-auto max-w-[1200px] px-6 py-12">
            <div className={`rounded-2xl border p-8 ${
              primaryRec.recommendation === 'ARC-CO'
                ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                : primaryRec.recommendation === 'PLC'
                ? 'border-blue-500/20 bg-blue-500/[0.04]'
                : 'border-border/50 bg-surface/50'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                  primaryRec.recommendation === 'ARC-CO'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : primaryRec.recommendation === 'PLC'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {primaryRec.recommendation === 'ARC-CO' ? '🌾' : primaryRec.recommendation === 'PLC' ? '📊' : '⚖️'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {primaryCrop.display_name} Recommendation: {primaryRec.recommendation}
                    <span className="ml-2 text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-surface border border-border/50">
                      {primaryRec.confidence} confidence
                    </span>
                  </h2>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {primaryRec.reasoning}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground/70">
                    Based on historical county data. Run the full calculator for personalized estimates with your base acres and PLC yield.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ CROP DATA TABLES ═══ */}
        {cropGroups.map((crop) => (
          <section key={crop.commodity_code} className="mx-auto max-w-[1200px] px-6 pb-12">
            <div className="rounded-2xl border border-border/50 overflow-hidden">
              {/* Crop header */}
              <div className="px-6 py-5 bg-surface/50 border-b border-border/50 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{crop.display_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Reference price: {fmtPrice(crop.statutory_ref_price)}/{crop.unit_label}
                    {crop.effective_ref_price && crop.effective_ref_price > crop.statutory_ref_price && (
                      <span className="ml-2 text-harvest-gold">
                        (Effective: {fmtPrice(crop.effective_ref_price)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {crop.years.length} years of data
                </div>
              </div>

              {/* Data table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-surface/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yield</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Benchmark</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">MYA Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">ARC Guarantee</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">ARC Payment</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">PLC Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crop.years.map((year, i) => {
                      const arcPaid = (year.arc_payment_rate || 0) > 0;
                      const plcPaid = (year.plc_payment_rate || 0) > 0;
                      return (
                        <tr
                          key={year.crop_year}
                          className={`border-b border-border/30 ${
                            i % 2 === 0 ? '' : 'bg-surface/20'
                          } ${arcPaid || plcPaid ? 'bg-harvest-gold/[0.02]' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold text-foreground">{year.crop_year}</td>
                          <td className="px-4 py-3 text-right text-foreground tabular-nums">
                            {fmt(year.county_yield, 1)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {fmt(year.benchmark_yield, 1)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {fmtPrice(year.mya_price)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {fmtDollars(year.arc_guarantee)}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            arcPaid ? 'text-emerald-500' : 'text-muted-foreground/50'
                          }`}>
                            {arcPaid ? `$${fmt(year.arc_payment_rate, 2)}/ac` : fmtDollars(year.arc_payment_rate)}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            plcPaid ? 'text-blue-400' : 'text-muted-foreground/50'
                          }`}>
                            {plcPaid ? `$${fmt(year.plc_payment_rate, 2)}/ac` : fmtDollars(year.plc_payment_rate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-6 py-3 bg-surface/30 border-t border-border/50 text-xs text-muted-foreground">
                Source: USDA NASS Quick Stats · Benchmarks use 5-year Olympic average · ARC-CO guarantee = 90% of benchmark revenue (OBBBA)
              </div>
            </div>
          </section>
        ))}

        {/* ═══ OBBBA EXPLAINER ═══ */}
        <section className="mx-auto max-w-[1200px] px-6 pb-12">
          <div className="rounded-2xl border border-border/50 bg-surface/30 p-8">
            <h2 className="text-lg font-bold text-foreground mb-4">
              What Changed Under OBBBA (2025 Farm Bill)
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">ARC-CO Improvements</h3>
                <p>
                  The ARC-CO guarantee band expanded from 86% to 90% of benchmark revenue,
                  meaning payments trigger sooner when county revenue drops. The payment cap
                  remains at 10% of benchmark revenue per acre. Trend-adjusted yields are now
                  used in benchmark calculations.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">PLC Improvements</h3>
                <p>
                  Statutory reference prices increased significantly — corn from $3.70 to $4.10/bu,
                  soybeans from $8.40 to $10.00/bu, wheat from $5.50 to $6.00/bu. The effective
                  reference price (85% of 5-year Olympic average MYA) can push this even higher.
                  Payment limits increased to $155,000.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="mx-auto max-w-[1200px] px-6 pb-12">
          <div className="rounded-2xl bg-gradient-to-br from-harvest-forest-800 to-harvest-forest-950 border border-harvest-gold/10 p-10 text-center relative overflow-hidden">
            <div className="hf-noise-subtle" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3">
                Get Your Personalized ARC/PLC Estimate
              </h2>
              <p className="text-white/60 max-w-lg mx-auto mb-8">
                Enter your base acres, PLC yield, and crop to see exactly how much you could
                receive under each program. Free, instant, no registration.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link
                  href="/check"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-harvest-gold text-harvest-forest-950 font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-harvest-gold/25"
                >
                  Run Free Calculator →
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-all"
                >
                  Pro Dashboard — 14 Day Trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ NEIGHBOR COUNTIES ═══ */}
        {neighbors.length > 0 && (
          <section className="border-t border-border/50">
            <div className="mx-auto max-w-[1200px] px-6 py-16">
              <h2 className="text-lg font-bold text-foreground mb-6">
                Other {state.name} Counties
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {neighbors.map((n) => (
                  <Link
                    key={n.county_fips}
                    href={`/${n.state_slug}/${n.slug}/arc-plc`}
                    className="px-4 py-2.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-all"
                  >
                    {n.display_name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
