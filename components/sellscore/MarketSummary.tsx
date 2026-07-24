// components/sellscore/MarketSummary.tsx
// =============================================================================
// HarvestFile Sell Score — Today's Market Summary (A4, spec §4.1)
//
// Corn / soybeans / wheat overnight moves via the existing Yahoo Finance
// v8 path (GET /api/prices/futures — the /morning legacy markets module,
// ported per v6.6 §5). store=false skips the route's Supabase upsert;
// this is a read-only surface.
//
// Client component: fetches once on mount, renders three rows with the
// latest settle and the move vs the prior settle. Quiet skeleton while
// loading, quiet one-liner on failure — the decision screen above never
// depends on this card.
// =============================================================================
'use client';

import { useEffect, useState } from 'react';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface CommodityQuote {
  commodity: string;
  latestSettle: number | null;
  change: number | null;
  changePct: number | null;
}

const COMMODITIES: Array<{ code: string; label: string }> = [
  { code: 'CORN', label: 'Corn' },
  { code: 'SOYBEANS', label: 'Soybeans' },
  { code: 'WHEAT', label: 'Wheat' },
];

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; quotes: Record<string, CommodityQuote> };

export default function MarketSummary() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          '/api/prices/futures?commodities=CORN,SOYBEANS,WHEAT&days=5&store=false',
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.success || !json.data) throw new Error('bad payload');
        if (!cancelled) setState({ status: 'ready', quotes: json.data });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        Today&apos;s markets
      </div>

      {state.status === 'error' ? (
        <p
          className="text-[18px]"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          Market prices are unavailable right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {COMMODITIES.map(({ code, label }) => (
            <QuoteTile
              key={code}
              label={label}
              quote={state.status === 'ready' ? state.quotes[code] : undefined}
              loading={state.status === 'loading'}
            />
          ))}
        </div>
      )}

      <p
        className="text-[14px] mt-5"
        style={{
          color: colors.textMuted,
          fontFamily: fonts.body,
          fontWeight: 400,
        }}
      >
        CME front-month settle · move vs prior session
      </p>
    </section>
  );
}

function QuoteTile({
  label,
  quote,
  loading,
}: {
  label: string;
  quote?: CommodityQuote;
  loading: boolean;
}) {
  const settle = quote?.latestSettle ?? null;
  const change = quote?.change ?? null;
  const changePct = quote?.changePct ?? null;

  const moveColor =
    change == null || change === 0
      ? colors.textTertiary
      : change > 0
        ? colors.emerald
        : colors.warmRed;

  return (
    <div
      className="px-5 py-5 rounded-xl"
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.borderSubtle}`,
        minHeight: '112px',
      }}
    >
      <div
        className="text-[14px] uppercase mb-2"
        style={{
          color: colors.textSecondary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        {label}
      </div>

      {loading || settle == null ? (
        <div
          className="rounded-md animate-pulse"
          style={{
            height: '30px',
            width: '96px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
          }}
          aria-hidden="true"
        />
      ) : (
        <>
          <div
            className="text-[26px]"
            style={{
              ...tabularNums,
              color: colors.textPrimary,
              fontFamily: fonts.display,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {formatters.currency(settle)}
          </div>
          <div
            className="text-[18px] mt-2"
            style={{
              ...tabularNums,
              color: moveColor,
              fontFamily: fonts.body,
              fontWeight: 600,
            }}
          >
            {change == null ? (
              '—'
            ) : (
              <>
                {change > 0 ? '▲' : change < 0 ? '▼' : ''}{' '}
                {change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}
                {changePct != null && (
                  <span style={{ color: colors.textTertiary, fontWeight: 400 }}>
                    {' '}
                    ({changePct >= 0 ? '+' : ''}
                    {changePct.toFixed(1)}%)
                  </span>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
