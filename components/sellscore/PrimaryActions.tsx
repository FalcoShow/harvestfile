// components/sellscore/PrimaryActions.tsx
// =============================================================================
// HarvestFile Sell Score — Primary Actions
//
// Workstream A item 1 (July 23, 2026):
//   - "Log a sale" is now a persistent affordance in ALL states
//     (SELL / HOLD / WATCH-as-hold / PACE_ALERT). Farmers sell on their
//     own schedule; on HOLD days there was previously no way to record a
//     sale from this screen — the #1 farmer complaint. Hidden only for
//     out_of_season (nothing left to price).
//   - The SELL-day "Mark N bu as priced" button now actually persists via
//     POST /api/sellscore/log-sale (it was a client-side visual toggle).
//     Both buttons reuse the same position-update flow (spec §5.3:
//     grain_positions.bushels_contracted + recommendation auto-update).
//   - `demo` prop: the /sellscore/preview page runs unauthenticated with
//     mock farms, so demo mode simulates the write locally.
//
// Typography/touch rules for the 58+ demographic: 18px body floor on all
// new text, 48px minimum touch targets (buttons here are 56px).
// =============================================================================
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CropPosition, Recommendation } from '@/lib/sellscore/types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface PrimaryActionsProps {
  recommendation: Recommendation;
  /** Open positions, used by the Log-a-sale dialog for crop + limits */
  positions?: CropPosition[];
  /** Preview/design-review mode: simulate the write, no network call */
  demo?: boolean;
}

const CROP_LABELS: Record<string, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  wheat: 'Wheat',
  sorghum: 'Sorghum',
};

interface LoggedSale {
  crop: string;
  bushels: number;
}

export default function PrimaryActions({
  recommendation,
  positions = [],
  demo = false,
}: PrimaryActionsProps) {
  const router = useRouter();
  const [marked, setMarked] = useState(false);
  const [marking, setMarking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastLogged, setLastLogged] = useState<LoggedSale | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state when the underlying recommendation changes
  // (preview scenario toggle, crop toggle on /sellscore).
  useEffect(() => {
    setMarked(false);
    setMarking(false);
    setDialogOpen(false);
    setLastLogged(null);
    setError(null);
  }, [recommendation.recommendation_type, recommendation.crop]);

  const isSell =
    recommendation.recommendation_type === 'sell' &&
    typeof recommendation.recommended_bushels === 'number';

  const isOutOfSeason =
    recommendation.recommendation_type === 'out_of_season';

  // Out-of-season: everything is priced — no sale to log, no math to show.
  const showSeeTheMath = !isOutOfSeason;

  const openPositions = useMemo(
    () => positions.filter((p) => p.unsold_bushels > 0),
    [positions],
  );
  const showLogSale = !isOutOfSeason && openPositions.length > 0;

  if (!isSell && !showSeeTheMath && !showLogSale) {
    return null;
  }

  async function submitSale(crop: string, bushels: number): Promise<string | null> {
    if (demo) {
      // Preview build: simulate latency, never hit the network.
      await new Promise((r) => setTimeout(r, 500));
      return null;
    }
    try {
      const res = await fetch('/api/sellscore/log-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop, bushels }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return typeof json.error === 'string'
          ? json.error
          : 'Could not log the sale. Try again.';
      }
      return null;
    } catch {
      return 'Could not reach the server. Check your connection and try again.';
    }
  }

  const handleMarkAsPriced = async () => {
    if (marked || marking || !recommendation.recommended_bushels) return;
    setMarking(true);
    setError(null);
    const failure = await submitSale(
      recommendation.crop,
      recommendation.recommended_bushels,
    );
    setMarking(false);
    if (failure) {
      setError(failure);
      return;
    }
    setMarked(true);
    setLastLogged({
      crop: recommendation.crop,
      bushels: recommendation.recommended_bushels,
    });
    if (!demo) router.refresh();
  };

  const handleSeeTheMath = () => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById('why-this-recommendation');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaleLogged = (sale: LoggedSale) => {
    setDialogOpen(false);
    setLastLogged(sale);
    setError(null);
    if (!demo) router.refresh();
  };

  return (
    <div className="px-6 sm:px-10 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row gap-3">
        {isSell && (
          <button
            type="button"
            onClick={handleMarkAsPriced}
            disabled={marked || marking}
            aria-pressed={marked}
            className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2.5 px-7 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0d]"
            style={{
              minHeight: '56px',
              backgroundColor: marked ? 'transparent' : colors.emerald,
              color: marked ? colors.emerald : '#0a0f0d',
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: '18px',
              letterSpacing: '-0.005em',
              border: marked ? `1px solid ${colors.emerald}` : '1px solid transparent',
              opacity: marking ? 0.7 : 1,
              transition: 'background-color 180ms ease-out, color 180ms ease-out, border-color 180ms ease-out, opacity 180ms ease-out',
              cursor: marked ? 'default' : 'pointer',
            }}
          >
            {marked ? (
              <>
                <CheckIcon />
                <span>Marked as priced</span>
              </>
            ) : marking ? (
              <span>Logging…</span>
            ) : (
              <>
                <span>Mark</span>
                <span style={tabularNums}>
                  {formatters.bushels(recommendation.recommended_bushels!)} bu
                </span>
                <span>as priced</span>
                <ArrowIcon />
              </>
            )}
          </button>
        )}

        {showLogSale && (
          <button
            type="button"
            onClick={() => {
              setDialogOpen(true);
              setError(null);
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0d]"
            style={{
              minHeight: '56px',
              backgroundColor: 'transparent',
              color: colors.emerald,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: '18px',
              letterSpacing: '-0.005em',
              border: `1px solid rgba(52, 211, 153, 0.45)`,
              transition: 'border-color 180ms ease-out, background-color 180ms ease-out',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = colors.emerald;
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.emeraldGlow;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(52, 211, 153, 0.45)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <PlusIcon />
            <span>Log a sale</span>
          </button>
        )}

        {showSeeTheMath && (
          <button
            type="button"
            onClick={handleSeeTheMath}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0d]"
            style={{
              minHeight: '56px',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              fontFamily: fonts.body,
              fontWeight: 500,
              fontSize: '18px',
              letterSpacing: '-0.005em',
              border: `1px solid ${colors.borderDefault}`,
              transition: 'border-color 180ms ease-out, color 180ms ease-out',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = colors.borderEmphasis;
              (e.currentTarget as HTMLButtonElement).style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = colors.borderDefault;
              (e.currentTarget as HTMLButtonElement).style.color = colors.textSecondary;
            }}
          >
            See the math
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 text-[18px]"
          style={{
            color: colors.warmRed,
            fontFamily: fonts.body,
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}

      {lastLogged && !error && (
        <p
          className="mt-4 text-[18px]"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          <span style={{ color: colors.emerald, fontWeight: 600 }}>Sale logged</span>
          {' — '}
          <span style={tabularNums}>{formatters.bushels(lastLogged.bushels)} bu</span>
          {' '}of {CROP_LABELS[lastLogged.crop] ?? lastLogged.crop}. Your pace and
          score update to match.
        </p>
      )}

      {dialogOpen && (
        <LogSaleDialog
          openPositions={openPositions}
          defaultCrop={
            openPositions.some((p) => p.crop === recommendation.crop)
              ? recommendation.crop
              : openPositions[0].crop
          }
          onSubmit={submitSale}
          onLogged={handleSaleLogged}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Log-a-sale dialog
// ─────────────────────────────────────────────────────────────────────────

function LogSaleDialog({
  openPositions,
  defaultCrop,
  onSubmit,
  onLogged,
  onClose,
}: {
  openPositions: CropPosition[];
  defaultCrop: string;
  onSubmit: (crop: string, bushels: number) => Promise<string | null>;
  onLogged: (sale: LoggedSale) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState(defaultCrop);
  const [bushelsText, setBushelsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selected = openPositions.find((p) => p.crop === crop) ?? openPositions[0];
  const unsold = selected?.unsold_bushels ?? 0;

  const parsed = Number.parseInt(bushelsText.replace(/[^\d]/g, ''), 10);
  const bushels = Number.isFinite(parsed) ? parsed : 0;
  const valid = bushels > 0 && bushels <= unsold;

  const handleConfirm = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const failure = await onSubmit(selected.crop, bushels);
    setSubmitting(false);
    if (failure) {
      setError(failure);
      return;
    }
    onLogged({ crop: selected.crop, bushels });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Log a sale"
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(4, 8, 6, 0.72)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl px-6 sm:px-8 pt-7 pb-8"
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.borderDefault}`,
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3
            className="text-[24px]"
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              color: colors.textPrimary,
              letterSpacing: '-0.02em',
            }}
          >
            Log a sale
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center rounded-lg -mr-2 -mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            style={{
              width: '48px',
              height: '48px',
              color: colors.textTertiary,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <p
          className="text-[18px] mb-6"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          Record bushels you've priced at your elevator. Your pace updates
          right away.
        </p>

        {openPositions.length > 1 && (
          <div className="flex gap-2 mb-5" role="radiogroup" aria-label="Crop">
            {openPositions.map((p) => {
              const active = p.crop === selected.crop;
              return (
                <button
                  key={p.crop}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setCrop(p.crop);
                    setError(null);
                  }}
                  className="flex-1 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  style={{
                    minHeight: '52px',
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: '18px',
                    letterSpacing: '-0.005em',
                    color: active ? colors.emerald : colors.textSecondary,
                    backgroundColor: active ? colors.emeraldGlow : 'transparent',
                    border: active
                      ? `1px solid rgba(52, 211, 153, 0.45)`
                      : `1px solid ${colors.borderDefault}`,
                    cursor: 'pointer',
                    transition: 'all 160ms ease-out',
                  }}
                >
                  {CROP_LABELS[p.crop] ?? p.crop}
                </button>
              );
            })}
          </div>
        )}

        <label
          htmlFor="log-sale-bushels"
          className="block text-[18px] mb-2"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 500,
          }}
        >
          Bushels sold
        </label>
        <input
          ref={inputRef}
          id="log-sale-bushels"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 2,500"
          value={bushelsText}
          onChange={(e) => {
            setBushelsText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          className="w-full rounded-xl px-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          style={{
            height: '56px',
            fontSize: '20px',
            fontFamily: fonts.body,
            fontWeight: 500,
            ...tabularNums,
            color: colors.textPrimary,
            backgroundColor: colors.pageBg,
            border: `1px solid ${colors.borderDefault}`,
          }}
        />
        <p
          className="mt-2 text-[16px]"
          style={{
            ...tabularNums,
            color:
              bushels > unsold ? colors.warmRed : colors.textTertiary,
            fontFamily: fonts.body,
            fontWeight: 400,
          }}
        >
          {formatters.bushels(unsold)} bu of{' '}
          {CROP_LABELS[selected.crop]?.toLowerCase() ?? selected.crop} unsold
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 text-[18px]"
            style={{
              color: colors.warmRed,
              fontFamily: fonts.body,
              fontWeight: 500,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!valid || submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131918]"
          style={{
            minHeight: '56px',
            backgroundColor: valid && !submitting ? colors.emerald : 'rgba(52, 211, 153, 0.25)',
            color: valid && !submitting ? '#0a0f0d' : 'rgba(10, 15, 13, 0.7)',
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: '18px',
            letterSpacing: '-0.005em',
            border: '1px solid transparent',
            cursor: valid && !submitting ? 'pointer' : 'default',
            transition: 'background-color 180ms ease-out',
          }}
        >
          {submitting ? (
            'Logging…'
          ) : valid ? (
            <>
              <span>Log</span>
              <span style={tabularNums}>{formatters.bushels(bushels)} bu</span>
              <span>as sold</span>
            </>
          ) : (
            'Log sale'
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
