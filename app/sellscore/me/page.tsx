// app/sellscore/me/page.tsx
// =============================================================================
// HarvestFile Sell Score — Live Personalized Score (server component, Deploy 2)
//
// Renders the live Sell Score for the authenticated user's setup-complete
// farm. Reads from sellscore_recommendations (the daily/manual compute
// output) AND grain_positions (per-crop expected/contracted bushels for
// real pace numbers).
//
// Auth chain (SHORT, sellscore architecture):
//   auth.uid() -> farms.owner_id
//
// Data flow:
//   1. farms              → farm context (name, county_fips, state, acres)
//   2. sellscore_recommendations → today's recommendation (if compute ran)
//   3. sellscore_elevators (is_primary=true) → reference elevator info
//   4. grain_positions    → per-crop expected/contracted for pace calc
//
// If no recommendation exists, shows "Preparing your first Sell Score"
// empty state. Onboard attempts inline compute; if Barchart fails, the
// 4 AM cron writes the row.
//
// ACCESS CONTROL (May 15, 2026 fix):
// Page now enforces farm.sellscore_active. When the webhook flips
// sellscore_active=false (subscription canceled or past_due with Smart
// Retries exhausted), this page redirects the user to /pricing instead
// of rendering recommendations. Premortem failure 2 part B fix —
// refunded customers no longer retain product access.
// =============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SellScoreScreen from '@/components/sellscore/SellScoreScreen';
import { getTargetPaceForDate, type Crop } from '@/lib/sellscore/pace-calendar';
import { REFERENCE_ELEVATORS } from '@/lib/sellscore/reference-elevators';
import type {
  SellScoreScreenData,
  FarmDisplayContext,
  ElevatorDisplay,
  SupportingFigure,
  PaceDisplay,
  BreakevenDisplay,
  FloorDisplay,
} from '@/lib/sellscore/display-types';
import type {
  Recommendation,
  CropPosition,
  RecommendationType,
  SignalStatus,
} from '@/lib/sellscore/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const V1_ENGINE_CROPS = new Set<Crop>(['corn', 'soybeans']);

export default async function SellScoreMePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/sellscore/me');

  // Find this farmer's active Sell Score farm
  const { data: farm } = await supabase
    .from('farms')
    .select(
      'id, name, owner_id, county_fips, state, total_acres, sellscore_setup_complete, sellscore_primary_crops, sellscore_active, subscription_status',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!farm) {
    // No farm record — webhook hasn't fired or this isn't a Sell Score
    // subscriber. Send them to pricing to convert.
    redirect('/pricing');
  }

  if (!farm.sellscore_active) {
    // Subscription canceled, unpaid, or otherwise inactive. The farm row
    // and stripe_customer_id are preserved for one-click resubscription —
    // when the user pays again, the webhook will flip sellscore_active
    // back to true and access is restored. Send to pricing in the meantime.
    redirect('/pricing');
  }

  if (!farm.sellscore_setup_complete) {
    // Has a farm but onboarding not done. Finish that first.
    redirect('/onboard');
  }

  // Latest recommendation across any crop for this farm
  const { data: latestRec } = await supabase
    .from('sellscore_recommendations')
    .select('*')
    .eq('farm_id', farm.id)
    .order('recommendation_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Primary elevator
  const { data: primaryElevator } = await supabase
    .from('sellscore_elevators')
    .select('*')
    .eq('farm_id', farm.id)
    .eq('is_primary', true)
    .maybeSingle();

  // All positions for this farm. Used for real pace numbers and position
  // cards instead of synthesizing from total_acres × yield.
  const { data: positionRows } = await supabase
    .from('grain_positions')
    .select(
      'commodity, crop_year, expected_bushels, bushels_contracted, breakeven_dollars_per_bu',
    )
    .eq('farm_id', farm.id)
    .order('crop_year', { ascending: false });

  // No recommendation yet → empty state
  if (!latestRec) {
    return <PreparingFirstScore farmName={farm.name} userEmail={user.email ?? ''} />;
  }

  const screenData = composeScreenData(
    farm,
    latestRec,
    primaryElevator,
    positionRows ?? [],
    user.email ?? '',
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f0d' }}>
      <SellScoreScreen data={screenData} />
    </div>
  );
}

// =============================================================================
// Display data composition
// =============================================================================

interface PositionRow {
  commodity: string;
  crop_year: number;
  expected_bushels: number | null;
  bushels_contracted: number | null;
  breakeven_dollars_per_bu: number | null;
}

function composeScreenData(
  farm: any,
  rec: any,
  elevator: any,
  positionRows: PositionRow[],
  userEmail: string,
): SellScoreScreenData {
  // ── Farm context ───────────────────────────────────────────────────────
  const firstName = farmerFirstName(userEmail);
  const today = new Date(rec.recommendation_date);
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const elevatorCity = elevator?.elevator_city ?? '';
  const referenceMatch = REFERENCE_ELEVATORS.find(
    (e) => e.countyFips === farm.county_fips,
  );
  const countyName = referenceMatch?.countyName ?? '';

  const context: FarmDisplayContext = {
    farmer_first_name: firstName,
    date_label: dateLabel,
    farm_name: farm.name,
    // Show the elevator city as "where your market is" since farms can be
    // anywhere in the US and we map them to the nearest of 25 supported
    // elevators. v1.1 adds a separate "your home county: X" line.
    county: countyName || elevatorCity || farm.state || 'Your',
    state: farm.state ?? '',
  };

  // ── Recommendation ─────────────────────────────────────────────────────
  const recommendation: Recommendation = {
    crop: rec.crop,
    recommendation_type: (rec.recommendation_type as RecommendationType) ?? 'hold',
    recommended_bushels: rec.recommended_bushels ?? null,
    recommended_cash_bid: rec.recommended_cash_bid ?? null,
    current_basis: rec.current_basis ?? 0,
    basis_3yr_percentile: rec.basis_3yr_percentile ?? null,
    margin_signal: (rec.margin_signal as SignalStatus) ?? 'yellow',
    basis_signal: (rec.basis_signal as SignalStatus) ?? 'yellow',
    pace_signal: (rec.pace_signal as SignalStatus) ?? 'yellow',
  } as Recommendation;

  // ── Elevator ───────────────────────────────────────────────────────────
  const elevatorDisplay: ElevatorDisplay | null = elevator
    ? {
        name: rec.recommended_elevator_name ?? elevator.elevator_name,
        city: elevator.elevator_city,
        state: elevator.elevator_state,
        distance_miles: elevator.distance_miles ?? null,
      }
    : null;

  // ── Supporting figures (only meaningful for SELL) ──────────────────────
  const supporting: SupportingFigure | null =
    recommendation.recommendation_type === 'sell' && rec.recommended_cash_bid
      ? {
          cash_price_per_bu: rec.recommended_cash_bid,
          basis_cents: Math.round((rec.current_basis ?? 0) * 100),
          basis_percentile: Math.round(rec.basis_3yr_percentile ?? 0),
          profit_per_acre: estimatePerAcreProfit(rec, farm, positionRows),
        }
      : null;

  // ── Real pace (ytd + target) for the recommendation's crop ─────────────
  const recCrop = rec.crop as string;
  const recPosition = positionRows.find((p) => p.commodity === recCrop);
  const expectedForRec = Number(recPosition?.expected_bushels ?? 0);
  const contractedForRec = Number(recPosition?.bushels_contracted ?? 0);

  const ytdPct =
    expectedForRec > 0
      ? Math.round((contractedForRec / expectedForRec) * 100)
      : 0;

  // Target pace from calendar. Only meaningful for v1 engine crops. Wheat
  // and sorghum get 0 because pace-calendar models corn/soybeans MY only.
  let targetPct = 0;
  if (isV1Crop(recCrop)) {
    targetPct = Math.round(getTargetPaceForDate(recCrop as Crop, today));
  }

  const pace: PaceDisplay = {
    ytd_pct: ytdPct,
    target_pct: targetPct,
    target_date_label: today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    status: paceStatusFromSignal(recommendation.pace_signal),
    status_label: paceStatusLabelFromSignal(recommendation.pace_signal),
  };

  // ── Positions (one card per primary crop) ──────────────────────────────
  // Prefer real grain_positions rows. Fall back to synthesized data for
  // crops on the farm without a position row (wheat or sorghum pre-v1.1).
  // All 14 CropPosition fields populated explicitly; ARC/PLC and insurance
  // fields get v1 defaults that the v1.1 position editor will replace.
  const primaryCrops: string[] = farm.sellscore_primary_crops ?? [];
  const positions: CropPosition[] = primaryCrops.map((crop): CropPosition => {
    const row = positionRows.find((p) => p.commodity === crop);
    if (row) {
      const expected = Number(row.expected_bushels ?? 0);
      const contracted = Number(row.bushels_contracted ?? 0);
      const unsold = Math.max(0, expected - contracted);
      const pacePct = expected > 0 ? Math.round((contracted / expected) * 100) : 0;
      const targetForCrop = isV1Crop(crop)
        ? Math.round(getTargetPaceForDate(crop as Crop, today))
        : 0;
      return {
        crop: crop as Crop,
        crop_year: Number(row.crop_year),
        expected_bushels: expected,
        unsold_bushels: unsold,
        pricing_pace_pct: pacePct,
        target_pace_pct: targetForCrop,
        breakeven_dollars_per_bu: Number(
          row.breakeven_dollars_per_bu ?? defaultBreakevenForCrop(crop),
        ),
        breakeven_source: 'county_default',
        arc_plc_election: 'unknown',
        insurance_coverage_level: null,
        insurance_has_sco: false,
        insurance_has_eco: false,
        insurance_eco_level: null,
        effective_floor_dollars_per_bu: null,
      };
    }
    // Fallback: synthesized for crops without a position row
    const expectedBu = estimateExpectedBushels(crop, farm.total_acres ?? 0);
    return {
      crop: crop as Crop,
      crop_year: today.getUTCFullYear(),
      expected_bushels: expectedBu,
      unsold_bushels: expectedBu,
      pricing_pace_pct: 0,
      target_pace_pct: 0,
      breakeven_dollars_per_bu: defaultBreakevenForCrop(crop),
      breakeven_source: 'county_default',
      arc_plc_election: 'unknown',
      insurance_coverage_level: null,
      insurance_has_sco: false,
      insurance_has_eco: false,
      insurance_eco_level: null,
      effective_floor_dollars_per_bu: null,
    };
  });

  // ── Breakevens (one per crop, mirrors positions) ───────────────────────
  const breakevens: BreakevenDisplay[] = positions.map((p) => ({
    crop: p.crop,
    dollars_per_bu: p.breakeven_dollars_per_bu,
    source: 'county_default' as const,
  }));

  // ── Floor ──────────────────────────────────────────────────────────────
  const floor: FloorDisplay = {
    dollars_per_bu: rec.effective_floor ?? defaultFloorForCrop(rec.crop),
    source_label: 'PLC reference + 85% RP + SCO',
  };

  // ── Headline from rationale_text ───────────────────────────────────────
  const headline = extractHeadline(rec.rationale_text, recommendation);

  return {
    context,
    recommendation,
    elevator: elevatorDisplay,
    supporting,
    pace,
    positions,
    breakevens,
    floor,
    headline,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function farmerFirstName(email: string): string {
  const local = email.split('@')[0];
  if (!local) return 'farmer';
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

function isV1Crop(crop: string): crop is Crop {
  return V1_ENGINE_CROPS.has(crop as Crop);
}

function paceStatusFromSignal(s: SignalStatus): 'on_pace' | 'behind' | 'ahead' {
  if (s === 'green') return 'on_pace';
  if (s === 'yellow') return 'ahead';
  return 'behind';
}

function paceStatusLabelFromSignal(s: SignalStatus): string {
  if (s === 'green') return 'On pace';
  if (s === 'yellow') return 'Slightly ahead';
  return 'Behind pace';
}

function estimateExpectedBushels(crop: string, acres: number): number {
  const yieldsPerAcre: Record<string, number> = {
    corn: 180,
    soybeans: 55,
    wheat: 65,
    sorghum: 75,
  };
  const yPerAcre = yieldsPerAcre[crop] ?? 100;
  return Math.round(acres * yPerAcre);
}

function defaultBreakevenForCrop(crop: string): number {
  const breakevens: Record<string, number> = {
    corn: 4.0,
    soybeans: 10.5,
    wheat: 6.35,
    sorghum: 4.67,
  };
  return breakevens[crop] ?? 4.0;
}

function defaultFloorForCrop(crop: string): number {
  // OBBBA effective reference prices, 2026
  const floors: Record<string, number> = {
    corn: 4.42,
    soybeans: 10.71,
    wheat: 6.35,
    sorghum: 4.67,
  };
  return floors[crop] ?? 4.0;
}

function estimatePerAcreProfit(
  rec: any,
  farm: any,
  positionRows: PositionRow[],
): number {
  const bushels = rec.recommended_bushels ?? 0;
  const cashBid = rec.recommended_cash_bid ?? 0;
  const positionRow = positionRows.find((p) => p.commodity === rec.crop);
  const breakeven =
    positionRow && positionRow.breakeven_dollars_per_bu != null
      ? Number(positionRow.breakeven_dollars_per_bu)
      : defaultBreakevenForCrop(rec.crop);
  const acres = farm.total_acres ?? 1;
  if (acres <= 0) return 0;
  return Math.round((bushels * (cashBid - breakeven)) / acres);
}

function extractHeadline(
  rationaleText: string | null,
  recommendation: Recommendation,
): string {
  if (rationaleText) {
    const firstLine = rationaleText
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (firstLine) return firstLine;
  }
  switch (recommendation.recommendation_type) {
    case 'sell':
      return 'Sell today.';
    case 'hold':
      return 'Hold today.';
    case 'pace_alert':
      return 'Behind pace.';
    case 'out_of_season':
      return 'Marketing year complete.';
    default:
      return 'Hold today.';
  }
}

// =============================================================================
// Sub-views
// =============================================================================

function PreparingFirstScore({
  farmName,
  userEmail,
}: {
  farmName: string;
  userEmail: string;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#131918',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          padding: '48px 36px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            backgroundColor: 'rgba(52, 211, 153, 0.12)',
            borderRadius: '16px',
            marginBottom: '24px',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v4" />
            <path d="m16.2 7.8 2.9-2.9" />
            <path d="M18 12h4" />
            <path d="m16.2 16.2 2.9 2.9" />
            <path d="M12 18v4" />
            <path d="m4.9 19.1 2.9-2.9" />
            <path d="M2 12h4" />
            <path d="m4.9 4.9 2.9 2.9" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: '#E8F0EB',
            letterSpacing: '-0.024em',
            lineHeight: 1.15,
            marginBottom: '12px',
          }}
        >
          Preparing your first Sell Score
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'rgba(232, 240, 235, 0.70)',
            lineHeight: 1.55,
            marginBottom: '24px',
          }}
        >
          Your farm{' '}
          <span style={{ color: '#E8F0EB', fontWeight: 600 }}>{farmName}</span> is
          set up. Your first Sell Score will be ready by{' '}
          <span style={{ color: '#34D399', fontWeight: 600 }}>tomorrow morning at 5 AM ET</span>
          .
        </p>

        <div
          style={{
            padding: '18px 20px',
            backgroundColor: 'rgba(201, 168, 76, 0.06)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
            borderRadius: '10px',
            textAlign: 'left',
            marginTop: '24px',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(232, 240, 235, 0.70)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            <strong style={{ color: '#E2C366' }}>What happens next:</strong> Every
            morning we pull live cash bids from your nearest elevator, compare against
            your breakeven, and tell you whether to price more bushels today. You'll
            get a daily email at {userEmail} and can check in here any time.
          </p>
        </div>
      </div>
    </div>
  );
}
