// lib/sellscore/rationale.ts
//
// Generates the farmer-facing one-line recommendation from a SignalSet
// and a QuantityCalc. Plain language voice tuned for 58+ farmers reading
// at 5:30 AM on a phone.
//
// Action policy (priority order — top wins):
//   - bushelsSold ≥ expectedBushels → OUT_OF_SEASON  (nothing to sell)
//   - margin RED → HOLD                              (don't sell at a loss)
//   - quantity = 0 → HOLD                            (already at/ahead of pace)
//   - greenCount === 3 → SELL
//   - greenCount === 2 → WATCH
//   - else → HOLD
//
// OUT_OF_SEASON requires both expectedBushels and bushelsSold to be
// supplied on the RationaleInput. They are optional on the interface so
// that legacy callers (e.g., scripts/test-rationale.ts) continue to work
// without modification — if either is omitted, the OUT_OF_SEASON branch
// can't fire and the rest of the policy runs as before. The production
// engine in recommendation-engine.ts always supplies both.

import type { Crop } from './pace-calendar';
import type {
  SignalSet,
  MarginSignal,
  BasisSignal,
  PaceSignal,
} from './signals';
import type { QuantityCalc } from './quantity';

export type ActionLevel = 'SELL' | 'WATCH' | 'HOLD' | 'OUT_OF_SEASON';

export interface RationaleDetails {
  margin: string;
  basis: string;
  pace: string;
}

export interface Rationale {
  action: ActionLevel;
  headline: string;
  signalSummary: string;
  details: RationaleDetails;
}

export interface RationaleInput {
  crop: Crop;
  cashBid: number;
  signals: SignalSet;
  quantity: QuantityCalc;
  elevatorName?: string;
  /**
   * Total bushels expected for this marketing year. Required to detect
   * OUT_OF_SEASON; if omitted, the OUT_OF_SEASON branch is skipped and
   * the action falls through to the existing margin/signals policy.
   */
  expectedBushels?: number;
  /**
   * Bushels already priced/sold for this marketing year. Required to
   * detect OUT_OF_SEASON; if omitted, the OUT_OF_SEASON branch is
   * skipped.
   */
  bushelsSold?: number;
  /**
   * Reference date used for OUT_OF_SEASON marketing year derivation.
   * Defaults to current time if omitted.
   */
  date?: Date;
}

const CROP_DISPLAY: Record<Crop, string> = {
  corn: 'corn',
  soybeans: 'beans',
};

function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${abs.toFixed(2)}`;
}

function formatBushels(n: number): string {
  return n.toLocaleString('en-US');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────
// Marketing year helpers (corn/soybeans: Sept 1 → Aug 31)
// ─────────────────────────────────────────────────────────────────────────
//
// v1 derives the marketing year from today's date. This is correct for
// the standard case (farmer checking their current crop year position).
// For wheat, the marketing year is June 1 → May 31; that crop isn't in
// the v1 engine, but if it lands in v1.1 these helpers need a per-crop
// branch. v1.1 may also plumb grain_positions.crop_year through FarmState
// for exact accuracy on edge cases (e.g., farmer checking a 2-year-old
// position from a long-archived crop year).

/**
 * Marketing year label for corn/soybeans, e.g. "2025/26".
 * Marketing year runs Sept 1 through Aug 31 of the following calendar
 * year, named by the year in which the crop was planted/harvested.
 */
function getMarketingYearLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed; 8 = September
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

/**
 * Returns the start of the NEXT marketing year (Sept 1) from the given
 * date. If we're already past Sept 1 this calendar year, it's Sept 1 of
 * next year; otherwise it's Sept 1 of this year.
 */
function getNextMarketingYearStart(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const nextStartYear = month >= 8 ? year + 1 : year;
  return new Date(Date.UTC(nextStartYear, 8, 1)); // 8 = September
}

/**
 * Format a date as "Month D, YYYY" (e.g., "September 1, 2026") in UTC
 * to avoid timezone drift between server and client renders.
 */
function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

// ─────────────────────────────────────────────────────────────────────────
// Action determination
// ─────────────────────────────────────────────────────────────────────────

function determineAction(
  signals: SignalSet,
  quantity: QuantityCalc,
  expectedBushels?: number,
  bushelsSold?: number,
): ActionLevel {
  // Top priority: out of season. If the farmer has priced everything
  // they expected to harvest for this marketing year, no other signal
  // matters — there are no bushels left to sell. Both fields must be
  // provided; absence means we can't make the determination and the
  // rest of the policy runs.
  if (
    expectedBushels !== undefined &&
    bushelsSold !== undefined &&
    expectedBushels > 0 &&
    bushelsSold >= expectedBushels
  ) {
    return 'OUT_OF_SEASON';
  }
  if (signals.margin.level === 'RED') return 'HOLD';
  if (quantity.recommendedBushels === 0) return 'HOLD';
  if (signals.greenCount === 3) return 'SELL';
  if (signals.greenCount >= 2) return 'WATCH';
  return 'HOLD';
}

// ─────────────────────────────────────────────────────────────────────────
// Per-signal detail strings
// ─────────────────────────────────────────────────────────────────────────

function marginDetail(m: MarginSignal): string {
  const cash = formatCurrency(m.cashBid);
  const be = formatCurrency(m.breakeven);
  const target = formatCurrency(m.marginTarget);
  if (m.level === 'GREEN') {
    return `Cash ${cash} clears your ${target} margin target by ${formatCurrency(m.surplusOverTarget)}.`;
  }
  if (m.level === 'AMBER') {
    return `Cash ${cash} covers your breakeven of ${be}, but is ${formatCurrency(-m.surplusOverTarget)} short of your ${target} target.`;
  }
  return `Cash ${cash} is ${formatCurrency(-m.margin)} below your breakeven of ${be}.`;
}

function basisDetail(b: BasisSignal): string {
  if (!b.hasEnoughHistory) {
    return `Not enough basis history at this elevator yet (${b.historicalSampleSize} days). Score will firm up as data builds.`;
  }
  const today = formatCurrency(b.todayBasis);
  const pctl = Math.round(b.percentileRank);
  if (b.level === 'GREEN') {
    return `Today's basis ${today} is in the top quartile of recent prices (${pctl}th percentile, 75th is ${formatCurrency(b.threshold75thPctl)}).`;
  }
  if (b.level === 'AMBER') {
    return `Today's basis ${today} is in the middle of recent range (${pctl}th percentile).`;
  }
  return `Today's basis ${today} is below recent average (${pctl}th percentile, median is ${formatCurrency(b.threshold50thPctl)}).`;
}

function paceDetail(p: PaceSignal): string {
  const cur = p.currentPctSold.toFixed(0);
  const tgt = p.targetPctSold.toFixed(0);
  const gap = Math.abs(p.gap).toFixed(0);
  if (p.level === 'GREEN') {
    return `You're at ${cur}% sold. Target is ${tgt}%. ${gap} points behind, room to sell.`;
  }
  if (p.level === 'AMBER') {
    return `You're at ${cur}% sold. Target is ${tgt}%. Right on pace.`;
  }
  return `You're at ${cur}% sold. Target is ${tgt}%. ${gap} points ahead, no need to sell.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Headline + summary builders
// ─────────────────────────────────────────────────────────────────────────

function buildSellHeadline(input: RationaleInput): string {
  const qty = formatBushels(input.quantity.recommendedBushels);
  const crop = CROP_DISPLAY[input.crop];
  const price = formatCurrency(input.cashBid);
  const at = input.elevatorName ? `, ${input.elevatorName}` : '';
  return `Sell ${qty} bu ${crop} at ${price}${at}.`;
}

function buildSellSummary(): string {
  return `All three signals line up today. Basis is in the top quartile of recent prices, you're behind sales pace with room to catch up, and the cash bid clears your margin target.`;
}

function buildWatchSummary(signals: SignalSet): string {
  const greens: string[] = [];
  const off: string[] = [];
  if (signals.margin.level === 'GREEN') greens.push('margin'); else off.push('margin');
  if (signals.basis.level === 'GREEN') greens.push('basis'); else off.push('basis');
  if (signals.pace.level === 'GREEN') greens.push('pace'); else off.push('pace');
  const greenList = greens.join(' and ');
  const offOne = off[0];
  return `${capitalize(greenList)} look good, but ${offOne} is off. Wait for full alignment.`;
}

function buildHoldSummary(signals: SignalSet): string {
  if (signals.margin.level === 'RED') {
    return `The cash bid is below your breakeven. Don't sell at a loss.`;
  }
  if (
    signals.basis.level === 'RED' &&
    signals.basis.hasEnoughHistory &&
    signals.pace.level === 'RED'
  ) {
    return `Basis is below average and you're already ahead of pace. Sit tight.`;
  }
  if (signals.pace.level === 'RED') {
    return `You're already ahead of pace. No need to sell more right now.`;
  }
  if (signals.basis.level === 'RED' && signals.basis.hasEnoughHistory) {
    return `Basis is below recent average. Wait for a better day.`;
  }
  if (signals.basis.level === 'RED' && !signals.basis.hasEnoughHistory) {
    return `Not enough basis history yet to read the market here. Score will sharpen as data comes in.`;
  }
  return `Today's signals don't line up for a sale.`;
}

function buildOutOfSeasonHeadline(input: RationaleInput): string {
  const cropDisplay = CROP_DISPLAY[input.crop];
  const date = input.date ?? new Date();
  const myLabel = getMarketingYearLabel(date);
  return `All ${cropDisplay} priced for ${myLabel}.`;
}

function buildOutOfSeasonSummary(input: RationaleInput): string {
  const date = input.date ?? new Date();
  const currentLabel = getMarketingYearLabel(date);
  const nextStart = getNextMarketingYearStart(date);
  const nextStartYear = nextStart.getUTCFullYear();
  const nextLabel = `${nextStartYear}/${String(nextStartYear + 1).slice(-2)}`;
  const nextStartFormatted = formatLongDate(nextStart);
  return `You've finished marketing the ${currentLabel} crop. The ${nextLabel} marketing year begins ${nextStartFormatted}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Public entrypoint
// ─────────────────────────────────────────────────────────────────────────

export function generateRationale(input: RationaleInput): Rationale {
  const action = determineAction(
    input.signals,
    input.quantity,
    input.expectedBushels,
    input.bushelsSold,
  );
  const details: RationaleDetails = {
    margin: marginDetail(input.signals.margin),
    basis: basisDetail(input.signals.basis),
    pace: paceDetail(input.signals.pace),
  };

  let headline: string;
  let signalSummary: string;

  if (action === 'OUT_OF_SEASON') {
    headline = buildOutOfSeasonHeadline(input);
    signalSummary = buildOutOfSeasonSummary(input);
  } else if (action === 'SELL') {
    headline = buildSellHeadline(input);
    signalSummary = buildSellSummary();
  } else if (action === 'WATCH') {
    headline = `Hold off. Close to a sell day.`;
    signalSummary = buildWatchSummary(input.signals);
  } else {
    headline = `Hold today.`;
    signalSummary = buildHoldSummary(input.signals);
  }

  return { action, headline, signalSummary, details };
}
