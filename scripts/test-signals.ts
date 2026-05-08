import {
  classifyMarginSignal,
  classifyBasisSignal,
  classifyPaceSignal,
  combineSignals,
} from '../lib/sellscore/signals';

console.log('Signal classification smoke tests\n');

let passes = 0;
let fails = 0;

function check(name: string, actual: unknown, expected: unknown, comment = '') {
  const ok = actual === expected;
  if (ok) passes++; else fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${actual}${ok ? '' : ` (expected ${expected})`}  ${comment}`);
}

// ───── Margin signal ─────
// Spec §4.4: GREEN cashBid ≥ breakeven + $0.20, AMBER ≥ breakeven, RED below.
console.log('Margin signal:');
const m1 = classifyMarginSignal(4.50, 4.00, 0.20);
check('  $4.50 vs $4.00 BE + $0.20 target', m1.level, 'GREEN',
  `— margin $${m1.margin.toFixed(2)}, surplus $${m1.surplusOverTarget.toFixed(2)}`);

const m2 = classifyMarginSignal(4.10, 4.00, 0.20);
check('  $4.10 vs $4.00 BE + $0.20 target', m2.level, 'AMBER',
  `— above BE but $${(-m2.surplusOverTarget).toFixed(2)} short of target`);

const m3 = classifyMarginSignal(3.90, 4.00, 0.20);
check('  $3.90 vs $4.00 BE + $0.20 target', m3.level, 'RED',
  `— $${(-m3.margin).toFixed(2)} below BE`);

const m4 = classifyMarginSignal(4.20, 4.00, 0.20);
check('  $4.20 vs $4.00 BE + $0.20 target', m4.level, 'GREEN',
  '— exactly at target boundary');

// ───── Pace signal ─────
// Spec §4.4: GREEN at-or-behind target (urgency to sell),
// AMBER ahead within 5pp, RED ahead by >5pp.
console.log('\nPace signal:');
const p1 = classifyPaceSignal(50, 68);
check('  50% sold vs 68% target', p1.level, 'GREEN', `— gap ${p1.gap}pp (deeply behind)`);

const p2 = classifyPaceSignal(67, 68);
check('  67% sold vs 68% target', p2.level, 'GREEN', `— gap ${p2.gap}pp (1pp behind, urgency to sell)`);

const p3 = classifyPaceSignal(68, 68);
check('  68% sold vs 68% target', p3.level, 'GREEN', `— gap ${p3.gap}pp (exactly at target)`);

const p4 = classifyPaceSignal(69, 68);
check('  69% sold vs 68% target', p4.level, 'AMBER', `— gap ${p4.gap}pp (slightly ahead, no urgency)`);

const p5 = classifyPaceSignal(73, 68);
check('  73% sold vs 68% target', p5.level, 'AMBER', `— gap ${p5.gap}pp (at upper AMBER boundary)`);

const p6 = classifyPaceSignal(74, 68);
check('  74% sold vs 68% target', p6.level, 'RED', `— gap ${p6.gap}pp (just past boundary, materially ahead)`);

const p7 = classifyPaceSignal(80, 68);
check('  80% sold vs 68% target', p7.level, 'RED', `— gap ${p7.gap}pp (well ahead, hold)`);

// ───── Basis signal ─────
// Spec §4.4: GREEN ≥ 75th percentile (top quartile),
// AMBER 25th–75th (interquartile), RED below 25th (unusually weak).
console.log('\nBasis signal:');

// Deterministic synthetic distribution: 100 values from -1.00 to -0.01.
// Percentiles (R-7): 25th ≈ -0.7525, 50th ≈ -0.505, 75th ≈ -0.2575.
const fixedHistory: number[] = [];
for (let i = 0; i < 100; i++) fixedHistory.push(-1.00 + i * 0.01);

const b1 = classifyBasisSignal(-0.10, fixedHistory);
check('  -$0.10 basis (top quartile)', b1.level, 'GREEN',
  `— pctile ${b1.percentileRank.toFixed(0)}, 75th ≈ $${b1.threshold75thPctl.toFixed(3)}`);

const b2 = classifyBasisSignal(-0.40, fixedHistory);
check('  -$0.40 basis (interquartile, upper half)', b2.level, 'AMBER',
  `— pctile ${b2.percentileRank.toFixed(0)} (between 25th and 75th)`);

// Spec-alignment behavioral check: under old (50/75) thresholds this value
// was below the median and classified RED. Under spec-aligned (25/75)
// thresholds it sits in the lower interquartile range and classifies AMBER.
const b3 = classifyBasisSignal(-0.60, fixedHistory);
check('  -$0.60 basis (interquartile, lower half — was RED under old 50/75)', b3.level, 'AMBER',
  `— pctile ${b3.percentileRank.toFixed(0)}, spec 25/75 reads this as AMBER not RED`);

const b4 = classifyBasisSignal(-0.80, fixedHistory);
check('  -$0.80 basis (below 25th, unusually weak)', b4.level, 'RED',
  `— pctile ${b4.percentileRank.toFixed(0)}, 25th ≈ $${b4.threshold25thPctl.toFixed(3)}`);

// Thin sample fallback — emulates short-history counties (Wood OH, Black Hawk IA, etc.).
// BASIS_MIN_SAMPLE_SIZE = 20; this 5-value sample falls well below the floor.
const thinSample = [-0.20, -0.15, -0.25, -0.18, -0.22];
const b5 = classifyBasisSignal(-0.10, thinSample);
check('  Thin sample (<20 obs)', b5.level, 'RED',
  `— hasEnoughHistory=${b5.hasEnoughHistory}, sampleSize=${b5.historicalSampleSize}`);

// ───── Combined scenario ─────
console.log('\nCombined scenario (all three GREEN):');
const margin = classifyMarginSignal(4.50, 4.00, 0.20);   // GREEN
const basis  = classifyBasisSignal(-0.10, fixedHistory); // GREEN
const pace   = classifyPaceSignal(50, 67.8);             // GREEN
const combined = combineSignals(margin, basis, pace);
check('  Triple-GREEN (recommend sale)', combined.greenCount, 3,
  `— margin ${margin.level}, basis ${basis.level}, pace ${pace.level}`);

console.log(`\n${passes}/${passes + fails} passed`);
