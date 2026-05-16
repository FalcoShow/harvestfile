// =============================================================================
// app/(marketing)/morning/_components/SoilConditions.tsx
// HarvestFile — Surface 2 Deploy 2B-P2: Soil Intelligence Card
//
// DEPLOY 2B-P2 ENHANCEMENTS:
//   - 3-day soil temperature trend chart using Recharts LineChart
//   - Corn (50°F) and soybean (55°F) planting threshold ReferenceLine
//   - Trend arrows (warming/cooling) next to each depth reading
//   - Accepts 7-day soil[] array from weather API
//
// Shows soil temperature at 2" and 6" depth with planting-readiness
// color coding, plus soil moisture levels. The 50°F threshold line
// for corn/soybean planting is THE critical indicator in spring.
// =============================================================================

'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SoilDataPoint {
  date?: string;
  soil_temp_2in_f?: number;
  soil_temp_6in_f?: number;
  temp_2in_f?: number;
  temp_6in_f?: number;
  soil_moisture_0_4in?: number;
  soil_moisture_4_16in?: number;
  moisture_pct?: number;
}

interface SoilConditionsProps {
  soil: SoilDataPoint | SoilDataPoint[];
}

// Normalize soil data from either naming convention
function normalizeSoilPoint(item: any): { temp2: number; temp6: number; moist0: number; moist4: number } | null {
  if (!item) return null;
  return {
    temp2: item.soil_temp_2in_f ?? item.temp_2in_f ?? 0,
    temp6: item.soil_temp_6in_f ?? item.temp_6in_f ?? 0,
    moist0: item.soil_moisture_0_4in ?? item.moisture_pct ?? 0,
    moist4: item.soil_moisture_4_16in ?? item.moisture_pct ?? 0,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tempStatus(f: number): { color: string; label: string; bg: string; border: string } {
  if (f >= 55) return { color: 'text-emerald-300', label: 'Ideal', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/15' };
  if (f >= 50) return { color: 'text-emerald-400', label: 'Plantable', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/10' };
  if (f >= 40) return { color: 'text-amber-400', label: 'Warming', bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/10' };
  return { color: 'text-blue-400', label: 'Cold', bg: 'bg-blue-500/[0.06]', border: 'border-blue-500/10' };
}

function moistureStatus(val: number): { color: string; label: string; pct: number } {
  const pct = Math.round(val * 100);
  if (val > 0.4) return { color: 'text-blue-400', label: 'Saturated', pct };
  if (val > 0.25) return { color: 'text-emerald-400', label: 'Good', pct };
  if (val > 0.15) return { color: 'text-amber-400', label: 'Drying', pct };
  return { color: 'text-red-400', label: 'Dry', pct };
}

function getTrendArrow(current: number, previous: number): { icon: string; color: string; label: string } {
  const diff = current - previous;
  if (diff > 2) return { icon: '↑', color: 'text-emerald-400', label: 'Warming' };
  if (diff > 0.5) return { icon: '↗', color: 'text-emerald-400/70', label: 'Warming' };
  if (diff < -2) return { icon: '↓', color: 'text-blue-400', label: 'Cooling' };
  if (diff < -0.5) return { icon: '↘', color: 'text-blue-400/70', label: 'Cooling' };
  return { icon: '→', color: 'text-white/30', label: 'Steady' };
}

// ─── Chart Tooltip ───────────────────────────────────────────────────────────

function SoilChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#0C1F17] border border-white/[0.1] px-2.5 py-1.5 shadow-lg">
      <p className="text-[10px] text-white/40 mb-0.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[11px] font-semibold tabular-nums" style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(1)}°F
        </p>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SoilConditions({ soil }: SoilConditionsProps) {
  // Normalize: always work with an array
  const soilArray = useMemo(() => {
    if (!soil) return [];
    return Array.isArray(soil) ? soil : [soil];
  }, [soil]);

  const data = useMemo(() => normalizeSoilPoint(soilArray[0]), [soilArray]);
  if (!data) return null;

  // Get yesterday's data for trend arrows
  const yesterdayData = useMemo(() => normalizeSoilPoint(soilArray[1]), [soilArray]);

  // Build chart data from first 3 days
  const chartData = useMemo(() => {
    return soilArray.slice(0, 3).map((item: any) => {
      const normalized = normalizeSoilPoint(item);
      if (!normalized) return null;
      const date = item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : '';
      return {
        day: date,
        '2" depth': normalized.temp2,
        '6" depth': normalized.temp6,
      };
    }).filter(Boolean);
  }, [soilArray]);

  const temp2 = tempStatus(data.temp2);
  const temp6 = tempStatus(data.temp6);
  const moist0 = moistureStatus(data.moist0);
  const moist4 = moistureStatus(data.moist4);

  // Trend arrows (compare today vs tomorrow forecast — tomorrow is index 1)
  const trend2 = yesterdayData ? getTrendArrow(data.temp2, yesterdayData.temp2) : null;
  const trend6 = yesterdayData ? getTrendArrow(data.temp6, yesterdayData.temp6) : null;

  // Chart domain: find min/max across all data points
  const allTemps = chartData.flatMap((d: any) => [d['2" depth'], d['6" depth']]);
  const chartMin = Math.floor(Math.min(...allTemps, 32) / 5) * 5;
  const chartMax = Math.ceil(Math.max(...allTemps, 60) / 5) * 5;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
        </svg>
        <h2 className="text-sm font-semibold text-white/90 tracking-tight">Soil Conditions</h2>
      </div>

      {/* Temperature Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 2-inch depth */}
        <div className={`rounded-xl ${temp2.bg} border ${temp2.border} p-3`}>
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">2&quot; Depth</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tabular-nums ${temp2.color}`}>
              {data.temp2.toFixed(1)}
            </span>
            <span className="text-xs text-white/25">°F</span>
            {trend2 && (
              <span className={`text-sm font-bold ml-1 ${trend2.color}`} title={trend2.label}>
                {trend2.icon}
              </span>
            )}
          </div>
          <div className={`text-[10px] font-semibold mt-1 ${temp2.color}`}>{temp2.label}</div>
          {/* 50°F threshold indicator */}
          <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (data.temp2 / 65) * 100)}%`,
                background: data.temp2 >= 50
                  ? 'linear-gradient(90deg, #34D399, #22C55E)'
                  : data.temp2 >= 40
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                  : 'linear-gradient(90deg, #60A5FA, #3B82F6)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/15">32°</span>
            <span className="text-[9px] text-white/25 font-semibold">50° plant</span>
            <span className="text-[9px] text-white/15">65°</span>
          </div>
        </div>

        {/* 6-inch depth */}
        <div className={`rounded-xl ${temp6.bg} border ${temp6.border} p-3`}>
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">6&quot; Depth</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tabular-nums ${temp6.color}`}>
              {data.temp6.toFixed(1)}
            </span>
            <span className="text-xs text-white/25">°F</span>
            {trend6 && (
              <span className={`text-sm font-bold ml-1 ${trend6.color}`} title={trend6.label}>
                {trend6.icon}
              </span>
            )}
          </div>
          <div className={`text-[10px] font-semibold mt-1 ${temp6.color}`}>{temp6.label}</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (data.temp6 / 65) * 100)}%`,
                background: data.temp6 >= 50
                  ? 'linear-gradient(90deg, #34D399, #22C55E)'
                  : data.temp6 >= 40
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                  : 'linear-gradient(90deg, #60A5FA, #3B82F6)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/15">32°</span>
            <span className="text-[9px] text-white/25 font-semibold">50° plant</span>
            <span className="text-[9px] text-white/15">65°</span>
          </div>
        </div>
      </div>

      {/* 3-Day Soil Temperature Trend Chart */}
      {chartData.length >= 2 && (
        <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
          <div className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-2">3-Day Soil Temp Trend</div>
          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[chartMin, chartMax]}
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<SoilChartTooltip />} />
                {/* Corn planting threshold at 50°F */}
                <ReferenceLine
                  y={50}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: '50° Corn', fill: 'rgba(245,158,11,0.5)', fontSize: 8, position: 'right' }}
                />
                {/* Soybean threshold at 55°F */}
                <ReferenceLine
                  y={55}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: '55° Soy', fill: 'rgba(5,150,105,0.5)', fontSize: 8, position: 'right' }}
                />
                <Line
                  type="monotone"
                  dataKey='2" depth'
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F59E0B', stroke: 'rgba(245,158,11,0.3)', strokeWidth: 3 }}
                  activeDot={{ r: 4, fill: '#F59E0B' }}
                />
                <Line
                  type="monotone"
                  dataKey='6" depth'
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6', stroke: 'rgba(59,130,246,0.3)', strokeWidth: 3 }}
                  activeDot={{ r: 4, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Chart legend */}
          <div className="flex items-center gap-4 mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-[#F59E0B]" />
              <span className="text-[9px] text-white/25">2&quot; depth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[9px] text-white/25">6&quot; depth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full border-t border-dashed border-[#F59E0B]/50" />
              <span className="text-[9px] text-white/20">Corn 50°</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full border-t border-dashed border-[#059669]/50" />
              <span className="text-[9px] text-white/20">Soy 55°</span>
            </div>
          </div>
        </div>
      )}

      {/* Moisture */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-500/[0.04] border border-blue-500/10 p-3">
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Moisture 0–4&quot;</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold tabular-nums ${moist0.color}`}>{moist0.pct}%</span>
            <span className={`text-[10px] font-semibold ${moist0.color}`}>{moist0.label}</span>
          </div>
        </div>
        <div className="rounded-xl bg-blue-500/[0.04] border border-blue-500/10 p-3">
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Moisture 4–16&quot;</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold tabular-nums ${moist4.color}`}>{moist4.pct}%</span>
            <span className={`text-[10px] font-semibold ${moist4.color}`}>{moist4.label}</span>
          </div>
        </div>
      </div>

      {/* Context note */}
      <p className="text-[10px] text-white/15 mt-3">
        Corn/soybeans: 50°F+ at 2&quot; depth for 3 consecutive days. Wheat: 40°F+.
      </p>
    </div>
  );
}
