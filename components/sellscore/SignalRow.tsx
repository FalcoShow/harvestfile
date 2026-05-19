// components/sellscore/SignalRow.tsx
// =============================================================================
// HarvestFile Sell Score — Signal Row
//
// The "why" behind a recommendation. Three signals (Margin, Basis, Pace), each
// with its computed status (green/yellow/red), the primary value driving that
// status, and the secondary context that backs it up. Hidden for out_of_season
// scenarios where signals are not meaningful.
//
// M-03 (May 18, 2026) typography pass:
//   - "Why this recommendation" eyebrow bumped from text-[10px] to text-[14px].
//   - "MARGIN" / "BASIS" / "PACE" signal labels bumped from text-[10px] to
//     text-[14px].
//   - Primary signal value bumped from text-[16px] sm:text-[17px] to
//     text-[18px] (clear pass above floor).
//   - Secondary signal context bumped from text-[13px] to text-[16px].
// =============================================================================

import type { Recommendation, SignalStatus } from '@/lib/sellscore/types';
import type { BreakevenDisplay, PaceDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, signalColors, tabularNums } from './_tokens';

interface SignalRowProps {
  recommendation: Recommendation;
  pace: PaceDisplay;
  /** Breakeven for the recommendation's crop, used for margin context */
  breakeven: BreakevenDisplay;
}

export default function SignalRow({
  recommendation,
  pace,
  breakeven,
}: SignalRowProps) {
  const cashBid = recommendation.recommended_cash_bid;
  const margin = cashBid !== null ? cashBid - breakeven.dollars_per_bu : null;

  // A3: when margin is negative, display the magnitude (no embedded "-" inside
  // the $-prefixed token). "$0.30 below breakeven" reads cleanly; "$-0.30
  // below breakeven" looks like a typo.
  const marginPrimary =
    margin !== null
      ? margin >= 0
        ? `+${formatters.currency(margin)} above breakeven`
        : `${formatters.currency(Math.abs(margin))} below breakeven`
      : 'No live cash bid';

  const marginSecondary =
    cashBid !== null
      ? `${formatters.currency(cashBid)} cash · ${formatters.currency(
          breakeven.dollars_per_bu
        )} breakeven`
      : `${formatters.currency(breakeven.dollars_per_bu)} breakeven on ${breakeven.crop}`;

  const basisCents = Math.round(recommendation.current_basis * 100);
  const basisPrimary = `${formatters.cents(basisCents)} today`;

  // A5: quartile descriptor + null safety. Basis 3-yr percentile can come
  // back null on thin samples; the quartile label puts an instantly readable
  // word in front of the numeric percentile.
  const basisPctile = recommendation.basis_3yr_percentile;
  const basisSecondary =
    basisPctile == null
      ? 'Not enough basis history yet'
      : `${quartileLabel(basisPctile)} · ${basisPctile}${ordinalSuffix(
          basisPctile
        )} percentile vs 3-yr norm`;

  const pacePrimary = `${pace.ytd_pct}% priced`;
  const paceSecondary = `Target ${pace.target_pct}% by ${pace.target_date_label}`;

  return (
    <section
      id="why-this-recommendation"
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
    >
      <div
        className="text-[14px] uppercase mb-7"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        Why this recommendation
      </div>

      <ul className="flex flex-col gap-6">
        <SignalItem
          status={recommendation.margin_signal}
          label="Margin"
          primary={marginPrimary}
          secondary={marginSecondary}
        />
        <SignalItem
          status={recommendation.basis_signal}
          label="Basis"
          primary={basisPrimary}
          secondary={basisSecondary}
        />
        <SignalItem
          status={recommendation.pace_signal}
          label="Pace"
          primary={pacePrimary}
          secondary={paceSecondary}
        />
      </ul>
    </section>
  );
}

function SignalItem({
  status,
  label,
  primary,
  secondary,
}: {
  status: SignalStatus;
  label: string;
  primary: string;
  secondary: string;
}) {
  const tone = signalColors[status];

  return (
    <li className="flex items-start gap-4 sm:gap-5">
      <StatusDot status={status} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 mb-1">
          <span
            className="text-[14px] uppercase shrink-0"
            style={{
              color: tone.fg,
              letterSpacing: '0.22em',
              fontWeight: 700,
              fontFamily: fonts.body,
            }}
          >
            {label}
          </span>
          <span
            className="text-[18px] mt-1 sm:mt-0"
            style={{
              ...tabularNums,
              color: colors.textPrimary,
              fontFamily: fonts.body,
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            {primary}
          </span>
        </div>
        <div
          className="text-[16px]"
          style={{
            ...tabularNums,
            color: colors.textTertiary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          {secondary}
        </div>
      </div>
    </li>
  );
}

function StatusDot({ status }: { status: SignalStatus }) {
  const tone = signalColors[status];
  return (
    <span
      className="block flex-shrink-0 mt-2 rounded-full"
      style={{
        width: '8px',
        height: '8px',
        backgroundColor: tone.fg,
        boxShadow: `0 0 0 4px ${tone.bg}`,
      }}
      aria-hidden="true"
    />
  );
}

function quartileLabel(pctile: number): string {
  if (pctile >= 75) return 'Top quartile';
  if (pctile >= 25) return 'Mid-range';
  return 'Bottom quartile';
}

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
