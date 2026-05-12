// app/api/onboard/submit/route.ts
// =============================================================================
// HarvestFile Sell Score — Onboarding Submission Handler
//
// Receives the four-field form payload and performs:
//   1. Validates input
//   2. Verifies the authenticated user owns farmId
//   3. Looks up county_fips and state from ZIP via Zippopotam.us
//   4. Calls Barchart getGrainBids to find the nearest elevator
//   5. Updates farms record with crops, acres, county, state
//   6. Inserts sellscore_elevators record (is_primary=true)
//   7. Marks farm sellscore_setup_complete=true, sellscore_active=true
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  farmId?: string;
  farmName?: string;
  zipCode?: string;
  totalAcres?: number;
  crops?: string[];
}

const VALID_CROPS = new Set(['corn', 'soybeans', 'wheat', 'sorghum']);

export async function POST(request: NextRequest) {
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
      { status: 400 }
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
      { status: 400 }
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

  // ── Look up county_fips and state from ZIP ────────────────────────────────
  const geo = await lookupZip(zipCode);
  if (!geo) {
    return NextResponse.json(
      { error: `Could not resolve county for ZIP ${zipCode}. Please verify the ZIP and try again.` },
      { status: 400 }
    );
  }

  // ── Find nearest elevator via Barchart getGrainBids ───────────────────────
  const elevator = await findNearestElevator(zipCode, validatedCrops[0]);

  // ── All checks passed; do the writes via service-role client ─────────────
  // Service client bypasses RLS so we can write to farms + sellscore_elevators
  // in one go without juggling cookies. The previous user-ownership check
  // already gated this write to the authenticated user.
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update farm record
  const { error: farmUpdateError } = await adminClient
    .from('farms')
    .update({
      name: farmName.trim().slice(0, 64),
      county_fips: geo.countyFips,
      state: geo.state,
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
      { status: 500 }
    );
  }

  // Insert primary elevator (if we found one)
  if (elevator) {
    // Defensive: only one is_primary per farm. Clear any existing primaries first.
    await adminClient
      .from('sellscore_elevators')
      .update({ is_primary: false })
      .eq('farm_id', farmId);

    const { error: elevatorInsertError } = await adminClient
      .from('sellscore_elevators')
      .insert({
        farm_id: farmId,
        barchart_elevator_id: elevator.locationId,
        elevator_name: elevator.elevatorName,
        elevator_city: elevator.city,
        elevator_state: elevator.state,
        distance_miles: elevator.distanceMiles,
        is_primary: true,
      });

    if (elevatorInsertError) {
      // Non-fatal: farm setup is complete; elevator can be added later.
      console.error('[onboard/submit] elevator insert failed:', elevatorInsertError);
    }
  } else {
    console.warn(
      `[onboard/submit] No elevator found for ZIP ${zipCode}. Farm ${farmId} created without primary elevator.`
    );
  }

  return NextResponse.json({
    ok: true,
    farmId,
    countyFips: geo.countyFips,
    state: geo.state,
    elevatorAttached: !!elevator,
  });
}

// =============================================================================
// Helpers
// =============================================================================

interface GeoResult {
  countyFips: string;
  state: string;
  city: string;
}

/**
 * Look up county FIPS and state from a US ZIP code.
 *
 * Uses Zippopotam.us (free, no key) for ZIP → city/state, then maps state
 * abbreviation to FIPS state code via a hardcoded table. County resolution
 * within state requires an additional lookup; for v1 we accept that the
 * county_fips will be the state-level code only when ZIP doesn't uniquely
 * map to a single county. The Sell Score engine handles state-level
 * fallbacks when county-specific data is missing.
 *
 * NOTE: This is a v1 simplification. v1.1 should use the project's
 * /api/geo/detect endpoint or a dedicated ZIP→county database.
 */
async function lookupZip(zip: string): Promise<GeoResult | null> {
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

    const stateFips = STATE_FIPS[place['state abbreviation']];
    if (!stateFips) return null;

    // For v1, county_fips is set to the state-level FIPS as a placeholder.
    // The engine will fall back to state-level breakeven and basis defaults
    // when county-specific data isn't available. v1.1: integrate proper
    // ZIP→county lookup (HUD ZIP-County crosswalk or paid Geocodio API).
    return {
      countyFips: stateFips,
      state: place['state abbreviation'],
      city: place['place name'],
    };
  } catch (err) {
    console.error('[lookupZip] failed:', err);
    return null;
  }
}

interface ElevatorMatch {
  locationId: string;
  elevatorName: string;
  city: string;
  state: string;
  distanceMiles: number | null;
}

/**
 * Find the nearest grain elevator to a ZIP code that bids on the given crop.
 * Returns the closest match (smallest distance from ZIP centroid).
 */
async function findNearestElevator(
  zip: string,
  crop: string
): Promise<ElevatorMatch | null> {
  const apiKey = process.env.BARCHART_API_KEY;
  if (!apiKey) {
    console.error('[findNearestElevator] BARCHART_API_KEY not set');
    return null;
  }

  const commodityName = crop === 'corn'
    ? 'Corn (#2 Yellow)'
    : crop === 'soybeans'
      ? 'Soybeans'
      : crop === 'wheat'
        ? 'Wheat'
        : 'Corn (#2 Yellow)'; // sorghum etc. fall back to corn for elevator search

  const url =
    `https://ondemand.websol.barchart.com/getGrainBids.json` +
    `?apikey=${apiKey}` +
    `&zipCode=${zip}` +
    `&maxDistance=50` +
    `&commodityName=${encodeURIComponent(commodityName)}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // cache 1h
    });
    if (!response.ok) {
      console.error(`[findNearestElevator] Barchart returned ${response.status}`);
      return null;
    }
    const data = (await response.json()) as {
      status?: { code?: number; message?: string };
      results?: { bids?: Array<any> };
    };

    if (data.status?.code !== 200 || !data.results?.bids?.length) {
      return null;
    }

    // Bids include the elevator info we need. Pick the first bid per unique
    // location, sorted by distance.
    const seen = new Set<string>();
    const candidates: Array<{
      locationId: string;
      elevatorName: string;
      city: string;
      state: string;
      distance: number;
    }> = [];

    for (const bid of data.results.bids) {
      const locationId = bid.locationId ?? bid.location_id ?? null;
      if (!locationId || seen.has(String(locationId))) continue;
      seen.add(String(locationId));

      const distanceRaw =
        bid.distance ?? bid.locationDistance ?? bid.distance_miles;
      const distance =
        typeof distanceRaw === 'string'
          ? parseFloat(distanceRaw)
          : typeof distanceRaw === 'number'
            ? distanceRaw
            : Number.MAX_SAFE_INTEGER;

      candidates.push({
        locationId: String(locationId),
        elevatorName: bid.elevator ?? bid.locationName ?? bid.location ?? 'Unknown',
        city: bid.city ?? '',
        state: bid.state ?? '',
        distance: distance,
      });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.distance - b.distance);
    const nearest = candidates[0];

    return {
      locationId: nearest.locationId,
      elevatorName: nearest.elevatorName,
      city: nearest.city,
      state: nearest.state,
      distanceMiles: isFinite(nearest.distance) ? nearest.distance : null,
    };
  } catch (err) {
    console.error('[findNearestElevator] failed:', err);
    return null;
  }
}

// State abbreviation → 2-digit FIPS state code
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17',
  IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24',
  MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31',
  NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46',
  TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
};
