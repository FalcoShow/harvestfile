// =============================================================================
// app/(marketing)/morning/_components/CommodityDetailCard.tsx
// HarvestFile — Surface 2 Deploy 3B: Commodity Detail Cards with TradingView
//
// Expandable commodity card that collapses to a compact price display and
// expands to reveal a full TradingView Lightweight Charts v4.2.3 area chart
// with USDA Effective Reference Price and Loan Rate overlay lines.
//
// Architecture:
//   - Collapsed: crop icon, price, change %, PLC status dot, Recharts sparkline
//   - Expanded: TradingView area chart, time period selector, USDA price lines
//   - Chart is CREATED on expand, DESTROYED on collapse (zero memory when hidden)
//   - Only ONE card expanded at a time (controlled by parent via expandedCode prop)
//
// TradingView v4.2.3 specifics:
//   - chart.addAreaSeries() — NOT the v5 chart.addSeries(AreaSeries) syntax
//   - createPriceLine() for USDA reference price + loan rate overlays
//   - autoSize: true for responsive container (no manual ResizeObserver)
//   - handleScroll.vertTouchDrag: false — allows page scrolling over chart
//   - attributionLogo: false — we add footer attribution link instead
//
// Mobile safety:
//   - Chart is passive by default (page scrolls over it)
//   - 48px min touch targets on all interactive elements
//   - Time period pills are 44px tall with generous hit areas
//   - Grid-template-rows animation for smooth expand/collapse
// =============================================================================

'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { PricePoint } from '@/lib/hooks/morning/use-market-prices';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommodityConfig {
  code: string;
  name: string;
  unit: string;
  unitLabel: string;
  effectiveRefPrice: number;
  loanRate: number;
  color: string;
  nationalAvgYield: number;
}

interface CommodityDetailCardProps {
  code: string;
  config: CommodityConfig;
  data: {
    latestSettle: number | null;
    previousSettle: number | null;
    change: number | null;
    changePct: number | null;
    prices: PricePoint[];
    count: number;
  } | null;
  flash: 'up' | 'down' | null;
  isExpanded: boolean;
  onToggle: (code: string) => void;
}

type TimePeriod = '1W' | '1M' | '3M' | '6M' | '1Y';

// ─── USDA Reference Prices ──────────────────────────────────────────────────

const USDA_PRICES: Record<string, { refPrice: number; loanRate: number; unit: string }> = {
  CORN: { refPrice: 4.42, loanRate: 2.20, unit: '/bu' },
  SOYBEANS: { refPrice: 10.71, loanRate: 6.20, unit: '/bu' },
  WHEAT: { refPrice: 6.35, loanRate: 3.38, unit: '/bu' },
  OATS: { refPrice: 3.09, loanRate: 1.79, unit: '/bu' },
  RICE: { refPrice: 16.40, loanRate: 7.00, unit: '/cwt' },
  COTTON: { refPrice: 0.52, loanRate: 0.52, unit: '/lb' },
};

// ─── Commodity Theme Colors ──────────────────────────────────────────────────

const CHART_THEMES: Record<string, {
  topColor: string; bottomColor: string; lineColor: string; crosshairBg: string;
}> = {
  CORN: {
    topColor: 'rgba(245, 158, 11, 0.35)',
    bottomColor: 'rgba(245, 158, 11, 0)',
    lineColor: 'rgb(245, 158, 11)',
    crosshairBg: '#F59E0B',
  },
  SOYBEANS: {
    topColor: 'rgba(5, 150, 105, 0.35)',
    bottomColor: 'rgba(5, 150, 105, 0)',
    lineColor: 'rgb(5, 150, 105)',
    crosshairBg: '#059669',
  },
  WHEAT: {
    topColor: 'rgba(217, 119, 6, 0.35)',
    bottomColor: 'rgba(217, 119, 6, 0)',
    lineColor: 'rgb(217, 119, 6)',
    crosshairBg: '#D97706',
  },
  OATS: {
    topColor: 'rgba(139, 92, 246, 0.35)',
    bottomColor: 'rgba(139, 92, 246, 0)',
    lineColor: 'rgb(139, 92, 246)',
    crosshairBg: '#8B5CF6',
  },
  RICE: {
    topColor: 'rgba(6, 182, 212, 0.35)',
    bottomColor: 'rgba(6, 182, 212, 0)',
    lineColor: 'rgb(6, 182, 212)',
    crosshairBg: '#06B6D4',
  },
  COTTON: {
    topColor: 'rgba(236, 72, 153, 0.35)',
    bottomColor: 'rgba(236, 72, 153, 0)',
    lineColor: 'rgb(236, 72, 153)',
    crosshairBg: '#EC4899',
  },
};

// ─── Crop Icons (SVG, no emoji) ──────────────────────────────────────────────

function CropIcon({ code, size = 20 }: { code: string; size?: number }) {
  const color = CHART_THEMES[code]?.lineColor || '#6B7280';
  if (code === 'CORN') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" /><path d="M8 6c0 0 4 2 4 6s-4 6-4 6" /><path d="M16 6c0 0-4 2-4 6s4 6 4 6" />
    </svg>
  );
  if (code === 'SOYBEANS') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" /><path d="M12 8v-4" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v10" /><path d="M8 6l4-4 4 4" /><path d="M4 22c0-4 4-8 8-10" /><path d="M20 22c0-4-4-8-8-10" />
    </svg>
  );
}

// ─── Time Period Filter ──────────────────────────────────────────────────────

function filterByPeriod(data: { time: string; value: number }[], period: TimePeriod): { time: string; value: number }[] {
  const now = new Date();
  const cutoff = new Date(now);
  switch (period) {
    case '1W': cutoff.setDate(now.getDate() - 7); break;
    case '1M': cutoff.setMonth(now.getMonth() - 1); break;
    case '3M': cutoff.setMonth(now.getMonth() - 3); break;
    case '6M': cutoff.setMonth(now.getMonth() - 6); break;
    case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
  }
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return data.filter(d => d.time >= cutoffStr);
}

// ─── Mini Sparkline (collapsed state) ────────────────────────────────────────

function MiniSparkline({ prices, color }: { prices: PricePoint[]; color: string }) {
  const points = useMemo(() => {
    if (!prices || prices.length < 2) return '';
    // Take last 14 days for sparkline
    const recent = prices.slice(-14);
    const min = Math.min(...recent.map(p => p.settle));
    const max = Math.max(...recent.map(p => p.settle));
    const range = max - min || 1;
    const width = 64;
    const height = 28;
    const padding = 2;

    return recent.map((p, i) => {
      const x = padding + (i / (recent.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (p.settle - min) / range) * (height - padding * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [prices]);

  if (!points) return null;

  return (
    <svg width="64" height="28" viewBox="0 0 64 28" className="flex-shrink-0 opacity-60">
      <path d={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── PLC Calculation ─────────────────────────────────────────────────────────

function calcPLCStatus(price: number, refPrice: number): 'above' | 'near' | 'below' {
  if (price >= refPrice) return 'above';
  if (price >= refPrice * 0.95) return 'near';
  return 'below';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADINGVIEW CHART COMPONENT
// Created on expand, destroyed on collapse. Zero memory when hidden.
// ═══════════════════════════════════════════════════════════════════════════════

function TradingViewChart({
  prices,
  code,
  period,
}: {
  prices: PricePoint[];
  code: string;
  period: TimePeriod;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  // Convert PricePoint[] to TradingView format
  const chartData = useMemo(() => {
    return prices
      .map(p => ({ time: p.date.substring(0, 10), value: p.settle }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [prices]);

  // Filter by selected period
  const filteredData = useMemo(() => filterByPeriod(chartData, period), [chartData, period]);

  // Update data when period changes (without recreating chart)
  useEffect(() => {
    if (seriesRef.current && chartRef.current && filteredData.length > 0) {
      seriesRef.current.setData(filteredData);
      chartRef.current.timeScale().fitContent();
    }
  }, [filteredData]);

  // Create chart on mount, destroy on unmount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        createChart,
        ColorType,
        LineStyle,
        CrosshairMode,
      } = await import('lightweight-charts');

      if (!isMounted || !containerRef.current) return;

      // Guard against React Strict Mode double-mount
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const theme = CHART_THEMES[code] || CHART_THEMES.CORN;
      const usda = USDA_PRICES[code];

      const chart = createChart(containerRef.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255,255,255,0.4)',
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: {
          mode: CrosshairMode.Magnet,
          horzLine: {
            style: LineStyle.Dashed,
            color: 'rgba(255,255,255,0.15)',
            labelBackgroundColor: theme.crosshairBg,
          },
          vertLine: {
            style: LineStyle.Dashed,
            color: 'rgba(255,255,255,0.15)',
            labelBackgroundColor: '#374151',
          },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.05 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        // CRITICAL: Allow page scrolling over the chart on mobile
        handleScroll: { vertTouchDrag: false },
        handleScale: { pinch: true, mouseWheel: true },
        kineticScroll: { touch: true, mouse: false },
      });

      const areaSeries = chart.addAreaSeries({
        topColor: theme.topColor,
        bottomColor: theme.bottomColor,
        lineColor: theme.lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: theme.lineColor,
        crosshairMarkerBackgroundColor: '#0C1F17',
        crosshairMarkerBorderWidth: 2,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      // Set initial data
      if (filteredData.length > 0) {
        areaSeries.setData(filteredData);
      }

      // ── USDA Reference Price Line (green dashed) ───────────────────
      if (usda) {
        areaSeries.createPriceLine({
          price: usda.refPrice,
          color: '#16a34a',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `ERP $${usda.refPrice.toFixed(2)}`,
        });

        // ── Loan Rate Line (red dotted) ───────────────────────────────
        areaSeries.createPriceLine({
          price: usda.loanRate,
          color: '#dc2626',
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          axisLabelVisible: true,
          title: `Loan $${usda.loanRate.toFixed(2)}`,
        });
      }

      chart.timeScale().fitContent();
      chartRef.current = chart;
      seriesRef.current = areaSeries;
    }

    init();

    return () => {
      isMounted = false;
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [code]); // Only recreate if commodity changes, NOT on period change

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: 'clamp(200px, 40vw, 320px)' }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CommodityDetailCard({
  code,
  config,
  data,
  flash,
  isExpanded,
  onToggle,
}: CommodityDetailCardProps) {
  const [period, setPeriod] = useState<TimePeriod>('3M');

  const price = data?.latestSettle ?? null;
  const change = data?.change ?? 0;
  const changePct = data?.changePct ?? 0;
  const isUp = change >= 0;
  const plcStatus = price ? calcPLCStatus(price, config.effectiveRefPrice) : null;

  // Loading skeleton
  if (!data || price === null) {
    return (
      <div className="rounded-2xl bg-[#0f2518] border border-white/[0.08] p-4 sm:p-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/[0.06]" />
            <div className="w-16 h-3 rounded bg-white/[0.06]" />
          </div>
          <div className="w-20 h-7 rounded bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  const periods: TimePeriod[] = ['1W', '1M', '3M', '6M', '1Y'];

  return (
    <div
      className={`rounded-2xl bg-[#0f2518] border transition-all duration-200 ${
        isExpanded
          ? 'border-white/[0.12] shadow-lg shadow-black/20'
          : 'border-white/[0.08] hover:border-white/[0.12]'
      } ${
        flash === 'up' ? 'hf-flash-up' : flash === 'down' ? 'hf-flash-down' : ''
      }`}
    >
      {/* ── COLLAPSED HEADER (always visible) ────────────────────────── */}
      <button
        onClick={() => onToggle(code)}
        className="w-full text-left p-4 sm:p-5 flex items-center gap-3 min-h-[64px] cursor-pointer"
        aria-expanded={isExpanded}
        aria-controls={`chart-${code}`}
      >
        {/* Crop icon */}
        <div className="flex-shrink-0">
          <CropIcon code={code} size={20} />
        </div>

        {/* Name + contract info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/80 tracking-tight">{config.name}</span>
            {plcStatus && (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                plcStatus === 'above' ? 'bg-emerald-400' :
                plcStatus === 'near' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
            )}
          </div>
          <span className="text-[10px] text-white/25 tabular-nums">
            vs ${config.effectiveRefPrice.toFixed(2)} ERP
          </span>
        </div>

        {/* Sparkline */}
        {data.prices && data.prices.length > 2 && (
          <MiniSparkline prices={data.prices} color={config.color} />
        )}

        {/* Price + Change */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xl sm:text-2xl font-bold text-[#E8ECE9] tabular-nums tracking-tight">
            ${price.toFixed(2)}
          </div>
          <div className={`text-xs font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePct.toFixed(1)}%
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── EXPANDED CONTENT (chart + controls) ──────────────────────── */}
      <div
        id={`chart-${code}`}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {isExpanded && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              {/* Time period selector */}
              <div className="flex items-center gap-1.5 mb-3">
                {periods.map(p => (
                  <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); setPeriod(p); }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                      period === p
                        ? 'bg-white/[0.12] text-white'
                        : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {/* Price context */}
                <div className="ml-auto flex items-center gap-3 text-[10px] text-white/20">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-emerald-600 rounded" style={{ borderTop: '1px dashed #16a34a' }} />
                    ERP
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0 rounded" style={{ borderTop: '1px dotted #dc2626' }} />
                    Loan
                  </span>
                </div>
              </div>

              {/* TradingView Chart */}
              <div className="rounded-xl bg-black/20 border border-white/[0.04] overflow-hidden">
                <TradingViewChart
                  prices={data.prices}
                  code={code}
                  period={period}
                />
              </div>

              {/* Price context row */}
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-4 text-[11px]">
                  <div>
                    <span className="text-white/25">High </span>
                    <span className="text-white/60 font-semibold tabular-nums">
                      ${Math.max(...(data.prices || []).map(p => p.settle)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/25">Low </span>
                    <span className="text-white/60 font-semibold tabular-nums">
                      ${Math.min(...(data.prices || []).map(p => p.settle)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/25">Avg </span>
                    <span className="text-white/60 font-semibold tabular-nums">
                      ${((data.prices || []).reduce((s, p) => s + p.settle, 0) / Math.max(1, (data.prices || []).length)).toFixed(2)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-white/15 tabular-nums">
                  {data.count} trading days
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
