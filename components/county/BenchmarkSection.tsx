// =============================================================================
// HarvestFile — Phase 7A: Benchmark Section (Server Component Wrapper)
// 
// This is a Server Component that pre-fetches benchmark data from Supabase,
// then passes it to the BenchmarkWidget client component.
//
// Usage in county page:
//   <BenchmarkSection
//     countyFips={county.county_fips}
//     countyName={county.display_name}
//     stateName={state.name}
//     stateAbbr={state.abbreviation}
//     cropGroups={cropGroups}
//   />
// =============================================================================

import dynamic from 'next/dynamic';
import { supabasePublic } from '@/lib/supabase/public';

// Lazy-load the client widget — no SSR (uses localStorage, window APIs)
const BenchmarkWidget = dynamic(
  () => import('@/components/county/BenchmarkWidget'),
  { ssr: false }
);

const PROGRAM_YEAR = 2026;

interface CropGroup {
  commodity_code: string;
  display_name: string;
}

interface Props {
  countyFips: string;
  countyName: string;
  stateName: string;
  stateAbbr: string;
  cropGroups: CropGroup[];
}

export async function BenchmarkSection({
  countyFips,
  countyName,
  stateName,
  stateAbbr,
  cropGroups,
}: Props) {
  // Pre-fetch benchmark data server-side for instant initial render
  let initialBenchmarks;
  let initialSocialProof;

  try {
    const { data: benchmarks } = await supabasePublic
      .from('county_benchmark_cache')
      .select('commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible, last_updated')
      .eq('county_fips', countyFips)
      .eq('program_year', PROGRAM_YEAR);

    initialBenchmarks = (benchmarks || []).map(b => ({
      commodity_code: b.commodity_code,
      arc_co_pct: b.is_visible ? Number(b.arc_co_pct) : null,
      plc_pct: b.is_visible ? Number(b.plc_pct) : null,
      total_count: b.total_count,
      is_visible: b.is_visible,
      last_updated: b.last_updated,
    }));

    // Fetch state-level social proof
    const stateFips = countyFips.substring(0, 2);
    const { data: totalActivity } = await supabasePublic
      .from('benchmark_activity')
      .select('submission_count, unique_counties')
      .eq('state_fips', stateFips);

    const totalStateSubmissions = (totalActivity || []).reduce(
      (sum, row) => sum + (row.submission_count || 0), 0
    );

    initialSocialProof = {
      state_this_week: 0,
      state_counties_this_week: 0,
      state_total: totalStateSubmissions,
    };
  } catch (err) {
    console.error('Failed to prefetch benchmarks:', err);
  }

  // Map crop groups to the format the widget expects
  const availableCrops = cropGroups.map(g => ({
    code: g.commodity_code,
    name: g.display_name,
  }));

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12">
      <BenchmarkWidget
        countyFips={countyFips}
        countyName={countyName}
        stateName={stateName}
        stateAbbr={stateAbbr}
        availableCrops={availableCrops}
        initialBenchmarks={initialBenchmarks}
        initialSocialProof={initialSocialProof}
      />
    </section>
  );
}
