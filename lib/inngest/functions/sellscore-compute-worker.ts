// =============================================================================
// HarvestFile — Sell Score Compute Worker (B2)
// lib/inngest/functions/sellscore-compute-worker.ts
//
// Triggered by: 'sellscore/compute.requested' events (fanned out from cron).
// One event per farm per day.
//
// Each worker:
//   1. Parses the recommendation date passed from the cron (UTC noon anchor)
//   2. Calls computeAndPersistForFarm via service-role Supabase client
//   3. Returns outcome summary for Inngest dashboard observability
//
// Idempotency: computeAndPersistForFarm has check-then-write semantics
// (one row per farm/crop/recommendation_date). Re-running for the same
// date overwrites the row. Safe under retries.
//
// Concurrency: 3 to bound Barchart sandbox API rate. Each compute takes
// 4-7 seconds for two crops; three concurrent workers process roughly
// 30 farms per minute. Tune up once we measure real Barchart rate limits.
//
// Inngest retries: 3 attempts with exponential backoff. Transient Barchart
// errors (5xx, timeouts) get retried automatically; persistent errors
// (missing position rows, county not in reference set) fail permanently
// after 3 attempts and surface in the dashboard.
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';
import { computeAndPersistForFarm } from '@/lib/sellscore/persist';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const sellscoreComputeWorker = inngest.createFunction(
  {
    id: 'sellscore-compute-worker',
    name: 'Sell Score Compute (Per-Farm Worker)',
    retries: 3,
    concurrency: [{ limit: 3 }], // Conservative for Barchart sandbox
  },
  { event: 'sellscore/compute.requested' },
  async ({ event, step }) => {
    const { farmId, recommendationDate } = event.data;

    // Parse the date string from the cron as UTC noon. Using noon (not
    // midnight) avoids edge cases where a midnight-UTC date in ET could
    // resolve to the previous calendar day for some downstream calcs.
    const date = new Date(`${recommendationDate}T12:00:00Z`);

    const outcome = await step.run('compute-and-persist', async () => {
      return computeAndPersistForFarm(adminClient, farmId, date);
    });

    // Return value shows up in Inngest dashboard for observability.
    return {
      farmId,
      recommendationDate,
      written: outcome.written,
      errorCount: outcome.errors.length,
      errors: outcome.errors,
      recommendationIds: outcome.recommendationIds,
    };
  },
);