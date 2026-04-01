// =============================================================================
// HarvestFile — Build 18 Deploy 4: Election Trend Chart
// app/(marketing)/check/components/elections/ElectionTrendChart.tsx
//
// Recharts area chart showing ARC-CO % and PLC % over 7 program years.
// Teal (#2DD4BF) for ARC-CO, gold (#C9A84C) for PLC with gradient fills.
// Dashed 50% reference line anchors the visual midpoint.
//
// strokeWidth=2.5 is intentionally thick for 58-year-old farmer demographic.
// Dots at r=4 (r=6 on active) ensure touch-friendly data points.
// =============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  arcCo: '#2DD4BF',
  plc: '#C9A84C',
  grid: 'rgba(255,255,255,0.06)',
  axis: 'rgba(255,255,255,0.35)',
  refLine: 'rgba(255,255,255,0.12)',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ElectionYearData {
  programYear: number;
  arccoPct: number;
  plcPct: number;
  totalAcres: number;
}

interface TrendPoint {
  year: string;
  arcCo: number;
  plc: number;
  totalAcres: number;
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
  payload: TrendPoint;
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl px-4 py-3.5 shadow-xl"
      style={{ background: '#0C1F17', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(8px)', minWidth: '180px' }}
    >
      <div className="text-[15px] font-extrabold text-white/90 mb-2">{label}</div>
      <div className="flex items-center justify-between gap-6 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: C.arcCo }} />
          <span className="text-[13px] text-white/60">ARC-CO</span>
        </div>
        <span className="text-[14px] font-bold tabular-nums" style={{ color: C.arcCo }}>
          {d.arcCo.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-6 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: C.plc }} />
          <span className="text-[13px] text-white/60">PLC</span>
        </div>
        <span className="text-[14px] font-bold tabular-nums" style={{ color: C.plc }}>
          {d.plc.toFixed(1)}%
        </span>
      </div>
      <div className="text-[11px] text-white/20 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {d.totalAcres.toLocaleString()} total enrolled acres
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ElectionTrendChartProps {
  data: ElectionYearData[];
}

export default function ElectionTrendChart({ data }: ElectionTrendChartProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  const chartData: TrendPoint[] = useMemo(
    () =>
      data.map((d) => ({
        year: String(d.programYear),
        arcCo: d.arccoPct,
        plc: d.plcPct,
        totalAcres: d.totalAcres,
      })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
        <defs>
          <linearGradient id="gradElArcCo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.arcCo} stopOpacity={0.2} />
            <stop offset="95%" stopColor={C.arcCo} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradElPlc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.plc} stopOpacity={0.2} />
            <stop offset="95%" stopColor={C.plc} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />

        <XAxis
          dataKey="year"
          axisLine={false}
          tickLine={false}
          tick={{ fill: C.axis, fontSize: 14, fontWeight: 500 }}
          tickMargin={8}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: C.axis, fontSize: 13 }}
          tickFormatter={(v: number) => `${v}%`}
          width={48}
        />

        <ReferenceLine
          y={50}
          stroke={C.refLine}
          strokeDasharray="6 4"
        />

        <Tooltip
          content={<TrendTooltip />}
          wrapperStyle={{ outline: 'none' }}
          cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="arcCo"
          name="ARC-CO"
          stroke={C.arcCo}
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#gradElArcCo)"
          dot={{ r: 4, fill: C.arcCo, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: C.arcCo, stroke: '#fff', strokeWidth: 2 }}
          animationBegin={0}
          animationDuration={reduceMotion ? 0 : 1200}
          animationEasing="ease-out"
        />

        <Area
          type="monotone"
          dataKey="plc"
          name="PLC"
          stroke={C.plc}
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#gradElPlc)"
          dot={{ r: 4, fill: C.plc, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: C.plc, stroke: '#fff', strokeWidth: 2 }}
          animationBegin={reduceMotion ? 0 : 200}
          animationDuration={reduceMotion ? 0 : 1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
