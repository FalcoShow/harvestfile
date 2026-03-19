// =============================================================================
// HarvestFile - Inngest API Route
// Phase 14B: Added maxDuration, defensive imports for function registration
// =============================================================================

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { checkCommodityPrices } from '@/lib/inngest/functions/check-prices';
import { sendAlertEmail } from '@/lib/inngest/functions/send-alert-email';
import { trialEmailSequence } from '@/lib/inngest/functions/trial-sequence';
import { fetchFuturesPrices, recomputeMYASnapshots } from '@/lib/inngest/functions/fetch-commodity-data';

// Allow up to 5 minutes for Inngest handler (cron functions fetch external APIs)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    checkCommodityPrices,
    sendAlertEmail,
    trialEmailSequence,
    fetchFuturesPrices,
    recomputeMYASnapshots,
  ],
});
