// =============================================================================
// HarvestFile — Phase 14A: Markets Dashboard
// app/(dashboard)/dashboard/markets/page.tsx
//
// Mobile-first card stack designed for "pull out phone in the truck cab at 6 AM"
// Large numbers (28pt+), color-coded status, sparklines, MYA progress bars,
// PLC payment projections. Under 10 seconds to full comprehension.
//
// No competitor offers this: live MYA tracking with automatic ARC/PLC payment
// projections. Every university calculator requires manual price entry.
// =============================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, ResponsiveContainer, ReferenceLine,
  Tooltip, XAxis, YAxis,
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

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0f0d',
  card: 'rgba(255,255,255,0.02)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardActive: 'rgba(5,150,105,0.06)',
  cardActiveBorder: 'rgba(5,150,105,0.2)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.4)',
  textDim: 'rgba(255,255,255,0.25)',
  emerald: '#059669',
  emeraldLight: '#34d399',
  gold: '#C9A84C',
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
};

// ─── Status helpers ──────────────────────────────────────────────────────────

function getStatusColor(pct: number): string {
  if (pct >= 100) return C.green;
  if (pct >= 95) return C.amber;
  return C.red;
}

function getStatusLabel(pct: number): string {
  if (pct >= 100) return 'Above Reference';
  if (pct >= 95) return 'Near Reference';
  return 'Below Reference';
}

function getConfidenceBadge(confidence: string): { bg: string; text: string; label: string } {
  switch (confidence) {
    case 'high': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', label: 'High Confidence' };
    case 'medium': return { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', label: 'Medium Confidence' };
    default: return { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)', label: 'Early Estimate' };
  }
}

function getPaymentBadge(likelihood: string): { bg: string; text: string; label: string } {
  switch (likelihood) {
    case 'certain': return { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'PLC Payment Triggered' };
    case 'likely': return { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', label: 'PLC Payment Likely' };
    case 'possible': return { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)', label: 'PLC Payment Possible' };
    default: return { bg: 'rgba(34,197,94,0.08)', text: '#22c55e', label: 'No PLC Payment Expected' };
  }
}

// ─── Sparkline Component ─────────────────────────────────────────────────────

const MiniSparkline = React.memo(function MiniSparkline({
  data,
  color,
  refPrice,
}: {
  data: MonthData[];
  color: string;
  refPrice: number;
}) {
  const chartData = data
    .filter((m) => m.price !== null)
    .map((m) => ({
      name: m.label,
      price: m.price,
      isActual: m.isActual,
    }));

  if (chartData.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine
          y={refPrice}
          stroke="rgba(255,255,255,0.12)"
          strokeDasharray="3 3"
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          fill={`url(#spark-${color})`}
          strokeWidth={2}
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
  color,
}: {
  projectedMYA: number;
  effectiveRefPrice: number;
  color: string;
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
        {/* Reference line at 100% */}
        <div style={{
          position: 'absolute', left: `${Math.min(100 / 1.2 * 100, 100)}%`,
          top: 0, bottom: 0, width: 1.5,
          background: 'rgba(255,255,255,0.2)',
          zIndex: 2,
        }} />
        {/* Progress fill */}
        <div style={{
          width: `${Math.min(pct / 1.2, 100)}%`, // Scale to 120% max
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

// ─── Commodity Card ──────────────────────────────────────────────────────────

function CommodityCard({
  data,
  isExpanded,
  onToggle,
}: {
  data: MYAData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { config } = data;
  const pct = data.effectiveRefPrice > 0
    ? (data.projectedMYA / data.effectiveRefPrice) * 100
    : 0;
  const statusColor = getStatusColor(pct);
  const confidence = getConfidenceBadge(data.confidence);
  const payment = getPaymentBadge(data.paymentLikelihood);

  return (
    <div
      style={{
        background: isExpanded ? C.cardActive : C.card,
        border: `1px solid ${isExpanded ? C.cardActiveBorder : C.cardBorder}`,
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* ── Card Header (always visible) ── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '20px 24px', cursor: 'pointer',
          background: 'none', border: 'none', textAlign: 'left',
          display: 'block',
        }}
      >
        {/* Top row: emoji + name + confidence badge */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{config.emoji}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
                {config.name}
              </div>
              <div style={{ fontSize: 11, color: C.textDim }}>
                {data.marketingYear} · {data.monthsActual}/12 months
              </div>
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
            background: confidence.bg, color: confidence.text,
            letterSpacing: '0.02em',
          }}>
            {confidence.label}
          </span>
        </div>

        {/* Price row */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12,
        }}>
          <span style={{
            fontSize: 32, fontWeight: 900, color: C.text,
            letterSpacing: '-0.04em', lineHeight: 1,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${data.projectedMYA.toFixed(2)}
          </span>
          <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>
            {config.unit}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: data.myaVsRefPrice >= 0 ? C.green : C.red,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            {data.myaVsRefPrice >= 0 ? '▲' : '▼'}
            ${Math.abs(data.myaVsRefPrice).toFixed(2)} vs ref
          </span>
        </div>

        {/* Sparkline */}
        <MiniSparkline
          data={data.months}
          color={config.color}
          refPrice={data.effectiveRefPrice}
        />

        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <MYAProgressBar
            projectedMYA={data.projectedMYA}
            effectiveRefPrice={data.effectiveRefPrice}
            color={config.color}
          />
        </div>

        {/* Payment projection */}
        {data.plcPaymentRate > 0 && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 12,
            background: payment.bg, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: payment.text }}>
              {payment.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: payment.text }}>
              ${data.plcPaymentRate.toFixed(2)}/{config.unitLabel}
            </span>
          </div>
        )}
      </button>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <div style={{
          padding: '0 24px 24px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          {/* Monthly breakdown table */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              Monthly Breakdown
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}>
              {data.months.map((m) => (
                <div
                  key={m.order}
                  style={{
                    padding: '8px 10px', borderRadius: 10,
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
          </div>

          {/* Reference price details */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginBottom: 4 }}>
                Statutory Ref Price
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                ${data.statutoryRefPrice.toFixed(2)}
              </div>
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.12)',
            }}>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 4 }}>
                Effective Ref Price
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>
                ${data.effectiveRefPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* PLC payment estimate */}
          {data.plcPaymentRate > 0 && (
            <div style={{
              marginTop: 10, padding: '14px 16px', borderRadius: 12,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.12)',
            }}>
              <div style={{ fontSize: 10, color: C.red, fontWeight: 600, marginBottom: 6 }}>
                Estimated PLC Payment (National Avg)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: C.red }}>
                  ${data.plcPaymentPerAcre.toFixed(2)}
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(239,68,68,0.6)' }}>/acre</span>
                </span>
                <span style={{ fontSize: 12, color: 'rgba(239,68,68,0.6)' }}>
                  Rate: ${data.plcPaymentRate.toFixed(2)}/{config.unitLabel}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.4)', marginTop: 6 }}>
                Estimate uses national avg yield × 85% payment acres. Your farm-specific payment depends on your PLC yield and base acres.
              </div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch MYA data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/prices/mya?commodities=CORN,SOYBEANS,WHEAT,SORGHUM,BARLEY,OATS');
      const json = await res.json();
      if (json.success && json.data) {
        setMyaData(json.data);
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
    // Refresh every 5 minutes during market hours, 30 min otherwise
    const now = new Date();
    const hour = now.getHours();
    const isMarketHours = hour >= 8 && hour < 17 && now.getDay() > 0 && now.getDay() < 6;
    const interval = setInterval(fetchData, isMarketHours ? 300_000 : 1_800_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const commodityList = useMemo(() => Object.values(myaData), [myaData]);

  // Summary stats
  const summary = useMemo(() => {
    const withPayments = commodityList.filter((d) => d.plcPaymentRate > 0);
    return {
      total: commodityList.length,
      belowRef: commodityList.filter(
        (d) => d.projectedMYA < d.effectiveRefPrice
      ).length,
      withPayments: withPayments.length,
      avgConfidence: commodityList.length > 0
        ? commodityList.filter((d) => d.monthsActual >= 4).length
        : 0,
    };
  }, [commodityList]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            📊
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{
                fontSize: 24, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.03em', margin: 0,
              }}>
                Markets
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                background: 'rgba(5,150,105,0.12)', color: C.emeraldLight,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Live MYA Tracker
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              Marketing Year Average prices vs. reference prices · ARC/PLC payment projections
            </p>
          </div>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: C.textDim, marginTop: 6,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: 3,
              background: C.emeraldLight,
              boxShadow: '0 0 8px rgba(52,211,153,0.4)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            Last updated {lastUpdated} · Auto-refreshes
          </div>
        )}
      </div>

      {/* ═══ SUMMARY STATS ═══ */}
      {!loading && commodityList.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, marginBottom: 24,
        }}>
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: C.card, border: `1px solid ${C.cardBorder}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{summary.total}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>Commodities</div>
          </div>
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: summary.belowRef > 0 ? 'rgba(239,68,68,0.06)' : C.card,
            border: `1px solid ${summary.belowRef > 0 ? 'rgba(239,68,68,0.12)' : C.cardBorder}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: summary.belowRef > 0 ? C.red : C.text,
            }}>
              {summary.belowRef}
            </div>
            <div style={{ fontSize: 11, color: C.textDim }}>Below Reference</div>
          </div>
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: summary.withPayments > 0 ? 'rgba(245,158,11,0.06)' : C.card,
            border: `1px solid ${summary.withPayments > 0 ? 'rgba(245,158,11,0.12)' : C.cardBorder}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: summary.withPayments > 0 ? C.amber : C.text,
            }}>
              {summary.withPayments}
            </div>
            <div style={{ fontSize: 11, color: C.textDim }}>PLC Payments</div>
          </div>
        </div>
      )}

      {/* ═══ LOADING STATE ═══ */}
      {loading && (
        <div style={{
          padding: 80, textAlign: 'center',
          background: C.card, borderRadius: 20,
          border: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{
            width: 40, height: 40, margin: '0 auto 16px',
            borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)',
            borderTopColor: C.emeraldLight,
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            Loading market data...
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
            Fetching latest MYA projections from USDA
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ═══ ERROR STATE ═══ */}
      {error && !loading && (
        <div style={{
          padding: '24px 28px', borderRadius: 16,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.12)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 6 }}>
            Unable to load market data
          </div>
          <div style={{ fontSize: 12, color: 'rgba(239,68,68,0.6)' }}>{error}</div>
          <button
            onClick={() => { setLoading(true); setError(''); fetchData(); }}
            style={{
              marginTop: 12, padding: '8px 20px', borderRadius: 10,
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
          padding: 60, textAlign: 'center',
          background: C.card, borderRadius: 20,
          border: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            No Market Data Yet
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            Market data will appear here once the price pipeline is active.
            Monthly NASS prices and daily futures data will populate automatically.
          </div>
        </div>
      )}

      {/* ═══ COMMODITY CARDS ═══ */}
      {!loading && commodityList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {commodityList.map((data) => (
            <CommodityCard
              key={data.commodity}
              data={data}
              isExpanded={expandedCard === data.commodity}
              onToggle={() =>
                setExpandedCard(
                  expandedCard === data.commodity ? null : data.commodity
                )
              }
            />
          ))}
        </div>
      )}

      {/* ═══ DISCLAIMER ═══ */}
      {!loading && commodityList.length > 0 && (
        <div style={{
          marginTop: 24, padding: '14px 18px', borderRadius: 12,
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
