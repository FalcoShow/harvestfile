// =============================================================================
// HarvestFile — Build 4 Deploy 1: Seed Missing Counties
// scripts/seed-counties.ts
//
// Fills in the ~787 US counties missing from the Supabase `counties` table.
// Fetches all 3,143 county-equivalents from the Census Bureau API (no key needed),
// cross-references against existing Supabase data, and inserts only what's missing.
//
// Run: npx tsx --env-file=.env.local scripts/seed-counties.ts
// =============================================================================

import { createClient } from '@supabase/supabase-js'

// ── Supabase client with service role (bypasses RLS) ────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure .env.local has both variables set.')
  console.error('Find your service role key in Supabase Dashboard → Settings → API → service_role')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── State FIPS → Name/Abbreviation Mapping ──────────────────────────────────
const STATE_FIPS: Record<string, { name: string; abbr: string }> = {
  '01': { name: 'Alabama', abbr: 'AL' },
  '02': { name: 'Alaska', abbr: 'AK' },
  '04': { name: 'Arizona', abbr: 'AZ' },
  '05': { name: 'Arkansas', abbr: 'AR' },
  '06': { name: 'California', abbr: 'CA' },
  '08': { name: 'Colorado', abbr: 'CO' },
  '09': { name: 'Connecticut', abbr: 'CT' },
  '10': { name: 'Delaware', abbr: 'DE' },
  '11': { name: 'District of Columbia', abbr: 'DC' },
  '12': { name: 'Florida', abbr: 'FL' },
  '13': { name: 'Georgia', abbr: 'GA' },
  '15': { name: 'Hawaii', abbr: 'HI' },
  '16': { name: 'Idaho', abbr: 'ID' },
  '17': { name: 'Illinois', abbr: 'IL' },
  '18': { name: 'Indiana', abbr: 'IN' },
  '19': { name: 'Iowa', abbr: 'IA' },
  '20': { name: 'Kansas', abbr: 'KS' },
  '21': { name: 'Kentucky', abbr: 'KY' },
  '22': { name: 'Louisiana', abbr: 'LA' },
  '23': { name: 'Maine', abbr: 'ME' },
  '24': { name: 'Maryland', abbr: 'MD' },
  '25': { name: 'Massachusetts', abbr: 'MA' },
  '26': { name: 'Michigan', abbr: 'MI' },
  '27': { name: 'Minnesota', abbr: 'MN' },
  '28': { name: 'Mississippi', abbr: 'MS' },
  '29': { name: 'Missouri', abbr: 'MO' },
  '30': { name: 'Montana', abbr: 'MT' },
  '31': { name: 'Nebraska', abbr: 'NE' },
  '32': { name: 'Nevada', abbr: 'NV' },
  '33': { name: 'New Hampshire', abbr: 'NH' },
  '34': { name: 'New Jersey', abbr: 'NJ' },
  '35': { name: 'New Mexico', abbr: 'NM' },
  '36': { name: 'New York', abbr: 'NY' },
  '37': { name: 'North Carolina', abbr: 'NC' },
  '38': { name: 'North Dakota', abbr: 'ND' },
  '39': { name: 'Ohio', abbr: 'OH' },
  '40': { name: 'Oklahoma', abbr: 'OK' },
  '41': { name: 'Oregon', abbr: 'OR' },
  '42': { name: 'Pennsylvania', abbr: 'PA' },
  '44': { name: 'Rhode Island', abbr: 'RI' },
  '45': { name: 'South Carolina', abbr: 'SC' },
  '46': { name: 'South Dakota', abbr: 'SD' },
  '47': { name: 'Tennessee', abbr: 'TN' },
  '48': { name: 'Texas', abbr: 'TX' },
  '49': { name: 'Utah', abbr: 'UT' },
  '50': { name: 'Vermont', abbr: 'VT' },
  '51': { name: 'Virginia', abbr: 'VA' },
  '53': { name: 'Washington', abbr: 'WA' },
  '54': { name: 'West Virginia', abbr: 'WV' },
  '55': { name: 'Wisconsin', abbr: 'WI' },
  '56': { name: 'Wyoming', abbr: 'WY' },
  // Territories (included for completeness, Census API returns them)
  '60': { name: 'American Samoa', abbr: 'AS' },
  '66': { name: 'Guam', abbr: 'GU' },
  '69': { name: 'Northern Mariana Islands', abbr: 'MP' },
  '72': { name: 'Puerto Rico', abbr: 'PR' },
  '78': { name: 'U.S. Virgin Islands', abbr: 'VI' },
}

// Only seed counties for the 50 states + DC (not territories)
const VALID_STATE_FIPS = new Set([
  '01','02','04','05','06','08','09','10','11','12','13','15','16','17','18','19',
  '20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35',
  '36','37','38','39','40','41','42','44','45','46','47','48','49','50','51','53',
  '54','55','56',
])

// ── Slug generation (matches ElectionMap getCountySlug logic) ────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== HarvestFile County Seed Script ===\n')

  // 1. Fetch all counties from Census Bureau API
  console.log('Fetching all US counties from Census Bureau API...')
  const censusUrl = 'https://api.census.gov/data/2020/dec/pl?get=NAME&for=county:*'

  let censusData: string[][]
  try {
    const res = await fetch(censusUrl)
    if (!res.ok) throw new Error(`Census API returned ${res.status}`)
    censusData = await res.json()
  } catch (err) {
    console.error('Failed to fetch Census Bureau data:', err)
    console.error('\nFallback: Try the ACS endpoint instead...')
    try {
      const res2 = await fetch('https://api.census.gov/data/2023/acs/acs5?get=NAME&for=county:*')
      if (!res2.ok) throw new Error(`ACS API returned ${res2.status}`)
      censusData = await res2.json()
    } catch (err2) {
      console.error('Both Census endpoints failed:', err2)
      process.exit(1)
    }
  }

  const [headers, ...rows] = censusData
  console.log(`Census returned ${rows.length} county-equivalents\n`)

  // 2. Filter to 50 states + DC only
  const usCounties = rows.filter(([_, stateFips]) => VALID_STATE_FIPS.has(stateFips))
  console.log(`${usCounties.length} counties in 50 states + DC`)

  // 3. Get existing counties from Supabase (paginate past 1000-row limit)
  console.log('Fetching existing counties from Supabase...')
  const existing = new Set<string>()
  let page = 0
  while (true) {
    const { data: batch, error } = await supabase
      .from('counties')
      .select('county_fips')
      .range(page * 1000, (page + 1) * 1000 - 1)

    if (error) {
      console.error('Supabase fetch error:', error)
      process.exit(1)
    }
    if (!batch || batch.length === 0) break
    batch.forEach((r: any) => existing.add(r.county_fips))
    if (batch.length < 1000) break
    page++
  }
  console.log(`${existing.size} counties already in Supabase\n`)

  // 4. Build insert list for missing counties
  const toInsert: Array<{
    county_fips: string
    state_fips: string
    name: string
    display_name: string
    slug: string
    has_arc_plc_data: boolean
  }> = []

  for (const [fullName, stateFips, countyFipsShort] of usCounties) {
    const fips = `${stateFips}${countyFipsShort}`
    if (existing.has(fips)) continue

    // Census returns "County Name, State Name" — split on last comma
    const commaIdx = fullName.lastIndexOf(', ')
    const countyName = commaIdx > 0 ? fullName.substring(0, commaIdx) : fullName
    const slug = toSlug(countyName)

    toInsert.push({
      county_fips: fips,
      state_fips: stateFips,
      name: countyName,
      display_name: countyName,
      slug: slug,
      has_arc_plc_data: false,
    })
  }

  console.log(`${toInsert.length} counties to insert\n`)

  if (toInsert.length === 0) {
    console.log('All counties already seeded. Nothing to do.')
    return
  }

  // 5. Show preview
  console.log('Preview (first 10):')
  toInsert.slice(0, 10).forEach((c) => {
    const stateInfo = STATE_FIPS[c.state_fips]
    console.log(`  ${c.county_fips} | ${c.display_name}, ${stateInfo?.abbr || c.state_fips} | slug: ${c.slug}`)
  })
  console.log(`  ... and ${Math.max(0, toInsert.length - 10)} more\n`)

  // 6. Batch insert (500 at a time to stay under Supabase limits)
  let inserted = 0
  let errors = 0

  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500)
    const batchNum = Math.floor(i / 500) + 1
    const totalBatches = Math.ceil(toInsert.length / 500)

    const { error } = await supabase
      .from('counties')
      .upsert(batch, { onConflict: 'county_fips' })

    if (error) {
      console.error(`Batch ${batchNum}/${totalBatches} FAILED:`, error.message)
      errors++
    } else {
      inserted += batch.length
      console.log(`Batch ${batchNum}/${totalBatches}: ${batch.length} counties inserted`)
    }
  }

  // 7. Verify final count
  const { count } = await supabase
    .from('counties')
    .select('*', { count: 'exact', head: true })

  console.log(`\n=== RESULTS ===`)
  console.log(`Inserted: ${inserted} counties`)
  console.log(`Errors: ${errors}`)
  console.log(`Total counties in table: ${count}`)
  console.log(`\nExpected: ~3,143 counties (50 states + DC)`)

  if (errors > 0) {
    console.log('\nSome batches failed. Check Supabase logs for details.')
    console.log('You can safely re-run this script — it uses upsert (won\'t duplicate).')
  } else {
    console.log('\nAll counties seeded successfully.')
    console.log('The Election Map will now show proper names for every US county.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
