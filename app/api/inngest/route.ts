// =============================================================================
// HarvestFile — Inngest API Route
// app/api/inngest/route.ts
//
// Deploy 4: Added Farm Brief cron functions (4 timezone crons + 1 worker)
// Build 18 Deploy 6B: Added enrollmentDripCampaign function
// Phase 19: Added SMS alert functions (send-sms-alert, sms-price-check crons)
//
// All Inngest functions must be registered here. When adding new functions:
// 1. Import the function
// 2. Add to the functions array
// 3. Run `npx inngest-cli dev` locally to test
// 4. Deploy — Inngest syncs against www.harvestfile.com automatically
//
// Total functions: 16 (was 11, added 5 for Farm Brief)
// =============================================================================

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { checkCommodityPrices } from '@/lib/inngest/functions/check-prices';
import { sendAlertEmail } from '@/lib/inngest/functions/send-alert-email';
import { trialEmailSequence } from '@/lib/inngest/functions/trial-sequence';
import { fetchFuturesPrices, recomputeMYASnapshots } from '@/lib/inngest/functions/fetch-commodity-data';
import { sendSMSAlert } from '@/lib/inngest/functions/send-sms-alert';
import { smsPriceAlertCron, smsWASDEAlert, smsEnrollmentDeadlineAlert } from '@/lib/inngest/functions/sms-price-check';
import { enrollmentDripCampaign } from '@/lib/inngest/functions/enrollment-drip';

// Deploy 4: Farm Brief digest system
import {
  farmBriefCronET,
  farmBriefCronCT,
  farmBriefCronMT,
  farmBriefCronPT,
} from '@/lib/inngest/functions/farm-brief-cron';
import { sendFarmBrief } from '@/lib/inngest/functions/send-farm-brief';

// Allow up to 5 minutes for Inngest handler (cron functions fetch external APIs)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // ── Existing functions ────────────────────────────────────────────────
    checkCommodityPrices,
    sendAlertEmail,
    trialEmailSequence,
    fetchFuturesPrices,
    recomputeMYASnapshots,
    // ── Phase 19: SMS functions ───────────────────────────────────────────
    sendSMSAlert,
    smsPriceAlertCron,
    smsWASDEAlert,
    smsEnrollmentDeadlineAlert,
    // ── Deploy 6B: Enrollment drip campaign ───────────────────────────────
    enrollmentDripCampaign,
    // ── Deploy 4: 5 AM Farm Brief digest system ──────────────────────────
    farmBriefCronET,
    farmBriefCronCT,
    farmBriefCronMT,
    farmBriefCronPT,
    sendFarmBrief,
  ],
});
