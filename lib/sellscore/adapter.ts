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
// 1. Pace inversion. The engine's pace level represents action urgency:
//    GREEN means "behind pace, urgent to sell now to catch up." The
//    display's pace status represents farmer state: 'behind' is a warning
//    in the visualization. The adapter flips these correctly.
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

function mapSignalLevel(level: EngineLevel): SignalStatus {
  switch (level) {
    case 'GREEN': return 'green';
    case 'AMBER': return 'yellow';
    case 'RED':   return 'red';
  }
}

/**
 * Maps engine pace level to display pace status. Inverted from action
 * urgency to farmer state: engine GREEN (behind, urgent) → display 'behind'
 * (visualized as warning); engine AMBER (close to target) → 'on_pace';
 * engine RED (ahead by ≥5pp) → 'ahead'.
 */
function mapPaceStatus(paceLevel: EngineLevel): 'on_pace' | 'behind' | 'ahead' {
  switch (paceLevel) {
    case 'GREEN': return 'behind';
    case 'AMBER': return 'on_pace';
    case 'RED':   return 'ahead';
  }
}

/**
 * Maps engine pace level to display pace_signal SignalStatus. Same
 * inversion: engine GREEN (behind) reads as a 'red' warning in the signal
 * row; engine AMBER reads as 'green' (no warning); engine RED reads as
 * 'yellow' (mild caution: ahead of pace).
 */
function mapPaceSignalStatus(paceLevel: EngineLevel): SignalStatus {
  switch (paceLevel) {
    case 'GREEN': return 'red';
    case 'AMBER': return 'green';
    case 'RED':   return 'yellow';
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

function paceStatusLabel(
  status: 'on_pace' | 'behind' | 'ahead',
  currentPctSold: number,
): string {
  if (currentPctSold >= 99.5) return 'Marketing year complete';
  switch (status) {
    case 'on_pace': return 'On pace';
    case 'behind':  return 'Behind pace';
    case 'ahead':   return 'Ahead of pace';
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
  const paceStatus = mapPaceStatus(engine.signals.pace.level);
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
    pace_signal: mapPaceSignalStatus(engine.signals.pace.level),
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
    status_label: paceStatusLabel(paceStatus, engine.currentPctSold),
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
    supporting,
    pace,
    elevator: elevatorDisplay,
    positions,
    floor,
    breakevens,
  };
}
