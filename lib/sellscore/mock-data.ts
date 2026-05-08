// lib/sellscore/mock-data.ts
// =============================================================================
// HarvestFile Sell Score — Mock Scenarios (Preview Page Only)
//
// Four hand-built SellScoreScreenData objects representing the four
// recommendation types. Same hypothetical NE Ohio operation across all four
// scenarios so the demo toggle reads as "the same farmer on different days,"
// not four different mock farms.
//
// Anchored in real numbers:
//  - Breakeven values from county_breakeven_defaults (Task 2 Ohio averages)
//  - Cash prices reflect typical NE Ohio May spreads
//  - Basis percentiles reflect realistic 3-year same-date distributions
//  - Pace milestones follow the old-crop calendar from the v1 spec
// =============================================================================

import type { CropPosition, Recommendation, RecommendationType } from './types';
import type { SellScoreScreenData } from './display-types';

const TODAY = new Date('2026-05-05T11:00:00Z');
const FARM_ID = 'preview-farm-mahoning-oh';

// ─── Shared farm context across all scenarios ────────────────────────────────

const farmContext = {
  farmer_first_name: 'Tom',
  farm_name: 'Reilly Farms',
  county: 'Mahoning',
  state: 'OH',
  date_label: 'Tuesday, May 5',
};

const allPositions: CropPosition[] = [
  {
    crop: 'corn',
    crop_year: 2025,
    expected_bushels: 144000,
    unsold_bushels: 83520,
    breakeven_dollars_per_bu: 4.60,
    breakeven_source: 'county_default',
    pricing_pace_pct: 42,
    target_pace_pct: 40,
    arc_plc_election: 'ARC-CO',
    insurance_coverage_level: 0.85,
    insurance_has_sco: true,
    insurance_has_eco: false,
    insurance_eco_level: null,
    effective_floor_dollars_per_bu: 4.10,
  },
  {
    crop: 'soybeans',
    crop_year: 2025,
    expected_bushels: 35000,
    unsold_bushels: 21000,
    breakeven_dollars_per_bu: 11.36,
    breakeven_source: 'county_default',
    pricing_pace_pct: 40,
    target_pace_pct: 40,
    arc_plc_election: 'ARC-CO',
    insurance_coverage_level: 0.85,
    insurance_has_sco: true,
    insurance_has_eco: false,
    insurance_eco_level: null,
    effective_floor_dollars_per_bu: 10.20,
  },
];

const breakevens = [
  { crop: 'corn', dollars_per_bu: 4.60 },
  { crop: 'soybeans', dollars_per_bu: 11.36 },
];

const floor = {
  dollars_per_bu: 4.10,
  source_label: 'PLC reference + 85% RP + SCO',
};

// ─── Scenario 1: SELL — all three signals green ──────────────────────────────

const sellRecommendation: Recommendation = {
  farm_id: FARM_ID,
  crop: 'corn',
  recommendation_date: TODAY,
  recommendation_type: 'sell',
  recommended_bushels: 2500,
  recommended_elevator_id: 'buckeye-feed-and-grain-dalton-oh',
  recommended_elevator_name: 'Buckeye Feed and Grain',
  recommended_cash_bid: 4.85,
  margin_signal: 'green',
  basis_signal: 'green',
  pace_signal: 'green',
  current_basis: -0.55,
  basis_3yr_percentile: 78,
  effective_floor: 4.10,
  rationale_text:
    'Why we recommend selling 2,500 bu of corn today:\n\n' +
    'Margin: $4.85 cash bid is $0.25 above your breakeven of $4.60\n' +
    'Basis: -55¢ today, in the 78th percentile of the last 3 years for early May\n' +
    'Pace: You\'re 42% priced. Target is 40%. Selling 2,500 bu brings you to 44%, slightly ahead.\n\n' +
    'Past performance does not guarantee future results.',
};

const sellScenario: SellScoreScreenData = {
  context: farmContext,
  recommendation: sellRecommendation,
  headline: 'Sell 2,500 bu of corn today at Buckeye Feed and Grain.',
  supporting: {
    cash_price_per_bu: 4.85,
    basis_cents: -55,
    basis_percentile: 78,
    profit_per_acre: 52,
  },
  pace: {
    ytd_pct: 42,
    target_pct: 40,
    target_date_label: 'May 5',
    status: 'on_pace',
    status_label: 'On pace',
  },
  elevator: {
    name: 'Buckeye Feed and Grain',
    city: 'Dalton',
    state: 'OH',
    distance_miles: 22,
  },
  positions: allPositions,
  floor,
  breakevens,
};

// ─── Scenario 2: HOLD — most common state, no action warranted ───────────────

const holdRecommendation: Recommendation = {
  farm_id: FARM_ID,
  crop: 'corn',
  recommendation_date: TODAY,
  recommendation_type: 'hold',
  recommended_bushels: null,
  recommended_elevator_id: null,
  recommended_elevator_name: null,
  recommended_cash_bid: 4.82,
  margin_signal: 'green',
  basis_signal: 'yellow',
  pace_signal: 'green',
  current_basis: -0.62,
  basis_3yr_percentile: 52,
  effective_floor: 4.10,
  rationale_text:
    'Hold today. 41% priced, target 40%. Today\'s bid: $4.82, basis -62¢ (52nd pct).',
};

const holdScenario: SellScoreScreenData = {
  context: farmContext,
  recommendation: holdRecommendation,
  headline: 'Hold today. You\'re on pace and basis is mid\u2011range.',
  supporting: null,
  pace: {
    ytd_pct: 41,
    target_pct: 40,
    target_date_label: 'May 5',
    status: 'on_pace',
    status_label: 'On pace',
  },
  elevator: null,
  positions: allPositions.map((p) =>
    p.crop === 'corn' ? { ...p, pricing_pace_pct: 41, unsold_bushels: 84960 } : p
  ),
  floor,
  breakevens,
};

// ─── Scenario 3: PACE ALERT — behind pace, conditions not ideal ──────────────

const paceAlertRecommendation: Recommendation = {
  farm_id: FARM_ID,
  crop: 'corn',
  recommendation_date: TODAY,
  recommendation_type: 'pace_alert',
  recommended_bushels: null,
  recommended_elevator_id: null,
  recommended_elevator_name: null,
  recommended_cash_bid: 4.66,
  margin_signal: 'yellow',
  basis_signal: 'yellow',
  pace_signal: 'red',
  current_basis: -0.68,
  basis_3yr_percentile: 41,
  effective_floor: 4.10,
  rationale_text:
    'Behind pace. Target by today: 40%. Currently: 28%. Watch for a basis window this week.',
};

const paceAlertScenario: SellScoreScreenData = {
  context: farmContext,
  recommendation: paceAlertRecommendation,
  headline: 'Behind pace. You\'re 28% priced, target is 40%.',
  supporting: null,
  pace: {
    ytd_pct: 28,
    target_pct: 40,
    target_date_label: 'May 5',
    status: 'behind',
    status_label: 'Behind pace',
  },
  elevator: null,
  positions: allPositions.map((p) =>
    p.crop === 'corn' ? { ...p, pricing_pace_pct: 28, unsold_bushels: 103680 } : p
  ),
  floor,
  breakevens,
};

// ─── Scenario 4: OUT OF SEASON — winter, all bushels priced ──────────────────

const outOfSeasonRecommendation: Recommendation = {
  farm_id: FARM_ID,
  crop: 'corn',
  recommendation_date: new Date('2026-01-14T11:00:00Z'),
  recommendation_type: 'out_of_season',
  recommended_bushels: null,
  recommended_elevator_id: null,
  recommended_elevator_name: null,
  recommended_cash_bid: null,
  margin_signal: 'green',
  basis_signal: 'green',
  pace_signal: 'green',
  current_basis: -0.45,
  basis_3yr_percentile: 65,
  effective_floor: 4.10,
  rationale_text:
    'All bushels priced for 2025. Next decision: 2026 new-crop pricing window opens March 15.',
};

const outOfSeasonScenario: SellScoreScreenData = {
  context: { ...farmContext, date_label: 'Wednesday, January 14' },
  recommendation: outOfSeasonRecommendation,
  headline:
    'No marketing today. Old\u2011crop is fully priced. New\u2011crop window opens March 15.',
  supporting: null,
  pace: {
    ytd_pct: 100,
    target_pct: 100,
    target_date_label: 'August 31',
    status: 'on_pace',
    status_label: 'Marketing year complete',
  },
  elevator: null,
  positions: allPositions.map((p) => ({
    ...p,
    pricing_pace_pct: 100,
    unsold_bushels: 0,
  })),
  floor,
  breakevens,
};

// ─── Public exports ──────────────────────────────────────────────────────────

export const scenarios: Record<RecommendationType, SellScoreScreenData> = {
  sell: sellScenario,
  hold: holdScenario,
  pace_alert: paceAlertScenario,
  out_of_season: outOfSeasonScenario,
};

export const scenarioOrder: RecommendationType[] = [
  'sell',
  'hold',
  'pace_alert',
  'out_of_season',
];

export const scenarioLabels: Record<RecommendationType, string> = {
  sell: 'Sell signal',
  hold: 'Hold (typical day)',
  pace_alert: 'Behind pace',
  out_of_season: 'Out of season',
};