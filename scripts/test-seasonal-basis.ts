/**
 * Verification script for the seasonal-window basis filter.
 *
 * For each (county, crop) combination in the v1 test set, fetches both:
 *   1. The full unfiltered distribution (current production behavior)
 *   2. The seasonal 3-year ±14 day window (new behavior)
 *
 * Then prints distribution stats and percentile placement of a synthetic
 * reference basis value against each, so the impact of the seasonal filter
 * is visible at a glance.
 *
 * Usage (from project root):
 *   npx tsx scripts/test-seasonal-basis.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY set (the same env vars data-fetcher.ts uses).
 *
 * Per Codified Learning #16 (v6.2 §30): tsx defaults to CommonJS, no
 * top-level await. The async body is wrapped in main() and the catch
 * is at the bottom.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  buildSeasonalWindows,
  fetchSeasonalBasis,
} from '../lib/sellscore/seasonal-basis';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
  process.exit(1);
}

// Counties to verify — the four with the deepest history per v6.2 §27.3.
// Pickaway, Tippecanoe, McLean all returned full 5-year history (1,200+
// rows per crop). Clinton has the December 2025 sandbox lag and is included
// to verify the thin-sample branch fires correctly when the filter narrows
// a stale dataset further.
const TEST_COUNTIES = [
  { fips: '19045', name: 'IA Clinton (River Valley Coop, DeWitt)' },
  { fips: '39129', name: 'OH Pickaway (Cargill, Circleville)' },
  { fips: '18157', name: 'IN Tippecanoe (Cargill, Linden)' },
  { fips: '17113', name: 'IL McLean (Heartland Coop, Downs)' },
];

const TEST_CROPS = ['corn', 'soybeans'];

const THIN_SAMPLE_THRESHOLD = 20;

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false },
  });

  const today = new Date();
  console.log(`Test date (UTC): ${today.toISOString().slice(0, 10)}`);

  const windows = buildSeasonalWindows(today);
  console.log('\nSeasonal windows generated:');
  for (const w of windows) {
    console.log(`  ${w.centerYear}: ${w.start} -> ${w.end}`);
  }

  for (const county of TEST_COUNTIES) {
    for (const crop of TEST_CROPS) {
      console.log(`\n=== ${county.name} | ${crop} ===`);

      // Old behavior: full unfiltered distribution.
      const { data: fullData, error: fullError } = await supabase
        .from('county_basis_history')
        .select('basis')
        .eq('county_fips', county.fips)
        .eq('crop', crop);

      if (fullError) {
        console.log(`  FULL fetch error: ${fullError.message}`);
        continue;
      }
      const fullValues = (fullData ?? [])
        .map((r) => Number((r as { basis: unknown }).basis))
        .filter(Number.isFinite);

      // New behavior: seasonal window.
      const seasonal = await fetchSeasonalBasis(
        supabase,
        county.fips,
        crop,
        today,
      );

      // Pick a synthetic "today's basis" — the median of the seasonal set
      // when present, else the median of the full set, else zero. Using
      // the seasonal median means the reference is exactly 50th percentile
      // against the seasonal set, which makes the comparison vs. full
      // percentile easy to read.
      const reference =
        seasonal.values.length > 0
          ? median(seasonal.values)
          : fullValues.length > 0
            ? median(fullValues)
            : 0;

      console.log(`  Reference basis: $${reference.toFixed(4)}`);
      console.log(
        `  Full distribution:    n=${pad(fullValues.length, 4)}, ` +
          `range $${fmt(min(fullValues))} to $${fmt(max(fullValues))}, ` +
          `median $${fmt(median(fullValues))}`,
      );
      console.log(
        `  Seasonal window:      n=${pad(seasonal.values.length, 4)}, ` +
          `range $${fmt(min(seasonal.values))} to $${fmt(max(seasonal.values))}, ` +
          `median $${fmt(median(seasonal.values))}`,
      );

      const fullPct = percentile(fullValues, reference);
      const seasonalPct = percentile(seasonal.values, reference);
      console.log(
        `  Reference percentile: full=${fullPct.toFixed(1)}, ` +
          `seasonal=${seasonalPct.toFixed(1)}, ` +
          `delta=${(seasonalPct - fullPct).toFixed(1)}pp`,
      );

      if (seasonal.sampleSize < THIN_SAMPLE_THRESHOLD) {
        console.log(
          `  THIN SAMPLE FLAG: seasonal n=${seasonal.sampleSize} < ${THIN_SAMPLE_THRESHOLD}; ` +
            `signals.ts would force RED with hasEnoughHistory=false`,
        );
      }
    }
  }

  console.log('\nDone.');
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function min(arr: number[]): number {
  if (arr.length === 0) return 0;
  let m = arr[0];
  for (const v of arr) if (v < m) m = v;
  return m;
}

function max(arr: number[]): number {
  if (arr.length === 0) return 0;
  let m = arr[0];
  for (const v of arr) if (v > m) m = v;
  return m;
}

/** Percentile of `value` against `arr`: percentage of arr <= value. */
function percentile(arr: number[], value: number): number {
  if (arr.length === 0) return 0;
  let below = 0;
  for (const v of arr) if (v <= value) below++;
  return (below / arr.length) * 100;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function pad(n: number, w: number): string {
  return String(n).padStart(w, ' ');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
