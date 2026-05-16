// =============================================================================
// HarvestFile — Signup Funnel Health Check (Item B)
// lib/inngest/functions/signup-funnel-health-check.ts
//
// Runs at 8 AM ET daily. Catches two silent-failure modes that would kill
// the product without anyone noticing:
//
//   1. STALLED SIGNUPS: A farmer paid (sellscore_active=true) more than
//      24 hours ago but never completed onboarding (sellscore_setup_complete=
//      false). Stripe charged the card, the receipt landed, but the farmer
//      bounced before finishing setup. High refund risk + broken activation.
//
//   2. MISSING RECOMMENDATIONS: An active onboarded farm has no
//      sellscore_recommendations row for today's ET date. The 4 AM compute
//      cron should have written one. Zero rows = silent compute failure that
//      Inngest's retry budget didn't surface as a red dashboard run, OR a
//      data issue specific to that farm.
//
// Sends one plain-text email per day to FOUNDER_ALERT_EMAIL summarizing
// both findings. Always sends while SEND_ALL_CLEAR=true (so Andrew knows
// the cron is alive). Switch to alert-only after the cron has earned trust.
//
// Architecture:
//   - Single cron, no fan-out. One email per day to one recipient.
//   - Service-role Supabase client to bypass RLS on the farms + recs queries.
//   - Concurrency limit 1 prevents duplicate runs during retry storms.
//   - Date comparison uses ET timezone (matches compute cron's date boundary).
//   - Retries 2 (less than compute cron's 3; this isn't critical-path —
//     missing a day's monitor email is recoverable, missing a compute isn't).
//
// Codified learning (May 16, 2026):
//   step.run wraps return values in JsonifyObject<T>, making every field
//   optional after the JSON serialization round-trip. Downstream strict-
//   typed function calls (like buildBody here) need the return value cast
//   back to the original type. Safe when the runner function populates
//   every field unconditionally. See lines 287-293.
//
// Premortem failure mode this addresses:
//   Failure mode F from migration plan: "Phase 1 shipped but we never got
//   paying farmers" — except its variant, "We got paying farmers but the
//   product silently broke for them and we didn't notice for a week."
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const FOUNDER_ALERT_EMAIL = process.env.FOUNDER_ALERT_EMAIL || 'andrew@harvestfile.com';
const FROM_ADDRESS = 'HarvestFile Monitor <monitor@mail.harvestfile.com>';

// Set to false after 30 days of trust-building to switch into alert-only mode.
// With this true, you'll get one email per day regardless. With it false,
// you only get an email when there's something to investigate.
const SEND_ALL_CLEAR = true;

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface StalledSignup {
  farm_id: string;
  email: string;
  farm_name: string;
  hours_stalled: number;
  created_at: string;
}

interface MissingRec {
  farm_id: string;
  email: string;
  farm_name: string;
  last_rec_date: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Query 1: Stalled signups (paid > 24h ago, not onboarded)
// ─────────────────────────────────────────────────────────────────────────

async function findStalledSignups(now: Date): Promise<StalledSignup[]> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('farms')
    .select('id, name, owner_id, created_at')
    .eq('sellscore_active', true)
    .eq('sellscore_setup_complete', false)
    .lt('created_at', cutoff.toISOString());

  if (error || !data) {
    console.error('[FunnelHealth] Stalled signups query error:', error);
    return [];
  }

  // Look up email for each owner via auth.users (service-role admin call).
  // Sequential lookup is fine at current scale (1-N farms). Batch if N > 50.
  const stalled: StalledSignup[] = [];
  for (const row of data) {
    const { data: userData } = await supabase.auth.admin.getUserById(row.owner_id);
    const email = userData?.user?.email ?? '(no email on record)';
    const createdAt = new Date(row.created_at);
    const hoursStalled = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
    );
    stalled.push({
      farm_id: row.id,
      email,
      farm_name: row.name ?? '(unnamed farm)',
      hours_stalled: hoursStalled,
      created_at: row.created_at,
    });
  }

  return stalled;
}

// ─────────────────────────────────────────────────────────────────────────
// Query 2: Active farms with no recommendation row for today
// ─────────────────────────────────────────────────────────────────────────

async function findMissingRecs(todayDate: string): Promise<MissingRec[]> {
  const { data: farms, error: farmsError } = await supabase
    .from('farms')
    .select('id, name, owner_id')
    .eq('sellscore_active', true)
    .eq('sellscore_setup_complete', true);

  if (farmsError || !farms) {
    console.error('[FunnelHealth] Active farms query error:', farmsError);
    return [];
  }

  if (farms.length === 0) return [];

  // Single query for today's recs across all active farms
  const farmIds = farms.map((f) => f.id);
  const { data: recsToday } = await supabase
    .from('sellscore_recommendations')
    .select('farm_id')
    .in('farm_id', farmIds)
    .eq('recommendation_date', todayDate);

  const farmIdsWithRecToday = new Set((recsToday ?? []).map((r) => r.farm_id));
  const missing = farms.filter((f) => !farmIdsWithRecToday.has(f.id));

  if (missing.length === 0) return [];

  // Per missing farm, look up email + last successful recommendation date
  const result: MissingRec[] = [];
  for (const farm of missing) {
    const { data: userData } = await supabase.auth.admin.getUserById(farm.owner_id);
    const email = userData?.user?.email ?? '(no email on record)';

    const { data: lastRec } = await supabase
      .from('sellscore_recommendations')
      .select('recommendation_date')
      .eq('farm_id', farm.id)
      .order('recommendation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    result.push({
      farm_id: farm.id,
      email,
      farm_name: farm.name ?? '(unnamed farm)',
      last_rec_date: lastRec?.recommendation_date ?? null,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// Email composition
// ─────────────────────────────────────────────────────────────────────────

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function buildSubject(
  date: Date,
  stalledCount: number,
  missingCount: number,
): string {
  const dateShort = formatDateShort(date);

  if (stalledCount === 0 && missingCount === 0) {
    return `[HarvestFile] Funnel OK (${dateShort})`;
  }

  const parts: string[] = [];
  if (stalledCount > 0) {
    parts.push(`${stalledCount} stalled signup${stalledCount === 1 ? '' : 's'}`);
  }
  if (missingCount > 0) {
    parts.push(`${missingCount} missing rec${missingCount === 1 ? '' : 's'}`);
  }
  return `[HarvestFile] Funnel alert (${dateShort}): ${parts.join(', ')}`;
}

function buildBody(
  date: Date,
  stalled: StalledSignup[],
  missing: MissingRec[],
): string {
  const lines: string[] = [];
  lines.push('HarvestFile Funnel Health Check');
  lines.push(formatDateLong(date));
  lines.push('');

  lines.push(
    `STALLED SIGNUPS (paid more than 24h ago, not onboarded): ${stalled.length}`,
  );
  if (stalled.length > 0) {
    for (const s of stalled) {
      lines.push(
        `  - ${s.email} | farm: ${s.farm_name} | ${s.hours_stalled}h stalled | created ${s.created_at}`,
      );
    }
  }
  lines.push('');

  lines.push(
    `ACTIVE FARMS MISSING TODAY'S RECOMMENDATION: ${missing.length}`,
  );
  if (missing.length > 0) {
    for (const m of missing) {
      const lastSeen = m.last_rec_date
        ? `last rec ${m.last_rec_date}`
        : 'no recommendations ever';
      lines.push(`  - ${m.email} | farm: ${m.farm_name} | ${lastSeen}`);
    }
  }
  lines.push('');

  if (stalled.length === 0 && missing.length === 0) {
    lines.push('All clear.');
  } else {
    lines.push('Where to look:');
    lines.push('  - Inngest dashboard for failed sellscore-compute-worker runs');
    lines.push('  - Stripe dashboard for recent payments without onboarding');
    lines.push('  - Supabase farms table for the affected farm IDs');
  }
  lines.push('');
  lines.push('harvestfile.com automated monitor');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// The cron function
// ─────────────────────────────────────────────────────────────────────────

export const signupFunnelHealthCheck = inngest.createFunction(
  {
    id: 'signup-funnel-health-check',
    name: 'Signup Funnel Health Check (8 AM ET)',
    retries: 2,
    concurrency: [{ limit: 1 }],
  },
  { cron: 'TZ=America/New_York 0 8 * * *' },
  async ({ step }) => {
    const now = new Date();

    // Today's date in ET — same boundary the compute cron uses to key rows
    const todayDate = await step.run('compute-date', async () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(now);
    });

    // step.run wraps return values in JsonifyObject<T>, making every field
    // optional. Cast back to the strict type — our query functions populate
    // every field unconditionally, so the round-trip is lossless.
    const stalled = (await step.run('find-stalled-signups', async () => {
      return findStalledSignups(now);
    })) as StalledSignup[];

    const missing = (await step.run('find-missing-recs', async () => {
      return findMissingRecs(todayDate);
    })) as MissingRec[];

    const hasIssues = stalled.length > 0 || missing.length > 0;

    if (!SEND_ALL_CLEAR && !hasIssues) {
      return {
        sent: false,
        reason: 'all-clear-and-quiet-mode-enabled',
        todayDate,
        stalledCount: 0,
        missingCount: 0,
      };
    }

    const result = await step.run('send-email', async () => {
      const subject = buildSubject(now, stalled.length, missing.length);
      const text = buildBody(now, stalled, missing);

      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [FOUNDER_ALERT_EMAIL],
        subject,
        text,
      });

      if (error) {
        throw new Error(`Resend error: ${JSON.stringify(error)}`);
      }

      return { messageId: data?.id ?? null, subject };
    });

    return {
      sent: true,
      messageId: result.messageId,
      subject: result.subject,
      todayDate,
      stalledCount: stalled.length,
      missingCount: missing.length,
    };
  },
);