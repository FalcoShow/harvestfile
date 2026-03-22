// =============================================================================
// HarvestFile — Phase 25 Build 1: State ARC/PLC Hub Page
// /{state}/arc-plc — Lists all counties in a state with key program data
//
// This is the hub page in the hub-and-spoke SEO architecture.
// Links to every county page within the state.
// =============================================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getStateBySlug,
  getCountiesForState,
  getAllStatesWithData,
} from '@/lib/data/county-queries';

export const revalidate = 3600;
export const dynamicParams = true;

// ── Generate state params at build time ─────────────────────────────────
export async function generateStaticParams() {
  const states = await getAllStatesWithData();
  return states.map((s) => ({ state: s.slug }));
}

// ── Dynamic Metadata ────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return { title: 'State Not Found | HarvestFile' };

  const title = `${state.name} ARC/PLC Data — County-by-County Election & Payment Analysis | HarvestFile`;
  const description = `Free ARC-CO vs PLC analysis for all ${state.county_count} farming counties in ${state.name}. Historical payments, benchmark yields, enrollment data, and 2026 projections under OBBBA. Real USDA data.`;

  return {
    title,
    description,
    openGraph: {
      title: `${state.name} ARC/PLC County Data | HarvestFile`,
      description,
      type: 'website',
      url: `https://harvestfile.com/${stateSlug}/arc-plc`,
    },
    alternates: {
      canonical: `https://harvestfile.com/${stateSlug}/arc-plc`,
    },
  };
}

// ── Utility ─────────────────────────────────────────────────────────────
function formatAcres(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000).toLocaleString()}K`;
  return n.toLocaleString();
}

// ═════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════

export default async function StateArcPlcPage({ params }: PageProps) {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();

  const counties = await getCountiesForState(state.state_fips);
  const totalAcres = counties.reduce((sum, c) => sum + (c.total_base_acres || 0), 0);

  // Group counties alphabetically by first letter
  const grouped = counties.reduce<Record<string, typeof counties>>((acc, c) => {
    const letter = c.display_name.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
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
        item: `https://harvestfile.com/${stateSlug}/arc-plc`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
              <span className="text-white/50">{state.name}</span>
            </nav>

            <h1 className="text-[clamp(28px,4.5vw,48px)] font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-4">
              {state.name}{' '}
              <span className="text-white/30">ARC/PLC Data</span>
            </h1>

            <p className="text-[14px] sm:text-[15px] text-white/40 leading-relaxed max-w-2xl mb-8">
              County-by-county ARC-CO and PLC program data for every farming
              county in {state.name}. Historical payments, benchmark yields,
              enrollment trends, and 2026 election analysis.
            </p>

            {/* KPIs */}
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-3.5">
                <div className="text-[24px] font-extrabold text-white tracking-tight">
                  {counties.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                  Farming Counties
                </div>
              </div>
              {totalAcres > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-3.5">
                  <div className="text-[24px] font-extrabold text-white tracking-tight">
                    {formatAcres(totalAcres)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                    Total Base Acres
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#FAFAF8]" />
        </section>

        {/* ═══ COUNTY GRID ═══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          {/* CTA */}
          <div className="rounded-2xl border border-[#E2C366]/20 bg-gradient-to-r from-[#FFFDF5] to-[#FFF9E6] p-5 sm:p-6 mb-10 -mt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#1B4332] mb-1">
                  Find Your County
                </h2>
                <p className="text-[13px] text-[#1B4332]/50">
                  Select your county below for detailed ARC/PLC analysis, or run
                  the free calculator for a personalized recommendation.
                </p>
              </div>
              <Link
                href="/check"
                className="shrink-0 inline-flex items-center gap-2 bg-[#1B4332] hover:bg-[#0C1F17] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#1B4332]/15 transition-all text-[14px]"
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

          {/* Alphabetical County List */}
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, letterCounties]) => (
              <div key={letter} className="mb-8">
                <h2 className="text-[20px] font-extrabold text-[#1B4332] tracking-tight mb-3 border-b border-gray-200 pb-2">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {letterCounties.map((c) => (
                    <Link
                      key={c.county_fips}
                      href={`/${stateSlug}/${c.slug}/arc-plc`}
                      className="group rounded-xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-sm hover:border-[#1B4332]/20 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-[#1B4332] group-hover:text-emerald-700 transition-colors">
                          {c.display_name}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                        {c.total_base_acres > 0 && (
                          <span>{formatAcres(c.total_base_acres)} acres</span>
                        )}
                        {c.top_commodity && <span>{c.top_commodity}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

          {/* ── Other States ── */}
          <section className="mt-16 border-t border-gray-200 pt-8">
            <h2 className="text-[18px] font-extrabold text-[#1B4332] tracking-tight mb-4">
              Other States
            </h2>
            <p className="text-[13px] text-gray-400 mb-4">
              Explore ARC/PLC data for counties in other states.
            </p>
            <Link
              href="/elections"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1B4332] hover:text-emerald-700 transition-colors"
            >
              View the National Election Map →
            </Link>
          </section>

          {/* Disclaimer */}
          <div className="border-t border-gray-200 pt-6 mt-12">
            <p className="text-[10px] text-gray-400 leading-relaxed max-w-4xl">
              Data sources: USDA Farm Service Agency ARC/PLC Program Data, USDA
              NASS Quick Stats API. This page is not official USDA guidance.
              HarvestFile is not affiliated with USDA.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
