// =============================================================================
// HarvestFile — Consolidation Phase 1, Build 2C: Enriched County Page
// /{state}/{county}/arc-plc — THE definitive county-level ARC/PLC resource
//
// 3,000+ unique county pages with genuinely different data per county.
// Each page has 8-15 unique data points, conditional narrative text,
// data-driven FAQs, and 5-type JSON-LD schema.
//
// Build 4 Deploy 3: Added graceful fallback for counties without ARC/PLC data.
// Instead of 404, counties without has_arc_plc_data render a partial page
// with grain bids, neighboring county links, and a CTA. This ensures every
// county clicked on the Election Map lands on a useful page.
//
// Data sources:
//   - county_crop_data (ARC/PLC payments, benchmarks, yields)
//   - county_profiles (census, climate, soil, insurance, ERS, narrative)
//   - historical_enrollment (election breakdowns)
//   - benchmarks (live 2026 farmer reports)
//
// Server Component with client islands for charts and interactivity.
// ISR with 1-hour revalidation + on-demand revalidation on data updates.
// =============================================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getCountyBySlug,
  getCountyBySlugAny,
  getCountyCropData,
  getNeighborCounties,
  getRecommendation,
  type CommodityGroup,
} from '@/lib/data/county-queries';
import {
  getCountyEnrollmentHistory,
  getCountyEnrollmentSummary,
} from '@/lib/data/historical-enrollment';
import { CountyCharts } from '@/components/county/CountyCharts';
import { CountyBenchmarkCTA } from '@/components/county/CountyBenchmarkCTA';
import { getBenchmarkContextForCounty } from '@/lib/cross-tool/benchmark-context';
import { GrainBidCard } from '@/components/county/GrainBidCard';
import { PaymentNarrative } from '@/components/county/PaymentNarrative';
import {
  getCountyProfile,
  generateCountyNarrative,
  generateCountyFAQs,
  generateCountyJsonLd,
  type CountyProfile,
} from '@/lib/county-data';

// ── ISR: Revalidate every hour ──────────────────────────────────────────
export const revalidate = 3600;
export const dynamicParams = true;

// ── Generate top 200 counties at build time ─────────────────────────────
export async function generateStaticParams() {
  const { supabasePublic } = await import('@/lib/supabase/public');

  const { data } = await supabasePublic
    .from('counties')
    .select('slug, states!inner(slug)')
    .eq('has_arc_plc_data', true)
    .order('total_base_acres', { ascending: false })
    .limit(200);

  if (!data) return [];

  return data.map((row: any) => ({
    state: row.states.slug,
    county: row.slug,
  }));
}

// ── Dynamic Metadata ────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ state: string; county: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, county } = await params;

  // Try full data county first, then fallback
  const result = await getCountyBySlug(state, county);

  if (result) {
    const { county: c, state: s } = result;
    const [enrollment, profile] = await Promise.all([
      getCountyEnrollmentSummary(c.county_fips),
      getCountyProfile(state, county),
    ]);

    const acresStr = c.total_base_acres
      ? `${(c.total_base_acres / 1000).toFixed(0)}K`
      : '';

    const descParts: string[] = [];
    descParts.push(`Free ARC-CO vs PLC analysis for ${c.display_name}, ${s.name}.`);
    if (acresStr) descParts.push(`${acresStr} enrolled base acres.`);
    if (profile?.total_farms) descParts.push(`${profile.total_farms.toLocaleString()} farms.`);
    if (enrollment) {
      descParts.push(
        `${enrollment.top_crop}: ${enrollment.top_crop_arcco_pct}% ARC-CO, ${enrollment.top_crop_plc_pct}% PLC.`
      );
    }
    descParts.push('Real USDA data, payment history, and 2026 recommendations under OBBBA.');

    const description = descParts.join(' ');
    const title = `${c.display_name}, ${s.abbreviation} ARC/PLC Data — Payment Projections & Election History | HarvestFile`;

    return {
      title,
      description,
      openGraph: {
        title: `${c.display_name}, ${s.abbreviation} — ARC/PLC Election Data | HarvestFile`,
        description,
        type: 'website',
        url: `https://harvestfile.com/${state}/${county}/arc-plc`,
        siteName: 'HarvestFile',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${c.display_name}, ${s.abbreviation} ARC/PLC Data`,
        description,
      },
      alternates: {
        canonical: `https://harvestfile.com/${state}/${county}/arc-plc`,
      },
    };
  }

  // Fallback metadata for partial pages
  const fallback = await getCountyBySlugAny(state, county);
  if (!fallback) return { title: 'County Not Found | HarvestFile' };

  const { county: c, state: s } = fallback;
  return {
    title: `${c.display_name}, ${s.abbreviation} — Local Grain Bids & Farm Data | HarvestFile`,
    description: `Agricultural data, local grain elevator bids, and USDA program information for ${c.display_name}, ${s.name}. Free tools for farmers.`,
    robots: { index: false, follow: true }, // noindex partial pages
    alternates: {
      canonical: `https://harvestfile.com/${state}/${county}/arc-plc`,
    },
  };
}

// ── Utility Functions ───────────────────────────────────────────────────

function formatAcres(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000).toLocaleString()}K`;
  return n.toLocaleString();
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatDollars(n: number): string {
  if (n >= 100) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'high': return 'text-emerald-700';
    case 'moderate': return 'text-amber-700';
    default: return 'text-gray-500';
  }
}

function getConfidenceBg(confidence: string): string {
  switch (confidence) {
    case 'high': return 'bg-emerald-50 border-emerald-200';
    case 'moderate': return 'bg-amber-50 border-amber-200';
    default: return 'bg-gray-50 border-gray-200';
  }
}

function getRecBadgeColor(rec: string): string {
  switch (rec) {
    case 'ARC-CO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'PLC': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

// ── Enhanced JSON-LD Structured Data ────────────────────────────────────

function CountyJsonLd({
  county,
  state,
  cropData,
  profile,
}: {
  county: any;
  state: any;
  cropData: CommodityGroup[];
  profile: CountyProfile | null;
}) {
  if (profile) {
    const enhancedJsonLd = generateCountyJsonLd(profile);
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enhancedJsonLd) }}
      />
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        name: `ARC/PLC Program Data for ${county.display_name}, ${state.name}`,
        description: `Historical ARC-CO and PLC payment rates, benchmark yields, enrollment data, and program recommendations for ${county.display_name}, ${state.name}. Sourced from USDA Farm Service Agency and USDA NASS.`,
        url: `https://harvestfile.com/${state.slug}/${county.slug}/arc-plc`,
        license: 'https://creativecommons.org/publicdomain/zero/1.0/',
        creator: { '@type': 'Organization', name: 'USDA Farm Service Agency' },
        temporalCoverage: '2014/2026',
        spatialCoverage: {
          '@type': 'Place',
          name: `${county.display_name}, ${state.name}`,
          geo: county.latitude && county.longitude
            ? {
                '@type': 'GeoCoordinates',
                latitude: county.latitude,
                longitude: county.longitude,
              }
            : undefined,
        },
        variableMeasured: cropData.map((c) => ({
          '@type': 'PropertyValue',
          name: `${c.display_name} ARC/PLC Data`,
          unitText: c.unit_label,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'HarvestFile',
            item: 'https://harvestfile.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: `${state.name} ARC/PLC`,
            item: `https://harvestfile.com/${state.slug}/arc-plc`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${county.display_name}`,
            item: `https://harvestfile.com/${state.slug}/${county.slug}/arc-plc`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Should I choose ARC-CO or PLC in ${county.display_name}, ${state.abbreviation} for 2026?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `The optimal choice depends on your specific crops and base acres. Use HarvestFile's free calculator at harvestfile.com/check to get a personalized recommendation based on real USDA data for ${county.display_name}.`,
            },
          },
          {
            '@type': 'Question',
            name: `What are the ARC-CO payment rates for ${county.display_name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `ARC-CO payment rates for ${county.display_name} vary by crop and year. View the full payment history and 2026 projections on this page, or run a personalized analysis with the free ARC/PLC calculator.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════
// PARTIAL COUNTY PAGE (for counties without ARC/PLC data)
// Renders grain bids, general info, neighboring county links, and CTAs.
// Returns HTTP 200 with noindex to avoid Google soft-404 penalties.
// ═════════════════════════════════════════════════════════════════════════

async function PartialCountyPage({
  county,
  state,
  stateSlug,
}: {
  county: any;
  state: any;
  stateSlug: string;
}) {
  // Get neighboring counties that DO have ARC/PLC data
  const neighbors = await getNeighborCounties(county.state_fips, county.county_fips);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C1F17] via-[#142B20] to-[#1B4332]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[11px] font-medium text-white/35 mb-6">
            <Link href="/" className="hover:text-white/60 transition-colors">
              HarvestFile
            </Link>
            <span className="text-white/20">/</span>
            <Link
              href={`/${stateSlug}/arc-plc`}
              className="hover:text-white/60 transition-colors"
            >
              {state.name}
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white/50">{county.display_name}</span>
          </nav>

          <h1 className="text-[clamp(28px,4.5vw,48px)] font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-4">
            {county.display_name}
            <span className="text-white/30 font-semibold text-[0.5em] ml-3">
              {state.abbreviation}
            </span>
          </h1>

          <p className="text-[14px] sm:text-[15px] text-white/40 leading-relaxed max-w-2xl">
            Agricultural data and local grain elevator bids for{' '}
            {county.display_name}, {state.name}. Detailed ARC-CO and PLC
            program analysis for this county is currently being compiled from
            USDA data sources.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#FAFAF8]" />
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* Status Banner */}
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/50 p-5 sm:p-6 mb-10 -mt-2">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-amber-900 mb-1">
                ARC/PLC Analysis Coming Soon
              </h2>
              <p className="text-[13px] text-amber-700/70 leading-relaxed">
                We're building detailed ARC-CO and PLC payment history,
                benchmark yields, and program recommendations for{' '}
                {county.display_name}. In the meantime, check local grain
                bids below or use our free calculator to run your own analysis.
              </p>
              <Link
                href="/check"
                className="inline-flex items-center gap-2 mt-3 bg-[#1B4332] hover:bg-[#0C1F17] text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-[#1B4332]/15 transition-all text-[13px]"
              >
                Run Free ARC/PLC Calculator
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Grain Bids — works for ANY county via FIPS lookup */}
        <section className="mb-12">
          <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
            Nearby Grain Bids — {county.display_name}
          </h2>
          <GrainBidCard
            countyFips={county.county_fips}
            countyName={county.display_name}
            stateAbbr={state.abbreviation}
            latitude={county.latitude}
            longitude={county.longitude}
          />
        </section>

        {/* Live Price Context */}
        <PaymentNarrative />

        {/* OBBBA Info */}
        <section className="mb-12">
          <div className="rounded-2xl border border-[#1B4332]/10 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] p-6 sm:p-8 text-white">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#E2C366]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#E2C366]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-[17px] font-bold mb-2">
                  2026 Changes Under OBBBA
                </h3>
                <p className="text-[13px] text-white/50 leading-relaxed mb-3">
                  The One Big Beautiful Bill Act significantly changes ARC/PLC
                  for all counties. Reference prices increased (corn to $4.10/bu,
                  soybeans to $10.00/bu), ARC guarantee rose to 90%, payment cap
                  increased to 12%, and up to 30 million new base acres can be
                  added. For 2026, farmers must make an affirmative annual election.
                </p>
                <Link
                  href="/obbba"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#E2C366] hover:text-[#E2C366]/80 transition-colors"
                >
                  Learn about OBBBA changes
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Nearby Counties with full data */}
        {neighbors.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-4">
              Nearby Counties with Full ARC/PLC Data
            </h2>
            <p className="text-[13px] text-gray-500 mb-5">
              These counties in {state.name} have complete ARC-CO and PLC
              payment history, benchmark yields, and program recommendations.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {neighbors.slice(0, 8).map((n) => (
                <Link
                  key={n.county_fips}
                  href={`/${n.state_slug}/${n.slug}/arc-plc`}
                  className="rounded-xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-sm hover:border-[#1B4332]/20 hover:shadow-md transition-all group"
                >
                  <span className="text-[14px] font-semibold text-[#1B4332] group-hover:text-emerald-700 transition-colors">
                    {n.display_name}
                  </span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    View ARC/PLC data →
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href={`/${stateSlug}/arc-plc`}
                className="text-[13px] font-semibold text-[#1B4332] hover:text-emerald-700 transition-colors"
              >
                View all counties in {state.name} →
              </Link>
            </div>
          </section>
        )}

        {/* Free Tools */}
        <section className="mb-12">
          <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-4">
            Free Farm Program Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: '/check', title: 'ARC/PLC Calculator', desc: 'Side-by-side ARC-CO vs PLC comparison with real USDA data' },
              { href: '/insurance', title: 'Crop Insurance Optimizer', desc: 'RP + SCO + ECO stacking with 10,000 Monte Carlo simulations' },
              { href: '/morning', title: 'Morning Dashboard', desc: 'Weather, commodity prices, payment estimates — your daily farm briefing' },
              { href: '/payments', title: 'Payment Tracker', desc: 'Track projected ARC-CO and PLC payments as MYA prices update' },
              { href: '/fba', title: 'Base Acre Analyzer', desc: 'Calculate new base acre eligibility under OBBBA' },
              { href: '/calendar', title: 'Policy Calendar', desc: 'Every USDA deadline and payment date in one place' },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <span className="text-[14px] font-bold text-[#1B4332] group-hover:text-emerald-700 transition-colors">
                  {tool.title}
                </span>
                <span className="block text-[12px] text-gray-400 mt-1 leading-relaxed">
                  {tool.desc}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-[10px] text-gray-400 leading-relaxed max-w-4xl">
            Data sources: USDA Farm Service Agency, USDA NASS Quick Stats API,
            Barchart OnDemand (grain bids). This page is not official USDA guidance.
            HarvestFile is not affiliated with USDA.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════

export default async function CountyArcPlcPage({ params }: PageProps) {
  const { state: stateSlug, county: countySlug } = await params;

  // ── Try full data county first ──────────────────────────────────────
  const result = await getCountyBySlug(stateSlug, countySlug);

  // ── Fallback: county exists but has no ARC/PLC data ─────────────────
  if (!result) {
    const fallback = await getCountyBySlugAny(stateSlug, countySlug);
    if (!fallback) notFound(); // Truly invalid URL — real 404

    return (
      <PartialCountyPage
        county={fallback.county}
        state={fallback.state}
        stateSlug={stateSlug}
      />
    );
  }

  const { county, state } = result;

  const [cropData, enrollment, enrollmentSummary, neighbors, benchmarkContext, profile] = await Promise.all([
    getCountyCropData(county.county_fips),
    getCountyEnrollmentHistory(county.county_fips),
    getCountyEnrollmentSummary(county.county_fips),
    getNeighborCounties(county.state_fips, county.county_fips),
    getBenchmarkContextForCounty(county.county_fips),
    getCountyProfile(stateSlug, countySlug),
  ]);

  // Get recommendations for each crop
  const recommendations = cropData.map((crop) => ({
    crop,
    ...getRecommendation(crop),
  }));

  // Find the primary crop (most base acres in latest year)
  const primaryCrop = cropData.length > 0 ? cropData[0] : null;
  const primaryRec = recommendations.length > 0 ? recommendations[0] : null;

  // Latest enrollment year data
  const latestYear = enrollmentSummary?.latest_year;

  // Generate enrichment content from county_profiles
  const narrative = profile ? generateCountyNarrative(profile) : null;
  const faqs = profile ? generateCountyFAQs(profile) : [];

  return (
    <>
      <CountyJsonLd county={county} state={state} cropData={cropData} profile={profile} />

      <div className="min-h-screen bg-[#FAFAF8]">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0C1F17] via-[#142B20] to-[#1B4332]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-14">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[11px] font-medium text-white/35 mb-6">
              <Link href="/" className="hover:text-white/60 transition-colors">
                HarvestFile
              </Link>
              <span className="text-white/20">/</span>
              <Link
                href={`/${stateSlug}/arc-plc`}
                className="hover:text-white/60 transition-colors"
              >
                {state.name}
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-white/50">{county.display_name}</span>
            </nav>

            {/* County Name + Badge */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5 mb-5">
              <h1 className="text-[clamp(28px,4.5vw,48px)] font-extrabold text-white tracking-[-0.03em] leading-[1.05]">
                {county.display_name}
                <span className="text-white/30 font-semibold text-[0.5em] ml-3">
                  {state.abbreviation}
                </span>
              </h1>
              {primaryRec && primaryRec.recommendation !== 'NEUTRAL' && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-1 ${getRecBadgeColor(
                    primaryRec.recommendation
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {primaryRec.recommendation} Favored for{' '}
                  {primaryRec.crop.display_name}
                </span>
              )}
            </div>

            <p className="text-[14px] sm:text-[15px] text-white/40 leading-relaxed max-w-2xl mb-8">
              ARC-CO and PLC program data for {county.display_name},{' '}
              {state.name}. Historical payment rates, benchmark yields,
              enrollment trends, and 2026 election analysis under the One Big
              Beautiful Bill Act.
            </p>

            {/* KPI Cards — Enhanced with profile data */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {county.total_base_acres > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3.5">
                  <div className="text-[22px] font-extrabold text-white tracking-tight">
                    {formatAcres(county.total_base_acres)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mt-0.5">
                    Base Acres
                  </div>
                </div>
              )}
              {cropData.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3.5">
                  <div className="text-[22px] font-extrabold text-white tracking-tight">
                    {cropData.length}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mt-0.5">
                    Program Crops
                  </div>
                </div>
              )}
              {enrollmentSummary && (
                <>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3.5">
                    <div className="text-[22px] font-extrabold text-emerald-400 tracking-tight">
                      {enrollmentSummary.top_crop_arcco_pct}%
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mt-0.5">
                      ARC-CO ({enrollmentSummary.top_crop}, {latestYear})
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3.5">
                    <div className="text-[22px] font-extrabold text-blue-400 tracking-tight">
                      {enrollmentSummary.top_crop_plc_pct}%
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mt-0.5">
                      PLC ({enrollmentSummary.top_crop}, {latestYear})
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Gradient fade to content */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#FAFAF8]" />
        </section>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          {/* ── CTA: Run Calculator ── */}
          <div className="rounded-2xl border border-[#E2C366]/20 bg-gradient-to-r from-[#FFFDF5] to-[#FFF9E6] p-5 sm:p-6 mb-10 -mt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#1B4332] mb-1">
                  Get Your Personalized 2026 Recommendation
                </h2>
                <p className="text-[13px] text-[#1B4332]/50">
                  Enter your base acres and crops for a county-specific ARC vs
                  PLC analysis with payment projections under OBBBA.
                </p>
              </div>
              <Link
                href={`/check?county=${encodeURIComponent(county.display_name)}&state=${state.abbreviation}`}
                className="shrink-0 inline-flex items-center gap-2 bg-[#1B4332] hover:bg-[#0C1F17] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#1B4332]/15 hover:shadow-[#1B4332]/25 transition-all text-[14px]"
              >
                Run Free Calculator
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ══ BUILD 2C: Agricultural Profile ══ */}
          {profile && (profile.total_farms || profile.total_farmland_acres || profile.cropland_acres) && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
                Agricultural Profile
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {profile.total_farms && (
                  <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">
                      Total Farms
                    </div>
                    <div className="text-[22px] font-extrabold text-[#1B4332] tracking-tight">
                      {formatNumber(profile.total_farms)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      USDA Census of Agriculture
                    </div>
                  </div>
                )}
                {profile.total_farmland_acres && (
                  <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">
                      Farmland
                    </div>
                    <div className="text-[22px] font-extrabold text-[#1B4332] tracking-tight">
                      {formatAcres(profile.total_farmland_acres)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      acres total
                    </div>
                  </div>
                )}
                {profile.avg_farm_size_acres && (
                  <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">
                      Avg Farm Size
                    </div>
                    <div className="text-[22px] font-extrabold text-[#1B4332] tracking-tight">
                      {formatNumber(profile.avg_farm_size_acres)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      acres per farm
                    </div>
                  </div>
                )}
                {profile.cropland_acres && (
                  <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">
                      Cropland
                    </div>
                    <div className="text-[22px] font-extrabold text-[#1B4332] tracking-tight">
                      {formatAcres(profile.cropland_acres)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      acres in crops
                    </div>
                  </div>
                )}
                {profile.prime_farmland_pct && (
                  <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">
                      Prime Farmland
                    </div>
                    <div className="text-[22px] font-extrabold text-[#1B4332] tracking-tight">
                      {profile.prime_farmland_pct.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      NRCS designation
                    </div>
                  </div>
                )}
              </div>

              {/* Top Crops from county_profiles */}
              {profile.top_crops && profile.top_crops.length > 0 && (
                <div className="mt-4 rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-[14px] font-bold text-[#1B4332]">
                      Top Crops by Harvested Acres
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">
                          <th className="text-left px-5 py-2.5">Crop</th>
                          <th className="text-right px-3 py-2.5">Harvested Acres</th>
                          <th className="text-right px-3 py-2.5">Avg Yield</th>
                          <th className="text-right px-3 py-2.5">State Avg</th>
                          <th className="text-right px-5 py-2.5">vs. State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.top_crops
                          .filter((c) => c.harvested_acres && c.harvested_acres > 0)
                          .slice(0, 5)
                          .map((crop) => {
                            const stateAvg = profile.state_averages?.[crop.crop];
                            const diff =
                              crop.yield && stateAvg?.yield
                                ? ((crop.yield - stateAvg.yield) / stateAvg.yield) * 100
                                : null;
                            return (
                              <tr
                                key={crop.crop}
                                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                              >
                                <td className="px-5 py-2.5 font-semibold text-gray-700">
                                  {crop.crop}
                                </td>
                                <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">
                                  {(crop.harvested_acres || 0).toLocaleString()}
                                </td>
                                <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">
                                  {crop.yield
                                    ? `${crop.yield.toFixed(1)} ${crop.yield_unit || 'bu/acre'}`
                                    : '—'}
                                </td>
                                <td className="text-right px-3 py-2.5 text-gray-500 tabular-nums">
                                  {stateAvg?.yield
                                    ? `${stateAvg.yield.toFixed(1)} ${crop.yield_unit || 'bu/acre'}`
                                    : '—'}
                                </td>
                                <td
                                  className={`text-right px-5 py-2.5 font-semibold tabular-nums ${
                                    diff !== null
                                      ? diff > 5
                                        ? 'text-emerald-700'
                                        : diff < -5
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {diff !== null
                                    ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Classification badges */}
              {(profile.is_farming_dependent || profile.economic_typology || profile.rural_urban_desc) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.is_farming_dependent && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Farming-Dependent County
                    </span>
                  )}
                  {profile.economic_typology && !profile.is_farming_dependent && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      {profile.economic_typology}
                    </span>
                  )}
                  {profile.rural_urban_desc && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      {profile.rural_urban_desc}
                    </span>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ══ BUILD 2C: County Analysis Narrative ══ */}
          {narrative && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-4">
                {county.display_name} ARC/PLC Analysis
              </h2>
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm">
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                  {narrative.split('\n\n').map((paragraph, i) => (
                    <p key={i} className={i > 0 ? 'mt-4' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[11px] text-gray-400">
                    Analysis based on USDA NASS, FSA, ERS, and NRCS data. Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}.
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ── Crop-by-Crop Analysis ── */}
          {cropData.length > 0 && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
                Crop-by-Crop Program Analysis
              </h2>

              <div className="space-y-6">
                {recommendations.map(({ crop, recommendation, reasoning, confidence }) => (
                  <div
                    key={crop.commodity_code}
                    className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Crop Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[17px] font-bold text-[#1B4332]">
                          {crop.display_name}
                        </h3>
                        <span className="text-[11px] font-medium text-gray-400">
                          Ref. Price: ${crop.statutory_ref_price}/{crop.unit_label}
                          {crop.effective_ref_price &&
                            crop.effective_ref_price !== crop.statutory_ref_price && (
                              <span className="text-emerald-600 ml-1">
                                → ${crop.effective_ref_price} (OBBBA)
                              </span>
                            )}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getRecBadgeColor(
                          recommendation
                        )}`}
                      >
                        {recommendation === 'NEUTRAL'
                          ? 'Toss-Up'
                          : `${recommendation} Favored`}
                      </span>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">
                            <th className="text-left px-5 py-2.5">Year</th>
                            <th className="text-right px-3 py-2.5">
                              County Yield
                            </th>
                            <th className="text-right px-3 py-2.5">
                              Benchmark Yield
                            </th>
                            <th className="text-right px-3 py-2.5">MYA Price</th>
                            <th className="text-right px-3 py-2.5">
                              <span className="text-emerald-600">
                                ARC-CO Rate
                              </span>
                            </th>
                            <th className="text-right px-5 py-2.5">
                              <span className="text-blue-600">PLC Rate</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {crop.years.slice(0, 8).map((year) => {
                            const arcWins =
                              (year.arc_payment_rate || 0) >
                              (year.plc_payment_rate || 0);
                            const plcWins =
                              (year.plc_payment_rate || 0) >
                              (year.arc_payment_rate || 0);
                            return (
                              <tr
                                key={year.crop_year}
                                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                              >
                                <td className="px-5 py-2.5 font-semibold text-gray-700">
                                  {year.crop_year}
                                </td>
                                <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">
                                  {year.county_yield
                                    ? `${year.county_yield.toFixed(1)} ${crop.unit_label}`
                                    : '—'}
                                </td>
                                <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">
                                  {year.benchmark_yield
                                    ? `${year.benchmark_yield.toFixed(1)} ${crop.unit_label}`
                                    : '—'}
                                </td>
                                <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">
                                  {year.mya_price
                                    ? formatDollars(year.mya_price)
                                    : '—'}
                                </td>
                                <td
                                  className={`text-right px-3 py-2.5 tabular-nums font-semibold ${
                                    arcWins
                                      ? 'text-emerald-700 bg-emerald-50/50'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {year.arc_payment_rate != null
                                    ? formatDollars(year.arc_payment_rate) +
                                      '/acre'
                                    : '—'}
                                </td>
                                <td
                                  className={`text-right px-5 py-2.5 tabular-nums font-semibold ${
                                    plcWins
                                      ? 'text-blue-700 bg-blue-50/50'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {year.plc_payment_rate != null
                                    ? formatDollars(year.plc_payment_rate) +
                                      '/acre'
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Recommendation */}
                    <div
                      className={`mx-5 mb-5 mt-4 rounded-xl border p-4 ${getConfidenceBg(
                        confidence
                      )}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {recommendation === 'ARC-CO' ? (
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-emerald-700"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : recommendation === 'PLC' ? (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-blue-700"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-gray-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-bold text-gray-800">
                              HarvestFile Analysis
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${getConfidenceColor(
                                confidence
                              )}`}
                            >
                              {confidence} confidence
                            </span>
                          </div>
                          <p className="text-[13px] text-gray-600 leading-relaxed">
                            {reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Historical Charts (Client Island) ── */}
          {cropData.length > 0 && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
                Payment History &amp; Enrollment Trends
              </h2>
              <CountyCharts
                cropData={cropData}
                enrollment={enrollment}
                countyName={county.display_name}
                stateAbbr={state.abbreviation}
              />
            </section>
          )}

          {/* ── Benchmark CTA (Client Island) ── */}
          <section className="mb-12">
            <CountyBenchmarkCTA
              countyFips={county.county_fips}
              countyName={county.display_name}
              stateAbbr={state.abbreviation}
            />
          </section>

          {/* ── Nearby Grain Bids (Barchart) ── */}
          <section className="mb-12">
            <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
              Nearby Grain Bids — {county.display_name}
            </h2>
            <GrainBidCard
              countyFips={county.county_fips}
              countyName={county.display_name}
              stateAbbr={state.abbreviation}
              latitude={county.latitude}
              longitude={county.longitude}
            />
          </section>

          {/* ── Live Price vs. Payment Context ── */}
          <PaymentNarrative />

          {/* ── Phase 31 Build 2: Live 2026 Election Intelligence ── */}
          {benchmarkContext && (benchmarkContext.live_2026.total > 0 || benchmarkContext.historical.length > 0) && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight">
                  Election Intelligence
                </h2>
                {benchmarkContext.live_2026.total > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Data
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Historical Trend Card */}
                {benchmarkContext.historical.length > 0 && (
                  <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#1B4332]/5 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#1B4332]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-bold text-[#1B4332]">
                        Historical Election Pattern
                      </h3>
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed mb-4">
                      {benchmarkContext.insights.summary}
                    </p>
                    <div className="space-y-2">
                      {benchmarkContext.historical.slice(-3).map((year) => (
                        <div key={year.year} className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-gray-400 w-10 shrink-0 tabular-nums">
                            {year.year}
                          </span>
                          <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-100">
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${year.arc_pct}%` }}
                            />
                            <div
                              className="bg-blue-500 transition-all"
                              style={{ width: `${year.plc_pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 w-12 text-right shrink-0">
                            {year.arc_pct}% ARC
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold ${
                          benchmarkContext.insights.trend_direction === 'TOWARD_ARC'
                            ? 'text-emerald-600'
                            : benchmarkContext.insights.trend_direction === 'TOWARD_PLC'
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }`}>
                          {benchmarkContext.insights.trend_direction === 'TOWARD_ARC'
                            ? '↑ Trending toward ARC-CO'
                            : benchmarkContext.insights.trend_direction === 'TOWARD_PLC'
                            ? '↑ Trending toward PLC'
                            : '→ Stable election pattern'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Avg: {benchmarkContext.insights.historical_avg_arc_pct}% ARC-CO
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live 2026 Card */}
                <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-[15px] font-bold text-[#1B4332]">
                      Live 2026 Farmer Reports
                    </h3>
                  </div>

                  {benchmarkContext.live_2026.is_visible && benchmarkContext.live_2026.total >= 5 ? (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                            <div
                              className="bg-emerald-500 transition-all flex items-center justify-center"
                              style={{ width: `${benchmarkContext.live_2026.arc_co_pct}%` }}
                            >
                              {(benchmarkContext.live_2026.arc_co_pct || 0) > 20 && (
                                <span className="text-[9px] font-bold text-white">
                                  {benchmarkContext.live_2026.arc_co_pct}%
                                </span>
                              )}
                            </div>
                            <div
                              className="bg-blue-500 transition-all flex items-center justify-center"
                              style={{ width: `${benchmarkContext.live_2026.plc_pct}%` }}
                            >
                              {(benchmarkContext.live_2026.plc_pct || 0) > 20 && (
                                <span className="text-[9px] font-bold text-white">
                                  {benchmarkContext.live_2026.plc_pct}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-[12px] font-semibold mb-4">
                        <span className="text-emerald-700">ARC-CO {benchmarkContext.live_2026.arc_co_pct}%</span>
                        <span className="text-blue-700">PLC {benchmarkContext.live_2026.plc_pct}%</span>
                      </div>
                      <p className="text-[12px] text-gray-500">
                        Based on {benchmarkContext.live_2026.total} farmer reports for {county.display_name}.
                        {benchmarkContext.social_proof.state_total > 0 && (
                          <> {benchmarkContext.social_proof.state_total} farmers across {state.abbreviation} have reported.</>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-center py-4">
                        <div className="text-[32px] font-extrabold text-[#1B4332] tabular-nums">
                          {benchmarkContext.live_2026.total}
                          <span className="text-[15px] font-bold text-gray-400 ml-1">/ 5</span>
                        </div>
                        <p className="text-[12px] text-gray-500 mt-1">
                          farmers reported in {county.display_name}
                        </p>
                        <div className="mt-3 mx-auto max-w-[200px]">
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (benchmarkContext.live_2026.total / 5) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            {Math.max(0, 5 - benchmarkContext.live_2026.total)} more needed to unlock public data
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                        <Link
                          href={`/check?county=${encodeURIComponent(county.display_name)}&state=${state.abbreviation}`}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                        >
                          Share your election — it's anonymous
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </>
                  )}

                  {benchmarkContext.social_proof.state_this_week > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">
                        {benchmarkContext.social_proof.state_this_week} farmer{benchmarkContext.social_proof.state_this_week !== 1 ? 's' : ''} in {state.abbreviation} reported this week
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Enrollment Breakdown ── */}
          {enrollmentSummary && enrollmentSummary.crops.length > 0 && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
                {latestYear} Election Breakdown
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollmentSummary.crops.map((crop) => (
                  <div
                    key={crop.commodity_code}
                    className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[15px] font-bold text-[#1B4332]">
                        {crop.crop_name}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {formatAcres(crop.total_acres)} acres
                      </span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden mb-2.5">
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${crop.arcco_pct}%` }}
                      />
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${crop.plc_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[12px] font-semibold">
                      <span className="text-emerald-700">
                        ARC-CO {crop.arcco_pct}%
                      </span>
                      <span className="text-blue-700">
                        PLC {crop.plc_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 2026 OBBBA Changes Banner ── */}
          <section className="mb-12">
            <div className="rounded-2xl border border-[#1B4332]/10 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] p-6 sm:p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#E2C366]/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#E2C366]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold mb-2">
                    2026 Changes Under OBBBA
                  </h3>
                  <p className="text-[13px] text-white/50 leading-relaxed mb-3">
                    The One Big Beautiful Bill Act significantly changes ARC/PLC
                    for {county.display_name}. Reference prices increased (corn
                    to $4.10/bu, soybeans to $10.00/bu), ARC guarantee rose to
                    90%, payment cap increased to 12%, and up to 30 million new
                    base acres can be added. For 2026, farmers must make an
                    affirmative annual election — no election means no payment.
                  </p>
                  <Link
                    href="/obbba"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#E2C366] hover:text-[#E2C366]/80 transition-colors"
                  >
                    Learn about OBBBA changes
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ══ BUILD 2C: Data-Driven FAQ Section ══ */}
          {faqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-6">
                Frequently Asked Questions — {county.display_name}
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
                  >
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50/50 transition-colors">
                      <h3 className="text-[14px] font-bold text-[#1B4332] pr-4">
                        {faq.question}
                      </h3>
                      <svg
                        className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </summary>
                    <div className="px-5 pb-5">
                      <p className="text-[13px] text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* ── FSA Office Info ── */}
          {(county.fsa_office_phone || county.fsa_office_address || profile?.fsa_office_phone || profile?.fsa_office_address) && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-4">
                Local FSA Office
              </h2>
              <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
                <p className="text-[14px] text-gray-700 font-medium mb-1">
                  {county.display_name} FSA Service Center
                </p>
                {(county.fsa_office_address || profile?.fsa_office_address) && (
                  <p className="text-[13px] text-gray-500">
                    {county.fsa_office_address || profile?.fsa_office_address}
                    {profile?.fsa_office_city && profile?.fsa_office_state && profile?.fsa_office_zip && (
                      <>, {profile.fsa_office_city}, {profile.fsa_office_state} {profile.fsa_office_zip}</>
                    )}
                  </p>
                )}
                {(county.fsa_office_phone || profile?.fsa_office_phone) && (
                  <p className="text-[13px] text-gray-500 mt-1">
                    Phone:{' '}
                    <a
                      href={`tel:${county.fsa_office_phone || profile?.fsa_office_phone}`}
                      className="text-[#1B4332] font-medium hover:underline"
                    >
                      {county.fsa_office_phone || profile?.fsa_office_phone}
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Nearby Counties ── */}
          {neighbors.length > 0 && (
            <section className="mb-12">
              <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-4">
                Nearby Counties in {state.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {neighbors.slice(0, 8).map((n) => (
                  <Link
                    key={n.county_fips}
                    href={`/${n.state_slug}/${n.slug}/arc-plc`}
                    className="rounded-xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-sm hover:border-[#1B4332]/20 hover:shadow-md transition-all group"
                  >
                    <span className="text-[14px] font-semibold text-[#1B4332] group-hover:text-emerald-700 transition-colors">
                      {n.display_name}
                    </span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      View ARC/PLC data →
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href={`/${stateSlug}/arc-plc`}
                  className="text-[13px] font-semibold text-[#1B4332] hover:text-emerald-700 transition-colors"
                >
                  View all {state.county_count} counties in {state.name} →
                </Link>
              </div>
            </section>
          )}

          {/* ── Free Tools CTA ── */}
          <section className="mb-12">
            <h2 className="text-[22px] font-extrabold text-[#1B4332] tracking-tight mb-4">
              Free Farm Program Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  href: '/check',
                  title: 'ARC/PLC Calculator',
                  desc: 'Side-by-side ARC-CO vs PLC comparison with real USDA data',
                },
                {
                  href: '/insurance',
                  title: 'Crop Insurance Optimizer',
                  desc: 'RP + SCO + ECO stacking with 10,000 Monte Carlo simulations',
                },
                {
                  href: '/optimize',
                  title: 'Election Optimizer',
                  desc: 'Multi-year scenario modeling for optimal program choice',
                },
                {
                  href: '/payments',
                  title: 'Payment Tracker',
                  desc: 'Track projected ARC-CO and PLC payments as MYA prices update',
                },
                {
                  href: '/fba',
                  title: 'Base Acre Analyzer',
                  desc: 'Calculate new base acre eligibility under OBBBA',
                },
                {
                  href: '/calendar',
                  title: 'Policy Calendar',
                  desc: 'Every USDA deadline and payment date in one place',
                },
              ].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
                >
                  <span className="text-[14px] font-bold text-[#1B4332] group-hover:text-emerald-700 transition-colors">
                    {tool.title}
                  </span>
                  <span className="block text-[12px] text-gray-400 mt-1 leading-relaxed">
                    {tool.desc}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Disclaimer ── */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-[10px] text-gray-400 leading-relaxed max-w-4xl">
              Data sources: USDA Farm Service Agency ARC/PLC Program Data, USDA
              NASS Quick Stats API, USDA Census of Agriculture, USDA Economic
              Research Service County Typology Codes, USDA NRCS Soil Data.
              This page is not official USDA guidance.
              HarvestFile is not affiliated with USDA. ARC/PLC election decisions
              should be made in consultation with your local FSA office or
              agricultural advisor. Payment projections are estimates based on
              historical data and may not reflect actual future payments.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
