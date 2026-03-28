// =============================================================================
// HarvestFile — HeroSection (COMPLETE REWRITE)
// Build 11 Deploy 1: Geo-Personalized Hero That Shows The Product Working
//
// Architecture:
//   - Server Component shell renders instantly (headline, trust bar, skeleton)
//   - HeroDataCards async component wrapped in Suspense streams data cards
//   - HeroEmailCapture is the only client-side component
//   - Total client JS: ~3KB (email form only)
//
// Data flow:
//   page.tsx reads Vercel IP headers → resolves county → passes props here
//   HeroDataCards fetches grain bids (Barchart), weather (Open-Meteo),
//   and futures prices (Yahoo Finance) in parallel via Promise.all
//
// Fallback:
//   If no geo detected (local dev, VPN, non-US), shows national-level data
//   with "Every county in America" messaging instead of specific county
// =============================================================================

import { Suspense } from 'react';
import Link from 'next/link';
import { getGrainBidsByFips, getBestBids } from '@/lib/barchart/client';
import { HeroEmailCapture } from './HeroEmailCapture';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface HeroSectionProps {
  countyFips?: string | null;
  countyName?: string | null;
  stateAbbr?: string | null;
  stateName?: string | null;
  lat?: number | null;
  lng?: number | null;
  detected: boolean;
}

interface FuturesPrice {
  commodity: string;
  price: number;
  change: number;
  changePercent: number;
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBBBA REFERENCE PRICES — for payment estimates
// ═══════════════════════════════════════════════════════════════════════════════

const CROP_PARAMS = {
  CORN: {
    name: 'Corn',
    erp: 4.42,
    statutoryRef: 4.10,
    loanRate: 2.20,
    avgYield: 177,
    typicalAcres: 250,
    color: '#F59E0B',
  },
  SOYBEANS: {
    name: 'Soybeans',
    erp: 10.71,
    statutoryRef: 10.00,
    loanRate: 6.20,
    avgYield: 51,
    typicalAcres: 200,
    color: '#22C55E',
  },
  WHEAT: {
    name: 'Wheat',
    erp: 6.35,
    statutoryRef: 6.35,
    loanRate: 3.38,
    avgYield: 52,
    typicalAcres: 50,
    color: '#F97316',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FETCHING HELPERS (server-side only)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchGrainBids(countyFips: string) {
  try {
    const elevators = await getGrainBidsByFips(countyFips, {
      commodities: ['corn', 'soybeans', 'wheat'],
      maxLocations: 10,
      bidsPerCommodity: 2,
    });
    const cornBids = getBestBids(elevators, 'Corn').slice(0, 2);
    const soyBids = getBestBids(elevators, 'Soybeans').slice(0, 2);
    return { cornBids, soyBids, hasData: cornBids.length > 0 || soyBids.length > 0 };
  } catch {
    return { cornBids: [], soyBids: [], hasData: false };
  }
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current;
    if (!current) return null;
    return {
      temperature: Math.round(current.temperature_2m || 0),
      windSpeed: Math.round(current.wind_speed_10m || 0),
      windDirection: Math.round(current.wind_direction_10m || 0),
      weatherCode: current.weather_code || 0,
    };
  } catch {
    return null;
  }
}

async function fetchFutures(): Promise<FuturesPrice[]> {
  const symbols = [
    { key: 'CORN', symbol: 'ZC=F' },
    { key: 'SOYBEANS', symbol: 'ZS=F' },
    { key: 'WHEAT', symbol: 'ZW=F' },
  ];

  try {
    const results = await Promise.all(
      symbols.map(async ({ key, symbol }) => {
        try {
          const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
          const res = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            next: { revalidate: 1800 },
          });
          if (!res.ok) return null;
          const json = await res.json();
          const result = json?.chart?.result?.[0];
          const closes: (number | null)[] =
            result?.indicators?.quote?.[0]?.close || [];
          // Filter out nulls and get last 2 valid closes
          const validCloses = closes.filter(
            (c): c is number => c !== null && c !== undefined,
          );
          if (validCloses.length < 2) return null;
          const latest = validCloses[validCloses.length - 1] / 100; // cents → dollars
          const prev = validCloses[validCloses.length - 2] / 100;
          const change = Math.round((latest - prev) * 10000) / 10000;
          const changePct =
            prev > 0
              ? Math.round(((latest - prev) / prev) * 10000) / 100
              : 0;
          return { commodity: key, price: latest, change, changePercent: changePct };
        } catch {
          return null;
        }
      }),
    );
    return results.filter((r): r is FuturesPrice => r !== null);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT CALCULATION (same math as PaymentEstimateCard)
// ═══════════════════════════════════════════════════════════════════════════════

function calcPlcPerAcre(price: number, erp: number, loanRate: number, avgYield: number): number {
  const plcRate = Math.max(0, erp - Math.max(price, loanRate));
  const plcYield = avgYield * 0.80;
  return plcRate * plcYield * 0.85 * (1 - 0.059);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function weatherLabel(code: number): string {
  if (code <= 3) return 'Clear';
  if (code <= 49) return 'Cloudy';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 99) return 'Storm';
  return 'Clear';
}

function sprayStatus(windSpeed: number): { label: string; color: string; bg: string } {
  if (windSpeed < 10) return { label: 'GO', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
  if (windSpeed <= 15) return { label: 'CAUTION', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'NO', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON (shown while data loads)
// ═══════════════════════════════════════════════════════════════════════════════

function HeroCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-5 h-[180px]"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="w-24 h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div className="w-28 h-7 rounded mb-2 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="w-36 h-3 rounded mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="w-full h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAIN BID MINI-CARD (rendered by HeroDataCards after fetch)
// ═══════════════════════════════════════════════════════════════════════════════

function GrainCard({
  cornBids,
  soyBids,
  hasData,
  futures,
}: {
  cornBids: Array<{ elevator: { name: string }; bid: { cashPrice: number; basis: number } }>;
  soyBids: Array<{ elevator: { name: string }; bid: { cashPrice: number; basis: number } }>;
  hasData: boolean;
  futures: FuturesPrice[];
}) {
  const cornFuture = futures.find((f) => f.commodity === 'CORN');
  const soyFuture = futures.find((f) => f.commodity === 'SOYBEANS');

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(245,158,11,0.04))',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19v20H6.5a2.5 2.5 0 0 1 0-5H19" />
        </svg>
        <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: 'rgba(201,168,76,0.7)' }}>
          {hasData ? 'Local Cash Bids' : 'Grain Futures'}
        </span>
      </div>

      {hasData ? (
        <div className="space-y-2.5">
          {cornBids[0] && (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white/90">Corn</span>
                <span className="text-[11px] text-white/30 ml-2 truncate max-w-[100px] inline-block align-bottom">
                  {cornBids[0].elevator.name.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-white tabular-nums">
                  ${cornBids[0].bid.cashPrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-white/30 ml-1.5">
                  {cornBids[0].bid.basis >= 0 ? '+' : ''}{Math.round(cornBids[0].bid.basis * 100)}&cent;
                </span>
              </div>
            </div>
          )}
          {soyBids[0] && (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white/90">Soybeans</span>
                <span className="text-[11px] text-white/30 ml-2 truncate max-w-[100px] inline-block align-bottom">
                  {soyBids[0].elevator.name.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-white tabular-nums">
                  ${soyBids[0].bid.cashPrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-white/30 ml-1.5">
                  {soyBids[0].bid.basis >= 0 ? '+' : ''}{Math.round(soyBids[0].bid.basis * 100)}&cent;
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {cornFuture && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white/90">Corn</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-white tabular-nums">
                  ${cornFuture.price.toFixed(2)}
                </span>
                <span className={`text-[11px] font-semibold ${cornFuture.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cornFuture.change >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(cornFuture.change).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {soyFuture && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white/90">Soybeans</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-white tabular-nums">
                  ${soyFuture.price.toFixed(2)}
                </span>
                <span className={`text-[11px] font-semibold ${soyFuture.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {soyFuture.change >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(soyFuture.change).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer link */}
      <div className="mt-3.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href={hasData ? '/grain' : '/markets'}
          className="text-[11px] font-semibold flex items-center gap-1 transition-colors hover:opacity-80"
          style={{ color: 'rgba(201,168,76,0.7)' }}
        >
          {hasData ? 'All local bids' : 'Full market view'} &rarr;
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER MINI-CARD
// ═══════════════════════════════════════════════════════════════════════════════

function WeatherMiniCard({ data }: { data: WeatherData | null }) {
  if (!data) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2 mb-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
          <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: 'rgba(96,165,250,0.7)' }}>
            Weather
          </span>
        </div>
        <p className="text-sm text-white/30">Weather data unavailable</p>
      </div>
    );
  }

  const spray = sprayStatus(data.windSpeed);

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(96,165,250,0.04))',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center gap-2 mb-3.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
        <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: 'rgba(96,165,250,0.7)' }}>
          Current Weather
        </span>
      </div>

      {/* Temperature */}
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
          {data.temperature}&deg;F
        </span>
        <span className="text-sm text-white/40">{weatherLabel(data.weatherCode)}</span>
      </div>

      {/* Wind + Spray */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-white/40">
          Wind: {data.windSpeed} mph {windDirLabel(data.windDirection)}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: spray.bg, color: spray.color }}
        >
          Spray: {spray.label}
        </span>
      </div>

      {/* Footer */}
      <div className="mt-3.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/morning"
          className="text-[11px] font-semibold flex items-center gap-1 transition-colors hover:opacity-80"
          style={{ color: 'rgba(96,165,250,0.7)' }}
        >
          Full forecast &rarr;
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT ESTIMATE MINI-CARD
// ═══════════════════════════════════════════════════════════════════════════════

function PaymentMiniCard({ futures }: { futures: FuturesPrice[] }) {
  const corn = futures.find((f) => f.commodity === 'CORN');
  const soy = futures.find((f) => f.commodity === 'SOYBEANS');

  if (!corn && !soy) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2 mb-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E2C366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: 'rgba(201,168,76,0.7)' }}>
            Payment Estimate
          </span>
        </div>
        <p className="text-sm text-white/30">Price data unavailable</p>
      </div>
    );
  }

  const cornPLC = corn ? calcPlcPerAcre(corn.price, CROP_PARAMS.CORN.erp, CROP_PARAMS.CORN.loanRate, CROP_PARAMS.CORN.avgYield) : 0;
  const soyPLC = soy ? calcPlcPerAcre(soy.price, CROP_PARAMS.SOYBEANS.erp, CROP_PARAMS.SOYBEANS.loanRate, CROP_PARAMS.SOYBEANS.avgYield) : 0;
  const totalEst =
    cornPLC * CROP_PARAMS.CORN.typicalAcres +
    soyPLC * CROP_PARAMS.SOYBEANS.typicalAcres;

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(201,168,76,0.05))',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E2C366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: 'rgba(201,168,76,0.7)' }}>
            2026 PLC Estimate
          </span>
        </div>
        <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">Live</span>
      </div>

      {/* Total estimate */}
      <div className="mb-3">
        <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
          ${Math.round(totalEst).toLocaleString()}
        </span>
        <span className="text-[11px] text-white/30 ml-2">est. total</span>
      </div>

      {/* Per-crop breakdown */}
      <div className="space-y-1.5">
        {corn && cornPLC > 0.5 && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-white/50">Corn PLC</span>
            <span className="font-bold text-white/80 tabular-nums">${cornPLC.toFixed(0)}/ac</span>
          </div>
        )}
        {soy && soyPLC > 0.5 && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-white/50">Soybeans PLC</span>
            <span className="font-bold text-white/80 tabular-nums">${soyPLC.toFixed(0)}/ac</span>
          </div>
        )}
        {cornPLC <= 0.5 && soyPLC <= 0.5 && (
          <p className="text-[12px] text-white/30">
            Prices above reference — no PLC payments projected at current levels
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/check"
          className="text-[11px] font-semibold flex items-center gap-1 transition-colors hover:opacity-80"
          style={{ color: 'rgba(201,168,76,0.7)' }}
        >
          Personalize with your acres &rarr;
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO DATA CARDS — Async Server Component (wrapped in Suspense)
// Fetches grain bids, weather, and futures in parallel
// ═══════════════════════════════════════════════════════════════════════════════

async function HeroDataCards({
  countyFips,
  lat,
  lng,
}: {
  countyFips?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  // Fetch all data in parallel
  const [grainData, weather, futures] = await Promise.all([
    countyFips ? fetchGrainBids(countyFips) : Promise.resolve({ cornBids: [], soyBids: [], hasData: false }),
    lat && lng ? fetchWeather(lat, lng) : Promise.resolve(null),
    fetchFutures(),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <GrainCard
        cornBids={grainData.cornBids}
        soyBids={grainData.soyBids}
        hasData={grainData.hasData}
        futures={futures}
      />
      <WeatherMiniCard data={weather} />
      <PaymentMiniCard futures={futures} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST BAR
// ═══════════════════════════════════════════════════════════════════════════════

function TrustBar() {
  const items = [
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1 8.618 3.04A12.02 12.02 0 0 0 12 21.944 12.02 12.02 0 0 0 3.382 5.984', label: 'Independent' },
    { icon: 'M4 7V4h16v3M9 20h6M12 4v16', label: 'USDA Data' },
    { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Your Data Stays Yours' },
    { icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', label: 'Free Forever' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(201,168,76,0.4)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={item.icon} />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HERO SECTION EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function HeroSection({
  countyFips,
  countyName,
  stateAbbr,
  lat,
  lng,
  detected,
}: HeroSectionProps) {
  const locationLine = detected && countyName && stateAbbr
    ? `${countyName}, ${stateAbbr}`
    : null;

  return (
    <section className="relative overflow-hidden" style={{ background: '#0C1F17' }}>
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(27,67,50,0.4) 0%, rgba(12,31,23,0) 60%)',
        }}
      />
      {/* Grain texture */}
      <div className="hf-grain" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1100px] px-5 pt-28 pb-14 sm:pt-32 sm:pb-16">
        {/* Eyebrow */}
        <div className="text-center mb-5">
          {locationLine ? (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'rgba(201,168,76,0.8)' }}>
                Today in {locationLine}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <span className="text-[12px] font-semibold" style={{ color: 'rgba(201,168,76,0.8)' }}>
                3,143 counties. Every morning. Free.
              </span>
            </div>
          )}
        </div>

        {/* Headline */}
        <h1
          className="text-center text-[40px] sm:text-[52px] lg:text-[60px] font-extrabold tracking-[-0.04em] leading-[1.05] mb-4"
          style={{ color: '#FFFFFF' }}
        >
          Your farm&apos;s{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(135deg, #C9A84C, #E2C366, #C9A84C)',
              WebkitBackgroundClip: 'text',
            }}
          >
            morning intelligence
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-center text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          Grain bids, weather, and ARC/PLC payment estimates — updated daily
          {locationLine ? ` for ${locationLine}` : ' for every county in America'}.
          Free. No account needed.
        </p>

        {/* Live Data Cards */}
        <div className="mb-10">
          <Suspense fallback={<HeroCardsSkeleton />}>
            <HeroDataCards
              countyFips={countyFips}
              lat={lat}
              lng={lng}
            />
          </Suspense>
        </div>

        {/* Email Capture */}
        <div className="mb-8">
          <HeroEmailCapture
            countyName={countyName || undefined}
            stateAbbr={stateAbbr || undefined}
            countyFips={countyFips || undefined}
          />
        </div>

        {/* Trust Bar */}
        <div className="mb-6">
          <TrustBar />
        </div>

        {/* County fallback + Calculator CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          {detected && locationLine && (
            <Link
              href="/check"
              className="text-[12px] font-medium transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Not in {locationLine}? Find your county &rarr;
            </Link>
          )}
          {!detected && (
            <Link
              href="/check"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #E2C366)',
                color: '#0C1F17',
              }}
            >
              Find Your County
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
