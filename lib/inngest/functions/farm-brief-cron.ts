// =============================================================================
// HarvestFile — Deploy 4: 5 AM Farm Brief Cron Functions
// lib/inngest/functions/farm-brief-cron.ts
//
// Four timezone-aware cron functions that fire at 5:00 AM local time:
//   - ET (America/New_York)    → covers OH, MI, IN, PA, GA, NC, SC, etc.
//   - CT (America/Chicago)     → covers IL, IA, MN, WI, MO, TX, NE, KS, etc.
//   - MT (America/Denver)      → covers CO, MT, WY, NM, UT, ID, AZ
//   - PT (America/Los_Angeles) → covers CA, OR, WA, NV
//
// Each cron:
//   1. Fetches shared market data (futures prices — same for all subscribers)
//   2. Queries active subscribers for this timezone group
//   3. Fans out 'digest/farm-brief.send' events via step.sendEvent()
//
// The natural 1-hour stagger between timezones ensures peak load never
// exceeds one timezone batch at a time.
//
// Constraints:
//   - Inngest free plan: concurrency limit 5
//   - Resend Pro: 50K emails/month (~1,667/day ceiling)
//   - step.sendEvent() supports up to 5,000 events per call
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Shared market data fetcher ───────────────────────────────────────────────
// Fetches latest futures prices from our futures_prices table (populated by
// the existing fetchFuturesPrices cron). Returns $/unit (already converted
// from cents by the fetch-commodity-data.ts function).

interface CommodityPrice {
  price: number | null;
  change: number | null;
  deferred: number | null;
}

interface MarketData {
  corn: CommodityPrice;
  soybeans: CommodityPrice;
  wheat: CommodityPrice;
  fetchedAt: string;
}

async function fetchMarketData(): Promise<MarketData> {
  const commodities = ['CORN', 'SOYBEANS', 'WHEAT'];
  const result: Record<string, CommodityPrice> = {};

  for (const commodity of commodities) {
    try {
      // Get latest 2 trading days for price + change calculation
      const { data } = await supabase
        .from('futures_prices')
        .select('settle, price_date')
        .eq('commodity', commodity)
        .order('price_date', { ascending: false })
        .limit(2);

      const latest = data?.[0]?.settle ?? null;
      const previous = data?.[1]?.settle ?? null;
      const change = latest !== null && previous !== null
        ? Math.round((latest - previous) * 100) / 100
        : null;

      // Get deferred contract price (second month out) if available
      // For now, use the same price — will enhance with Barchart deferred data later
      result[commodity.toLowerCase()] = {
        price: latest,
        change,
        deferred: null, // Placeholder — enhanced with Barchart Phase 2
      };
    } catch (err) {
      console.error(`[FarmBrief] Failed to fetch ${commodity}:`, err);
      result[commodity.toLowerCase()] = { price: null, change: null, deferred: null };
    }
  }

  return {
    corn: result.corn || { price: null, change: null, deferred: null },
    soybeans: result.soybeans || { price: null, change: null, deferred: null },
    wheat: result.wheat || { price: null, change: null, deferred: null },
    fetchedAt: new Date().toISOString(),
  };
}

// ── Subscriber query with cursor-based pagination ────────────────────────────

interface SubscriberRow {
  id: string;
  email: string;
  county_fips: string | null;
  county_name: string | null;
  state_abbr: string | null;
  primary_crop: string | null;
  preferences: Record<string, unknown>;
}

async function fetchActiveSubscribers(
  timezoneGroup: string
): Promise<SubscriberRow[]> {
  const allSubscribers: SubscriberRow[] = [];
  let lastId: string | null = null;
  const PAGE_SIZE = 500;

  // Cursor-based pagination to handle >1,000 subscribers
  while (true) {
    let query = supabase
      .from('subscribers')
      .select('id, email, county_fips, county_name, state_abbr, primary_crop, preferences')
      .eq('status', 'active')
      .eq('timezone_group', timezoneGroup)
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[FarmBrief] Subscriber query error (${timezoneGroup}):`, error);
      break;
    }

    if (!data || data.length === 0) break;

    allSubscribers.push(...data);
    lastId = data[data.length - 1].id;

    if (data.length < PAGE_SIZE) break; // Last page
  }

  return allSubscribers;
}

// ── Cron factory ─────────────────────────────────────────────────────────────
// Creates a timezone-specific cron function. All four share the same logic.

function createFarmBriefCron(timezoneGroup: string, tzName: string, cronSchedule: string) {
  return inngest.createFunction(
    {
      id: `farm-brief-cron-${timezoneGroup.toLowerCase()}`,
      name: `5 AM Farm Brief — ${timezoneGroup}`,
      retries: 3,
      concurrency: [{ limit: 1 }], // Only one instance per timezone
    },
    { cron: cronSchedule },
    async ({ step }) => {
      const sendDate = new Date().toISOString().split('T')[0];

      // Step 1: Fetch shared market data (same for all subscribers)
      const marketData = await step.run(`fetch-market-data-${timezoneGroup.toLowerCase()}`, async () => {
        return fetchMarketData();
      });

      // Step 2: Fetch all active subscribers for this timezone
      const subscribers = await step.run(`fetch-subscribers-${timezoneGroup.toLowerCase()}`, async () => {
        return fetchActiveSubscribers(timezoneGroup);
      });

      if (subscribers.length === 0) {
        return {
          timezoneGroup,
          subscribers: 0,
          fanned: 0,
          sendDate,
          message: `No active ${timezoneGroup} subscribers`,
        };
      }

      // Step 3: Fan out individual send events
      // step.sendEvent supports up to 5,000 events per call
      const events = subscribers.map((sub) => ({
        name: 'digest/farm-brief.send' as const,
        data: {
          subscriberId: sub.id,
          email: sub.email,
          timezoneGroup,
          countyFips: sub.county_fips,
          countyName: sub.county_name,
          stateAbbr: sub.state_abbr,
          primaryCrop: sub.primary_crop,
          preferences: sub.preferences || {},
          marketData,
          sendDate,
        },
      }));

      // Batch in chunks of 5,000 (Inngest limit per sendEvent call)
      const BATCH_SIZE = 5000;
      let totalFanned = 0;

      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        await step.sendEvent(
          `fan-out-${timezoneGroup.toLowerCase()}-batch-${Math.floor(i / BATCH_SIZE)}`,
          batch
        );
        totalFanned += batch.length;
      }

      return {
        timezoneGroup,
        subscribers: subscribers.length,
        fanned: totalFanned,
        sendDate,
        cornPrice: marketData.corn.price,
        soybeanPrice: marketData.soybeans.price,
        wheatPrice: marketData.wheat.price,
      };
    }
  );
}

// ── Export the four cron functions ────────────────────────────────────────────

export const farmBriefCronET = createFarmBriefCron(
  'ET',
  'America/New_York',
  'TZ=America/New_York 0 5 * * *'
);

export const farmBriefCronCT = createFarmBriefCron(
  'CT',
  'America/Chicago',
  'TZ=America/Chicago 0 5 * * *'
);

export const farmBriefCronMT = createFarmBriefCron(
  'MT',
  'America/Denver',
  'TZ=America/Denver 0 5 * * *'
);

export const farmBriefCronPT = createFarmBriefCron(
  'PT',
  'America/Los_Angeles',
  'TZ=America/Los_Angeles 0 5 * * *'
);
