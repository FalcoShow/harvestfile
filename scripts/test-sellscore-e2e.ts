import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { getSellScoreForFarm } from '../lib/sellscore/data-fetcher';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BARCHART_API_KEY = process.env.BARCHART_API_KEY;

if (!SUPABASE_URL) { console.error('SUPABASE URL missing'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }
if (!BARCHART_API_KEY) { console.error('BARCHART_API_KEY missing'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const TEST_FARM_ID = 'cf458f1e-8c11-4628-8918-5b3df94ccfbc';

async function main() {
  const today = new Date();

  console.log('═'.repeat(70));
  console.log('Sell Score E2E — real farm, DB basis history, live Barchart bid');
  console.log('═'.repeat(70));
  console.log(`Farm ID:  ${TEST_FARM_ID}`);
  console.log(`Date:     ${today.toISOString().slice(0, 10)}`);
  console.log('');

  let pass = 0;
  let fail = 0;

  for (const crop of ['corn', 'soybeans'] as const) {
    console.log('─'.repeat(70));
    console.log(`${crop.toUpperCase()}`);
    console.log('─'.repeat(70));

    try {
      const start = Date.now();
      const result = await getSellScoreForFarm(supabase, TEST_FARM_ID, crop, today, BARCHART_API_KEY!);
      const elapsed = Date.now() - start;

      const r = result.recommendation;
      const m = result.meta;

      console.log(`Elevator:          ${m.elevatorName} / ${m.elevatorCity}, locationId ${m.elevatorId}`);
      console.log(`County:            ${m.countyFips}`);
      console.log(`Basis data as of:  ${m.basisDataAsOf}  (${m.historicalSampleSize} historical observations)`);
      console.log('');
      console.log(`Sell Score:        $${r.scoreDollarsPerAcre.toFixed(2)}/acre`);
      console.log(`Action:            ${r.rationale.action}`);
      console.log(`Recommended:       ${r.recommendedBushels.toLocaleString()} bu`);
      console.log('');
      console.log(`Headline:`);
      console.log(`  "${r.rationale.headline}"`);
      console.log(`Summary:`);
      console.log(`  "${r.rationale.signalSummary}"`);
      console.log('');
      console.log(`Pace:              ${r.currentPctSold.toFixed(1)}% sold, target ${r.targetPctSold.toFixed(1)}%`);
      console.log(`Margin signal:     ${r.signals.margin.level}  (cash $${r.signals.margin.cashBid.toFixed(2)}, BE $${r.signals.margin.breakeven.toFixed(2)})`);
      console.log(`Basis signal:      ${r.signals.basis.level}  (today $${r.signals.basis.todayBasis.toFixed(2)}, ${r.signals.basis.percentileRank.toFixed(0)}th pctl, ${r.signals.basis.historicalSampleSize} obs)`);
      console.log(`Pace signal:       ${r.signals.pace.level}  (gap ${r.signals.pace.gap.toFixed(1)}pp)`);
      console.log('');
      console.log(`Margin detail:`);
      console.log(`  ${r.rationale.details.margin}`);
      console.log(`Basis detail:`);
      console.log(`  ${r.rationale.details.basis}`);
      console.log(`Pace detail:`);
      console.log(`  ${r.rationale.details.pace}`);
      console.log('');
      console.log(`(Computed in ${elapsed}ms)`);
      pass++;
    } catch (e: any) {
      console.error(`✗ ${crop} failed: ${e.message}`);
      fail++;
    }
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log(`E2E test complete: ${pass} passed, ${fail} failed`);
  console.log('═'.repeat(70));
}

main().catch((e) => {
  console.error('Fatal error in main():', e);
  process.exit(1);
});