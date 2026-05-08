/**
 * Seasonal-window basis filtering for the Sell Score.
 *
 * The Sell Score v1 spec (Section 4.4) requires the basis percentile to be
 * computed against the "3-year average for this date" — meaning today's
 * basis observation is compared only to historical observations that fall
 * within the same seasonal window in the prior 3 years, not against the
 * full 5-year all-season distribution.
 *
 * Why this matters: Eastern Corn Belt basis varies seasonally. A May basis
 * of -$0.32 might land at the 67th percentile against the full 5-year set
 * (which mixes weak winter basis with strong pre-pollination summer basis),
 * but only at the 45th percentile against May basis specifically. The
 * seasonal filter makes the percentile semantically honest.
 *
 * Window definition: same month/day as today ± 14 calendar days, repeated
 * for each of the prior 3 marketing years. Both the year count and the
 * half-window width are configurable via options for testing and v1.1
 * tuning, but the spec defaults are 3 and 14 respectively.
 *
 * Edge cases:
 * - Year boundary (Jan 5 ± 14 days crosses Dec/Jan): handled correctly via
 *   Date arithmetic. setUTCDate(-14) rolls back into the prior year.
 * - Leap year (Feb 29 in a non-leap year): JS Date auto-rolls Feb 29 to
 *   March 1 in non-leap years. Acceptable behavior; no special handling.
 * - Empty result set (county with no data in window): returns sampleSize=0.
 *   Caller (signals.ts) is responsible for the thin-sample guard.
 * - All Date math is in UTC to avoid timezone drift across server boundaries.
 *
 * Source of truth: Sell_Score_v1_Build_Spec.md §4.4, item "Signal 2 — Basis
 * signal"; v6.2 Build Plan §32.1 (next-session priority).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SeasonalWindow {
  /** Inclusive start date of the window, ISO format (YYYY-MM-DD). */
  start: string;
  /** Inclusive end date of the window, ISO format (YYYY-MM-DD). */
  end: string;
  /** Center year for this window (today's year minus the offset). */
  centerYear: number;
}

export interface SeasonalBasisOptions {
  /** Number of prior years to include. Defaults to 3 per spec §4.4. */
  yearsBack?: number;
  /** Half-window in calendar days. Defaults to 14 per spec §4.4. */
  halfWindowDays?: number;
}

export interface SeasonalBasisResult {
  /** All basis values within the seasonal window, in dollars per bushel. */
  values: number[];
  /** Number of observations returned. Equals values.length. */
  sampleSize: number;
  /** The date ranges that produced this result (for inspection / debug). */
  windows: SeasonalWindow[];
  /** The centering date used (typically today, normalized to UTC midnight). */
  centerDate: string;
  /** Human-readable description for UI freshness disclosure. */
  windowDescription: string;
}

/**
 * Build the date ranges to query for the seasonal window.
 *
 * For a today of 2026-05-07 with default options, returns:
 *   - { start: '2025-04-23', end: '2025-05-21', centerYear: 2025 }
 *   - { start: '2024-04-23', end: '2024-05-21', centerYear: 2024 }
 *   - { start: '2023-04-23', end: '2023-05-21', centerYear: 2023 }
 *
 * Pure function; no I/O. Safe for use in tests with a fixed date.
 */
export function buildSeasonalWindows(
  today: Date = new Date(),
  options: SeasonalBasisOptions = {},
): SeasonalWindow[] {
  const yearsBack = options.yearsBack ?? 3;
  const halfWindowDays = options.halfWindowDays ?? 14;

  if (!Number.isInteger(yearsBack) || yearsBack < 1) {
    throw new Error(`buildSeasonalWindows: yearsBack must be a positive integer, got ${yearsBack}`);
  }
  if (!Number.isInteger(halfWindowDays) || halfWindowDays < 0) {
    throw new Error(`buildSeasonalWindows: halfWindowDays must be a non-negative integer, got ${halfWindowDays}`);
  }

  const todayMonth = today.getUTCMonth();
  const todayDay = today.getUTCDate();
  const currentYear = today.getUTCFullYear();

  const windows: SeasonalWindow[] = [];

  for (let i = 1; i <= yearsBack; i++) {
    const centerYear = currentYear - i;
    const center = new Date(Date.UTC(centerYear, todayMonth, todayDay));

    const start = new Date(center);
    start.setUTCDate(start.getUTCDate() - halfWindowDays);

    const end = new Date(center);
    end.setUTCDate(end.getUTCDate() + halfWindowDays);

    windows.push({
      start: toIsoDate(start),
      end: toIsoDate(end),
      centerYear,
    });
  }

  return windows;
}

/**
 * Fetch historical basis values within the seasonal window from
 * county_basis_history.
 *
 * Returns a structured result so the caller can inspect sample size, the
 * windows used, and a human-readable description. The orchestrator
 * (data-fetcher.ts) typically just consumes `result.values` and passes
 * `result.sampleSize` through to the SellScoreResult metadata for
 * downstream UI freshness disclosure.
 *
 * Uses the service-role client per the data-fetcher convention; never
 * called from a browser context.
 */
export async function fetchSeasonalBasis(
  supabase: SupabaseClient,
  countyFips: string,
  crop: string,
  today: Date = new Date(),
  options: SeasonalBasisOptions = {},
): Promise<SeasonalBasisResult> {
  const windows = buildSeasonalWindows(today, options);
  const halfWindowDays = options.halfWindowDays ?? 14;

  // Build the OR clause for PostgREST: each window becomes an
  // and(observation_date.gte.START,observation_date.lte.END) clause,
  // joined with commas at the top level. The .eq() filters on
  // county_fips and crop apply in conjunction with the OR.
  const orClause = windows
    .map(
      (w) =>
        `and(observation_date.gte.${w.start},observation_date.lte.${w.end})`,
    )
    .join(',');

  const { data, error } = await supabase
    .from('county_basis_history')
    .select('basis, observation_date')
    .eq('county_fips', countyFips)
    .eq('crop', crop)
    .or(orClause)
    .order('observation_date', { ascending: true });

  if (error) {
    throw new Error(
      `fetchSeasonalBasis failed for ${countyFips}/${crop}: ${error.message}`,
    );
  }

  const values = (data ?? [])
    .map((row) => Number((row as { basis: unknown }).basis))
    .filter((n) => Number.isFinite(n));

  const centerDate = toIsoDate(
    new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    ),
  );

  return {
    values,
    sampleSize: values.length,
    windows,
    centerDate,
    windowDescription: `${windows.length}-year ±${halfWindowDays} day same-date window`,
  };
}

/** Format a Date as YYYY-MM-DD in UTC. */
function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
