// =============================================================================
// HarvestFile - Commodity Price Dashboard (Phase 3C)
// Real-time price charts with Recharts, auto-refresh, reference price lines
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
  BarChart, Bar, Legend,
} from 'recharts';

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  dark: '#0C1F17', forest: '#1B4332', sage: '#40624D', muted: '#6B8F71',
  gold: '#C9A84C', goldBright: '#E2C366', goldDim: '#9E7E30',
  cream: '#FAFAF6', warm: '#F4F3ED', white: '#FFFFFF',
  text: '#111827', textSoft: '#6B7280', textMuted: '#9CA3AF',
  emerald: '#059669', emeraldLight: '#34D399', emeraldBg: '#ECFDF5',
  red: '#EF4444', redBg: '#FEF2F2',
};

const CROP_COLORS: Record<string, string> = {
  CORN: '#F59E0B',
  SOYBEANS: '#059669',
  WHEAT: '#D97706',
  SORGHUM: '#8B5CF6',
  BARLEY: '#3B82F6',
  OATS: '#6B7280',
};

const CROP_EMOJI: Record<string, string> = {
  CORN: '🌽', SOYBEANS: '🫘', WHEAT: '🌾', SORGHUM: '🌿', BARLEY: '🪴', OATS: '🌱',
};

interface PriceData {
  commodity: string;
  prices: { year: number; price: number }[];
  latestPrice: number | null;
  previousPrice: number | null;
  changePercent: number | null;
  referencePrice: number;
  unit: string;
  aboveRef: boolean | null;
  state: string;
}

interface PriceDashboardProps {
  state?: string;
  commodities?: string[];
  compact?: boolean;
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.dark, borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: p.color }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>${p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Price Card ──────────────────────────────────────────────────────────────
function PriceCard({ data, isSelected, onClick }: {
  data: PriceData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isUp = data.changePercent !== null && data.changePercent > 0;
  const isBelow = data.latestPrice !== null && data.latestPrice < data.referencePrice;

  return (
    <button onClick={onClick} style={{
      background: isSelected ? 'rgba(5,150,105,0.08)' : 'rgba(255,255,255,0.02)',
      border: isSelected ? '1.5px solid rgba(5,150,105,0.3)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '16px 20px', cursor: 'pointer',
      transition: 'all 0.2s ease', width: '100%', textAlign: 'left',
      ...(isSelected ? { boxShadow: '0 0 20px rgba(5,150,105,0.1)' } : {}),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{CROP_EMOJI[data.commodity] || '🌾'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            {data.commodity.charAt(0) + data.commodity.slice(1).toLowerCase()}
          </span>
        </div>
        {data.changePercent !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
            background: isUp ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)',
            color: isUp ? C.emeraldLight : C.red,
          }}>
            {isUp ? '↑' : '↓'} {Math.abs(data.changePercent).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 4 }}>
        {data.latestPrice !== null ? `$${data.latestPrice.toFixed(2)}` : '—'}
        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>
          {data.unit}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 6, height: 6, borderRadius: 3,
          background: isBelow ? C.red : C.emeraldLight,
          boxShadow: `0 0 6px ${isBelow ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.4)'}`,
        }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          Ref: ${data.referencePrice.toFixed(2)} · {isBelow ? 'Below' : 'Above'} ref
        </span>
      </div>

      {/* Mini sparkline */}
      {data.prices.length > 2 && (
        <div style={{ marginTop: 10, height: 32 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.prices}>
              <defs>
                <linearGradient id={`spark-${data.commodity}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CROP_COLORS[data.commodity] || C.emerald} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CROP_COLORS[data.commodity] || C.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone" dataKey="price"
                stroke={CROP_COLORS[data.commodity] || C.emerald}
                fill={`url(#spark-${data.commodity})`}
                strokeWidth={1.5} dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PriceDashboard({
  state = 'OH',
  commodities = ['CORN', 'SOYBEANS', 'WHEAT'],
  compact = false,
}: PriceDashboardProps) {
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [selectedCrop, setSelectedCrop] = useState<string>(commodities[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`/api/prices?state=${state}&commodities=${commodities.join(',')}`);
      const json = await res.json();
      if (json.success) {
        setPriceData(json.data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } else {
        setError(json.error || 'Failed to load prices');
      }
    } catch (err) {
      setError('Network error loading prices');
    } finally {
      setLoading(false);
    }
  }, [state, commodities]);

  useEffect(() => {
    fetchPrices();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const selected = priceData[selectedCrop];

  // Build comparison chart data (all commodities overlaid)
  const comparisonData = React.useMemo(() => {
    if (Object.keys(priceData).length === 0) return [];
    const years = new Set<number>();
    Object.values(priceData).forEach(d => d.prices.forEach(p => years.add(p.year)));
    return [...years].sort().map(year => {
      const point: any = { year };
      Object.entries(priceData).forEach(([commodity, data]) => {
        const match = data.prices.find(p => p.year === year);
        if (match) point[commodity] = match.price;
      });
      return point;
    });
  }, [priceData]);

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.06)', padding: 40,
        textAlign: 'center',
      }}>
        <div style={{
          width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)',
          borderTopColor: C.emerald, borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Loading commodity prices...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.06)', borderRadius: 16,
        border: '1px solid rgba(239,68,68,0.15)', padding: '20px 24px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 4 }}>Price data unavailable</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{error}</div>
        <button onClick={fetchPrices} style={{
          marginTop: 12, fontSize: 12, fontWeight: 600, color: C.emerald,
          background: 'none', border: 'none', cursor: 'pointer',
        }}>
          Retry →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: C.emeraldLight,
              boxShadow: `0 0 8px rgba(52,211,153,0.5)`,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Live Market Data
            </span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
            Commodity Prices — {state}
          </h3>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, display: 'block' }}>
              Last updated: {lastUpdated} · Auto-refreshes every 5 min
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3 }}>
          {(['area', 'bar'] as const).map(type => (
            <button key={type} onClick={() => setChartType(type)} style={{
              fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: chartType === type ? 'rgba(5,150,105,0.15)' : 'transparent',
              color: chartType === type ? C.emeraldLight : 'rgba(255,255,255,0.3)',
            }}>
              {type === 'area' ? '📈 Trend' : '📊 Compare'}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {/* ─── Price Cards ────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr 1fr' : `repeat(${Math.min(commodities.length, 3)}, 1fr)`,
        gap: 12, marginBottom: 20,
      }}>
        {commodities.map(commodity => {
          const data = priceData[commodity];
          if (!data) return null;
          return (
            <PriceCard
              key={commodity}
              data={data}
              isSelected={selectedCrop === commodity}
              onClick={() => setSelectedCrop(commodity)}
            />
          );
        })}
      </div>

      {/* ─── Main Chart ─────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.06)', padding: '24px 20px 16px',
      }}>
        <div style={{ height: compact ? 200 : 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' && selected ? (
              <AreaChart data={selected.prices}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CROP_COLORS[selectedCrop] || C.emerald} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CROP_COLORS[selectedCrop] || C.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={selected.referencePrice}
                  stroke={C.gold}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Ref: $${selected.referencePrice.toFixed(2)}`,
                    position: 'right',
                    fill: C.gold,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone" dataKey="price"
                  name={selectedCrop.charAt(0) + selectedCrop.slice(1).toLowerCase()}
                  stroke={CROP_COLORS[selectedCrop] || C.emerald}
                  fill="url(#priceGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: CROP_COLORS[selectedCrop] || C.emerald, r: 4, strokeWidth: 2, stroke: C.dark }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
                  formatter={(value: string) => (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      {CROP_EMOJI[value] || ''} {value.charAt(0) + value.slice(1).toLowerCase()}
                    </span>
                  )}
                />
                {commodities.map(commodity => (
                  <Bar
                    key={commodity}
                    dataKey={commodity}
                    name={commodity}
                    fill={CROP_COLORS[commodity] || C.emerald}
                    radius={[4, 4, 0, 0]}
                    opacity={0.85}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart footer */}
        {selected && chartType === 'area' && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              Source: USDA NASS · State-level {state} prices received
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 16, height: 2, background: C.gold, borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: C.gold }}>OBBBA Reference</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: CROP_COLORS[selectedCrop] || C.emerald }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Market Price</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
