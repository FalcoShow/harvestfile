// components/sellscore/SellScoreScreen.tsx
// =============================================================================
// HarvestFile Sell Score — Composite Screen
//
// The single screen a farmer opens at 5:30 AM. Wires the eight section
// components into one continuous narrative: greeting, recommendation,
// supporting figures, pace, action, signal breakdown, position, floor.
//
// Pure render — accepts a fully-composed SellScoreScreenData and produces
// the visual. Conditional rendering handles the four recommendation types.
// The host page (preview or production /dashboard) supplies the data and
// any chrome around this container.
// =============================================================================

import type { SellScoreScreenData } from '@/lib/sellscore/display-types';

import ScreenHeader from './ScreenHeader';
import RecommendationHeadline from './RecommendationHeadline';
import SupportingRow from './SupportingRow';
import PaceContext from './PaceContext';
import PrimaryActions from './PrimaryActions';
import SignalRow from './SignalRow';
import PositionDetail from './PositionDetail';
import SalesHistory from './SalesHistory';
import FloorStatement from './FloorStatement';
import ElevatorComparison from './ElevatorComparison';
import BasisChart from './BasisChart';
import MarketSummary from './MarketSummary';
import FarmConditions from './FarmConditions';
import QuickLinksRow from './QuickLinksRow';

interface SellScoreScreenProps {
  data: SellScoreScreenData;
  /**
   * Preview/design-review mode. Passed through to interactive children
   * (PrimaryActions) so mock farms simulate writes instead of hitting
   * the authenticated log-sale API.
   */
  demo?: boolean;
}

export default function SellScoreScreen({ data, demo = false }: SellScoreScreenProps) {
  const recommendationType = data.recommendation.recommendation_type;
  const isSell = recommendationType === 'sell';
  const isOutOfSeason = recommendationType === 'out_of_season';

  // Locate the breakeven for the recommendation's crop. This powers the margin
  // signal context in SignalRow. Falls back to the first available breakeven
  // if the exact crop isn't present.
  const recommendationBreakeven =
    data.breakevens.find((b) => b.crop === data.recommendation.crop) ??
    data.breakevens[0];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <ScreenHeader context={data.context} />

      <RecommendationHeadline
        recommendation={data.recommendation}
        elevator={data.elevator}
        headline={data.headline}
        signalSummary={data.signal_summary}
      />

      {isSell && data.supporting && (
        <SupportingRow supporting={data.supporting} />
      )}

      <PaceContext pace={data.pace} signal={data.recommendation.pace_signal} />

      <PrimaryActions
        recommendation={data.recommendation}
        positions={data.positions}
        demo={demo}
      />

      {!isOutOfSeason && (
        <SignalRow
          recommendation={data.recommendation}
          pace={data.pace}
          breakeven={recommendationBreakeven}
        />
      )}

      <PositionDetail positions={data.positions} />

      {/* Round 2 Item 3: read-only sales history, below the position
          cards. Rendered only when the host supplies sales_history
          (/sellscore/me and the preview). */}
      {data.sales_history && <SalesHistory history={data.sales_history} />}

      <FloorStatement
        floor={data.floor}
        cropContext={data.recommendation.crop}
      />

      {/* ── Below the fold (spec §4.1, Workstream A 2–7) ─────────────────
          Rendered only when the host supplies below_fold data
          (/sellscore/me and the preview). Order per spec: elevator
          comparison, basis chart, market summary, weather, spray,
          quick links. ─────────────────────────────────────────────── */}
      {data.below_fold && (
        <>
          {data.below_fold.elevators && data.below_fold.elevators.length > 0 && (
            <ElevatorComparison
              elevators={data.below_fold.elevators}
              crop={data.recommendation.crop}
            />
          )}

          {data.below_fold.basis && <BasisChart basis={data.below_fold.basis} />}

          <MarketSummary />

          {data.below_fold.lat != null && data.below_fold.lng != null && (
            <FarmConditions
              lat={data.below_fold.lat}
              lng={data.below_fold.lng}
              showSpray={data.below_fold.show_spray}
            />
          )}

          <QuickLinksRow />
        </>
      )}
    </div>
  );
}
