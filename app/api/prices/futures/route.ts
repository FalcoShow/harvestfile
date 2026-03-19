// =============================================================================
// HarvestFile — Phase 14A: Futures Price API
// app/api/prices/futures/route.ts
//
// GET /api/prices/futures?commodity=CORN
// GET /api/prices/futures?commodities=CORN,SOYBEANS,WHEAT
//
// Fetches daily futures settlement prices from Nasdaq Data Link (CHRIS database)
// and caches them in the futures_prices Supabase table.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COMMODITIES } from '@/lib/mya/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NASDAQ_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY || '';

// Nasdaq Data Link CHRIS contract codes
const FUTURES_CODES: Record<string, string> = {
  CORN: 'CHRIS/CME_C1',
  SOYBEANS: 'CHRIS/CME_S1',
  WHEAT: 'CHRIS/CME_W1',
  OATS: 'CHRIS/CME_O1',
  RICE: 'CHRIS/CME_RR1',
  // No exchange-traded futures for sorghum or barley
};

interface NasdaqRow {
  Date: string;
  Open: number | null;
  High: number | null;
  Low: number | null;
  Last: number | null;
  Change: number | null;
  Settle: number | null;
  Volume: number | null;
  'Previous Day Open Interest': number | null;
}

async function fetchFuturesFromNasdaq(
  commodity: string,
  days: number = 30
): Promise<NasdaqRow[]> {
  const code = FUTURES_CODES[commodity];
  if (!code || !NASDAQ_API_KEY) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const url = `https://data.nasdaq.com/api/v3/datasets/${code}.json?api_key=${NASDAQ_API_KEY}&start_date=${startStr}&order=asc`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[Futures] Nasdaq API error for ${commodity}: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const columns: string[] = json?.dataset?.column_names || [];
    const data: any[][] = json?.dataset?.data || [];

    // Map array rows to objects using column names
    return data.map((row) => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj as NasdaqRow;
    });
  } catch (err) {
    console.error(`[Futures] Failed to fetch ${commodity}:`, err);
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

  // Filter to only those with futures codes
  commodities = commodities.filter((c) => FUTURES_CODES[c]);

  if (commodities.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No futures data available for specified commodities' },
      { status: 400 }
    );
  }

  if (!NASDAQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'NASDAQ_DATA_LINK_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const results: Record<string, any> = {};

    await Promise.all(
      commodities.map(async (commodity) => {
        const rows = await fetchFuturesFromNasdaq(commodity, daysParam);

        if (rows.length === 0) {
          results[commodity] = { commodity, prices: [], error: 'No data returned' };
          return;
        }

        // Transform for response
        const prices = rows
          .filter((r) => r.Settle !== null && r.Settle !== undefined)
          .map((r) => ({
            date: r.Date,
            settle: r.Settle,
            open: r.Open,
            high: r.High,
            low: r.Low,
            volume: r.Volume,
          }));

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
            source: 'nasdaq_chris',
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
          ? Math.round((latest.settle! - previous.settle!) * 100) / 100
          : null;
        const changePct = latest && previous && previous.settle
          ? Math.round(((latest.settle! - previous.settle!) / previous.settle!) * 10000) / 100
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
