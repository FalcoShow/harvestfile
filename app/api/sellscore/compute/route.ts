// app/api/sellscore/compute/route.ts
//
// On-demand Sell Score compute endpoint.
//
// Auth chain (SHORT, per sellscore architecture):
//   1. supabase.auth.getUser() → authenticated user
//   2. farms.owner_id === user.id → ownership check
//   3. service-role client → run computeAndPersistForFarm
//
// Used by:
//   - Manual "Recompute now" button on /sellscore/me (future)
//   - Operator-side debug recomputes
//   - Backfill scripts and verification flows
//
// The 4 AM cron uses computeAndPersistForFarm directly via Inngest and
// does NOT route through this HTTP endpoint (no need for HTTP overhead on
// a server-side scheduled function).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { computeAndPersistForFarm } from '@/lib/sellscore/persist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ComputeBody {
  farmId?: string;
  /**
   * Optional ISO date for the computation reference point. Defaults to now.
   * Used in backtests and operator-side recomputes for prior dates.
   */
  date?: string;
}

export async function POST(request: NextRequest) {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: ComputeBody;
  try {
    body = (await request.json()) as ComputeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { farmId, date: dateStr } = body;
  if (!farmId || typeof farmId !== 'string') {
    return NextResponse.json({ error: 'farmId required' }, { status: 400 });
  }

  let date: Date;
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: `Invalid date string: ${dateStr}` },
        { status: 400 },
      );
    }
    date = parsed;
  } else {
    date = new Date();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const { data: farm, error: farmErr } = await supabase
    .from('farms')
    .select('id, owner_id, sellscore_setup_complete, sellscore_active')
    .eq('id', farmId)
    .single();

  if (farmErr || !farm) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }
  if (farm.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!farm.sellscore_setup_complete) {
    return NextResponse.json(
      { error: 'Farm onboarding not complete; cannot compute' },
      { status: 400 },
    );
  }

  // ── Compute via service-role client ──────────────────────────────────────
  // Service role is required to read county_basis_history (public reference
  // data with no RLS) and write sellscore_recommendations consistently from
  // any caller. Matches the cron's runtime context for code reuse.
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const outcome = await computeAndPersistForFarm(adminClient, farmId, date);
    return NextResponse.json({
      ok: true,
      farmId,
      date: date.toISOString(),
      ...outcome,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[api/sellscore/compute] fatal:', msg);
    return NextResponse.json(
      { error: 'Compute failed', detail: msg },
      { status: 500 },
    );
  }
}