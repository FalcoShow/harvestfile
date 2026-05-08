// components/sellscore/SignalRow.tsx
// =============================================================================
// HarvestFile Sell Score — Signal Row
//
// The "why" behind a recommendation. Three signals (Margin, Basis, Pace), each
// with its computed status (green/yellow/red), the primary value driving that
// status, and the secondary context that backs it up. Hidden for out_of_season
// scenarios where signals are not meaningful.
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

  const marginPrimary =
    margin !== null
      ? margin >= 0
        ? `+${formatters.currency(margin)} above breakeven`
        : `${formatters.currency(margin)} below breakeven`
      : 'No live cash bid';

  const marginSecondary =
    cashBid !== null
      ? `${formatters.currency(cashBid)} cash · ${formatters.currency(
          breakeven.dollars_per_bu
        )} breakeven`
      : `${formatters.currency(breakeven.dollars_per_bu)} breakeven on ${breakeven.crop}`;

  const basisCents = Math.round(recommendation.current_basis * 100);
  const basisPrimary = `${formatters.cents(basisCents)} today`;
  const basisSecondary = `${recommendation.basis_3yr_percentile}${ordinalSuffix(
    recommendation.basis_3yr_percentile
  )} percentile vs 3-year norm`;

  const pacePrimary = `${pace.ytd_pct}% priced`;
  const paceSecondary = `Target ${pace.target_pct}% by ${pace.target_date_label}`;

  return (
    <section
      id="why-this-recommendation"
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
    >
      <div
        className="text-[10px] uppercase mb-7"
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
            className="text-[10px] uppercase shrink-0"
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
            className="text-[16px] sm:text-[17px] mt-1 sm:mt-0"
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
          className="text-[13px]"
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

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}