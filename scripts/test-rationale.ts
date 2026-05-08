import { generateRationale } from '../lib/sellscore/rationale';
import {
  classifyMarginSignal,
  classifyBasisSignal,
  classifyPaceSignal,
  combineSignals,
} from '../lib/sellscore/signals';
import { computeRecommendedQuantity } from '../lib/sellscore/quantity';

console.log('Rationale generation smoke tests\n');

let passes = 0;
let fails = 0;

function check(name: string, actual: unknown, expected: unknown, comment = '') {
  const ok = actual === expected;
  if (ok) passes++; else fails++;
  console.log(
    `${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}  ${comment}`,
  );
}

function assert(name: string, cond: boolean, comment = '') {
  if (cond) passes++; else fails++;
  console.log(`${cond ? '✓' : '✗'} ${name}  ${comment}`);
}

// Deterministic basis history (uniform [-1.00, -0.01]; 25th ≈ -0.7525, 75th ≈ -0.2575)
const fixedHistory: number[] = [];
for (let i = 0; i < 100; i++) fixedHistory.push(-1.00 + i * 0.01);

// ── Scenario 1: SELL — all three GREEN ──
console.log('Scenario 1: SELL — all three GREEN');
const s1Sig = combineSignals(
  classifyMarginSignal(4.50, 4.00, 0.20),
  classifyBasisSignal(-0.10, fixedHistory),
  classifyPaceSignal(50, 67.8),
);
const s1Qty = computeRecommendedQuantity(50000, 100000, 50, 67.8);
const r1 = generateRationale({
  crop: 'corn',
  cashBid: 4.50,
  signals: s1Sig,
  quantity: s1Qty,
  elevatorName: 'DeWitt',
});
check('  action', r1.action, 'SELL');
assert('  headline starts with "Sell"', r1.headline.startsWith('Sell'));
assert('  headline includes 12,500', r1.headline.includes('12,500'));
assert('  headline includes $4.50', r1.headline.includes('$4.50'));
assert('  headline includes DeWitt', r1.headline.includes('DeWitt'));
console.log(`  Headline: "${r1.headline}"`);
console.log(`  Summary:  "${r1.signalSummary}"`);
console.log(`  Margin:   "${r1.details.margin}"`);
console.log(`  Basis:    "${r1.details.basis}"`);
console.log(`  Pace:     "${r1.details.pace}"`);

// ── Scenario 2: WATCH — basis AMBER, margin and pace GREEN ──
//
// Under spec-aligned pace classifier (GREEN at-or-behind, AMBER ahead within
// 5pp), the prior "WATCH with pace AMBER" scenario can't fire — pace AMBER
// means farmer is slightly ahead, which forces quantity = 0 and routes
// through HOLD via the quantity-zero gate. The natural WATCH scenario in
// production is basis AMBER + others GREEN: farmer is behind, margin clears
// target, but basis is in the interquartile range so it isn't a top-quartile
// sell day. This is the dominant WATCH shape we expect to see in the field.
console.log('\nScenario 2: WATCH — margin and pace GREEN, basis AMBER');
const s2Sig = combineSignals(
  classifyMarginSignal(4.50, 4.00, 0.20),     // GREEN
  classifyBasisSignal(-0.40, fixedHistory),    // AMBER (interquartile)
  classifyPaceSignal(50, 67.8),                // GREEN (behind target)
);
const s2Qty = computeRecommendedQuantity(50000, 100000, 50, 67.8);
const r2 = generateRationale({
  crop: 'corn',
  cashBid: 4.50,
  signals: s2Sig,
  quantity: s2Qty,
});
check('  action', r2.action, 'WATCH');
assert('  summary mentions basis', r2.signalSummary.toLowerCase().includes('basis'));
console.log(`  Headline: "${r2.headline}"`);
console.log(`  Summary:  "${r2.signalSummary}"`);

// ── Scenario 3: HOLD — margin RED gate (overrides basis G + pace G) ──
console.log('\nScenario 3: HOLD — margin RED gate');
const s3Sig = combineSignals(
  classifyMarginSignal(3.80, 4.00, 0.20),
  classifyBasisSignal(-0.10, fixedHistory),
  classifyPaceSignal(50, 67.8),
);
const s3Qty = computeRecommendedQuantity(50000, 100000, 50, 67.8);
const r3 = generateRationale({
  crop: 'corn',
  cashBid: 3.80,
  signals: s3Sig,
  quantity: s3Qty,
});
check('  action', r3.action, 'HOLD');
assert(
  '  summary mentions breakeven or loss',
  r3.signalSummary.toLowerCase().includes('breakeven') ||
    r3.signalSummary.toLowerCase().includes('loss'),
);
console.log(`  Headline: "${r3.headline}"`);
console.log(`  Summary:  "${r3.signalSummary}"`);

// ── Scenario 4: HOLD — pace RED, qty = 0 ──
console.log('\nScenario 4: HOLD — pace RED (already ahead, qty = 0)');
const s4Sig = combineSignals(
  classifyMarginSignal(4.50, 4.00, 0.20),
  classifyBasisSignal(-0.10, fixedHistory),
  classifyPaceSignal(80, 67.8),
);
const s4Qty = computeRecommendedQuantity(20000, 100000, 80, 67.8);
const r4 = generateRationale({
  crop: 'corn',
  cashBid: 4.50,
  signals: s4Sig,
  quantity: s4Qty,
});
check('  action', r4.action, 'HOLD');
check('  qty', s4Qty.recommendedBushels, 0);
assert(
  '  summary mentions pace or ahead',
  r4.signalSummary.toLowerCase().includes('pace') ||
    r4.signalSummary.toLowerCase().includes('ahead'),
);
console.log(`  Headline: "${r4.headline}"`);
console.log(`  Summary:  "${r4.signalSummary}"`);

// ── Scenario 5: HOLD — basis RED unusually weak, pace AMBER ──
//
// Pace 70% sold vs 68% target = +2pp ahead, which is AMBER under the
// spec-aligned classifier. Combined with basis RED (below 25th pctl) and
// margin GREEN, greenCount = 1 and quantity = 0 (ahead of pace), so action
// routes to HOLD via the quantity-zero gate. The summary should adopt the
// spec phrase "unusually weak" from §4.4 RED basis description.
console.log('\nScenario 5: HOLD — basis RED unusually weak, pace AMBER');
const s5Sig = combineSignals(
  classifyMarginSignal(4.50, 4.00, 0.20),     // GREEN
  classifyBasisSignal(-0.80, fixedHistory),    // RED (below 25th)
  classifyPaceSignal(70, 68),                   // AMBER (slightly ahead)
);
const s5Qty = computeRecommendedQuantity(33000, 100000, 70, 68);
const r5 = generateRationale({
  crop: 'corn',
  cashBid: 4.50,
  signals: s5Sig,
  quantity: s5Qty,
});
check('  action', r5.action, 'HOLD');
assert('  summary mentions basis', r5.signalSummary.toLowerCase().includes('basis'));
assert('  summary uses spec phrase "unusually weak"', r5.signalSummary.toLowerCase().includes('unusually weak'));
console.log(`  Headline: "${r5.headline}"`);
console.log(`  Summary:  "${r5.signalSummary}"`);

// ── Scenario 6: thin basis sample (<20 days) ──
console.log('\nScenario 6: thin basis sample, margin and pace GREEN');
const thinSample = [-0.20, -0.15, -0.25, -0.18, -0.22];
const s6Sig = combineSignals(
  classifyMarginSignal(4.50, 4.00, 0.20),
  classifyBasisSignal(-0.10, thinSample),
  classifyPaceSignal(50, 67.8),
);
const s6Qty = computeRecommendedQuantity(50000, 100000, 50, 67.8);
const r6 = generateRationale({
  crop: 'corn',
  cashBid: 4.50,
  signals: s6Sig,
  quantity: s6Qty,
});
console.log(`  Action: ${r6.action}`);
assert('  basis detail mentions history', r6.details.basis.toLowerCase().includes('history'));
console.log(`  Headline: "${r6.headline}"`);
console.log(`  Summary:  "${r6.signalSummary}"`);
console.log(`  Basis:    "${r6.details.basis}"`);

// ── Scenario 7: SELL with soybeans + elevator name ──
console.log('\nScenario 7: SELL — soybeans variant');
const s7Sig = combineSignals(
  classifyMarginSignal(11.50, 10.50, 0.30),
  classifyBasisSignal(-0.20, fixedHistory),
  classifyPaceSignal(45, 67.8),
);
const s7Qty = computeRecommendedQuantity(30000, 60000, 45, 67.8);
const r7 = generateRationale({
  crop: 'soybeans',
  cashBid: 11.50,
  signals: s7Sig,
  quantity: s7Qty,
  elevatorName: 'Eldridge',
});
check('  action', r7.action, 'SELL');
assert('  headline mentions beans', r7.headline.includes('beans'));
assert('  headline includes $11.50', r7.headline.includes('$11.50'));
assert('  headline includes Eldridge', r7.headline.includes('Eldridge'));
console.log(`  Headline: "${r7.headline}"`);

console.log(`\n${passes}/${passes + fails} passed`);
