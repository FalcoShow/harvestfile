// =============================================================================
// HarvestFile — USDA AMS MARS API Client (Deploy 4b)
// lib/sellscore/mmn-client.ts
//
// Fallback cash bid source when Barchart is unavailable. Pulls state-level
// average cash grain bids from USDA Agricultural Marketing Service's
// MARS API (formerly "MyMarketNews API").
//
// Why USDA MMN as the fallback:
//   - Free, requires only a registered API key
//   - Daily updates, late afternoon ET (our 4 AM ET cron reads yesterday's
//     report — explicitly surfaced in the meta object)
//   - State-level coverage for OH, IN, IL, IA. Michigan has no published
//     MMN report, so MI elevators proxy through Ohio's report (geographic
//     proxy; eastern Corn Belt basis tracks closely between OH and MI).
//
// Why parse the report_narrative instead of fetching Report Detail:
//   - The narrative explicitly contains "State Average Price: Corn -- $X.XX"
//     in a consistent format across all 5 state reports we use
//   - One API call instead of two (header + detail)
//   - State average is the right granularity for our use case — when
//     Barchart is down, a state average is far more accurate than nothing,
//     and validates within $0.03 of elevator-specific Barchart bids in
//     verification testing (May 13, 2026)
//
// Verified report slugs (from scripts/mmn-recon.ps1, May 13, 2026):
//   OH → 2851 (Ohio Daily Grain Bids)
//   IN → 3463 (Indiana Grain Bids)
//   IL → 3192 (Illinois Grain Bids)
//   IA → 2850 (Iowa Daily Cash Grain Bids)
//   MI → 2851 (Ohio proxy — no MI report published by USDA AMS)
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
  publishedAt: string;      // ISO timestamp from MARS API
  source: 'mmn';
  sourceSlug: number;
  isProxy: boolean;
  proxyOfState?: string;
  rawNarrative: string;
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

/**
 * Fetches a state-level average cash grain bid from USDA AMS MARS API.
 * Returns the most recent reporting day's state average for the given crop.
 * Throws MMNError on any failure mode.
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

  // HTTP Basic auth: API key as username, blank password
  const basicAuth = Buffer.from(`${apiKey}:`).toString('base64');
  const url = `${MMN_BASE_URL}/${mapping.slug}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(MMN_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw new MMNError(
        'timeout',
        `MARS API request timed out after ${MMN_FETCH_TIMEOUT_MS}ms for slug ${mapping.slug}`,
      );
    }
    throw new MMNError(
      'http_error',
      `MARS API request failed for slug ${mapping.slug}: ${e.message}`,
    );
  }

  if (!res.ok) {
    throw new MMNError(
      'http_error',
      `MARS API returned HTTP ${res.status} for slug ${mapping.slug}`,
    );
  }

  const data = (await res.json()) as {
    results?: Array<{
      report_begin_date?: string;
      published_date?: string;
      report_narrative?: string;
    }>;
  };

  if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
    throw new MMNError(
      'no_results',
      `MARS API returned no results for slug ${mapping.slug}`,
    );
  }

  // Default sort is report_begin_date DESC, so results[0] is the most recent
  const latest = data.results[0];
  const narrative = latest.report_narrative;
  if (typeof narrative !== 'string' || narrative.length === 0) {
    throw new MMNError(
      'parse_failure',
      `MARS API record missing report_narrative for slug ${mapping.slug}`,
    );
  }

  // Parse the state average price from the narrative.
  // Format (verified across all 5 state reports, May 13, 2026):
  //   "State Average Price: Corn -- $4.39 (-.42N) Up 5 cents | Soybeans -- $11.56 (-.71N) Up 15 cents\n..."
  const cropPattern =
    crop === 'corn'
      ? /Corn\s*--\s*\$(\d+\.\d{1,2})/i
      : /Soybeans?\s*--\s*\$(\d+\.\d{1,2})/i;

  const match = narrative.match(cropPattern);
  if (!match) {
    throw new MMNError(
      'parse_failure',
      `Could not parse ${crop} price from narrative for slug ${mapping.slug}. ` +
      `Narrative head: "${narrative.substring(0, 200)}"`,
    );
  }

  const cashBid = Number(match[1]);

  // Sanity bounds — corn/soybean cash bids should always be within this range.
  // Outside this range, it's almost certainly a parse error.
  if (cashBid < SANITY_MIN_BID || cashBid > SANITY_MAX_BID) {
    throw new MMNError(
      'sanity_failure',
      `Parsed ${crop} bid $${cashBid.toFixed(2)} is outside sanity range ` +
      `($${SANITY_MIN_BID}-$${SANITY_MAX_BID}) for slug ${mapping.slug}`,
    );
  }

  // Convert MM/DD/YYYY → YYYY-MM-DD
  const dateMatch = latest.report_begin_date?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const reportDate = dateMatch
    ? `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`
    : latest.report_begin_date ?? 'unknown';

  return {
    cashBid,
    reportDate,
    publishedAt: latest.published_date ?? new Date().toISOString(),
    source: 'mmn',
    sourceSlug: mapping.slug,
    isProxy: mapping.isProxy,
    proxyOfState: mapping.proxyOfState,
    rawNarrative: narrative,
  };
}