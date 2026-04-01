// =============================================================================
// HarvestFile — Build 18 Deploy 4 Fix: Election Donut Chart
// app/(marketing)/check/components/elections/ElectionDonutChart.tsx
//
// Fixed: Center label uses HTML overlay instead of Recharts <Label> to
// prevent text truncation. The SVG Label position="center" was computing
// incorrect coordinates, causing "ARC-CO" to clip outside the viewBox.
//
// Teal (#2DD4BF) for ARC-CO, gold (#C9A84C) for PLC.
// startAngle=90 endAngle=-270 sweeps clockwise from 12 o'clock.
// =============================================================================

'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  arcCo: '#2DD4BF',
  plc: '#C9A84C',
};

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
    <div className="relative w-full h-full">
      {/* Recharts donut */}
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
          </Pie>
          <Tooltip content={<DonutTooltip />} wrapperStyle={{ outline: 'none' }} />
        </PieChart>
      </ResponsiveContainer>

      {/* HTML center label overlay — bulletproof positioning */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="text-[26px] sm:text-[32px] font-extrabold tabular-nums tracking-[-0.02em]"
          style={{ color: dominant.color, fontFamily: 'var(--font-bricolage, sans-serif)' }}
        >
          {dominant.value.toFixed(1)}%
        </span>
        <span className="text-[12px] sm:text-[13px] text-white/40 font-semibold mt-0.5">
          {dominant.name}
        </span>
      </div>
    </div>
  );
}
