// components/sellscore/FloorStatement.tsx
// =============================================================================
// HarvestFile Sell Score — Floor Statement
//
// Informational closing card. The downside floor that ARC/PLC + crop
// insurance protect, regardless of where cash markets go. This is the trust
// anchor: "here's what you keep no matter what." Never triggers an action.
//
// May 16, 2026 voice-spec update:
//   Subject phrase changed from "{crop} markets" to "{crop} prices" so the
//   sentence "Even if soybean prices fall further..." reads correctly
//   regardless of crop. Plural crop names (soybeans) normalize to singular
//   nouns (soybean) for natural reading. Also tightened "for the marketing
//   year" to "through the marketing year".
//
// M-03 (May 18, 2026) typography pass:
//   - "Downside Protection" eyebrow bumped from text-[10px] to text-[14px].
//   - Downside protection paragraph bumped from text-[15px] sm:text-base to
//     text-[18px] for clear 18px floor compliance.
//   - "Built from ..." footer bumped from text-[13px] to text-[16px].
// =============================================================================

import type { FloorDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface FloorStatementProps {
  floor: FloorDisplay;
  /** Optional crop name to anchor the statement, e.g. "corn" or "soybeans" */
  cropContext?: string;
}

export default function FloorStatement({ floor, cropContext }: FloorStatementProps) {
  // Normalize plural crop names to singular so "soybeans prices" reads
  // naturally as "soybean prices". Most crop names are already singular
  // (corn, wheat, sorghum). Add new mappings here if v1.1 expands crops.
  const cropSingular =
    cropContext === 'soybeans' ? 'soybean' :
    cropContext === 'beans' ? 'bean' :
    cropContext;
  const subjectPhrase = cropSingular ? `${cropSingular} prices` : 'cash prices';

  return (
    <section
      className="px-6 sm:px-10 py-10 sm:py-12"
      style={{
        borderTop: `1px solid ${colors.borderSubtle}`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        className="text-[14px] uppercase mb-6"
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
        className="text-[18px] mb-2.5"
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
        through the marketing year.
      </p>

      <p
        className="text-[16px]"
        style={{
          color: colors.textTertiary,
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
