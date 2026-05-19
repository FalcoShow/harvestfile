// components/sellscore/RecommendationHeadline.tsx
// =============================================================================
// M-03 (May 18, 2026) typography pass:
//   - "Today · Status" eyebrow bumped from text-[11px] to text-[14px].
// =============================================================================

import type { Recommendation } from '@/lib/sellscore/types';
import type { ElevatorDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface RecommendationHeadlineProps {
  recommendation: Recommendation;
  elevator: ElevatorDisplay | null;
  headline: string;
}

export default function RecommendationHeadline({
  recommendation,
  elevator,
  headline,
}: RecommendationHeadlineProps) {
  const eyebrow = getEyebrow(recommendation.recommendation_type);
  const accent = getAccentColor(recommendation.recommendation_type);

  return (
    <section className="px-6 sm:px-10 pt-12 sm:pt-16 pb-10 sm:pb-12">
      <div
        className="text-[14px] uppercase mb-6"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        {eyebrow}
      </div>

      <h2
        className="text-[34px] sm:text-[44px] lg:text-[52px]"
        style={{
          fontFamily: fonts.display,
          fontWeight: 500,
          color: colors.textPrimary,
          letterSpacing: '-0.026em',
          lineHeight: 1.06,
          maxWidth: '20ch',
        }}
      >
        {recommendation.recommendation_type === 'sell' &&
        recommendation.recommended_bushels &&
        elevator ? (
          <SellHeadlineComposed
            bushels={recommendation.recommended_bushels}
            crop={recommendation.crop}
            elevatorName={elevator.name}
          />
        ) : (
          <span>{headline}</span>
        )}
      </h2>

      {accent && (
        <div
          className="mt-10 h-px w-14"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}

function SellHeadlineComposed({
  bushels,
  crop,
  elevatorName,
}: {
  bushels: number;
  crop: string;
  elevatorName: string;
}) {
  return (
    <>
      <em
        style={{
          fontFamily: fonts.serif,
          fontWeight: 400,
          fontStyle: 'italic',
          color: colors.emerald,
          letterSpacing: '-0.01em',
        }}
      >
        Sell
      </em>{' '}
      <span style={tabularNums}>{formatters.bushels(bushels)} bu</span>
      {' '}of {crop} today at{' '}
      <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
        {elevatorName}
      </span>
      <span style={{ color: colors.emerald }}>.</span>
    </>
  );
}

function getEyebrow(type: Recommendation['recommendation_type']): string {
  switch (type) {
    case 'sell': return 'Today · Recommendation';
    case 'hold': return 'Today · Status';
    case 'pace_alert': return 'Today · Pace alert';
    case 'out_of_season': return 'Season · Complete';
  }
}

function getAccentColor(type: Recommendation['recommendation_type']): string | null {
  switch (type) {
    case 'sell': return colors.emerald;
    case 'hold': return null;
    case 'pace_alert': return colors.amber;
    case 'out_of_season': return colors.gold;
  }
}
