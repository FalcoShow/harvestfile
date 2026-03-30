// =============================================================================
// app/(marketing)/morning/_components/SparklineChart.tsx
// HarvestFile — Build 17 Deploy 3: Dark Theme Sparklines
//
// Lazy-loaded Recharts sparkline for Markets Card (dark theme).
// Isolated into its own file so Recharts (~80KB) is lazy-loaded via
// React.lazy() in MorningDashboardClient.
//
// Dark theme adjustments:
//   - Higher opacity gradient fills (0.25 → 0 instead of 0.15 → 0)
//   - Brighter reference line color for dark backgrounds
//   - 2px stroke width (thin strokes disappear on dark surfaces)
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
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="settle"
          stroke={color}
          strokeWidth={2}
          fill={`url(#morn-${code})`}
          isAnimationActive={false}
          dot={false}
        />
        <ReferenceLine y={refPrice} stroke="#F87171" strokeDasharray="2 2" strokeWidth={1} strokeOpacity={0.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
