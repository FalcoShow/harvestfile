// =============================================================================
// HarvestFile — Build 18 Deploy 3: Historical Stats Row
// app/(marketing)/check/components/historical/HistoricalStatsRow.tsx
//
// Four summary stat cards in a 2×2 mobile / 4×1 desktop grid:
//   1. ARC-CO Average — avg per-acre payment across all years (gold border)
//   2. PLC Average — avg per-acre payment across all years (emerald border)
//   3. ARC-CO Won — count of years ARC > PLC (gold border)
//   4. PLC Won — count of years PLC > ARC (emerald border)
//
// Design: dark cards with colored left border, 22px bold values, 14px labels.
// Follows the Bloomberg/Linear financial dashboard aesthetic.
// =============================================================================

'use client';

import type { HistoricalSummary } from '@/lib/stores/farm-store';

interface HistoricalStatsRowProps {
  summary: HistoricalSummary;
}

interface StatCardProps {
  label: string;
  value: string;
  accentColor: string;
  isWinner?: boolean;
}

function StatCard({ label, value, accentColor, isWinner }: StatCardProps) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 relative overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderLeft: `3px solid ${accentColor}`,
        border: `1px solid rgba(255, 255, 255, 0.04)`,
        borderLeftColor: accentColor,
        borderLeftWidth: '3px',
      }}
    >
      {/* Winner glow */}
      {isWinner && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 60%)`,
          }}
        />
      )}
      <div className="relative">
        <div className="text-[12px] sm:text-[13px] font-medium text-white/40 mb-1">
          {label}
        </div>
        <div
          className="text-[20px] sm:text-[22px] font-extrabold tabular-nums tracking-[-0.02em]"
          style={{ color: isWinner ? accentColor : 'rgba(255, 255, 255, 0.75)' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function HistoricalStatsRow({ summary }: HistoricalStatsRowProps) {
  const arcIsOverallWinner = summary.overallWinner === 'ARC-CO';
  const plcIsOverallWinner = summary.overallWinner === 'PLC';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="ARC-CO Avg/Acre"
        value={`$${summary.avgArcPerAcre.toFixed(2)}`}
        accentColor="#C9A84C"
        isWinner={arcIsOverallWinner}
      />
      <StatCard
        label="PLC Avg/Acre"
        value={`$${summary.avgPlcPerAcre.toFixed(2)}`}
        accentColor="#34D399"
        isWinner={plcIsOverallWinner}
      />
      <StatCard
        label="ARC-CO Won"
        value={`${summary.arcWins} year${summary.arcWins !== 1 ? 's' : ''}`}
        accentColor="#C9A84C"
        isWinner={summary.arcWins > summary.plcWins}
      />
      <StatCard
        label="PLC Won"
        value={`${summary.plcWins} year${summary.plcWins !== 1 ? 's' : ''}`}
        accentColor="#34D399"
        isWinner={summary.plcWins > summary.arcWins}
      />
    </div>
  );
}
