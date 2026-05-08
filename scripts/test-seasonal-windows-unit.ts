/**
 * Pure-logic unit tests for buildSeasonalWindows.
 *
 * Runs without any database connection — verifies the date arithmetic in
 * isolation so you can sanity-check the window construction before
 * running the DB-backed test-seasonal-basis.ts script.
 *
 * Usage (from project root):
 *   npx tsx scripts/test-seasonal-windows-unit.ts
 *
 * Following the same pure-test convention as the engine module tests
 * (pace-calendar, signals, quantity, rationale, recommendation-engine).
 * No async, no I/O, no top-level await needed.
 */

import { buildSeasonalWindows } from '../lib/sellscore/seasonal-basis';

let assertions = 0;
let failures = 0;

function assertEq<T>(actual: T, expected: T, label: string) {
  assertions++;
  const ok =
    typeof actual === 'object'
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;
  if (!ok) {
    failures++;
    console.error(`FAIL: ${label}`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn: () => unknown, label: string) {
  assertions++;
  try {
    fn();
    failures++;
    console.error(`FAIL: ${label} (expected throw, got no throw)`);
  } catch {
    // expected
  }
}

// --- Test 1: defaults produce 3 windows of 29 days each ---
{
  const today = new Date(Date.UTC(2026, 4, 7)); // 2026-05-07
  const windows = buildSeasonalWindows(today);
  assertEq(windows.length, 3, 'defaults yield 3 windows');
  assertEq(windows[0].centerYear, 2025, 'first window centers on prior year');
  assertEq(windows[1].centerYear, 2024, 'second window centers two years back');
  assertEq(windows[2].centerYear, 2023, 'third window centers three years back');

  assertEq(windows[0].start, '2025-04-23', '2025 window starts at May 7 minus 14');
  assertEq(windows[0].end, '2025-05-21', '2025 window ends at May 7 plus 14');
  assertEq(windows[1].start, '2024-04-23', '2024 window start');
  assertEq(windows[1].end, '2024-05-21', '2024 window end');
  assertEq(windows[2].start, '2023-04-23', '2023 window start');
  assertEq(windows[2].end, '2023-05-21', '2023 window end');
}

// --- Test 2: year boundary rollback (early January) ---
{
  const today = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05
  const windows = buildSeasonalWindows(today);
  // January 5 minus 14 days lands in late December of the prior year.
  assertEq(windows[0].start, '2024-12-22', 'Jan 5 minus 14 days rolls into prior December');
  assertEq(windows[0].end, '2025-01-19', 'Jan 5 plus 14 days extends into mid-January');
  assertEq(windows[0].centerYear, 2025, 'centerYear is the prior year');
}

// --- Test 3: late December (forward rollover) ---
{
  const today = new Date(Date.UTC(2026, 11, 28)); // 2026-12-28
  const windows = buildSeasonalWindows(today);
  // December 28 plus 14 days lands in mid-January of the next year.
  assertEq(windows[0].start, '2025-12-14', 'Dec 28 minus 14 days');
  assertEq(windows[0].end, '2026-01-11', 'Dec 28 plus 14 days rolls into next January');
}

// --- Test 4: leap year auto-rollover (Feb 29 in non-leap year) ---
{
  // 2024 was a leap year; centering on Feb 29 in non-leap years 2023, 2022,
  // 2021 should auto-roll Feb 29 -> March 1 per JS Date behavior.
  const today = new Date(Date.UTC(2024, 1, 29)); // 2024-02-29
  const windows = buildSeasonalWindows(today);
  // For 2023: Feb 29 -> Mar 1 -> minus 14 = Feb 15, plus 14 = Mar 15.
  assertEq(windows[0].start, '2023-02-15', 'leap year Feb 29 rolls to Mar 1 in non-leap year');
  assertEq(windows[0].end, '2023-03-15', 'leap year window end');
}

// --- Test 5: configurable yearsBack ---
{
  const today = new Date(Date.UTC(2026, 4, 7));
  const windows = buildSeasonalWindows(today, { yearsBack: 5 });
  assertEq(windows.length, 5, 'yearsBack=5 yields 5 windows');
  assertEq(windows[4].centerYear, 2021, 'fifth window centers 5 years back');
}

// --- Test 6: configurable halfWindowDays ---
{
  const today = new Date(Date.UTC(2026, 4, 7));
  const windows = buildSeasonalWindows(today, { halfWindowDays: 7 });
  assertEq(windows[0].start, '2025-04-30', 'halfWindowDays=7 narrows the window');
  assertEq(windows[0].end, '2025-05-14', 'halfWindowDays=7 narrows the window');
}

// --- Test 7: halfWindowDays=0 produces single-day windows ---
{
  const today = new Date(Date.UTC(2026, 4, 7));
  const windows = buildSeasonalWindows(today, { halfWindowDays: 0 });
  assertEq(windows[0].start, '2025-05-07', 'halfWindowDays=0: start equals center');
  assertEq(windows[0].end, '2025-05-07', 'halfWindowDays=0: end equals center');
}

// --- Test 8: invalid options throw ---
{
  assertThrows(
    () => buildSeasonalWindows(new Date(), { yearsBack: 0 }),
    'yearsBack=0 throws',
  );
  assertThrows(
    () => buildSeasonalWindows(new Date(), { yearsBack: -1 }),
    'negative yearsBack throws',
  );
  assertThrows(
    () => buildSeasonalWindows(new Date(), { halfWindowDays: -1 }),
    'negative halfWindowDays throws',
  );
  assertThrows(
    () => buildSeasonalWindows(new Date(), { yearsBack: 1.5 }),
    'non-integer yearsBack throws',
  );
}

// --- Test 9: today defaults to current time when omitted ---
{
  const windows = buildSeasonalWindows();
  assertEq(windows.length, 3, 'omitting today still produces 3 default windows');
  const now = new Date();
  assertEq(windows[0].centerYear, now.getUTCFullYear() - 1, 'first window centers on prior year by default');
}

// --- Summary ---
console.log(`\n${assertions} assertions, ${failures} failures`);
if (failures > 0) {
  process.exit(1);
}
