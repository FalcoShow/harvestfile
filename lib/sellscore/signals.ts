// lib/sellscore/signals.ts
//
// GREEN/AMBER/RED classification for the three Sell Score signals:
//   1. Margin — does cash bid cover breakeven + margin target?
//   2. Basis  — is today's local basis in the top quartile of historical norm?
//   3. Pace   — is the farmer at, behind, or ahead of calendar target?
//
// Each function is pure and deterministic. Historical data is passed in by
// the caller; this module does not fetch from the database. The basis
// signal expects historicalBasisValues to be the seasonally-filtered set
// returned by lib/sellscore/seasonal-basis.ts (3-year ±14 day same-date
// window), not the full unfiltered distribution.

export type SignalLevel = 'GREEN' | 'AMBER' | 'RED';

export interface MarginSignal {
  level: SignalLevel;
  cashBid: number;            // $/bu
  breakeven: number;          // $/bu
  marginTarget: number;       // $/bu (default 0.20)
  margin: number;             // cashBid - breakeven
  surplusOverTarget: number;  // margin - marginTarget (negative if short of target)
}

export interface BasisSignal {
  level: SignalLevel;
  todayBasis: number;          // $/bu (negative typical inland)
  percentileRank: number;      // 0–100, where today falls in historical distribution
  threshold75thPctl: number;   // 75th percentile of historical sample
  threshold50thPctl: number;   // 50th percentile (median)
  historicalSampleSize: number;
  hasEnoughHistory: boolean;   // false if sample size < BASIS_MIN_SAMPLE_SIZE (seasonal window too thin)
}

export interface PaceSignal {
  level: SignalLevel;
  currentPctSold: number;      // 0–100
  targetPctSold: number;       // 0–100 (from pace-calendar)
  gap: number;                 // currentPctSold - targetPctSold (negative = behind)
}

export interface SignalSet {
  margin: MarginSignal;
  basis: BasisSignal;
  pace: PaceSignal;
  greenCount: number;          // 0–3, used by recommendation-engine to gate sells
}

const MARGIN_TARGET_DEFAULT = 0.20;
// Threshold sized for the 3-year ±14 day seasonal window from
// lib/sellscore/seasonal-basis.ts. Theoretical max in that window is
// ~62 weekdays (3 × 29 × 5/7); realistic for full-history counties is
// 30-55. A floor of 20 means "less than ~7 months of equivalent same-date
// data" — too thin for a defensible percentile, but lenient enough that
// healthy counties pass. Counties below this floor get forced RED with
// hasEnoughHistory=false (conservative posture per spec §2.5).
const BASIS_MIN_SAMPLE_SIZE = 20;
const PACE_AMBER_BAND_PP = 5;            // within ±5pp = AMBER

/**
 * Margin signal: does the cash bid cover breakeven plus margin target?
 *   GREEN: cashBid ≥ breakeven + marginTarget
 *   AMBER: breakeven ≤ cashBid < breakeven + marginTarget
 *   RED:   cashBid < breakeven
 */
export function classifyMarginSignal(
  cashBid: number,
  breakeven: number,
  marginTarget: number = MARGIN_TARGET_DEFAULT,
): MarginSignal {
  const margin = cashBid - breakeven;
  const surplusOverTarget = margin - marginTarget;

  let level: SignalLevel;
  if (margin >= marginTarget) level = 'GREEN';
  else if (margin >= 0) level = 'AMBER';
  else level = 'RED';

  return { level, cashBid, breakeven, marginTarget, margin, surplusOverTarget };
}

/**
 * Linear-interpolation percentile (R-7 method).
 * Returns the value at the given percentile of a sorted array.
 */
function percentile(sortedValues: number[], pct: number): number {
  if (sortedValues.length === 0) return NaN;
  if (sortedValues.length === 1) return sortedValues[0];

  const rank = (pct / 100) * (sortedValues.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedValues[lower];

  const frac = rank - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * frac;
}

/**
 * Returns the percentile rank (0–100) of `value` within `sortedValues`.
 * Equal to the % of values that are ≤ value.
 */
function percentileRank(sortedValues: number[], value: number): number {
  if (sortedValues.length === 0) return NaN;
  let lo = 0;
  let hi = sortedValues.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedValues[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sortedValues.length) * 100;
}

/**
 * Basis signal: is today's basis better than recent history?
 *   GREEN: todayBasis ≥ 75th percentile
 *   AMBER: 50th ≤ todayBasis < 75th
 *   RED:   below 50th, OR thin sample (<20 obs in the 3-yr ±14 day window)
 */
export function classifyBasisSignal(
  todayBasis: number,
  historicalBasisValues: number[],
): BasisSignal {
  const hasEnoughHistory = historicalBasisValues.length >= BASIS_MIN_SAMPLE_SIZE;
  const sorted = [...historicalBasisValues].sort((a, b) => a - b);

  const threshold50thPctl = percentile(sorted, 50);
  const threshold75thPctl = percentile(sorted, 75);
  const rank = percentileRank(sorted, todayBasis);

  let level: SignalLevel;
  if (!hasEnoughHistory) level = 'RED';
  else if (todayBasis >= threshold75thPctl) level = 'GREEN';
  else if (todayBasis >= threshold50thPctl) level = 'AMBER';
  else level = 'RED';

  return {
    level,
    todayBasis,
    percentileRank: rank,
    threshold75thPctl,
    threshold50thPctl,
    historicalSampleSize: historicalBasisValues.length,
    hasEnoughHistory,
  };
}

/**
 * Pace signal: are you behind, at, or ahead of the calendar target?
 *   GREEN: gap ≤ -5pp  (more than 5pp behind, room to sell)
 *   AMBER: gap within ±5pp  (at pace)
 *   RED:   gap > +5pp  (more than 5pp ahead, hold)
 */
export function classifyPaceSignal(
  currentPctSold: number,
  targetPctSold: number,
): PaceSignal {
  const gap = currentPctSold - targetPctSold;

  let level: SignalLevel;
  if (gap <= -PACE_AMBER_BAND_PP) level = 'GREEN';
  else if (gap <= PACE_AMBER_BAND_PP) level = 'AMBER';
  else level = 'RED';

  return { level, currentPctSold, targetPctSold, gap };
}

/**
 * Combine all three signals into a SignalSet with a count of GREENs.
 * The recommendation-engine uses greenCount to gate sell recommendations.
 */
export function combineSignals(
  margin: MarginSignal,
  basis: BasisSignal,
  pace: PaceSignal,
): SignalSet {
  const greenCount =
    (margin.level === 'GREEN' ? 1 : 0) +
    (basis.level === 'GREEN' ? 1 : 0) +
    (pace.level === 'GREEN' ? 1 : 0);
  return { margin, basis, pace, greenCount };
}