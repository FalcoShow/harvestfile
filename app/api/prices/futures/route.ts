// =============================================================================
// app/api/prices/futures/route.ts
// HarvestFile — Surface 2 Deploy 3A: Enhanced Futures Price API
//
// GET /api/prices/futures?commodity=CORN
// GET /api/prices/futures?commodities=CORN,SOYBEANS,WHEAT
// GET /api/prices/futures?commodities=CORN,SOYBEANS,WHEAT&days=90
//
// Data source: Yahoo Finance v8 chart API (free, no key required).
// Barchart futures require $25K+/yr CME licensing — not viable pre-revenue.
//
// DEPLOY 3A CHANGES:
//   - Default days increased from 30 → 90 (TradingView charts need more history)
//   - Market-hours-aware Cache-Control headers for optimal CDN behavior
//   - OHLCV data retained for TradingView candlestick/area series
//   - Improved error handling with partial failure support
//
// CRITICAL: Yahoo Finance returns CME quotes in CENTS per unit.
// We divide by 100 to convert to $/unit for USDA reference price consistency.
//
// Market hours (CBOT grains, Central Time):
//   Electronic: Sun 7 PM → Fri 1:20 PM CT
//   Regular:    Mon–Fri 8:30 AM → 1:20 PM CT
//   Closed:     Fri 1:20 PM → Sun 7 PM CT
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COMMODITIES } from '@/lib/mya/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Yahoo Finance symbols for CME/ICE commodity futures
const YAHOO_SYMBOLS: Record<string, string> = {
  CORN: 'ZC=F',
  SOYBEANS: 'ZS=F',
  WHEAT: 'ZW=F',
  OATS: 'ZO=F',
  RICE: 'ZR=F',
  COTTON: 'CT=F',
};

// Keep legacy codes for DB compatibility
const FUTURES_CODES: Record<string, string> = {
  CORN: 'ZC=F',
  SOYBEANS: 'ZS=F',
  WHEAT: 'ZW=F',
  OATS: 'ZO=F',
  RICE: 'ZR=F',
  COTTON: 'CT=F',
};

// ─── Market Hours Detection ──────────────────────────────────────────────────

type MarketState = 'open' | 'electronic' | 'closed';

function getMarketState(): MarketState {
  const ct = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  );
  const day = ct.getDay();
  const h = ct.getHours() + ct.getMinutes() / 60;

  // Weekend (Sat all day, Sun before 7 PM)
  if (day === 6) return 'closed';
  if (day === 0 && h < 19) return 'closed';

  // Friday after close
  if (day === 5 && h >= 13.333) return 'closed';

  // Regular trading hours: Mon-Fri 8:30 AM - 1:20 PM CT
  if (h >= 8.5 && h < 13.333) return 'open';

  // Electronic session: Sun 7 PM through next regular open
  if (h >= 19 || h < 8.5) return 'electronic';

  return 'closed';
}

function getCacheHeaders(): string {
  const state = getMarketState();
  switch (state) {
    case 'open':
      // During regular hours, cache 60s with 120s stale fallback
      return 'public, s-maxage=60, stale-while-revalidate=120';
    case 'electronic':
      // During electronic session, cache 5 min with 10 min stale
      return 'public, s-maxage=300, stale-while-revalidate=600';
    case 'closed':
      // Markets closed, cache 1 hour with 2 hour stale
      return 'public, s-maxage=3600, stale-while-revalidate=7200';
    default:
      return 'public, s-maxage=1800, stale-while-revalidate=900';
  }
}

// ─── Cents → Dollars conversion ──────────────────────────────────────────────

function centsToDollars(cents: number): number {
  return Math.round((cents / 100) * 10000) / 10000;
}

// ─── Yahoo Finance range selector ────────────────────────────────────────────

function getYahooRange(days: number): string {
  if (days > 180) return '1y';
  if (days > 90) return '6mo';
  if (days > 30) return '3mo';
  if (days > 14) return '1mo';
  return '1mo';
}

// ─── Price Point type ────────────────────────────────────────────────────────

interface PricePoint {
  date: string;
  settle: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

// ─── Fetch from Yahoo Finance ────────────────────────────────────────────────

async function fetchFuturesFromYahoo(
  commodity: string,
  days: number = 90
): Promise<PricePoint[]> {
  const symbol = YAHOO_SYMBOLS[commodity];
  if (!symbol) return [];

  try {
    const range = getYahooRange(days);
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;

    // Market-hours-aware revalidation for the fetch itself
    const state = getMarketState();
    const revalidate = state === 'open' ? 60 : state === 'electronic' ? 300 : 1800;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate },
    });

    if (!res.ok) {
      console.error(`[Futures] Yahoo Finance error for ${commodity} (${symbol}): ${res.status}`);
      return [];
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      console.error(`[Futures] No chart result for ${commodity}`);
      return [];
    }

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || timestamps.length === 0) {
      console.error(`[Futures] No quote data for ${commodity}`);
      return [];
    }

    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    const prices: PricePoint[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close === null || close === undefined) continue;

      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Convert from exchange cents to dollars per unit
      prices.push({
        date: dateStr,
        settle: centsToDollars(close),
        open: opens[i] !== null ? centsToDollars(opens[i]!) : null,
        high: highs[i] !== null ? centsToDollars(highs[i]!) : null,
        low: lows[i] !== null ? centsToDollars(lows[i]!) : null,
        volume: volumes[i] || null,
      });
    }

    return prices;
  } catch (err) {
    console.error(`[Futures] Failed to fetch ${commodity} from Yahoo:`, err);
    return [];
  }
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const singleCommodity = searchParams.get('commodity')?.toUpperCase();
  const multipleCommodities = searchParams.get('commodities');
  // Deploy 3A: Default to 90 days for TradingView chart history
  const daysParam = parseInt(searchParams.get('days') || '90');
  const store = searchParams.get('store') !== 'false';

  // Determine commodities
  let commodities: string[];
  if (singleCommodity) {
    commodities = [singleCommodity];
  } else if (multipleCommodities) {
    commodities = multipleCommodities.split(',').map((c) => c.trim().toUpperCase());
  } else {
    commodities = ['CORN', 'SOYBEANS', 'WHEAT'];
  }

  // Filter to valid symbols
  commodities = commodities.filter((c) => YAHOO_SYMBOLS[c]);

  if (commodities.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No futures data available for specified commodities' },
      { status: 400 }
    );
  }

  try {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    await Promise.all(
      commodities.map(async (commodity) => {
        try {
          const prices = await fetchFuturesFromYahoo(commodity, daysParam);

          if (prices.length === 0) {
            errors.push(`${commodity}: No data returned`);
            results[commodity] = { commodity, prices: [], error: 'No data returned' };
            return;
          }

          // Store to Supabase if requested
          if (store && prices.length > 0) {
            const upsertRows = prices.map((p) => ({
              commodity,
              contract_code: FUTURES_CODES[commodity],
              price_date: p.date,
              settle: p.settle,
              open_price: p.open,
              high: p.high,
              low: p.low,
              volume: p.volume,
              source: 'yahoo_finance',
              fetched_at: new Date().toISOString(),
            }));

            const { error: upsertError } = await supabase
              .from('futures_prices')
              .upsert(upsertRows, {
                onConflict: 'commodity,price_date,contract_code',
              });

            if (upsertError) {
              console.error(`[Futures] Upsert error for ${commodity}:`, upsertError);
            }
          }

          const latest = prices[prices.length - 1];
          const previous = prices.length > 1 ? prices[prices.length - 2] : null;
          const change = latest && previous
            ? Math.round((latest.settle - previous.settle) * 10000) / 10000
            : null;
          const changePct = latest && previous && previous.settle
            ? Math.round(((latest.settle - previous.settle) / previous.settle) * 10000) / 100
            : null;

          const config = COMMODITIES[commodity];

          results[commodity] = {
            commodity,
            contractCode: FUTURES_CODES[commodity],
            latestSettle: latest?.settle || null,
            latestDate: latest?.date || null,
            previousSettle: previous?.settle || null,
            change,
            changePct,
            referencePrice: config?.effectiveRefPrice || null,
            unit: config?.unit || null,
            prices,
            count: prices.length,
          };
        } catch (err: any) {
          console.error(`[Futures] Error processing ${commodity}:`, err);
          errors.push(`${commodity}: ${err.message}`);
          results[commodity] = { commodity, prices: [], error: err.message };
        }
      })
    );

    const marketState = getMarketState();

    return NextResponse.json(
      {
        success: true,
        data: results,
        source: 'yahoo_finance',
        marketState,
        timestamp: new Date().toISOString(),
        ...(errors.length > 0 && { warnings: errors }),
      },
      {
        headers: {
          'Cache-Control': getCacheHeaders(),
        },
      }
    );
  } catch (err: any) {
    console.error('[Futures API] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
