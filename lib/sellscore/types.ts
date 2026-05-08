// lib/sellscore/types.ts
// =============================================================================
// HarvestFile Sell Score — Engine Types (Locked, per Week 1 Plan Task 4.2)
//
// These types are the source of truth for the recommendation engine.
// The recommendation engine (Thursday's work) produces a Recommendation.
// The UI display layer in display-types.ts wraps this with formatting context.
// =============================================================================

export type SignalStatus = 'green' | 'yellow' | 'red';

export type RecommendationType = 'sell' | 'hold' | 'pace_alert' | 'out_of_season';

export type Crop = 'corn' | 'soybeans' | 'wheat' | 'sorghum';

export interface FarmContext {
  farm_id: string;
  county_fips: string;
  state_code: string;
  total_acres: number;
  primary_crops: Crop[];
}

export interface CropPosition {
  crop: Crop;
  crop_year: number;
  expected_bushels: number;
  unsold_bushels: number;
  breakeven_dollars_per_bu: number;
  breakeven_source: 'county_default' | 'user_provided';
  pricing_pace_pct: number;
  target_pace_pct: number | null;
  arc_plc_election: 'ARC-CO' | 'PLC' | 'none' | 'unknown';
  insurance_coverage_level: number | null;
  insurance_has_sco: boolean;
  insurance_has_eco: boolean;
  insurance_eco_level: number | null;
  effective_floor_dollars_per_bu: number | null;
}

export interface MarketSnapshot {
  crop: Crop;
  best_cash_bid: number;
  best_elevator_id: string;
  best_elevator_name: string;
  /** Basis in dollars per bushel (negative means below futures, e.g. -0.55) */
  current_basis: number;
  /** Percentile 0-100 of current basis vs 3-year same-date rolling norm */
  basis_3yr_percentile: number;
  futures_price: number;
  observation_date: Date;
}

export interface Recommendation {
  farm_id: string;
  crop: Crop;
  recommendation_date: Date;
  recommendation_type: RecommendationType;
  recommended_bushels: number | null;
  recommended_elevator_id: string | null;
  recommended_elevator_name: string | null;
  recommended_cash_bid: number | null;
  margin_signal: SignalStatus;
  basis_signal: SignalStatus;
  pace_signal: SignalStatus;
  /** Basis in dollars per bushel at time of recommendation */
  current_basis: number;
  basis_3yr_percentile: number;
  /** Effective downside floor from ARC/PLC + crop insurance, in $/bu */
  effective_floor: number | null;
  rationale_text: string;
}