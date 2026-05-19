// components/sellscore/PositionDetail.tsx
// =============================================================================
// HarvestFile Sell Score — Position Detail
//
// Below-fold card showing the farmer's full open position by crop. For each
// crop: unsold bushels (the headline), total expected (context), pricing pace
// vs target, and breakeven reference. When all bushels are priced, the card
// shifts to a quieter "All priced" state.
//
// M-03 (May 18, 2026) typography pass:
//   - "Position" section label bumped from text-[10px] to text-[14px].
//   - Crop name labels (CORN, SOYBEANS) bumped from text-[12px] to text-[14px].
//   - "% priced" percentage bumped from text-[12px] to text-[14px].
//   - "of 50,000 bu expected" supporting line bumped from text-[13px] to
//     text-[16px].
//   - "Breakeven ... county default" footer bumped from text-[12px] to
//     text-[16px].
// =============================================================================

import type { CropPosition } from '@/lib/sellscore/types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface PositionDetailProps {
  positions: CropPosition[];
}

const CROP_LABELS: Record<string, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  wheat: 'Wheat',
  sorghum: 'Sorghum',
};

export default function PositionDetail({ positions }: PositionDetailProps) {
  return (
    <section
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
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
        Position
      </div>

      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
        {positions.map((position) => (
          <PositionCard
            key={`${position.crop}-${position.crop_year}`}
            position={position}
          />
        ))}
      </div>
    </section>
  );
}

function PositionCard({ position }: { position: CropPosition }) {
  const cropLabel = CROP_LABELS[position.crop] ?? position.crop;
  const allPriced = position.unsold_bushels === 0;
  const target = position.target_pace_pct ?? 0;
  const onPace = target > 0 ? position.pricing_pace_pct >= target : true;
  const paceColor = onPace ? colors.emerald : colors.amber;

  return (
    <article
      className="px-5 sm:px-6 py-5 sm:py-6 rounded-xl"
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h3
          className="text-[14px] uppercase"
          style={{
            color: colors.textSecondary,
            letterSpacing: '0.22em',
            fontWeight: 700,
            fontFamily: fonts.body,
          }}
        >
          {cropLabel}
        </h3>
        <span
          className="text-[14px]"
          style={{
            ...tabularNums,
            color: paceColor,
            fontFamily: fonts.body,
            fontWeight: 600,
            letterSpacing: '-0.005em',
          }}
        >
          {Math.round(position.pricing_pace_pct)}% priced
        </span>
      </div>

      <div
        className="text-[28px] sm:text-[32px]"
        style={{
          ...tabularNums,
          fontFamily: fonts.display,
          fontWeight: 500,
          color: allPriced ? colors.textSecondary : colors.textPrimary,
          letterSpacing: '-0.022em',
          lineHeight: 1,
        }}
      >
        {allPriced ? 'All priced' : `${formatters.bushels(position.unsold_bushels)} bu`}
      </div>
      <div
        className="text-[16px] mt-2"
        style={{
          ...tabularNums,
          color: colors.textTertiary,
          fontFamily: fonts.body,
          fontWeight: 400,
          letterSpacing: '-0.005em',
        }}
      >
        {allPriced
          ? `${formatters.bushels(position.expected_bushels)} bu marketed`
          : `of ${formatters.bushels(position.expected_bushels)} bu expected`}
      </div>

      <PaceMeter pricing={position.pricing_pace_pct} target={target} />

      <div
        className="text-[16px] mt-5 pt-4"
        style={{
          color: colors.textTertiary,
          fontFamily: fonts.body,
          fontWeight: 400,
          borderTop: `1px solid ${colors.borderSubtle}`,
          letterSpacing: '-0.005em',
        }}
      >
        Breakeven{' '}
        <span style={{ ...tabularNums, color: colors.textSecondary, fontWeight: 600 }}>
          {formatters.currency(position.breakeven_dollars_per_bu)}
        </span>
        <span style={{ color: colors.textTertiary }}>/bu</span>
        {position.breakeven_source === 'county_default' && (
          <span style={{ color: colors.textTertiary }}> · county default</span>
        )}
      </div>
    </article>
  );
}

function PaceMeter({ pricing, target }: { pricing: number; target: number }) {
  const pricingClamped = Math.min(100, Math.max(0, pricing));
  const targetClamped = Math.min(100, Math.max(0, target));

  return (
    <div
      className="relative h-1 rounded-full mt-5"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      role="meter"
      aria-valuenow={Math.round(pricing)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(pricing)} percent priced, target ${Math.round(target)} percent`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pricingClamped}%`,
          backgroundColor: colors.emerald,
          opacity: 0.7,
        }}
      />
      {target > 0 && (
        <div
          className="absolute -translate-x-1/2"
          style={{
            left: `${targetClamped}%`,
            top: '-3px',
            bottom: '-3px',
            width: '2px',
            backgroundColor: colors.textSecondary,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
