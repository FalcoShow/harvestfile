// =============================================================================
// HarvestFile - Yield Trend Chart (Phase 3C)
// Embeddable Recharts component for intelligence reports
// Shows county yield history with Olympic average benchmark line
// =============================================================================

'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Bar, BarChart, ComposedChart,
  Line,
} from 'recharts';

const C = {
  dark: '#0C1F17', forest: '#1B4332', sage: '#40624D',
  gold: '#C9A84C', emerald: '#059669', emeraldLight: '#34D399',
  red: '#EF4444',
};

interface YieldData {
  year: number;
  value: number;
}

interface YieldTrendChartProps {
  data: YieldData[];
  benchmarkYield?: number;
  crop: string;
  county: string;
  state: string;
  unit?: string;
  height?: number;
  darkMode?: boolean;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.dark, borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>
        {label} Crop Year
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: p.color }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function YieldTrendChart({
  data,
  benchmarkYield,
  crop,
  county,
  state,
  unit = 'bu/ac',
  height = 220,
  darkMode = true,
}: YieldTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '24px 20px', borderRadius: 16, textAlign: 'center',
        background: darkMode ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <div style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>
          No yield data available for {county} County, {state}
        </div>
      </div>
    );
  }

  // Compute trend line (simple linear regression)
  const n = data.length;
  const sumX = data.reduce((s, d) => s + d.year, 0);
  const sumY = data.reduce((s, d) => s + d.value, 0);
  const sumXY = data.reduce((s, d) => s + d.year * d.value, 0);
  const sumX2 = data.reduce((s, d) => s + d.year * d.year, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const chartData = data.map(d => ({
    ...d,
    trend: Math.round((slope * d.year + intercept) * 10) / 10,
  }));

  const trendDirection = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat';
  const trendPercent = data.length >= 2
    ? Math.abs(Math.round((slope * (data[data.length - 1].year - data[0].year)) / data[0].value * 1000) / 10)
    : 0;

  return (
    <div style={{
      background: darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
      borderRadius: 16,
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      padding: '20px 16px 12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, padding: '0 4px' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? '#fff' : C.forest, letterSpacing: '-0.01em' }}>
            {crop} Yield History
          </div>
          <div style={{ fontSize: 11, color: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF', marginTop: 2 }}>
            {county} County, {state} · {data[0].year}–{data[data.length - 1].year}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 100,
          background: trendDirection === 'upward' ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: trendDirection === 'upward' ? C.emeraldLight : C.red }}>
            {trendDirection === 'upward' ? '↑' : '↓'} {trendPercent}% trend
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.emerald} stopOpacity={0.2} />
                <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
            <XAxis
              dataKey="year"
              tick={{ fill: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF', fontSize: 11 }}
              axisLine={false} tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<ChartTooltip />} />

            {/* Benchmark reference line */}
            {benchmarkYield && (
              <ReferenceLine
                y={benchmarkYield}
                stroke={C.gold}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `Benchmark: ${benchmarkYield} ${unit}`,
                  position: 'right',
                  fill: C.gold,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Yield bars */}
            <Bar
              dataKey="value"
              name={`Yield (${unit})`}
              fill={C.emerald}
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            />

            {/* Trend line */}
            <Line
              type="monotone"
              dataKey="trend"
              name="Trend"
              stroke={C.gold}
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer legend */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, paddingTop: 8,
        borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
      }}>
        <span style={{ fontSize: 10, color: darkMode ? 'rgba(255,255,255,0.2)' : '#9CA3AF' }}>
          Source: USDA NASS Quick Stats
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: C.emerald, opacity: 0.7 }} />
            <span style={{ fontSize: 10, color: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>Yield</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 2, background: C.gold, borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>Trend</span>
          </div>
          {benchmarkYield && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 0, borderTop: `2px dashed ${C.gold}` }} />
              <span style={{ fontSize: 10, color: C.gold }}>Benchmark</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-crop comparison chart
// ═══════════════════════════════════════════════════════════════════════════════
interface CropComparisonData {
  crop: string;
  yields: YieldData[];
  color: string;
}

export function MultiCropYieldChart({
  crops,
  county,
  state,
  height = 240,
  darkMode = true,
}: {
  crops: CropComparisonData[];
  county: string;
  state: string;
  height?: number;
  darkMode?: boolean;
}) {
  // Build unified dataset
  const years = new Set<number>();
  crops.forEach(c => c.yields.forEach(y => years.add(y.year)));
  const chartData = [...years].sort().map(year => {
    const point: any = { year };
    crops.forEach(c => {
      const match = c.yields.find(y => y.year === year);
      if (match) point[c.crop] = match.value;
    });
    return point;
  });

  return (
    <div style={{
      background: darkMode ? 'rgba(255,255,255,0.02)' : '#fff',
      borderRadius: 16,
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      padding: '20px 16px 12px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: darkMode ? '#fff' : C.forest, marginBottom: 4, padding: '0 4px' }}>
        Yield Comparison
      </div>
      <div style={{ fontSize: 11, color: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF', marginBottom: 16, padding: '0 4px' }}>
        {county} County, {state}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
            <XAxis
              dataKey="year"
              tick={{ fill: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            {crops.map(crop => (
              <Bar
                key={crop.crop}
                dataKey={crop.crop}
                name={crop.crop}
                fill={crop.color}
                radius={[3, 3, 0, 0]}
                opacity={0.8}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
