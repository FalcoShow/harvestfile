// lib/sellscore/display-types.ts
// =============================================================================
// HarvestFile Sell Score — Display Types
//
// The engine produces a typed Recommendation. The UI needs additional context
// (farmer name, formatted dates, elevator display info) that the engine doesn't
// include because it's not part of the recommendation logic. This file defines
// the composite shape the SellScoreScreen component renders from.
// =============================================================================

import type { CropPosition, Recommendation } from './types';

export interface FarmDisplayContext {
  farmer_first_name: string;
  farm_name: string;
  county: string;
  state: string;
  /** Display-formatted date, e.g. "Tuesday, May 5" */
  date_label: string;
}

export interface SupportingFigure {
  /** Cash bid in dollars per bushel, e.g. 4.85 */
  cash_price_per_bu: number;
  /** Basis in cents per bushel (negative = below futures), e.g. -55 */
  basis_cents: number;
  /** Percentile 0-100 of basis vs 3-year same-date norm */
  basis_percentile: number;
  /** Profit per acre locked by today's recommended sale, in dollars */
  profit_per_acre: number;
}

export interface PaceDisplay {
  ytd_pct: number;
  target_pct: number;
  /** Display-formatted target date label, e.g. "May 5" */
  target_date_label: string;
  status: 'on_pace' | 'behind' | 'ahead';
  /** Display-formatted status label, e.g. "On pace", "Behind pace — room to sell" */
  status_label: string;
}

export interface ElevatorDisplay {
  name: string;
  city: string;
  state: string;
  distance_miles: number;
}

export interface FloorDisplay {
  dollars_per_bu: number;
  /** e.g. "PLC reference + 85% RP coverage" */
  source_label: string;
}

export interface BreakevenDisplay {
  crop: string;
  dollars_per_bu: number;
}

/**
 * The full data shape the SellScoreScreen component renders from.
 *
 * In production: this is composed in a server component from
 * (a) the authenticated user's farm context,
 * (b) the engine's Recommendation output for today,
 * (c) display formatting helpers.
 *
 * In the preview page: mock-data.ts provides four hand-built scenarios.
 */
export interface SellScoreScreenData {
  context: FarmDisplayContext;
  recommendation: Recommendation;
  /** The composed display headline for the recommendation */
  headline: string;
  /**
   * Voice-spec one-line signal summary rendered directly under the headline
   * ("Margin and basis say sell. Pace is the blocker. Wait for the third
   * signal."). Written by the engine (rationale.ts signalSummary) and stored
   * in sellscore_recommendations.rationale_text line 2. Null when the source
   * row predates the summary or the line can't be recovered. (v6.6 backlog
   * #8 fix, July 23, 2026.)
   */
  signal_summary: string | null;
  /** Three supporting figures shown for 'sell' recommendations; null otherwise */
  supporting: SupportingFigure | null;
  /** Pace context block — always present */
  pace: PaceDisplay;
  /** Elevator info — present for 'sell' recommendations */
  elevator: ElevatorDisplay | null;
  /** All positions across crops, for the below-fold position card */
  positions: CropPosition[];
  /** Effective program-payment + insurance floor (informational only) */
  floor: FloorDisplay;
  /** Breakevens by crop, for context */
  breakevens: BreakevenDisplay[];
}
