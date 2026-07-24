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
import FloorStatement from './FloorStatement';

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

      <FloorStatement
        floor={data.floor}
        cropContext={data.recommendation.crop}
      />
    </div>
  );
}
