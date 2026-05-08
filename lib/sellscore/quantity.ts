// lib/sellscore/quantity.ts
//
// Computes the recommended bushel quantity for a sell decision.
// Per Sell Score v1 spec, Section 4.4:
//
//   quantity = min(
//     unsold_bushels,
//     (target_pct − current_pct) / 100 × expected_bushels × 1.5
//   )
//   rounded DOWN to 500-bu increments
//   capped at 25% of unsold per day
//
// Returns 0 when the farmer is at/ahead of pace, or when the gap is too
// small to round up to a single 500-bu lot.

export type QuantityReasoning =
  | 'no_gap_to_fill'        // current ≥ target
  | 'gap_filled_to_target'  // gap math is the binding constraint
  | 'capped_at_daily_max'   // 25% daily cap is the binding constraint
  | 'capped_at_unsold';     // unsold inventory is the binding constraint

export interface QuantityCalc {
  recommendedBushels: number;
  unsoldBushels: number;
  expectedBushels: number;
  currentPctSold: number;
  targetPctSold: number;
  paceGapPct: number;        // target − current (positive if behind)
  paceGapBushels: number;    // (gap/100) × expected × acceleration, pre-cap
  dailyCapBushels: number;   // unsold × dailyCapPct
  reasoning: QuantityReasoning;
}

export interface QuantityOptions {
  accelerationFactor?: number;  // default 1.5
  dailyCapPct?: number;         // default 25
  increment?: number;           // default 500 bu
}

const DEFAULT_ACCELERATION = 1.5;
const DEFAULT_DAILY_CAP_PCT = 25;
const DEFAULT_INCREMENT = 500;

/**
 * Round DOWN to the nearest increment. Conservative: never recommends more
 * than the math indicates. Returns 0 if value is below one full increment.
 */
function roundDownToIncrement(value: number, increment: number): number {
  if (value <= 0) return 0;
  return Math.floor(value / increment) * increment;
}

/**
 * Compute the recommended sell quantity for today's decision.
 *
 * @param unsoldBushels    Current unsold inventory (bushels)
 * @param expectedBushels  Total expected production for the marketing year
 * @param currentPctSold   % of expected already sold (0–100)
 * @param targetPctSold    Calendar target % (0–100), from pace-calendar
 * @param options          Optional overrides
 */
export function computeRecommendedQuantity(
  unsoldBushels: number,
  expectedBushels: number,
  currentPctSold: number,
  targetPctSold: number,
  options: QuantityOptions = {},
): QuantityCalc {
  const acceleration = options.accelerationFactor ?? DEFAULT_ACCELERATION;
  const dailyCapPct = options.dailyCapPct ?? DEFAULT_DAILY_CAP_PCT;
  const increment = options.increment ?? DEFAULT_INCREMENT;

  const paceGapPct = targetPctSold - currentPctSold;
  const paceGapBushels = Math.max(
    0,
    (paceGapPct / 100) * expectedBushels * acceleration,
  );
  const dailyCapBushels = unsoldBushels * (dailyCapPct / 100);

  // Defensive: at or ahead of pace → no recommendation
  if (paceGapPct <= 0) {
    return {
      recommendedBushels: 0,
      unsoldBushels,
      expectedBushels,
      currentPctSold,
      targetPctSold,
      paceGapPct,
      paceGapBushels,
      dailyCapBushels,
      reasoning: 'no_gap_to_fill',
    };
  }

  // Three caps in play: gap, unsold, daily-max
  const rawQuantity = Math.min(paceGapBushels, unsoldBushels, dailyCapBushels);
  const recommendedBushels = roundDownToIncrement(rawQuantity, increment);

  // Identify which cap was binding. Ties go to gap_filled_to_target by
  // checking that branch first — this is the most common case in practice
  // and the most informative for downstream rationale generation.
  let reasoning: QuantityReasoning;
  if (rawQuantity === paceGapBushels) reasoning = 'gap_filled_to_target';
  else if (rawQuantity === dailyCapBushels) reasoning = 'capped_at_daily_max';
  else reasoning = 'capped_at_unsold';

  return {
    recommendedBushels,
    unsoldBushels,
    expectedBushels,
    currentPctSold,
    targetPctSold,
    paceGapPct,
    paceGapBushels,
    dailyCapBushels,
    reasoning,
  };
}