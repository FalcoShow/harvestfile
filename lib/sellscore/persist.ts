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
//   3. Inngest cron at 4 AM ET (B2)
//
// All three paths use the same code path, same upsert semantics.
//
// Idempotency: one recommendation row per (farm_id, crop, recommendation_date).
// Re-running for the same date overwrites the previous row via check-then-write
// (no Postgres-level unique constraint on this tuple yet; v1.1 migration adds
// it and switches to ON CONFLICT).
//
// Item C (May 16, 2026): Multi-crop priority writer
// =================================================
//   Previous behavior wrote one recommendation row per primary crop per
//   day. That's correct as data, but /sellscore/me's headline query is
//   `order by recommendation_date DESC, created_at DESC, limit 1` —
//   meaning whichever crop got persisted LAST silently masked the other
//   on the screen. A farmer with corn AND soybeans in SELL would only
//   see one of them.
//
//   New behavior: compute every supported crop in memory first, sort by
//   priority (highest dollar-of-opportunity, ties broken by largest
//   unsold position), then persist only the winner. Skipped crops do
//   not write today; tomorrow's compute may surface them when market
//   dynamics shift. Their last successful row remains in the DB but
//   ages out of the latest-by-date query.
//
//   Priority calculation:
//     dollarOfOpportunity = max(0, (cashBid - breakeven) × recommendedBushels)
//     unsoldBushels       = expected_bushels - bushels_contracted (from grain_positions)
//
//   For HOLD / OUT_OF_SEASON, recommendedBushels = 0, so opportunity is
//   $0 and the comparison falls through to the unsold tiebreaker.

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
 * farm, pick a single winner deterministically, and persist its row to
 * sellscore_recommendations.
 *
 * Item C policy: only the winner's row is written today. Skipped crops
 * remain in the DB at their last successful date but do not render as
 * today's recommendation on /sellscore/me.
 *
 * Always uses a service-role Supabase client so it can read
 * county_basis_history (a public reference table) and write
 * sellscore_recommendations regardless of the caller's auth context.
 *
 * Returns a summary even on partial failure. If all crops fail, you get
 * { written: 0, errors: [...] }; if at least one crop computes, the
 * winner is selected from the surviving set.
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

  // Pull unsold bushels per crop for the priority tiebreaker. v1.1 will
  // expose unsold on the engine result directly; for v1, one short query
  // before the compute loop is the lowest-risk implementation.
  const unsoldByCrop = await loadUnsoldByCrop(supabase, farmId);

  // ── Phase 1: Compute every supported crop in memory (no persist yet) ─
  // Sequential, not parallel: Barchart sandbox rate-limits aggressive
  // bursts, and the total wall time is roughly 4-7 seconds for two crops,
  // which is acceptable inside an onboarding submit handler.
  interface ComputedCrop {
    crop: Crop;
    result: SellScoreResult;
    dollarOfOpportunity: number;
    unsoldBushels: number;
  }
  const computed: ComputedCrop[] = [];

  for (const crop of enginereadyCrops) {
    try {
      const result = await getSellScoreForFarm(
        supabase,
        farmId,
        crop,
        date,
        apiKey,
      );
      const r = result.recommendation;
      // Dollar-of-opportunity = (cash bid - breakeven) × recommended bushels.
      // For HOLD / OUT_OF_SEASON, recommendedBushels is 0 → opportunity is 0
      // and the comparison falls through to the unsold tiebreaker.
      // For SELL / WATCH, this is the dollar value of executing today's rec.
      const margin = r.signals.margin.cashBid - r.signals.margin.breakeven;
      const dollarOfOpportunity = Math.max(0, margin * r.recommendedBushels);
      computed.push({
        crop,
        result,
        dollarOfOpportunity,
        unsoldBushels: unsoldByCrop.get(crop) ?? 0,
      });
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

  if (computed.length === 0) {
    // No crops computed successfully. Return errors-only outcome. The
    // Inngest worker treats { written: 0, errors: [...] } as a retry
    // signal (codified learning #15).
    return outcome;
  }

  // ── Phase 2: Pick the winner ────────────────────────────────────────
  // Priority: highest dollar-of-opportunity first, ties broken by
  // largest unsold position. Skipped crops will surface naturally on
  // future days when market conditions shift the priority order.
  computed.sort((a, b) => {
    if (a.dollarOfOpportunity !== b.dollarOfOpportunity) {
      return b.dollarOfOpportunity - a.dollarOfOpportunity;
    }
    return b.unsoldBushels - a.unsoldBushels;
  });
  const winner = computed[0];
  const skipped = computed.slice(1);

  // ── Phase 3: Persist only the winner ────────────────────────────────
  try {
    const row = mapToRecommendationRow(farmId, winner.result);
    const persistedId = await upsertRecommendation(supabase, row);
    outcome.written = 1;
    outcome.recommendationIds.push(persistedId);

    // Diagnostic log so the priority resolution is visible in Vercel /
    // Inngest logs. Helps confirm the right crop won when investigating
    // "why am I seeing corn when I expected soybeans" reports.
    if (skipped.length > 0) {
      const skipDetail = skipped
        .map(
          (s) =>
            `${s.crop} ($${s.dollarOfOpportunity.toFixed(2)} opp, ${s.unsoldBushels} bu unsold)`,
        )
        .join(', ');
      // eslint-disable-next-line no-console
      console.log(
        `[sellscore/persist] farm=${farmId} winner=${winner.crop} ` +
          `($${winner.dollarOfOpportunity.toFixed(2)} opp, ${winner.unsoldBushels} bu unsold). ` +
          `Skipped: ${skipDetail}`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(
      `[sellscore/persist] persist failed for farm=${farmId} crop=${winner.crop}:`,
      msg,
    );
    outcome.errors.push({ crop: winner.crop, error: msg });
  }

  return outcome;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Load unsold bushels per crop for this farm, keyed by commodity name.
 * Returns an empty map if no positions exist; callers default missing
 * entries to 0.
 */
async function loadUnsoldByCrop(
  supabase: SupabaseClient,
  farmId: string,
): Promise<Map<string, number>> {
  const { data: positionRows } = await supabase
    .from('grain_positions')
    .select('commodity, expected_bushels, bushels_contracted')
    .eq('farm_id', farmId);

  const unsoldByCrop = new Map<string, number>();
  for (const p of (positionRows ?? []) as Array<{
    commodity: string | null;
    expected_bushels: number | null;
    bushels_contracted: number | null;
  }>) {
    if (!p.commodity) continue;
    const expected = Number(p.expected_bushels ?? 0);
    const contracted = Number(p.bushels_contracted ?? 0);
    unsoldByCrop.set(p.commodity, Math.max(0, expected - contracted));
  }

  return unsoldByCrop;
}

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

  // ALL THREE signals use direct mapping (GREEN/AMBER/RED → green/yellow/red).
  //
  // July 23, 2026 fix (v6.6 backlog #1, HIGH): pace previously used an
  // inverted mapping (engine GREEN → 'red') on the theory that "behind pace"
  // should render as a warning. That contradicted spec §4.4 — behind pace is
  // GREEN (urgency to sell = the signal favors action) — and produced the
  // July 23 live screenshot showing amber/orange pace at 45% priced vs 88%
  // target. The stored signal now carries engine semantics verbatim; the
  // human-readable state ("Behind pace — room to sell") is derived at the
  // display layer (app/sellscore/me/page.tsx, lib/sellscore/adapter.ts).
  //
  // Data note: rows written before this fix carry the inverted pace_signal
  // until their next recompute (4 AM cron or POST /api/sellscore/compute).
  const directSignal = (level: 'GREEN' | 'AMBER' | 'RED'): string =>
    level === 'GREEN' ? 'green' : level === 'AMBER' ? 'yellow' : 'red';

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
    pace_signal: directSignal(r.signals.pace.level),
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