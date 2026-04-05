// =============================================================================
// app/api/markets/basis-tracking/route.ts
// HarvestFile — Surface 2 Deploy 3D-fix: Basis Tracking API
//
// DEPLOY 3D-FIX: Barchart returns basis in CENTS (both getGrainBids and
// getHistory). Removed ALL erroneous * 100 multiplications that caused
// double-conversion (e.g., 28 cents → 2800). Also fixed computeTrendScore
// and volatility normalization ranges (were calibrated for dollars, not cents).
//
// Single endpoint that returns everything the BasisTrackingCard needs:
//   1. Current basis at the nearest elevator (from getGrainBids)
//   2. 3-year weekly seasonal averages (from getHistory + server-side computation)
//   3. Percentile-based Basis Opportunity Score
//   4. Multi-elevator comparison data
//   5. Trend direction over the past 4 weeks
//
// GET /api/markets/basis-tracking?lat=41.1&lng=-81.4&commodity=Corn
// GET /api/markets/basis-tracking?fips=39153&commodity=Corn
//
// Cache: s-maxage=3600 (1 hour), stale-while-revalidate=7200
// Basis history only updates once per day at market close.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getGrainBidsByFips,
  getGrainBidsByCoords,
  getBidHistory,
} from '@/lib/barchart/client';
import type { GrainElevator, NormalizedBid, BarchartRawHistoryEntry } from '@/lib/barchart/types';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────

interface WeeklyAverage {
  weekOfYear: number;
  weekLabel: string;
  threeYearAvg: number;    // cents (already from Barchart)
  currentYear: number | null; // cents
  min: number;             // cents
  max: number;             // cents
  sampleCount: number;
}

interface ElevatorComparison {
  name: string;
  city: string;
  state: string;
  distance: number;
  basis: number;           // cents (raw from NormalizedBid)
  basisCents: number;      // cents (rounded)
  deviation: number;       // cents vs 3-year weekly avg
  deviationLabel: string;  // e.g. "8¢ stronger than avg"
  commodity: string;
  deliveryMonth: string;
  futuresMonth: string;
}

interface BasisTrackingResponse {
  success: boolean;
  data: {
    elevator: {
      name: string;
      city: string;
      state: string;
      distance: number;
    };
    commodity: string;
    currentBasis: number;          // cents (e.g., -35)
    currentBasisCents: number;     // cents, rounded integer (e.g., -35)
    futuresMonth: string;          // e.g., "Jul '26"
    deliveryMonth: string;
    percentileScore: number;       // 0-100
    trendScore: number;            // 0-100
    basisOpportunityScore: number; // 0-100 composite
    scoreLabel: string;            // "Strong", "Above Average", etc.
    scoreColor: string;            // hex color
    threeYearAvgForWeek: number;   // cents
    deviationFromAvg: number;      // cents (positive = stronger)
    weeklyData: WeeklyAverage[];   // 52 weeks of seasonal data (all values in cents)
    currentWeekIndex: number;      // which week in the array is "now"
    elevatorComparison: ElevatorComparison[];
    dataYears: number[];           // which years are in the average
    narrativeSummary: string;      // natural language summary
  } | null;
  error?: string;
  attribution: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMarketingYearWeekIndex(weekOfYear: number): number {
  // Marketing year starts September 1 (approximately week 36)
  // We want week 36 to be index 0, week 37 to be index 1, etc.
  const MARKETING_YEAR_START_WEEK = 36;
  const adjusted = weekOfYear - MARKETING_YEAR_START_WEEK;
  return adjusted >= 0 ? adjusted : adjusted + 52;
}

function getWeekLabel(weekOfYear: number): string {
  // Approximate month from ISO week
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = Math.min(11, Math.floor((weekOfYear - 1) / 4.33));
  const weekInMonth = Math.round(((weekOfYear - 1) % 4.33) + 1);
  return `${months[monthIndex]} W${weekInMonth}`;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Strong', color: '#10B981' };
  if (score >= 65) return { label: 'Above Avg', color: '#22C55E' };
  if (score >= 35) return { label: 'Fair', color: '#F59E0B' };
  if (score >= 20) return { label: 'Below Avg', color: '#F97316' };
  return { label: 'Weak', color: '#EF4444' };
}

// ── Compute 3-Year Weekly Averages ───────────────────────────────────────
// All values from getHistory are in CENTS. We store them as-is.

function computeWeeklyAverages(
  history: BarchartRawHistoryEntry[],
  currentYear: number,
): { weeklyData: WeeklyAverage[]; dataYears: number[] } {
  // Group by ISO week × year
  const weekMap = new Map<number, Map<number, number[]>>();
  const yearsSet = new Set<number>();

  for (const entry of history) {
    if (!entry.tradingDay || entry.close === undefined || entry.close === null) continue;
    const date = new Date(entry.tradingDay + 'T12:00:00Z');
    const year = date.getFullYear();
    const week = getISOWeek(date);

    yearsSet.add(year);

    if (!weekMap.has(week)) weekMap.set(week, new Map());
    const yearMap = weekMap.get(week)!;
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year)!.push(entry.close);
  }

  const dataYears = Array.from(yearsSet).sort();
  const historicalYears = dataYears.filter(y => y !== currentYear);

  // Build 52-week seasonal data
  const weeklyData: WeeklyAverage[] = [];

  for (let w = 1; w <= 52; w++) {
    const yearMap = weekMap.get(w);
    if (!yearMap) {
      weeklyData.push({
        weekOfYear: w,
        weekLabel: getWeekLabel(w),
        threeYearAvg: 0,
        currentYear: null,
        min: 0,
        max: 0,
        sampleCount: 0,
      });
      continue;
    }

    // Historical average (all non-current years)
    const historicalValues: number[] = [];
    for (const y of historicalYears) {
      const vals = yearMap.get(y);
      if (vals) {
        // Average the daily values within each week first, then use that as the week's value
        const weekAvg = vals.reduce((s, v) => s + v, 0) / vals.length;
        historicalValues.push(weekAvg);
      }
    }

    const threeYearAvg = historicalValues.length > 0
      ? historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length
      : 0;

    // Current year value
    const currentYearVals = yearMap.get(currentYear);
    const currentYearAvg = currentYearVals && currentYearVals.length > 0
      ? currentYearVals.reduce((s, v) => s + v, 0) / currentYearVals.length
      : null;

    // Min/max across all years for the range band
    const allValues = [...historicalValues, ...(currentYearAvg !== null ? [currentYearAvg] : [])];
    const min = allValues.length > 0 ? Math.min(...allValues) : 0;
    const max = allValues.length > 0 ? Math.max(...allValues) : 0;

    // Round to 2 decimal places for precision (still in cents, e.g., -38.25)
    weeklyData.push({
      weekOfYear: w,
      weekLabel: getWeekLabel(w),
      threeYearAvg: Math.round(threeYearAvg * 100) / 100,
      currentYear: currentYearAvg !== null ? Math.round(currentYearAvg * 100) / 100 : null,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      sampleCount: historicalValues.length,
    });
  }

  // Reorder to marketing year (starting week 36/September)
  const reordered: WeeklyAverage[] = [];
  for (let i = 0; i < 52; i++) {
    const w = ((35 + i) % 52) + 1; // Start at week 36
    const entry = weeklyData.find(d => d.weekOfYear === w);
    if (entry) reordered.push(entry);
  }

  return { weeklyData: reordered, dataYears };
}

// ── Compute Percentile Score ─────────────────────────────────────────────
// Both currentBasis and entry.close are in CENTS — same unit, comparison works.

function computePercentileScore(
  currentBasis: number,
  history: BarchartRawHistoryEntry[],
  currentWeek: number,
  currentYear: number,
): number {
  // Collect all historical basis values for the same ISO week (±1 week for more data)
  const weekValues: number[] = [];

  for (const entry of history) {
    if (!entry.tradingDay || entry.close === undefined || entry.close === null) continue;
    const date = new Date(entry.tradingDay + 'T12:00:00Z');
    const year = date.getFullYear();
    if (year === currentYear) continue; // Only compare against history

    const week = getISOWeek(date);
    if (Math.abs(week - currentWeek) <= 1 || Math.abs(week - currentWeek) >= 51) {
      weekValues.push(entry.close);
    }
  }

  if (weekValues.length < 3) return 50; // Not enough data, return neutral

  // Percentile: what % of historical values is the current basis BETTER than?
  // "Better" basis = less negative / more positive = higher value
  const betterCount = weekValues.filter(v => currentBasis > v).length;
  const equalCount = weekValues.filter(v => currentBasis === v).length;
  // Standard percentile rank formula
  return Math.round(((betterCount + 0.5 * equalCount) / weekValues.length) * 100);
}

// ── Compute Trend Score ──────────────────────────────────────────────────
// DEPLOY 3D-FIX: Normalization range changed from ±0.20 (dollars) to ±20 (cents).

function computeTrendScore(history: BarchartRawHistoryEntry[]): number {
  // Look at the last 20 trading days (~4 weeks)
  const recent = history
    .filter(e => e.tradingDay && e.close !== undefined && e.close !== null)
    .sort((a, b) => (a.tradingDay! > b.tradingDay! ? 1 : -1));

  if (recent.length < 10) return 50; // Not enough data

  const last20 = recent.slice(-20);
  const firstHalf = last20.slice(0, Math.floor(last20.length / 2));
  const secondHalf = last20.slice(Math.floor(last20.length / 2));

  const firstAvg = firstHalf.reduce((s, e) => s + (e.close ?? 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, e) => s + (e.close ?? 0), 0) / secondHalf.length;

  // Positive change = strengthening basis = higher score
  const change = secondAvg - firstAvg;

  // Normalize: ±20 cents maps to 0-100 range
  // -20¢ → 0, 0 → 50, +20¢ → 100
  const normalized = (change + 20) / 40;
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

// ── Narrative Summary ────────────────────────────────────────────────────

function buildNarrative(
  elevatorName: string,
  commodity: string,
  currentBasisCents: number,
  deviationCents: number,
  percentileScore: number,
  futuresMonth: string,
): string {
  const direction = deviationCents > 0 ? 'stronger' : deviationCents < 0 ? 'weaker' : 'in line with';
  const absDeviation = Math.abs(Math.round(deviationCents));
  const basisLabel = currentBasisCents >= 0
    ? `${currentBasisCents}¢ over`
    : `${Math.abs(currentBasisCents)}¢ under`;

  if (absDeviation < 3) {
    return `${commodity} basis at ${elevatorName} is ${basisLabel} ${futuresMonth} futures — right at the 3-year average for early ${new Date().toLocaleString('en-US', { month: 'long' })}.`;
  }

  const percentileLabel = percentileScore >= 80 ? 'a strong selling window'
    : percentileScore >= 65 ? 'an above-average opportunity'
    : percentileScore >= 35 ? 'a normal range'
    : percentileScore >= 20 ? 'below typical levels'
    : 'significantly below historical norms';

  return `${commodity} basis at ${elevatorName} is ${absDeviation}¢ ${direction} than the 3-year average — ${basisLabel} ${futuresMonth}. This is in the ${percentileScore}th percentile, ${percentileLabel}.`;
}

// ── Route Handler ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ATTRIBUTION =
    'Basis data provided by Barchart Solutions. Historical averages are for informational purposes only, not trading advice.';

  try {
    const { searchParams } = request.nextUrl;
    const fips = searchParams.get('fips');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const commodityParam = searchParams.get('commodity') || 'Corn';

    // Normalize commodity name to match Barchart's format
    const commodity = commodityParam.charAt(0).toUpperCase() + commodityParam.slice(1).toLowerCase();

    if (!fips && !(lat && lng)) {
      return NextResponse.json(
        { success: false, data: null, error: 'Provide fips or lat+lng', attribution: ATTRIBUTION },
        { status: 400 }
      );
    }

    // Step 1: Get nearby elevators with bids
    // IMPORTANT: Do NOT pass commodity filter to Barchart — it's case-sensitive
    // and may return no results. Fetch all bids, filter server-side.
    let elevators: GrainElevator[];
    if (fips && /^\d{4,5}$/.test(fips)) {
      elevators = await getGrainBidsByFips(fips, {
        maxLocations: 10,
        bidsPerCommodity: 3,
      });
    } else if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { success: false, data: null, error: 'Invalid lat/lng', attribution: ATTRIBUTION },
          { status: 400 }
        );
      }
      elevators = await getGrainBidsByCoords(latitude, longitude, {
        maxLocations: 10,
        bidsPerCommodity: 3,
      });
    } else {
      return NextResponse.json(
        { success: false, data: null, error: 'Invalid location', attribution: ATTRIBUTION },
        { status: 400 }
      );
    }

    console.log(`[basis-tracking] Got ${elevators.length} elevators for ${fips || `${lat},${lng}`}`);

    if (elevators.length === 0) {
      return NextResponse.json(
        { success: true, data: null, error: 'No elevators found nearby', attribution: ATTRIBUTION },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
      );
    }

    // Step 2: Find the nearest elevator with a valid basisRollingSymbol for this commodity
    let primaryElevator: GrainElevator | null = null;
    let primaryBid: NormalizedBid | null = null;

    // First pass: exact commodity match with basisRollingSymbol
    for (const elevator of elevators) {
      const bid = elevator.bids.find(
        b => b.commodity.toLowerCase() === commodity.toLowerCase() && b.basisRollingSymbol
      );
      if (bid) {
        primaryElevator = elevator;
        primaryBid = bid;
        break;
      }
    }

    // Second pass: exact commodity match WITHOUT basisRollingSymbol (still useful for comparison)
    let hasBasisHistory = !!primaryBid?.basisRollingSymbol;
    if (!primaryBid) {
      for (const elevator of elevators) {
        const bid = elevator.bids.find(
          b => b.commodity.toLowerCase() === commodity.toLowerCase()
        );
        if (bid) {
          primaryElevator = elevator;
          primaryBid = bid;
          break;
        }
      }
    }

    console.log(`[basis-tracking] Primary: ${primaryElevator?.name || 'none'}, basisRollingSymbol: ${primaryBid?.basisRollingSymbol || 'null'}, hasBasisHistory: ${hasBasisHistory}`);

    if (!primaryElevator || !primaryBid) {
      // No bids at all for this commodity — return comparison with whatever we have
      const comparison = buildElevatorComparison(elevators, commodity, 0);
      return NextResponse.json(
        {
          success: true,
          data: comparison.length > 0 ? {
            elevator: {
              name: elevators[0].name,
              city: elevators[0].city,
              state: elevators[0].state,
              distance: elevators[0].distance,
            },
            commodity,
            currentBasis: 0,
            currentBasisCents: 0,
            futuresMonth: '',
            deliveryMonth: '',
            percentileScore: 50,
            trendScore: 50,
            basisOpportunityScore: 50,
            scoreLabel: 'Fair',
            scoreColor: '#F59E0B',
            threeYearAvgForWeek: 0,
            deviationFromAvg: 0,
            weeklyData: [],
            currentWeekIndex: -1,
            elevatorComparison: comparison,
            dataYears: [],
            narrativeSummary: `No ${commodity} bids found at nearby elevators. Try selecting a different commodity.`,
          } : null,
          attribution: ATTRIBUTION,
        },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
      );
    }

    // Step 3: Pull 3 years of daily basis history (only if basisRollingSymbol exists)
    let history: BarchartRawHistoryEntry[] = [];
    if (hasBasisHistory && primaryBid.basisRollingSymbol) {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const threeYearsAgo = new Date(currentYear - 3, 0, 1);
        const startDate = threeYearsAgo.toISOString().slice(0, 10).replace(/-/g, '');

        console.log(`[basis-tracking] Fetching history for ${primaryBid.basisRollingSymbol} since ${startDate}`);
        history = await getBidHistory(primaryBid.basisRollingSymbol, {
          type: 'daily',
          maxRecords: 5000,
          startDate,
        });
        console.log(`[basis-tracking] Got ${history.length} history records`);
      } catch (historyError) {
        console.warn(`[basis-tracking] getHistory failed, continuing without historical data:`, historyError);
        hasBasisHistory = false;
        history = [];
      }
    }

    // Step 4: Compute weekly seasonal averages (if history available)
    const now = new Date();
    const currentYear = now.getFullYear();
    let weeklyData: WeeklyAverage[] = [];
    let dataYears: number[] = [];

    if (history.length > 0) {
      const result = computeWeeklyAverages(history, currentYear);
      weeklyData = result.weeklyData;
      dataYears = result.dataYears;
    }

    // Step 5: Compute percentile and trend scores
    const currentWeek = getISOWeek(now);
    const percentileScore = history.length > 0
      ? computePercentileScore(primaryBid.basis, history, currentWeek, currentYear)
      : 50;
    const trendScore = history.length > 0
      ? computeTrendScore(history)
      : 50;

    // Volatility adjustment: compute std dev of recent 4 weeks of basis
    // DEPLOY 3D-FIX: threshold changed from 0.30 (dollars) to 30 (cents)
    let volatilityAdj = 75; // default: moderate confidence
    if (history.length >= 10) {
      const recentHistory = history
        .filter(e => e.tradingDay && e.close !== undefined)
        .sort((a, b) => (a.tradingDay! > b.tradingDay! ? 1 : -1))
        .slice(-20);
      const mean = recentHistory.reduce((s, e) => s + (e.close ?? 0), 0) / Math.max(1, recentHistory.length);
      const variance = recentHistory.reduce((s, e) => s + Math.pow((e.close ?? 0) - mean, 2), 0) / Math.max(1, recentHistory.length);
      const stdDev = Math.sqrt(variance);
      // 30 cents std dev = high volatility (normalizedStdDev → 1.0)
      const normalizedStdDev = Math.min(1, stdDev / 30);
      volatilityAdj = Math.max(25, Math.min(100, Math.round(100 - normalizedStdDev * 50)));
    }

    // Composite Basis Opportunity Score
    const basisOpportunityScore = Math.round(
      0.70 * percentileScore +
      0.20 * trendScore +
      0.10 * volatilityAdj
    );

    const { label: scoreLabel, color: scoreColor } = getScoreLabel(basisOpportunityScore);

    // Step 6: Find the 3-year average for the current week
    // DEPLOY 3D-FIX: basis is already in cents — DO NOT multiply by 100
    const currentWeekData = weeklyData.find(w => w.weekOfYear === currentWeek);
    const threeYearAvgForWeek = currentWeekData?.threeYearAvg ?? 0;
    const currentBasisCents = Math.round(primaryBid.basis);
    const threeYearAvgCents = Math.round(threeYearAvgForWeek);
    const deviationFromAvg = currentBasisCents - threeYearAvgCents;

    // Step 7: Find current week index in the marketing-year-ordered weeklyData
    const currentWeekIndex = weeklyData.findIndex(w => w.weekOfYear === currentWeek);

    // Step 8: Build elevator comparison
    const comparison = buildElevatorComparison(elevators, commodity, threeYearAvgForWeek);

    // Step 9: Build narrative summary
    const futuresMonth = primaryBid.basisMonth || primaryBid.deliveryMonth || '';
    const narrative = hasBasisHistory && history.length > 0
      ? buildNarrative(
          primaryElevator.name,
          commodity,
          currentBasisCents,
          deviationFromAvg,
          percentileScore,
          futuresMonth,
        )
      : `${commodity} basis at ${primaryElevator.name} is ${Math.abs(currentBasisCents)}¢ ${currentBasisCents >= 0 ? 'over' : 'under'} ${futuresMonth} futures. Historical seasonal comparison will be available when more data is collected.`;

    return NextResponse.json(
      {
        success: true,
        data: {
          elevator: {
            name: primaryElevator.name,
            city: primaryElevator.city,
            state: primaryElevator.state,
            distance: primaryElevator.distance,
          },
          commodity,
          currentBasis: primaryBid.basis,
          currentBasisCents,
          futuresMonth,
          deliveryMonth: primaryBid.deliveryMonth,
          percentileScore,
          trendScore,
          basisOpportunityScore,
          scoreLabel,
          scoreColor,
          threeYearAvgForWeek: threeYearAvgCents,
          deviationFromAvg,
          weeklyData,
          currentWeekIndex,
          elevatorComparison: comparison,
          dataYears,
          narrativeSummary: narrative,
        },
        attribution: ATTRIBUTION,
      } satisfies BasisTrackingResponse,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('[basis-tracking] Route error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to compute basis tracking data',
        attribution: 'Basis data provided by Barchart Solutions.',
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
      }
    );
  }
}

// ── Build Elevator Comparison ────────────────────────────────────────────
// DEPLOY 3D-FIX: basis and threeYearAvg are both in CENTS — no * 100 needed.

function buildElevatorComparison(
  elevators: GrainElevator[],
  commodity: string,
  threeYearAvg: number, // in cents
): ElevatorComparison[] {
  const comparisons: ElevatorComparison[] = [];

  for (const elevator of elevators) {
    const bid = elevator.bids.find(
      b => b.commodity.toLowerCase() === commodity.toLowerCase()
    );
    if (!bid) continue;

    const basisCents = Math.round(bid.basis);
    const avgCents = Math.round(threeYearAvg);
    const deviationCents = basisCents - avgCents;
    const absDeviation = Math.abs(deviationCents);

    let deviationLabel: string;
    if (absDeviation < 3) {
      deviationLabel = 'At average';
    } else if (deviationCents > 0) {
      deviationLabel = `${absDeviation}¢ stronger`;
    } else {
      deviationLabel = `${absDeviation}¢ weaker`;
    }

    comparisons.push({
      name: elevator.name,
      city: elevator.city,
      state: elevator.state,
      distance: elevator.distance,
      basis: bid.basis,
      basisCents,
      deviation: deviationCents,
      deviationLabel,
      commodity: bid.commodity,
      deliveryMonth: bid.deliveryMonth,
      futuresMonth: bid.basisMonth || bid.deliveryMonth,
    });
  }

  // Sort by basis strength (highest/most positive first)
  return comparisons.sort((a, b) => b.basisCents - a.basisCents).slice(0, 8);
}
