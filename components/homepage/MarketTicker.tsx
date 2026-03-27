'use client';

import { useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// OBBBA Effective Reference Prices (ERP) — the PLC payment trigger thresholds
// These are the prices below which PLC payments kick in for 2025/2026
// ═══════════════════════════════════════════════════════════════════════════════
const COMMODITY_CONFIG = {
  corn: {
    name: 'Corn',
    symbol: 'ZC=F',
    erp: 4.42,
    statutoryRef: 4.10,
    loanRate: 2.42,
    unit: '/bu',
    color: '#F59E0B',     // amber
    bgGlow: 'rgba(245, 158, 11, 0.06)',
  },
  soybeans: {
    name: 'Soybeans',
    symbol: 'ZS=F',
    erp: 10.71,
    statutoryRef: 10.00,
    loanRate: 6.82,
    unit: '/bu',
    color: '#22C55E',     // green
    bgGlow: 'rgba(34, 197, 94, 0.06)',
  },
  wheat: {
    name: 'Wheat',
    symbol: 'ZW=F',
    erp: 6.35,
    statutoryRef: 6.35,
    loanRate: 3.72,
    unit: '/bu',
    color: '#F97316',     // orange
    bgGlow: 'rgba(249, 115, 22, 0.06)',
  },
} as const;

type CommodityKey = keyof typeof COMMODITY_CONFIG;

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  marketOpen: boolean;
}

interface TickerData {
  corn: PriceData | null;
  soybeans: PriceData | null;
  wheat: PriceData | null;
  lastUpdated: string | null;
  error: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLC Payment Status Logic
// ═══════════════════════════════════════════════════════════════════════════════
function getPaymentStatus(price: number, erp: number): {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
} {
  const diff = price - erp;
  if (diff <= -0.25) {
    return {
      label: 'PLC payment likely',
      color: '#22C55E',
      bgColor: 'rgba(34, 197, 94, 0.12)',
      dotColor: '#22C55E',
    };
  }
  if (diff < 0) {
    return {
      label: 'Near trigger — watch closely',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      dotColor: '#F59E0B',
    };
  }
  if (diff < 0.25) {
    return {
      label: 'Near ref price',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      dotColor: '#F59E0B',
    };
  }
  return {
    label: 'Above ref price',
    color: 'rgba(255,255,255,0.45)',
    bgColor: 'rgba(255,255,255,0.05)',
    dotColor: 'rgba(255,255,255,0.3)',
  };
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `(${sign}${pct.toFixed(1)}%)`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton Loader
// ═══════════════════════════════════════════════════════════════════════════════
function TickerSkeleton() {
  return (
    <section className="w-full" style={{ background: '#0C1F17' }}>
      <div className="mx-auto max-w-[1100px] px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <div className="h-5 w-20 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div className="h-8 w-28 rounded mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-4 w-36 rounded mb-4" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-7 w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Price Reference Bar — visual gauge showing price position relative to ERP
// ═══════════════════════════════════════════════════════════════════════════════
function PriceBar({ price, erp, loanRate }: { price: number; erp: number; loanRate: number }) {
  // Scale: loanRate to erp+20% of range
  const range = erp - loanRate;
  const scaleMax = erp + range * 0.3;
  const scaleMin = loanRate;
  const total = scaleMax - scaleMin;

  const erpPos = ((erp - scaleMin) / total) * 100;
  const pricePos = Math.max(0, Math.min(100, ((price - scaleMin) / total) * 100));

  const belowErp = price < erp;

  return (
    <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      {/* Payment zone — below ERP */}
      <div
        className="absolute top-0 left-0 h-full rounded-l-full"
        style={{
          width: `${erpPos}%`,
          background: 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.25))',
        }}
      />
      {/* ERP threshold line */}
      <div
        className="absolute top-0 h-full w-[2px]"
        style={{
          left: `${erpPos}%`,
          background: 'rgba(201,168,76,0.6)',
        }}
      />
      {/* Price needle */}
      <div
        className="absolute top-[-3px] w-2 h-[14px] rounded-full"
        style={{
          left: `calc(${pricePos}% - 4px)`,
          background: belowErp ? '#22C55E' : 'rgba(255,255,255,0.5)',
          boxShadow: belowErp ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
          transition: 'left 0.6s ease-out',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Individual Commodity Card
// ═══════════════════════════════════════════════════════════════════════════════
function CommodityCard({
  commodityKey,
  data,
}: {
  commodityKey: CommodityKey;
  data: PriceData;
}) {
  const config = COMMODITY_CONFIG[commodityKey];
  const status = getPaymentStatus(data.price, config.erp);
  const isUp = data.change >= 0;

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden group"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, ${config.bgGlow} 100%)`,
        border: '1px solid rgba(255,255,255,0.07)',
        transition: 'border-color 0.3s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
      }}
    >
      {/* Commodity Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold tracking-tight"
            style={{
              background: `${config.color}18`,
              color: config.color,
            }}
          >
            {commodityKey === 'corn' ? 'C' : commodityKey === 'soybeans' ? 'S' : 'W'}
          </div>
          <span
            className="font-semibold text-sm tracking-wide"
            style={{ color: 'rgba(255,255,255,0.85)', fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {config.name}
          </span>
        </div>
        {!data.marketOpen && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            Closed
          </span>
        )}
      </div>

      {/* Price + Change */}
      <div className="flex items-baseline gap-2.5 mb-1">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{
            color: '#FFFFFF',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontFeatureSettings: '"tnum"',
          }}
        >
          {formatPrice(data.price)}
        </span>
        <span
          className="text-sm font-semibold"
          style={{
            color: isUp ? '#22C55E' : '#EF4444',
            fontFeatureSettings: '"tnum"',
          }}
        >
          {isUp ? '\u25B2' : '\u25BC'} {formatChange(data.change)} {formatPercent(data.changePercent)}
        </span>
      </div>

      {/* ERP context line */}
      <div className="text-[12px] mb-3.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        ERP: {formatPrice(config.erp)}{config.unit}
        <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 6px' }}>{'\u00B7'}</span>
        {data.price < config.erp
          ? `${formatPrice(config.erp - data.price)} below`
          : `${formatPrice(data.price - config.erp)} above`}
      </div>

      {/* Price position bar */}
      <PriceBar price={data.price} erp={config.erp} loanRate={config.loanRate} />

      {/* Payment status pill */}
      <div
        className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{
          background: status.bgColor,
          color: status.color,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: status.dotColor }}
        />
        {status.label}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main MarketTicker Component
// ═══════════════════════════════════════════════════════════════════════════════
export function MarketTicker() {
  const [data, setData] = useState<TickerData>({
    corn: null,
    soybeans: null,
    wheat: null,
    lastUpdated: null,
    error: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices/futures', { cache: 'no-store' });
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();

      // The existing endpoint returns prices — normalize to our format
      // Yahoo Finance returns cents/bu for futures, requiring /100 conversion
      const parseCommodity = (raw: Record<string, unknown>): PriceData | null => {
        if (!raw || typeof raw !== 'object') return null;
        const price = Number(raw.price || raw.regularMarketPrice || 0);
        const change = Number(raw.change || raw.regularMarketChange || 0);
        const changePct = Number(raw.changePercent || raw.regularMarketChangePercent || 0);
        // Yahoo v8 returns cents — if price > 100, divide by 100
        const normalizedPrice = price > 100 ? price / 100 : price;
        const normalizedChange = price > 100 ? change / 100 : change;
        return {
          price: normalizedPrice,
          change: normalizedChange,
          changePercent: changePct,
          marketOpen: Boolean(raw.marketOpen ?? raw.marketState === 'REGULAR'),
        };
      };

      setData({
        corn: parseCommodity(json.corn || json['ZC=F'] || {}),
        soybeans: parseCommodity(json.soybeans || json['ZS=F'] || {}),
        wheat: parseCommodity(json.wheat || json['ZW=F'] || {}),
        lastUpdated: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        error: false,
      });
    } catch {
      setData((prev) => ({ ...prev, error: true }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  if (loading) return <TickerSkeleton />;
  if (data.error && !data.corn) return null; // Silently hide on total failure

  const commodities: CommodityKey[] = ['corn', 'soybeans', 'wheat'];
  const hasData = commodities.some((k) => data[k] !== null);
  if (!hasData) return null;

  return (
    <section className="w-full" style={{ background: '#0C1F17' }}>
      <div className="mx-auto max-w-[1100px] px-5 py-8 md:py-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: '#22C55E',
                boxShadow: '0 0 6px rgba(34,197,94,0.4)',
                animation: 'hf-pulse 2s ease-in-out infinite',
              }}
            />
            <span
              className="text-[13px] font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(201,168,76,0.7)' }}
            >
              Live Commodity Prices
            </span>
          </div>
          {data.lastUpdated && (
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Updated {data.lastUpdated}
            </span>
          )}
        </div>

        {/* 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {commodities.map((key) => {
            const priceData = data[key];
            if (!priceData) return null;
            return <CommodityCard key={key} commodityKey={key} data={priceData} />;
          })}
        </div>

        {/* PLC Payment Context Bar */}
        <div
          className="mt-5 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          style={{
            background: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.12)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {(() => {
                // Calculate which commodities are below ERP
                const belowErp = commodities.filter(
                  (k) => data[k] && data[k]!.price < COMMODITY_CONFIG[k].erp
                );
                if (belowErp.length === 0) {
                  return 'All commodities above reference prices — no PLC payments projected at current levels.';
                }
                const names = belowErp.map((k) => COMMODITY_CONFIG[k].name.toLowerCase());
                return `PLC payments projected for ${names.join(' and ')} at current price levels under OBBBA.`;
              })()}
            </span>
          </div>
          <a
            href="/check"
            className="text-[13px] font-semibold whitespace-nowrap"
            style={{ color: '#C9A84C' }}
          >
            Calculate your payment {'\u2192'}
          </a>
        </div>

        {/* Source attribution */}
        <p className="mt-3 text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
          CME settlement prices via Yahoo Finance. Reference prices per OBBBA (Pub. L. 119-21). Data for educational purposes only.
        </p>
      </div>

      {/* Pulse animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes hf-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}} />
    </section>
  );
}
