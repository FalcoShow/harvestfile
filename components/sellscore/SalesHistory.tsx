// components/sellscore/SalesHistory.tsx
// =============================================================================
// HarvestFile Sell Score — Sales history ("Your sales this year")
//
// Round 2 Item 3 (July 23, 2026). Read-only list of the farmer's logged
// sales for the current marketing year (Sept 1 boundary), rendered below
// the position cards. This is the visible half of the bookkeeping loop:
// sellscore_sales_log rows written by /api/sellscore/log-sale, newest
// first, one plain-language row per sale.
//
// Server-renderable (no client hooks) like PositionDetail. The host page
// composes SalesHistoryDisplay (lib/sellscore/display-types.ts); this
// component only renders it.
//
// Design constraints (58+ demographic, per project rules):
//   - 18px floor on all row/body text. The 14px tracked-caps section
//     label matches the M-03 treatment used by every sibling section.
//   - Read-only: no edit/delete affordances. Editing logged sales and
//     planning future sales are explicitly out (gated Path B decision).
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
