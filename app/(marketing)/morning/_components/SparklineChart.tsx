// =============================================================================
// app/(marketing)/morning/_components/SparklineChart.tsx
// HarvestFile — Lazy-loaded Recharts sparkline for Markets Card
//
// Isolated into its own file so Recharts (~80KB) is lazy-loaded via
// React.lazy() in MorningDashboardClient. This keeps the initial
// page bundle lean for farmers on rural LTE connections.
// =============================================================================

'use client';

import { AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts';

interface SparklineChartProps {
  data: Array<{ date: string; settle: number | null }>;
  color: string;
  refPrice: number;
  code: string;
}

export default function SparklineChart({ data, color, refPrice, code }: SparklineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`morn-${code}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="settle"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#morn-${code})`}
          isAnimationActive={false}
          dot={false}
        />
        <ReferenceLine y={refPrice} stroke="#EF4444" strokeDasharray="2 2" strokeWidth={0.8} strokeOpacity={0.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
