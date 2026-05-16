// =============================================================================
// HarvestFile — Phase 15 Build 1: Markets Dashboard (Mobile-First Rewrite)
// app/(dashboard)/dashboard/markets/page.tsx
//
// "Truck Cab Dashboard" — answer the farmer's question in 10 seconds.
//
// BEFORE: 25+ screens of scrolling on iPhone with all cards expanded.
// AFTER: All 6 commodities visible in ~2 screens, tap to expand details.
//
// Key changes from Phase 14A:
//   1. Compact summary bar (1 horizontal row, not 3 tall cards)
//   2. Collapsed commodity rows by default (compact at-a-glance list)
//   3. Only ONE card expanded at a time
//   4. Monthly grid HIDDEN by default with "Show months" toggle
//   5. Plain-language payment verdicts ("Below reference — PLC payment likely")
//   6. Larger sparklines (100px height)
//   7. Year-over-year MYA comparison
//   8. 56px minimum touch targets per Apple HIG
//
// No competitor offers this: live MYA tracking with automatic ARC/PLC payment
// projections. Every university calculator requires manual price entry.
// =============================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, ReferenceLine,
  Tooltip,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthData {
  month: number;
  label: string;
  year: number;
  order: number;
  price: number | null;
  isActual: boolean;
  weight: number;
  weightedPrice: number;
  source: string;
}

interface MYAData {
  commodity: string;
  marketingYear: string;
  computedAt: string;
  months: MonthData[];
  monthsActual: number;
  monthsProjected: number;
  monthsRemaining: number;
  partialMYA: number | null;
  projectedMYA: number;
  confidence: 'low' | 'medium' | 'high';
  config: {
    code: string;
    name: string;
    emoji: string;
    unit: string;
    unitLabel: string;
    color: string;
    effectiveRefPrice: number;
    statutoryRefPrice: number;
    loanRate: number;
  };
  statutoryRefPrice: number;
  effectiveRefPrice: number;
  plcPaymentRate: number;
  plcPaymentPerAcre: number;
  myaVsRefPrice: number;
  myaVsRefPricePct: number;
  paymentLikelihood: 'none' | 'possible' | 'likely' | 'certain';
}

interface PriorYearData {
  mya: number;
  marketingYear: string;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0f0d',
  card: 'rgba(255,255,255,0.02)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardActive: 'rgba(5,150,105,0.06)',
  cardActiveBorder: 'rgba(5,150,105,0.2)',
  text: 'rgba(255,255,255,0.92)',
  textBright: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  textDim: 'rgba(255,255,255,0.25)',
  emerald: '#059669',
  emeraldLight: '#34d399',
  gold: '#C9A84C',
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
};

// ─── Status & Verdict Helpers ────────────────────────────────────────────────

function getStatusColor(pct: number): string {
  if (pct >= 100) return C.green;
  if (pct >= 95) return C.amber;
  return C.red;
}

function getPaymentVerdict(data: MYAData): {
  text: string;
  color: string;
  badgeLabel: string;
  badgeBg: string;
} {
  const diff = data.myaVsRefPrice;
  const absDiff = Math.abs(diff);
  const perAcre = data.plcPaymentPerAcre;

  if (diff >= 0) {
    return {
      text: 'Above reference price — no PLC payment expected',
      color: C.green,
      badgeLabel: 'No Payment',
      badgeBg: 'rgba(34,197,94,0.08)',
    };
  }
  if (absDiff < 0.10) {
    return {
      text: `Very close to reference — small PLC payment possible (~$${perAcre.toFixed(2)}/acre)`,
      color: C.amber,
      badgeLabel: 'Possible',
      badgeBg: 'rgba(245,158,11,0.08)',
    };
  }
  if (absDiff < 0.50) {
    return {
      text: `Below reference — PLC payment likely (~$${perAcre.toFixed(2)}/acre)`,
      color: C.amber,
      badgeLabel: 'Likely',
      badgeBg: 'rgba(245,158,11,0.1)',
    };
  }
  return {
    text: `Well below reference — significant PLC payment expected (~$${perAcre.toFixed(2)}/acre)`,
    color: C.red,
    badgeLabel: '$' + perAcre.toFixed(0) + '/acre',
    badgeBg: 'rgba(239,68,68,0.1)',
  };
}

function getConfidenceLabel(c: string): string {
  switch (c) {
    case 'high': return 'High';
    case 'medium': return 'Med';
    default: return 'Early';
  }
}

// ─── Sparkline Component ─────────────────────────────────────────────────────

const Sparkline = React.memo(function Sparkline({
  data,
  color,
  refPrice,
  height = 100,
}: {
  data: MonthData[];
  color: string;
  refPrice: number;
  height?: number;
}) {
  const chartData = data
    .filter((m) => m.price !== null)
    .map((m, i, arr) => ({
      name: m.label,
      price: m.price,
      isLast: i === arr.length - 1 && m.isActual,
    }));

  if (chartData.length < 2) return null;

  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine
          y={refPrice}
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <Tooltip
          contentStyle={{
            background: '#1a2520', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, fontSize: 12, color: '#fff', padding: '6px 10px',
          }}
          formatter={(val: number) => [`$${val.toFixed(2)}`, 'Price']}
          labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#0a0f0d', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ─── Mini Sparkline for collapsed row ────────────────────────────────────────

const MiniSpark = React.memo(function MiniSpark({
  data,
  color,
}: {
  data: MonthData[];
  color: string;
}) {
  const chartData = data
    .filter((m) => m.price !== null)
    .map((m) => ({ price: m.price }));

  if (chartData.length < 2) return null;

  return (
    <ResponsiveContainer width={60} height={24}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          fill="none"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ─── MYA Progress Bar ────────────────────────────────────────────────────────

function MYAProgressBar({
  projectedMYA,
  effectiveRefPrice,
}: {
  projectedMYA: number;
  effectiveRefPrice: number;
}) {
  const pct = effectiveRefPrice > 0
    ? Math.min((projectedMYA / effectiveRefPrice) * 100, 120)
    : 0;
  const statusColor = getStatusColor(pct);

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>
          MYA vs Reference Price
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div style={{
        width: '100%', height: 6, borderRadius: 3,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: `${Math.min(100 / 1.2 * 100, 100)}%`,
          top: 0, bottom: 0, width: 1.5,
          background: 'rgba(255,255,255,0.2)', zIndex: 2,
        }} />
        <div style={{
          width: `${Math.min(pct / 1.2, 100)}%`,
          height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${statusColor}80, ${statusColor})`,
          transition: 'width 0.6s ease-out',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 4, fontSize: 10, color: C.textDim,
      }}>
        <span>$0</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>
          Ref: ${effectiveRefPrice.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Collapsed Commodity Row ─────────────────────────────────────────────────

function CommodityRow({
  data,
  isExpanded,
  onToggle,
  priorYear,
  showMonths,
  onToggleMonths,
}: {
  data: MYAData;
  isExpanded: boolean;
  onToggle: () => void;
  priorYear: PriorYearData | null;
  showMonths: boolean;
  onToggleMonths: () => void;
}) {
  const { config } = data;
  const verdict = getPaymentVerdict(data);

  return (
    <div style={{
      background: isExpanded ? C.cardActive : C.card,
      border: `1px solid ${isExpanded ? C.cardActiveBorder : C.cardBorder}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* ── Collapsed Row (always visible, tappable) ── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px 16px',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 56,
        }}
      >
        {/* Emoji */}
        <span style={{ fontSize: 24, flexShrink: 0 }}>{config.emoji}</span>

        {/* Name + subtext */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: C.textBright,
            letterSpacing: '-0.01em', lineHeight: 1.2,
          }}>
            {config.name}
          </div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
            {data.monthsActual}/{12} months · {getConfidenceLabel(data.confidence)}
          </div>
        </div>

        {/* Mini sparkline */}
        <div style={{ flexShrink: 0 }}>
          <MiniSpark data={data.months} color={config.color} />
        </div>

        {/* Price + delta */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
          <div style={{
            fontSize: 17, fontWeight: 800, color: C.textBright,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
          }}>
            ${data.projectedMYA.toFixed(2)}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, marginTop: 1,
            color: data.myaVsRefPrice >= 0 ? C.green : C.red,
          }}>
            {data.myaVsRefPrice >= 0 ? '▲' : '▼'}${Math.abs(data.myaVsRefPrice).toFixed(2)}
          </div>
        </div>

        {/* Payment badge */}
        {data.plcPaymentRate > 0 && (
          <div style={{
            flexShrink: 0,
            padding: '4px 8px',
            borderRadius: 8,
            background: verdict.badgeBg,
            border: `1px solid ${verdict.color}20`,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: verdict.color,
              whiteSpace: 'nowrap',
            }}>
              {verdict.badgeLabel}
            </span>
          </div>
        )}

        {/* Chevron */}
        <span style={{
          flexShrink: 0, fontSize: 12, color: C.textDim,
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
      </button>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <div style={{
          padding: '0 16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          {/* Sparkline (larger) */}
          <div style={{ marginTop: 16 }}>
            <Sparkline
              data={data.months}
              color={config.color}
              refPrice={data.effectiveRefPrice}
              height={100}
            />
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <MYAProgressBar
              projectedMYA={data.projectedMYA}
              effectiveRefPrice={data.effectiveRefPrice}
            />
          </div>

          {/* Plain-language verdict */}
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 12,
            background: `${verdict.color}08`,
            border: `1px solid ${verdict.color}18`,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: verdict.color,
              lineHeight: 1.5,
            }}>
              {verdict.text}
            </div>
          </div>

          {/* Year-over-year comparison */}
          {priorYear && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                Last year ({priorYear.marketingYear})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: C.textMuted,
                }}>
                  ${priorYear.mya.toFixed(2)}
                </span>
                <span style={{ fontSize: 11, color: C.textDim }}>→</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: C.textBright,
                }}>
                  ${data.projectedMYA.toFixed(2)}
                </span>
                {(() => {
                  const yoyDiff = data.projectedMYA - priorYear.mya;
                  const yoyPct = priorYear.mya > 0
                    ? ((yoyDiff / priorYear.mya) * 100)
                    : 0;
                  return (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: yoyDiff >= 0 ? C.green : C.red,
                    }}>
                      {yoyDiff >= 0 ? '+' : ''}{yoyPct.toFixed(1)}%
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Reference prices row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            marginTop: 10,
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginBottom: 3 }}>
                Statutory Ref
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                ${data.statutoryRefPrice.toFixed(2)}
              </div>
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.12)',
            }}>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 3 }}>
                Effective Ref
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.gold }}>
                ${data.effectiveRefPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* PLC payment estimate (if applicable) */}
          {data.plcPaymentRate > 0 && (
            <div style={{
              marginTop: 10, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.12)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: C.red, fontWeight: 600, marginBottom: 4 }}>
                    Est. PLC Payment
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 900, color: C.red }}>
                    ${data.plcPaymentPerAcre.toFixed(2)}
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(239,68,68,0.6)' }}>
                      /acre
                    </span>
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.5)' }}>
                  ${data.plcPaymentRate.toFixed(2)}/{config.unitLabel}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.35)', marginTop: 6 }}>
                Uses national avg yield × 85% payment acres
              </div>
            </div>
          )}

          {/* Monthly breakdown toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMonths(); }}
            style={{
              marginTop: 12, width: '100%', padding: '10px 14px',
              borderRadius: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              minHeight: 44,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>
              Monthly Prices
            </span>
            <span style={{ fontSize: 11, color: C.textDim }}>
              {data.monthsActual} actual · {data.monthsProjected} projected {showMonths ? '▲' : '▼'}
            </span>
          </button>

          {/* Monthly grid (hidden by default) */}
          {showMonths && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6, marginTop: 8,
            }}>
              {data.months.map((m) => (
                <div
                  key={m.order}
                  style={{
                    padding: '8px 6px', borderRadius: 10,
                    background: m.isActual
                      ? 'rgba(5,150,105,0.08)'
                      : m.price !== null
                      ? 'rgba(245,158,11,0.06)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${m.isActual
                      ? 'rgba(5,150,105,0.15)'
                      : 'rgba(255,255,255,0.04)'}`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginBottom: 2 }}>
                    {m.label}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: m.price !== null ? C.text : C.textDim,
                  }}>
                    {m.price !== null ? `$${m.price.toFixed(2)}` : '—'}
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>
                    {m.isActual ? 'Actual' : m.price !== null ? 'Proj.' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function MarketsPage() {
  const [myaData, setMyaData] = useState<Record<string, MYAData>>({});
  const [priorYearData, setPriorYearData] = useState<Record<string, PriorYearData | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showMonthsFor, setShowMonthsFor] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch MYA data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        '/api/prices/mya?commodities=CORN,SOYBEANS,WHEAT,SORGHUM,BARLEY,OATS&include_history=true'
      );
      const json = await res.json();
      if (json.success && json.data) {
        setMyaData(json.data);
        if (json.priorYear) {
          setPriorYearData(json.priorYear);
        }
        setLastUpdated(new Date().toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        }));
      } else {
        setError(json.error || 'Failed to load market data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const now = new Date();
    const hour = now.getHours();
    const isMarketHours = hour >= 8 && hour < 17 && now.getDay() > 0 && now.getDay() < 6;
    const interval = setInterval(fetchData, isMarketHours ? 300_000 : 1_800_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const commodityList = useMemo(() => Object.values(myaData), [myaData]);

  const summary = useMemo(() => {
    return {
      total: commodityList.length,
      belowRef: commodityList.filter((d) => d.projectedMYA < d.effectiveRefPrice).length,
      withPayments: commodityList.filter((d) => d.plcPaymentRate > 0).length,
    };
  }, [commodityList]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* ═══ COMPACT HEADER ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            Markets
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
            background: 'rgba(5,150,105,0.12)', color: C.emeraldLight,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Live MYA
          </span>
        </div>
        {lastUpdated && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: C.textDim,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: 3,
              background: C.emeraldLight,
              boxShadow: '0 0 6px rgba(52,211,153,0.4)',
            }} />
            Updated {lastUpdated} · Auto-refreshes
          </div>
        )}
      </div>

      {/* ═══ COMPACT SUMMARY BAR ═══ */}
      {!loading && commodityList.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 16,
        }}>
          <div style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: C.card, border: `1px solid ${C.cardBorder}`,
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{summary.total}</span>
            <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>Tracked</span>
          </div>
          <div style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: summary.belowRef > 0 ? 'rgba(239,68,68,0.05)' : C.card,
            border: `1px solid ${summary.belowRef > 0 ? 'rgba(239,68,68,0.1)' : C.cardBorder}`,
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: 16, fontWeight: 800,
              color: summary.belowRef > 0 ? C.red : C.text,
            }}>
              {summary.belowRef}
            </span>
            <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>Below Ref</span>
          </div>
          <div style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: summary.withPayments > 0 ? 'rgba(245,158,11,0.05)' : C.card,
            border: `1px solid ${summary.withPayments > 0 ? 'rgba(245,158,11,0.1)' : C.cardBorder}`,
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: 16, fontWeight: 800,
              color: summary.withPayments > 0 ? C.amber : C.text,
            }}>
              {summary.withPayments}
            </span>
            <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>PLC</span>
          </div>
        </div>
      )}

      {/* ═══ LOADING STATE ═══ */}
      {loading && (
        <div style={{
          padding: 60, textAlign: 'center',
          background: C.card, borderRadius: 16,
          border: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{
            width: 36, height: 36, margin: '0 auto 12px',
            borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)',
            borderTopColor: C.emeraldLight,
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            Loading market data...
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
            Fetching MYA projections
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ═══ ERROR STATE ═══ */}
      {error && !loading && (
        <div style={{
          padding: '20px 24px', borderRadius: 16,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.12)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 4 }}>
            Unable to load market data
          </div>
          <div style={{ fontSize: 12, color: 'rgba(239,68,68,0.6)' }}>{error}</div>
          <button
            onClick={() => { setLoading(true); setError(''); fetchData(); }}
            style={{
              marginTop: 10, padding: '8px 20px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!loading && !error && commodityList.length === 0 && (
        <div style={{
          padding: 48, textAlign: 'center',
          background: C.card, borderRadius: 16,
          border: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            No Market Data Yet
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
            Market data will appear once the price pipeline is active.
          </div>
        </div>
      )}

      {/* ═══ COMMODITY LIST ═══ */}
      {!loading && commodityList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {commodityList.map((data) => (
            <CommodityRow
              key={data.commodity}
              data={data}
              isExpanded={expandedCard === data.commodity}
              onToggle={() =>
                setExpandedCard(
                  expandedCard === data.commodity ? null : data.commodity
                )
              }
              priorYear={priorYearData[data.commodity] || null}
              showMonths={showMonthsFor === data.commodity}
              onToggleMonths={() =>
                setShowMonthsFor(
                  showMonthsFor === data.commodity ? null : data.commodity
                )
              }
            />
          ))}
        </div>
      )}

      {/* ═══ DISCLAIMER ═══ */}
      {!loading && commodityList.length > 0 && (
        <div style={{
          marginTop: 20, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          fontSize: 10, color: C.textDim, lineHeight: 1.6,
        }}>
          <strong style={{ color: 'rgba(255,255,255,0.3)' }}>Disclaimer:</strong>{' '}
          MYA projections use NASS monthly Price Received data and futures-based estimates
          following the USDA ERS methodology. Actual MYA prices are determined by USDA and
          may differ. PLC payment estimates use national average yields and are approximate.
          Your farm-specific payments depend on your PLC yield, base acres, and entity structure.
          Always consult your local FSA office for official payment calculations.
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
