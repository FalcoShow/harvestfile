// components/sellscore/ScenarioToggle.tsx
'use client';

import type { RecommendationType } from '@/lib/sellscore/types';
import { scenarioOrder, scenarioLabels } from '@/lib/sellscore/mock-data';
import { colors, fonts } from './_tokens';

interface ScenarioToggleProps {
  active: RecommendationType;
  onChange: (next: RecommendationType) => void;
}

export default function ScenarioToggle({ active, onChange }: ScenarioToggleProps) {
  return (
    <div
      className="px-6 sm:px-10 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-2.5"
      style={{
        backgroundColor: 'rgba(251, 191, 36, 0.04)',
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: colors.amber }}
          aria-hidden="true"
        />
        <span
          className="text-[10px] uppercase"
          style={{
            color: colors.amber,
            letterSpacing: '0.24em',
            fontWeight: 700,
            fontFamily: fonts.body,
          }}
        >
          Demo · Switch scenario
        </span>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1.5">
        {scenarioOrder.map((type) => {
          const isActive = type === active;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(type)}
              className="px-3 py-1.5 rounded-md text-[12px]"
              style={{
                fontFamily: fonts.body,
                fontWeight: 500,
                letterSpacing: '-0.005em',
                color: isActive ? colors.textPrimary : colors.textSecondary,
                backgroundColor: isActive ? colors.cardBg : 'transparent',
                border: isActive
                  ? `1px solid ${colors.borderEmphasis}`
                  : `1px solid ${colors.borderSubtle}`,
                transition: 'all 160ms ease-out',
                cursor: 'pointer',
              }}
            >
              {scenarioLabels[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}