// =============================================================================
// HarvestFile — Inngest API Route
// Phase 19: Added SMS alert functions (send-sms-alert, sms-price-check crons)
// =============================================================================

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { checkCommodityPrices } from '@/lib/inngest/functions/check-prices';
import { sendAlertEmail } from '@/lib/inngest/functions/send-alert-email';
import { trialEmailSequence } from '@/lib/inngest/functions/trial-sequence';
import { fetchFuturesPrices, recomputeMYASnapshots } from '@/lib/inngest/functions/fetch-commodity-data';
import { sendSMSAlert } from '@/lib/inngest/functions/send-sms-alert';
import { smsPriceAlertCron, smsWASDEAlert, smsEnrollmentDeadlineAlert } from '@/lib/inngest/functions/sms-price-check';

// Allow up to 5 minutes for Inngest handler (cron functions fetch external APIs)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Existing functions
    checkCommodityPrices,
    sendAlertEmail,
    trialEmailSequence,
    fetchFuturesPrices,
    recomputeMYASnapshots,
    // Phase 19: SMS functions
    sendSMSAlert,
    smsPriceAlertCron,
    smsWASDEAlert,
    smsEnrollmentDeadlineAlert,
  ],
});
