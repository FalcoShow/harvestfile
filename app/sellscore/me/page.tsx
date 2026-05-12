// app/sellscore/me/page.tsx
// =============================================================================
// HarvestFile Sell Score — Live Personalized Score (server component)
//
// Renders the live Sell Score for the authenticated user's setup-complete
// farm. Reads the most recent recommendation from sellscore_recommendations.
// If no recommendation exists for today (cron hasn't run yet, or new farm),
// shows a "preparing your first Sell Score" empty state.
//
// This is a NEW route at /sellscore/me — separate from /sellscore (marketing)
// and /sellscore/preview (mock data demo). The /dashboard route swap to
// Sell Score is a future task; this page exists so newly-onboarded farmers
// have somewhere to land after submitting the onboarding form.
//
// Auth chain (SHORT): auth.uid() -> farms.owner_id
//
// Composition: reuses the existing SellScoreScreen component (already polished
// and shipped in the polish commit) with real recommendation data.
// =============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SellScoreScreen from '@/components/sellscore/SellScoreScreen';
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
      'id, name, owner_id, county_fips, state, total_acres, sellscore_setup_complete, sellscore_primary_crops, sellscore_active'
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!farm) {
    // No farm record at all — webhook hasn't fired yet or this isn't a
    // Sell Score subscriber. Send them to pricing to convert.
    redirect('/pricing');
  }

  if (!farm.sellscore_setup_complete) {
    // Has a farm but onboarding not done — finish that first
    redirect('/onboard');
  }

  // Fetch the latest recommendation for any of the farm's crops
  // We pick the most recent one across all crops for the headline.
  const { data: latestRec } = await supabase
    .from('sellscore_recommendations')
    .select('*')
    .eq('farm_id', farm.id)
    .order('recommendation_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch primary elevator
  const { data: primaryElevator } = await supabase
    .from('sellscore_elevators')
    .select('*')
    .eq('farm_id', farm.id)
    .eq('is_primary', true)
    .maybeSingle();

  // No recommendation yet → show the "preparing your first Sell Score" state.
  // This happens when the daily cron hasn't run for this farm yet (just
  // onboarded) or if cron hasn't been wired yet.
  if (!latestRec) {
    return <PreparingFirstScore farmName={farm.name} userEmail={user.email ?? ''} />;
  }

  // Compose the display data shape that SellScoreScreen expects.
  const screenData = composeScreenData(farm, latestRec, primaryElevator, user.email ?? '');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f0d' }}>
      <SellScoreScreen data={screenData} />
    </div>
  );
}

// =============================================================================
// Display data composition
// =============================================================================

function composeScreenData(
  farm: any,
  rec: any,
  elevator: any,
  userEmail: string
): SellScoreScreenData {
  // ── Farm context ─────────────────────────────────────────────────────────
  const firstName = farmerFirstName(userEmail);
  const today = new Date(rec.recommendation_date);
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const context: FarmDisplayContext = {
    farmer_first_name: firstName,
    date_label: dateLabel,
    farm_name: farm.name,
    county: countyNameFromFips(farm.county_fips, farm.state) ?? farm.state ?? 'Your',
    state: farm.state ?? '',
  };

  // ── Recommendation ───────────────────────────────────────────────────────
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

  // ── Elevator ─────────────────────────────────────────────────────────────
  const elevatorDisplay: ElevatorDisplay | null = elevator
    ? {
        name: rec.recommended_elevator_name ?? elevator.elevator_name,
        city: elevator.elevator_city,
        state: elevator.elevator_state,
        distance_miles: elevator.distance_miles ?? null,
      }
    : null;

  // ── Supporting figures (only meaningful for SELL) ────────────────────────
  const supporting: SupportingFigure | null =
    recommendation.recommendation_type === 'sell' && rec.recommended_cash_bid
      ? {
          cash_price_per_bu: rec.recommended_cash_bid,
          basis_cents: Math.round((rec.current_basis ?? 0) * 100),
          basis_percentile: Math.round(rec.basis_3yr_percentile ?? 0),
          profit_per_acre: estimatePerAcreProfit(rec, farm),
        }
      : null;

  // ── Pace context ─────────────────────────────────────────────────────────
  // Pace fields are not currently persisted on sellscore_recommendations
  // (a future migration). For now, derive sensible defaults from the
  // pace_signal classification.
  const pace: PaceDisplay = {
    ytd_pct: 0, // TODO: persist on recommendations row in v1.1
    target_pct: 0,
    target_date_label: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    status: paceStatusFromSignal(recommendation.pace_signal),
    status_label: paceStatusLabelFromSignal(recommendation.pace_signal),
  };

  // ── Position (one card per primary crop) ─────────────────────────────────
  // For v1, position cards show static "expected vs unsold" placeholders
  // computed from total_acres × county yield. The cron-computed values will
  // populate properly in v1.1 when sellscore_position is added to the
  // recommendation persistence step.
  const positions: CropPosition[] = (farm.sellscore_primary_crops ?? ['corn', 'soybeans']).map(
    (crop: string) => {
      // Crude expected-bushel estimate: total_acres × default county yield
      const expectedBu = estimateExpectedBushels(crop, farm.total_acres ?? 0);
      const unsoldBu = expectedBu; // v1: assume nothing priced yet
      return {
        crop,
        crop_year: today.getFullYear().toString(),
        expected_bushels: expectedBu,
        unsold_bushels: unsoldBu,
        pricing_pace_pct: 0,
        target_pace_pct: 0,
        breakeven_dollars_per_bu: defaultBreakevenForCrop(crop),
        breakeven_source: 'county_default' as const,
      };
    }
  );

  // ── Breakevens (one per crop, mirrors positions) ─────────────────────────
  const breakevens: BreakevenDisplay[] = positions.map((p) => ({
    crop: p.crop,
    dollars_per_bu: p.breakeven_dollars_per_bu,
    source: 'county_default' as const,
  }));

  // ── Floor ────────────────────────────────────────────────────────────────
  const floor: FloorDisplay = {
    dollars_per_bu: rec.effective_floor ?? defaultFloorForCrop(rec.crop),
    source_label: 'PLC reference + 85% RP + SCO',
  };

  // ── Headline / summary text from rationale_text ──────────────────────────
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
  // capitalize first letter of email local-part for the greeting
  if (!local) return 'farmer';
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

function countyNameFromFips(fips: string | null, state: string | null): string | null {
  if (!fips || !state) return null;
  // v1 simplification: FIPS may be state-level only (per onboard/submit
  // lookupZip). Just return null if we can't resolve a county name —
  // SellScoreScreen falls back to state.
  if (fips.length === 2) return null;
  return null; // TODO v1.1: HUD ZIP-county crosswalk integration
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
  // Conservative county-default yields — v1 placeholder until
  // county_breakeven_defaults integration in /sellscore/me data flow.
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
  // OBBBA effective reference prices, 2026 (per project memory)
  const floors: Record<string, number> = {
    corn: 4.42,
    soybeans: 10.71,
    wheat: 6.35,
    sorghum: 4.67,
  };
  return floors[crop] ?? 4.0;
}

function estimatePerAcreProfit(rec: any, farm: any): number {
  // Per-acre profit on the recommended bushels at current cash bid vs breakeven
  const bushels = rec.recommended_bushels ?? 0;
  const cashBid = rec.recommended_cash_bid ?? 0;
  const breakeven = defaultBreakevenForCrop(rec.crop);
  const acres = farm.total_acres ?? 1;
  if (acres <= 0) return 0;
  return Math.round((bushels * (cashBid - breakeven)) / acres);
}

function extractHeadline(
  rationaleText: string | null,
  recommendation: Recommendation
): string {
  if (rationaleText) {
    // rationale_text format from rationale.ts is multi-line; take the first
    // non-empty line as the headline.
    const firstLine = rationaleText
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (firstLine) return firstLine;
  }
  // Fallbacks by recommendation type
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
