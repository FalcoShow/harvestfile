// =============================================================================
// HarvestFile — Phase 14A: Commodity Price Fetch (Inngest Cron)
// lib/inngest/functions/fetch-commodity-data.ts
//
// Two crons:
// 1. Hourly during market hours (7 AM - 4 PM CT, weekdays): Fetch futures
// 2. Daily at 4:30 PM CT: Recompute MYA snapshots from all available data
//
// Data sources:
//   - Nasdaq Data Link CHRIS database (futures settlement prices)
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

const NASDAQ_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY || '';
const NASS_API_KEY = process.env.NASS_API_KEY || '';

// Nasdaq CHRIS codes
const FUTURES_CODES: Record<string, string> = {
  CORN: 'CHRIS/CME_C1',
  SOYBEANS: 'CHRIS/CME_S1',
  WHEAT: 'CHRIS/CME_W1',
  OATS: 'CHRIS/CME_O1',
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

// ─── Cron 1: Fetch futures prices hourly during market hours ─────────────────

export const fetchFuturesPrices = inngest.createFunction(
  {
    id: 'fetch-futures-prices',
    retries: 3,
  },
  { cron: 'TZ=America/Chicago 0 7-16 * * 1-5' },
  async ({ step }) => {
    if (!NASDAQ_API_KEY) {
      console.warn('[FetchFutures] NASDAQ_DATA_LINK_API_KEY not set, skipping');
      return { skipped: true, reason: 'no_api_key' };
    }

    const results: Record<string, { stored: number; error?: string }> = {};

    // Fetch each commodity in parallel steps
    for (const commodity of Object.keys(FUTURES_CODES)) {
      const result = await step.run(`fetch-${commodity.toLowerCase()}`, async (): Promise<{ stored: number; error?: string }> => {
        const code = FUTURES_CODES[commodity];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Last 7 days
        const startStr = startDate.toISOString().split('T')[0];

        const url = `https://data.nasdaq.com/api/v3/datasets/${code}.json?api_key=${NASDAQ_API_KEY}&start_date=${startStr}&order=asc`;

        try {
          const res = await fetch(url);
          if (!res.ok) return { stored: 0, error: `HTTP ${res.status}` };

          const json = await res.json();
          const columns: string[] = json?.dataset?.column_names || [];
          const data: any[][] = json?.dataset?.data || [];

          const settleIdx = columns.indexOf('Settle');
          const dateIdx = columns.indexOf('Date');
          const openIdx = columns.indexOf('Open');
          const highIdx = columns.indexOf('High');
          const lowIdx = columns.indexOf('Low');
          const volIdx = columns.indexOf('Volume');
          const oiIdx = columns.indexOf('Previous Day Open Interest');

          if (settleIdx === -1 || dateIdx === -1) {
            return { stored: 0, error: 'Missing Settle or Date column' };
          }

          const rows = data
            .filter((r) => r[settleIdx] !== null)
            .map((r) => ({
              commodity,
              contract_code: code,
              price_date: r[dateIdx],
              settle: r[settleIdx],
              open_price: openIdx >= 0 ? r[openIdx] : null,
              high: highIdx >= 0 ? r[highIdx] : null,
              low: lowIdx >= 0 ? r[lowIdx] : null,
              volume: volIdx >= 0 ? r[volIdx] : null,
              open_interest: oiIdx >= 0 ? r[oiIdx] : null,
              source: 'nasdaq_chris',
              fetched_at: new Date().toISOString(),
            }));

          if (rows.length > 0) {
            const { error } = await supabase
              .from('futures_prices')
              .upsert(rows, { onConflict: 'commodity,price_date,contract_code' });

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

            const monthNum = parseInt(rec.begin_code);
            const year = parseInt(rec.year);
            if (!monthNum || !year) continue;

            // Determine marketing year for this month
            const dateForMY = new Date(year, monthNum - 1, 15);
            const my = getMarketingYear(code, dateForMY);
            if (!my) continue;

            const monthLabels = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
              'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

            const { error } = await supabase
              .from('monthly_prices')
              .upsert({
                commodity: code,
                marketing_year: my,
                month_num: monthNum,
                month_label: monthLabels[monthNum] || '',
                price,
                is_actual: true,
                source: 'nass',
                fetched_at: new Date().toISOString(),
              }, { onConflict: 'commodity,marketing_year,month_num' });

            if (!error) stored++;
          }

          updates[code] = stored;
        } catch (err) {
          console.error(`[MYA] NASS fetch failed for ${code}:`, err);
        }
      }

      return { checked: true, updates };
    });

    // Step 2: Recompute MYA snapshots for each commodity
    for (const commodity of COMMODITY_ORDER) {
      results[commodity] = await step.run(`mya-${commodity.toLowerCase()}`, async () => {
        try {
          const config = COMMODITIES[commodity];
          if (!config) return { error: 'Unknown commodity' };

          const marketingYear = getMarketingYear(commodity);
          if (!marketingYear) return { error: 'Could not determine marketing year' };

          // Fetch actual monthly prices
          const { data: monthlyPrices } = await supabase
            .from('monthly_prices')
            .select('month_num, price, is_actual')
            .eq('commodity', commodity)
            .eq('marketing_year', marketingYear);

          // Fetch marketing weights
          const { data: weightRows } = await supabase
            .from('marketing_weights')
            .select('month_num, weight')
            .eq('commodity', commodity);

          // Fetch latest futures settle for projection
          const { data: latestFutures } = await supabase
            .from('futures_prices')
            .select('settle')
            .eq('commodity', commodity)
            .order('price_date', { ascending: false })
            .limit(1)
            .single();

          // Build maps
          const actualMap = new Map<number, number>();
          (monthlyPrices || [])
            .filter((p) => p.is_actual && p.price !== null)
            .forEach((p) => actualMap.set(p.month_num, parseFloat(p.price)));

          const projMap = new Map<number, number>();
          // Use latest futures settle as proxy for all unprojected months
          // (Simplified — full implementation would use per-month basis adjustment)
          if (latestFutures?.settle) {
            const futuresPrice = parseFloat(latestFutures.settle);
            const myMonths = getMarketingYearMonths(commodity, marketingYear);
            for (const m of myMonths) {
              if (!actualMap.has(m.month)) {
                projMap.set(m.month, futuresPrice);
              }
            }
          }

          const weightMap = new Map<number, number>();
          (weightRows || []).forEach((w) =>
            weightMap.set(w.month_num, parseFloat(w.weight))
          );

          // Calculate
          const calc = calculateMYA({
            commodity,
            marketingYear,
            actualPrices: actualMap,
            projectedPrices: projMap,
            weights: weightMap,
          });

          // Store snapshot
          const { error: snapError } = await supabase
            .from('mya_snapshots')
            .insert({
              commodity,
              marketing_year: marketingYear,
              months_actual: calc.monthsActual,
              months_projected: calc.monthsProjected,
              partial_mya: calc.partialMYA,
              projected_mya: calc.projectedMYA,
              confidence: calc.confidence,
              statutory_ref_price: calc.statutoryRefPrice,
              effective_ref_price: calc.effectiveRefPrice,
              plc_payment_rate: calc.plcPaymentRate,
              plc_payment_per_acre: calc.plcPaymentPerAcre,
              arc_benchmark_revenue: calc.arcBenchmarkRevenue,
              methodology: 'ers_futures_basis',
              source_data: { months: calc.months },
            });

          if (snapError) {
            console.error(`[MYA] Snapshot insert failed for ${commodity}:`, snapError);
            return { error: snapError.message };
          }

          return {
            marketingYear,
            monthsActual: calc.monthsActual,
            projectedMYA: calc.projectedMYA,
            plcPaymentRate: calc.plcPaymentRate,
            confidence: calc.confidence,
          };
        } catch (err: any) {
          return { error: err.message };
        }
      });
    }

    // Step 3: Trigger cache revalidation
    await step.run('revalidate-cache', async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      try {
        await fetch(`${appUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'commodity-prices' }),
        });
      } catch {
        // Revalidation is best-effort
      }
    });

    return {
      success: true,
      nassUpdates,
      myaSnapshots: results,
      computedAt: new Date().toISOString(),
    };
  }
);
