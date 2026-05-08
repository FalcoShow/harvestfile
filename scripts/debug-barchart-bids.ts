import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  try {
    const content = readFileSync('.env.local', 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) {
        let [, key, val] = m;
        val = val.trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (e: any) { console.warn(`Could not load .env.local: ${e.message}`); }
}
loadEnvLocal();

const API_KEY = process.env.BARCHART_API_KEY;
if (!API_KEY) {
  console.error('BARCHART_API_KEY missing');
  process.exit(1);
}

async function main() {
  const url = new URL('https://ondemand.websol.barchart.com/getGrainBids.json');
  url.searchParams.set('apikey', API_KEY!);
  url.searchParams.set('latitude', '41.8145');     // River Valley DeWitt
  url.searchParams.set('longitude', '-90.53776');
  url.searchParams.set('totalLocations', '25');
  url.searchParams.set('bidsPerCom', '5');

  console.log(`Fetching live bids around DeWitt IA (lat 41.8145, lng -90.53776)...\n`);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    return;
  }

  const data = await res.json();
  const dewitt = (data.results || []).find((r: any) => String(r.locationId) === '55552');

  if (!dewitt) {
    console.log('DeWitt (locationId 55552) not found in response.');
    console.log('First 10 locationIds returned:');
    for (const r of (data.results || []).slice(0, 10)) {
      console.log(`  ${r.locationId} ${r.location} / ${r.company}`);
    }
    return;
  }

  console.log(`Elevator: ${dewitt.location} / ${dewitt.company}`);
  console.log(`Total bids returned: ${(dewitt.bids || []).length}`);
  console.log('');

  const bids = dewitt.bids || [];
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    console.log(`─── Bid ${i + 1} ───`);
    for (const [k, v] of Object.entries(bid)) {
      console.log(`  ${k.padEnd(25)}: ${JSON.stringify(v)}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});