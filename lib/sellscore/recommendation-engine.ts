// lib/sellscore/recommendation-engine.ts
//
// Orchestrator for the Sell Score v1. Takes a farmer's full state plus
// market data plus a date, runs all four engine modules in sequence, and
// returns a single SellScoreRecommendation that the UI renders directly.
//
// Pure function — no I/O, no DB calls. data-fetcher.ts is what pulls
// farm and market state from Supabase and feeds it into this.

import { type Crop, getTargetPaceForDate } from './pace-calendar';
import {
  classifyMarginSignal,
  classifyBasisSignal,
  classifyPaceSignal,
  combineSignals,
  type SignalSet,
} from './signals';
import { computeRecommendedQuantity, type QuantityCalc } from './quantity';
import { generateRationale, type Rationale } from './rationale';

export interface FarmState {
  /** Total acres planted to this crop. */
  totalAcres: number;
  /** Total expected production for the marketing year (bushels). */
  expectedBushels: number;
  /** Cost to produce one bushel ($/bu). */
  breakeven: number;
  /** Margin target above breakeven ($/bu). Default 0.20 if omitted. */
  marginTarget?: number;
  /** Bushels already priced/sold for this marketing year. */
  bushelsSold: number;
}

export interface MarketState {
  /** Today's best cash bid ($/bu). */
  cashBid: number;
  /** Today's local basis ($/bu, typically negative inland). */
  todayBasis: number;
  /** Historical basis values for the percentile calculation ($/bu). */
  historicalBasis: number[];
  /** Elevator name for display in headline. Optional. */
  elevatorName?: string;
}

export interface SellScoreRecommendation {
  /** The Sell Score: dollar-per-acre captured by following today's action. */
  scoreDollarsPerAcre: number;
  /** Calendar target % from pace-calendar (0–100). */
  targetPctSold: number;
  /** Current % sold = bushelsSold / expectedBushels × 100. */
  currentPctSold: number;
  /** Effective recommended bushels. Aligned with action — 0 when HOLD or OUT_OF_SEASON. */
  recommendedBushels: number;
  /** All three signals with details. */
  signals: SignalSet;
  /** Raw quantity calc with reasoning (kept for inspection/analytics). */
  quantity: QuantityCalc;
  /** Action + headline + summary + per-signal details. */
  rationale: Rationale;
  /** The crop being scored. */
  crop: Crop;
  /** Reference date the score is computed for. */
  date: Date;
}

/**
 * Compute today's Sell Score for a single crop position at a single elevator.
 * v1 engine entrypoint. Pure function — all I/O lives in data-fetcher.ts.
 */
export function computeSellScore(
  crop: Crop,
  date: Date,
  farm: FarmState,
  market: MarketState,
): SellScoreRecommendation {
  // 1. Pace from calendar
  const targetPctSold = getTargetPaceForDate(crop, date);
  const currentPctSold =
    farm.expectedBushels > 0
      ? (farm.bushelsSold / farm.expectedBushels) * 100
      : 0;
  const unsoldBushels = Math.max(0, farm.expectedBushels - farm.bushelsSold);

  // 2. Signals (always computed, even when OUT_OF_SEASON, so the screen
  //    can still show contextual market data alongside the headline).
  const margin = classifyMarginSignal(
    market.cashBid,
    farm.breakeven,
    farm.marginTarget,
  );
  const basis = classifyBasisSignal(market.todayBasis, market.historicalBasis);
  const pace = classifyPaceSignal(currentPctSold, targetPctSold);
  const signals = combineSignals(margin, basis, pace);

  // 3. Quantity (raw — may be > 0 even when action ends up HOLD; will
  //    naturally be 0 when unsoldBushels is 0, which is OUT_OF_SEASON.)
  const quantity = computeRecommendedQuantity(
    unsoldBushels,
    farm.expectedBushels,
    currentPctSold,
    targetPctSold,
  );

  // 4. Rationale (action determination lives here, includes the
  //    OUT_OF_SEASON gate at top priority and the margin-RED gate).
  const rationale = generateRationale({
    crop,
    cashBid: market.cashBid,
    signals,
    quantity,
    elevatorName: market.elevatorName,
    expectedBushels: farm.expectedBushels,
    bushelsSold: farm.bushelsSold,
    date,
  });

  // 5. Sell Score = profit per acre at today's effective action.
  // Align with action: HOLD or OUT_OF_SEASON → 0, otherwise the
  // recommended bushels at margin. WATCH still surfaces a forward-
  // looking score (what tomorrow's SELL would capture) by design.
  const noSellingAction =
    rationale.action === 'HOLD' || rationale.action === 'OUT_OF_SEASON';
  const effectiveBushels = noSellingAction ? 0 : quantity.recommendedBushels;
  const recommendedMargin =
    (market.cashBid - farm.breakeven) * effectiveBushels;
  const scoreDollarsPerAcre =
    farm.totalAcres > 0
      ? Math.max(0, recommendedMargin / farm.totalAcres)
      : 0;

  return {
    scoreDollarsPerAcre,
    targetPctSold,
    currentPctSold,
    recommendedBushels: effectiveBushels,
    signals,
    quantity,
    rationale,
    crop,
    date,
  };
}
