// lib/sellscore/persist.ts
//
// Compute-and-persist orchestrator for the Sell Score.
//
// The pure engine lives in recommendation-engine.ts.
// The I/O layer (loads farm state, fetches Barchart, runs engine) lives in
// data-fetcher.ts as getSellScoreForFarm().
// This file is the persistence layer: takes the SellScoreResult from
// data-fetcher and writes it into sellscore_recommendations as a row the
// /sellscore/me screen can render.
//
// Single point of entry: computeAndPersistForFarm(supabase, farmId, date).
// Called by:
//   1. app/api/onboard/submit  — inline after farm setup completes
//   2. app/api/sellscore/compute  — manual recompute endpoint
//   3. Inngest cron at 4 AM ET (B2, future)
//
// All three paths use the same code path, same upsert semantics.
//
// Idempotency: one recommendation row per (farm_id, crop, recommendation_date).
// Re-running for the same date overwrites the previous row via check-then-write
// (no Postgres-level unique constraint on this tuple yet; v1.1 migration adds
// it and switches to ON CONFLICT).

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSellScoreForFarm, type SellScoreResult } from './data-fetcher';
import type { Crop } from './pace-calendar';

const V1_ENGINE_CROPS: ReadonlyArray<Crop> = ['corn', 'soybeans'];

export interface PersistOutcome {
  /** Number of recommendation rows successfully written or updated. */
  written: number;
  /** Crops that failed to compute (e.g., Barchart 4xx, missing position). */
  errors: Array<{ crop: string; error: string }>;
  /** UUID of each persisted recommendation row, for diagnostics. */
  recommendationIds: string[];
}

/**
 * Run the Sell Score engine for every v1-supported primary crop on this
 * farm and persist the results to sellscore_recommendations.
 *
 * Always uses a service-role Supabase client so it can read
 * county_basis_history (a public reference table) and write
 * sellscore_recommendations regardless of the caller's auth context.
 *
 * Returns a summary even on partial failure: if corn succeeds and soybeans
 * fails, you get { written: 1, errors: [{crop:'soybeans', ...}] }. Callers
 * decide whether partial success is acceptable; the onboard handler treats
 * any compute outcome (including zero successes) as non-fatal, while the
 * cron should re-queue failures for retry.
 */
export async function computeAndPersistForFarm(
  supabase: SupabaseClient,
  farmId: string,
  date: Date = new Date(),
): Promise<PersistOutcome> {
  const apiKey = process.env.BARCHART_API_KEY;
  if (!apiKey) {
    throw new Error(
      'BARCHART_API_KEY is not set. Add it to Vercel env vars before running compute.',
    );
  }

  // Load farm so we know which crops to compute for.
  const { data: farm, error: farmErr } = await supabase
    .from('farms')
    .select('id, sellscore_active, sellscore_primary_crops')
    .eq('id', farmId)
    .single();

  if (farmErr || !farm) {
    throw new Error(
      `Farm ${farmId} not found: ${farmErr?.message ?? 'no row returned'}`,
    );
  }

  if (!farm.sellscore_active) {
    // Inactive farms skip silently. The cron uses this to ignore lapsed
    // subscriptions; onboard never calls this with an inactive farm.
    return { written: 0, errors: [], recommendationIds: [] };
  }

  const primaryCrops = (farm.sellscore_primary_crops ?? []) as string[];
  const enginereadyCrops = primaryCrops.filter((c): c is Crop =>
    (V1_ENGINE_CROPS as ReadonlyArray<string>).includes(c),
  );

  const outcome: PersistOutcome = {
    written: 0,
    errors: [],
    recommendationIds: [],
  };

  if (enginereadyCrops.length === 0) {
    return outcome;
  }

  // Compute one crop at a time. Sequential, not parallel: Barchart sandbox
  // rate-limits aggressive bursts, and the total wall time is roughly
  // 4-7 seconds for two crops, which is acceptable inside an onboarding
  // submit handler.
  for (const crop of enginereadyCrops) {
    try {
      const result = await getSellScoreForFarm(
        supabase,
        farmId,
        crop,
        date,
        apiKey,
      );

      const row = mapToRecommendationRow(farmId, result);
      const persistedId = await upsertRecommendation(supabase, row);
      outcome.written += 1;
      outcome.recommendationIds.push(persistedId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(
        `[sellscore/persist] compute failed for farm=${farmId} crop=${crop}:`,
        msg,
      );
      outcome.errors.push({ crop, error: msg });
    }
  }

  return outcome;
}

// =============================================================================
// Internal helpers
// =============================================================================

interface RecommendationRow {
  farm_id: string;
  crop: string;
  recommendation_date: string; // YYYY-MM-DD
  recommendation_type: string;
  recommended_bushels: number | null;
  recommended_elevator_id: string | null;
  recommended_elevator_name: string | null;
  recommended_cash_bid: number;
  margin_signal: string;
  basis_signal: string;
  pace_signal: string;
  current_basis: number;
  basis_3yr_percentile: number;
  effective_floor: number | null;
  rationale_text: string;
}

function mapToRecommendationRow(
  farmId: string,
  result: SellScoreResult,
): RecommendationRow {
  const { recommendation: r, meta } = result;

  // Engine action → DB recommendation_type.
  // Engine yields 'SELL' | 'WATCH' | 'HOLD' | 'OUT_OF_SEASON'.
  // DB schema (per existing /sellscore/me composition + adapter.ts):
  //   - 'sell'           → action=SELL
  //   - 'out_of_season'  → action=OUT_OF_SEASON
  //   - 'pace_alert'     → action=HOLD AND pace=GREEN (behind, but other
  //                        signals blocked sell — surface as pace nudge)
  //   - 'hold'           → everything else (incl. WATCH and ordinary HOLD)
  let recommendationType: string;
  if (r.rationale.action === 'SELL') {
    recommendationType = 'sell';
  } else if (r.rationale.action === 'OUT_OF_SEASON') {
    recommendationType = 'out_of_season';
  } else if (
    r.rationale.action === 'HOLD' &&
    r.signals.pace.level === 'GREEN'
  ) {
    recommendationType = 'pace_alert';
  } else {
    recommendationType = 'hold';
  }

  const isSell = recommendationType === 'sell';

  // Margin and basis use direct mapping (GREEN/AMBER/RED → green/yellow/red).
  // Pace uses INVERTED mapping per adapter.ts "Pace inversion":
  //   engine GREEN ("behind, urgent to sell") → display 'red' (warning).
  //   engine AMBER ("close to target")        → display 'green' (no warning).
  //   engine RED   ("ahead of target")        → display 'yellow' (caution).
  const directSignal = (level: 'GREEN' | 'AMBER' | 'RED'): string =>
    level === 'GREEN' ? 'green' : level === 'AMBER' ? 'yellow' : 'red';

  const invertedPace = (level: 'GREEN' | 'AMBER' | 'RED'): string =>
    level === 'GREEN' ? 'red' : level === 'AMBER' ? 'green' : 'yellow';

  // Build a multi-line rationale string the /sellscore/me page can split
  // (the page takes the first non-empty line as the headline and uses the
  // rest for the longer copy).
  const rationaleText = [
    r.rationale.headline,
    r.rationale.signalSummary,
    `Margin: ${r.rationale.details.margin}`,
    `Basis: ${r.rationale.details.basis}`,
    `Pace: ${r.rationale.details.pace}`,
  ]
    .filter((line) => line && line.trim().length > 0)
    .join('\n');

  return {
    farm_id: farmId,
    crop: r.crop,
    recommendation_date: formatDateYmd(r.date),
    recommendation_type: recommendationType,
    recommended_bushels:
      r.recommendedBushels > 0 ? r.recommendedBushels : null,
    recommended_elevator_id: isSell ? meta.elevatorId : null,
    recommended_elevator_name: isSell
      ? `${meta.elevatorName}, ${meta.elevatorCity}`
      : null,
    recommended_cash_bid: round2(r.signals.margin.cashBid),
    margin_signal: directSignal(r.signals.margin.level),
    basis_signal: directSignal(r.signals.basis.level),
    pace_signal: invertedPace(r.signals.pace.level),
    current_basis: round4(r.signals.basis.todayBasis),
    basis_3yr_percentile: round1(r.signals.basis.percentileRank),
    // v1: leave null. v1.1 will compute ARC/PLC + crop insurance floor.
    effective_floor: null,
    rationale_text: rationaleText,
  };
}

/**
 * Upsert by (farm_id, crop, recommendation_date). Schema has no unique
 * constraint on that tuple, so we do an explicit check-then-write rather
 * than relying on Postgres ON CONFLICT. Adding the unique constraint is a
 * v1.1 migration; for v1, this is safe under the single-writer invariant
 * (onboard handler gated by setup_complete; compute endpoint runs in Next
 * runtime per-request; cron is a single Inngest function with one execution
 * per farm per day).
 *
 * Returns the row's UUID.
 */
async function upsertRecommendation(
  supabase: SupabaseClient,
  row: RecommendationRow,
): Promise<string> {
  const { data: existing, error: lookupErr } = await supabase
    .from('sellscore_recommendations')
    .select('id')
    .eq('farm_id', row.farm_id)
    .eq('crop', row.crop)
    .eq('recommendation_date', row.recommendation_date)
    .maybeSingle<{ id: string }>();

  if (lookupErr) {
    throw new Error(
      `Lookup failed before upsert (farm=${row.farm_id} crop=${row.crop} date=${row.recommendation_date}): ${lookupErr.message}`,
    );
  }

  if (existing) {
    const { error: updateErr } = await supabase
      .from('sellscore_recommendations')
      .update(row)
      .eq('id', existing.id);
    if (updateErr) {
      throw new Error(
        `Update failed for recommendation ${existing.id}: ${updateErr.message}`,
      );
    }
    return existing.id;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('sellscore_recommendations')
    .insert(row)
    .select('id')
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    throw new Error(
      `Insert failed for recommendation: ${insertErr?.message ?? 'no row returned'}`,
    );
  }

  return inserted.id;
}

function formatDateYmd(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}