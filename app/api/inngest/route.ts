// =============================================================================
// HarvestFile - Inngest API Route
// Phase 14A: Added commodity price fetch + MYA snapshot crons
// =============================================================================

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { checkCommodityPrices } from '@/lib/inngest/functions/check-prices';
import { sendAlertEmail } from '@/lib/inngest/functions/send-alert-email';
import { trialEmailSequence } from '@/lib/inngest/functions/trial-sequence';
import { fetchFuturesPrices, recomputeMYASnapshots } from '@/lib/inngest/functions/fetch-commodity-data';

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
