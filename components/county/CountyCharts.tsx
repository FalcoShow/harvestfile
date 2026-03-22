// =============================================================================
// HarvestFile — Phase 25 Build 1: County Charts (Client Component)
// Payment history bar chart + enrollment trend area chart
// Uses Recharts (already in project deps)
// =============================================================================

'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { CommodityGroup } from '@/lib/data/county-queries';
import type { HistoricalEnrollment } from '@/lib/data/historical-enrollment';

interface CountyChartsProps {
  cropData: CommodityGroup[];
  enrollment: HistoricalEnrollment[];
  countyName: string;
  stateAbbr: string;
}

export function CountyCharts({
  cropData,
  enrollment,
  countyName,
  stateAbbr,
}: CountyChartsProps) {
  const [selectedCrop, setSelectedCrop] = useState(
    cropData.length > 0 ? cropData[0].commodity_code : ''
  );

  const activeCrop = cropData.find((c) => c.commodity_code === selectedCrop);

  // ── Payment History Data ────────────────────────────────────────────
  const paymentData = activeCrop
    ? [...activeCrop.years]
        .sort((a, b) => a.crop_year - b.crop_year)
        .map((y) => ({
          year: y.crop_year,
          'ARC-CO': y.arc_payment_rate || 0,
          PLC: y.plc_payment_rate || 0,
        }))
    : [];

  // ── Enrollment Trend Data ──────────────────────────────────────────
  const cropEnrollment = enrollment.filter(
    (e) => e.commodity_code === selectedCrop
  );
  const enrollmentData = [...cropEnrollment]
    .sort((a, b) => a.program_year - b.program_year)
    .map((e) => ({
      year: e.program_year,
      'ARC-CO Acres': e.arcco_acres,
      'PLC Acres': e.plc_acres,
    }));

  // ── Custom Tooltip ─────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border border-gray-200 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 shadow-lg">
        <div className="text-[11px] font-bold text-gray-500 mb-1.5">
          {label}
        </div>
        {payload.map((entry: any, i: number) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 text-[12px]"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-800 tabular-nums">
              {entry.name.includes('Acres')
                ? `${Math.round(entry.value).toLocaleString()}`
                : `$${entry.value.toFixed(2)}/acre`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Crop Selector */}
      {cropData.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cropData.map((crop) => (
            <button
              key={crop.commodity_code}
              onClick={() => setSelectedCrop(crop.commodity_code)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                selectedCrop === crop.commodity_code
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {crop.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Payment History Chart */}
      {paymentData.length > 0 && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-[15px] font-bold text-[#1B4332] mb-1">
            {activeCrop?.display_name} Payment Rates — {countyName}, {stateAbbr}
          </h3>
          <p className="text-[11px] text-gray-400 mb-4">
            ARC-CO vs PLC payment rates per base acre by crop year
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={paymentData}
              margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="ARC-CO"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="PLC"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Enrollment Trend Chart */}
      {enrollmentData.length > 0 && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-[15px] font-bold text-[#1B4332] mb-1">
            {activeCrop?.display_name} Enrollment Trend — {countyName},{' '}
            {stateAbbr}
          </h3>
          <p className="text-[11px] text-gray-400 mb-4">
            Enrolled base acres by program, {enrollmentData[0]?.year}–
            {enrollmentData[enrollmentData.length - 1]?.year}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={enrollmentData}
              margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="ARC-CO Acres"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="PLC Acres"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
