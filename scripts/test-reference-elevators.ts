import {
  REFERENCE_ELEVATORS,
  getReferenceForCounty,
  findClosestReference,
} from '../lib/sellscore/reference-elevators';

console.log('Reference elevators smoke tests\n');

let passes = 0;
let fails = 0;

function check(name: string, actual: unknown, expected: unknown, comment = '') {
  const ok = actual === expected;
  if (ok) passes++; else fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}  ${comment}`);
}

function assert(name: string, cond: boolean, comment = '') {
  if (cond) passes++; else fails++;
  console.log(`${cond ? '✓' : '✗'} ${name}  ${comment}`);
}

// Coverage
check('Total reference elevators', REFERENCE_ELEVATORS.length, 25);

// State counts: 5 per state across 5 states
const byState = REFERENCE_ELEVATORS.reduce<Record<string, number>>((acc, e) => {
  acc[e.state] = (acc[e.state] ?? 0) + 1;
  return acc;
}, {});
console.log(`\nElevators per state: ${JSON.stringify(byState)}`);
for (const st of ['OH', 'IN', 'IL', 'MI', 'IA']) {
  check(`  ${st} count`, byState[st], 5);
}

// County lookup — exact-match cases
console.log('\nCounty lookup (getReferenceForCounty):');
const clinton = getReferenceForCounty('19045');
assert('  IA/Clinton found', clinton !== undefined);
check('  IA/Clinton elevator', clinton?.elevatorName, 'Dewitt');
check('  IA/Clinton company', clinton?.company, 'River Valley Cooperative');
check('  IA/Clinton barchart id', clinton?.elevatorId, '55552');

const pickaway = getReferenceForCounty('39129');
check('  OH/Pickaway elevator', pickaway?.elevatorName, 'Circleville, CAH');
check('  OH/Pickaway company', pickaway?.company, 'Cargill US');

const missing = getReferenceForCounty('99999');
check('  Missing county returns undefined', missing, undefined);

// Closest-by-coordinates fallback
console.log('\nClosest-reference lookup (findClosestReference):');
// Coordinates near IA/Clinton centroid (41.897, -90.530) should resolve to Dewitt
const nearClinton = findClosestReference(41.897, -90.530);
check('  Near IA/Clinton coords → Dewitt', nearClinton.elevatorName, 'Dewitt');

// Coordinates near OH/Hardin centroid (40.66, -83.66) should resolve to Kenton
const nearHardin = findClosestReference(40.66, -83.66);
check('  Near OH/Hardin coords → Kenton', nearHardin.elevatorName, 'Kenton');

// All-county basis-history coverage check (every reference county is populated)
console.log('\nReference county FIPS list (all should match county_basis_history):');
const fipsList = REFERENCE_ELEVATORS.map((e) => e.countyFips).sort();
console.log(`  ${fipsList.join(', ')}`);
assert('  25 unique county_fips', new Set(fipsList).size === 25);

console.log(`\n${passes}/${passes + fails} passed`);