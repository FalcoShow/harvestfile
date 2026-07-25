// app/api/sellscore/settings/route.ts
//
// Farm-data settings endpoint (Round 2 Item 4, spec v6.6 §5).
//
// /sellscore/settings was read-only at v1; this route adds the spec'd
// farm-data controls: per-crop breakeven (with the §5.4 estimated-source
// indicator semantics), expected bushels, unsold/contracted position
// correction, pinned elevator management (2 pins per the v1 lock), and
// county.
//
// Contract: every field is optional; the client saves one section at a
// time. Everything present is validated FIRST (all-or-nothing per
// request — no half-applied saves on a validation error), then applied.
// The position UPDATE only writes the columns the farmer actually
// touched, so a breakeven-only save can never clobber a concurrent
// log-sale increment to bushels_contracted (Round 2 review finding).
//
// When a save touches anything the engine reads — breakeven, expected
// bushels, position, county (the county picks the reference elevator
// that supplies cash bids and basis history) — the same recompute path
// log-sale uses runs afterwards (§5.3 auto-update), best-effort, so the
// next screen view reflects it. Pinned elevators are display data (the
// A2 comparison), not engine inputs: no recompute.
//
// Elevator apply order (Round 2 review finding): insert new pins first,
// then move the primary flag, then delete unpinned rows LAST. A
// mid-sequence failure can leave an extra row or (transiently) two
// primary flags — both tolerated by readers and repaired by the next
// successful save — but never zero rows and never zero pins.
//
// Auth chain mirrors app/api/sellscore/log-sale/route.ts:
//   cookie session → farms.owner_id ownership (SHORT chain), then a
//   service-role client for writes (RLS on grain_positions is deferred,
//   v6.2 §32.4 — explicit farm_id filtering, same as every other
//   sellscore write path).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { computeAndPersistForFarm } from '@/lib/sellscore/persist';
import {
  REFERENCE_ELEVATORS,
  getReferenceForCounty,
} from '@/lib/sellscore/reference-elevators';
import { getGrainBidsByCoords } from '@/lib/barchart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// v1 engine crops — the only crops with grain_positions rows (onboarding
// creates corn/soybeans only; wheat/sorghum are farms-table metadata).
const POSITION_CROPS = new Set(['corn', 'soybeans']);

// County defaults, matching app/api/onboard/submit and the /sellscore/me
// fallbacks. Used when the farmer resets a breakeven to "county default".
const DEFAULT_BREAKEVENS: Record<string, number> = {
  corn: 4.0,
  soybeans: 10.5,
};

// Plain-language validation bounds. Wide enough for any real operation,
// tight enough to catch a slipped digit.
const BREAKEVEN_MIN = 1;
const BREAKEVEN_MAX = 30;
const EXPECTED_MIN = 1;
const EXPECTED_MAX = 10_000_000;

interface PositionPatch {
  crop?: string;
  expected_bushels?: number;
  bushels_contracted?: number;
  breakeven_dollars_per_bu?: number;
  /** True = revert to the county default (spec §5.4 source indicator). */
  breakeven_reset?: boolean;
}

interface PinnedElevatorPatch {
  barchart_elevator_id?: string;
  is_primary?: boolean;
}

interface SettingsBody {
  positions?: PositionPatch[];
  county_fips?: string;
  pinned_elevators?: PinnedElevatorPatch[];
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  // Hotfix R2.1 hardening #2: request id for the structured write log.
  const requestId = request.headers.get('x-vercel-id') ?? 'local';

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: SettingsBody;
  try {
    body = (await request.json()) as SettingsBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const hasPositions = Array.isArray(body.positions) && body.positions.length > 0;
  const hasCounty = typeof body.county_fips === 'string';
  const hasElevators = Array.isArray(body.pinned_elevators);

  if (!hasPositions && !hasCounty && !hasElevators) {
    return badRequest('Nothing to save');
  }

  // Malformed array elements get plain-language 400s, not TypeError 500s.
  if (hasPositions && !body.positions!.every(isPlainObject)) {
    return badRequest('Invalid farm data entry');
  }
  if (hasElevators && !body.pinned_elevators!.every(isPlainObject)) {
    return badRequest('Invalid elevator selection');
  }
  if (hasPositions && body.positions!.length > POSITION_CROPS.size) {
    return badRequest('Too many crop entries in one save');
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
    .select('id, owner_id, county_fips, sellscore_active, sellscore_setup_complete')
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

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let engineInputsChanged = false;
  const updated: {
    positions: Array<{
      crop: string;
      expected_bushels: number;
      bushels_contracted: number;
      breakeven_dollars_per_bu: number;
      breakeven_source: string;
      pricing_pace_pct: number;
    }>;
    county_fips?: string;
    pinned_elevators?: Array<{
      barchart_elevator_id: string;
      elevator_name: string;
      is_primary: boolean;
    }>;
  } = { positions: [] };

  // ── Per-crop position patches: validate everything, then apply ───────────
  // Two passes so a validation failure on the second crop can't leave the
  // first crop's write already committed.
  interface PlannedPositionUpdate {
    positionId: string;
    crop: string;
    cropYear: number;
    previousContracted: number;
    previousPace: number;
    updateFields: Record<string, number | string>;
    result: (typeof updated.positions)[number];
  }
  const plannedPositions: PlannedPositionUpdate[] = [];

  if (hasPositions) {
    const seenCrops = new Set<string>();

    for (const patch of body.positions!) {
      const crop =
        typeof patch.crop === 'string' ? patch.crop.toLowerCase() : '';
      if (!POSITION_CROPS.has(crop)) {
        return badRequest(`Unsupported crop: ${patch.crop ?? '(missing)'}`);
      }
      if (seenCrops.has(crop)) {
        return badRequest(`Duplicate entry for ${crop}`);
      }
      seenCrops.add(crop);

      const { data: position, error: posErr } = await adminClient
        .from('grain_positions')
        .select(
          'id, crop_year, expected_bushels, bushels_contracted, breakeven_dollars_per_bu, breakeven_source, pricing_pace_pct',
        )
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

      const currentExpected = Number(position.expected_bushels ?? 0);
      const currentContracted = Number(position.bushels_contracted ?? 0);
      const currentBreakeven = Number(position.breakeven_dollars_per_bu ?? 0);
      const currentSource = String(position.breakeven_source ?? 'county_default');
      const currentPace = Number(position.pricing_pace_pct ?? 0);

      // Expected bushels — the denominator of every pace number.
      let newExpected = currentExpected;
      if (patch.expected_bushels !== undefined) {
        const parsed = Math.round(Number(patch.expected_bushels));
        if (!Number.isFinite(parsed)) {
          return badRequest('Expected bushels must be a number');
        }
        if (parsed < EXPECTED_MIN || parsed > EXPECTED_MAX) {
          return badRequest(
            `Expected bushels must be between ${EXPECTED_MIN.toLocaleString(
              'en-US',
            )} and ${EXPECTED_MAX.toLocaleString('en-US')}`,
          );
        }
        newExpected = parsed;
      }

      // Contracted (already-priced) correction.
      let newContracted = currentContracted;
      if (patch.bushels_contracted !== undefined) {
        const parsed = Math.round(Number(patch.bushels_contracted));
        if (!Number.isFinite(parsed) || parsed < 0) {
          return badRequest('Bushels already priced must be zero or more');
        }
        newContracted = parsed;
      }
      if (newContracted > newExpected) {
        return badRequest(
          `Bushels already priced (${newContracted.toLocaleString(
            'en-US',
          )}) can't be more than expected bushels (${newExpected.toLocaleString('en-US')})`,
        );
      }

      // Breakeven — set your own number, or reset to the county default.
      // If both arrive (the shipped client never sends both), reset wins.
      let newBreakeven = currentBreakeven;
      let newSource = currentSource;
      if (patch.breakeven_reset === true) {
        newBreakeven = DEFAULT_BREAKEVENS[crop];
        newSource = 'county_default';
      } else if (patch.breakeven_dollars_per_bu !== undefined) {
        const parsed =
          Math.round(Number(patch.breakeven_dollars_per_bu) * 100) / 100;
        if (!Number.isFinite(parsed)) {
          return badRequest('Breakeven must be a number');
        }
        if (parsed < BREAKEVEN_MIN || parsed > BREAKEVEN_MAX) {
          return badRequest(
            `Breakeven must be between $${BREAKEVEN_MIN.toFixed(2)} and $${BREAKEVEN_MAX.toFixed(2)} per bushel`,
          );
        }
        newBreakeven = parsed;
        newSource = 'user_provided';
      }

      const newPacePct =
        newExpected > 0
          ? Math.round((newContracted / newExpected) * 100)
          : 0;

      // Only the columns this patch actually touched. pricing_pace_pct
      // rides along only when the numbers that define it were touched.
      const updateFields: Record<string, number | string> = {};
      if (
        patch.expected_bushels !== undefined &&
        newExpected !== currentExpected
      ) {
        updateFields.expected_bushels = newExpected;
      }
      if (
        patch.bushels_contracted !== undefined &&
        newContracted !== currentContracted
      ) {
        updateFields.bushels_contracted = newContracted;
      }
      if (
        (patch.breakeven_reset === true ||
          patch.breakeven_dollars_per_bu !== undefined) &&
        (newBreakeven !== currentBreakeven || newSource !== currentSource)
      ) {
        updateFields.breakeven_dollars_per_bu = newBreakeven;
        updateFields.breakeven_source = newSource;
      }
      if (
        updateFields.expected_bushels !== undefined ||
        updateFields.bushels_contracted !== undefined
      ) {
        updateFields.pricing_pace_pct = newPacePct;
      }

      plannedPositions.push({
        positionId: String(position.id),
        crop,
        cropYear: Number(position.crop_year),
        previousContracted: currentContracted,
        previousPace: currentPace,
        updateFields,
        result: {
          crop,
          expected_bushels: newExpected,
          bushels_contracted: newContracted,
          breakeven_dollars_per_bu: newBreakeven,
          breakeven_source: newSource,
          pricing_pace_pct: newPacePct,
        },
      });
    }

    // Apply pass — validation is complete, writes are surgical.
    for (const plan of plannedPositions) {
      if (Object.keys(plan.updateFields).length > 0) {
        const { error: updateErr } = await adminClient
          .from('grain_positions')
          .update(plan.updateFields)
          .eq('id', plan.positionId);

        if (updateErr) {
          return NextResponse.json(
            { error: 'Failed to save farm data', detail: updateErr.message },
            { status: 500 },
          );
        }
        engineInputsChanged = true;

        // Hotfix R2.1 hardening #2: structured write log, one line per
        // grain_positions write, same shape across log-sale / settings /
        // onboard. Old→new even when a field didn't move (breakeven-only
        // saves still touch the row).
        // eslint-disable-next-line no-console
        console.log(
          `[sellscore/settings] POSITION_WRITE farm=${farm.id} crop=${plan.crop} year=${plan.cropYear} contracted=${plan.previousContracted}->${plan.result.bushels_contracted} pace=${plan.previousPace}->${plan.result.pricing_pace_pct} req=${requestId}`,
        );
      }
      updated.positions.push(plan.result);
    }
  }

  // ── County ────────────────────────────────────────────────────────────────
  if (hasCounty) {
    const countyFips = body.county_fips!.trim();
    const reference = getReferenceForCounty(countyFips);
    if (!reference) {
      return badRequest('Pick a county from the supported list');
    }
    if (countyFips !== farm.county_fips) {
      const { error: countyErr } = await adminClient
        .from('farms')
        .update({ county_fips: countyFips })
        .eq('id', farm.id);

      if (countyErr) {
        return NextResponse.json(
          { error: 'Failed to save county', detail: countyErr.message },
          { status: 500 },
        );
      }
      // County selects the reference elevator that supplies the engine's
      // cash bids and basis history — engine input.
      engineInputsChanged = true;
    }
    updated.county_fips = countyFips;
  }

  // ── Pinned elevators (2 per v1 lock) ──────────────────────────────────────
  if (hasElevators) {
    const patches = body.pinned_elevators!;
    if (patches.length < 1 || patches.length > 2) {
      return badRequest('Keep one or two elevators pinned');
    }

    const ids = patches.map((p) =>
      typeof p.barchart_elevator_id === 'string'
        ? p.barchart_elevator_id.trim()
        : '',
    );
    if (ids.some((id) => id.length === 0 || id.length > 64)) {
      return badRequest('Invalid elevator selection');
    }
    if (new Set(ids).size !== ids.length) {
      return badRequest('Each elevator can only be pinned once');
    }

    const primaryCount = patches.filter((p) => p.is_primary === true).length;
    if (primaryCount > 1) {
      return badRequest('Only one elevator can be primary');
    }
    // Exactly one primary: default to the first pin when none is marked.
    const primaryId = primaryCount === 1
      ? ids[patches.findIndex((p) => p.is_primary === true)]
      : ids[0];

    // Resolve each id to a display row from trusted sources only — never
    // from client-supplied text: existing pinned rows, the reference
    // elevator table, then a live Barchart nearby lookup.
    const { data: existingRows } = await adminClient
      .from('sellscore_elevators')
      .select('*')
      .eq('farm_id', farm.id);
    const existing = existingRows ?? [];

    const countyForLookup = updated.county_fips ?? farm.county_fips;
    const reference = countyForLookup
      ? getReferenceForCounty(countyForLookup)
      : null;

    type ResolvedPin = {
      barchart_elevator_id: string;
      elevator_name: string;
      elevator_city: string;
      elevator_state: string;
      distance_miles: number | null;
    };
    const resolved: ResolvedPin[] = [];
    let nearby: Awaited<ReturnType<typeof getGrainBidsByCoords>> | null = null;

    for (const id of ids) {
      const fromExisting = existing.find(
        (r: any) => String(r.barchart_elevator_id) === id,
      );
      if (fromExisting) {
        resolved.push({
          barchart_elevator_id: id,
          elevator_name: fromExisting.elevator_name,
          elevator_city: fromExisting.elevator_city,
          elevator_state: fromExisting.elevator_state,
          distance_miles:
            fromExisting.distance_miles != null
              ? Number(fromExisting.distance_miles)
              : null,
        });
        continue;
      }

      const fromReference = REFERENCE_ELEVATORS.find((e) => e.elevatorId === id);
      if (fromReference) {
        resolved.push({
          barchart_elevator_id: id,
          elevator_name: fromReference.elevatorName,
          elevator_city: fromReference.city,
          elevator_state: fromReference.elevatorState,
          distance_miles: null,
        });
        continue;
      }

      if (nearby === null && reference) {
        // getGrainBidsByCoords never throws — stale cache or [] on failure.
        nearby = await getGrainBidsByCoords(reference.lat, reference.lng, {
          maxDistance: 60,
          maxLocations: 25,
          bidsPerCommodity: 1,
        });
      }
      const fromNearby = (nearby ?? []).find((n) => n.id === id);
      if (fromNearby) {
        resolved.push({
          barchart_elevator_id: id,
          elevator_name: fromNearby.name,
          elevator_city: fromNearby.city,
          elevator_state: fromNearby.state,
          distance_miles:
            fromNearby.distance != null
              ? Math.round(Number(fromNearby.distance) * 10) / 10
              : null,
        });
        continue;
      }

      return badRequest(
        'That elevator is not in the nearby list right now. Pick one from the list.',
      );
    }

    // Apply, ordered so a mid-sequence failure never leaves the farm with
    // zero rows or zero pinned rows (Round 2 review finding):
    //   1. INSERT missing pins (is_primary=false — additive, safe).
    //   2. Set the new primary's flag true.
    //   3. Clear every other row's flag (transient two-primaries window
    //      between 2 and 3; readers fall back via is_primary DESC order).
    //   4. DELETE unpinned rows LAST.
    const existingIds = new Set(
      existing.map((r: any) => String(r.barchart_elevator_id)),
    );

    for (const pin of resolved) {
      if (existingIds.has(pin.barchart_elevator_id)) continue;
      const { error: insErr } = await adminClient
        .from('sellscore_elevators')
        .insert({
          farm_id: farm.id,
          barchart_elevator_id: pin.barchart_elevator_id,
          elevator_name: pin.elevator_name,
          elevator_city: pin.elevator_city,
          elevator_state: pin.elevator_state,
          distance_miles: pin.distance_miles,
          is_primary: false,
        });
      if (insErr) {
        return NextResponse.json(
          { error: 'Failed to save elevators', detail: insErr.message },
          { status: 500 },
        );
      }
    }

    const { error: setPrimaryErr } = await adminClient
      .from('sellscore_elevators')
      .update({ is_primary: true })
      .eq('farm_id', farm.id)
      .eq('barchart_elevator_id', primaryId);
    if (setPrimaryErr) {
      return NextResponse.json(
        { error: 'Failed to save elevators', detail: setPrimaryErr.message },
        { status: 500 },
      );
    }

    const { error: clearErr } = await adminClient
      .from('sellscore_elevators')
      .update({ is_primary: false })
      .eq('farm_id', farm.id)
      .neq('barchart_elevator_id', primaryId);
    if (clearErr) {
      return NextResponse.json(
        { error: 'Failed to save elevators', detail: clearErr.message },
        { status: 500 },
      );
    }

    const keepIds = new Set(ids);
    const toDelete = existing.filter(
      (r: any) => !keepIds.has(String(r.barchart_elevator_id)),
    );
    for (const row of toDelete) {
      const { error: delErr } = await adminClient
        .from('sellscore_elevators')
        .delete()
        .eq('farm_id', farm.id)
        .eq('barchart_elevator_id', row.barchart_elevator_id);
      if (delErr) {
        return NextResponse.json(
          { error: 'Failed to save elevators', detail: delErr.message },
          { status: 500 },
        );
      }
    }

    updated.pinned_elevators = resolved.map((pin) => ({
      barchart_elevator_id: pin.barchart_elevator_id,
      elevator_name: pin.elevator_name,
      is_primary: pin.barchart_elevator_id === primaryId,
    }));
  }

  // ── §5.3 auto-update: recompute when engine inputs changed ────────────────
  // Best-effort, same contract as log-sale: a Barchart outage must not
  // make the farmer think their settings didn't save — the rows above are
  // the source of truth and the 4 AM cron recomputes regardless.
  let recomputed = false;
  let recomputeDetail: string | null = null;
  if (engineInputsChanged) {
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
        `[api/sellscore/settings] recompute failed for farm=${farm.id}:`,
        recomputeDetail,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    engineInputsChanged,
    recomputed,
    recomputeDetail,
  });
}
