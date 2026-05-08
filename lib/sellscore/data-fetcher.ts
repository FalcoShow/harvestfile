// lib/sellscore/data-fetcher.ts
//
// Reads farm state from Supabase, pulls historical basis (seasonally
// filtered), fetches a live cash bid from Barchart, and returns a
// SellScoreRecommendation wrapped with freshness metadata.
//
// Pure read function — does NOT persist to sellscore_recommendations.
// Callers can persist separately if they want an audit trail.
//
// Data sources:
//   - Cash bid          → Barchart getGrainBids (live, today)
//   - Today's basis     → county_basis_history (most recent observation)
//   - Historical basis  → county_basis_history (3-year ±14 day same-date
//                         seasonal window, via fetchSeasonalBasis)
//
// Why "today's basis" comes from the database, not Barchart:
// Barchart's getGrainBids returns basis="0.00" for every bid in the
// sandbox tier. The real basis values live behind getHistory using the
// basisRollingSymbol — those are the same values we backfilled into
// county_basis_history during Task 3.2. Reading the latest record from
// our own table is faster (no extra API call), uses validated/deduplicated
// data, and aligns with the production plan: a daily cron keeps the table
// fresh and the engine reads from it with no code change.
//
// Why historical basis is seasonally filtered:
// The Sell Score v1 spec (§4.4) defines basis percentile as "vs 3-year
// average for this date." Comparing today's May basis to the full 5-year
// distribution that mixes weak winter basis with strong summer basis
// inflates today's percentile artificially. The seasonal filter (in
// lib/sellscore/seasonal-basis.ts) restricts the comparison set to the
// same calendar window in the prior 3 years, making the percentile
// semantically honest.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Crop } from './pace-calendar';
import { fetchSeasonalBasis } from './seasonal-basis';
import {
  computeSellScore,
  type FarmState,
  type MarketState,
  type SellScoreRecommendation,
} from './recommendation-engine';
import {
  getReferenceForCounty,
  type ReferenceElevator,
} from './reference-elevators';

const BARCHART_BASE_URL = 'https://ondemand.websol.barchart.com/getGrainBids.json';

// ─────────────────────────────────────────────────────────────────────────
// Internal: farm state from the database
// ─────────────────────────────────────────────────────────────────────────

interface FarmRow {
  id: string;
  total_acres: number | string | null;
  county_fips: string | null;
}

interface PositionRow {
  expected_bushels: number | string | null;
  breakeven_dollars_per_bu: number | string | null;
  bushels_contracted: number | string | null;
}

async function getFarmState(
  supabase: SupabaseClient,
  farmId: string,
  crop: Crop,
): Promise<{ farm: FarmState; countyFips: string }> {
  const { data: farm, error: farmErr } = await supabase
    .from('farms')
    .select('id, total_acres, county_fips')
    .eq('id', farmId)
    .single<FarmRow>();

  if (farmErr || !farm) {
    throw new Error(`Farm ${farmId} not found: ${farmErr?.message ?? 'no row returned'}`);
  }
  if (!farm.county_fips) {
    throw new Error(`Farm ${farmId} has no county_fips set; cannot compute Sell Score`);
  }
  const totalAcres = Number(farm.total_acres);
  if (!totalAcres || totalAcres <= 0) {
    throw new Error(`Farm ${farmId} has no usable total_acres (got ${farm.total_acres})`);
  }

  const { data: position, error: posErr } = await supabase
    .from('grain_positions')
    .select('expected_bushels, breakeven_dollars_per_bu, bushels_contracted')
    .eq('farm_id', farmId)
    .eq('commodity', crop)
    .order('crop_year', { ascending: false })
    .limit(1)
    .single<PositionRow>();

  if (posErr || !position) {
    throw new Error(
      `No ${crop} position for farm ${farmId}: ${posErr?.message ?? 'no row returned'}`,
    );
  }
  if (position.expected_bushels == null) {
    throw new Error(`Position for ${crop} on farm ${farmId} is missing expected_bushels`);
  }
  if (position.breakeven_dollars_per_bu == null) {
    throw new Error(
      `Position for ${crop} on farm ${farmId} is missing breakeven_dollars_per_bu`,
    );
  }

  return {
    farm: {
      totalAcres,
      expectedBushels: Number(position.expected_bushels),
      breakeven: Number(position.breakeven_dollars_per_bu),
      bushelsSold: Number(position.bushels_contracted ?? 0),
    },
    countyFips: farm.county_fips,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Internal: latest observed basis from county_basis_history
// ─────────────────────────────────────────────────────────────────────────

interface LatestBasisRow {
  basis: number | string;
  observation_date: string;
}

async function fetchLatestBasis(
  supabase: SupabaseClient,
  countyFips: string,
  crop: Crop,
): Promise<{ basis: number; asOf: string }> {
  const { data, error } = await supabase
    .from('county_basis_history')
    .select('basis, observation_date')
    .eq('county_fips', countyFips)
    .eq('crop', crop)
    .not('basis', 'is', null)
    .order('observation_date', { ascending: false })
    .limit(1)
    .maybeSingle<LatestBasisRow>();

  if (error) {
    throw new Error(
      `Failed to fetch latest basis for ${countyFips}/${crop}: ${error.message}`,
    );
  }
  if (!data) {
    throw new Error(
      `No basis observations available for ${countyFips}/${crop}. ` +
      `Did the Task 3.2 backfill complete for this county?`,
    );
  }

  return {
    basis: Number(data.basis),
    asOf: String(data.observation_date),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Internal: live cash bid from Barchart
// ─────────────────────────────────────────────────────────────────────────

interface BarchartBid {
  commodity?: string;
  price?: number | string | null;
  basis?: number | string | null;
  basisRollingSymbol?: string | null;
}

interface BarchartLocation {
  locationId?: number | string;
  bids?: BarchartBid[];
}

async function fetchLiveCashBid(
  elevator: ReferenceElevator,
  crop: Crop,
  apiKey: string,
): Promise<number> {
  const url = new URL(BARCHART_BASE_URL);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('latitude', String(elevator.lat));
  url.searchParams.set('longitude', String(elevator.lng));
  url.searchParams.set('totalLocations', '25');
  url.searchParams.set('bidsPerCom', '5');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(
      `Barchart getGrainBids HTTP ${res.status} for elevator ${elevator.elevatorId}`,
    );
  }

  const data = await res.json();
  const matchingLoc = (data.results ?? []).find(
    (r: BarchartLocation) => String(r.locationId) === elevator.elevatorId,
  );

  if (!matchingLoc) {
    throw new Error(
      `Elevator ${elevator.elevatorId} (${elevator.elevatorName}) not found in Barchart response. ` +
      `Try a different elevator or check that the API key is enabled for this location.`,
    );
  }

  // Filter to crop bids with a positive price. Among those, prefer the bid
  // carrying basisRollingSymbol — that's the nearby active contract (e.g.,
  // Bid 1 = May'26 nearby) rather than a deferred-month or flat-price quote.
  // Falls back to the first priced bid if no nearby is identified.
  const cropPattern = crop === 'corn' ? /corn/i : /(soy|bean)/i;
  const cropBids = (matchingLoc.bids ?? [])
    .filter((b: BarchartBid) => cropPattern.test(b.commodity ?? ''))
    .filter((b: BarchartBid) => b.price != null && Number(b.price) > 0);

  if (cropBids.length === 0) {
    throw new Error(
      `No live ${crop} bid available at ${elevator.elevatorName}. ` +
      `Elevator may not currently post bids for this commodity (out of season, etc.).`,
    );
  }

  const nearbyBid =
    cropBids.find((b: BarchartBid) => b.basisRollingSymbol != null) ?? cropBids[0];

  return Number(nearbyBid.price);
}

// ─────────────────────────────────────────────────────────────────────────
// Public: orchestrator
// ─────────────────────────────────────────────────────────────────────────

/**
 * Result wrapper that includes both the engine recommendation and metadata
 * about data freshness/sourcing for diagnostics and UI display.
 */
export interface SellScoreResult {
  recommendation: SellScoreRecommendation;
  meta: {
    elevatorId: string;
    elevatorName: string;
    elevatorCity: string;
    countyFips: string;
    /** ISO date of the latest basis observation used as "today's basis". */
    basisDataAsOf: string;
    /**
     * Number of historical basis observations used in the percentile calc.
     * With the seasonal filter active, this is the count within the 3-year
     * ±14 day same-date window — typically 30-55 observations for full-
     * history counties, lower for counties with short Barchart history or
     * a stale tail (e.g. IA Clinton during the December 2025 sandbox lag).
     */
    historicalSampleSize: number;
    /**
     * Human-readable description of the seasonal window used for the basis
     * percentile calculation. Suitable for the UI freshness footer:
     *   e.g. "3-year ±14 day same-date window"
     */
    basisWindowDescription: string;
  };
}

/**
 * Computes a complete Sell Score recommendation for a single crop at a
 * single farm on a given date. Reads from Supabase, calls Barchart for
 * a live cash bid, runs the engine, returns the result with metadata.
 *
 * @param supabase  Authenticated Supabase client (typically server-side, service role)
 * @param farmId    The farm uuid to score
 * @param crop      'corn' or 'soybeans'
 * @param date      Reference date (typically today; UTC noon recommended).
 *                  Passed through to the seasonal-window basis filter so
 *                  that backtest runs at fixed historical dates produce
 *                  the correct same-date window for that date, not for
 *                  "now."
 * @param apiKey    Barchart API key for the live cash bid lookup
 */
export async function getSellScoreForFarm(
  supabase: SupabaseClient,
  farmId: string,
  crop: Crop,
  date: Date,
  apiKey: string,
): Promise<SellScoreResult> {
  const { farm, countyFips } = await getFarmState(supabase, farmId, crop);

  const elevator = getReferenceForCounty(countyFips);
  if (!elevator) {
    throw new Error(
      `No reference elevator for county ${countyFips}. ` +
      `Sell Score v1 supports only the 25 representative counties in OH/IN/IL/MI/eastern IA.`,
    );
  }

  // Three independent fetches in parallel: seasonal basis distribution,
  // latest observation, live cash bid. Cuts wall-time vs sequential by ~50%.
  const [seasonal, latestBasis, cashBid] = await Promise.all([
    fetchSeasonalBasis(supabase, countyFips, crop, date),
    fetchLatestBasis(supabase, countyFips, crop),
    fetchLiveCashBid(elevator, crop, apiKey),
  ]);

  const marketState: MarketState = {
    cashBid,
    todayBasis: latestBasis.basis,
    historicalBasis: seasonal.values,
    elevatorName: elevator.city, // 'DeWitt', 'Bowling Green', etc — clean for headline
  };

  const recommendation = computeSellScore(crop, date, farm, marketState);

  return {
    recommendation,
    meta: {
      elevatorId: elevator.elevatorId,
      elevatorName: elevator.elevatorName,
      elevatorCity: elevator.city,
      countyFips,
      basisDataAsOf: latestBasis.asOf,
      historicalSampleSize: seasonal.sampleSize,
      basisWindowDescription: seasonal.windowDescription,
    },
  };
}