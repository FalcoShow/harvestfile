// =============================================================================
// HarvestFile — Commodity Price Fetch (Inngest Cron)
// lib/inngest/functions/fetch-commodity-data.ts
//
// MIGRATED from Nasdaq Data Link CHRIS (deprecated 2024) to Yahoo Finance.
//
// Two crons:
// 1. Hourly during market hours (7 AM - 4 PM CT, weekdays): Fetch futures
// 2. Daily at 4:30 PM CT: Recompute MYA snapshots from all available data
//
// CRITICAL: Yahoo Finance returns raw CME/ICE exchange quotes in CENTS per unit.
// We divide by 100 to convert to $/unit for consistency with USDA reference
// prices, NASS marketing year average prices, and all downstream calculations.
//
// Data sources:
//   - Yahoo Finance v8 chart API (futures close prices — free, no key)
//   - USDA NASS Quick Stats (monthly Price Received — checked daily, updates monthly)
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';
import {
  COMMODITIES,
  COMMODITY_ORDER,
  getMarketingYear,
  getMarketingYearMonths,
} from '@/lib/mya/constants';
import { calculateMYA } from '@/lib/mya/calculator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NASS_API_KEY = process.env.NASS_API_KEY || '';

// Yahoo Finance symbols (replaces dead Nasdaq CHRIS codes)
const YAHOO_SYMBOLS: Record<string, string> = {
  CORN: 'ZC=F',
  SOYBEANS: 'ZS=F',
  WHEAT: 'ZW=F',
  OATS: 'ZO=F',
  RICE: 'ZR=F',
  COTTON: 'CT=F',
};

// NASS commodity names
const NASS_COMMODITIES: Record<string, string> = {
  CORN: 'CORN',
  SOYBEANS: 'SOYBEANS',
  WHEAT: 'WHEAT',
  SORGHUM: 'SORGHUM',
  BARLEY: 'BARLEY',
  OATS: 'OATS',
};

// ─── Cents → Dollars conversion ──────────────────────────────────────────────
// All CME/ICE commodity futures are quoted in cents per unit on the exchange.
// Yahoo Finance returns the raw exchange quote. We convert to dollars here
// so stored values in futures_prices match USDA prices ($/bu, $/cwt, $/lb).
// ─────────────────────────────────────────────────────────────────────────────
function centsToDollars(cents: number): number {
  return Math.round((cents / 100) * 10000) / 10000;
}

// ─── Cron 1: Fetch futures prices hourly during market hours ─────────────────

export const fetchFuturesPrices = inngest.createFunction(
  {
    id: 'fetch-futures-prices',
    retries: 3,
  },
  { cron: 'TZ=America/Chicago 0 7-16 * * 1-5' },
  async ({ step }) => {
    const results: Record<string, { stored: number; error?: string }> = {};

    for (const commodity of Object.keys(YAHOO_SYMBOLS)) {
      const result = await step.run(`fetch-${commodity.toLowerCase()}`, async (): Promise<{ stored: number; error?: string }> => {
        const symbol = YAHOO_SYMBOLS[commodity];

        try {
          const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=7d`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });

          if (!res.ok) return { stored: 0, error: `HTTP ${res.status}` };

          const json = await res.json();
          const chartResult = json?.chart?.result?.[0];
          if (!chartResult) return { stored: 0, error: 'No chart result' };

          const timestamps: number[] = chartResult.timestamp || [];
          const quote = chartResult.indicators?.quote?.[0];
          if (!quote || timestamps.length === 0) return { stored: 0, error: 'No quote data' };

          const closes: (number | null)[] = quote.close || [];
          const opens: (number | null)[] = quote.open || [];
          const highs: (number | null)[] = quote.high || [];
          const lows: (number | null)[] = quote.low || [];
          const volumes: (number | null)[] = quote.volume || [];

          const rows = timestamps
            .map((ts, i) => {
              const close = closes[i];
              if (close === null || close === undefined) return null;
              const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
              return {
                commodity,
                contract_code: symbol,
                price_date: dateStr,
                settle: centsToDollars(close),
                open_price: opens[i] !== null ? centsToDollars(opens[i]!) : null,
                high: highs[i] !== null ? centsToDollars(highs[i]!) : null,
                low: lows[i] !== null ? centsToDollars(lows[i]!) : null,
                volume: volumes[i] || null,
                open_interest: null,
                source: 'yahoo_finance',
                fetched_at: new Date().toISOString(),
              };
            })
            .filter(Boolean);

          if (rows.length > 0) {
            const { error } = await supabase
              .from('futures_prices')
              .upsert(rows as any[], { onConflict: 'commodity,price_date,contract_code' });

            if (error) return { stored: 0, error: error.message };
          }

          return { stored: rows.length };
        } catch (err: any) {
          return { stored: 0, error: err.message };
        }
      });

      results[commodity] = result as { stored: number; error?: string };
    }

    return { success: true, results, fetchedAt: new Date().toISOString() };
  }
);

// ─── Cron 2: Check NASS monthly prices & recompute MYA snapshots ─────────────

export const recomputeMYASnapshots = inngest.createFunction(
  {
    id: 'recompute-mya-snapshots',
    retries: 2,
  },
  { cron: 'TZ=America/Chicago 30 16 * * 1-5' },
  async ({ step }) => {
    const results: Record<string, any> = {};

    // Step 1: Check NASS for any new monthly prices
    const nassUpdates = await step.run('check-nass-monthly', async () => {
      if (!NASS_API_KEY) return { checked: false, reason: 'no_nass_key' };

      const updates: Record<string, number> = {};

      for (const [code, nassName] of Object.entries(NASS_COMMODITIES)) {
        try {
          const config = COMMODITIES[code];
          if (!config) continue;

          const url = new URL('https://quickstats.nass.usda.gov/api/api_GET/');
          url.searchParams.set('key', NASS_API_KEY);
          url.searchParams.set('format', 'JSON');
          url.searchParams.set('source_desc', 'SURVEY');
          url.searchParams.set('commodity_desc', nassName);
          url.searchParams.set('statisticcat_desc', 'PRICE RECEIVED');
          url.searchParams.set('unit_desc', config.nassPriceUnit);
          url.searchParams.set('freq_desc', 'MONTHLY');
          url.searchParams.set('agg_level_desc', 'NATIONAL');
          url.searchParams.set('year__GE', '2024');

          const res = await fetch(url.toString());
          if (!res.ok) continue;

          const json = await res.json();
          const records = json?.data || [];

          let stored = 0;
          for (const rec of records) {
            const val = rec.Value?.replace(/,/g, '').trim();
            if (!val || ['(D)', '(Z)', '(NA)', '(S)'].includes(val)) continue;
            const price = parseFloat(val);
            if (isNaN(price)) continue;

            const monthName = rec.reference_period_desc?.toUpperCase();
            const year = parseInt(rec.year);
            const monthNum = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(monthName) + 1;
            if (!monthNum || !year) continue;

            const { error } = await supabase
              .from('commodity_prices')
              .upsert(
                {
                  commodity: code,
                  year,
                  month: monthNum,
                  price,
                  source: 'nass_monthly',
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'commodity,year,month' }
              );

            if (!error) stored++;
          }

          updates[code] = stored;
        } catch (err) {
          console.error(`[MYA] NASS fetch error for ${code}:`, err);
        }
      }

      return { checked: true, updates };
    });

    results.nassUpdates = nassUpdates;

    // Step 2: Recompute MYA snapshots for current marketing year
    const myaResults = await step.run('recompute-mya', async () => {
      const snapshots: Record<string, any> = {};

      for (const code of COMMODITY_ORDER) {
        try {
          const config = COMMODITIES[code];
          if (!config) continue;

          const marketingYear = getMarketingYear(code);
          const months = getMarketingYearMonths(code, marketingYear);

          // Fetch all monthly prices for this commodity and marketing year
          const yearSet = new Set(months.map((m) => m.year));
          const { data: monthlyPrices } = await supabase
            .from('commodity_prices')
            .select('year, month, price')
            .eq('commodity', code)
            .in('year', Array.from(yearSet));

          // Fetch latest futures price for forward projection
          // NOTE: After cents→dollars fix, stored futures are in $/unit,
          // matching NASS monthly prices — MYA projection is now correct.
          const { data: latestFutures } = await supabase
            .from('futures_prices')
            .select('settle, price_date')
            .eq('commodity', code)
            .order('price_date', { ascending: false })
            .limit(1);

          const futuresPrice = latestFutures?.[0]?.settle || null;

          // Fetch marketing weights from DB
          const { data: weightRows } = await supabase
            .from('marketing_weights')
            .select('month_num, weight')
            .eq('commodity', code);

          // Build Maps for calculateMYA
          const actualPrices = new Map<number, number>();
          const projectedPrices = new Map<number, number>();
          const weights = new Map<number, number>();

          // Populate weight map from DB or use equal weights
          if (weightRows && weightRows.length > 0) {
            for (const w of weightRows) {
              weights.set(w.month_num, parseFloat(w.weight));
            }
          } else {
            // Equal weight fallback
            for (const m of months) {
              weights.set(m.month, 100 / 12);
            }
          }

          for (const m of months) {
            const actual = (monthlyPrices || []).find(
              (p: any) => p.year === m.year && p.month === m.month
            );
            if (actual) {
              actualPrices.set(m.month, actual.price);
            } else if (futuresPrice) {
              projectedPrices.set(m.month, futuresPrice);
            }
          }

          const mya = calculateMYA({
            commodity: code,
            marketingYear,
            actualPrices,
            projectedPrices,
            weights,
          });

          // Store snapshot
          const { error } = await supabase.from('commodity_prices').upsert(
            {
              commodity: code,
              year: marketingYear,
              month: 0, // 0 = MYA snapshot
              price: mya.projectedMYA,
              source: 'mya_computed',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'commodity,year,month' }
          );

          snapshots[code] = {
            marketingYear,
            projectedMYA: mya.projectedMYA,
            monthsReported: mya.monthsActual,
            futuresPrice,
            error: error?.message || null,
          };
        } catch (err: any) {
          snapshots[code] = { error: err.message };
        }
      }

      return snapshots;
    });

    results.myaSnapshots = myaResults;

    return results;
  }
);
