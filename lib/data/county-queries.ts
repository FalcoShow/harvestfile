// =============================================================================
// HarvestFile — County & State Data Queries
// Phase 5A-2: Server-side data fetching for SEO pages
// Build 4 Deploy 3: Added getCountyBySlugAny for 404 fallback pages
// =============================================================================

import { supabasePublic } from '@/lib/supabase/public';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StateData {
  state_fips: string;
  abbreviation: string;
  name: string;
  slug: string;
  region: string | null;
  county_count: number;
}

export interface CountyListItem {
  county_fips: string;
  display_name: string;
  slug: string;
  top_commodity: string | null;
  total_base_acres: number;
}

export interface CountyData {
  county_fips: string;
  state_fips: string;
  name: string;
  display_name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  total_base_acres: number;
  fsa_office_phone: string | null;
  fsa_office_address: string | null;
}

export interface CropYearData {
  crop_year: number;
  county_yield: number | null;
  benchmark_yield: number | null;
  benchmark_revenue: number | null;
  arc_guarantee: number | null;
  arc_actual_revenue: number | null;
  arc_payment_rate: number | null;
  mya_price: number | null;
  plc_payment_rate: number | null;
  planted_acres: number | null;
}

export interface CommodityGroup {
  commodity_code: string;
  display_name: string;
  unit: string;
  unit_label: string;
  statutory_ref_price: number;
  effective_ref_price: number | null;
  years: CropYearData[];
}

export interface NeighborCounty {
  county_fips: string;
  display_name: string;
  slug: string;
  state_slug: string;
}

// ─── State Queries ───────────────────────────────────────────────────────────

export async function getAllStatesWithData(): Promise<StateData[]> {
  const { data, error } = await supabasePublic
    .from('states')
    .select('state_fips, abbreviation, name, slug, region, county_count')
    .gt('county_count', 0)
    .order('name');

  if (error) {
    console.error('Failed to fetch states:', error.message);
    return [];
  }
  return data || [];
}

export async function getStateBySlug(slug: string): Promise<StateData | null> {
  const { data, error } = await supabasePublic
    .from('states')
    .select('state_fips, abbreviation, name, slug, region, county_count')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

export async function getCountiesForState(stateFips: string): Promise<CountyListItem[]> {
  const { data, error } = await supabasePublic
    .from('counties')
    .select('county_fips, display_name, slug, top_commodity, total_base_acres')
    .eq('state_fips', stateFips)
    .eq('has_arc_plc_data', true)
    .order('display_name');

  if (error) {
    console.error('Failed to fetch counties:', error.message);
    return [];
  }
  return data || [];
}

// ─── County Queries ──────────────────────────────────────────────────────────

/**
 * Get county data for counties WITH ARC/PLC data.
 * Used for the full county page with crop analysis, payment history, etc.
 */
export async function getCountyBySlug(
  stateSlug: string,
  countySlug: string
): Promise<{ county: CountyData; state: StateData } | null> {
  // First get state
  const state = await getStateBySlug(stateSlug);
  if (!state) return null;

  const { data: county, error } = await supabasePublic
    .from('counties')
    .select('county_fips, state_fips, name, display_name, slug, latitude, longitude, total_base_acres, fsa_office_phone, fsa_office_address')
    .eq('state_fips', state.state_fips)
    .eq('slug', countySlug)
    .eq('has_arc_plc_data', true)
    .single();

  if (error || !county) return null;
  return { county, state };
}

/**
 * Get county data for ANY county — no has_arc_plc_data filter.
 * Used as a fallback for counties that exist but don't have ARC/PLC data.
 * These render a partial page with general county info, grain bids,
 * neighboring county links, and a CTA instead of a 404.
 */
export async function getCountyBySlugAny(
  stateSlug: string,
  countySlug: string
): Promise<{ county: CountyData; state: StateData } | null> {
  const state = await getStateBySlug(stateSlug);
  if (!state) return null;

  const { data: county, error } = await supabasePublic
    .from('counties')
    .select('county_fips, state_fips, name, display_name, slug, latitude, longitude, total_base_acres, fsa_office_phone, fsa_office_address')
    .eq('state_fips', state.state_fips)
    .eq('slug', countySlug)
    .single();

  if (error || !county) return null;
  return { county, state };
}

export async function getCountyCropData(countyFips: string): Promise<CommodityGroup[]> {
  // Get all crop data for this county
  const { data: cropData, error: cropError } = await supabasePublic
    .from('county_crop_data')
    .select('commodity_code, crop_year, county_yield, benchmark_yield, benchmark_revenue, arc_guarantee, arc_actual_revenue, arc_payment_rate, mya_price, plc_payment_rate, planted_acres')
    .eq('county_fips', countyFips)
    .order('crop_year', { ascending: false });

  if (cropError || !cropData) return [];

  // Get commodity reference data
  const commodityCodes = Array.from(new Set(cropData.map(r => r.commodity_code)));
  const { data: commodities } = await supabasePublic
    .from('commodity_reference')
    .select('commodity_code, display_name, unit, unit_label, statutory_ref_price, effective_ref_price, sort_order')
    .in('commodity_code', commodityCodes)
    .order('sort_order');

  if (!commodities) return [];

  // Group crop data by commodity
  const groups: CommodityGroup[] = commodities.map(comm => ({
    commodity_code: comm.commodity_code,
    display_name: comm.display_name,
    unit: comm.unit,
    unit_label: comm.unit_label,
    statutory_ref_price: comm.statutory_ref_price,
    effective_ref_price: comm.effective_ref_price,
    years: cropData
      .filter(r => r.commodity_code === comm.commodity_code)
      .map(r => ({
        crop_year: r.crop_year,
        county_yield: r.county_yield,
        benchmark_yield: r.benchmark_yield,
        benchmark_revenue: r.benchmark_revenue,
        arc_guarantee: r.arc_guarantee,
        arc_actual_revenue: r.arc_actual_revenue,
        arc_payment_rate: r.arc_payment_rate,
        mya_price: r.mya_price,
        plc_payment_rate: r.plc_payment_rate,
        planted_acres: r.planted_acres,
      })),
  }));

  return groups.filter(g => g.years.length > 0);
}

export async function getNeighborCounties(
  stateFips: string,
  currentCountyFips: string
): Promise<NeighborCounty[]> {
  // Get other counties in the same state (simple approach — same state neighbors)
  const { data: stateData } = await supabasePublic
    .from('states')
    .select('slug')
    .eq('state_fips', stateFips)
    .single();

  const { data: neighbors } = await supabasePublic
    .from('counties')
    .select('county_fips, display_name, slug')
    .eq('state_fips', stateFips)
    .eq('has_arc_plc_data', true)
    .neq('county_fips', currentCountyFips)
    .order('display_name')
    .limit(12);

  if (!neighbors || !stateData) return [];

  return neighbors.map(n => ({
    ...n,
    state_slug: stateData.slug,
  }));
}

// ─── Sitemap Queries ─────────────────────────────────────────────────────────

export async function getAllCountySlugs(): Promise<
  { stateSlug: string; countySlug: string }[]
> {
  const { data, error } = await supabasePublic
    .from('counties')
    .select('slug, states!inner(slug)')
    .eq('has_arc_plc_data', true);

  if (error || !data) return [];

  return data.map((row: any) => ({
    stateSlug: row.states.slug,
    countySlug: row.slug,
  }));
}

// ─── Recommendation Logic (rule-based, no AI needed for initial display) ────

export function getRecommendation(cropData: CommodityGroup): {
  recommendation: 'ARC-CO' | 'PLC' | 'NEUTRAL';
  reasoning: string;
  confidence: string;
} {
  if (cropData.years.length < 3) {
    return { recommendation: 'NEUTRAL', reasoning: 'Insufficient historical data for a reliable recommendation.', confidence: 'low' };
  }

  // Get the most recent years with benchmark data
  const recentWithBench = cropData.years
    .filter(y => y.benchmark_yield != null && y.arc_payment_rate != null)
    .slice(0, 5);

  if (recentWithBench.length < 2) {
    return { recommendation: 'NEUTRAL', reasoning: 'Not enough benchmark data to compare programs reliably.', confidence: 'low' };
  }

  // Count years where ARC paid more vs PLC paid more
  let arcWins = 0;
  let plcWins = 0;
  let totalArcPayment = 0;
  let totalPlcPayment = 0;

  for (const year of recentWithBench) {
    const arcPmt = year.arc_payment_rate || 0;
    const plcPmt = year.plc_payment_rate || 0;
    totalArcPayment += arcPmt;
    totalPlcPayment += plcPmt;
    if (arcPmt > plcPmt) arcWins++;
    else if (plcPmt > arcPmt) plcWins++;
  }

  // Check yield variability (high variability favors ARC-CO)
  const yields = cropData.years
    .filter(y => y.county_yield != null)
    .map(y => y.county_yield!);
  const avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;
  const variance = yields.reduce((a, y) => a + Math.pow(y - avgYield, 2), 0) / yields.length;
  const cv = Math.sqrt(variance) / avgYield; // coefficient of variation

  // Decision logic
  if (totalArcPayment > totalPlcPayment * 1.5 && arcWins > plcWins) {
    return {
      recommendation: 'ARC-CO',
      reasoning: `ARC-CO has historically outperformed PLC in ${cropData.display_name} for this county, paying an average of $${(totalArcPayment / recentWithBench.length).toFixed(2)}/acre vs PLC's $${(totalPlcPayment / recentWithBench.length).toFixed(2)}/acre over the last ${recentWithBench.length} calculated years.${cv > 0.12 ? ' The county\'s yield variability further favors ARC-CO\'s revenue-based protection.' : ''}`,
      confidence: arcWins >= 3 ? 'high' : 'moderate',
    };
  }

  if (totalPlcPayment > totalArcPayment * 1.5 && plcWins > arcWins) {
    return {
      recommendation: 'PLC',
      reasoning: `PLC has historically outperformed ARC-CO for ${cropData.display_name} in this county, with stronger price-based protection. Under OBBBA's increased reference price of $${cropData.statutory_ref_price}/${cropData.unit_label}, PLC provides a higher safety net floor.`,
      confidence: plcWins >= 3 ? 'high' : 'moderate',
    };
  }

  // Close call — look at current conditions
  if (cv > 0.15) {
    return {
      recommendation: 'ARC-CO',
      reasoning: `This county has significant yield variability (CV: ${(cv * 100).toFixed(0)}%), which historically favors ARC-CO's revenue-based guarantee over PLC's price-only protection. Under OBBBA, ARC-CO's guarantee band expanded to 90% of benchmark revenue.`,
      confidence: 'moderate',
    };
  }

  return {
    recommendation: 'PLC',
    reasoning: `With relatively stable yields in this county, PLC's enhanced reference price of $${cropData.statutory_ref_price}/${cropData.unit_label} under OBBBA provides stronger downside protection. PLC is generally favored when yields are consistent and price risk is the primary concern.`,
    confidence: 'moderate',
  };
}
