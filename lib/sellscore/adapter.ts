// lib/sellscore/adapter.ts
//
// Adapts a SellScoreResult (engine output + freshness metadata) into the
// SellScoreScreenData shape that the existing visual components consume.
//
// Pure function — no I/O. The engine produces structured computational
// data; this maps it into the display contract that the visual components
// in components/sellscore/ were built against.
//
// Two semantic translations worth understanding:
//
// 1. Pace semantics (July 23, 2026 fix — v6.6 backlog #1). Engine pace
//    level per spec §4.4: GREEN = at or behind target ("urgency to sell,
//    room to catch up"), AMBER = slightly ahead (within 5pp), RED =
//    materially ahead (no selling urgency). The display signal now maps
//    DIRECTLY (GREEN→green etc.) — a behind-pace farmer sees a green
//    pace dot, because green means "this signal favors selling today."
//    The previous inversion (GREEN→'red') read as a warning on the very
//    state the engine considers most actionable and cancelled out with a
//    second inversion in the label copy. Only the human-readable STATE
//    words ("Behind pace — room to sell") are derived separately.
//
// 2. Action mapping. Engine returns 'SELL' | 'WATCH' | 'HOLD' | 'OUT_OF_SEASON'.
//    Display uses 'sell' | 'hold' | 'pace_alert' | 'out_of_season'.
//    OUT_OF_SEASON is the highest-priority mapping: when the farmer has
//    priced their full marketing-year position, no other consideration
//    matters. WATCH maps to display 'hold' (the "close to a sell day"
//    state). HOLD with engine pace GREEN (farmer is behind AND can't act
//    today) maps to 'pace_alert'. Everything else maps to display 'hold'.

import type {
  Crop,
  CropPosition,
  Recommendation,
  RecommendationType,
  SignalStatus,
} from './types';
import type { SellScoreScreenData } from './display-types';
import type { SellScoreResult } from './data-fetcher';
import type { ReferenceElevator } from './reference-elevators';

// ─────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────

export interface FarmAdapterContext {
  farmId: string;
  farmName: string;
  state: string;
  farmerFirstName: string;
  totalAcres: number;
}

export interface AdapterInput {
  result: SellScoreResult;
  farm: FarmAdapterContext;
  positions: CropPosition[];
  elevator: ReferenceElevator;
  today: Date;
}

// ─────────────────────────────────────────────────────────────────────────
// Internal mappings
// ─────────────────────────────────────────────────────────────────────────

type EngineLevel = 'GREEN' | 'AMBER' | 'RED';
type EngineAction = 'SELL' | 'WATCH' | 'HOLD' | 'OUT_OF_SEASON';

/**
 * Direct engine-level → display-signal mapping, used for ALL THREE
 * signals including pace (spec §4.4 semantics carried verbatim).
 */
function mapSignalLevel(level: EngineLevel): SignalStatus {
  switch (level) {
    case 'GREEN': return 'green';
    case 'AMBER': return 'yellow';
    case 'RED':   return 'red';
  }
}

/**
 * Maps engine pace level to the farmer-state word. This is a STATE
 * descriptor, not a warning level: engine GREEN covers the whole
 * at-or-behind range, so it splits on whether the farmer has actually
 * reached target; AMBER (0–5pp ahead) and RED (>5pp ahead) both read
 * as ahead-of-target states.
 */
function mapPaceStatus(
  paceLevel: EngineLevel,
  currentPctSold: number,
  targetPctSold: number,
): 'on_pace' | 'behind' | 'ahead' {
  switch (paceLevel) {
    case 'GREEN': return currentPctSold >= targetPctSold ? 'on_pace' : 'behind';
    case 'AMBER': return 'on_pace';
    case 'RED':   return 'ahead';
  }
}

function mapRecommendationType(
  action: EngineAction,
  paceLevel: EngineLevel,
): RecommendationType {
  if (action === 'OUT_OF_SEASON') return 'out_of_season';
  if (action === 'SELL') return 'sell';
  if (action === 'HOLD' && paceLevel === 'GREEN') return 'pace_alert';
  return 'hold';
}

/**
 * Pace status label, voice-spec aligned with rationale.ts paceDetail:
 * behind pace is stated plainly and framed as capacity ("room to sell"),
 * matching the green signal it accompanies.
 */
function paceStatusLabel(
  paceLevel: EngineLevel,
  currentPctSold: number,
  targetPctSold: number,
): string {
  if (currentPctSold >= 99.5) return 'Marketing year complete';
  switch (paceLevel) {
    case 'GREEN':
      return currentPctSold >= targetPctSold
        ? 'On pace'
        : 'Behind pace — room to sell';
    case 'AMBER': return 'Slightly ahead of pace';
    case 'RED':   return 'Ahead of pace';
  }
}

function formatTargetDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * OBBBA statutory PLC reference floors. v1.0 fallback when the engine
 * doesn't yet compute the full effective floor (ARC/PLC + crop insurance
 * SCO/ECO). v1.1 will replace this with actual position-derived floors.
 */
const STATUTORY_FLOORS: Record<Crop, { dollars_per_bu: number; source_label: string }> = {
  corn:     { dollars_per_bu: 4.10,  source_label: 'OBBBA PLC statutory reference' },
  soybeans: { dollars_per_bu: 10.00, source_label: 'OBBBA PLC statutory reference' },
  wheat:    { dollars_per_bu: 5.50,  source_label: 'OBBBA PLC statutory reference' },
  sorghum:  { dollars_per_bu: 3.95,  source_label: 'OBBBA PLC statutory reference' },
};

// ─────────────────────────────────────────────────────────────────────────
// Public adapter
// ─────────────────────────────────────────────────────────────────────────

export function toSellScoreScreenData(input: AdapterInput): SellScoreScreenData {
  const { result, farm, positions, elevator, today } = input;
  const { recommendation: engine } = result;

  const recommendationType = mapRecommendationType(
    engine.rationale.action,
    engine.signals.pace.level,
  );
  const paceStatus = mapPaceStatus(
    engine.signals.pace.level,
    engine.currentPctSold,
    engine.targetPctSold,
  );
  const isSell = recommendationType === 'sell';

  const cashBid = engine.signals.margin.cashBid;
  const todayBasis = engine.signals.basis.todayBasis;
  const recommendedBushels = engine.recommendedBushels > 0
    ? engine.recommendedBushels
    : null;
  const basisPercentile = Math.round(engine.signals.basis.percentileRank);

  const recommendation: Recommendation = {
    farm_id: farm.farmId,
    crop: engine.crop,
    recommendation_date: engine.date,
    recommendation_type: recommendationType,
    recommended_bushels: recommendedBushels,
    recommended_elevator_id: isSell ? elevator.elevatorId : null,
    recommended_elevator_name: isSell ? elevator.company : null,
    recommended_cash_bid: cashBid,
    margin_signal: mapSignalLevel(engine.signals.margin.level),
    basis_signal: mapSignalLevel(engine.signals.basis.level),
    pace_signal: mapSignalLevel(engine.signals.pace.level),
    current_basis: todayBasis,
    basis_3yr_percentile: basisPercentile,
    effective_floor: STATUTORY_FLOORS[engine.crop]?.dollars_per_bu ?? null,
    rationale_text: engine.rationale.signalSummary,
  };

  const supporting = isSell
    ? {
        cash_price_per_bu: cashBid,
        basis_cents: Math.round(todayBasis * 100),
        basis_percentile: basisPercentile,
        profit_per_acre: engine.scoreDollarsPerAcre,
      }
    : null;

  const elevatorDisplay = isSell
    ? {
        name: elevator.company,
        city: elevator.city,
        state: elevator.elevatorState,
        distance_miles: 0, // v1.1: derive from farm centroid
      }
    : null;

  const pace = {
    ytd_pct: Math.round(engine.currentPctSold),
    target_pct: Math.round(engine.targetPctSold),
    target_date_label: formatTargetDate(today),
    status: paceStatus,
    status_label: paceStatusLabel(
      engine.signals.pace.level,
      engine.currentPctSold,
      engine.targetPctSold,
    ),
  };

  const floor = STATUTORY_FLOORS[engine.crop] ?? STATUTORY_FLOORS.corn;

  const breakevens = positions.map((p) => ({
    crop: p.crop,
    dollars_per_bu: p.breakeven_dollars_per_bu,
  }));

  const context = {
    farmer_first_name: farm.farmerFirstName,
    farm_name: farm.farmName,
    county: elevator.countyName,
    state: farm.state,
    date_label: formatLongDate(today),
  };

  return {
    context,
    recommendation,
    headline: engine.rationale.headline,
    signal_summary: engine.rationale.signalSummary,
    supporting,
    pace,
    elevator: elevatorDisplay,
    positions,
    floor,
    breakevens,
  };
}
