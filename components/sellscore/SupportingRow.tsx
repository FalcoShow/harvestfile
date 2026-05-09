// components/sellscore/SupportingRow.tsx
import type { SupportingFigure } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface SupportingRowProps {
  supporting: SupportingFigure;
}

export default function SupportingRow({ supporting }: SupportingRowProps) {
  return (
    <div className="px-6 sm:px-10 pb-10 sm:pb-12">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline gap-y-7 sm:gap-y-6 sm:gap-x-14">
        <Figure
          label="Cash bid"
          value={formatters.currency(supporting.cash_price_per_bu)}
        />
        <VerticalDivider />
        <Figure
          label="Basis"
          value={formatters.cents(supporting.basis_cents)}
          subtitle={`${supporting.basis_percentile}th pct vs 3-yr norm`}
        />
        <VerticalDivider />
        <Figure
          label="Locks profit"
          value={formatters.perAcre(supporting.profit_per_acre)}
          accent
        />
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  subtitle,
  accent = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[88px]">
      <div
        className="text-[10px] uppercase mb-2"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        {label}
      </div>
      <div
        className="text-[26px] sm:text-[30px]"
        style={{
          ...tabularNums,
          fontFamily: fonts.display,
          fontWeight: 500,
          color: accent ? colors.emerald : colors.textPrimary,
          letterSpacing: '-0.022em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          className="text-[13px] mt-2"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 400,
            letterSpacing: '-0.005em',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function VerticalDivider() {
  return (
    <div
      className="hidden sm:block w-px self-stretch"
      style={{
        backgroundColor: colors.borderSubtle,
        minHeight: '48px',
      }}
      aria-hidden="true"
    />
  );
}
