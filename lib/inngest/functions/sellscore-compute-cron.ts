// =============================================================================
// HarvestFile — Sell Score Daily Compute Cron (B2)
// lib/inngest/functions/sellscore-compute-cron.ts
//
// Runs at 4 AM ET daily. Fans out one event per active Sell Score farm to
// the sellscore-compute-worker, which calls computeAndPersistForFarm for each.
//
// 4 AM ET timing gives the worker pool roughly an hour to drain before
// farmers wake up and either check /sellscore/me or open the 5 AM email
// (B5, scheduled for Friday in the 7-day plan).
//
// Architecture (matches farm-brief-cron pattern):
//   1. Compute today's recommendation date in ET (single source of truth)
//   2. Cursor-paginated query for all sellscore_active=true farms
//   3. step.sendEvent fans out 'sellscore/compute.requested' events
//   4. Worker handles each event independently with its own retry budget
//
// Premortem-informed design choices:
//   - Single cron (not per-timezone). The compute writes to a DB; timezone
//     doesn't affect the write target.
//   - Date string computed ONCE in cron and propagated to every worker
//     event payload. Eliminates UTC-vs-ET drift between worker executions.
//   - Concurrency 1 on the cron (prevents duplicate firings). Concurrency
//     limit on the WORKER bounds Barchart's per-minute rate.
//   - No notification_log idempotency. computeAndPersistForFarm has
//     check-then-write idempotency (one row per farm/crop/date) built in.
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Cursor-paginated query for active Sell Score farms ──────────────────────

interface FarmRow {
  id: string;
}

async function fetchActiveSellScoreFarms(): Promise<FarmRow[]> {
  const all: FarmRow[] = [];
  let lastId: string | null = null;
  const PAGE_SIZE = 500;

  while (true) {
    let query = supabase
      .from('farms')
      .select('id')
      .eq('sellscore_active', true)
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SellScoreComputeCron] Farm query error:', error);
      break;
    }

    if (!data || data.length === 0) break;

    all.push(...data);
    lastId = data[data.length - 1].id;

    if (data.length < PAGE_SIZE) break;
  }

  return all;
}

// ── The cron function ────────────────────────────────────────────────────────

export const sellscoreComputeCron = inngest.createFunction(
  {
    id: 'sellscore-compute-cron',
    name: 'Sell Score Daily Compute (4 AM ET)',
    retries: 3,
    concurrency: [{ limit: 1 }], // Prevent duplicate cron runs
  },
  { cron: 'TZ=America/New_York 0 4 * * *' },
  async ({ step }) => {
    // Step 1: Compute today's recommendation date in ET, once, for all workers.
    // Intl.DateTimeFormat with en-CA gives YYYY-MM-DD format directly.
    const recommendationDate = await step.run('compute-date', async () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date()); // 'YYYY-MM-DD' in ET
    });

    // Step 2: Fetch all active farms
    const farms = await step.run('fetch-active-farms', async () => {
      return fetchActiveSellScoreFarms();
    });

    if (farms.length === 0) {
      return {
        recommendationDate,
        activeFarms: 0,
        fanned: 0,
        message: 'No active Sell Score farms today',
      };
    }

    // Step 3: Fan out one event per farm
    const events = farms.map((farm) => ({
      name: 'sellscore/compute.requested' as const,
      data: {
        farmId: farm.id,
        recommendationDate,
      },
    }));

    // Batch in chunks of 5,000 (Inngest's per-sendEvent ceiling)
    const BATCH_SIZE = 5000;
    let totalFanned = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      await step.sendEvent(
        `fan-out-batch-${Math.floor(i / BATCH_SIZE)}`,
        batch,
      );
      totalFanned += batch.length;
    }

    return {
      recommendationDate,
      activeFarms: farms.length,
      fanned: totalFanned,
    };
  },
);