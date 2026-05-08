// scripts/identify-representative-elevators.mjs
// Picks 5 representative elevators per beachhead state for the v1 backtest.
// Strategy: 5 county centroids per state, query Barchart by lat/lng (no
// commodityName filter — it prunes too aggressively), classify returned
// elevators client-side, prefer ones with BOTH corn and soybean bids, fall
// back to single-commodity if nothing in range has both.

import { writeFileSync } from 'node:fs';

const API_KEY = process.env.BARCHART_API_KEY;
if (!API_KEY) {
  console.error('BARCHART_API_KEY not set in environment.');
  process.exit(1);
}

const BASE_URL = 'https://ondemand.websol.barchart.com/getGrainBids.json';

const REPRESENTATIVE_COUNTIES = [
  // Ohio
  { state: 'OH', county: 'Wood',       fips: '39173', lat: 41.359, lng: -83.625, region: 'NW' },
  { state: 'OH', county: 'Mahoning',   fips: '39099', lat: 41.157, lng: -80.770, region: 'NE' },
  { state: 'OH', county: 'Hardin',     fips: '39065', lat: 40.660, lng: -83.659, region: 'central' },
  { state: 'OH', county: 'Darke',      fips: '39037', lat: 40.135, lng: -84.620, region: 'SW' },
  { state: 'OH', county: 'Pickaway',   fips: '39129', lat: 39.642, lng: -83.020, region: 'SE' },

  // Indiana
  { state: 'IN', county: 'Benton',     fips: '18007', lat: 40.605, lng: -87.310, region: 'NW' },
  { state: 'IN', county: 'Allen',      fips: '18003', lat: 41.090, lng: -85.075, region: 'NE' },
  { state: 'IN', county: 'Tippecanoe', fips: '18157', lat: 40.388, lng: -86.894, region: 'central' },
  { state: 'IN', county: 'Gibson',     fips: '18051', lat: 38.310, lng: -87.585, region: 'SW' },
  { state: 'IN', county: 'Decatur',    fips: '18031', lat: 39.305, lng: -85.500, region: 'SE' },

  // Illinois
  { state: 'IL', county: 'Carroll',    fips: '17015', lat: 42.080, lng: -89.925, region: 'NW' },
  { state: 'IL', county: 'Kankakee',   fips: '17091', lat: 41.135, lng: -87.860, region: 'NE' },
  { state: 'IL', county: 'McLean',     fips: '17113', lat: 40.495, lng: -88.840, region: 'central' },
  { state: 'IL', county: 'Madison',    fips: '17119', lat: 38.830, lng: -89.910, region: 'SW' },
  { state: 'IL', county: 'Champaign',  fips: '17019', lat: 40.140, lng: -88.200, region: 'SE' },

  // Michigan
  { state: 'MI', county: 'Berrien',    fips: '26021', lat: 41.910, lng: -86.450, region: 'SW' },
  { state: 'MI', county: 'Lenawee',    fips: '26091', lat: 41.895, lng: -84.065, region: 'SE' },
  { state: 'MI', county: 'Saginaw',    fips: '26145', lat: 43.330, lng: -84.050, region: 'central' },
  { state: 'MI', county: 'Tuscola',    fips: '26157', lat: 43.500, lng: -83.440, region: 'NE' },
  { state: 'MI', county: 'Ionia',      fips: '26067', lat: 42.945, lng: -85.075, region: 'NW' },

  // Eastern Iowa
  { state: 'IA', county: 'Clinton',    fips: '19045', lat: 41.897, lng: -90.530, region: 'NE' },
  { state: 'IA', county: 'Scott',      fips: '19163', lat: 41.640, lng: -90.625, region: 'east-central' },
  { state: 'IA', county: 'Linn',       fips: '19113', lat: 41.975, lng: -91.595, region: 'central' },
  { state: 'IA', county: 'Johnson',    fips: '19103', lat: 41.665, lng: -91.585, region: 'south-central' },
  { state: 'IA', county: 'Black Hawk', fips: '19013', lat: 42.470, lng: -92.305, region: 'north-central' },
];

function classifyLocation(loc) {
  const commodities = new Set(
    (loc.bids || []).map(b => (b.commodity || '').toLowerCase())
  );
  const corn = [...commodities].some(c => c.includes('corn'));
  // Match "soybean", "soybeans", "beans", "yellow beans" — common variants
  const soy = [...commodities].some(c => c.includes('bean') || c.includes('soy'));
  return { corn, soy, commodities: [...commodities] };
}

function locationToRecord(county, loc, classification) {
  return {
    county_fips: county.fips,
    county_name: county.county,
    state: county.state,
    region: county.region,
    elevator_id: String(loc.locationId),
    elevator_name: loc.location,
    company: loc.company,
    city: loc.city,
    elevator_state: loc.state,
    zip: loc.zip,
    lat: loc.lat,
    lng: loc.lng,
    distance_text: loc.distance,
    has_corn: classification.corn,
    has_soy: classification.soy,
    commodities_offered: classification.commodities,
  };
}

async function fetchClosestElevator(county) {
  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('latitude', String(county.lat));
  url.searchParams.set('longitude', String(county.lng));
  url.searchParams.set('totalLocations', '25');
  url.searchParams.set('bidsPerCom', '5');
  url.searchParams.set('numOfDecimals', '2');

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, total: 0, both: null, cornOnly: null, soyOnly: null };
  }

  const data = await res.json();
  const results = data.results || [];

  let bothCornAndSoy = null;
  let cornOnly = null;
  let soyOnly = null;

  // results are returned by Barchart in distance order — first match wins
  for (const loc of results) {
    const c = classifyLocation(loc);
    const record = locationToRecord(county, loc, c);
    if (c.corn && c.soy && !bothCornAndSoy) bothCornAndSoy = record;
    else if (c.corn && !c.soy && !cornOnly) cornOnly = record;
    else if (c.soy && !c.corn && !soyOnly) soyOnly = record;
    if (bothCornAndSoy) break; // ideal match found, stop
  }

  return {
    error: null,
    total: results.length,
    both: bothCornAndSoy,
    cornOnly,
    soyOnly,
  };
}

console.log(`Identifying representative elevators across ${REPRESENTATIVE_COUNTIES.length} counties...\n`);

const chosen = [];
const fallbacks = [];
const missing = [];

for (const county of REPRESENTATIVE_COUNTIES) {
  const label = `${county.state}/${county.county.padEnd(11)} (${county.region.padEnd(13)})`;
  const result = await fetchClosestElevator(county);

  if (result.error) {
    console.log(`${label} ✗ ${result.error}`);
    missing.push(county);
  } else if (result.both) {
    const e = result.both;
    chosen.push({ ...e, match_type: 'corn_and_soy' });
    console.log(`${label} ✓ ${e.elevator_name} / ${e.company || '(no company)'} — ${e.distance_text} [corn+soy]  (${result.total} total returned)`);
  } else if (result.cornOnly || result.soyOnly) {
    const fallback = result.cornOnly || result.soyOnly;
    const tag = result.cornOnly ? 'corn-only' : 'soy-only';
    fallbacks.push({ ...fallback, match_type: tag.replace('-', '_') });
    console.log(`${label} ◇ ${fallback.elevator_name} / ${fallback.company || '(no company)'} — ${fallback.distance_text} [${tag} fallback]  (${result.total} total returned)`);
  } else {
    console.log(`${label} ✗ no usable elevator  (${result.total} total returned)`);
    missing.push(county);
  }

  await new Promise(r => setTimeout(r, 250));
}

const allElevators = [...chosen, ...fallbacks];
writeFileSync('scripts/representative-elevators.json', JSON.stringify(allElevators, null, 2));

console.log(`\n${'═'.repeat(80)}`);
console.log(`Corn+soy elevators (ideal):  ${chosen.length} / ${REPRESENTATIVE_COUNTIES.length}`);
console.log(`Single-commodity fallbacks:  ${fallbacks.length}`);
console.log(`Missing (no data):           ${missing.length}`);
if (missing.length) {
  console.log(`Missing counties: ${missing.map(c => `${c.state}/${c.county}`).join(', ')}`);
}
console.log(`Saved: scripts/representative-elevators.json (${allElevators.length} elevators)`);