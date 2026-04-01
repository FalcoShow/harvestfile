// =============================================================================
// HarvestFile — Build 18 Deploy 3: Historical Payments Bar Chart
// app/(marketing)/check/components/historical/HistoricalChart.tsx
//
// Recharts grouped bar chart showing ARC-CO vs PLC per-acre payment rates
// over 5-10 crop years. Gold bars for ARC-CO, emerald for PLC.
//
// Design decisions:
//   - Winner bar gets bright fill + 2px stroke; loser gets muted fill
//   - Rounded top corners (6px) for premium feel
//   - minPointSize={3} shows thin slivers for $0 values (confirms data exists)
//   - Staggered animation: ARC starts at 0ms, PLC at 200ms
//   - Custom tooltip with 18px fonts for farmer demographic
//   - Respects prefers-reduced-motion
//   - WCAG: gold vs emerald is safe for deuteranopia (8% of males)
//   - accessibilityLayer enables keyboard tooltip navigation
//
// The chart renders inside a glassmorphism card matching the Decision Hub theme.
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { HistoricalPaymentYear } from '@/lib/stores/farm-store';

// ─── Color System ────────────────────────────────────────────────────────────

const COLORS = {
  gold: '#C9A84C',
  goldBright: '#E0C060',
  goldMuted: 'rgba(201, 168, 76, 0.25)',
  emerald: '#34D399',
  emeraldBright: '#5EEAD4',
  emeraldMuted: 'rgba(52, 211, 153, 0.25)',
  base: '#0C1F17',
  surface: '#132A1F',
  border: '#2D5A3F',
  textPrimary: '#E8F5E9',
  textSecondary: '#8AAF98',
  gridLine: 'rgba(45, 90, 63, 0.3)',
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipPayload {
  value: number;
  dataKey: string;
  name: string;
  payload: ChartDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface ChartDataPoint {
  year: number;
  arcco: number;
  plc: number;
  winner: 'ARC-CO' | 'PLC' | 'TIE';
  dataStatus: 'final' | 'estimated';
  myaPrice: number;
  countyYield: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length < 2) return null;

  const data = payload[0].payload;
  const arcVal = data.arcco;
  const plcVal = data.plc;
  const diff = Math.abs(arcVal - plcVal);

  return (
    <div
      className="rounded-xl px-4 py-3.5 shadow-xl"
      style={{
        background: '#0C1F17',
        border: '1px solid rgba(201, 168, 76, 0.2)',
        backdropFilter: 'blur(8px)',
        minWidth: '200px',
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[16px] font-extrabold text-white/90">{label}</span>
        {data.dataStatus === 'estimated' && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(201, 168, 76, 0.12)',
              color: '#C9A84C',
            }}
          >
            Est.
          </span>
        )}
      </div>

      {/* ARC-CO */}
      <div className="flex items-center justify-between gap-6 mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: data.winner === 'ARC-CO' ? COLORS.goldBright : COLORS.gold }}
          />
          <span className="text-[13px] text-white/60">ARC-CO</span>
        </div>
        <span
          className="text-[14px] font-bold tabular-nums"
          style={{ color: data.winner === 'ARC-CO' ? COLORS.goldBright : 'rgba(255,255,255,0.5)' }}
        >
          ${arcVal.toFixed(2)}/ac
        </span>
      </div>

      {/* PLC */}
      <div className="flex items-center justify-between gap-6 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: data.winner === 'PLC' ? COLORS.emeraldBright : COLORS.emerald }}
          />
          <span className="text-[13px] text-white/60">PLC</span>
        </div>
        <span
          className="text-[14px] font-bold tabular-nums"
          style={{ color: data.winner === 'PLC' ? COLORS.emeraldBright : 'rgba(255,255,255,0.5)' }}
        >
          ${plcVal.toFixed(2)}/ac
        </span>
      </div>

      {/* Difference */}
      {diff > 0 && (
        <div
          className="pt-2 mt-1 text-[12px] text-white/35"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {data.winner === 'TIE' ? 'Tied' : `${data.winner} paid $${diff.toFixed(2)}/ac more`}
        </div>
      )}

      {/* MYA Price context */}
      <div className="text-[11px] text-white/20 mt-1.5">
        MYA: ${data.myaPrice.toFixed(2)} &middot; Yield: {data.countyYield.toFixed(1)} bu/ac
      </div>
    </div>
  );
}

// ─── Chart Component ─────────────────────────────────────────────────────────

interface HistoricalChartProps {
  data: HistoricalPaymentYear[];
}

export default function HistoricalChart({ data }: HistoricalChartProps) {
  // Check reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReduceMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }
  }, []);

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = data.map((d) => ({
    year: d.cropYear,
    arcco: d.arcPerAcre,
    plc: d.plcPerAcre,
    winner: d.winner,
    dataStatus: d.dataStatus,
    myaPrice: d.myaPrice,
    countyYield: d.countyYield,
  }));

  // Find max value for Y axis domain
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.arcPerAcre, d.plcPerAcre)),
    10 // minimum ceiling to prevent cramped chart when all values are 0
  );

  return (
    <div
      className="rounded-[16px] p-4 sm:p-5"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* Chart header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-white/25 uppercase tracking-wider">
          Payment per base acre
        </span>
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: COLORS.gold }} />
            <span className="text-[11px] text-white/35 font-medium">ARC-CO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: COLORS.emerald }} />
            <span className="text-[11px] text-white/35 font-medium">PLC</span>
          </div>
        </div>
      </div>

      {/* Recharts grouped bar chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          barCategoryGap="20%"
          barGap={4}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            stroke={COLORS.gridLine}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            axisLine={{ stroke: COLORS.border }}
            tickLine={false}
            tick={{ fill: COLORS.textPrimary, fontSize: 14, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={58}
            domain={[0, Math.ceil(maxVal * 1.15)]}
            tickFormatter={(v: number) => `$${v}`}
            tick={{ fill: COLORS.textSecondary, fontSize: 13 }}
          />
          <ReferenceLine y={0} stroke={COLORS.border} strokeWidth={1} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(45, 90, 63, 0.15)' }}
          />

          {/* ARC-CO bars */}
          <Bar
            dataKey="arcco"
            name="ARC-CO"
            radius={[6, 6, 0, 0]}
            animationBegin={0}
            animationDuration={reduceMotion ? 0 : 800}
            animationEasing="ease-out"
            maxBarSize={48}
            minPointSize={3}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={`arc-${i}`}
                fill={
                  entry.winner === 'ARC-CO'
                    ? COLORS.goldBright
                    : entry.arcco > 0
                    ? COLORS.gold
                    : COLORS.goldMuted
                }
                stroke={entry.winner === 'ARC-CO' ? COLORS.gold : 'none'}
                strokeWidth={entry.winner === 'ARC-CO' ? 2 : 0}
              />
            ))}
          </Bar>

          {/* PLC bars */}
          <Bar
            dataKey="plc"
            name="PLC"
            radius={[6, 6, 0, 0]}
            animationBegin={reduceMotion ? 0 : 200}
            animationDuration={reduceMotion ? 0 : 800}
            animationEasing="ease-out"
            maxBarSize={48}
            minPointSize={3}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={`plc-${i}`}
                fill={
                  entry.winner === 'PLC'
                    ? COLORS.emeraldBright
                    : entry.plc > 0
                    ? COLORS.emerald
                    : COLORS.emeraldMuted
                }
                stroke={entry.winner === 'PLC' ? COLORS.emerald : 'none'}
                strokeWidth={entry.winner === 'PLC' ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
