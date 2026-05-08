// components/sellscore/PrimaryActions.tsx
'use client';

import { useState } from 'react';
import type { Recommendation } from '@/lib/sellscore/types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface PrimaryActionsProps {
  recommendation: Recommendation;
}

export default function PrimaryActions({ recommendation }: PrimaryActionsProps) {
  const [marked, setMarked] = useState(false);

  const isSell =
    recommendation.recommendation_type === 'sell' &&
    typeof recommendation.recommended_bushels === 'number';

  // Out-of-season has no SignalRow to scroll to and no math worth showing.
  // Hide both buttons (and the whole section) in that case.
  const showSeeTheMath = recommendation.recommendation_type !== 'out_of_season';

  const handleSeeTheMath = () => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById('why-this-recommendation');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isSell && !showSeeTheMath) {
    return null;
  }

  return (
    <div className="px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row gap-3">
      {isSell && (
        <button
          type="button"
          onClick={() => setMarked((m) => !m)}
          aria-pressed={marked}
          className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2.5 px-7 rounded-xl"
          style={{
            minHeight: '56px',
            backgroundColor: marked ? 'transparent' : colors.emerald,
            color: marked ? colors.emerald : '#0a0f0d',
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: '16px',
            letterSpacing: '-0.005em',
            border: marked ? `1px solid ${colors.emerald}` : '1px solid transparent',
            transition: 'background-color 180ms ease-out, color 180ms ease-out, border-color 180ms ease-out',
            cursor: 'pointer',
          }}
        >
          {marked ? (
            <>
              <CheckIcon />
              <span>Marked as priced</span>
            </>
          ) : (
            <>
              <span>Mark</span>
              <span style={tabularNums}>
                {formatters.bushels(recommendation.recommended_bushels!)} bu
              </span>
              <span>as priced</span>
              <ArrowIcon />
            </>
          )}
        </button>
      )}

      {showSeeTheMath && (
        <button
          type="button"
          onClick={handleSeeTheMath}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 rounded-xl"
          style={{
            minHeight: '56px',
            backgroundColor: 'transparent',
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 500,
            fontSize: '15px',
            letterSpacing: '-0.005em',
            border: `1px solid ${colors.borderDefault}`,
            transition: 'border-color 180ms ease-out, color 180ms ease-out',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = colors.borderEmphasis;
            (e.currentTarget as HTMLButtonElement).style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = colors.borderDefault;
            (e.currentTarget as HTMLButtonElement).style.color = colors.textSecondary;
          }}
        >
          See the math
        </button>
      )}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}