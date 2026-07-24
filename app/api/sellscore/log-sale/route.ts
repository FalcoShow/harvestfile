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
// Round 2 Item 2 (July 23, 2026): the spec §6.1 sellscore_sales_log
// table now exists (db/create-sellscore-sales-log.sql), so this route
// additionally writes one bookkeeping row per logged sale. The position
// update remains the critical path; the log insert is best-effort — a
// failure (including the table not yet existing in an environment) is
// logged to the Vercel console and never fails the request.
//
// What this does:
//   1. Auth: cookie session → farms.owner_id ownership (SHORT chain).
//   2. Increment grain_positions.bushels_contracted for the crop's
//      newest crop_year row, clamped to expected_bushels.
//   3. Keep pricing_pace_pct in sync on the same row.
//   4. Insert one sellscore_sales_log row (best-effort). Recommendation
//      context (cash bid, recommendation id, followed flag, elevator) is
//      joined from the newest recommendation row on or before the sale
//      date — the row /sellscore/me was showing when the farmer pressed
//      the button — and only when its crop matches the sale. Read BEFORE
//      the recompute in step 5 so the linkage reflects the screen the
//      farmer acted on, not the post-sale rewrite.
//   5. Re-run computeAndPersistForFarm so today's recommendation row
//      reflects the new position (§5.3 auto-update). If the recompute
//      fails (Barchart outage, missing key), the position update still
//      stands — the 4 AM cron reconciles the recommendation.
//
// Date convention: "today" is the US Eastern calendar day, matching the
// 4 AM ET compute cron that stamps recommendation_date. A UTC "today"
// would roll over at 8 PM ET / 7 PM CT — prime evening logging hours —
// and date evening sales tomorrow, orphaning them from the day's
// recommendation (Round 2 review finding, July 23, 2026).
//
// Still explicitly OUT (gated Path B decision): future-sale planning,
// editing milestones, editing or deleting logged sales.
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
  /**
   * Optional sale date, YYYY-MM-DD (spec §6.1 sale_date). The current UI
   * never sends it — the sale is logged for today. Kept in the contract
   * so the API doesn't need a version bump if a dated entry form ships
   * later. Must not be in the future; bounded to the last 400 days so a
   * typo can't write a row outside any renderable marketing year.
   */
  sale_date?: string;
}

const SUPPORTED_CROPS = new Set(['corn', 'soybeans', 'wheat', 'sorghum']);

const SALE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SALE_AGE_DAYS = 400;

/**
 * Today's date as YYYY-MM-DD in US Eastern time — the same calendar-day
 * convention the 4 AM ET compute cron uses for recommendation_date.
 * en-CA formats as YYYY-MM-DD directly.
 */
function todayYmdEastern(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Validates an optional sale_date. Returns the effective YYYY-MM-DD string
 * (today, US Eastern, when absent) or null when the supplied value is
 * unusable.
 */
function resolveSaleDate(raw: string | undefined): string | null {
  const today = todayYmdEastern();
  if (raw === undefined) return today;
  if (typeof raw !== 'string' || !SALE_DATE_PATTERN.test(raw)) return null;

  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Reject normalized dates (e.g. 2026-02-31 parses to March 3).
  const yyyy = parsed.getUTCFullYear();
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getUTCDate()).padStart(2, '0');
  if (`${yyyy}-${mm}-${dd}` !== raw) return null;

  // YYYY-MM-DD compares correctly as a string.
  if (raw > today) return null;

  const ageMs = Date.parse(`${today}T00:00:00Z`) - parsed.getTime();
  if (ageMs > MAX_SALE_AGE_DAYS * 24 * 60 * 60 * 1000) return null;

  return raw;
}

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

  const saleDate = resolveSaleDate(body.sale_date);
  if (!saleDate) {
    return NextResponse.json(
      {
        error:
          'sale_date must be YYYY-MM-DD, not in the future, and within the last 400 days',
      },
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

  // Clamp the POSITION update to the open position. Farmers occasionally
  // sell a few bushels over their expected figure; v1 caps at expected so
  // pace math stays 0–100. The v1.1 position editor is the place to raise
  // expected. (The sales-log row below records the uncapped figure — the
  // books record what was sold; the clamp is a pace-math constraint.)
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

  // ── Round 2 Item 2: best-effort sellscore_sales_log row ──────────────────
  // Runs BEFORE the recompute so the joined recommendation context is the
  // row the farmer was looking at, not the post-sale rewrite.
  //
  // bushels_sold records the REQUESTED figure ("crop, bushels, sale_date
  // from request" — handoff verbatim): the farmer's books say what they
  // sold, even when the position update above capped at expected. When the
  // two differ, the cap is recorded in notes so the discrepancy against
  // pace math is explained on the row itself.
  let saleLogged = false;
  try {
    // Newest recommendation on or before the sale date — mirrors the
    // /sellscore/me headline query (recommendation_date DESC, created_at
    // DESC, limit 1), i.e. the recommendation the farmer was acting on.
    // An exact-date match would orphan sales made between UTC midnight
    // and the 4 AM ET cron, when the newest row is still dated yesterday.
    const { data: recRow } = await adminClient
      .from('sellscore_recommendations')
      .select(
        'id, crop, recommendation_type, recommended_cash_bid, recommended_elevator_id',
      )
      .eq('farm_id', farm.id)
      .lte('recommendation_date', saleDate)
      .order('recommendation_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const recMatchesSale = recRow != null && recRow.crop === crop;

    const { error: logErr } = await adminClient
      .from('sellscore_sales_log')
      .insert({
        farm_id: farm.id,
        crop,
        bushels_sold: bushels,
        sale_date: saleDate,
        cash_bid_at_sale: recMatchesSale
          ? (recRow.recommended_cash_bid ?? null)
          : null,
        elevator_id: recMatchesSale
          ? (recRow.recommended_elevator_id ?? null)
          : null,
        recommendation_id: recMatchesSale ? recRow.id : null,
        // True only when the recommendation the farmer saw said SELL for
        // this crop and they sold it. Null (not false) when no
        // recommendation existed for this crop — absence of advice isn't
        // defiance.
        followed_recommendation: recMatchesSale
          ? recRow.recommendation_type === 'sell'
          : null,
        notes:
          logged !== bushels
            ? `Position update capped at ${logged.toLocaleString('en-US')} bu — expected bushels for this crop were already reached.`
            : null,
      });

    if (logErr) {
      // eslint-disable-next-line no-console
      console.error(
        `[api/sellscore/log-sale] sales_log insert failed for farm=${farm.id} crop=${crop}:`,
        logErr.message,
      );
    } else {
      saleLogged = true;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[api/sellscore/log-sale] sales_log insert threw for farm=${farm.id} crop=${crop}:`,
      err instanceof Error ? err.message : String(err),
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
    saleLogged,
    saleDate,
    recomputed,
    recomputeDetail,
  });
}
