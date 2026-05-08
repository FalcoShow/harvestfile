// scripts/explore-elevators.mjs
// Confirm whether production-shown data is live or cached.
// Stutsman County, ND just showed 7 elevators on the production page.
// If the API returns 0 for this same FIPS, production is serving CDN cache.

const API_KEY = process.env.BARCHART_API_KEY;
if (!API_KEY) {
  console.error('BARCHART_API_KEY not set.');
  process.exit(1);
}

const BASE_URL = 'https://ondemand.websol.barchart.com/getGrainBids.json';

async function callMethod(label, params) {
  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  console.log('═'.repeat(110));
  console.log(`Method: ${label}`);

  const startedAt = Date.now();
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  const elapsedMs = Date.now() - startedAt;

  console.log(`Result: HTTP ${res.status} ${res.statusText}  (${elapsedMs}ms)`);

  if (!res.ok) {
    console.log('Body:', await res.text());
    console.log('');
    return 0;
  }

  const data = await res.json();
  const locations = (data.results || []).length;
  console.log(`Status: ${data.status?.code} - ${data.status?.message}`);
  console.log(`Locations returned: ${locations}`);

  if (locations > 0) {
    const first = data.results[0];
    console.log(`First location: ${first.company} in ${first.city}, ${first.state}`);
  }
  console.log('');
  return locations;
}

console.log('Testing Stutsman County, ND (FIPS 38093) — production page currently shows 7 elevators');
console.log('');

const fipsResult = await callMethod('FIPS 38093 (Stutsman County, ND)', {
  fipsCode: '38093',
  commodityName: 'Corn|Soybeans',
  totalLocations: '20',
  bidsPerCom: '3',
  numOfDecimals: '2',
});

const coordsResult = await callMethod('Coords 47.000/-98.700 (Jamestown, ND)', {
  latitude: '47.000',
  longitude: '-98.700',
  maxDistance: '50',
  commodityName: 'Corn|Soybeans',
  totalLocations: '20',
  bidsPerCom: '3',
  numOfDecimals: '2',
});

console.log('═'.repeat(110));
console.log('Diagnosis:');
if (fipsResult > 0 || coordsResult > 0) {
  console.log('  API IS returning data for some counties.');
  console.log('  Earlier 204s may be coverage gaps in the sandbox, not a global outage.');
} else {
  console.log('  API returns 0 for the SAME county whose production page shows 7 elevators.');
  console.log('  Production is serving cached HTML, not live API responses.');
  console.log('  The API itself is currently empty across all tested locations.');
}