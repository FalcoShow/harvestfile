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
console.log('\nPace signal:');
const p1 = classifyPaceSignal(50, 68);
check('  50% sold vs 68% target', p1.level, 'GREEN', `— gap ${p1.gap}pp (behind)`);

const p2 = classifyPaceSignal(67, 68);
check('  67% sold vs 68% target', p2.level, 'AMBER', `— gap ${p2.gap}pp (at pace)`);

const p3 = classifyPaceSignal(80, 68);
check('  80% sold vs 68% target', p3.level, 'RED', `— gap ${p3.gap}pp (ahead, hold)`);

const p4 = classifyPaceSignal(63, 68);
check('  63% sold vs 68% target', p4.level, 'GREEN', `— gap ${p4.gap}pp (at boundary)`);

// ───── Basis signal ─────
console.log('\nBasis signal:');

// Deterministic synthetic distribution: 100 values from -1.00 to -0.01
// Percentiles: 50th ≈ -0.505, 75th ≈ -0.2575
const fixedHistory: number[] = [];
for (let i = 0; i < 100; i++) fixedHistory.push(-1.00 + i * 0.01);

const b1 = classifyBasisSignal(-0.10, fixedHistory);
check('  -$0.10 basis vs uniform [-1.00, -0.01]', b1.level, 'GREEN',
  `— pctile ${b1.percentileRank.toFixed(0)}, 75th ≈ $${b1.threshold75thPctl.toFixed(3)}`);

const b2 = classifyBasisSignal(-0.40, fixedHistory);
check('  -$0.40 basis (between 50th and 75th)', b2.level, 'AMBER',
  `— pctile ${b2.percentileRank.toFixed(0)}`);

const b3 = classifyBasisSignal(-0.80, fixedHistory);
check('  -$0.80 basis (below 50th)', b3.level, 'RED',
  `— pctile ${b3.percentileRank.toFixed(0)}, 50th ≈ $${b3.threshold50thPctl.toFixed(3)}`);

// Thin sample fallback — emulates short-history counties (Wood OH, Black Hawk IA, etc.)
const thinSample = [-0.20, -0.15, -0.25, -0.18, -0.22];
const b4 = classifyBasisSignal(-0.10, thinSample);
check('  Thin sample (<60 obs)', b4.level, 'RED',
  `— hasEnoughHistory=${b4.hasEnoughHistory}, sampleSize=${b4.historicalSampleSize}`);

// ───── Combined scenario ─────
console.log('\nCombined scenario (all three GREEN):');
const margin = classifyMarginSignal(4.50, 4.00, 0.20);   // GREEN
const basis  = classifyBasisSignal(-0.10, fixedHistory); // GREEN
const pace   = classifyPaceSignal(50, 67.8);             // GREEN
const combined = combineSignals(margin, basis, pace);
check('  Triple-GREEN (recommend sale)', combined.greenCount, 3,
  `— margin ${margin.level}, basis ${basis.level}, pace ${pace.level}`);

console.log(`\n${passes}/${passes + fails} passed`);