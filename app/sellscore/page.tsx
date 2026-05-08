// app/sellscore/page.tsx
//
// Live Sell Score page. Server component — authenticates the user via
// session cookie, looks up their active farm by owner_id, fetches farm
// context, all grain positions, and a Sell Score recommendation for each
// primary crop in parallel, adapts each to the display contract, and
// renders the shared SellScoreScreen via a thin client wrapper that
// handles crop toggling.
//
// Auth chain (Sell Score variant): cookie session → auth.users(id) →
// farms.owner_id (NOT the legacy professionals chain). Per the project
// architecture rule: every sellscore_* lookup uses the SHORT auth
// version (owner_id = auth.uid()), never the long professionals lookup.
//
// RLS on farms/grain_positions is deferred to pre-launch polish (v6.2
// §32.4). Until RLS lands, the data fetch uses the service-role client
// with explicit owner_id filtering at the application layer. When RLS
// lands, the data-fetch client becomes a user-context client and the
// owner_id filter becomes redundant (RLS enforces it).
//
// Three branches that aren't the happy path:
//   1. No session   → redirect to /login?next=/sellscore
//   2. No farm row  → render SellScoreSetupPending (default flavor)
//   3. Outside v1 beachhead county → SellScoreSetupPending (waitlist flavor)
//   4. No engine-supported crops enrolled → SellScoreSetupPending (no-crops flavor)

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type User } from '@supabase/supabase-js';
import { getSellScoreForFarm } from '@/lib/sellscore/data-fetcher';
import { getReferenceForCounty } from '@/lib/sellscore/reference-elevators';
import { getTargetPaceForDate } from '@/lib/sellscore/pace-calendar';
import { toSellScoreScreenData } from '@/lib/sellscore/adapter';
import type { CropPosition, Crop } from '@/lib/sellscore/types';
import type { SellScoreScreenData } from '@/lib/sellscore/display-types';
import SellScoreLive from './_components/SellScoreLive';
import SellScoreSetupPending from './_components/SellScoreSetupPending';

// Live data: never cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Engine supports corn and soybeans. Display supports more, but v1 only
// has these two enrolled in pace calendar + basis history.
const ENGINE_CROPS = ['corn', 'soybeans'] as const;
type EngineCrop = (typeof ENGINE_CROPS)[number];

interface PositionRow {
  commodity: string;
  crop_year: number;
  expected_bushels: number | string | null;
  bushels_contracted: number | string | null;
  breakeven_dollars_per_bu: number | string | null;
  breakeven_source: 'county_default' | 'user_provided';
  arc_plc_election: string | null;
  insurance_coverage_level: number | string | null;
  insurance_has_sco: boolean | null;
  insurance_has_eco: boolean | null;
  insurance_eco_level: number | string | null;
  effective_floor_dollars_per_bu: number | string | null;
}

interface FarmRow {
  id: string;
  name: string;
  county_fips: string;
  state: string;
  total_acres: number | string | null;
  sellscore_primary_crops: string[] | null;
}

export default async function SellScoreLivePage() {
  // ── 1. Validate server-side env ──────────────────────────────────────
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.BARCHART_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL/anon key missing on server');
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing on server');
  }
  if (!apiKey) {
    throw new Error('BARCHART_API_KEY missing on server');
  }

  // ── 2. Read session via cookie-based auth client ─────────────────────
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Server components cannot set cookies during render. Refresh
      // tokens are persisted by the auth callback / middleware on
      // subsequent requests; these no-ops are safe here.
      set(_name: string, _value: string, _options: CookieOptions) {
        /* no-op in server component render */
      },
      remove(_name: string, _options: CookieOptions) {
        /* no-op in server component render */
      },
    },
  });

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    // Not signed in — bounce to login. The `next` param lets the login
    // flow return the user here after authentication; if /login doesn't
    // yet honor `next`, the user lands on the default post-login page
    // and can navigate back via bookmark.
    redirect('/login?next=/sellscore');
  }

  // ── 3. Service-role client for data fetching ─────────────────────────
  // RLS is OFF on farms/grain_positions for v1; service role is the
  // correct client until RLS lands in pre-launch polish (v6.2 §32.4).
  // Application-layer owner_id filtering enforces ownership in the
  // meantime.
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const today = new Date();

  // ── 4. Look up the user's active Sell Score farm ─────────────────────
  // Multi-entity support is excluded from v1 (Sell Score spec §13). If
  // a user somehow has multiple sellscore_active farms (e.g., manual
  // provisioning edge case), we take the most recently created one.
  const { data: farmRow, error: farmErr } = await supabase
    .from('farms')
    .select(
      'id, name, county_fips, state, total_acres, sellscore_primary_crops',
    )
    .eq('owner_id', user.id)
    .eq('sellscore_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<FarmRow>();

  if (farmErr) {
    throw new Error(
      `Failed to look up Sell Score farm for user ${user.id}: ${farmErr.message}`,
    );
  }

  if (!farmRow) {
    // User authenticated but no Sell Score farm provisioned yet. Beta
    // users get manually provisioned until the /sellscore/setup flow
    // ships in pre-launch polish.
    return <SellScoreSetupPending email={user.email ?? null} />;
  }

  // ── 5. Reference elevator gate (beachhead check) ─────────────────────
  // Sell Score v1 supports only the 25 representative counties in
  // OH/IN/IL/MI/eastern IA. Outside the beachhead = waitlist state, not
  // a broken live screen.
  const elevator = getReferenceForCounty(farmRow.county_fips);
  if (!elevator) {
    return (
      <SellScoreSetupPending
        email={user.email ?? null}
        outsideBeachhead
        countyFips={farmRow.county_fips}
        state={farmRow.state}
      />
    );
  }

  // ── 6. Fetch all positions for this farm ─────────────────────────────
  const { data: positionRows, error: posErr } = await supabase
    .from('grain_positions')
    .select(
      'commodity, crop_year, expected_bushels, bushels_contracted, breakeven_dollars_per_bu, breakeven_source, arc_plc_election, insurance_coverage_level, insurance_has_sco, insurance_has_eco, insurance_eco_level, effective_floor_dollars_per_bu',
    )
    .eq('farm_id', farmRow.id)
    .order('commodity', { ascending: true });

  if (posErr) {
    throw new Error(
      `Failed to fetch positions for farm ${farmRow.id}: ${posErr.message}`,
    );
  }

  // ── 7. Map DB position rows to display CropPosition shape ────────────
  const positions: CropPosition[] = (positionRows as PositionRow[] ?? []).map(
    (row) => {
      const crop = row.commodity as Crop;
      const expectedBu = Number(row.expected_bushels ?? 0);
      const soldBu = Number(row.bushels_contracted ?? 0);
      const unsoldBu = Math.max(0, expectedBu - soldBu);
      const pricingPacePct =
        expectedBu > 0 ? Math.round((soldBu / expectedBu) * 100) : 0;

      const isEngineCrop = crop === 'corn' || crop === 'soybeans';
      const targetPacePct = isEngineCrop
        ? Math.round(getTargetPaceForDate(crop as EngineCrop, today))
        : null;

      const arcPlc = (row.arc_plc_election ?? 'unknown') as
        | 'ARC-CO'
        | 'PLC'
        | 'none'
        | 'unknown';

      return {
        crop,
        crop_year: row.crop_year,
        expected_bushels: expectedBu,
        unsold_bushels: unsoldBu,
        breakeven_dollars_per_bu: Number(row.breakeven_dollars_per_bu ?? 0),
        breakeven_source: row.breakeven_source,
        pricing_pace_pct: pricingPacePct,
        target_pace_pct: targetPacePct,
        arc_plc_election: arcPlc,
        insurance_coverage_level:
          row.insurance_coverage_level != null
            ? Number(row.insurance_coverage_level)
            : null,
        insurance_has_sco: row.insurance_has_sco ?? false,
        insurance_has_eco: row.insurance_has_eco ?? false,
        insurance_eco_level:
          row.insurance_eco_level != null
            ? Number(row.insurance_eco_level)
            : null,
        effective_floor_dollars_per_bu:
          row.effective_floor_dollars_per_bu != null
            ? Number(row.effective_floor_dollars_per_bu)
            : null,
      };
    },
  );

  // ── 8. Determine which crops to fetch ────────────────────────────────
  const enrolledCrops = (farmRow.sellscore_primary_crops ?? []) as string[];
  const cropsToFetch: EngineCrop[] = ENGINE_CROPS.filter((c) =>
    enrolledCrops.includes(c),
  );

  if (cropsToFetch.length === 0) {
    // Farm exists but has no engine-supported crops enrolled. Render
    // the setup-pending state rather than crashing the live screen.
    return (
      <SellScoreSetupPending
        email={user.email ?? null}
        farmName={farmRow.name}
        noCropsEnrolled
      />
    );
  }

  // ── 9. Fetch Sell Score for each enrolled crop in parallel ───────────
  const results = await Promise.all(
    cropsToFetch.map((crop) =>
      getSellScoreForFarm(supabase, farmRow.id, crop, today, apiKey),
    ),
  );

  // ── 10. Adapt each result to the display contract ────────────────────
  const farmContext = {
    farmId: farmRow.id,
    farmName: farmRow.name,
    state: farmRow.state,
    farmerFirstName: deriveFarmerFirstName(user),
    totalAcres: Number(farmRow.total_acres),
  };

  const dataByCrop: Partial<Record<EngineCrop, SellScoreScreenData>> = {};
  results.forEach((result, i) => {
    const crop = cropsToFetch[i];
    dataByCrop[crop] = toSellScoreScreenData({
      result,
      farm: farmContext,
      positions,
      elevator,
      today,
    });
  });

  // ── 11. Hand to the client wrapper ───────────────────────────────────
  return (
    <SellScoreLive
      crops={cropsToFetch}
      dataByCrop={dataByCrop as Record<EngineCrop, SellScoreScreenData>}
      basisDataAsOf={results[0].meta.basisDataAsOf}
      historicalSampleSize={results[0].meta.historicalSampleSize}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Derive a display first name from the Supabase auth User. Tries, in
 * order: user_metadata.first_name (set by an explicit signup form),
 * the first token of full_name or name (common for Google OAuth),
 * then the email username with first letter capitalized. Last-resort
 * fallback is "there" so the greeting always renders, even if it reads
 * slightly awkwardly. v1.2+ may pull from a dedicated user_profiles
 * table for richer personalization.
 */
function deriveFarmerFirstName(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const explicitFirst =
    typeof meta.first_name === 'string' ? meta.first_name.trim() : '';
  if (explicitFirst) return explicitFirst;

  const full =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : '';
  if (full) {
    const firstToken = full.trim().split(/\s+/)[0];
    if (firstToken) return firstToken;
  }

  const emailPrefix = (user.email ?? '').split('@')[0];
  if (emailPrefix) {
    // Capitalize first letter only — leave the rest as-is so emails like
    // "andrew.angerstien" or "drew99" don't get awkwardly transformed.
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  return 'there';
}
