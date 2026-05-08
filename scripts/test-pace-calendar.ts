import {
  getTargetPaceForDate,
  marketingYearStart,
  nextMilestone,
  daysIntoMarketingYear,
  type Crop,
} from '../lib/sellscore/pace-calendar';

const tests: { date: string; crop: Crop; expected: number; label: string }[] = [
  { date: '2025-09-01', crop: 'corn',     expected: 0,    label: 'MY 2025/26 start' },
  { date: '2025-11-15', crop: 'corn',     expected: 25,   label: 'Nov 15 milestone' },
  { date: '2025-12-15', crop: 'corn',     expected: 32.4, label: 'Dec 15 (mid Nov–Jan)' },
  { date: '2026-01-15', crop: 'corn',     expected: 40,   label: 'Jan 15 milestone' },
  { date: '2026-03-15', crop: 'corn',     expected: 55,   label: 'Mar 15 milestone' },
  { date: '2026-05-06', crop: 'corn',     expected: 67.8, label: 'TODAY (between Mar 15 and May 15)' },
  { date: '2026-05-06', crop: 'soybeans', expected: 67.8, label: 'TODAY, soybeans (same as corn)' },
  { date: '2026-05-15', crop: 'corn',     expected: 70,   label: 'May 15 milestone' },
  { date: '2026-07-15', crop: 'corn',     expected: 85,   label: 'Jul 15 milestone' },
  { date: '2026-08-31', crop: 'corn',     expected: 99.7, label: 'Aug 31 (last day of MY)' },
  { date: '2026-09-01', crop: 'corn',     expected: 0,    label: 'MY rollover (next MY start)' },
];

console.log('Pace calendar smoke test\n');

let passes = 0;
let fails = 0;
const TOL = 1.0;

for (const t of tests) {
  const date = new Date(t.date + 'T12:00:00Z');
  const actual = getTargetPaceForDate(t.crop, date);
  const pass = Math.abs(actual - t.expected) <= TOL;
  if (pass) passes++; else fails++;
  console.log(
    `${pass ? '✓' : '✗'} ${t.date} ${t.crop.padEnd(8)} → ${actual.toFixed(2)}%   (expected ~${t.expected.toFixed(1)}%)   ${t.label}`,
  );
}

console.log(`\n${passes}/${passes + fails} passed`);

console.log('\nMarketing year boundary checks:');
for (const dateStr of ['2025-08-31', '2025-09-01', '2026-08-31', '2026-09-01']) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const my = marketingYearStart('corn', d);
  const days = daysIntoMarketingYear('corn', d);
  console.log(`  ${dateStr} → MY starts ${my.toISOString().slice(0, 10)}, day ${days} into MY`);
}

console.log('\nNext milestone from today (2026-05-06):');
const today = new Date('2026-05-06T12:00:00Z');
const next = nextMilestone('corn', today);
if (next) {
  console.log(`  ${next.date.toISOString().slice(0, 10)} at ${next.targetPct}%`);
}