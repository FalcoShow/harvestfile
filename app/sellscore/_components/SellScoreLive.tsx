// app/sellscore/_components/SellScoreLive.tsx
//
// Client wrapper for the live Sell Score page. Holds the active-crop
// state, renders the crop toggle, the shared SellScoreScreen, and a
// freshness footer that surfaces the basis-data date.

'use client';

import { useState } from 'react';
import type { SellScoreScreenData } from '@/lib/sellscore/display-types';
import SellScoreScreen from '@/components/sellscore/SellScoreScreen';
import { colors, fonts } from '@/components/sellscore/_tokens';

type EngineCrop = 'corn' | 'soybeans';

interface SellScoreLiveProps {
  crops: EngineCrop[];
  dataByCrop: Record<EngineCrop, SellScoreScreenData>;
  basisDataAsOf: string;
  historicalSampleSize: number;
}

const CROP_LABELS: Record<EngineCrop, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
};

export default function SellScoreLive({
  crops,
  dataByCrop,
  basisDataAsOf,
  historicalSampleSize,
}: SellScoreLiveProps) {
  const [activeCrop, setActiveCrop] = useState<EngineCrop>(crops[0]);
  const data = dataByCrop[activeCrop];

  return (
    <main
      className="min-h-screen w-full"
      style={{ backgroundColor: colors.pageBg }}
    >
      <div className="px-4 sm:px-8 py-8 sm:py-16">
        <div
          className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${colors.borderSubtle}` }}
        >
          {crops.length > 1 && (
            <CropToggle
              crops={crops}
              active={activeCrop}
              onChange={setActiveCrop}
            />
          )}
          <SellScoreScreen data={data} />
        </div>

        <FreshnessFooter
          basisDataAsOf={basisDataAsOf}
          historicalSampleSize={historicalSampleSize}
        />
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CropToggle — visual sibling to ScenarioToggle, no demo banner.
// ─────────────────────────────────────────────────────────────────────────

function CropToggle({
  crops,
  active,
  onChange,
}: {
  crops: EngineCrop[];
  active: EngineCrop;
  onChange: (next: EngineCrop) => void;
}) {
  return (
    <div
      className="px-6 sm:px-10 py-3.5 flex items-center justify-between gap-4"
      style={{
        backgroundColor: colors.cardBg,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <span
        className="text-[10px] uppercase shrink-0"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.24em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        Crop
      </span>

      <div role="tablist" className="flex gap-1.5">
        {crops.map((crop) => {
          const isActive = crop === active;
          return (
            <button
              key={crop}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(crop)}
              className="px-4 py-1.5 rounded-md text-[13px]"
              style={{
                fontFamily: fonts.body,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                color: isActive ? colors.textPrimary : colors.textSecondary,
                backgroundColor: isActive ? colors.pageBg : 'transparent',
                border: isActive
                  ? `1px solid ${colors.borderEmphasis}`
                  : `1px solid ${colors.borderSubtle}`,
                transition: 'all 160ms ease-out',
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              {CROP_LABELS[crop]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FreshnessFooter — the data-quality signal that signals competence to a
// 58-year-old who's been burned by software that hides its assumptions.
// ─────────────────────────────────────────────────────────────────────────

function FreshnessFooter({
  basisDataAsOf,
  historicalSampleSize,
}: {
  basisDataAsOf: string;
  historicalSampleSize: number;
}) {
  // Format ISO date "2025-12-22" → "December 22, 2025"
  const formatted = formatBasisDate(basisDataAsOf);

  return (
    <div
      className="w-full max-w-3xl mx-auto mt-8 text-center"
      style={{ color: colors.textMuted, fontFamily: fonts.body }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <p
          className="text-[10px] uppercase"
          style={{
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: colors.textTertiary,
          }}
        >
          Cash bid live · Basis as of {formatted}
        </p>
        <p
          className="text-[10px]"
          style={{
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: colors.textMuted,
          }}
        >
          {historicalSampleSize.toLocaleString()} historical observations · HarvestFile Sell Score
        </p>
      </div>
    </div>
  );
}

function formatBasisDate(iso: string): string {
  // Parse "YYYY-MM-DD" without timezone shifts
  const [y, m, d] = iso.split('-').map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}