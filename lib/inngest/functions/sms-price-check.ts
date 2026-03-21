// =============================================================================
// HarvestFile — SMS Price Alert Cron (Inngest Scheduled Function)
// Phase 19: Runs daily at 7:00 AM Central on weekdays
//
// Checks commodity prices against SMS subscriber thresholds, then fans out
// individual 'app/sms.alert.send' events for each triggered alert.
// Pattern matches check-prices.ts — fetch prices, evaluate, fan out.
//
// Also handles: MYA price update notifications (monthly), WASDE alerts
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Commodity price unit mapping ─────────────────────────────────────────────
const PRICE_UNITS: Record<string, string> = {
  CORN: '/bu', SOYBEANS: '/bu', WHEAT: '/bu', SORGHUM: '/bu',
  RICE: '/cwt', COTTON: '/lb', PEANUTS: '/lb', BARLEY: '/bu',
  OATS: '/bu', SUNFLOWER: '/cwt', CANOLA: '/cwt',
};

export const smsPriceAlertCron = inngest.createFunction(
  {
    id: 'sms-price-alert-cron',
    name: 'SMS Price Alert Check (Daily)',
    retries: 3,
    concurrency: [{ limit: 1 }],
  },
  { cron: 'TZ=America/Chicago 0 7 * * 1-5' }, // 7:00 AM CT, weekdays
  async ({ step }) => {
    // Step 1: Get all active SMS subscriptions with price threshold alerts
    const subscriptions = await step.run('fetch-sms-subscribers', async () => {
      const { data, error } = await supabase
        .from('sms_subscriptions')
        .select(`
          id,
          phone,
          timezone,
          user_id,
          org_id,
          alert_types,
          commodity_preferences,
          price_thresholds
        `)
        .eq('is_active', true)
        .is('opt_out_at', null);

      if (error) throw new Error(`Failed to fetch SMS subscriptions: ${error.message}`);
      return data || [];
    });

    if (subscriptions.length === 0) {
      return { subscribers: 0, alertsSent: 0, message: 'No active SMS subscribers' };
    }

    // Step 2: Get latest commodity prices from our cache
    const latestPrices = await step.run('fetch-cached-prices', async () => {
      const { data, error } = await supabase
        .from('commodity_prices')
        .select('commodity, price, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch prices: ${error.message}`);

      // Deduplicate — latest price per commodity
      const priceMap: Record<string, { price: number; updated_at: string }> = {};
      for (const row of data || []) {
        const key = row.commodity.toUpperCase();
        if (!priceMap[key]) {
          priceMap[key] = { price: row.price, updated_at: row.updated_at };
        }
      }
      return priceMap;
    });

    // Step 3: Evaluate each subscriber's thresholds against current prices
    const alertsToSend = await step.run('evaluate-thresholds', async () => {
      const alerts: Array<{
        subscriptionId: string;
        phone: string;
        timezone: string;
        alertType: string;
        commodity: string;
        currentPrice: number;
        threshold: number;
        condition: string;
        priceUnit: string;
      }> = [];

      for (const sub of subscriptions) {
        // Parse price thresholds — stored as JSON array:
        // [{ commodity: "CORN", direction: "below", price: 4.00 }, ...]
        const thresholds = sub.price_thresholds || [];

        for (const threshold of thresholds) {
          const commodity = (threshold.commodity || '').toUpperCase();
          const cached = latestPrices[commodity];
          if (!cached) continue;

          const currentPrice = cached.price;
          const targetPrice = parseFloat(threshold.price);
          if (isNaN(targetPrice)) continue;

          const direction = threshold.direction || 'below';
          const isTriggered = direction === 'below'
            ? currentPrice <= targetPrice
            : currentPrice >= targetPrice;

          if (!isTriggered) continue;

          alerts.push({
            subscriptionId: sub.id,
            phone: sub.phone,
            timezone: sub.timezone || 'America/Chicago',
            alertType: 'price_threshold',
            commodity,
            currentPrice,
            threshold: targetPrice,
            condition: direction,
            priceUnit: PRICE_UNITS[commodity] || '/bu',
          });
        }
      }

      return alerts;
    });

    // Step 4: Fan out individual SMS events
    if (alertsToSend.length > 0) {
      await step.sendEvent(
        'fan-out-sms-alerts',
        alertsToSend.map((alert) => ({
          name: 'app/sms.alert.send' as const,
          data: alert,
        }))
      );
    }

    return {
      subscribers: subscriptions.length,
      pricesChecked: Object.keys(latestPrices).length,
      alertsSent: alertsToSend.length,
    };
  }
);

// =============================================================================
// WASDE Report Alert — Triggered manually or by a separate monitoring cron
// Sends a one-line summary to all subscribers who opted into wasde_release alerts
// =============================================================================

export const smsWASDEAlert = inngest.createFunction(
  {
    id: 'sms-wasde-alert',
    name: 'SMS WASDE Report Notification',
    retries: 3,
    concurrency: [{ limit: 1 }],
  },
  { event: 'app/wasde.released' },
  async ({ event, step }) => {
    const { summary } = event.data; // e.g., "Corn stocks unch, beans -25M bu"

    const subscribers = await step.run('fetch-wasde-subscribers', async () => {
      const { data, error } = await supabase
        .from('sms_subscriptions')
        .select('id, phone, timezone')
        .eq('is_active', true)
        .is('opt_out_at', null)
        .contains('alert_types', ['wasde_release']);

      if (error) throw new Error(`Failed to fetch subscribers: ${error.message}`);
      return data || [];
    });

    if (subscribers.length === 0) {
      return { sent: 0 };
    }

    await step.sendEvent(
      'fan-out-wasde-sms',
      subscribers.map((sub) => ({
        name: 'app/sms.alert.send' as const,
        data: {
          subscriptionId: sub.id,
          phone: sub.phone,
          timezone: sub.timezone || 'America/Chicago',
          alertType: 'wasde_release',
          message: `HarvestFile: USDA WASDE released. ${summary} Projections updated. harvestfile.com/dashboard Reply STOP to end`,
        },
      }))
    );

    return { sent: subscribers.length };
  }
);

// =============================================================================
// Enrollment Deadline Alert — Triggered by scheduled events
// Sends countdown reminders at 30, 14, 7, 3, and 1 days before deadline
// =============================================================================

export const smsEnrollmentDeadlineAlert = inngest.createFunction(
  {
    id: 'sms-enrollment-deadline',
    name: 'SMS Enrollment Deadline Reminder',
    retries: 3,
    concurrency: [{ limit: 1 }],
  },
  { event: 'app/enrollment.deadline.reminder' },
  async ({ event, step }) => {
    const { daysUntil, deadlineDate } = event.data;

    const subscribers = await step.run('fetch-deadline-subscribers', async () => {
      const { data, error } = await supabase
        .from('sms_subscriptions')
        .select('id, phone, timezone')
        .eq('is_active', true)
        .is('opt_out_at', null)
        .contains('alert_types', ['enrollment_deadline']);

      if (error) throw new Error(`Failed to fetch subscribers: ${error.message}`);
      return data || [];
    });

    if (subscribers.length === 0) {
      return { sent: 0 };
    }

    await step.sendEvent(
      'fan-out-deadline-sms',
      subscribers.map((sub) => ({
        name: 'app/sms.alert.send' as const,
        data: {
          subscriptionId: sub.id,
          phone: sub.phone,
          timezone: sub.timezone || 'America/Chicago',
          alertType: 'enrollment_deadline',
          threshold: daysUntil,
          message: `HarvestFile: ARC/PLC enrollment deadline is ${daysUntil} day${daysUntil !== 1 ? 's' : ''} away (${deadlineDate}). Review elections: harvestfile.com/check Reply STOP to end`,
        },
      }))
    );

    return { sent: subscribers.length, daysUntil };
  }
);
