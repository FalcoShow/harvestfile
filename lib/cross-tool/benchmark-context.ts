// =============================================================================
// HarvestFile — Phase 31 Build 1: Shared Benchmark Context
// lib/cross-tool/benchmark-context.ts
//
// THE UNIFIED DATA LAYER. Every tool that needs county benchmark data calls
// this single module instead of duplicating queries. This is what transforms
// 16 standalone tools into one living, connected platform.
//
// Used by:
//   - AI Farm Advisor (tool call for county election context)
//   - County SEO pages (server component data fetch)
//   - Morning Dashboard (benchmark change alerts)
//   - Grain Marketing (peer election context sidebar)
//   - BenchmarkWidget (existing, can migrate later)
//
// Tables queried:
//   - counties (county_fips, display_name, state_fips)
//   - states (state_fips, abbreviation)
//   - historical_enrollment (county_fips, program_year, commodity_code, arcco_acres, plc_acres)
//   - county_benchmark_cache (county_fips, program_year, commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible)
//   - benchmark_activity (state_fips, week_start, submission_count, unique_counties)
//   - election_submissions (county_fips, id)
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import type {
  BenchmarkContext,
  BenchmarkInsights,
  CountyInfo,
  HistoricalEnrollmentYear,
  LiveBenchmarkData,
  SocialProofData,
} from './types';

// ─── Supabase client (server-side only) ──────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Helper: get Monday of current week ──────────────────────────────────────

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date(now).setDate(diff));
  return monday.toISOString().split('T')[0];
}

// ─── Core: Fetch county info ─────────────────────────────────────────────────

export async function getCountyInfo(countyFips: string): Promise<CountyInfo | null> {
  const supabase = getSupabase();

  const { data: countyRow } = await supabase
    .from('counties')
    .select('county_fips, display_name, state_fips')
    .eq('county_fips', countyFips)
    .single();

  if (!countyRow) return null;

  let stateAbbr = '';
  if (countyRow.state_fips) {
    const { data: stateRow } = await supabase
      .from('states')
      .select('abbreviation')
      .eq('state_fips', countyRow.state_fips)
      .single();
    stateAbbr = stateRow?.abbreviation || '';
  }

  return {
    county_fips: countyFips,
    county_name: countyRow.display_name || '',
    state_abbr: stateAbbr,
    state_fips: countyRow.state_fips || '',
  };
}

// ─── Core: Fetch historical enrollment ───────────────────────────────────────

export async function getHistoricalEnrollment(
  countyFips: string,
  commodity: string = 'ALL'
): Promise<HistoricalEnrollmentYear[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('historical_enrollment')
    .select('program_year, commodity_code, arcco_acres, plc_acres')
    .eq('county_fips', countyFips)
    .order('program_year', { ascending: true });

  if (commodity !== 'ALL') {
    query = query.eq('commodity_code', commodity);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('[CrossTool] Historical enrollment error:', error);
    return [];
  }

  // Aggregate by year (sum across commodities if ALL)
  const yearAgg: Record<number, { arc: number; plc: number }> = {};
  for (const row of rows || []) {
    const y = row.program_year;
    if (!yearAgg[y]) yearAgg[y] = { arc: 0, plc: 0 };
    yearAgg[y].arc += row.arcco_acres || 0;
    yearAgg[y].plc += row.plc_acres || 0;
  }

  return Object.entries(yearAgg)
    .map(([year, data]) => {
      const total = data.arc + data.plc;
      return {
        year: parseInt(year),
        arc_acres: Math.round(data.arc),
        plc_acres: Math.round(data.plc),
        total: Math.round(total),
        arc_pct: total > 0 ? Math.round((data.arc / total) * 1000) / 10 : 0,
        plc_pct: total > 0 ? Math.round((data.plc / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => a.year - b.year);
}

// ─── Core: Fetch live 2026 benchmark data ────────────────────────────────────

export async function getLiveBenchmark(
  countyFips: string,
  commodity: string = 'ALL'
): Promise<LiveBenchmarkData> {
  const supabase = getSupabase();

  let query = supabase
    .from('county_benchmark_cache')
    .select('commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible')
    .eq('county_fips', countyFips)
    .eq('program_year', 2026);

  if (commodity !== 'ALL') {
    query = query.eq('commodity_code', commodity);
  }

  const { data: rows } = await query;

  let arcTotal = 0;
  let plcTotal = 0;
  let total = 0;
  let visible = false;

  for (const row of rows || []) {
    arcTotal += row.arc_co_count || 0;
    plcTotal += row.plc_count || 0;
    total += row.total_count || 0;
    if (row.is_visible) visible = true;
  }

  return {
    arc_co_count: arcTotal,
    plc_count: plcTotal,
    total,
    arc_co_pct: visible && total > 0
      ? Math.round((arcTotal / total) * 1000) / 10
      : null,
    plc_pct: visible && total > 0
      ? Math.round((plcTotal / total) * 1000) / 10
      : null,
    is_visible: visible,
  };
}

// ─── Core: Fetch social proof metrics ────────────────────────────────────────

export async function getSocialProof(countyFips: string): Promise<SocialProofData> {
  const supabase = getSupabase();
  const stateFips = countyFips.substring(0, 2);
  const weekStart = getWeekStart();

  // This week's state activity
  const { data: activity } = await supabase
    .from('benchmark_activity')
    .select('submission_count, unique_counties')
    .eq('state_fips', stateFips)
    .eq('week_start', weekStart)
    .single();

  // Total state submissions (all time)
  const { data: totalActivity } = await supabase
    .from('benchmark_activity')
    .select('submission_count')
    .eq('state_fips', stateFips);

  const stateTotal = (totalActivity || []).reduce(
    (sum, row) => sum + (row.submission_count || 0),
    0
  );

  // Total county submissions
  const { count: countyTotal } = await supabase
    .from('election_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('county_fips', countyFips);

  return {
    state_this_week: activity?.submission_count || 0,
    state_counties_this_week: activity?.unique_counties || 0,
    state_total: stateTotal,
    county_total: countyTotal || 0,
  };
}

// ─── Derived: Compute insights from raw data ─────────────────────────────────

export function computeInsights(
  historical: HistoricalEnrollmentYear[],
  live2026: LiveBenchmarkData,
  countyName: string,
  commodity: string
): BenchmarkInsights {
  // Historical averages
  const totalYears = historical.length;
  const avgArcPct = totalYears > 0
    ? Math.round(historical.reduce((sum, y) => sum + y.arc_pct, 0) / totalYears * 10) / 10
    : 0;

  // Dominant program
  let dominant: 'ARC-CO' | 'PLC' | 'SPLIT' = 'SPLIT';
  if (avgArcPct >= 60) dominant = 'ARC-CO';
  else if (avgArcPct <= 40) dominant = 'PLC';

  // Most recent historical year
  const mostRecent = historical.length > 0 ? historical[historical.length - 1] : null;
  const mostRecentArcPct = mostRecent?.arc_pct || 0;
  const mostRecentYear = mostRecent?.year || 0;

  // Trend: compare first half vs second half of historical data
  let trend: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE' = 'STABLE';
  if (totalYears >= 3) {
    const midpoint = Math.floor(totalYears / 2);
    const earlyAvg = historical.slice(0, midpoint).reduce((s, y) => s + y.arc_pct, 0) / midpoint;
    const lateAvg = historical.slice(midpoint).reduce((s, y) => s + y.arc_pct, 0) / (totalYears - midpoint);
    const diff = lateAvg - earlyAvg;
    if (diff > 5) trend = 'TOWARD_ARC';
    else if (diff < -5) trend = 'TOWARD_PLC';
  }

  // Live data meaningfulness (at least 3 submissions)
  const liveMeaningful = live2026.total >= 3 && live2026.is_visible;

  // Build human-readable summary for AI consumption
  const commodityLabel = commodity === 'ALL' ? 'all crops' : commodity.toLowerCase();
  const parts: string[] = [];

  if (totalYears > 0) {
    parts.push(
      `In ${countyName}, ${mostRecentArcPct}% of enrolled base acres chose ARC-CO for ${commodityLabel} in ${mostRecentYear} (historical avg: ${avgArcPct}%).`
    );
  }

  if (trend === 'TOWARD_ARC') {
    parts.push('The trend is shifting toward ARC-CO in recent years.');
  } else if (trend === 'TOWARD_PLC') {
    parts.push('The trend is shifting toward PLC in recent years.');
  }

  if (liveMeaningful && live2026.arc_co_pct !== null) {
    parts.push(
      `Live 2026 data: ${live2026.arc_co_pct}% ARC-CO vs ${live2026.plc_pct}% PLC from ${live2026.total} farmers reporting.`
    );
  } else if (live2026.total > 0) {
    parts.push(
      `${live2026.total} farmer(s) have reported their 2026 election so far (need ${Math.max(0, 5 - live2026.total)} more for public data).`
    );
  }

  return {
    historical_dominant: dominant,
    historical_avg_arc_pct: avgArcPct,
    trend_direction: trend,
    most_recent_arc_pct: mostRecentArcPct,
    most_recent_year: mostRecentYear,
    live_data_meaningful: liveMeaningful,
    summary: parts.join(' ') || `No benchmark data available for ${countyName}.`,
  };
}

// =============================================================================
// PRIMARY EXPORT: Get full benchmark context for a county/commodity
// This is the ONE function that every tool calls.
// =============================================================================

export async function getBenchmarkContextForCounty(
  countyFips: string,
  commodity: string = 'ALL'
): Promise<BenchmarkContext | null> {
  // Validate FIPS
  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return null;
  }

  try {
    // Fetch all data in parallel for performance
    const [countyInfo, historical, live2026, socialProof] = await Promise.all([
      getCountyInfo(countyFips),
      getHistoricalEnrollment(countyFips, commodity),
      getLiveBenchmark(countyFips, commodity),
      getSocialProof(countyFips),
    ]);

    if (!countyInfo) return null;

    const insights = computeInsights(
      historical,
      live2026,
      countyInfo.county_name,
      commodity
    );

    return {
      county: countyInfo,
      commodity,
      historical,
      live_2026: live2026,
      social_proof: socialProof,
      insights,
    };
  } catch (err) {
    console.error('[CrossTool] getBenchmarkContextForCounty error:', err);
    return null;
  }
}

// =============================================================================
// LIGHTWEIGHT EXPORT: Get just the insights summary (for AI tool calls)
// Smaller payload when full historical data isn't needed.
// =============================================================================

export async function getBenchmarkSummary(
  countyFips: string,
  commodity: string = 'ALL'
): Promise<string> {
  const context = await getBenchmarkContextForCounty(countyFips, commodity);
  if (!context) return `No benchmark data available for county ${countyFips}.`;
  return context.insights.summary;
}
