// components/sellscore/ElevatorComparison.tsx
// =============================================================================
// HarvestFile Sell Score — Local Elevator Comparison (A2, spec §4.1)
//
// Pinned elevator(s) first, then the closest others, each with today's
// cash bid for the recommendation's crop. Data comes fully composed via
// props (Barchart getGrainBids path, merged with sellscore_elevators in
// the server page) — this component renders, nothing more.
//
// 58+ rules: 18px body floor, tabular numerals for prices.
// =============================================================================

import type { ElevatorBidDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface ElevatorComparisonProps {
  elevators: ElevatorBidDisplay[];
  crop: string;
}

const CROP_LABELS: Record<string, string> = {
  corn: 'corn',
  soybeans: 'soybeans',
  wheat: 'wheat',
  sorghum: 'sorghum',
};

export default function ElevatorComparison({
  elevators,
  crop,
}: ElevatorComparisonProps) {
  if (elevators.length === 0) return null;

  const cropLabel = CROP_LABELS[crop] ?? crop;
  const anyLiveBid = elevators.some((e) => e.cash_bid != null);
  // Best bid gets a quiet highlight — the farmer's eye should land on it.
  const bestBid = elevators.reduce<number | null>(
    (best, e) =>
      e.cash_bid != null && (best == null || e.cash_bid > best)
        ? e.cash_bid
        : best,
    null,
  );

  return (
    <section
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
    >
      <div
        className="text-[14px] uppercase mb-2"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        Local cash bids
      </div>
      <p
        className="text-[16px] mb-6"
        style={{
          color: colors.textTertiary,
          fontFamily: fonts.body,
          fontWeight: 400,
        }}
      >
        Today&apos;s {cropLabel} bids near you
      </p>

      <ul className="flex flex-col">
        {elevators.map((e, i) => {
          const isBest = e.cash_bid != null && e.cash_bid === bestBid;
          return (
            <li
              key={e.id}
              className="flex items-center justify-between gap-4 py-4"
              style={{
                borderTop: i > 0 ? `1px solid ${colors.borderSubtle}` : 'none',
                minHeight: '64px',
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className="text-[18px] truncate"
                    style={{
                      color: colors.textPrimary,
                      fontFamily: fonts.body,
                      fontWeight: 600,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {e.name}
                  </span>
                  {e.pinned && (
                    <span
                      className="text-[12px] uppercase px-2 py-0.5 rounded-md shrink-0"
                      style={{
                        color: colors.emerald,
                        backgroundColor: colors.emeraldGlow,
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        letterSpacing: '0.08em',
                        fontWeight: 700,
                        fontFamily: fonts.body,
                      }}
                    >
                      Your elevator
                    </span>
                  )}
                </div>
                <div
                  className="text-[16px] mt-1"
                  style={{
                    ...tabularNums,
                    color: colors.textTertiary,
                    fontFamily: fonts.body,
                    fontWeight: 400,
                  }}
                >
                  {e.city}
                  {e.state ? `, ${e.state}` : ''}
                  {e.distance_miles != null
                    ? ` · ${Math.round(e.distance_miles)} mi`
                    : ''}
                </div>
              </div>

              <div
                className="text-[20px] shrink-0"
                style={{
                  ...tabularNums,
                  color:
                    e.cash_bid == null
                      ? colors.textMuted
                      : isBest
                        ? colors.emerald
                        : colors.textPrimary,
                  fontFamily: fonts.display,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {e.cash_bid != null ? formatters.currency(e.cash_bid) : '—'}
              </div>
            </li>
          );
        })}
      </ul>

      {!anyLiveBid && (
        <p
          className="text-[16px] mt-3"
          style={{
            color: colors.textTertiary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          Live bids are unavailable right now. They&apos;ll be back with the
          next market update.
        </p>
      )}
    </section>
  );
}
