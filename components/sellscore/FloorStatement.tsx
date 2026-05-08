// components/sellscore/FloorStatement.tsx
// =============================================================================
// HarvestFile Sell Score — Floor Statement
//
// Informational closing card. The downside floor that ARC/PLC + crop
// insurance protect, regardless of where cash markets go. This is the trust
// anchor: "here's what you keep no matter what." Never triggers an action.
// =============================================================================

import type { FloorDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface FloorStatementProps {
  floor: FloorDisplay;
  /** Optional crop name to anchor the statement, e.g. "corn" */
  cropContext?: string;
}

export default function FloorStatement({ floor, cropContext }: FloorStatementProps) {
  const subjectPhrase = cropContext ? `${cropContext} markets` : 'cash markets';

  return (
    <section
      className="px-6 sm:px-10 py-10 sm:py-12"
      style={{
        borderTop: `1px solid ${colors.borderSubtle}`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        className="text-[10px] uppercase mb-6"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        Downside Protection
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-5 gap-y-2 mb-6">
        <div
          className="flex items-baseline"
          style={{
            ...tabularNums,
            fontFamily: fonts.display,
            fontWeight: 500,
            color: colors.textPrimary,
            letterSpacing: '-0.026em',
            lineHeight: 1,
          }}
        >
          <span className="text-[44px] sm:text-[52px]">
            {formatters.currency(floor.dollars_per_bu)}
          </span>
          <span
            className="text-[18px] sm:text-[20px] ml-1"
            style={{
              color: colors.textTertiary,
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            /bu
          </span>
        </div>

        <div
          className="text-[17px] sm:text-[19px]"
          style={{
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            color: colors.textSecondary,
            fontWeight: 400,
            letterSpacing: '-0.005em',
            lineHeight: 1.3,
          }}
        >
          effective downside floor
        </div>
      </div>

      <p
        className="text-[15px] sm:text-base mb-2.5"
        style={{
          color: colors.textSecondary,
          fontFamily: fonts.body,
          fontWeight: 400,
          letterSpacing: '-0.005em',
          lineHeight: 1.55,
          maxWidth: '54ch',
        }}
      >
        Even if {subjectPhrase} fall further, this is the price your election protects
        for the marketing year.
      </p>

      <p
        className="text-[13px]"
        style={{
          color: colors.textMuted,
          fontFamily: fonts.body,
          fontWeight: 400,
          letterSpacing: '-0.005em',
        }}
      >
        Built from {floor.source_label}.
      </p>
    </section>
  );
}