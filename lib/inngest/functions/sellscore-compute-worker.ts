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
//   3. Throws on total failure (no writes, any errors) so Inngest retries
//      and the run surfaces red in the dashboard
//   4. Returns outcome summary for Inngest dashboard observability
//
// Codified learning #15 (May 13, 2026):
//   A worker that returns { written: 0, errors: [...] } without throwing
//   is logged as a successful run by Inngest and does NOT trigger retries.
//   We caught this on the first B2 cron run when a pre-Deploy-2 farm with
//   malformed county_fips silently produced zero writes. The throw below
//   forces Inngest to retry up to 3x AND turns the run red in the dashboard.
//
//   Partial success (some crops wrote, others errored) does NOT throw —
//   retrying won't help with permanent per-crop data issues, and partial
//   writes are still useful to the farmer for the crops that succeeded.
//
// Idempotency: computeAndPersistForFarm has check-then-write semantics
// (one row per farm/crop/recommendation_date). Re-running for the same
// date overwrites the data fields but preserves created_at. Safe under
// retries.
//
// Concurrency: 3 to bound Barchart sandbox API rate. Each compute takes
// 4-7 seconds for two crops; three concurrent workers process roughly
// 30 farms per minute.
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

    // Codified learning #15: surface total compute failure so Inngest
    // retries (3x) and the run shows red in the dashboard. Without this,
    // a farm with malformed data silently produces zero recommendations
    // every day and we never see it.
    if (outcome.written === 0 && outcome.errors.length > 0) {
      throw new Error(
        `Sell Score compute produced no writes for farm ${farmId} on ${recommendationDate}. ` +
        `All ${outcome.errors.length} crop computation(s) errored. ` +
        `Errors: ${JSON.stringify(outcome.errors)}`,
      );
    }

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