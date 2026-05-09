// components/sellscore/PaceContext.tsx
import type { PaceDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, tabularNums } from './_tokens';

interface PaceContextProps {
  pace: PaceDisplay;
}

export default function PaceContext({ pace }: PaceContextProps) {
  const { ytd_pct, target_pct, target_date_label, status, status_label } = pace;

  const statusColor =
    status === 'on_pace' ? colors.emerald :
    status === 'behind' ? colors.warmRed :
    colors.amber;

  return (
    <section
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{
        borderTop: `1px solid ${colors.borderSubtle}`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        className="text-[10px] uppercase mb-5"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        Marketing Pace
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-6">
        <p
          className="text-lg sm:text-xl"
          style={{
            fontFamily: fonts.display,
            fontWeight: 400,
            color: colors.textSecondary,
            letterSpacing: '-0.012em',
            lineHeight: 1.4,
          }}
        >
          You're{' '}
          <span style={{ ...tabularNums, color: colors.textPrimary, fontWeight: 600 }}>
            {ytd_pct}%
          </span>
          {' '}priced this marketing year.
        </p>

        <div
          className="text-sm whitespace-nowrap"
          style={{
            fontFamily: fonts.body,
            color: statusColor,
            fontWeight: 600,
            letterSpacing: '-0.005em',
          }}
        >
          {status_label}
        </div>
      </div>

      <PaceBar ytd={ytd_pct} target={target_pct} status={status} />

      <div
        className="mt-5 text-[13px]"
        style={{
          color: colors.textTertiary,
          fontFamily: fonts.body,
          fontWeight: 400,
        }}
      >
        Target by{' '}
        <span style={tabularNums}>{target_date_label}</span>
        :{' '}
        <span style={{ ...tabularNums, color: colors.textSecondary, fontWeight: 600 }}>
          {target_pct}%
        </span>
      </div>
    </section>
  );
}

function PaceBar({
  ytd,
  target,
  status,
}: {
  ytd: number;
  target: number;
  status: PaceDisplay['status'];
}) {
  const ytdClamped = Math.min(100, Math.max(0, ytd));
  const targetClamped = Math.min(100, Math.max(0, target));
  const fillColor =
    status === 'on_pace' ? colors.emerald :
    status === 'behind' ? colors.warmRed :
    colors.amber;

  return (
    <div
      className="relative h-1.5 rounded-full"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      role="meter"
      aria-valuenow={Math.round(ytd)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(ytd)} percent priced, target ${Math.round(target)} percent`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${ytdClamped}%`,
          backgroundColor: fillColor,
          opacity: 0.9,
          transition: 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* B2: target tick widened from 1px to 2px for prominence. */}
      <div
        className="absolute -translate-x-1/2"
        style={{
          left: `${targetClamped}%`,
          top: '-4px',
          bottom: '-4px',
          width: '2px',
          backgroundColor: colors.textSecondary,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
