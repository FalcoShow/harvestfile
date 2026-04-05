// =============================================================================
// app/(marketing)/morning/_components/BasisTrackingCard.tsx
// HarvestFile — Surface 2 Deploy 3D: Basis Tracking Card
//
// Transforms the /morning dashboard from passive bid viewer into active
// marketing signal by showing:
//   1. Current basis at nearest elevator with percentile badge
//   2. Seasonal overlay chart (current year vs 3-year average)
//   3. Multi-elevator comparison strip
//   4. Natural-language narrative summary
//
// Data: /api/markets/basis-tracking (Barchart basisRollingSymbol → getHistory)
// Chart: Recharts ComposedChart (no TradingView — need fill-between-series)
// =============================================================================

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BasisTrackingData, WeeklyBasisData, ElevatorComparison } from '@/lib/hooks/morning/use-basis';

// ─── Types ───────────────────────────────────────────────────────────────

interface BasisTrackingCardProps {
  basisData: BasisTrackingData | null;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  className?: string;
}

// ─── Commodity Toggle Config ─────────────────────────────────────────────

const COMMODITIES = [
  { code: 'Corn', label: 'Corn', color: '#F59E0B' },
  { code: 'Soybeans', label: 'Beans', color: '#059669' },
  { code: 'Wheat', label: 'Wheat', color: '#D97706' },
];

// ─── Score Badge Colors ──────────────────────────────────────────────────

function getScoreBadge(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 80) return { label: 'Strong', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' };
  if (score >= 65) return { label: 'Above Avg', color: '#22C55E', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.20)' };
  if (score >= 35) return { label: 'Fair', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.20)' };
  if (score >= 20) return { label: 'Below Avg', color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.20)' };
  return { label: 'Weak', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.20)' };
}

// ─── Chart Tooltip ───────────────────────────────────────────────────────

function BasisTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const currentYear = payload.find((p: any) => p.dataKey === 'currentYear');
  const avg = payload.find((p: any) => p.dataKey === 'threeYearAvg');

  return (
    <div className="rounded-lg bg-[#0C1F17] border border-white/[0.12] px-3 py-2 shadow-xl">
      <p className="text-[10px] text-white/40 mb-1 font-medium">{label}</p>
      {currentYear?.value !== null && currentYear?.value !== undefined && (
        <p className="text-[12px] font-bold text-[#3B82F6] tabular-nums">
          {currentYear.value > 0 ? '+' : ''}{currentYear.value}¢ <span className="text-white/25 font-normal">2026</span>
        </p>
      )}
      {avg?.value !== null && avg?.value !== undefined && (
        <p className="text-[11px] font-semibold text-white/40 tabular-nums">
          {avg.value > 0 ? '+' : ''}{avg.value}¢ <span className="text-white/20 font-normal">3-yr avg</span>
        </p>
      )}
      {currentYear?.value !== null && avg?.value !== null && currentYear?.value !== undefined && avg?.value !== undefined && (
        <div className="mt-1 pt-1 border-t border-white/[0.06]">
          <p className={`text-[10px] font-bold tabular-nums ${
            currentYear.value > avg.value ? 'text-emerald-400' :
            currentYear.value < avg.value ? 'text-red-400' : 'text-white/30'
          }`}>
            {currentYear.value > avg.value ? '▲' : currentYear.value < avg.value ? '▼' : '—'}{' '}
            {Math.abs(Math.round(currentYear.value - avg.value))}¢ vs avg
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────

function BasisSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/[0.06] animate-pulse" />
            <div className="w-24 h-3.5 rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-14 h-6 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="w-14 h-6 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="w-14 h-6 rounded-full bg-white/[0.04] animate-pulse" />
          </div>
        </div>
        {/* Hero stat skeleton */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-24 h-10 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-20 h-6 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
        {/* Chart skeleton */}
        <div className="w-full h-[180px] rounded-xl bg-white/[0.03] animate-pulse mb-4" />
        {/* Elevator comparison skeleton */}
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="w-32 h-3 rounded bg-white/[0.06] animate-pulse" />
              <div className="w-16 h-3 rounded bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Elevator Row ────────────────────────────────────────────────────────

function ElevatorRow({ elevator, isFirst }: { elevator: ElevatorComparison; isFirst: boolean }) {
  const basisLabel = elevator.basisCents >= 0
    ? `+${elevator.basisCents}`
    : `${elevator.basisCents}`;

  const deviationColor = elevator.deviation > 3
    ? 'text-emerald-400'
    : elevator.deviation < -3
    ? 'text-red-400'
    : 'text-white/30';

  return (
    <div className={`flex items-center justify-between py-2.5 ${
      !isFirst ? 'border-t border-white/[0.04]' : ''
    }`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Distance badge */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex flex-col items-center justify-center">
          <span className="text-[10px] font-extrabold text-white/60 tabular-nums">
            {elevator.distance < 10 ? elevator.distance.toFixed(1) : Math.round(elevator.distance)}
          </span>
          <span className="text-[7px] font-bold text-white/25 uppercase">mi</span>
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-white/80 truncate leading-tight">
            {elevator.name}
          </div>
          <div className="text-[10px] text-white/25 truncate">
            {elevator.city}, {elevator.state}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-[10px] font-medium ${deviationColor}`}>
          {elevator.deviationLabel}
        </span>
        <span className="text-sm font-extrabold text-white/90 tabular-nums w-[56px] text-right">
          {basisLabel}¢
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function BasisTrackingCard({
  basisData,
  loading,
  error,
  onRetry,
  className = '',
}: BasisTrackingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCommodity, setSelectedCommodity] = useState('Corn');

  // Chart data: convert cents to display values, trim to recent 26 weeks for collapsed view
  const chartData = useMemo(() => {
    if (!basisData?.weeklyData?.length) return [];

    const data = basisData.weeklyData.map(w => ({
      ...w,
      // Convert to cents for display
      threeYearAvg: Math.round(w.threeYearAvg * 100),
      currentYear: w.currentYear !== null ? Math.round(w.currentYear * 100) : null,
      min: Math.round(w.min * 100),
      max: Math.round(w.max * 100),
    }));

    if (!expanded && basisData.currentWeekIndex >= 0) {
      // Show 26 weeks centered around current week
      const start = Math.max(0, basisData.currentWeekIndex - 12);
      const end = Math.min(data.length, start + 26);
      return data.slice(start, end);
    }

    return data;
  }, [basisData?.weeklyData, basisData?.currentWeekIndex, expanded]);

  // Y-axis domain: find min/max across all visible data
  const yDomain = useMemo(() => {
    if (!chartData.length) return [-60, 0];
    let min = Infinity;
    let max = -Infinity;
    for (const d of chartData) {
      if (d.threeYearAvg !== 0) { min = Math.min(min, d.threeYearAvg); max = Math.max(max, d.threeYearAvg); }
      if (d.currentYear !== null) { min = Math.min(min, d.currentYear); max = Math.max(max, d.currentYear); }
      if (d.min !== 0) min = Math.min(min, d.min);
      if (d.max !== 0) max = Math.max(max, d.max);
    }
    if (!isFinite(min)) min = -60;
    if (!isFinite(max)) max = 0;
    const padding = Math.max(5, (max - min) * 0.15);
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  // Loading state
  if (loading) return <BasisSkeleton />;

  // Error state
  if (error || (!basisData && !loading)) {
    return (
      <div className={`rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center ${className}`}>
        <p className="text-sm text-red-400 font-medium">Unable to load basis tracking data</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-xs font-semibold text-red-300 underline hover:text-red-200 transition-colors">
            Retry
          </button>
        )}
      </div>
    );
  }

  // No data (no elevators found)
  if (!basisData) return null;

  const badge = getScoreBadge(basisData.basisOpportunityScore);
  const basisDisplay = basisData.currentBasisCents >= 0
    ? `+${basisData.currentBasisCents}`
    : `${basisData.currentBasisCents}`;
  const deviationDisplay = basisData.deviationFromAvg >= 0
    ? `+${basisData.deviationFromAvg}¢ vs avg`
    : `${basisData.deviationFromAvg}¢ vs avg`;
  const deviationColor = basisData.deviationFromAvg > 3
    ? 'text-emerald-400'
    : basisData.deviationFromAvg < -3
    ? 'text-red-400'
    : 'text-white/30';

  // Elevator comparison: show top 3 collapsed, all expanded
  const visibleElevators = expanded
    ? basisData.elevatorComparison
    : basisData.elevatorComparison.slice(0, 3);

  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden ${className}`}>
      {/* ─── Header ─── */}
      <div className="px-5 sm:px-6 pt-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Basis Tracker</h2>
          </div>

          {/* Commodity Toggle */}
          <div className="flex gap-1">
            {COMMODITIES.map(c => (
              <button
                key={c.code}
                onClick={() => setSelectedCommodity(c.code)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                  selectedCommodity === c.code
                    ? 'text-white/90 border'
                    : 'text-white/25 hover:text-white/40 border border-transparent'
                }`}
                style={selectedCommodity === c.code ? {
                  backgroundColor: `${c.color}15`,
                  borderColor: `${c.color}30`,
                } : undefined}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/20 mt-0.5">
          {basisData.elevator.name} · {basisData.elevator.distance.toFixed(1)} mi
        </p>
      </div>

      {/* ─── Hero Stat ─── */}
      <div className="px-5 sm:px-6 pt-3 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Basis value */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {basisDisplay}
            </span>
            <span className="text-sm text-white/25 font-medium">¢</span>
          </div>

          {/* Futures month label */}
          <span className="text-[11px] text-white/25 font-medium">
            {basisData.currentBasisCents >= 0 ? 'over' : 'under'} {basisData.futuresMonth}
          </span>

          {/* Percentile badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
            style={{ backgroundColor: badge.bg, borderColor: badge.border }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.color }} />
            <span className="text-[11px] font-bold tabular-nums" style={{ color: badge.color }}>
              {badge.label} {basisData.basisOpportunityScore}
            </span>
          </div>
        </div>

        {/* Deviation from average */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[12px] font-semibold tabular-nums ${deviationColor}`}>
            {basisData.deviationFromAvg > 0 ? '▲' : basisData.deviationFromAvg < 0 ? '▼' : '—'}{' '}
            {deviationDisplay}
          </span>
          {basisData.dataYears.length > 0 && (
            <span className="text-[10px] text-white/15">
              ({basisData.dataYears[0]}–{basisData.dataYears[basisData.dataYears.length - 1]} avg)
            </span>
          )}
        </div>
      </div>

      {/* ─── Seasonal Chart ─── */}
      {chartData.length > 0 ? (
        <div className="px-3 sm:px-4 pt-1 pb-2">
          <ResponsiveContainer width="100%" height={expanded ? 220 : 160}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="basisStrongGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="basisWeakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="basisRangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6B7280" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#6B7280" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.20)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
                interval={expanded ? 3 : 4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.20)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}¢`}
                domain={yDomain}
                width={40}
              />
              <Tooltip content={<BasisTooltip />} />

              {/* Range band (min–max) */}
              <Area
                type="monotone"
                dataKey="max"
                stroke="none"
                fill="url(#basisRangeGrad)"
                fillOpacity={1}
                isAnimationActive={false}
              />

              {/* 3-year average — dashed gray */}
              <Line
                type="monotone"
                dataKey="threeYearAvg"
                stroke="rgba(156,163,175,0.50)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name="3-Yr Avg"
                isAnimationActive={false}
              />

              {/* Current year — solid bold */}
              <Line
                type="monotone"
                dataKey="currentYear"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={false}
                name="2026"
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Zero line */}
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px] bg-[#3B82F6] rounded-full" />
              <span className="text-[10px] text-white/25">2026</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px] bg-white/25 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(156,163,175,0.5) 0, rgba(156,163,175,0.5) 4px, transparent 4px, transparent 7px)' }} />
              <span className="text-[10px] text-white/25">3-yr avg</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 sm:px-6 py-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 text-center">
            <p className="text-[12px] text-white/30">
              Seasonal basis chart will appear once historical data is available for this location.
            </p>
          </div>
        </div>
      )}

      {/* ─── Elevator Comparison ─── */}
      {visibleElevators.length > 0 && (
        <div className="px-5 sm:px-6 py-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.1em]">
              Nearby Elevators
            </span>
            <span className="text-[10px] text-white/15 tabular-nums">
              {basisData.commodity} · {basisData.futuresMonth}
            </span>
          </div>

          <div>
            {visibleElevators.map((elev, i) => (
              <ElevatorRow key={`${elev.name}-${elev.city}`} elevator={elev} isFirst={i === 0} />
            ))}
          </div>

          {basisData.elevatorComparison.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-2 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-[11px] font-medium text-white/25 hover:text-white/40 transition-colors"
            >
              {expanded
                ? 'Show fewer'
                : `+${basisData.elevatorComparison.length - 3} more elevators`}
            </button>
          )}
        </div>
      )}

      {/* ─── Narrative Summary ─── */}
      {basisData.narrativeSummary && (
        <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-white/[0.06] overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${badge.bg}, rgba(27,67,50,0.20))` }}>
          <div className="p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}30` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={badge.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <p className="text-[12px] text-white/50 leading-relaxed">
                {basisData.narrativeSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Disclaimer ─── */}
      <div className="px-5 sm:px-6 py-2 border-t border-white/[0.04] bg-white/[0.02]">
        <p className="text-[9px] text-white/12 leading-relaxed">
          Historical basis averages are for informational purposes only. Past performance does not
          guarantee future results. Always consult with your grain merchandiser before making
          marketing decisions. Data provided by Barchart Solutions.
        </p>
      </div>
    </div>
  );
}
