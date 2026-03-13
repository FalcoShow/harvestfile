// =============================================================================
// lib/services/usda-nass.ts
// USDA NASS QuickStats API Service for HarvestFile
// Fetches crop prices, yields, acreage, and production data by county
// =============================================================================

const NASS_BASE_URL = 'https://quickstats.nass.usda.gov/api';

interface NASSQueryParams {
  source_desc?: string;        // 'SURVEY' or 'CENSUS'
  sector_desc?: string;        // 'CROPS', 'ANIMALS & PRODUCTS'
  group_desc?: string;         // 'FIELD CROPS', 'FRUIT & TREE NUTS'
  commodity_desc?: string;     // 'CORN', 'SOYBEANS', 'WHEAT'
  statisticcat_desc?: string;  // 'PRICE RECEIVED', 'YIELD', 'PRODUCTION'
  unit_desc?: string;          // '$ / BU', 'BU / ACRE'
  domain_desc?: string;        // 'TOTAL'
  agg_level_desc?: string;     // 'NATIONAL', 'STATE', 'COUNTY'
  state_alpha?: string;        // 'OH', 'IA', 'IL'
  county_name?: string;        // 'SUMMIT', 'WAYNE'
  year?: string;               // '2024' or '2020:2024' for range
  freq_desc?: string;          // 'ANNUAL', 'MONTHLY', 'MARKETING YEAR'
  reference_period_desc?: string; // 'YEAR', 'JAN', 'MARKETING YEAR'
  format?: string;             // 'JSON' or 'CSV'
}

interface NASSRecord {
  source_desc: string;
  sector_desc: string;
  group_desc: string;
  commodity_desc: string;
  class_desc: string;
  prodn_practice_desc: string;
  util_practice_desc: string;
  statisticcat_desc: string;
  unit_desc: string;
  short_desc: string;
  domain_desc: string;
  domaincat_desc: string;
  agg_level_desc: string;
  state_alpha: string;
  state_name: string;
  county_name: string;
  county_code: string;
  region_desc: string;
  zip_5: string;
  watershed_code: string;
  congr_district_code: string;
  country_code: string;
  country_name: string;
  location_desc: string;
  year: number;
  freq_desc: string;
  begin_code: string;
  end_code: string;
  reference_period_desc: string;
  week_ending: string;
  load_time: string;
  Value: string;    // NOTE: This is a string with commas, may contain "(D)" for withheld
  CV: string;
}

interface NASSResponse {
  data: NASSRecord[];
}

// ── Helper: Parse NASS value string into number ─────────────────────────────
function parseNASSValue(val: string): number | null {
  if (!val || val === '(D)' || val === '(Z)' || val === '(NA)' || val === '(S)' || val === '(H)') {
    return null; // Suppressed or unavailable
  }
  // Remove commas and convert
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ── Core API fetch ──────────────────────────────────────────────────────────
async function fetchNASS(params: NASSQueryParams): Promise<NASSRecord[]> {
  const apiKey = process.env.NASS_API_KEY;
  if (!apiKey) {
    throw new Error('NASS_API_KEY not configured');
  }

  const queryParams = new URLSearchParams({ key: apiKey, format: 'JSON' });
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, value);
    }
  }

  // First check count to avoid huge responses
  const countUrl = `${NASS_BASE_URL}/get_counts/?${queryParams.toString()}`;
  const countRes = await fetch(countUrl, { 
    next: { revalidate: 3600 } // Cache for 1 hour
  });
  
  if (!countRes.ok) {
    throw new Error(`NASS count check failed: ${countRes.status}`);
  }
  
  const countData = await countRes.json();
  const count = parseInt(countData?.count || '0');
  
  if (count === 0) return [];
  if (count > 50000) {
    console.warn(`NASS query returns ${count} records — consider narrowing filters`);
  }

  // Fetch actual data
  const dataUrl = `${NASS_BASE_URL}/api_GET/?${queryParams.toString()}`;
  const dataRes = await fetch(dataUrl, {
    next: { revalidate: 3600 }
  });

  if (!dataRes.ok) {
    if (dataRes.status === 429) {
      // Rate limited — wait and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryRes = await fetch(dataUrl);
      if (!retryRes.ok) throw new Error(`NASS API rate limited after retry`);
      const retryData: NASSResponse = await retryRes.json();
      return retryData.data || [];
    }
    throw new Error(`NASS API error: ${dataRes.status}`);
  }

  const data: NASSResponse = await dataRes.json();
  return data.data || [];
}


// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC API: High-level data fetching functions
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get crop prices received by farmers for a specific state/commodity
 * Returns marketing year average prices
 */
export async function getCropPrices(opts: {
  commodity: string;    // 'CORN', 'SOYBEANS', 'WHEAT'
  state: string;        // 'OH', 'IA'
  years?: string;       // '2020:2025' — defaults to last 6 years
}): Promise<Array<{ year: number; price: number | null; unit: string }>> {
  const currentYear = new Date().getFullYear();
  const yearRange = opts.years || `${currentYear - 5}:${currentYear}`;

  const records = await fetchNASS({
    source_desc: 'SURVEY',
    commodity_desc: opts.commodity.toUpperCase(),
    statisticcat_desc: 'PRICE RECEIVED',
    agg_level_desc: 'STATE',
    state_alpha: opts.state.toUpperCase(),
    year: yearRange,
    freq_desc: 'MARKETING YEAR',
  });

  return records.map(r => ({
    year: r.year,
    price: parseNASSValue(r.Value),
    unit: r.unit_desc,
  })).sort((a, b) => a.year - b.year);
}


/**
 * Get county-level crop yields
 * Returns yield per acre for the specified crop and county
 */
export async function getCountyYields(opts: {
  commodity: string;
  state: string;
  county: string;
  years?: string;
}): Promise<Array<{ year: number; yield: number | null; unit: string; production: number | null; acres_harvested: number | null }>> {
  const currentYear = new Date().getFullYear();
  const yearRange = opts.years || `${currentYear - 9}:${currentYear}`;

  const records = await fetchNASS({
    source_desc: 'SURVEY',
    commodity_desc: opts.commodity.toUpperCase(),
    statisticcat_desc: 'YIELD',
    agg_level_desc: 'COUNTY',
    state_alpha: opts.state.toUpperCase(),
    county_name: opts.county.toUpperCase(),
    year: yearRange,
    freq_desc: 'ANNUAL',
  });

  // Also fetch production and acreage
  const productionRecords = await fetchNASS({
    source_desc: 'SURVEY',
    commodity_desc: opts.commodity.toUpperCase(),
    statisticcat_desc: 'PRODUCTION',
    agg_level_desc: 'COUNTY',
    state_alpha: opts.state.toUpperCase(),
    county_name: opts.county.toUpperCase(),
    year: yearRange,
    freq_desc: 'ANNUAL',
  });

  const acreageRecords = await fetchNASS({
    source_desc: 'SURVEY',
    commodity_desc: opts.commodity.toUpperCase(),
    statisticcat_desc: 'AREA HARVESTED',
    agg_level_desc: 'COUNTY',
    state_alpha: opts.state.toUpperCase(),
    county_name: opts.county.toUpperCase(),
    year: yearRange,
    freq_desc: 'ANNUAL',
  });

  const productionByYear = new Map(productionRecords.map(r => [r.year, parseNASSValue(r.Value)]));
  const acresByYear = new Map(acreageRecords.map(r => [r.year, parseNASSValue(r.Value)]));

  return records.map(r => ({
    year: r.year,
    yield: parseNASSValue(r.Value),
    unit: r.unit_desc,
    production: productionByYear.get(r.year) ?? null,
    acres_harvested: acresByYear.get(r.year) ?? null,
  })).sort((a, b) => a.year - b.year);
}


/**
 * Get state-level crop prices for multiple commodities at once
 * Used for market intelligence reports
 */
export async function getMultiCommodityPrices(opts: {
  commodities: string[];
  state: string;
  years?: string;
}): Promise<Record<string, Array<{ year: number; price: number | null; unit: string }>>> {
  const results: Record<string, Array<{ year: number; price: number | null; unit: string }>> = {};
  
  // Fetch all commodities in parallel
  const fetches = opts.commodities.map(async (commodity) => {
    const prices = await getCropPrices({
      commodity,
      state: opts.state,
      years: opts.years,
    });
    results[commodity] = prices;
  });

  await Promise.all(fetches);
  return results;
}


/**
 * Get national monthly prices for commodity — most recent available
 * Used for current price dashboard
 */
export async function getNationalMonthlyPrices(opts: {
  commodity: string;
  months?: number;     // How many months back — defaults to 12
}): Promise<Array<{ year: number; month: string; price: number | null; unit: string }>> {
  const currentYear = new Date().getFullYear();
  const yearRange = `${currentYear - 1}:${currentYear}`;

  const records = await fetchNASS({
    source_desc: 'SURVEY',
    commodity_desc: opts.commodity.toUpperCase(),
    statisticcat_desc: 'PRICE RECEIVED',
    agg_level_desc: 'NATIONAL',
    year: yearRange,
    freq_desc: 'MONTHLY',
  });

  return records
    .map(r => ({
      year: r.year,
      month: r.reference_period_desc,
      price: parseNASSValue(r.Value),
      unit: r.unit_desc,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      return months.indexOf(a.month) - months.indexOf(b.month);
    })
    .slice(-(opts.months || 12));
}


/**
 * Get land rent values for a county
 */
export async function getCountyRentValues(opts: {
  state: string;
  county: string;
  years?: string;
}): Promise<Array<{ year: number; rent_cropland: number | null; rent_pasture: number | null }>> {
  const currentYear = new Date().getFullYear();
  const yearRange = opts.years || `${currentYear - 5}:${currentYear}`;

  const croplandRecords = await fetchNASS({
    source_desc: 'SURVEY',
    commodity_desc: 'RENT',
    statisticcat_desc: 'EXPENSE',
    unit_desc: '$ / ACRE',
    agg_level_desc: 'COUNTY',
    state_alpha: opts.state.toUpperCase(),
    county_name: opts.county.toUpperCase(),
    year: yearRange,
    domain_desc: 'TOTAL',
  });

  // Group by year and type
  const byYear = new Map<number, { cropland: number | null; pasture: number | null }>();
  
  for (const r of croplandRecords) {
    if (!byYear.has(r.year)) byYear.set(r.year, { cropland: null, pasture: null });
    const entry = byYear.get(r.year)!;
    
    if (r.short_desc.includes('CROPLAND')) {
      entry.cropland = parseNASSValue(r.Value);
    } else if (r.short_desc.includes('PASTURE')) {
      entry.pasture = parseNASSValue(r.Value);
    }
  }

  return Array.from(byYear.entries())
    .map(([year, data]) => ({
      year,
      rent_cropland: data.cropland,
      rent_pasture: data.pasture,
    }))
    .sort((a, b) => a.year - b.year);
}


/**
 * Get available commodities for a county
 * Useful for the report wizard dropdown
 */
export async function getCountyCommodities(opts: {
  state: string;
  county: string;
}): Promise<string[]> {
  const currentYear = new Date().getFullYear();

  const records = await fetchNASS({
    source_desc: 'SURVEY',
    sector_desc: 'CROPS',
    statisticcat_desc: 'AREA PLANTED',
    agg_level_desc: 'COUNTY',
    state_alpha: opts.state.toUpperCase(),
    county_name: opts.county.toUpperCase(),
    year: `${currentYear - 2}:${currentYear}`,
    freq_desc: 'ANNUAL',
  });

  const commodities = [...new Set(records.map(r => r.commodity_desc))];
  return commodities.sort();
}


// ── Export everything ───────────────────────────────────────────────────────
export const nassService = {
  getCropPrices,
  getCountyYields,
  getMultiCommodityPrices,
  getNationalMonthlyPrices,
  getCountyRentValues,
  getCountyCommodities,
  fetchNASS,           // For advanced custom queries
  parseNASSValue,      // Utility
};
