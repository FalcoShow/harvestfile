// app/api/sellscore/log-sale/route.ts
//
// "Log a sale" endpoint — the persistence half of the existing
// position-update flow (Sell Score spec §5.3: "When farmer marks bushels
// as sold: auto-update").
//
// Workstream A item 1 (July 23, 2026): farmers sell on their own
// schedule; on HOLD days there was no way to record a sale from the
// screen, and the SELL-day "Mark as priced" button was a client-side
// visual toggle that persisted nothing. Both affordances now post here.
//
// What this does — deliberately nothing more (the full logging module
// with sale history, prices, and editing is explicitly OUT of this
// sprint, gated on the N=8 Path decision):
//   1. Auth: cookie session → farms.owner_id ownership (SHORT chain).
//   2. Increment grain_positions.bushels_contracted for the crop's
//      newest crop_year row, clamped to expected_bushels.
//   3. Keep pricing_pace_pct in sync on the same row.
//   4. Re-run computeAndPersistForFarm so today's recommendation row
//      reflects the new position (§5.3 auto-update). If the recompute
//      fails (Barchart outage, missing key), the position update still
//      stands — the 4 AM cron reconciles the recommendation.
//
// Auth chain mirrors app/api/sellscore/compute/route.ts.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { computeAndPersistForFarm } from '@/lib/sellscore/persist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LogSaleBody {
  crop?: string;
  bushels?: number;
}

const SUPPORTED_CROPS = new Set(['corn', 'soybeans', 'wheat', 'sorghum']);

export async function POST(request: NextRequest) {
  // ── Parse + validate body ────────────────────────────────────────────────
  let body: LogSaleBody;
  try {
    body = (await request.json()) as LogSaleBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const crop = typeof body.crop === 'string' ? body.crop.toLowerCase() : '';
  if (!SUPPORTED_CROPS.has(crop)) {
    return NextResponse.json(
      { error: `Unsupported crop: ${body.crop ?? '(missing)'}` },
      { status: 400 },
    );
  }

  const bushels = Math.round(Number(body.bushels));
  if (!Number.isFinite(bushels) || bushels <= 0) {
    return NextResponse.json(
      { error: 'bushels must be a positive number' },
      { status: 400 },
    );
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ── Resolve this user's active Sell Score farm (SHORT auth chain) ────────
  const { data: farm, error: farmErr } = await supabase
    .from('farms')
    .select('id, owner_id, sellscore_active, sellscore_setup_complete')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (farmErr || !farm) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }
  if (!farm.sellscore_active) {
    return NextResponse.json(
      { error: 'Sell Score subscription inactive' },
      { status: 403 },
    );
  }

  // ── Service-role client for the position write + recompute ───────────────
  // RLS on grain_positions is deferred to pre-launch polish (v6.2 §32.4);
  // service role with explicit farm_id filtering matches every other
  // sellscore write path.
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ── Load the newest position row for this crop ───────────────────────────
  const { data: position, error: posErr } = await adminClient
    .from('grain_positions')
    .select('crop_year, expected_bushels, bushels_contracted')
    .eq('farm_id', farm.id)
    .eq('commodity', crop)
    .order('crop_year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (posErr || !position) {
    return NextResponse.json(
      { error: `No ${crop} position on file for this farm` },
      { status: 404 },
    );
  }

  const expected = Number(position.expected_bushels ?? 0);
  const contracted = Number(position.bushels_contracted ?? 0);
  const unsoldBefore = Math.max(0, expected - contracted);

  if (unsoldBefore <= 0) {
    return NextResponse.json(
      { error: `All expected ${crop} bushels are already priced` },
      { status: 409 },
    );
  }

  // Clamp to the open position. Farmers occasionally sell a few bushels
  // over their expected figure; v1 caps at expected so pace math stays
  // 0–100. The v1.1 position editor is the place to raise expected.
  const logged = Math.min(bushels, unsoldBefore);
  const newContracted = contracted + logged;
  const newPacePct =
    expected > 0 ? Math.round((newContracted / expected) * 100) : 0;

  const { error: updateErr } = await adminClient
    .from('grain_positions')
    .update({
      bushels_contracted: newContracted,
      pricing_pace_pct: newPacePct,
    })
    .eq('farm_id', farm.id)
    .eq('commodity', crop)
    .eq('crop_year', position.crop_year);

  if (updateErr) {
    return NextResponse.json(
      { error: 'Failed to update position', detail: updateErr.message },
      { status: 500 },
    );
  }

  // ── §5.3 auto-update: recompute today's recommendation ───────────────────
  // Best-effort. A Barchart outage must not make the farmer think their
  // sale wasn't recorded — the position row above is the source of truth
  // and the 4 AM cron recomputes regardless.
  let recomputed = false;
  let recomputeDetail: string | null = null;
  try {
    const outcome = await computeAndPersistForFarm(adminClient, farm.id);
    recomputed = outcome.written > 0;
    if (outcome.errors.length > 0) {
      recomputeDetail = outcome.errors
        .map((e) => `${e.crop}: ${e.error}`)
        .join('; ');
    }
  } catch (err) {
    recomputeDetail = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(
      `[api/sellscore/log-sale] recompute failed for farm=${farm.id}:`,
      recomputeDetail,
    );
  }

  return NextResponse.json({
    ok: true,
    crop,
    bushelsLogged: logged,
    clamped: logged !== bushels,
    newContracted,
    expectedBushels: expected,
    unsoldBushels: Math.max(0, expected - newContracted),
    pricingPacePct: newPacePct,
    recomputed,
    recomputeDetail,
  });
}
