/**
 * Pure-logic unit tests for the OUT_OF_SEASON action in rationale.ts.
 *
 * Verifies:
 *   - OUT_OF_SEASON fires when bushelsSold >= expectedBushels
 *   - OUT_OF_SEASON priority beats margin-RED gate
 *   - OUT_OF_SEASON priority beats quantity=0 → HOLD gate
 *   - OUT_OF_SEASON does NOT fire when expectedBushels = 0 (avoids divide-by-zero semantics)
 *   - OUT_OF_SEASON does NOT fire when fields are omitted (backward compat)
 *   - Marketing year label rolls over correctly around Sept 1 boundary
 *   - Headline + summary copy uses farmer-readable phrasing
 *
 * Usage (from project root):
 *   npx tsx scripts/test-out-of-season-unit.ts
 *
 * Following the same pure-test convention as the other engine module
 * tests (pace-calendar, signals, quantity, rationale, recommendation-
 * engine, seasonal-windows-unit). No async, no I/O, no top-level await.
 */

import { generateRationale, type RationaleInput } from '../lib/sellscore/rationale';
import type { SignalSet } from '../lib/sellscore/signals';
import type { QuantityCalc } from '../lib/sellscore/quantity';

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

function assertContains(actual: string, expected: string, label: string) {
  assertions++;
  if (!actual.includes(expected)) {
    failures++;
    console.error(`FAIL: ${label}`);
    console.error(`  expected substring: ${JSON.stringify(expected)}`);
    console.error(`  actual:             ${JSON.stringify(actual)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Test fixtures: small helpers to build a SignalSet and QuantityCalc with
// specific shapes without touching the real signal classifiers.
// ─────────────────────────────────────────────────────────────────────────

function allGreenSignals(): SignalSet {
  return {
    margin: {
      level: 'GREEN',
      cashBid: 4.20,
      breakeven: 4.00,
      marginTarget: 0.20,
      margin: 0.20,
      surplusOverTarget: 0,
    },
    basis: {
      level: 'GREEN',
      todayBasis: -0.32,
      percentileRank: 86,
      threshold75thPctl: -0.36,
      threshold50thPctl: -0.42,
      historicalSampleSize: 42,
      hasEnoughHistory: true,
    },
    pace: {
      level: 'GREEN',
      currentPctSold: 50,
      targetPctSold: 68,
      gap: -18,
    },
    greenCount: 3,
  };
}

function marginRedSignals(): SignalSet {
  return {
    ...allGreenSignals(),
    margin: {
      level: 'RED',
      cashBid: 3.80,
      breakeven: 4.00,
      marginTarget: 0.20,
      margin: -0.20,
      surplusOverTarget: -0.40,
    },
    greenCount: 2,
  };
}

function nonZeroQuantity(): QuantityCalc {
  return {
    recommendedBushels: 6000,
    rawQuantity: 5400,
    capApplied: 'none',
  } as QuantityCalc;
}

function zeroQuantity(): QuantityCalc {
  return {
    recommendedBushels: 0,
    rawQuantity: 0,
    capApplied: 'no_gap_to_fill',
  } as QuantityCalc;
}

// ─────────────────────────────────────────────────────────────────────────
// Test 1 — OUT_OF_SEASON fires when bushelsSold >= expectedBushels
// ─────────────────────────────────────────────────────────────────────────
{
  const input: RationaleInput = {
    crop: 'corn',
    cashBid: 4.20,
    signals: allGreenSignals(),
    quantity: zeroQuantity(),
    expectedBushels: 50000,
    bushelsSold: 50000,
    date: new Date(Date.UTC(2026, 4, 7)), // 2026-05-07
  };
  const r = generateRationale(input);
  assertEq(r.action, 'OUT_OF_SEASON', 'OUT_OF_SEASON fires when sold == expected');
  assertContains(r.headline, 'corn', 'headline mentions crop');
  assertContains(r.headline, '2025/26', 'headline shows current marketing year');
  assertContains(r.signalSummary, '2025/26', 'summary references current marketing year');
  assertContains(r.signalSummary, '2026/27', 'summary references next marketing year');
  assertContains(r.signalSummary, 'September 1, 2026', 'summary names next start date');
}

// ─────────────────────────────────────────────────────────────────────────
// Test 2 — OUT_OF_SEASON fires when oversold (sold > expected)
// ─────────────────────────────────────────────────────────────────────────
{
  const input: RationaleInput = {
    crop: 'soybeans',
    cashBid: 11.00,
    signals: allGreenSignals(),
    quantity: zeroQuantity(),
    expectedBushels: 15000,
    bushelsSold: 16000, // oversold by 1000 bu
    date: new Date(Date.UTC(2026, 4, 7)),
  };
  const r = generateRationale(input);
  assertEq(r.action, 'OUT_OF_SEASON', 'OUT_OF_SEASON fires when oversold');
  assertContains(r.headline, 'beans', 'soybeans display name is "beans" in headline');
}

// ─────────────────────────────────────────────────────────────────────────
// Test 3 — OUT_OF_SEASON beats margin-RED gate
// (Priority: out of season is top, before margin RED)
// ─────────────────────────────────────────────────────────────────────────
{
  const input: RationaleInput = {
    crop: 'corn',
    cashBid: 3.80,
    signals: marginRedSignals(),
    quantity: zeroQuantity(),
    expectedBushels: 50000,
    bushelsSold: 50000,
    date: new Date(Date.UTC(2026, 4, 7)),
  };
  const r = generateRationale(input);
  assertEq(r.action, 'OUT_OF_SEASON', 'OUT_OF_SEASON beats margin-RED → HOLD');
}

// ─────────────────────────────────────────────────────────────────────────
// Test 4 — OUT_OF_SEASON does NOT fire when expectedBushels = 0
// (Avoids the divide-by-zero / "no expected production" edge case)
// ─────────────────────────────────────────────────────────────────────────
{
  const input: RationaleInput = {
    crop: 'corn',
    cashBid: 4.20,
    signals: allGreenSignals(),
    quantity: zeroQuantity(),
    expectedBushels: 0,
    bushelsSold: 0,
    date: new Date(Date.UTC(2026, 4, 7)),
  };
  const r = generateRationale(input);
  assertEq(r.action, 'HOLD', 'expectedBushels=0 does not trigger OUT_OF_SEASON; falls through to HOLD');
}

// ─────────────────────────────────────────────────────────────────────────
// Test 5 — OUT_OF_SEASON does NOT fire when fields are omitted
// (Backward compatibility for callers that don't supply the new fields)
// ─────────────────────────────────────────────────────────────────────────
{
  const input: RationaleInput = {
    crop: 'corn',
    cashBid: 4.20,
    signals: allGreenSignals(),
    quantity: nonZeroQuantity(),
    // expectedBushels and bushelsSold deliberately omitted
  };
  const r = generateRationale(input);
  assertEq(r.action, 'SELL', 'omitted fields preserve existing SELL behavior');
}

// ─────────────────────────────────────────────────────────────────────────
// Test 6 — Marketing year label rolls over at Sept 1
// (Tests the boundary explicitly: Aug 31 vs Sept 1 should differ)
// ─────────────────────────────────────────────────────────────────────────
{
  // August 31, 2026 — still in 2025/26 marketing year
  const inputAug: RationaleInput = {
    crop: 'corn',
    cashBid: 4.20,
    signals: allGreenSignals(),
    quantity: zeroQuantity(),
    expectedBushels: 50000,
    bushelsSold: 50000,
    date: new Date(Date.UTC(2026, 7, 31)),
  };
  const rAug = generateRationale(inputAug);
  assertContains(rAug.headline, '2025/26', 'August 31 still in 2025/26');

  // September 1, 2026 — rolled over to 2026/27 marketing year
  const inputSep: RationaleInput = {
    ...inputAug,
    date: new Date(Date.UTC(2026, 8, 1)),
  };
  const rSep = generateRationale(inputSep);
  assertContains(rSep.headline, '2026/27', 'September 1 rolls over to 2026/27');
  assertContains(rSep.signalSummary, 'September 1, 2027', 'next marketing year start updates to Sept 2027');
}

// ─────────────────────────────────────────────────────────────────────────
// Test 7 — Marketing year label correct in winter / spring of various years
// ─────────────────────────────────────────────────────────────────────────
{
  const cases = [
    { date: new Date(Date.UTC(2025, 11, 31)), expected: '2025/26', label: 'Dec 31, 2025' },
    { date: new Date(Date.UTC(2026, 0, 1)), expected: '2025/26', label: 'Jan 1, 2026' },
    { date: new Date(Date.UTC(2026, 2, 15)), expected: '2025/26', label: 'Mar 15, 2026' },
    { date: new Date(Date.UTC(2026, 8, 1)), expected: '2026/27', label: 'Sep 1, 2026' },
    { date: new Date(Date.UTC(2027, 0, 15)), expected: '2026/27', label: 'Jan 15, 2027' },
  ];

  for (const { date, expected, label } of cases) {
    const input: RationaleInput = {
      crop: 'corn',
      cashBid: 4.20,
      signals: allGreenSignals(),
      quantity: zeroQuantity(),
      expectedBushels: 50000,
      bushelsSold: 50000,
      date,
    };
    const r = generateRationale(input);
    assertContains(r.headline, expected, `${label} → marketing year ${expected}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Test 8 — Existing actions (SELL/WATCH/HOLD) still work end to end
// (Regression check: adding OUT_OF_SEASON didn't break the priority chain)
// ─────────────────────────────────────────────────────────────────────────
{
  // SELL: 3 greens, non-zero quantity, has bushels left to sell
  const sellInput: RationaleInput = {
    crop: 'corn',
    cashBid: 4.20,
    signals: allGreenSignals(),
    quantity: nonZeroQuantity(),
    expectedBushels: 50000,
    bushelsSold: 25000,
    date: new Date(Date.UTC(2026, 4, 7)),
  };
  assertEq(generateRationale(sellInput).action, 'SELL', 'SELL still fires with all greens + bushels left');

  // HOLD: margin RED, has bushels left
  const holdInput: RationaleInput = {
    ...sellInput,
    signals: marginRedSignals(),
  };
  assertEq(generateRationale(holdInput).action, 'HOLD', 'HOLD still fires on margin RED');

  // HOLD: zero quantity (already at pace), has bushels left
  const holdQtyInput: RationaleInput = {
    ...sellInput,
    quantity: zeroQuantity(),
  };
  assertEq(generateRationale(holdQtyInput).action, 'HOLD', 'HOLD still fires on quantity=0 with bushels remaining');
}

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────
console.log(`\n${assertions} assertions, ${failures} failures`);
if (failures > 0) {
  process.exit(1);
}
