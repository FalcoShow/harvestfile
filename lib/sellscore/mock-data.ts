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
//
// July 23, 2026 (v6.6 backlog #1 + #8): scenarios re-anchored to the
// corrected pace semantics (spec §4.4: at-or-behind = green signal) and
// given signal_summary lines matching the rationale.ts voice:
//  - SELL day now has the farmer slightly BEHIND pace (38% vs 40%) —
//    engine policy requires pace GREEN for a 3-green SELL, so the old
//    42%-vs-40% mock could never occur live.
//  - HOLD day is 1pp ahead → pace signal yellow ("Slightly ahead").
//  - PACE ALERT is behind pace → pace signal green with amber/yellow
//    margin+basis blocking the sale (that combination IS the pace_alert
//    state: HOLD + pace GREEN).
// =============================================================================

import type { CropPosition, Recommendation, RecommendationType } from './types';
import type { BelowFoldDisplay, SellScoreScreenData } from './display-types';

const TODAY = new Date('2026-05-05T11:00:00Z');
const FARM_ID = 'preview-farm-mahoning-oh';

// ─── Below-the-fold mock (A2–A7, July 23 2026) ──────────────────────────────
// Deterministic — no Date.now/Math.random — so the preview renders the same
// on every load. Basis series: ~60 weekdays ending May 5, drifting from
// -70¢ toward -55¢ with a gentle wave, matching the SELL scenario's -55¢.

function buildMockBasisSeries(): Array<{ time: string; value: number }> {
  const series: Array<{ time: string; value: number }> = [];
  const end = new Date('2026-05-05T00:00:00Z');
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 84);
  let i = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue; // weekdays only, like real obs
    const progress = i / 59;
    const drift = -0.70 + 0.15 * progress; // -70¢ → -55¢
    const wave = 0.018 * Math.sin(i / 4.5) + 0.008 * Math.sin(i / 1.7);
    series.push({
      time: d.toISOString().slice(0, 10),
      value: Math.round((drift + wave) * 10000) / 10000,
    });
    i++;
  }
  return series;
}

const mockBelowFold: BelowFoldDisplay = {
  elevators: [
    {
      id: 'buckeye-feed-and-grain-dalton-oh',
      name: 'Buckeye Feed and Grain',
      city: 'Dalton',
      state: 'OH',
      distance_miles: 22,
      cash_bid: 4.85,
      pinned: true,
    },
    {
      id: 'mock-heritage-coop',
      name: 'Heritage Cooperative',
      city: 'Massillon',
      state: 'OH',
      distance_miles: 26,
      cash_bid: 4.81,
      pinned: true,
    },
    {
      id: 'mock-deerfield-ag',
      name: 'Deerfield Ag Services',
      city: 'Deerfield',
      state: 'OH',
      distance_miles: 9,
      cash_bid: 4.79,
      pinned: false,
    },
    {
      id: 'mock-centerra',
      name: 'Centerra Co-op',
      city: 'Salem',
      state: 'OH',
      distance_miles: 14,
      cash_bid: 4.83,
      pinned: false,
    },
    {
      id: 'mock-western-reserve',
      name: 'Western Reserve Grain',
      city: 'Canfield',
      state: 'OH',
      distance_miles: 17,
      cash_bid: null,
      pinned: false,
    },
  ],
  basis: {
    crop: 'corn',
    county_label: 'Mahoning County',
    series: buildMockBasisSeries(),
    norm_3yr: -0.58,
    current: -0.55,
  },
  // Mahoning County, OH
  lat: 41.02,
  lng: -80.66,
  show_spray: true, // May — inside the April–October window
};

// Out-of-season scenario is dated January 14 — spray card hidden.
const mockBelowFoldWinter: BelowFoldDisplay = {
  ...mockBelowFold,
  show_spray: false,
};

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
// Pace green means at-or-behind target (spec §4.4): the farmer is 38%
// priced against a 40% milestone, which is exactly the state where the
// engine fires a sell — room to catch up on a strong-basis day.

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
    'Pace: You\'re 38% priced. Target is 40%. Selling 2,500 bu brings you to 40%, right on target.\n\n' +
    'Past performance does not guarantee future results.',
};

const sellScenario: SellScoreScreenData = {
  context: farmContext,
  recommendation: sellRecommendation,
  headline: 'Sell 2,500 bu of corn today at Buckeye Feed and Grain.',
  signal_summary:
    'All three signals line up today. Basis is in the top quartile of recent prices, you\'re behind sales pace with room to catch up, and the cash bid clears your margin target.',
  supporting: {
    cash_price_per_bu: 4.85,
    basis_cents: -55,
    basis_percentile: 78,
    profit_per_acre: 52,
  },
  pace: {
    ytd_pct: 38,
    target_pct: 40,
    target_date_label: 'May 5',
    status: 'behind',
    status_label: 'Behind pace — room to sell',
  },
  elevator: {
    name: 'Buckeye Feed and Grain',
    city: 'Dalton',
    state: 'OH',
    distance_miles: 22,
  },
  positions: allPositions.map((p) =>
    p.crop === 'corn'
      ? { ...p, pricing_pace_pct: 38, unsold_bushels: 89280 }
      : p
  ),
  floor,
  breakevens,
  below_fold: mockBelowFold,
};

// ─── Scenario 2: HOLD — most common state, no action warranted ───────────────
// 41% priced vs 40% target = 1pp ahead → pace signal yellow (slightly
// ahead, within the 5pp AMBER band). Margin green alone can't fire a sell.

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
  pace_signal: 'yellow',
  current_basis: -0.62,
  basis_3yr_percentile: 52,
  effective_floor: 4.10,
  rationale_text:
    'Hold today. 41% priced, target 40%. Today\'s bid: $4.82, basis -62¢ (52nd pct).',
};

const holdScenario: SellScoreScreenData = {
  context: farmContext,
  recommendation: holdRecommendation,
  headline: 'Hold today. You\'re on pace and basis is mid‑range.',
  signal_summary: 'Today\'s signals don\'t line up for a sale.',
  supporting: null,
  pace: {
    ytd_pct: 41,
    target_pct: 40,
    target_date_label: 'May 5',
    status: 'on_pace',
    status_label: 'Slightly ahead of pace',
  },
  elevator: null,
  positions: allPositions.map((p) =>
    p.crop === 'corn' ? { ...p, pricing_pace_pct: 41, unsold_bushels: 84960 } : p
  ),
  floor,
  breakevens,
  below_fold: mockBelowFold,
};

// ─── Scenario 3: PACE ALERT — behind pace, conditions not ideal ──────────────
// The pace_alert state IS "HOLD while pace is green": the farmer is 12pp
// behind target (green signal — urgency to sell) but margin and basis are
// both amber, blocking the sale. The pace signal renders green because it
// favors action; the blockers render yellow.

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
  pace_signal: 'green',
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
  signal_summary:
    'You\'re 12 points behind pace, but today\'s bid doesn\'t clear your margin target. Watch for a stronger bid this week.',
  supporting: null,
  pace: {
    ytd_pct: 28,
    target_pct: 40,
    target_date_label: 'May 5',
    status: 'behind',
    status_label: 'Behind pace — room to sell',
  },
  elevator: null,
  positions: allPositions.map((p) =>
    p.crop === 'corn' ? { ...p, pricing_pace_pct: 28, unsold_bushels: 103680 } : p
  ),
  floor,
  breakevens,
  below_fold: mockBelowFold,
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
    'No marketing today. Old‑crop is fully priced. New‑crop window opens March 15.',
  signal_summary:
    'You\'ve finished marketing the 2025/26 crop. The 2026/27 marketing year begins September 1, 2026.',
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
  below_fold: mockBelowFoldWinter,
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
