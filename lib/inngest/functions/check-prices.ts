// =============================================================================
// HarvestFile - Check Commodity Prices (Inngest Cron Function)
// Phase 3D: Runs every 6 hours, checks NASS prices against user alerts
// Schema: price_alerts uses created_by, org_id, condition, threshold
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NASS_KEY = process.env.NASS_API_KEY || 'E3837A13-9EC3-3BF9-84EB-B475A476D4A7';

const COMMODITY_MAP: Record<string, { nass: string; priceUnit: string }> = {
  CORN:     { nass: 'CORN',           priceUnit: '/bu' },
  SOYBEANS: { nass: 'SOYBEANS',       priceUnit: '/bu' },
  WHEAT:    { nass: 'WHEAT',          priceUnit: '/bu' },
  SORGHUM:  { nass: 'SORGHUM',        priceUnit: '/bu' },
  RICE:     { nass: 'RICE',           priceUnit: '/cwt' },
  COTTON:   { nass: 'COTTON, UPLAND', priceUnit: '/lb' },
  PEANUTS:  { nass: 'PEANUTS',        priceUnit: '/lb' },
};

async function fetchNASSPrice(commodity: string, state: string): Promise<number | null> {
  try {
    const mapping = COMMODITY_MAP[commodity.toUpperCase()];
    if (!mapping) return null;
    const url = `https://quickstats.nass.usda.gov/api/api_GET/?key=${NASS_KEY}&source_desc=SURVEY&commodity_desc=${encodeURIComponent(mapping.nass)}&statisticcat_desc=PRICE%20RECEIVED&agg_level_desc=STATE&state_alpha=${state}&year__GE=2024&format=JSON`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data?.length) return null;
    const prices = data.data
      .filter((d: any) => d.Value && !['(D)', '(Z)', '(NA)', '(S)'].includes(d.Value))
      .map((d: any) => parseFloat(d.Value.replace(',', '')))
      .filter((v: number) => !isNaN(v));
    if (!prices.length) return null;
    return Math.round((prices.reduce((a: number, b: number) => a + b, 0) / prices.length) * 100) / 100;
  } catch (err) {
    console.error(`NASS price fetch failed for ${commodity}/${state}:`, err);
    return null;
  }
}

export const checkCommodityPrices = inngest.createFunction(
  {
    id: 'check-commodity-prices',
    name: 'Check Commodity Prices & Evaluate Alerts',
    retries: 3,
    concurrency: [{ limit: 1 }],
  },
  { cron: 'TZ=America/Chicago 0 */6 * * *' },
  async ({ step }) => {
    // Step 1: Get all active alerts
    const alerts = await step.run('fetch-active-alerts', async () => {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('id, org_id, created_by, commodity, state, condition, threshold, last_triggered_at, cooldown_minutes, trigger_mode, notify_email')
        .eq('is_active', true);
      if (error) throw new Error(`Failed to fetch alerts: ${error.message}`);
      return data || [];
    });

    if (alerts.length === 0) {
      return { alertsChecked: 0, triggered: 0 };
    }

    // Step 2: Get unique commodity+state combos and fetch prices
    const prices = await step.run('fetch-nass-prices', async () => {
      const combos = Array.from(new Set(alerts.map(a => `${a.commodity}|${a.state || 'OH'}`)));
      const priceMap: Record<string, number | null> = {};
      for (const combo of combos) {
        const [commodity, state] = combo.split('|');
        priceMap[combo] = await fetchNASSPrice(commodity, state);
        await new Promise(r => setTimeout(r, 1500));
      }
      return priceMap;
    });

    // Step 3: Cache prices in commodity_prices table
    await step.run('cache-prices', async () => {
      const entries = Object.entries(prices)
        .filter(([_, p]) => p !== null)
        .map(([combo, price]) => {
          const [commodity, state] = combo.split('|');
          return { commodity, state, price, source: 'NASS', updated_at: new Date().toISOString() };
        });
      if (entries.length > 0) {
        await supabase.from('commodity_prices').upsert(entries, { onConflict: 'commodity,state' });
      }
    });

    // Step 4: Evaluate alerts and build triggered list
    const triggered = await step.run('evaluate-alerts', async () => {
      const results: Array<{
        alertId: string; userId: string; orgId: string; email: string;
        farmerName: string; commodity: string; currentPrice: number;
        threshold: number; condition: string; state: string; priceUnit: string;
      }> = [];

      for (const alert of alerts) {
        const combo = `${alert.commodity}|${alert.state || 'OH'}`;
        const currentPrice = prices[combo];
        if (currentPrice === null || currentPrice === undefined) continue;

        const threshold = parseFloat(alert.threshold);
        // condition: 'above' or 'below' (stored in DB as condition)
        const isTriggered = alert.condition === 'below'
          ? currentPrice <= threshold
          : currentPrice >= threshold;

        if (!isTriggered) continue;

        // Check cooldown
        if (alert.last_triggered_at) {
          const cooldownMs = (alert.cooldown_minutes || 1440) * 60 * 1000;
          if (Date.now() - new Date(alert.last_triggered_at).getTime() < cooldownMs) continue;
        }

        // Skip if notify_email is false
        if (alert.notify_email === false) continue;

        // Look up user email from user_profiles first, then farmers
        let email = '';
        let farmerName = 'Farmer';

        if (alert.created_by) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('email, full_name')
            .eq('id', alert.created_by)
            .single();
          if (profile?.email) {
            email = profile.email;
            farmerName = profile.full_name || 'Farmer';
          } else {
            const { data: farmer } = await supabase
              .from('farmers')
              .select('email, full_name')
              .eq('id', alert.created_by)
              .single();
            if (farmer?.email) {
              email = farmer.email;
              farmerName = farmer.full_name || 'Farmer';
            }
          }
        }

        if (!email) continue;

        results.push({
          alertId: alert.id,
          userId: alert.created_by,
          orgId: alert.org_id,
          email,
          farmerName,
          commodity: alert.commodity,
          currentPrice,
          threshold,
          condition: alert.condition,
          state: alert.state || 'OH',
          priceUnit: COMMODITY_MAP[alert.commodity.toUpperCase()]?.priceUnit || '/bu',
        });

        // Update alert
        const updateData: Record<string, any> = {
          last_triggered_at: new Date().toISOString(),
          last_notified_price: currentPrice,
          trigger_count: (alert as any).trigger_count ? (alert as any).trigger_count + 1 : 1,
        };
        if (alert.trigger_mode === 'once') {
          updateData.is_active = false;
        }
        await supabase.from('price_alerts').update(updateData).eq('id', alert.id);
      }

      return results;
    });

    // Step 5: Fan out email notifications
    if (triggered.length > 0) {
      await step.sendEvent(
        'fan-out-alert-emails',
        triggered.map((t) => ({
          name: 'app/alert.triggered' as const,
          data: t,
        }))
      );
    }

    return { alertsChecked: alerts.length, triggered: triggered.length };
  }
);
