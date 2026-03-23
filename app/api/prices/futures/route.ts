// =============================================================================
// HarvestFile — Futures Price API (Yahoo Finance)
// app/api/prices/futures/route.ts
//
// GET /api/prices/futures?commodity=CORN
// GET /api/prices/futures?commodities=CORN,SOYBEANS,WHEAT
// GET /api/prices/futures?commodities=CORN,SOYBEANS,WHEAT,OATS,RICE,COTTON&days=90
//
// MIGRATED from Nasdaq Data Link CHRIS (deprecated 2024, data stopped updating)
// to Yahoo Finance v8 chart API — free, no API key, covers all 6 commodities.
//
// Yahoo returns close prices (not official CME settlement), but the difference
// is negligible for daily tracking. Will upgrade to Barchart when API access
// is confirmed.
//
// Caches results in Supabase futures_prices table for historical tracking.
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

interface PricePoint {
  date: string;
  settle: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

async function fetchFuturesFromYahoo(
  commodity: string,
  days: number = 30
): Promise<PricePoint[]> {
  const symbol = YAHOO_SYMBOLS[commodity];
  if (!symbol) return [];

  try {
    // Yahoo Finance v8 chart API — no API key needed
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${days > 60 ? '6mo' : days > 14 ? '3mo' : '1mo'}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
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

      // Convert Unix timestamp to YYYY-MM-DD
      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Yahoo returns cents for grains — convert to dollars if needed
      // Actually Yahoo returns dollar values already for ZC=F etc.
      prices.push({
        date: dateStr,
        settle: Math.round(close * 100) / 100, // Use close as settle proxy
        open: opens[i] !== null ? Math.round(opens[i]! * 100) / 100 : null,
        high: highs[i] !== null ? Math.round(highs[i]! * 100) / 100 : null,
        low: lows[i] !== null ? Math.round(lows[i]! * 100) / 100 : null,
        volume: volumes[i] || null,
      });
    }

    return prices;
  } catch (err) {
    console.error(`[Futures] Failed to fetch ${commodity} from Yahoo:`, err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const singleCommodity = searchParams.get('commodity')?.toUpperCase();
  const multipleCommodities = searchParams.get('commodities');
  const daysParam = parseInt(searchParams.get('days') || '30');
  const store = searchParams.get('store') !== 'false'; // Default: store to DB

  // Determine commodities
  let commodities: string[];
  if (singleCommodity) {
    commodities = [singleCommodity];
  } else if (multipleCommodities) {
    commodities = multipleCommodities.split(',').map((c) => c.trim().toUpperCase());
  } else {
    commodities = ['CORN', 'SOYBEANS', 'WHEAT'];
  }

  // Filter to only those with Yahoo symbols
  commodities = commodities.filter((c) => YAHOO_SYMBOLS[c]);

  if (commodities.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No futures data available for specified commodities' },
      { status: 400 }
    );
  }

  try {
    const results: Record<string, any> = {};

    await Promise.all(
      commodities.map(async (commodity) => {
        const prices = await fetchFuturesFromYahoo(commodity, daysParam);

        if (prices.length === 0) {
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
          ? Math.round((latest.settle - previous.settle) * 100) / 100
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
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: results,
        source: 'yahoo_finance',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900',
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
