// components/sellscore/PaceContext.tsx
// =============================================================================
// M-03 (May 18, 2026) typography pass:
//   - "Marketing Pace" eyebrow bumped from text-[10px] to text-[14px].
//   - "Behind pace" status label bumped from text-sm to text-[18px].
//   - "Target by May 18: 71%" supporting line bumped from text-[13px] to
//     text-[16px].
//
// July 23, 2026 (v6.6 backlog #1): status label and bar now take their
// color from the PACE SIGNAL itself (spec §4.4 semantics: at-or-behind =
// GREEN, urgency to sell), not from a re-derived farmer-state word. The
// previous status→color mapping painted "behind" warm red — the exact
// inversion the engine semantics forbid. `pace.status` remains in the
// display contract as a state descriptor but no longer drives color.
// =============================================================================

import type { PaceDisplay } from '@/lib/sellscore/display-types';
import type { SignalStatus } from '@/lib/sellscore/types';
import { colors, fonts, signalColors, tabularNums } from './_tokens';

interface PaceContextProps {
  pace: PaceDisplay;
  /** The recommendation's pace signal — drives label + bar color */
  signal: SignalStatus;
}

export default function PaceContext({ pace, signal }: PaceContextProps) {
  const { ytd_pct, target_pct, target_date_label, status_label } = pace;

  const statusColor = signalColors[signal].fg;

  return (
    <section
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{
        borderTop: `1px solid ${colors.borderSubtle}`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        className="text-[14px] uppercase mb-5"
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
          className="text-[18px] whitespace-nowrap"
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

      <PaceBar ytd={ytd_pct} target={target_pct} fillColor={statusColor} />

      <div
        className="mt-5 text-[16px]"
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
  fillColor,
}: {
  ytd: number;
  target: number;
  fillColor: string;
}) {
  const ytdClamped = Math.min(100, Math.max(0, ytd));
  const targetClamped = Math.min(100, Math.max(0, target));

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
