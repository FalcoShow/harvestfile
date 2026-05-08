import { computeRecommendedQuantity } from '../lib/sellscore/quantity';

console.log('Quantity calc smoke tests\n');

let passes = 0;
let fails = 0;

function check(name: string, actual: unknown, expected: unknown, comment = '') {
  const ok = actual === expected;
  if (ok) passes++; else fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${actual}${ok ? '' : ` (expected ${expected})`}  ${comment}`);
}

// ── Scenario 1: typical farmer, daily cap binds ──
console.log('Scenario 1: 100k bu expected, 50% sold, 67.8% target');
const s1 = computeRecommendedQuantity(50000, 100000, 50, 67.8);
check('  recommendedBushels', s1.recommendedBushels, 12500, '— 25% of 50k unsold');
check('  reasoning', s1.reasoning, 'capped_at_daily_max');
console.log(`  paceGap=${s1.paceGapPct.toFixed(1)}pp  paceGapBu=${s1.paceGapBushels.toFixed(0)}  dailyCap=${s1.dailyCapBushels}`);

// ── Scenario 2: small gap, gap-bound, rounded down ──
console.log('\nScenario 2: 50k expected, 65% sold, 68% target (tiny gap)');
const s2 = computeRecommendedQuantity(17500, 50000, 65, 68);
check('  recommendedBushels', s2.recommendedBushels, 2000, '— 2,250 raw rounds down to 2,000');
check('  reasoning', s2.reasoning, 'gap_filled_to_target');
console.log(`  paceGap=${s2.paceGapPct.toFixed(1)}pp  paceGapBu=${s2.paceGapBushels.toFixed(0)}`);

// ── Scenario 3: at or ahead of pace ──
console.log('\nScenario 3: 100k expected, 70% sold, 67.8% target (ahead)');
const s3 = computeRecommendedQuantity(30000, 100000, 70, 67.8);
check('  recommendedBushels', s3.recommendedBushels, 0, '— no gap to fill');
check('  reasoning', s3.reasoning, 'no_gap_to_fill');

// ── Scenario 4: gap so tiny it rounds to zero ──
console.log('\nScenario 4: 100k expected, 67.5% sold, 67.8% target (sub-500 gap)');
const s4 = computeRecommendedQuantity(32500, 100000, 67.5, 67.8);
check('  recommendedBushels', s4.recommendedBushels, 0, '— 450 raw rounds down to 0');
console.log(`  paceGapBu=${s4.paceGapBushels.toFixed(0)}`);

// ── Scenario 5: big farm, big gap, daily cap binding ──
console.log('\nScenario 5: 500k expected, 30% sold, 68% target');
const s5 = computeRecommendedQuantity(350000, 500000, 30, 68);
check('  recommendedBushels', s5.recommendedBushels, 87500, '— 25% of 350k unsold');
check('  reasoning', s5.reasoning, 'capped_at_daily_max');

// ── Scenario 6: gap exactly equals daily cap (tie test) ──
console.log('\nScenario 6: paceGap exactly equals daily cap');
const s6 = computeRecommendedQuantity(48000, 100000, 52, 60);
check('  recommendedBushels', s6.recommendedBushels, 12000, '— 12,000 = 12,000');
check('  reasoning', s6.reasoning, 'gap_filled_to_target', '— ties go to gap_filled');

// ── Scenario 7: disabled daily cap ──
console.log('\nScenario 7: dailyCapPct=100 (cap disabled, gap binds)');
const s7 = computeRecommendedQuantity(40000, 100000, 50, 67.8, { dailyCapPct: 100 });
check('  recommendedBushels', s7.recommendedBushels, 26500, '— 26,700 rounds down to 26,500');
check('  reasoning', s7.reasoning, 'gap_filled_to_target');

// ── Scenario 8: custom acceleration factor ──
console.log('\nScenario 8: accelerationFactor=1.0 (no acceleration)');
const s8 = computeRecommendedQuantity(40000, 100000, 50, 67.8, { accelerationFactor: 1.0 });
check('  recommendedBushels', s8.recommendedBushels, 10000, '— gap=17,800 but daily cap binds at 10k');
check('  reasoning', s8.reasoning, 'capped_at_daily_max');

console.log(`\n${passes}/${passes + fails} passed`);