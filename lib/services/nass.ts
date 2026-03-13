// =============================================================================
// HarvestFile - NASS Data Service (Phase 3C: State-Level Price Fallback)
// Fetches county yields + STATE-LEVEL prices so reports are always data-rich
// =============================================================================

const NASS_KEY = process.env.NASS_API_KEY || '';
const NASS_BASE = 'https://quickstats.nass.usda.gov/api/api_GET/';

// Commodity → NASS query mappings
const COMMODITY_MAP: Record<string, { nass: string; priceUnit: string; yieldUnit: string }> = {
  CORN:      { nass: 'CORN',           priceUnit: '$ / BU',      yieldUnit: 'BU / ACRE' },
  SOYBEANS:  { nass: 'SOYBEANS',       priceUnit: '$ / BU',      yieldUnit: 'BU / ACRE' },
  WHEAT:     { nass: 'WHEAT',          priceUnit: '$ / BU',      yieldUnit: 'BU / ACRE' },
  SORGHUM:   { nass: 'SORGHUM',        priceUnit: '$ / BU',      yieldUnit: 'BU / ACRE' },
  BARLEY:    { nass: 'BARLEY',         priceUnit: '$ / BU',      yieldUnit: 'BU / ACRE' },
  OATS:      { nass: 'OATS',           priceUnit: '$ / BU',      yieldUnit: 'BU / ACRE' },
  RICE:      { nass: 'RICE',           priceUnit: '$ / CWT',     yieldUnit: 'CWT / ACRE' },
  PEANUTS:   { nass: 'PEANUTS',        priceUnit: '$ / LB',      yieldUnit: 'LB / ACRE' },
  COTTON:    { nass: 'COTTON, UPLAND', priceUnit: '$ / LB',      yieldUnit: 'LB / ACRE' },
};

export interface NassYieldData {
  year: number;
  value: number;
}

export interface NassPriceData {
  year: number;
  price: number;
  source: 'county' | 'state' | 'national';
}

export interface NassDataResult {
  yields: NassYieldData[];
  prices: NassPriceData[];
  benchmarkYield: number | null;
  averagePrice: number | null;
  priceSource: 'county' | 'state' | 'national' | null;
  errors: string[];
}

// ─── Helper: Olympic Average (drop high & low, average the rest) ────────────
function olympicAverage(values: number[]): number {
  if (values.length < 3) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

// ─── Helper: Clean NASS value ───────────────────────────────────────────────
function cleanNassValue(val: string): number | null {
  if (!val || ['(D)', '(Z)', '(NA)', '(S)', '(X)'].includes(val.trim())) {
    return null;
  }
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── Fetch NASS Data ────────────────────────────────────────────────────────
async function fetchNass(params: Record<string, string>): Promise<any[]> {
  const url = new URL(NASS_BASE);
  url.searchParams.set('key', NASS_KEY);
  url.searchParams.set('format', 'JSON');
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`NASS API error: ${res.status} for params:`, params);
      return [];
    }
    const data = await res.json();
    return data?.data || [];
  } catch (err) {
    console.error('NASS fetch failed:', err);
    return [];
  }
}

// ─── Fetch County-Level Yields ──────────────────────────────────────────────
async function fetchCountyYields(
  commodity: string,
  state: string,
  county: string,
  startYear: number = 2018,
  endYear: number = 2024
): Promise<NassYieldData[]> {
  const config = COMMODITY_MAP[commodity.toUpperCase()];
  if (!config) return [];

  const data = await fetchNass({
    source_desc: 'SURVEY',
    commodity_desc: config.nass,
    statisticcat_desc: 'YIELD',
    unit_desc: config.yieldUnit,
    agg_level_desc: 'COUNTY',
    state_alpha: state.toUpperCase(),
    county_name: county.toUpperCase(),
    year__GE: startYear.toString(),
    year__LE: endYear.toString(),
  });

  return data
    .map((d: any) => {
      const val = cleanNassValue(d.Value);
      return val !== null ? { year: +d.year, value: Math.round(val * 10) / 10 } : null;
    })
    .filter((d: NassYieldData | null): d is NassYieldData => d !== null)
    .sort((a: NassYieldData, b: NassYieldData) => a.year - b.year);
}

// ─── Fetch Prices: County → State → National (cascading fallback) ───────────
async function fetchPrices(
  commodity: string,
  state: string,
  county: string,
  startYear: number = 2018,
  endYear: number = 2024
): Promise<{ prices: NassPriceData[]; source: 'county' | 'state' | 'national' }> {
  const config = COMMODITY_MAP[commodity.toUpperCase()];
  if (!config) return { prices: [], source: 'national' };

  // 1️⃣ Try county-level prices first
  const countyData = await fetchNass({
    source_desc: 'SURVEY',
    commodity_desc: config.nass,
    statisticcat_desc: 'PRICE RECEIVED',
    unit_desc: config.priceUnit,
    agg_level_desc: 'COUNTY',
    state_alpha: state.toUpperCase(),
    county_name: county.toUpperCase(),
    year__GE: startYear.toString(),
    year__LE: endYear.toString(),
  });

  const countyPrices = countyData
    .map((d: any) => {
      const val = cleanNassValue(d.Value);
      return val !== null ? { year: +d.year, price: val, source: 'county' as const } : null;
    })
    .filter((d: NassPriceData | null): d is NassPriceData => d !== null);

  if (countyPrices.length >= 3) {
    return { prices: countyPrices.sort((a, b) => a.year - b.year), source: 'county' };
  }

  // 2️⃣ Fallback: STATE-LEVEL prices (this is the critical fix!)
  const stateData = await fetchNass({
    source_desc: 'SURVEY',
    commodity_desc: config.nass,
    statisticcat_desc: 'PRICE RECEIVED',
    unit_desc: config.priceUnit,
    agg_level_desc: 'STATE',
    state_alpha: state.toUpperCase(),
    year__GE: startYear.toString(),
    year__LE: endYear.toString(),
  });

  const statePrices = stateData
    .map((d: any) => {
      const val = cleanNassValue(d.Value);
      return val !== null ? { year: +d.year, price: val, source: 'state' as const } : null;
    })
    .filter((d: NassPriceData | null): d is NassPriceData => d !== null);

  if (statePrices.length >= 2) {
    return { prices: statePrices.sort((a, b) => a.year - b.year), source: 'state' };
  }

  // 3️⃣ Last resort: NATIONAL-LEVEL prices
  const nationalData = await fetchNass({
    source_desc: 'SURVEY',
    commodity_desc: config.nass,
    statisticcat_desc: 'PRICE RECEIVED',
    unit_desc: config.priceUnit,
    agg_level_desc: 'NATIONAL',
    year__GE: startYear.toString(),
    year__LE: endYear.toString(),
  });

  const nationalPrices = nationalData
    .map((d: any) => {
      const val = cleanNassValue(d.Value);
      return val !== null ? { year: +d.year, price: val, source: 'national' as const } : null;
    })
    .filter((d: NassPriceData | null): d is NassPriceData => d !== null);

  return { prices: nationalPrices.sort((a, b) => a.year - b.year), source: 'national' };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: Get all NASS data for a commodity in a county
// ═══════════════════════════════════════════════════════════════════════════
export async function getNassData(
  commodity: string,
  state: string,
  county: string
): Promise<NassDataResult> {
  const errors: string[] = [];

  // Fetch yields and prices in parallel
  const [yields, priceResult] = await Promise.all([
    fetchCountyYields(commodity, state, county),
    fetchPrices(commodity, state, county),
  ]);

  // Calculate benchmark yield (Olympic average)
  let benchmarkYield: number | null = null;
  if (yields.length >= 3) {
    benchmarkYield = Math.round(olympicAverage(yields.map(y => y.value)) * 10) / 10;
  } else if (yields.length > 0) {
    benchmarkYield = Math.round(yields.reduce((sum, y) => sum + y.value, 0) / yields.length * 10) / 10;
    errors.push(`Only ${yields.length} years of yield data available (need 3+ for Olympic avg)`);
  } else {
    errors.push('No county yield data found');
  }

  // Calculate average price
  let averagePrice: number | null = null;
  if (priceResult.prices.length > 0) {
    averagePrice = Math.round(
      priceResult.prices.reduce((sum, p) => sum + p.price, 0) / priceResult.prices.length * 100
    ) / 100;
  } else {
    errors.push('No price data found at any level');
  }

  return {
    yields,
    prices: priceResult.prices,
    benchmarkYield,
    averagePrice,
    priceSource: priceResult.prices.length > 0 ? priceResult.source : null,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fetch state-level commodity prices for the price dashboard
// ═══════════════════════════════════════════════════════════════════════════
export async function getStatePriceDashboard(
  state: string,
  commodities: string[] = ['CORN', 'SOYBEANS', 'WHEAT']
): Promise<Record<string, NassPriceData[]>> {
  const results: Record<string, NassPriceData[]> = {};

  await Promise.all(
    commodities.map(async (commodity) => {
      const config = COMMODITY_MAP[commodity.toUpperCase()];
      if (!config) return;

      // Get state-level prices for the last 7 years for charts
      const data = await fetchNass({
        source_desc: 'SURVEY',
        commodity_desc: config.nass,
        statisticcat_desc: 'PRICE RECEIVED',
        unit_desc: config.priceUnit,
        agg_level_desc: 'STATE',
        state_alpha: state.toUpperCase(),
        year__GE: '2017',
        year__LE: '2024',
      });

      results[commodity] = data
        .map((d: any) => {
          const val = cleanNassValue(d.Value);
          return val !== null ? { year: +d.year, price: val, source: 'state' as const } : null;
        })
        .filter((d: NassPriceData | null): d is NassPriceData => d !== null)
        .sort((a: NassPriceData, b: NassPriceData) => a.year - b.year);
    })
  );

  return results;
}
