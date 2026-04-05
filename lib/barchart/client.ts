// =============================================================================
// HarvestFile — Barchart OnDemand API Client
// Build 6 Deploy 1 → Deploy 3D-fix: Fixed basis unit handling
//
// DEPLOY 3D-FIX: Barchart returns basis in CENTS (not dollars).
// Removed erroneous * 100 multiplication from formatBasis().
// Fixed formatBasisDollars() to divide by 100 (cents → dollars).
//
// Server-side only. Never import this in client components.
//
// CRITICAL FIXES from previous version:
//   1. FIPS parameter: `countyCode` → `fipsCode` (Barchart's actual param name)
//   2. Commodity delimiter: comma → pipe `|` (Barchart uses pipe-delimited)
//   3. Response normalization: Updated to match actual API field names
//      (company not name, lat/lng as strings, cashprice not cashPrice, etc.)
//
// Endpoints (confirmed 3/27/2026 via Thomas Willis @ Barchart):
//   - getGrainBids: Cash grain bids by FIPS, zip, or coordinates
//   - getGrainInstruments: Instrument metadata / symbology lookup
//   - getHistory: Historical basis/cash price time series
//   - getUSDAGrainPrices: USDA-sourced terminal/export/processor prices
//
// Caching: In-memory Map with market-aware TTLs.
//   - Market hours (Mon-Fri 6AM-4PM CT): 15 min for bids
//   - Off-hours: 2 hours for bids
//   - Weekends: 4 hours for bids
//   - USDA prices: 60 min
//   - Historical data: 24 hrs
// =============================================================================

import type {
  BarchartGrainBidsResponse,
  BarchartRawLocation,
  BarchartRawBid,
  BarchartUSDAGrainPricesResponse,
  BarchartRawUSDAPrice,
  BarchartHistoryResponse,
  BarchartRawHistoryEntry,
  GrainElevator,
  NormalizedBid,
  CacheEntry,
} from './types';

// ── Configuration ────────────────────────────────────────────────────────

const BARCHART_BASE_URL = 'https://ondemand.websol.barchart.com';

function getApiKey(): string {
  const key = process.env.BARCHART_API_KEY;
  if (!key || key === 'SANDBOX_KEY_PENDING') {
    throw new Error('[Barchart] BARCHART_API_KEY is not configured');
  }
  return key;
}

// ── In-Memory Cache ──────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  // Prevent unbounded growth
  if (cache.size > 500) {
    const now = Date.now();
    const entries = Array.from(cache.entries());
    for (const [k, v] of entries) {
      if (now - v.timestamp > v.ttl) cache.delete(k);
    }
  }
}

// ── Stale cache fallback (serve expired data rather than nothing) ────────

function getStaleCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry.data;
}

// ── Market-Aware Cache TTLs ──────────────────────────────────────────────

function getChicagoTime(): { hour: number; day: number } {
  const ct = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  );
  return { hour: ct.getHours(), day: ct.getDay() };
}

function isMarketHours(): boolean {
  const { hour, day } = getChicagoTime();
  // CBOT grain: Mon-Fri. Regular session ~8:30 AM - 1:20 PM CT
  // Extended hours: 7 PM - 7:45 AM CT. Simplify to weekdays 6 AM - 4 PM CT
  return day >= 1 && day <= 5 && hour >= 6 && hour < 16;
}

const TTL = {
  GRAIN_BIDS_MARKET: 15 * 60 * 1000,       // 15 minutes during market hours
  GRAIN_BIDS_OFFHOURS: 2 * 60 * 60 * 1000, // 2 hours off-hours weekdays
  GRAIN_BIDS_WEEKEND: 4 * 60 * 60 * 1000,  // 4 hours weekends
  USDA_PRICES: 60 * 60 * 1000,              // 60 minutes
  HISTORY: 24 * 60 * 60 * 1000,             // 24 hours
  INSTRUMENTS: 24 * 60 * 60 * 1000,         // 24 hours
} as const;

function getGrainBidTTL(): number {
  const { hour, day } = getChicagoTime();
  if (day === 0 || day === 6) return TTL.GRAIN_BIDS_WEEKEND;
  if (hour >= 6 && hour < 16) return TTL.GRAIN_BIDS_MARKET;
  return TTL.GRAIN_BIDS_OFFHOURS;
}

// ── Query Budget Tracking ────────────────────────────────────────────────

let queryCount = 0;
let queryCountResetDate = new Date().toISOString().slice(0, 10);
const DAILY_SOFT_LIMIT = 3_333; // ~100K/month ÷ 30

function trackQuery(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== queryCountResetDate) {
    queryCount = 0;
    queryCountResetDate = today;
  }
  queryCount++;

  if (queryCount > DAILY_SOFT_LIMIT) {
    console.warn(`[Barchart] Daily query soft limit reached: ${queryCount}/${DAILY_SOFT_LIMIT}`);
  }

  // Hard stop at 120% of daily budget
  return queryCount <= DAILY_SOFT_LIMIT * 1.2;
}

// ── Core Fetch with Retry ────────────────────────────────────────────────

async function barchartFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  maxRetries: number = 2
): Promise<T> {
  if (!trackQuery()) {
    throw new Error('[Barchart] Daily query budget exceeded');
  }

  const url = new URL(`${BARCHART_BASE_URL}/${endpoint}.json`);
  url.searchParams.set('apikey', getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        // Let Next.js Data Cache handle caching at fetch level
        next: { revalidate: 300 },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        // Rate limited or server error — retry
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(
          `[Barchart] ${endpoint} returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Barchart returns status.code in the JSON body
      if (data?.status?.code !== 200 && data?.status?.code !== undefined) {
        throw new Error(
          `[Barchart] API error on ${endpoint}: ${data?.status?.message || 'Unknown error'}`
        );
      }

      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (timeout) or non-retryable errors
      if (lastError.name === 'AbortError') {
        throw new Error(`[Barchart] ${endpoint} request timed out after 10s`);
      }

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error(`[Barchart] ${endpoint} failed after ${maxRetries + 1} attempts`);
}

// ── Response Normalizer ──────────────────────────────────────────────────
// Translates raw Barchart field names to clean HarvestFile types.
// Defensive: every field is optional with fallbacks.

function normalizeElevators(response: BarchartGrainBidsResponse): GrainElevator[] {
  if (!response.results || !Array.isArray(response.results)) return [];

  return response.results
    .map((loc: BarchartRawLocation): GrainElevator => ({
      id: String(loc.locationId || loc.company || ''),
      name: loc.company || loc.location || 'Unknown Elevator',
      facilityType: loc.facility_type || '',
      address: loc.address || '',
      city: loc.city || '',
      state: loc.state || '',
      zip: loc.zip || '',
      phone: loc.phone || '',
      website: loc.url || '',
      latitude: parseFloat(String(loc.lat || '0')) || 0,
      longitude: parseFloat(String(loc.lng || '0')) || 0,
      distance: parseFloat(String(loc.distance || '0')) || 0,
      bids: normalizeBids(loc.bids || []),
    }))
    .filter((e) => e.id && e.bids.length > 0);
}

function normalizeBids(rawBids: BarchartRawBid[]): NormalizedBid[] {
  return rawBids
    .filter((b) => b.active !== false) // Exclude explicitly inactive bids
    .map((b): NormalizedBid => {
      // Cash price: prefer `cashprice`, fall back to `price`
      const cashPrice = parseFloat(String(b.cashprice || b.price || '0')) || 0;
      // Basis: string from API in CENTS per bushel (e.g., "-38.00" = 38 under)
      // Store as-is — DO NOT divide or multiply. It's already in cents.
      const basis = parseFloat(String(b.basis || '0')) || 0;
      // Change: prefer rawchange (number), fall back to change (string)
      const change = b.rawchange ?? (parseFloat(String(b.change || '0')) || 0);
      const changePercent = parseFloat(String(b.pctchange || '0')) || 0;

      // Normalize commodity name to title case
      const rawCommodity = b.commodity || '';
      const commodity = rawCommodity.charAt(0).toUpperCase() +
        rawCommodity.slice(1).toLowerCase();

      return {
        commodity,
        displayName: b.commodity_display_name || commodity,
        symbol: b.symbol || '',
        symRoot: b.sym_root || '',
        deliveryMonth: b.deliveryMonth || '',
        deliveryStart: b.delivery_start || '',
        deliveryEnd: b.delivery_end || '',
        basisMonth: b.basismonth || '',
        basis,
        cashPrice,
        change,
        changePercent,
        lastUpdate: b.as_of || (b.timestamp ? new Date(b.timestamp * 1000).toISOString() : ''),
        basisSymbol: b.basisSymbol || '',
        cashPriceSymbol: b.cashPriceSymbol || '',
        basisRollingSymbol: b.basisRollingSymbol || '',
        active: b.active !== false,
      };
    })
    .filter((b) => b.cashPrice > 0); // Only include bids with actual prices
}

// ── Public API: getGrainBids by FIPS code ────────────────────────────────
// PRIMARY lookup method for county pages. Maps directly to county FIPS codes.

export async function getGrainBidsByFips(
  fipsCode: string,
  options: {
    commodities?: string[];
    maxLocations?: number;
    bidsPerCommodity?: number;
  } = {}
): Promise<GrainElevator[]> {
  const { commodities, maxLocations = 20, bidsPerCommodity = 3 } = options;

  const commodityKey = (commodities || []).join(',');
  const cacheKey = `grainbids:fips:${fipsCode}:${commodityKey}:${maxLocations}`;
  const cached = getCached<GrainElevator[]>(cacheKey);
  if (cached) return cached;

  try {
    // CRITICAL FIX: Barchart uses `fipsCode` parameter, NOT `countyCode`
    const params: Record<string, string> = {
      fipsCode: fipsCode,
      totalLocations: maxLocations.toString(),
      bidsPerCom: bidsPerCommodity.toString(),
      numOfDecimals: '2',
    };

    // CRITICAL FIX: Barchart uses pipe `|` delimiter for commodities
    if (commodities && commodities.length > 0) {
      params.commodityName = commodities.join('|');
    }

    const response = await barchartFetch<BarchartGrainBidsResponse>(
      'getGrainBids',
      params
    );
    const elevators = normalizeElevators(response);
    setCache(cacheKey, elevators, getGrainBidTTL());
    return elevators;
  } catch (error) {
    console.error(`[Barchart] getGrainBidsByFips(${fipsCode}) error:`, error);
    // Try to serve stale cached data on error
    const stale = getStaleCached<GrainElevator[]>(cacheKey);
    if (stale) {
      console.info(`[Barchart] Serving stale cache for FIPS ${fipsCode}`);
      return stale;
    }
    return [];
  }
}

// ── Public API: getGrainBids by ZIP code ─────────────────────────────────

export async function getGrainBids(
  zipCode: string,
  options: {
    commodities?: string[];
    maxDistance?: number;
    maxLocations?: number;
    bidsPerCommodity?: number;
  } = {}
): Promise<GrainElevator[]> {
  const {
    commodities,
    maxDistance = 50,
    maxLocations = 20,
    bidsPerCommodity = 3,
  } = options;

  const commodityKey = (commodities || []).join(',');
  const cacheKey = `grainbids:zip:${zipCode}:${commodityKey}:${maxLocations}`;
  const cached = getCached<GrainElevator[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      zipCode,
      maxDistance: maxDistance.toString(),
      totalLocations: maxLocations.toString(),
      bidsPerCom: bidsPerCommodity.toString(),
      numOfDecimals: '2',
    };

    if (commodities && commodities.length > 0) {
      params.commodityName = commodities.join('|');
    }

    const response = await barchartFetch<BarchartGrainBidsResponse>(
      'getGrainBids',
      params
    );
    const elevators = normalizeElevators(response);
    setCache(cacheKey, elevators, getGrainBidTTL());
    return elevators;
  } catch (error) {
    console.error(`[Barchart] getGrainBids(${zipCode}) error:`, error);
    const stale = getStaleCached<GrainElevator[]>(cacheKey);
    if (stale) return stale;
    return [];
  }
}

// ── Public API: getGrainBids by coordinates ──────────────────────────────

export async function getGrainBidsByCoords(
  latitude: number,
  longitude: number,
  options: {
    commodities?: string[];
    maxDistance?: number;
    maxLocations?: number;
    bidsPerCommodity?: number;
  } = {}
): Promise<GrainElevator[]> {
  const {
    commodities,
    maxDistance = 50,
    maxLocations = 20,
    bidsPerCommodity = 3,
  } = options;

  const latKey = latitude.toFixed(2);
  const lngKey = longitude.toFixed(2);
  const commodityKey = (commodities || []).join(',');
  const cacheKey = `grainbids:coords:${latKey},${lngKey}:${commodityKey}:${maxLocations}`;
  const cached = getCached<GrainElevator[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      maxDistance: maxDistance.toString(),
      totalLocations: maxLocations.toString(),
      bidsPerCom: bidsPerCommodity.toString(),
      numOfDecimals: '2',
    };

    if (commodities && commodities.length > 0) {
      params.commodityName = commodities.join('|');
    }

    const response = await barchartFetch<BarchartGrainBidsResponse>(
      'getGrainBids',
      params
    );
    const elevators = normalizeElevators(response);
    setCache(cacheKey, elevators, getGrainBidTTL());
    return elevators;
  } catch (error) {
    console.error(`[Barchart] getGrainBidsByCoords error:`, error);
    const stale = getStaleCached<GrainElevator[]>(cacheKey);
    if (stale) return stale;
    return [];
  }
}

// ── Public API: getUSDAGrainPrices ───────────────────────────────────────
// Uses `commodityTypes` and `bidTypes` params per Thomas Willis's example:
// ?commodityTypes=C&bidTypes=E (Corn, Export bids)

export async function getUSDAGrainPrices(
  commodityType: string = 'C',
  bidType: string = 'E'
): Promise<BarchartRawUSDAPrice[]> {
  const cacheKey = `usdaprices:${commodityType}:${bidType}`;
  const cached = getCached<BarchartRawUSDAPrice[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {};
    if (commodityType !== 'all') params.commodityTypes = commodityType;
    if (bidType !== 'all') params.bidTypes = bidType;

    const response = await barchartFetch<BarchartUSDAGrainPricesResponse>(
      'getUSDAGrainPrices',
      params
    );

    const results = response.results || [];
    setCache(cacheKey, results, TTL.USDA_PRICES);
    return results;
  } catch (error) {
    console.error('[Barchart] getUSDAGrainPrices error:', error);
    const stale = getStaleCached<BarchartRawUSDAPrice[]>(cacheKey);
    if (stale) return stale;
    return [];
  }
}

// ── Public API: getHistory (Bid/Basis History) ───────────────────────────
// Accepts basisSymbol or cashPriceSymbol from getGrainBids response.

export async function getBidHistory(
  symbol: string,
  options: {
    type?: 'daily' | 'weekly' | 'monthly';
    maxRecords?: number;
    startDate?: string;
  } = {}
): Promise<BarchartRawHistoryEntry[]> {
  const { type = 'daily', maxRecords = 365, startDate } = options;

  const cacheKey = `history:${symbol}:${type}:${maxRecords}:${startDate || 'default'}`;
  const cached = getCached<BarchartRawHistoryEntry[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      symbol,
      type,
      maxRecords: maxRecords.toString(),
    };
    if (startDate) params.startDate = startDate;

    const response = await barchartFetch<BarchartHistoryResponse>(
      'getHistory',
      params
    );
    const results = response.results || [];
    setCache(cacheKey, results, TTL.HISTORY);
    return results;
  } catch (error) {
    console.error(`[Barchart] getBidHistory(${symbol}) error:`, error);
    const stale = getStaleCached<BarchartRawHistoryEntry[]>(cacheKey);
    if (stale) return stale;
    return [];
  }
}

// ── Utility: Get best bids across elevators for a commodity ──────────────

export function getBestBids(
  elevators: GrainElevator[],
  commodity: string
): Array<{ elevator: GrainElevator; bid: NormalizedBid }> {
  const matches: Array<{ elevator: GrainElevator; bid: NormalizedBid }> = [];

  for (const elevator of elevators) {
    const commodityBids = elevator.bids.filter(
      (b) => b.commodity.toLowerCase() === commodity.toLowerCase()
    );
    if (commodityBids.length > 0) {
      // Pick highest cash price bid
      const best = commodityBids.sort((a, b) => b.cashPrice - a.cashPrice)[0];
      matches.push({ elevator, bid: best });
    }
  }

  // Sort by cash price descending (best bid first)
  return matches.sort((a, b) => b.bid.cashPrice - a.bid.cashPrice);
}

// ── Utility: Format basis for display ────────────────────────────────────
// DEPLOY 3D-FIX: Barchart returns basis ALREADY in cents.
// Previous code multiplied by 100, causing double-conversion (e.g., 28 → 2800).

export function formatBasis(basis: number): string {
  const sign = basis >= 0 ? '+' : '';
  const cents = Math.round(basis);
  return `${sign}${cents}¢`;
}

// ── Utility: Format basis as dollars ─────────────────────────────────────
// DEPLOY 3D-FIX: basis is in cents, divide by 100 to get dollars.

export function formatBasisDollars(basis: number): string {
  const sign = basis >= 0 ? '+' : '';
  const dollars = Math.abs(basis) / 100;
  return `${sign}$${dollars.toFixed(2)}`;
}

// ── Utility: Query budget stats ──────────────────────────────────────────

export function getQueryStats(): {
  todayCount: number;
  dailyLimit: number;
  percentUsed: number;
} {
  return {
    todayCount: queryCount,
    dailyLimit: DAILY_SOFT_LIMIT,
    percentUsed: Math.round((queryCount / DAILY_SOFT_LIMIT) * 100),
  };
}
