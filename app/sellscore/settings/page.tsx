// app/sellscore/settings/page.tsx
// =============================================================================
// Sell Score Settings page (server component, M-02, May 18, 2026)
//
// Round 2 Item 4 (July 23, 2026, spec v6.6 §5): no longer read-only.
// Adds the spec'd farm-data controls between the read-only sections:
//   - Per-crop breakeven with the §5.4 source indicator ("county
//     default" vs "your number") and a reset-to-default affordance.
//   - Expected bushels per crop.
//   - Unsold/contracted position correction ("bushels already priced").
//   - Pinned elevator management (2 pins per the v1 lock; pick from the
//     nearby Barchart list, choose which is primary).
//   - County (choose from the 25 supported reference counties — the
//     county selects the elevator whose bids and basis history feed the
//     engine).
// Saves POST to /api/sellscore/settings, which validates/clamps and runs
// the same §5.3 recompute path log-sale uses whenever an engine input
// (breakeven, expected bu, position, county) changed.
//
// Auth chain matches /sellscore/me:
//   auth.uid() -> farms.owner_id (short, sellscore-style)
// Plus a professionals lookup by auth_id for the display name.
//
// Manage subscription is the ManageSubscriptionButton client component
// (M-02c). It POSTs to /api/stripe/portal via fetch, reads the JSON
// response containing a Stripe Billing Portal session URL, and sets
// window.location.href to navigate. See that component's header for
// the full reasoning.
//
// Typography: 18px floor for all body/label/value text per the 58+
// demographic constraint. Section headers use larger sizes. The same
// dark mode palette as /sellscore/me (#0a0f0d page, #131918 cards).
//
// M-02b fix (May 18, 2026):
//   - Status display: formatSubscriptionStatus now treats sellscore_active
//     as the authoritative source for "Active". Production verification
//     surfaced "Inactive" rendering for a user with confirmed product
//     access because the raw subscription_status column held a non-standard
//     "inactive" string that hit the default case. The boolean wins.
//
// M-02c fix (May 18, 2026):
//   - Stripe portal: replaced native form POST with a client component
//     that fetches the endpoint and navigates manually. The endpoint
//     returns JSON, not a redirect, so form POST rendered raw JSON to
//     the user instead of navigating to Stripe. The endpoint itself is
//     unchanged because other callers may depend on the JSON shape.
// =============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/sellscore/SignOutButton';
import ManageSubscriptionButton from '@/components/sellscore/ManageSubscriptionButton';
import SettingsFarmData, {
  type CropSettingsDisplay,
  type CountyOptionDisplay,
  type ElevatorOptionDisplay,
} from '@/components/sellscore/SettingsFarmData';
import { REFERENCE_ELEVATORS } from '@/lib/sellscore/reference-elevators';
import { getGrainBidsByCoords, type GrainElevator } from '@/lib/barchart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// v1 engine crops — the only crops with grain_positions rows.
const POSITION_CROPS = new Set(['corn', 'soybeans']);

// County defaults, matching onboarding and /api/sellscore/settings.
const DEFAULT_BREAKEVENS: Record<string, number> = {
  corn: 4.0,
  soybeans: 10.5,
};

/** Barchart commodityName values are title case ("Corn", "Soybeans"). */
const BARCHART_COMMODITY: Record<string, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  wheat: 'Wheat',
  sorghum: 'Sorghum',
};

/** Nearby (non-pinned) elevator options offered for pinning. */
const MAX_NEARBY_OPTIONS = 8;

export default async function SellScoreSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/sellscore/settings');

  // Professional record for name display
  const { data: professional } = await supabase
    .from('professionals')
    .select('full_name, email')
    .eq('auth_id', user.id)
    .maybeSingle();

  // Farm record for farm/subscription display + farm-data controls
  const { data: farm } = await supabase
    .from('farms')
    .select(
      'id, name, county_fips, state, sellscore_active, sellscore_primary_crops, subscription_status',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayName = professional?.full_name ?? 'Not set';
  const displayEmail = user.email ?? professional?.email ?? 'Not provided';
  const farmName = farm?.name ?? 'Not set';
  const farmState = farm?.state ?? 'Not set';
  const subscriptionStatus = formatSubscriptionStatus(
    farm?.subscription_status,
    farm?.sellscore_active,
  );

  // ── Round 2 Item 4: farm-data control state ──────────────────────────────
  let cropSettings: CropSettingsDisplay[] = [];
  let elevatorOptions: ElevatorOptionDisplay[] = [];
  const countyOptions: CountyOptionDisplay[] = [...REFERENCE_ELEVATORS]
    .sort((a, b) =>
      a.state === b.state
        ? a.countyName.localeCompare(b.countyName)
        : a.state.localeCompare(b.state),
    )
    .map((e) => ({
      county_fips: e.countyFips,
      label: `${e.countyName} County, ${e.state}`,
    }));

  if (farm) {
    // Newest position row per v1 crop.
    const { data: positionRows } = await supabase
      .from('grain_positions')
      .select(
        'commodity, crop_year, expected_bushels, bushels_contracted, breakeven_dollars_per_bu, breakeven_source',
      )
      .eq('farm_id', farm.id)
      .order('crop_year', { ascending: false });

    const seenCrops = new Set<string>();
    for (const row of positionRows ?? []) {
      const crop = String(row.commodity ?? '');
      if (!POSITION_CROPS.has(crop) || seenCrops.has(crop)) continue;
      seenCrops.add(crop);
      cropSettings.push({
        crop,
        crop_year: Number(row.crop_year),
        expected_bushels: Number(row.expected_bushels ?? 0),
        bushels_contracted: Number(row.bushels_contracted ?? 0),
        breakeven_dollars_per_bu: Number(
          row.breakeven_dollars_per_bu ?? DEFAULT_BREAKEVENS[crop],
        ),
        breakeven_source: String(row.breakeven_source ?? 'county_default'),
        county_default_breakeven: DEFAULT_BREAKEVENS[crop],
      });
    }
    // Stable order: corn, then soybeans.
    cropSettings = cropSettings.sort((a, b) => a.crop.localeCompare(b.crop));

    // Pinned rows first, then nearby elevators available to pin.
    const { data: elevatorRows } = await supabase
      .from('sellscore_elevators')
      .select('*')
      .eq('farm_id', farm.id)
      .order('is_primary', { ascending: false })
      .limit(2);
    const pinnedRows = elevatorRows ?? [];

    const usedIds = new Set<string>();
    const usedNames = new Set<string>();
    for (const p of pinnedRows) {
      const id =
        p.barchart_elevator_id != null
          ? String(p.barchart_elevator_id)
          : `pinned-${p.id ?? usedIds.size}`;
      usedIds.add(id);
      usedNames.add(
        `${String(p.elevator_name ?? '').toLowerCase()}|${String(p.elevator_city ?? '').toLowerCase()}`,
      );
      elevatorOptions.push({
        barchart_elevator_id: id,
        name: p.elevator_name ?? 'Your elevator',
        city: p.elevator_city ?? '',
        state: p.elevator_state ?? '',
        distance_miles: p.distance_miles != null ? Number(p.distance_miles) : null,
        pinned: true,
        is_primary: p.is_primary === true,
      });
    }

    // Nearby options are best-effort: a Barchart failure just means the
    // farmer sees their current pins without swap candidates today.
    try {
      const reference = REFERENCE_ELEVATORS.find(
        (e) => e.countyFips === farm.county_fips,
      );
      if (reference) {
        const primaryCrops: string[] = farm.sellscore_primary_crops ?? [];
        const commodities = primaryCrops
          .map((c) => BARCHART_COMMODITY[c])
          .filter((c): c is string => Boolean(c));
        const nearby: GrainElevator[] = await getGrainBidsByCoords(
          reference.lat,
          reference.lng,
          {
            commodities: commodities.length > 0 ? commodities : ['Corn'],
            maxDistance: 60,
            maxLocations: 15,
            bidsPerCommodity: 1,
          },
        );
        const sorted = [...nearby].sort(
          (a, b) => (a.distance ?? 0) - (b.distance ?? 0),
        );
        for (const n of sorted) {
          if (elevatorOptions.length >= pinnedRows.length + MAX_NEARBY_OPTIONS) break;
          if (usedIds.has(n.id)) continue;
          const nameKey = `${n.name.toLowerCase()}|${n.city.toLowerCase()}`;
          if (usedNames.has(nameKey)) continue;
          usedIds.add(n.id);
          usedNames.add(nameKey);
          elevatorOptions.push({
            barchart_elevator_id: n.id,
            name: n.name,
            city: n.city,
            state: n.state,
            distance_miles: n.distance ?? null,
            pinned: false,
            is_primary: false,
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[sellscore/settings] nearby elevator fetch failed:', err);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f0d',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#E8F0EB',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '32px 20px 64px',
        }}
      >
        {/* Page header */}
        <header style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: '#E8F0EB',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Settings
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(232, 240, 235, 0.65)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Manage your account, farm, and subscription.
          </p>
        </header>

        {/* Account section */}
        <Section title="Account">
          <Field label="Name" value={displayName} />
          <Field label="Email" value={displayEmail} />
        </Section>

        {/* Farm section */}
        <Section title="Farm">
          <Field label="Farm name" value={farmName} />
          <Field label="State" value={farmState} />
        </Section>

        {/* Round 2 Item 4: farm-data controls (client) */}
        <SettingsFarmData
          positions={cropSettings}
          countyFips={farm?.county_fips ?? null}
          countyOptions={countyOptions}
          elevators={elevatorOptions}
        />

        {/* Subscription section */}
        <Section title="Subscription">
          <Field label="Plan" value="Sell Score" />
          <Field label="Status" value={subscriptionStatus} />
          <div style={{ marginTop: '20px' }}>
            <ManageSubscriptionButton />
          </div>
        </Section>

        {/* Sign out section */}
        <Section title="Session">
          <SignOutButton />
        </Section>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-views
// =============================================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: '24px',
        padding: '24px 20px',
        backgroundColor: '#131918',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '14px',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: '#E8F0EB',
          margin: 0,
          marginBottom: '18px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '18px',
          fontWeight: 500,
          color: 'rgba(232, 240, 235, 0.55)',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '18px',
          fontWeight: 500,
          color: '#E8F0EB',
          letterSpacing: '-0.005em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

// M-02b (May 18, 2026): sellscore_active is the source of truth for whether
// the user has product access today. If it's true, render "Active" and
// ignore the raw Stripe lifecycle status. Raw status only matters when
// access is denied, to explain why (canceled, past due, unpaid, etc.).
function formatSubscriptionStatus(
  rawStatus: string | null | undefined,
  isActive: boolean | null | undefined,
): string {
  if (isActive === true) return 'Active';

  // isActive is false, null, or undefined. Use rawStatus to label why.
  if (!rawStatus) return 'Inactive';
  switch (rawStatus) {
    case 'canceled':
      return 'Canceled';
    case 'past_due':
      return 'Past due';
    case 'unpaid':
      return 'Unpaid';
    case 'incomplete':
    case 'incomplete_expired':
      return 'Incomplete';
    case 'paused':
      return 'Paused';
    default:
      return (
        rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
      );
  }
}
