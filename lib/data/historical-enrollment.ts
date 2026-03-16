// =============================================================================
// HarvestFile — Phase 7B: Historical Enrollment Queries
// Server-side data fetching for FSA county-level ARC/PLC enrollment history.
//
// Used by:
//   - County page historical context section
//   - Dynamic OG image generation
//   - BenchmarkWidget (baseline comparison)
// =============================================================================

import { supabasePublic } from '@/lib/supabase/public';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HistoricalEnrollment {
  county_fips: string;
  state_name: string;
  county_name: string;
  crop_name: string;
  commodity_code: string;
  program_year: number;
  arcco_acres: number;
  plc_acres: number;
  total_acres: number;
  arcco_pct: number;
  plc_pct: number;
}

export interface CountyEnrollmentSummary {
  county_fips: string;
  state_name: string;
  county_name: string;
  /** Top crop by total acres in the most recent year */
  top_crop: string;
  top_crop_code: string;
  top_crop_arcco_pct: number;
  top_crop_plc_pct: number;
  top_crop_total_acres: number;
  latest_year: number;
  /** All crops for the most recent year, sorted by total acres */
  crops: {
    crop_name: string;
    commodity_code: string;
    arcco_pct: number;
    plc_pct: number;
    total_acres: number;
  }[];
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get all historical enrollment records for a county.
 * Returns data for all crops and all years, sorted by year desc then acres desc.
 */
export async function getCountyEnrollmentHistory(
  countyFips: string
): Promise<HistoricalEnrollment[]> {
  const { data, error } = await supabasePublic
    .from('historical_enrollment')
    .select('*')
    .eq('county_fips', countyFips)
    .order('program_year', { ascending: false })
    .order('total_acres', { ascending: false });

  if (error) {
    console.error('Failed to fetch enrollment history:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Get enrollment summary for a county (latest year only).
 * Used by OG images and the county page hero section.
 */
export async function getCountyEnrollmentSummary(
  countyFips: string
): Promise<CountyEnrollmentSummary | null> {
  // Get the latest year's data for this county
  const { data, error } = await supabasePublic
    .from('historical_enrollment')
    .select('*')
    .eq('county_fips', countyFips)
    .order('program_year', { ascending: false })
    .order('total_acres', { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Find the latest year
  const latestYear = data[0].program_year;
  const latestData = data.filter(r => r.program_year === latestYear);

  if (latestData.length === 0) return null;

  const topCrop = latestData[0];

  return {
    county_fips: topCrop.county_fips,
    state_name: topCrop.state_name,
    county_name: topCrop.county_name,
    top_crop: topCrop.crop_name,
    top_crop_code: topCrop.commodity_code,
    top_crop_arcco_pct: Number(topCrop.arcco_pct),
    top_crop_plc_pct: Number(topCrop.plc_pct),
    top_crop_total_acres: Number(topCrop.total_acres),
    latest_year: latestYear,
    crops: latestData.map(r => ({
      crop_name: r.crop_name,
      commodity_code: r.commodity_code,
      arcco_pct: Number(r.arcco_pct),
      plc_pct: Number(r.plc_pct),
      total_acres: Number(r.total_acres),
    })),
  };
}

/**
 * Get multi-year trend for a specific crop in a county.
 * Used by the historical trend chart.
 */
export async function getCropEnrollmentTrend(
  countyFips: string,
  cropName: string
): Promise<HistoricalEnrollment[]> {
  const { data, error } = await supabasePublic
    .from('historical_enrollment')
    .select('*')
    .eq('county_fips', countyFips)
    .eq('crop_name', cropName)
    .order('program_year', { ascending: true });

  if (error) {
    console.error('Failed to fetch crop trend:', error.message);
    return [];
  }

  return data || [];
}
