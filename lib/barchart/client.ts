// =============================================================================
// HarvestFile — Barchart OnDemand API Client
// Server-side only. Never import this in client components.
//
// Sandbox Phase 1: getGrainBids, getHistory (Bids/Basis), getUSDA Cash Bids
// Query budget: 100K/month → ~3,333/day
//
// Caching strategy:
//   - Grain bids: 30 min during market hours, 4 hrs off-hours
//   - USDA prices: 60 min (API refreshes hourly)
//   - Historical data: 24 hrs (immutable intraday)
//   - Instruments: 24 hrs (rarely changes)
// =============================================================================

import type {
  BarchartGrainBidsResponse,
  BarchartUSDAGrainPricesResponse,
  BarchartHistoryResponse,
  GrainElevator,
  NormalizedBid,
  CacheEntry,
} from './types';

// ── Configuration ────────────────────────────────────────────────────────

const BARCHART_BASE_URL = 'https://ondemand.websol.barchart.com';

function getApiKey(): string {
  const key = process.env.BARCHART_API_KEY;
  if (!key) {
    console.warn('[Barchart] BARCHART_API_KEY not set — using placeholder');
    return 'SANDBOX_KEY_PENDING';
  }
  return key;
}

// ── In-Memory Cache ──────────────────────────────────────────────────────
// Simple TTL cache. Works on Vercel serverless (cold starts clear cache
// naturally, ISR pages cache at CDN level). Upgrade to Redis when needed.

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
  // Prevent unbounded growth: prune if cache exceeds 500 entries
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of Array.from(cache.entries())) {
      if (now - v.timestamp > v.ttl) cache.delete(k);
    }
  }
}

// ── Cache TTLs ───────────────────────────────────────────────────────────

function isMarketHours(): boolean {
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const hour = ct.getHours();
  const day = ct.getDay();
  // CBOT grain: Mon-Fri, roughly 8:30 AM - 1:20 PM CT for regular session
  // Extended: 7 PM - 7:45 AM CT. Simplify to weekdays 6 AM - 4 PM CT
  return day >= 1 && day <= 5 && hour >= 6 && hour < 16;
}

const TTL = {
  GRAIN_BIDS_MARKET: 30 * 60 * 1000,    // 30 minutes
  GRAIN_BIDS_OFFHOURS: 4 * 60 * 60 * 1000, // 4 hours
  USDA_PRICES: 60 * 60 * 1000,           // 60 minutes
  HISTORY: 24 * 60 * 60 * 1000,          // 24 hours
  INSTRUMENTS: 24 * 60 * 60 * 1000,      // 24 hours
};

function grainBidTTL(): number {
  return isMarketHours() ? TTL.GRAIN_BIDS_MARKET : TTL.GRAIN_BIDS_OFFHOURS;
}

// ── Query Budget Tracking ────────────────────────────────────────────────

let queryCount = 0;
let queryCountResetDate = new Date().toISOString().slice(0, 10);
const MONTHLY_BUDGET = 100_000;
const DAILY_SOFT_LIMIT = 3_333;

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

  return queryCount <= DAILY_SOFT_LIMIT * 1.2; // Hard stop at 120% of daily budget
}

// ── Core Fetch Wrapper ───────────────────────────────────────────────────

async function barchartFetch<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  if (!trackQuery()) {
    throw new Error('[Barchart] Daily query budget exceeded. Serving cached data only.');
  }

  const url = new URL(`${BARCHART_BASE_URL}/${endpoint}.json`);
  url.searchParams.set('apikey', getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    // Next.js fetch caching: no-store for real-time data
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`[Barchart] ${endpoint} returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data?.status?.code !== 200 && data?.status?.code !== undefined) {
    throw new Error(`[Barchart] API error: ${data?.status?.message || 'Unknown error'}`);
  }

  return data as T;
}

// ── Public API: getGrainBids ─────────────────────────────────────────────

export async function getGrainBids(
  zipCode: string,
  options: {
    commodities?: string[];
    maxLocations?: number;
  } = {}
): Promise<GrainElevator[]> {
  const { commodities, maxLocations = 20 } = options;

  // Build cache key
  const cacheKey = `grainbids:${zipCode}:${(commodities || []).join(',')}:${maxLocations}`;
  const cached = getCached<GrainElevator[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      zipCode,
      maxLocations: maxLocations.toString(),
    };

    // Filter by commodity if specified (e.g., "corn,soybeans")
    if (commodities && commodities.length > 0) {
      params.commodityName = commodities.join(',');
    }

    const response = await barchartFetch<BarchartGrainBidsResponse>('getGrainBids', params);
    const elevators = normalizeElevators(response);
    setCache(cacheKey, elevators, grainBidTTL());
    return elevators;
  } catch (error) {
    console.error('[Barchart] getGrainBids error:', error);
    return [];
  }
}

// ── Public API: getGrainBids by FIPS code ────────────────────────────────

export async function getGrainBidsByFips(
  fipsCode: string,
  options: {
    commodities?: string[];
    maxLocations?: number;
  } = {}
): Promise<GrainElevator[]> {
  const { commodities, maxLocations = 20 } = options;

  const cacheKey = `grainbids:fips:${fipsCode}:${(commodities || []).join(',')}:${maxLocations}`;
  const cached = getCached<GrainElevator[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      countyCode: fipsCode,
      maxLocations: maxLocations.toString(),
    };
    if (commodities && commodities.length > 0) {
      params.commodityName = commodities.join(',');
    }

    const response = await barchartFetch<BarchartGrainBidsResponse>('getGrainBids', params);
    const elevators = normalizeElevators(response);
    setCache(cacheKey, elevators, grainBidTTL());
    return elevators;
  } catch (error) {
    console.error('[Barchart] getGrainBidsByFips error:', error);
    return [];
  }
}

// ── Public API: getGrainBids by coordinates ──────────────────────────────

export async function getGrainBidsByCoords(
  latitude: number,
  longitude: number,
  options: {
    commodities?: string[];
    maxLocations?: number;
  } = {}
): Promise<GrainElevator[]> {
  const { commodities, maxLocations = 20 } = options;

  // Round coords to 2 decimal places for cache key stability
  const latKey = latitude.toFixed(2);
  const lngKey = longitude.toFixed(2);
  const cacheKey = `grainbids:coords:${latKey},${lngKey}:${(commodities || []).join(',')}:${maxLocations}`;
  const cached = getCached<GrainElevator[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      maxLocations: maxLocations.toString(),
    };
    if (commodities && commodities.length > 0) {
      params.commodityName = commodities.join(',');
    }

    const response = await barchartFetch<BarchartGrainBidsResponse>('getGrainBids', params);
    const elevators = normalizeElevators(response);
    setCache(cacheKey, elevators, grainBidTTL());
    return elevators;
  } catch (error) {
    console.error('[Barchart] getGrainBidsByCoords error:', error);
    return [];
  }
}

// ── Shared normalizer ────────────────────────────────────────────────────

function normalizeElevators(response: BarchartGrainBidsResponse): GrainElevator[] {
  return (response.results || []).map((loc) => ({
    id: loc.location_id || `${loc.name}-${loc.zip}`,
    name: loc.name,
    address: loc.address || '',
    city: loc.city || '',
    state: loc.state || '',
    zip: loc.zip || '',
    phone: loc.phone || '',
    latitude: loc.latitude || 0,
    longitude: loc.longitude || 0,
    distance: loc.distance || 0,
    bids: (loc.bids || []).map((bid): NormalizedBid => ({
      commodity: bid.commodity,
      symbol: bid.symbol || '',
      deliveryPeriod: bid.delivery_period || '',
      basis: bid.basis || 0,
      cashPrice: bid.cashPrice || 0,
      futuresPrice: bid.futuresPrice || null,
      futuresMonth: bid.futuresMonth || '',
      lastUpdate: bid.lastUpdate || '',
    })),
  }));
}

// ── Public API: getUSDAGrainPrices ───────────────────────────────────────

export async function getUSDAGrainPrices(
  commodity: string = 'corn',
  bidType: string = 'all'
): Promise<BarchartUSDAGrainPricesResponse['results']> {
  const cacheKey = `usdaprices:${commodity}:${bidType}`;
  const cached = getCached<BarchartUSDAGrainPricesResponse['results']>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {};
    if (commodity !== 'all') params.commodity = commodity;
    if (bidType !== 'all') params.bidType = bidType;

    const response = await barchartFetch<BarchartUSDAGrainPricesResponse>(
      'getUSDAGrainPrices',
      params
    );

    const results = response.results || [];
    setCache(cacheKey, results, TTL.USDA_PRICES);
    return results;
  } catch (error) {
    console.error('[Barchart] getUSDAGrainPrices error:', error);
    return [];
  }
}

// ── Public API: getHistory (Bid/Basis History) ───────────────────────────

export async function getBidHistory(
  symbol: string,
  options: {
    type?: 'daily' | 'weekly' | 'monthly';
    maxRecords?: number;
    startDate?: string;
  } = {}
): Promise<BarchartHistoryResponse['results']> {
  const { type = 'daily', maxRecords = 365, startDate } = options;

  const cacheKey = `history:${symbol}:${type}:${maxRecords}:${startDate || 'default'}`;
  const cached = getCached<BarchartHistoryResponse['results']>(cacheKey);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      symbol,
      type,
      maxRecords: maxRecords.toString(),
    };
    if (startDate) params.startDate = startDate;

    const response = await barchartFetch<BarchartHistoryResponse>('getHistory', params);
    const results = response.results || [];
    setCache(cacheKey, results, TTL.HISTORY);
    return results;
  } catch (error) {
    console.error('[Barchart] getHistory error:', error);
    return [];
  }
}

// ── Utility: Get best bids for a commodity across elevators ──────────────

export function getBestBids(
  elevators: GrainElevator[],
  commodity: string
): Array<{ elevator: GrainElevator; bid: NormalizedBid }> {
  const matches: Array<{ elevator: GrainElevator; bid: NormalizedBid }> = [];

  for (const elevator of elevators) {
    // Find the best (nearest delivery) bid for this commodity
    const commodityBids = elevator.bids.filter(
      (b) => b.commodity.toLowerCase() === commodity.toLowerCase()
    );
    if (commodityBids.length > 0) {
      // Sort by cash price descending, pick highest
      const best = commodityBids.sort((a, b) => b.cashPrice - a.cashPrice)[0];
      matches.push({ elevator, bid: best });
    }
  }

  // Sort by cash price descending (best bid first)
  return matches.sort((a, b) => b.bid.cashPrice - a.bid.cashPrice);
}

// ── Utility: Format basis for display ────────────────────────────────────

export function formatBasis(basis: number): string {
  const sign = basis >= 0 ? '+' : '';
  return `${sign}${basis}`;
}

// ── Utility: Get query stats ─────────────────────────────────────────────

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
