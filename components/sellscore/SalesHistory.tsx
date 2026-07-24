// components/sellscore/SalesHistory.tsx
// =============================================================================
// HarvestFile Sell Score — Sales history ("Your sales this year")
//
// Round 2 Item 3 (July 2026). Read-only view of the farmer's logged
// sales for the current marketing year (Sept 1 boundary), rendered below
// the position cards. Two pieces, per the handoff order:
//
//   1. Marketing-year timeline — a single horizontal Sept 1 → Aug 31
//      axis. Sale markers plotted by date, dot SIZE scaled by bushels.
//      Pace milestone ticks from the FIXED spec calendar (Nov 15 25%,
//      Jan 15 40%, Mar 15 55%, May 15 70%, Jul 15 85% — mirrors
//      lib/sellscore/pace-calendar.ts) plus a "today" marker. Strictly
//      read-only; deliberately NOT a month-grid calendar (sparse events
//      on a grid is bad 58+ mobile UX). Milestones and today render in
//      neutral/emerald — nothing here is negative context.
//   2. Reverse-chronological list — one plain-language row per sale.
//
// Server-renderable (no client hooks) like PositionDetail; the timeline
// is percentage-positioned HTML, responsive at any width. The host page
// composes SalesHistoryDisplay (lib/sellscore/display-types.ts).
//
// Design constraints (58+ demographic, per project rules):
//   - 18px floor on all row/body text. The 14px tracked-caps section
//     label and 14px/16px tick/caption labels match the M-03 label
//     scale used by every sibling section (PositionDetail et al.).
//   - Read-only: no edit/delete affordances, no future-sale placement,
//     no milestone editing (gated Path B decision).
//
// Empty state copy is spec'd verbatim in the Round 2 handoff:
// "Sales you log will appear here. Your books, one place."
// =============================================================================

import type { SalesHistoryDisplay, SaleLogEntryDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface SalesHistoryProps {
  history: SalesHistoryDisplay;
}

const CROP_LABELS: Record<string, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  wheat: 'Wheat',
  sorghum: 'Sorghum',
};

export default function SalesHistory({ history }: SalesHistoryProps) {
  const hasSales = history.entries.length > 0;

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
        Your sales this year
      </div>

      <MarketingYearTimeline history={history} />

      {hasSales ? (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
          {history.entries.map((entry, i) => (
            <SaleRow key={entry.id} entry={entry} first={i === 0} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Marketing-year timeline (Item 3, second half — read-only)
// ─────────────────────────────────────────────────────────────────────────

/**
 * FIXED pace milestones from the locked spec calendar (§4.4), the same
 * dates lib/sellscore/pace-calendar.ts interpolates between. yearOffset
 * is relative to the marketing-year start year. Not editable — editing
 * milestones is explicitly out (gated Path B decision).
 */
const TIMELINE_MILESTONES = [
  { month: 11, day: 15, yearOffset: 0, targetPct: 25, label: 'Nov 15' },
  { month: 1, day: 15, yearOffset: 1, targetPct: 40, label: 'Jan 15' },
  { month: 3, day: 15, yearOffset: 1, targetPct: 55, label: 'Mar 15' },
  { month: 5, day: 15, yearOffset: 1, targetPct: 70, label: 'May 15' },
  { month: 7, day: 15, yearOffset: 1, targetPct: 85, label: 'Jul 15' },
] as const;

/** Dot diameters in px: sqrt scale so area tracks bushels honestly. */
const DOT_MIN = 12;
const DOT_MAX = 26;

function MarketingYearTimeline({ history }: { history: SalesHistoryDisplay }) {
  const start = Date.parse(`${history.marketing_year_start}T00:00:00Z`);
  const end = Date.parse(`${history.marketing_year_end}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  const span = end - start;

  const positionPct = (ymd: string): number | null => {
    const t = Date.parse(`${ymd}T00:00:00Z`);
    if (!Number.isFinite(t)) return null;
    return Math.min(100, Math.max(0, ((t - start) / span) * 100));
  };

  const startYear = new Date(start).getUTCFullYear();
  const milestones = TIMELINE_MILESTONES.map((m) => ({
    ...m,
    pct: Math.min(
      100,
      Math.max(
        0,
        ((Date.UTC(startYear + m.yearOffset, m.month - 1, m.day) - start) / span) *
          100,
      ),
    ),
  }));

  const todayPct = positionPct(history.today);

  const maxBushels = history.entries.reduce(
    (max, e) => Math.max(max, e.bushels),
    0,
  );
  const dots = history.entries
    .map((e) => {
      const pct = positionPct(e.sale_date);
      if (pct === null) return null;
      const scale = maxBushels > 0 ? Math.sqrt(e.bushels / maxBushels) : 0;
      return {
        id: e.id,
        pct,
        diameter: Math.round(DOT_MIN + (DOT_MAX - DOT_MIN) * scale),
      };
    })
    .filter((d): d is { id: string; pct: number; diameter: number } => d !== null);

  const saleCount = dots.length;
  const ariaLabel =
    `Marketing year timeline, September 1 to August 31. ` +
    (saleCount > 0
      ? `${saleCount} logged ${saleCount === 1 ? 'sale' : 'sales'} plotted by date; bigger dots are bigger sales. `
      : 'No sales logged yet. ') +
    `Pace milestones: 25% by Nov 15, 40% by Jan 15, 55% by Mar 15, 70% by May 15, 85% by Jul 15.`;

  // Vertical layout (px from the top of the strip):
  //   14  "Today" label
  //   38  today marker top / dot centerline band
  //   50  axis
  //   62  milestone ticks end
  //   66  milestone labels (two lines)
  const AXIS_TOP = 50;

  return (
    <div className="mb-6">
      <div
        role="img"
        aria-label={ariaLabel}
        style={{ position: 'relative', height: '112px' }}
      >
        {/* Axis */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${AXIS_TOP}px`,
            height: '2px',
            borderRadius: '1px',
            backgroundColor: colors.borderDefault,
          }}
        />
        {/* Axis end caps */}
        {[0, 100].map((pct) => (
          <div
            key={`cap-${pct}`}
            style={{
              position: 'absolute',
              left: `${pct}%`,
              top: `${AXIS_TOP - 5}px`,
              width: '2px',
              height: '12px',
              transform: 'translateX(-50%)',
              backgroundColor: colors.borderEmphasis,
            }}
          />
        ))}

        {/* Milestone ticks + labels */}
        {milestones.map((m) => (
          <div key={m.label} aria-hidden="true">
            <div
              style={{
                position: 'absolute',
                left: `${m.pct}%`,
                top: `${AXIS_TOP - 6}px`,
                width: '2px',
                height: '14px',
                transform: 'translateX(-50%)',
                backgroundColor: colors.borderEmphasis,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${m.pct}%`,
                top: `${AXIS_TOP + 16}px`,
                transform: 'translateX(-50%)',
                textAlign: 'center',
                fontFamily: fonts.body,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
              }}
            >
              <div
                className="text-[14px]"
                style={{
                  ...tabularNums,
                  color: colors.textSecondary,
                  fontWeight: 600,
                }}
              >
                {m.targetPct}%
              </div>
              <div
                className="text-[14px]"
                style={{ color: colors.textTertiary, fontWeight: 400 }}
              >
                {m.label}
              </div>
            </div>
          </div>
        ))}

        {/* Sale dots — size tracks bushels */}
        {dots.map((d) => (
          <div
            key={d.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${d.pct}%`,
              top: `${AXIS_TOP + 1 - d.diameter / 2}px`,
              width: `${d.diameter}px`,
              height: `${d.diameter}px`,
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              backgroundColor: colors.emerald,
              opacity: 0.85,
              border: `2px solid ${colors.pageBg}`,
            }}
          />
        ))}

        {/* Today marker */}
        {todayPct !== null && (
          <div aria-hidden="true">
            <div
              style={{
                position: 'absolute',
                left: `${todayPct}%`,
                top: `${AXIS_TOP - 14}px`,
                width: '2px',
                height: '30px',
                transform: 'translateX(-50%)',
                borderRadius: '1px',
                backgroundColor: colors.emerald,
              }}
            />
            <div
              className="text-[14px]"
              style={{
                position: 'absolute',
                left: `${todayPct}%`,
                top: '8px',
                transform:
                  todayPct < 8
                    ? 'translateX(0)'
                    : todayPct > 92
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
                color: colors.emerald,
                fontFamily: fonts.body,
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              Today
            </div>
          </div>
        )}
      </div>

      {/* Plain-language caption; 16px matches sibling supporting lines */}
      <p
        className="text-[16px] mt-2 mb-0"
        style={{
          color: colors.textTertiary,
          fontFamily: fonts.body,
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        Your marketing year, Sept 1 to Aug 31. Ticks are the sales-pace
        milestones{history.entries.length > 0 ? '; bigger dots are bigger sales' : ''}.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sales list (Item 3, first half)
// ─────────────────────────────────────────────────────────────────────────

function SaleRow({ entry, first }: { entry: SaleLogEntryDisplay; first: boolean }) {
  const cropLabel = CROP_LABELS[entry.crop] ?? entry.crop;

  // "Oct 14, 2025" — the marketing year spans two calendar years, so the
  // year is always shown to keep dates unambiguous for 58+ readers.
  const dateLabel = new Date(`${entry.sale_date}T00:00:00Z`).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  );

  const detailParts: string[] = [cropLabel];
  if (entry.cash_bid != null) {
    detailParts.push(`${formatters.currency(entry.cash_bid)}/bu`);
  }
  if (entry.elevator_name) {
    detailParts.push(entry.elevator_name);
  }

  return (
    <div
      className="px-5 sm:px-6 py-5"
      style={
        first ? undefined : { borderTop: `1px solid ${colors.borderSubtle}` }
      }
    >
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="text-[18px]"
          style={{
            color: colors.textPrimary,
            fontFamily: fonts.body,
            fontWeight: 600,
            letterSpacing: '-0.005em',
          }}
        >
          {dateLabel}
        </span>
        <span
          className="text-[18px] whitespace-nowrap"
          style={{
            ...tabularNums,
            color: colors.textPrimary,
            fontFamily: fonts.body,
            fontWeight: 600,
            letterSpacing: '-0.005em',
          }}
        >
          {formatters.bushels(entry.bushels)} bu
        </span>
      </div>
      <div
        className="text-[18px] mt-1"
        style={{
          ...tabularNums,
          color: colors.textSecondary,
          fontFamily: fonts.body,
          fontWeight: 400,
          letterSpacing: '-0.005em',
        }}
      >
        {detailParts.join(' · ')}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-xl px-5 sm:px-6 py-7"
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <p
        className="text-[18px] m-0"
        style={{
          color: colors.textSecondary,
          fontFamily: fonts.body,
          fontWeight: 400,
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        Sales you log will appear here. Your books, one place.
      </p>
    </div>
  );
}
