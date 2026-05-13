// =============================================================================
// HarvestFile — USDA AMS MARS API Client (Deploy 4b, revised)
// lib/sellscore/mmn-client.ts
//
// Fallback cash bid source when Barchart is unavailable. Pulls per-delivery-
// point bid records from USDA AMS MARS API's Report Detail section for the
// target state's daily grain report, then computes a state average.
//
// History:
//   - Initial Deploy 4b (May 13, 2026 morning) parsed the Report Header
//     narrative for state average price. Worked for IA. Failed for OH/IN
//     (header has no narrative) and would have failed for IL (different
//     format). Caught by SELLSCORE_FORCE_MMN kill-switch verification.
//   - Revised approach (this file): always pull Report Detail records and
//     compute the state average ourselves. Uniform across all states, no
//     dependence on USDA's narrative formatting which varies by office.
//
// Architecture:
//   1. Hit Report Header to discover the most recent published report date
//      (one row per date; response is small and fast)
//   2. Hit Report Detail filtered to that date (dozens of bid records, one
//      per delivery point × commodity × contract month)
//   3. Filter records to:
//        - commodity = target crop ('Corn' or 'Soybeans')
//        - current = 'Yes' (nearby contracts only, excludes deferreds)
//        - avg_price within sanity bounds ($2.00-$20.00)
//   4. Compute mean of avg_price across qualifying records → state average
//
// State to slug mapping (verified May 13, 2026):
//   OH → 2851 (Ohio Daily Grain Bids)
//   IN → 3463 (Indiana Grain Bids)
//   IL → 3192 (Illinois Grain Bids)
//   IA → 2850 (Iowa Daily Cash Grain Bids)
//   MI → 2851 (Ohio proxy — USDA does not publish a Michigan grain report)
// =============================================================================

import type { Crop } from './pace-calendar';

const MMN_BASE_URL = 'https://marsapi.ams.usda.gov/services/v1.2/reports';
const MMN_FETCH_TIMEOUT_MS = 7000;
const SANITY_MIN_BID = 2.0;
const SANITY_MAX_BID = 20.0;

interface MMNSlugMapping {
  slug: number;
  isProxy: boolean;
  proxyOfState?: string;
}

const STATE_TO_MMN_SLUG: Record<string, MMNSlugMapping> = {
  OH: { slug: 2851, isProxy: false },
  IN: { slug: 3463, isProxy: false },
  IL: { slug: 3192, isProxy: false },
  IA: { slug: 2850, isProxy: false },
  MI: { slug: 2851, isProxy: true, proxyOfState: 'OH' },
};

export interface MMNCashBidResult {
  cashBid: number;
  reportDate: string;       // ISO 'YYYY-MM-DD' — the date the bid applies to
  publishedAt: string;      // ISO timestamp of USDA's publication
  source: 'mmn';
  sourceSlug: number;
  isProxy: boolean;
  proxyOfState?: string;
  sampleSize: number;       // count of records that contributed to the average
  summary: string;          // human-readable description of the computation
}

export type MMNErrorReason =
  | 'no_api_key'
  | 'unsupported_state'
  | 'http_error'
  | 'timeout'
  | 'no_results'
  | 'parse_failure'
  | 'sanity_failure';

export class MMNError extends Error {
  constructor(public reason: MMNErrorReason, message: string) {
    super(message);
    this.name = 'MMNError';
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Internal HTTP helpers
// ─────────────────────────────────────────────────────────────────────────

function authHeaders(apiKey: string): Record<string, string> {
  const basicAuth = Buffer.from(`${apiKey}:`).toString('base64');
  return {
    Authorization: `Basic ${basicAuth}`,
    Accept: 'application/json',
  };
}

async function fetchMMN<T = unknown>(url: string, apiKey: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: authHeaders(apiKey),
      signal: AbortSignal.timeout(MMN_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw new MMNError(
        'timeout',
        `MARS API request timed out after ${MMN_FETCH_TIMEOUT_MS}ms for ${url}`,
      );
    }
    throw new MMNError(
      'http_error',
      `MARS API request failed for ${url}: ${e.message}`,
    );
  }

  if (!res.ok) {
    throw new MMNError(
      'http_error',
      `MARS API returned HTTP ${res.status} for ${url}`,
    );
  }

  return (await res.json()) as T;
}

// ─────────────────────────────────────────────────────────────────────────
// Step 1: Get the most recent report date from the Header section
// ─────────────────────────────────────────────────────────────────────────

interface MMNHeaderResponse {
  results?: Array<{
    report_begin_date?: string;
    published_date?: string;
  }>;
}

async function getMostRecentReportDate(
  slug: number,
  apiKey: string,
): Promise<{ reportDate: string; publishedAt: string }> {
  const url = `${MMN_BASE_URL}/${slug}`;
  const data = await fetchMMN<MMNHeaderResponse>(url, apiKey);

  if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
    throw new MMNError(
      'no_results',
      `MARS API Header returned no results for slug ${slug}`,
    );
  }

  // Default sort is report_begin_date DESC; results[0] is most recent
  const latest = data.results[0];
  const reportDate = latest.report_begin_date;
  if (typeof reportDate !== 'string' || reportDate.length === 0) {
    throw new MMNError(
      'parse_failure',
      `MARS API Header record missing report_begin_date for slug ${slug}`,
    );
  }

  return {
    reportDate, // 'MM/DD/YYYY'
    publishedAt: latest.published_date ?? new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Step 2: Get the bid records from Report Detail for a specific date
// ─────────────────────────────────────────────────────────────────────────

interface MMNBidRecord {
  commodity?: string;
  current?: string;        // 'Yes' or 'No'
  avg_price?: number | string | null;
  price_unit?: string;
  delivery_point?: string;
  trade_loc?: string;
  market_location_city?: string;
}

interface MMNDetailResponse {
  results?: MMNBidRecord[];
}

async function getDetailBidsForDate(
  slug: number,
  reportDate: string,
  apiKey: string,
): Promise<MMNBidRecord[]> {
  // MARS API accepts unencoded slashes in the date filter per their docs
  const url = `${MMN_BASE_URL}/${slug}/Report%20Detail?q=report_begin_date=${reportDate}`;
  const data = await fetchMMN<MMNDetailResponse>(url, apiKey);

  if (!data.results || !Array.isArray(data.results)) {
    throw new MMNError(
      'no_results',
      `MARS API Report Detail returned no results for slug ${slug} date ${reportDate}`,
    );
  }

  return data.results;
}

// ─────────────────────────────────────────────────────────────────────────
// Public: compute state-average cash bid for the given state + crop
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fetches a state-level average cash grain bid from USDA AMS MARS API.
 * Uses the Report Detail section to compute a uniform state average across
 * all delivery points, filtered to nearby (current=Yes) contracts only.
 *
 * Throws MMNError on any failure: missing API key, unsupported state,
 * HTTP errors, timeouts, empty results, parse failures, or prices outside
 * sanity bounds.
 */
export async function getCashBidFromMMN(
  state: string,
  crop: Crop,
): Promise<MMNCashBidResult> {
  const apiKey = process.env.USDA_AMS_MARS_API_KEY;
  if (!apiKey) {
    throw new MMNError(
      'no_api_key',
      'USDA_AMS_MARS_API_KEY environment variable is not set',
    );
  }

  const mapping = STATE_TO_MMN_SLUG[state.toUpperCase()];
  if (!mapping) {
    throw new MMNError(
      'unsupported_state',
      `State '${state}' is not in the MMN supported set (OH/IN/IL/IA/MI). ` +
      `Geographic expansion to other states is scheduled for v1.1.`,
    );
  }

  // Step 1: Find the most recent report date
  const { reportDate, publishedAt } = await getMostRecentReportDate(
    mapping.slug,
    apiKey,
  );

  // Step 2: Pull the bid records for that date
  const bidRecords = await getDetailBidsForDate(mapping.slug, reportDate, apiKey);

  // Step 3: Filter to target crop + nearby contracts + valid prices
  const cropName = crop === 'corn' ? 'Corn' : 'Soybeans';
  const validBids: number[] = [];

  for (const record of bidRecords) {
    if (record.commodity !== cropName) continue;
    if (record.current !== 'Yes') continue; // nearby contracts only
    const price = Number(record.avg_price);
    if (!isFinite(price) || price < SANITY_MIN_BID || price > SANITY_MAX_BID) {
      continue;
    }
    validBids.push(price);
  }

  if (validBids.length === 0) {
    throw new MMNError(
      'parse_failure',
      `No valid nearby ${cropName} bids found in slug ${mapping.slug} for date ${reportDate}. ` +
      `Inspected ${bidRecords.length} total records. ` +
      `This may indicate a USDA reporting gap or schema change.`,
    );
  }

  // Compute mean and round to 4 decimal places to match Barchart precision
  const stateAverage =
    validBids.reduce((sum, p) => sum + p, 0) / validBids.length;
  const cashBid = Math.round(stateAverage * 10000) / 10000;

  // Convert MM/DD/YYYY → YYYY-MM-DD for the meta object
  const dateMatch = reportDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const isoDate = dateMatch
    ? `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`
    : reportDate;

  const summary =
    `Mean of ${validBids.length} nearby ${cropName} bid records from USDA AMS ` +
    `slug ${mapping.slug} on ${reportDate}: $${cashBid.toFixed(2)}`;

  // Log for Inngest dashboard visibility during force-MMN test runs
  console.info(`[SellScore][MMN] ${summary}`);

  return {
    cashBid,
    reportDate: isoDate,
    publishedAt,
    source: 'mmn',
    sourceSlug: mapping.slug,
    isProxy: mapping.isProxy,
    proxyOfState: mapping.proxyOfState,
    sampleSize: validBids.length,
    summary,
  };
}