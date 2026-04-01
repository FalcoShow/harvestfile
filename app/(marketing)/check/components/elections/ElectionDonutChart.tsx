// =============================================================================
// HarvestFile — Build 18 Deploy 4: Election Donut Chart
// app/(marketing)/check/components/elections/ElectionDonutChart.tsx
//
// Recharts donut chart showing ARC-CO vs PLC election split for the
// most recent year. Teal (#2DD4BF) for ARC-CO, gold (#C9A84C) for PLC.
//
// Design: Center label shows dominant percentage + program name.
// startAngle=90 endAngle=-270 sweeps clockwise from 12 o'clock.
// paddingAngle=3 creates visible gap between segments on dark bg.
// =============================================================================

'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';

const COLORS = {
  arcCo: '#2DD4BF',
  plc: '#C9A84C',
};

// ─── Center Label ────────────────────────────────────────────────────────────

interface CenterLabelProps {
  viewBox?: { cx?: number; cy?: number };
  pct: string;
  label: string;
  color: string;
}

function CenterLabel({ viewBox, pct, label, color }: CenterLabelProps) {
  const { cx = 0, cy = 0 } = viewBox ?? {};
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="32" fontWeight="800" fontFamily="var(--font-bricolage, sans-serif)">
        {pct}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.4)" fontSize="13" fontWeight="600">
        {label}
      </text>
    </g>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  payload: { color: string; acres: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-xl"
      style={{ background: '#0C1F17', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(8px)', minWidth: '160px' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ background: d.payload.color }} />
        <span className="text-[14px] font-semibold text-white/80">{d.name}</span>
      </div>
      <div className="text-[20px] font-extrabold tabular-nums" style={{ color: d.payload.color }}>
        {d.value.toFixed(1)}%
      </div>
      <div className="text-[11px] text-white/30 mt-1">
        {d.payload.acres.toLocaleString()} base acres
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ElectionDonutChartProps {
  arccoPct: number;
  plcPct: number;
  arccoAcres: number;
  plcAcres: number;
}

export default function ElectionDonutChart({ arccoPct, plcPct, arccoAcres, plcAcres }: ElectionDonutChartProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  const data = useMemo(() => [
    { name: 'ARC-CO', value: arccoPct, color: COLORS.arcCo, acres: arccoAcres },
    { name: 'PLC', value: plcPct, color: COLORS.plc, acres: plcAcres },
  ], [arccoPct, plcPct, arccoAcres, plcAcres]);

  const dominant = arccoPct >= plcPct ? data[0] : data[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="82%"
          startAngle={90}
          endAngle={-270}
          paddingAngle={3}
          strokeWidth={0}
          animationBegin={0}
          animationDuration={reduceMotion ? 0 : 1200}
          animationEasing="ease-out"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          <Label
            content={
              <CenterLabel
                pct={`${dominant.value.toFixed(1)}%`}
                label={dominant.name}
                color={dominant.color}
              />
            }
            position="center"
          />
        </Pie>
        <Tooltip content={<DonutTooltip />} wrapperStyle={{ outline: 'none' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
