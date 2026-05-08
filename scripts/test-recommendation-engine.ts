import { computeSellScore } from '../lib/sellscore/recommendation-engine';

console.log('Recommendation engine smoke tests\n');

let passes = 0;
let fails = 0;

function check(name: string, actual: unknown, expected: unknown, comment = '') {
  const ok = actual === expected;
  if (ok) passes++; else fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}  ${comment}`);
}

function assertNear(name: string, actual: number, expected: number, tol = 0.01, comment = '') {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) passes++; else fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${actual.toFixed(4)}${ok ? '' : ` (expected ~${expected.toFixed(4)})`}  ${comment}`);
}

function assert(name: string, cond: boolean, comment = '') {
  if (cond) passes++; else fails++;
  console.log(`${cond ? '✓' : '✗'} ${name}  ${comment}`);
}

// Deterministic basis history (uniform [-1.00, -0.01], 75th ≈ -0.258, 50th ≈ -0.505)
const fixedHistory: number[] = [];
for (let i = 0; i < 100; i++) fixedHistory.push(-1.00 + i * 0.01);

const today = new Date('2026-05-06T12:00:00Z');

// ── Scenario 1: SELL day, all aligned ──
console.log('Scenario 1: SELL — 500 ac, 100k expected, 50% sold, $4.00 BE, $4.50 cash');
const r1 = computeSellScore(
  'corn',
  today,
  { totalAcres: 500, expectedBushels: 100000, breakeven: 4.00, marginTarget: 0.20, bushelsSold: 50000 },
  { cashBid: 4.50, todayBasis: -0.10, historicalBasis: fixedHistory, elevatorName: 'DeWitt' },
);
check('  action', r1.rationale.action, 'SELL');
check('  recommendedBushels', r1.recommendedBushels, 12500);
check('  greenCount', r1.signals.greenCount, 3);
// 12,500 bu × $0.50 margin / 500 acres = $12.50/acre
assertNear('  scoreDollarsPerAcre', r1.scoreDollarsPerAcre, 12.50);
console.log(`  Sell Score: $${r1.scoreDollarsPerAcre.toFixed(2)}/acre`);
console.log(`  Action: ${r1.rationale.action} ${r1.recommendedBushels} bu`);
console.log(`  Headline: "${r1.rationale.headline}"`);
console.log(`  Pace: ${r1.currentPctSold.toFixed(1)}% sold, target ${r1.targetPctSold.toFixed(1)}%`);

// ── Scenario 2: HOLD — margin RED gate ──
console.log('\nScenario 2: HOLD — cash $3.80 below $4.00 breakeven');
const r2 = computeSellScore(
  'corn',
  today,
  { totalAcres: 500, expectedBushels: 100000, breakeven: 4.00, bushelsSold: 50000 },
  { cashBid: 3.80, todayBasis: -0.10, historicalBasis: fixedHistory },
);
check('  action', r2.rationale.action, 'HOLD');
check('  scoreDollarsPerAcre', r2.scoreDollarsPerAcre, 0);
check('  recommendedBushels', r2.recommendedBushels, 0, '— aligned with HOLD');
check('  raw quantity preserved', r2.quantity.recommendedBushels, 12500, '— raw calc still 12500 for inspection');
console.log(`  Sell Score: $${r2.scoreDollarsPerAcre.toFixed(2)}/acre`);
console.log(`  Headline: "${r2.rationale.headline}"`);

// ── Scenario 3: WATCH — basis AMBER, margin and pace GREEN ──
console.log('\nScenario 3: WATCH — basis AMBER (-$0.40), margin and pace GREEN');
const r3 = computeSellScore(
  'corn',
  today,
  { totalAcres: 500, expectedBushels: 100000, breakeven: 4.00, bushelsSold: 50000 },
  { cashBid: 4.50, todayBasis: -0.40, historicalBasis: fixedHistory },
);
check('  action', r3.rationale.action, 'WATCH');
check('  greenCount', r3.signals.greenCount, 2);
assert('  recommendedBushels > 0', r3.recommendedBushels > 0);
assert('  score > 0', r3.scoreDollarsPerAcre > 0);
console.log(`  Sell Score: $${r3.scoreDollarsPerAcre.toFixed(2)}/acre`);
console.log(`  Headline: "${r3.rationale.headline}"`);

// ── Scenario 4: HOLD — already ahead of pace ──
console.log('\nScenario 4: HOLD — 80% sold, ahead of 67.9% target');
const r4 = computeSellScore(
  'corn',
  today,
  { totalAcres: 500, expectedBushels: 100000, breakeven: 4.00, bushelsSold: 80000 },
  { cashBid: 4.50, todayBasis: -0.10, historicalBasis: fixedHistory },
);
check('  action', r4.rationale.action, 'HOLD');
check('  recommendedBushels', r4.recommendedBushels, 0);
check('  scoreDollarsPerAcre', r4.scoreDollarsPerAcre, 0);
console.log(`  Pace: ${r4.currentPctSold.toFixed(1)}% sold, target ${r4.targetPctSold.toFixed(1)}%`);
console.log(`  Headline: "${r4.rationale.headline}"`);

// ── Scenario 5: Soybeans, 300-acre farm ──
console.log('\nScenario 5: SELL — soybeans, 300 ac, 60k expected, 45% sold');
const r5 = computeSellScore(
  'soybeans',
  today,
  { totalAcres: 300, expectedBushels: 60000, breakeven: 10.50, bushelsSold: 27000 },
  { cashBid: 11.50, todayBasis: -0.20, historicalBasis: fixedHistory, elevatorName: 'Eldridge' },
);
check('  action', r5.rationale.action, 'SELL');
check('  crop', r5.crop, 'soybeans');
assert('  headline mentions beans', r5.rationale.headline.includes('beans'));
assert('  headline includes Eldridge', r5.rationale.headline.includes('Eldridge'));
console.log(`  Sell Score: $${r5.scoreDollarsPerAcre.toFixed(2)}/acre`);
console.log(`  Headline: "${r5.rationale.headline}"`);

// ── Scenario 6: edge case — zero acres ──
console.log('\nScenario 6: edge case — zero acres');
const r6 = computeSellScore(
  'corn',
  today,
  { totalAcres: 0, expectedBushels: 100000, breakeven: 4.00, bushelsSold: 50000 },
  { cashBid: 4.50, todayBasis: -0.10, historicalBasis: fixedHistory },
);
check('  scoreDollarsPerAcre', r6.scoreDollarsPerAcre, 0, '— no acres = no score');

console.log(`\n${passes}/${passes + fails} passed`);