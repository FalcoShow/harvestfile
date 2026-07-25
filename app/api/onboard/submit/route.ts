// app/api/onboard/submit/route.ts
// =============================================================================
// HarvestFile Sell Score — Onboarding Submission Handler (Deploy 2)
//
// Receives the four-field form payload and performs:
//   1. Validates input
//   2. Verifies the authenticated user owns farmId
//   3. Looks up lat/lng + city/state from ZIP via Zippopotam.us
//   4. Maps the farm to the nearest of 25 reference elevators via
//      findClosestReference (Haversine great-circle distance). This gives
//      every US ZIP a supported elevator and engine-ready 5-digit county
//      FIPS in one step. Nation-wide coverage with v1 market backbone.
//   5. Updates farms record with crops, acres, REAL 5-digit county FIPS
//      (from the reference elevator), and the farmer's home state.
//   6. Inserts sellscore_elevators record (is_primary=true) pointing at
//      the matched reference elevator.
//   7. Seeds grain_positions rows for v1-supported crops (corn, soybeans)
//      with county-default yields and breakevens. Wheat and sorghum are
//      stored on the farm as primary_crops but do NOT get position rows
//      in v1 (engine support lands in v1.1).
//   8. Marks farm sellscore_setup_complete=true, sellscore_active=true.
//   9. Best-effort inline Sell Score compute via computeAndPersistForFarm.
//      Failures are non-fatal: onboard still returns ok, the farmer lands
//      on /sellscore/me with the "Preparing..." empty state, and the
//      4 AM cron picks it up tomorrow morning.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { findClosestReference } from '@/lib/sellscore/reference-elevators';
import { marketingYearStart } from '@/lib/sellscore/pace-calendar';
import { computeAndPersistForFarm } from '@/lib/sellscore/persist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  farmId?: string;
  farmName?: string;
  zipCode?: string;
  totalAcres?: number;
  crops?: string[];
}

// All crops the form accepts. Wheat and sorghum get stored as primary crops
// on the farm but do NOT receive Sell Score recommendations in v1 — the
// engine only supports corn and soybeans this release.
const VALID_CROPS = new Set(['corn', 'soybeans', 'wheat', 'sorghum']);
const V1_ENGINE_CROPS = new Set(['corn', 'soybeans']);

// County-default yields (bushels per acre) for Eastern Corn Belt service area.
// Conservative central-tendency values. Position editor (v1.1) lets farmers
// override per-crop.
const DEFAULT_YIELDS: Record<string, number> = {
  corn: 180,
  soybeans: 55,
};

// County-default breakevens ($/bu). Iowa State / Purdue extension benchmarks
// for full-cost production in Eastern Corn Belt counties, 2026 input prices.
// These are starting points; the farmer's actual breakeven goes in via the
// position editor (v1.1).
const DEFAULT_BREAKEVENS: Record<string, number> = {
  corn: 4.0,
  soybeans: 10.5,
};

export async function POST(request: NextRequest) {
  // Hotfix R2.1 hardening #2: request id for the structured write log.
  const requestId = request.headers.get('x-vercel-id') ?? 'local';

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { farmId, farmName, zipCode, totalAcres, crops } = body;

  if (!farmId || typeof farmId !== 'string') {
    return NextResponse.json({ error: 'farmId required' }, { status: 400 });
  }
  if (!farmName || typeof farmName !== 'string' || farmName.trim().length === 0) {
    return NextResponse.json({ error: 'farmName required' }, { status: 400 });
  }
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return NextResponse.json(
      { error: 'zipCode must be 5 digits' },
      { status: 400 },
    );
  }
  if (
    typeof totalAcres !== 'number' ||
    !isFinite(totalAcres) ||
    totalAcres <= 0 ||
    totalAcres > 100000
  ) {
    return NextResponse.json(
      { error: 'totalAcres must be a number between 1 and 100,000' },
      { status: 400 },
    );
  }
  if (!Array.isArray(crops) || crops.length === 0) {
    return NextResponse.json({ error: 'At least one crop required' }, { status: 400 });
  }
  const validatedCrops = crops.filter((c) => VALID_CROPS.has(c));
  if (validatedCrops.length === 0) {
    return NextResponse.json({ error: 'No valid crops selected' }, { status: 400 });
  }

  // ── Verify the authenticated user owns this farm ─────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: farm, error: farmFetchError } = await supabase
    .from('farms')
    .select('id, owner_id, sellscore_setup_complete')
    .eq('id', farmId)
    .single();

  if (farmFetchError || !farm) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Idempotent: if already complete, just succeed
  if (farm.sellscore_setup_complete) {
    return NextResponse.json({
      ok: true,
      farmId: farm.id,
      message: 'Setup already complete',
    });
  }

  // ── Look up lat/lng + state from ZIP ─────────────────────────────────────
  const geo = await lookupZipCoords(zipCode);
  if (!geo) {
    return NextResponse.json(
      {
        error: `Could not resolve location for ZIP ${zipCode}. Please verify the ZIP and try again.`,
      },
      { status: 400 },
    );
  }

  // ── Map farm to nearest reference elevator (real 5-digit county FIPS) ────
  // findClosestReference uses Haversine distance against the 25 supported
  // elevators in OH/IN/IL/MI/eastern IA. Every US ZIP gets a deterministic
  // mapping. The farmer's display is "Your nearest supported market: [city],
  // [state] (X miles)" — honest, defensible, and shipping today.
  const referenceElevator = findClosestReference(geo.lat, geo.lng);
  const distanceMiles = haversineMiles(
    geo.lat,
    geo.lng,
    referenceElevator.lat,
    referenceElevator.lng,
  );

  // ── All checks passed; do the writes via service-role client ─────────────
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Update farm record. county_fips is the REFERENCE elevator's 5-digit
  // county code (engine-ready). farms.state is the farmer's home state.
  const { error: farmUpdateError } = await adminClient
    .from('farms')
    .update({
      name: farmName.trim().slice(0, 64),
      county_fips: referenceElevator.countyFips,
      state: geo.stateAbbr,
      total_acres: totalAcres,
      sellscore_primary_crops: validatedCrops,
      sellscore_setup_complete: true,
      sellscore_setup_completed_at: new Date().toISOString(),
      sellscore_active: true,
    })
    .eq('id', farmId);

  if (farmUpdateError) {
    console.error('[onboard/submit] farm update failed:', farmUpdateError);
    return NextResponse.json(
      { error: 'Failed to save farm details. Please try again.' },
      { status: 500 },
    );
  }

  // ── Insert primary elevator ──────────────────────────────────────────────
  // Clear any existing primaries first to maintain one-is_primary-per-farm.
  await adminClient
    .from('sellscore_elevators')
    .update({ is_primary: false })
    .eq('farm_id', farmId);

  const { error: elevatorInsertError } = await adminClient
    .from('sellscore_elevators')
    .insert({
      farm_id: farmId,
      barchart_elevator_id: referenceElevator.elevatorId,
      elevator_name: referenceElevator.elevatorName,
      elevator_city: referenceElevator.city,
      elevator_state: referenceElevator.elevatorState,
      distance_miles: Math.round(distanceMiles * 10) / 10,
      is_primary: true,
    });

  if (elevatorInsertError) {
    console.error('[onboard/submit] elevator insert failed:', elevatorInsertError);
    // Non-fatal: farm is set up; elevator can be retried later.
  }

  // ── Seed grain_positions for v1-supported crops ──────────────────────────
  // Split total acres evenly across supported crops the farmer selected.
  // v1.1: replace with a position editor where farmers enter per-crop acres,
  // yield, and breakeven.
  const today = new Date();
  const cropYear = marketingYearStart('corn', today).getUTCFullYear();
  const engineCrops = validatedCrops.filter((c) => V1_ENGINE_CROPS.has(c));
  const acresPerCrop =
    engineCrops.length > 0 ? totalAcres / engineCrops.length : 0;

  for (const crop of engineCrops) {
    const expectedBushels = Math.round(
      acresPerCrop * (DEFAULT_YIELDS[crop] ?? 0),
    );
    const breakeven = DEFAULT_BREAKEVENS[crop] ?? 0;

    // Check-then-insert: avoid duplicate position rows. The setup_complete
    // short-circuit at the top already prevents this in practice, but
    // defense in depth costs nothing.
    const { data: existingPos } = await adminClient
      .from('grain_positions')
      .select('id')
      .eq('farm_id', farmId)
      .eq('commodity', crop)
      .eq('crop_year', cropYear)
      .maybeSingle();

    if (existingPos) continue;

    const { error: positionErr } = await adminClient
      .from('grain_positions')
      .insert({
        farm_id: farmId,
        commodity: crop,
        crop_year: cropYear,
        expected_bushels: expectedBushels,
        breakeven_dollars_per_bu: breakeven,
        breakeven_source: 'county_default',
        bushels_contracted: 0,
        bushels_stored: 0,
        pricing_pace_pct: 0,
      });

    if (positionErr) {
      console.error(
        `[onboard/submit] position insert failed for ${crop}:`,
        positionErr,
      );
      // Non-fatal: farm setup is complete; compute can be retried manually.
    } else {
      // Hotfix R2.1 hardening #2: structured write log, one line per
      // grain_positions write, same shape across log-sale / settings /
      // onboard. Inserts log the seeded values.
      console.log(
        `[sellscore/onboard] POSITION_WRITE farm=${farmId} crop=${crop} year=${cropYear} contracted=insert->0 pace=insert->0 req=${requestId}`,
      );
    }
  }

  // ── Best-effort inline Sell Score compute ────────────────────────────────
  // Typical wall time: 4-7 seconds for two crops. Wrapped in try/catch so a
  // Barchart outage or missing basis history doesn't break onboarding. If
  // this fails, the user lands on /sellscore/me with the "Preparing your
  // first Sell Score" empty state and the 4 AM cron picks it up tomorrow.
  let computeOutcome: { written: number; errors: number } | null = null;
  try {
    const result = await computeAndPersistForFarm(adminClient, farmId, today);
    computeOutcome = {
      written: result.written,
      errors: result.errors.length,
    };
    if (result.errors.length > 0) {
      console.warn(
        `[onboard/submit] partial compute for farm ${farmId}:`,
        result.errors,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[onboard/submit] inline compute failed (non-fatal) for ${farmId}:`,
      msg,
    );
  }

  return NextResponse.json({
    ok: true,
    farmId,
    countyFips: referenceElevator.countyFips,
    state: geo.stateAbbr,
    elevator: {
      name: referenceElevator.elevatorName,
      city: referenceElevator.city,
      state: referenceElevator.elevatorState,
      distanceMiles: Math.round(distanceMiles * 10) / 10,
    },
    compute: computeOutcome,
  });
}

// =============================================================================
// Helpers
// =============================================================================

interface ZipGeoResult {
  lat: number;
  lng: number;
  city: string;
  stateAbbr: string; // e.g. 'OH'
}

/**
 * Look up coordinates + city/state from a US ZIP code via Zippopotam.us
 * (free, no key required). Returns null on any failure; caller surfaces a
 * friendly error.
 */
async function lookupZipCoords(zip: string): Promise<ZipGeoResult | null> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      next: { revalidate: 86400 }, // cache 24h
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      'post code': string;
      country: string;
      places: Array<{
        'place name': string;
        state: string;
        'state abbreviation': string;
        latitude: string;
        longitude: string;
      }>;
    };
    const place = data.places?.[0];
    if (!place) return null;

    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return null;

    return {
      lat,
      lng,
      city: place['place name'],
      stateAbbr: place['state abbreviation'],
    };
  } catch (err) {
    console.error('[lookupZipCoords] failed:', err);
    return null;
  }
}

/**
 * Haversine great-circle distance in miles between two lat/lng points.
 * Used to populate sellscore_elevators.distance_miles for the matched
 * reference elevator.
 */
function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth radius (miles)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}