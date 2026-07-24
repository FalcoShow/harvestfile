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
//   5. professionals      → real first name for greeting (M-01, May 18)
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
//
// May 16, 2026 voice-spec update:
//   - extractHeadline PACE_ALERT fallback now reads as a full sentence
//     instead of the fragment "Behind pace."
//   - PreparingFirstScore empty state adds the discipline-aid one-liner
//     ("We don't predict prices. We enforce the same checklist...")
//
// May 18, 2026 M-01 username fix:
//   - farmerFirstName(email) removed. Greeting was rendering the email
//     local-part ("Andrewangerstien1502") as the display name, which read
//     as broken software in the mobile audit.
//   - Replaced with extractFirstName(fullName) which reads the linked
//     professional record's full_name column and returns the first
//     whitespace-delimited word ("Andrew Angerstien" -> "Andrew").
//   - professionals.auth_id is the join column (nullable). If no
//     professional record exists for this auth user, or full_name is
//     empty, extractFirstName falls back to 'farmer'.
//
// July 23, 2026 signal-semantics fixes (v6.6 backlog #1 and #8):
//   - Pace inversion resolved end-to-end. persist.ts now stores the engine
//     pace level directly (spec §4.4: at-or-behind = GREEN, urgency to
//     sell). paceStatusFromSignal / paceStatusLabelFromSignal here were
//     rewritten to those semantics: green renders "Behind pace — room to
//     sell" (or "On pace" when at target), yellow "Slightly ahead of
//     pace", red "Ahead of pace". Labels and dot colors now agree instead
//     of cancelling out.
//   - Rows written BEFORE the persist.ts fix still carry the inverted
//     pace_signal until their next recompute (4 AM cron or POST
//     /api/sellscore/compute). We derive a fallback from live pace numbers
//     when the stored value is missing, but we intentionally do not guess
//     which convention a stored value used.
//   - signalSummary (rationale_text line 2) is now surfaced under the
//     headline via SellScoreScreenData.signal_summary.
//   - basis_signal fallback no longer blanket-defaults to 'yellow'; when
//     the column is null we re-derive from basis_3yr_percentile using the
//     spec §4.4 thresholds (< 25th percentile = red).
// =============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import SellScoreScreen from '@/components/sellscore/SellScoreScreen';
import { getTargetPaceForDate, type Crop } from '@/lib/sellscore/pace-calendar';
import { REFERENCE_ELEVATORS } from '@/lib/sellscore/reference-elevators';
import { getGrainBidsByCoords, type GrainElevator } from '@/lib/barchart';
import { fetchSeasonalBasis } from '@/lib/sellscore/seasonal-basis';
import type {
  SellScoreScreenData,
  FarmDisplayContext,
  ElevatorDisplay,
  SupportingFigure,
  PaceDisplay,
  BreakevenDisplay,
  FloorDisplay,
  BelowFoldDisplay,
  ElevatorBidDisplay,
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

  // M-01 (May 18, 2026): look up the professional record for this user's
  // real first name. Link column is auth_id (nullable). If no record exists
  // or full_name is empty, extractFirstName falls back to 'farmer'.
  const { data: professional } = await supabase
    .from('professionals')
    .select('full_name')
    .eq('auth_id', user.id)
    .maybeSingle();

  // Latest recommendation across any crop for this farm
  const { data: latestRec } = await supabase
    .from('sellscore_recommendations')
    .select('*')
    .eq('farm_id', farm.id)
    .order('recommendation_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Elevators: primary first, up to two pinned rows total (A2 renders
  // "pinned + closest" — v1 farms have one primary; the limit keeps the
  // comparison stable if v1.1 adds a second pin).
  const { data: elevatorRows } = await supabase
    .from('sellscore_elevators')
    .select('*')
    .eq('farm_id', farm.id)
    .order('is_primary', { ascending: false })
    .limit(2);

  const pinnedElevators = elevatorRows ?? [];
  const primaryElevator =
    pinnedElevators.find((e: any) => e.is_primary) ?? pinnedElevators[0] ?? null;

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
    professional?.full_name ?? null,
  );

  // Below-the-fold depth (spec §4.1, A2–A7). Every piece is best-effort:
  // a Barchart or basis-history failure nulls that section, never the page.
  screenData.below_fold = await composeBelowFold(farm, latestRec, pinnedElevators);

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
  professionalFullName: string | null,
): SellScoreScreenData {
  // ── Farm context ───────────────────────────────────────────────────────
  const firstName = extractFirstName(professionalFullName);
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

  // ── Real pace (ytd + target) for the recommendation's crop ─────────────
  // Computed BEFORE the recommendation object so signal fallbacks can be
  // derived from live numbers when a stored signal column is null.
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

  // ── Recommendation ─────────────────────────────────────────────────────
  const recommendation: Recommendation = {
    crop: rec.crop,
    recommendation_type: (rec.recommendation_type as RecommendationType) ?? 'hold',
    recommended_bushels: rec.recommended_bushels ?? null,
    recommended_cash_bid: rec.recommended_cash_bid ?? null,
    current_basis: rec.current_basis ?? 0,
    basis_3yr_percentile: rec.basis_3yr_percentile ?? null,
    margin_signal: normalizeSignal(rec.margin_signal) ?? 'yellow',
    basis_signal:
      normalizeSignal(rec.basis_signal) ??
      basisSignalFromPercentile(rec.basis_3yr_percentile),
    pace_signal:
      normalizeSignal(rec.pace_signal) ??
      paceSignalFromGap(ytdPct - targetPct),
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

  const pace: PaceDisplay = {
    ytd_pct: ytdPct,
    target_pct: targetPct,
    target_date_label: today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    status: paceStatusFromSignal(recommendation.pace_signal, ytdPct, targetPct),
    status_label: paceStatusLabelFromSignal(
      recommendation.pace_signal,
      ytdPct,
      targetPct,
    ),
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

  // ── Headline + signal summary from rationale_text ──────────────────────
  const headline = extractHeadline(rec.rationale_text, recommendation);
  const signalSummary = extractSignalSummary(rec.rationale_text);

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
    signal_summary: signalSummary,
  };
}

// =============================================================================
// Below-the-fold composition (spec §4.1, A2–A7 — July 23, 2026)
// =============================================================================

/** Barchart commodityName values are title case ("Corn", "Soybeans"). */
const BARCHART_COMMODITY: Record<string, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  wheat: 'Wheat',
  sorghum: 'Sorghum',
};

/** Spray card is seasonal: April (3) through October (9), per spec §4.1. */
function isSpraySeason(date: Date): boolean {
  const m = date.getUTCMonth();
  return m >= 3 && m <= 9;
}

async function composeBelowFold(
  farm: any,
  rec: any,
  pinnedRows: any[],
): Promise<BelowFoldDisplay> {
  const referenceMatch = REFERENCE_ELEVATORS.find(
    (e) => e.countyFips === farm.county_fips,
  );
  const crop = rec.crop as string;
  const today = new Date(rec.recommendation_date);

  const belowFold: BelowFoldDisplay = {
    elevators: null,
    basis: null,
    // Weather anchor: the reference elevator's coordinates. Farms don't
    // persist lat/lng in v1; the elevator is "where your market is."
    lat: referenceMatch?.lat ?? null,
    lng: referenceMatch?.lng ?? null,
    show_spray: isSpraySeason(new Date()),
  };

  // ── A2: pinned + closest elevators with today's cash bids ──────────────
  try {
    const commodityName = BARCHART_COMMODITY[crop] ?? null;
    let nearby: GrainElevator[] = [];
    if (referenceMatch && commodityName) {
      // getGrainBidsByCoords never throws: it serves stale cache or []
      // on failure, and caches successes 15 min during market hours.
      nearby = await getGrainBidsByCoords(referenceMatch.lat, referenceMatch.lng, {
        commodities: [commodityName],
        maxDistance: 60,
        maxLocations: 10,
        bidsPerCommodity: 1,
      });
    }
    const merged = mergeElevatorRows(pinnedRows, nearby, commodityName);
    belowFold.elevators = merged.length > 0 ? merged : null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[sellscore/me] elevator comparison failed:', err);
  }

  // ── A3: county basis series + 3-year same-date norm ────────────────────
  // county_basis_history is a public reference table read with the
  // service-role client (same convention as persist.ts / compute route).
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      const service = createServiceClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      const since = new Date(today);
      since.setUTCDate(since.getUTCDate() - 90);

      const { data: basisRows } = await service
        .from('county_basis_history')
        .select('observation_date, basis')
        .eq('county_fips', farm.county_fips)
        .eq('crop', crop)
        .gte('observation_date', formatYmd(since))
        .order('observation_date', { ascending: true });

      const series = (basisRows ?? [])
        .filter((r: any) => r.basis != null && r.observation_date)
        .map((r: any) => ({
          time: String(r.observation_date),
          value: Number(r.basis),
        }));

      let norm3yr: number | null = null;
      try {
        const seasonal = await fetchSeasonalBasis(
          service,
          farm.county_fips,
          crop,
          today,
        );
        if (seasonal.values.length > 0) {
          const mean =
            seasonal.values.reduce((s, v) => s + v, 0) / seasonal.values.length;
          norm3yr = Math.round(mean * 10000) / 10000;
        }
      } catch {
        /* thin history — norm line simply doesn't render */
      }

      if (series.length > 0 || norm3yr != null) {
        belowFold.basis = {
          crop,
          county_label:
            referenceMatch?.countyName != null
              ? `${referenceMatch.countyName} County`
              : (farm.state ?? 'Your county'),
          series,
          norm_3yr: norm3yr,
          current:
            rec.current_basis ??
            (series.length > 0 ? series[series.length - 1].value : null),
        };
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[sellscore/me] basis chart composition failed:', err);
  }

  return belowFold;
}

/**
 * Pinned rows (sellscore_elevators) first, then the closest Barchart
 * elevators that aren't already pinned, capped at 3 extras (spec §4.1:
 * "pinned 2 elevators + closest 3"). Pinned rows keep their true
 * farm-to-elevator distance; nearby rows carry Barchart's distance from
 * the reference-elevator query origin.
 */
function mergeElevatorRows(
  pinnedRows: any[],
  nearby: GrainElevator[],
  commodityName: string | null,
): ElevatorBidDisplay[] {
  const bidFor = (el: GrainElevator): number | null => {
    const bid =
      el.bids.find(
        (b) => (!commodityName || b.commodity === commodityName) && b.cashPrice > 0,
      ) ?? null;
    return bid ? bid.cashPrice : null;
  };

  const out: ElevatorBidDisplay[] = [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();

  for (const p of pinnedRows.slice(0, 2)) {
    const pinnedId = p.barchart_elevator_id != null ? String(p.barchart_elevator_id) : null;
    const match = pinnedId ? nearby.find((n) => n.id === pinnedId) : undefined;
    if (match) usedIds.add(match.id);
    const nameKey = `${(p.elevator_name ?? '').toLowerCase()}|${(p.elevator_city ?? '').toLowerCase()}`;
    usedNames.add(nameKey);
    out.push({
      id: pinnedId ?? `pinned-${p.id ?? out.length}`,
      name: p.elevator_name ?? 'Your elevator',
      city: p.elevator_city ?? '',
      state: p.elevator_state ?? '',
      distance_miles: p.distance_miles != null ? Number(p.distance_miles) : null,
      cash_bid: match ? bidFor(match) : null,
      pinned: true,
    });
  }

  const sorted = [...nearby].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  for (const n of sorted) {
    if (out.length >= pinnedRows.slice(0, 2).length + 3) break;
    if (usedIds.has(n.id)) continue;
    const nameKey = `${n.name.toLowerCase()}|${n.city.toLowerCase()}`;
    if (usedNames.has(nameKey)) continue;
    usedIds.add(n.id);
    usedNames.add(nameKey);
    out.push({
      id: n.id,
      name: n.name,
      city: n.city,
      state: n.state,
      distance_miles: n.distance ?? null,
      cash_bid: bidFor(n),
      pinned: false,
    });
  }

  return out;
}

function formatYmd(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// =============================================================================
// Helpers
// =============================================================================

// M-01 (May 18, 2026): replaces farmerFirstName(email).
// Source of truth is professionals.full_name. Returns the first
// whitespace-delimited word, preserving the original casing the user
// entered. Falls back to 'farmer' if the full_name is null, undefined,
// empty, or whitespace-only. Examples:
//   "Andrew Angerstien" -> "Andrew"
//   "Mary Jane Watson"  -> "Mary"
//   "McDonald"          -> "McDonald"
//   "  "                -> "farmer"
//   null                -> "farmer"
function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'farmer';
  const trimmed = fullName.trim();
  if (!trimmed) return 'farmer';
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord;
}

function isV1Crop(crop: string): crop is Crop {
  return V1_ENGINE_CROPS.has(crop as Crop);
}

/** Returns the value if it's a valid SignalStatus, else null. */
function normalizeSignal(value: unknown): SignalStatus | null {
  return value === 'green' || value === 'yellow' || value === 'red'
    ? value
    : null;
}

/**
 * Fallback basis signal when the stored column is null: re-derive from
 * the 3-year percentile using spec §4.4 thresholds. Bottom quartile is
 * RED ("unusually weak"), top quartile GREEN, middle AMBER. Null
 * percentile (thin history) stays neutral yellow rather than alarming.
 */
function basisSignalFromPercentile(pctile: number | null | undefined): SignalStatus {
  if (pctile == null) return 'yellow';
  if (pctile >= 75) return 'green';
  if (pctile >= 25) return 'yellow';
  return 'red';
}

/**
 * Fallback pace signal when the stored column is null: mirror of
 * lib/sellscore/signals.ts classifyPaceSignal. gap = current − target;
 * at-or-behind is GREEN (urgency to sell, spec §4.4), 0–5pp ahead AMBER,
 * >5pp ahead RED.
 */
function paceSignalFromGap(gapPp: number): SignalStatus {
  if (gapPp <= 0) return 'green';
  if (gapPp <= 5) return 'yellow';
  return 'red';
}

/**
 * July 23, 2026 fix (v6.6 backlog #1): status now follows engine
 * semantics. Signal green covers the whole at-or-behind range, so it
 * splits on whether the farmer has reached target; yellow (0–5pp ahead)
 * reads as on-pace; red (>5pp ahead) reads as ahead.
 */
function paceStatusFromSignal(
  s: SignalStatus,
  ytdPct: number,
  targetPct: number,
): 'on_pace' | 'behind' | 'ahead' {
  if (s === 'green') return ytdPct >= targetPct ? 'on_pace' : 'behind';
  if (s === 'yellow') return 'on_pace';
  return 'ahead';
}

/**
 * Voice-spec pace label, aligned with rationale.ts paceDetail: behind
 * pace is framed as capacity ("room to sell") to match the green signal
 * it accompanies, not as a scold.
 */
function paceStatusLabelFromSignal(
  s: SignalStatus,
  ytdPct: number,
  targetPct: number,
): string {
  if (ytdPct >= 99.5) return 'Marketing year complete';
  if (s === 'green') {
    return ytdPct >= targetPct ? 'On pace' : 'Behind pace — room to sell';
  }
  if (s === 'yellow') return 'Slightly ahead of pace';
  return 'Ahead of pace';
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
      return "Hold today. You're behind pace.";
    case 'out_of_season':
      return 'Marketing year complete.';
    default:
      return 'Hold today.';
  }
}

/**
 * v6.6 backlog #8 fix (July 23, 2026): the voice-spec summary sentence
 * ("Margin and basis say sell. Pace is the blocker...") is written by
 * persist.ts as line 2 of rationale_text but was never displayed.
 * Recover it: second non-empty line, unless that line is already one of
 * the per-signal detail lines ("Margin: ...") or legal boilerplate —
 * which happens for rows written before the summary line existed.
 */
function extractSignalSummary(rationaleText: string | null): string | null {
  if (!rationaleText) return null;
  const lines = rationaleText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const candidate = lines[1];
  if (/^(Margin|Basis|Pace)\s*:/i.test(candidate)) return null;
  if (/^Past performance/i.test(candidate)) return null;
  return candidate;
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
            your breakeven, and tell you whether to price more bushels today. We don't
            predict prices. We enforce the same checklist top grain marketers run every
            morning. You'll get a daily email at {userEmail} and can check in here any time.
          </p>
        </div>
      </div>
    </div>
  );
}
