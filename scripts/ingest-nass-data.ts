/**
 * HarvestFile: NASS Data Ingestion Script
 * Phase 1 Build 2B - County Profile Data Pipeline
 * 
 * Pulls county-level agricultural data from USDA NASS Quick Stats API
 * and inserts into the county_profiles Supabase table.
 * 
 * Data sourced:
 * - Census of Agriculture 2022: farm count, acreage, demographics
 * - Annual Survey: crop yields, planted/harvested acres, production
 * - 10-year yield history for top crops
 * 
 * Usage: npx tsx scripts/ingest-nass-data.ts
 * Requires: NASS_API_KEY and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================
// Configuration
// ============================================================

const NASS_API_KEY = process.env.NASS_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fzduyjxjdcxbdwjlwrpu.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!NASS_API_KEY) throw new Error('NASS_API_KEY is required')
if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const NASS_BASE = 'https://quickstats.nass.usda.gov/api/api_GET/'
const DELAY_MS = 1500 // Delay between API calls to avoid throttling

// ARC/PLC covered commodities
const COVERED_COMMODITIES = [
  'CORN', 'SOYBEANS', 'WHEAT', 'RICE', 'BARLEY', 'OATS', 'SORGHUM',
  'PEANUTS', 'SUNFLOWER', 'CANOLA', 'SAFFLOWER', 'FLAXSEED',
  'MUSTARD SEED', 'RAPESEED', 'SESAME', 'CRAMBE'
]

// Major crops we'll track yield history for (top 7 by US acreage)
const MAJOR_CROPS = ['CORN', 'SOYBEANS', 'WHEAT', 'RICE', 'BARLEY', 'OATS', 'SORGHUM']

// State FIPS to name/abbr mapping
const STATE_LOOKUP: Record<string, { name: string; abbr: string; slug: string }> = {
  '01': { name: 'Alabama', abbr: 'AL', slug: 'alabama' },
  '02': { name: 'Alaska', abbr: 'AK', slug: 'alaska' },
  '04': { name: 'Arizona', abbr: 'AZ', slug: 'arizona' },
  '05': { name: 'Arkansas', abbr: 'AR', slug: 'arkansas' },
  '06': { name: 'California', abbr: 'CA', slug: 'california' },
  '08': { name: 'Colorado', abbr: 'CO', slug: 'colorado' },
  '09': { name: 'Connecticut', abbr: 'CT', slug: 'connecticut' },
  '10': { name: 'Delaware', abbr: 'DE', slug: 'delaware' },
  '12': { name: 'Florida', abbr: 'FL', slug: 'florida' },
  '13': { name: 'Georgia', abbr: 'GA', slug: 'georgia' },
  '15': { name: 'Hawaii', abbr: 'HI', slug: 'hawaii' },
  '16': { name: 'Idaho', abbr: 'ID', slug: 'idaho' },
  '17': { name: 'Illinois', abbr: 'IL', slug: 'illinois' },
  '18': { name: 'Indiana', abbr: 'IN', slug: 'indiana' },
  '19': { name: 'Iowa', abbr: 'IA', slug: 'iowa' },
  '20': { name: 'Kansas', abbr: 'KS', slug: 'kansas' },
  '21': { name: 'Kentucky', abbr: 'KY', slug: 'kentucky' },
  '22': { name: 'Louisiana', abbr: 'LA', slug: 'louisiana' },
  '23': { name: 'Maine', abbr: 'ME', slug: 'maine' },
  '24': { name: 'Maryland', abbr: 'MD', slug: 'maryland' },
  '25': { name: 'Massachusetts', abbr: 'MA', slug: 'massachusetts' },
  '26': { name: 'Michigan', abbr: 'MI', slug: 'michigan' },
  '27': { name: 'Minnesota', abbr: 'MN', slug: 'minnesota' },
  '28': { name: 'Mississippi', abbr: 'MS', slug: 'mississippi' },
  '29': { name: 'Missouri', abbr: 'MO', slug: 'missouri' },
  '30': { name: 'Montana', abbr: 'MT', slug: 'montana' },
  '31': { name: 'Nebraska', abbr: 'NE', slug: 'nebraska' },
  '32': { name: 'Nevada', abbr: 'NV', slug: 'nevada' },
  '33': { name: 'New Hampshire', abbr: 'NH', slug: 'new-hampshire' },
  '34': { name: 'New Jersey', abbr: 'NJ', slug: 'new-jersey' },
  '35': { name: 'New Mexico', abbr: 'NM', slug: 'new-mexico' },
  '36': { name: 'New York', abbr: 'NY', slug: 'new-york' },
  '37': { name: 'North Carolina', abbr: 'NC', slug: 'north-carolina' },
  '38': { name: 'North Dakota', abbr: 'ND', slug: 'north-dakota' },
  '39': { name: 'Ohio', abbr: 'OH', slug: 'ohio' },
  '40': { name: 'Oklahoma', abbr: 'OK', slug: 'oklahoma' },
  '41': { name: 'Oregon', abbr: 'OR', slug: 'oregon' },
  '42': { name: 'Pennsylvania', abbr: 'PA', slug: 'pennsylvania' },
  '44': { name: 'Rhode Island', abbr: 'RI', slug: 'rhode-island' },
  '45': { name: 'South Carolina', abbr: 'SC', slug: 'south-carolina' },
  '46': { name: 'South Dakota', abbr: 'SD', slug: 'south-dakota' },
  '47': { name: 'Tennessee', abbr: 'TN', slug: 'tennessee' },
  '48': { name: 'Texas', abbr: 'TX', slug: 'texas' },
  '49': { name: 'Utah', abbr: 'UT', slug: 'utah' },
  '50': { name: 'Vermont', abbr: 'VT', slug: 'vermont' },
  '51': { name: 'Virginia', abbr: 'VA', slug: 'virginia' },
  '53': { name: 'Washington', abbr: 'WA', slug: 'washington' },
  '54': { name: 'West Virginia', abbr: 'WV', slug: 'west-virginia' },
  '55': { name: 'Wisconsin', abbr: 'WI', slug: 'wisconsin' },
  '56': { name: 'Wyoming', abbr: 'WY', slug: 'wyoming' },
}

// ============================================================
// Utility Functions
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseNumeric(val: string | undefined | null): number | null {
  if (!val || val === '(D)' || val === '(Z)' || val === '(NA)' || val === '') return null
  const cleaned = val.replace(/,/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

async function nassQuery(params: Record<string, string>): Promise<any[]> {
  const url = new URL(NASS_BASE)
  url.searchParams.set('key', NASS_API_KEY!)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      console.error(`NASS API error: ${res.status} ${res.statusText}`)
      return []
    }
    const data = await res.json()
    return data.data || []
  } catch (err) {
    console.error('NASS API fetch error:', err)
    return []
  }
}

// ============================================================
// Step 1: Seed counties from NASS Census
// ============================================================

async function seedCounties(): Promise<void> {
  console.log('\n📍 Step 1: Seeding county records from NASS Census of Agriculture...')
  
  const pipelineRun = await startPipelineRun('nass-seed')
  let totalProcessed = 0

  for (const [stateFips, stateInfo] of Object.entries(STATE_LOOKUP)) {
    console.log(`  Fetching counties for ${stateInfo.name}...`)
    
    // Get farm count data for all counties in this state
    // This also gives us the county names and FIPS codes
    const data = await nassQuery({
      source_desc: 'CENSUS',
      sector_desc: 'ECONOMICS',
      group_desc: 'FARMS & LAND & ASSETS',
      commodity_desc: 'FARM OPERATIONS',
      statisticcat_desc: 'OPERATIONS',
      short_desc: 'FARM OPERATIONS - NUMBER OF OPERATIONS',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2022',
    })
    
    if (data.length === 0) {
      console.log(`    No data for ${stateInfo.name}, trying 2017...`)
      // Fall back to 2017 Census if 2022 not available
      const data2017 = await nassQuery({
        source_desc: 'CENSUS',
        sector_desc: 'ECONOMICS',
        group_desc: 'FARMS & LAND & ASSETS',
        commodity_desc: 'FARM OPERATIONS',
        statisticcat_desc: 'OPERATIONS',
        short_desc: 'FARM OPERATIONS - NUMBER OF OPERATIONS',
        agg_level_desc: 'COUNTY',
        state_fips_code: stateFips,
        year: '2017',
      })
      if (data2017.length > 0) {
        await processCountyBatch(data2017, stateInfo, stateFips)
        totalProcessed += data2017.length
      }
    } else {
      await processCountyBatch(data, stateInfo, stateFips)
      totalProcessed += data.length
    }
    
    await sleep(DELAY_MS)
  }

  await completePipelineRun(pipelineRun, totalProcessed)
  console.log(`  ✅ Seeded ${totalProcessed} county records`)
}

async function processCountyBatch(
  data: any[], 
  stateInfo: { name: string; abbr: string; slug: string },
  stateFips: string
): Promise<void> {
  // NASS returns multiple rows per county (subcategories, domains, etc.)
  // Deduplicate by FIPS code — take the first record per county
  const seen = new Map<string, any>();
  
  for (const d of data) {
    if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue;
    const fips = `${stateFips}${d.county_code}`;
    
    if (!seen.has(fips)) {
      seen.set(fips, {
        fips_code: fips,
        state_fips: stateFips,
        county_fips: d.county_code,
        state_name: stateInfo.name,
        state_abbr: stateInfo.abbr,
        county_name: d.county_name,
        county_slug: toSlug(d.county_name) + '-county',
        state_slug: stateInfo.slug,
        total_farms: parseNumeric(d.Value),
        nass_last_updated: new Date().toISOString(),
      });
    }
  }

  const records = Array.from(seen.values());
  if (records.length === 0) return;

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase
      .from('county_profiles')
      .upsert(batch, { onConflict: 'fips_code' });
    
    if (error) {
      console.error(`    Error upserting batch for ${stateInfo.name}:`, error.message);
    }
  }
  
  console.log(`    ${stateInfo.name}: ${records.length} counties`);
}

// ============================================================
// Step 2: Census of Agriculture enrichment (acreage, demographics)
// ============================================================

async function enrichCensusData(): Promise<void> {
  console.log('\n🌾 Step 2: Enriching with Census of Agriculture data...')
  
  const pipelineRun = await startPipelineRun('nass-census')
  let totalProcessed = 0

  for (const [stateFips, stateInfo] of Object.entries(STATE_LOOKUP)) {
    console.log(`  ${stateInfo.name}...`)
    
    // Total farmland acres
    const farmlandData = await nassQuery({
      source_desc: 'CENSUS',
      sector_desc: 'ECONOMICS',
      group_desc: 'FARMS & LAND & ASSETS',
      commodity_desc: 'FARM OPERATIONS',
      short_desc: 'FARM OPERATIONS - ACRES OPERATED',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2022',
    })
    
    await sleep(DELAY_MS)
    
    // Average farm size
    const avgSizeData = await nassQuery({
      source_desc: 'CENSUS',
      sector_desc: 'ECONOMICS',
      group_desc: 'FARMS & LAND & ASSETS',
      commodity_desc: 'FARM OPERATIONS',
      short_desc: 'FARM OPERATIONS - AREA OPERATED, MEASURED IN ACRES / OPERATION',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2022',
    })
    
    await sleep(DELAY_MS)
    
    // Cropland acres
    const croplandData = await nassQuery({
      source_desc: 'CENSUS',
      sector_desc: 'ECONOMICS',
      group_desc: 'FARMS & LAND & ASSETS',
      commodity_desc: 'AG LAND',
      statisticcat_desc: 'AREA',
      short_desc: 'AG LAND, CROPLAND - ACRES',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2022',
    })
    
    await sleep(DELAY_MS)

    // Build update map by FIPS
    const updates: Record<string, any> = {}
    
    for (const d of farmlandData) {
      if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
      const fips = `${stateFips}${d.county_code}`
      if (!updates[fips]) updates[fips] = {}
      updates[fips].total_farmland_acres = parseNumeric(d.Value)
    }
    
    for (const d of avgSizeData) {
      if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
      const fips = `${stateFips}${d.county_code}`
      if (!updates[fips]) updates[fips] = {}
      updates[fips].avg_farm_size_acres = parseNumeric(d.Value)
    }
    
    for (const d of croplandData) {
      if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
      const fips = `${stateFips}${d.county_code}`
      if (!updates[fips]) updates[fips] = {}
      updates[fips].cropland_acres = parseNumeric(d.Value)
    }

    // Apply updates
    for (const [fips, data] of Object.entries(updates)) {
      const { error } = await supabase
        .from('county_profiles')
        .update({ ...data, nass_last_updated: new Date().toISOString() })
        .eq('fips_code', fips)
      
      if (error) {
        console.error(`    Error updating ${fips}:`, error.message)
      }
      totalProcessed++
    }
  }

  await completePipelineRun(pipelineRun, totalProcessed)
  console.log(`  ✅ Enriched ${totalProcessed} counties with census data`)
}

// ============================================================
// Step 3: Crop data (top crops, yields, acreage)
// ============================================================

async function enrichCropData(): Promise<void> {
  console.log('\n🌽 Step 3: Pulling crop data (yields, acreage, production)...')
  
  const pipelineRun = await startPipelineRun('nass-crops')
  let totalProcessed = 0

  for (const [stateFips, stateInfo] of Object.entries(STATE_LOOKUP)) {
    console.log(`  ${stateInfo.name}...`)
    
    // Get all crop data for this state, most recent year
    const cropData = await nassQuery({
      source_desc: 'SURVEY',
      sector_desc: 'CROPS',
      group_desc: 'FIELD CROPS',
      statisticcat_desc: 'AREA HARVESTED',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2024',
    })
    
    await sleep(DELAY_MS)
    
    // Also get yield data
    const yieldData = await nassQuery({
      source_desc: 'SURVEY',
      sector_desc: 'CROPS',
      group_desc: 'FIELD CROPS',
      statisticcat_desc: 'YIELD',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2024',
    })
    
    await sleep(DELAY_MS)

    // Also get production data
    const prodData = await nassQuery({
      source_desc: 'SURVEY',
      sector_desc: 'CROPS',
      group_desc: 'FIELD CROPS',
      statisticcat_desc: 'PRODUCTION',
      agg_level_desc: 'COUNTY',
      state_fips_code: stateFips,
      year: '2024',
    })
    
    await sleep(DELAY_MS)

    // Also get state-level averages for comparison
    const stateYields = await nassQuery({
      source_desc: 'SURVEY',
      sector_desc: 'CROPS',
      group_desc: 'FIELD CROPS',
      statisticcat_desc: 'YIELD',
      agg_level_desc: 'STATE',
      state_fips_code: stateFips,
      year: '2024',
    })
    
    await sleep(DELAY_MS)

    // Build state averages
    const stateAvgs: Record<string, any> = {}
    for (const d of stateYields) {
      const crop = d.commodity_desc
      if (COVERED_COMMODITIES.includes(crop)) {
        stateAvgs[crop] = {
          yield: parseNumeric(d.Value),
          unit: d.unit_desc,
        }
      }
    }

    // Aggregate by county
    const countyData: Record<string, any[]> = {}
    
    // Process harvested acres
    for (const d of cropData) {
      if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
      const fips = `${stateFips}${d.county_code}`
      const crop = d.commodity_desc
      if (!COVERED_COMMODITIES.includes(crop)) continue
      
      if (!countyData[fips]) countyData[fips] = []
      
      // Find existing crop entry or create new one
      let entry = countyData[fips].find(c => c.crop === crop)
      if (!entry) {
        entry = { crop, year: 2024 }
        countyData[fips].push(entry)
      }
      entry.harvested_acres = parseNumeric(d.Value)
    }
    
    // Add yield data
    for (const d of yieldData) {
      if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
      const fips = `${stateFips}${d.county_code}`
      const crop = d.commodity_desc
      if (!COVERED_COMMODITIES.includes(crop)) continue
      
      if (!countyData[fips]) countyData[fips] = []
      let entry = countyData[fips].find(c => c.crop === crop)
      if (!entry) {
        entry = { crop, year: 2024 }
        countyData[fips].push(entry)
      }
      entry.yield = parseNumeric(d.Value)
      entry.yield_unit = d.unit_desc
    }
    
    // Add production data
    for (const d of prodData) {
      if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
      const fips = `${stateFips}${d.county_code}`
      const crop = d.commodity_desc
      if (!COVERED_COMMODITIES.includes(crop)) continue
      
      if (!countyData[fips]) countyData[fips] = []
      let entry = countyData[fips].find(c => c.crop === crop)
      if (!entry) {
        entry = { crop, year: 2024 }
        countyData[fips].push(entry)
      }
      entry.production = parseNumeric(d.Value)
    }

    // Sort each county's crops by harvested_acres descending, take top 5
    for (const [fips, crops] of Object.entries(countyData)) {
      const sorted = crops
        .filter(c => c.harvested_acres && c.harvested_acres > 0)
        .sort((a, b) => (b.harvested_acres || 0) - (a.harvested_acres || 0))
        .slice(0, 5)
      
      const { error } = await supabase
        .from('county_profiles')
        .update({ 
          top_crops: sorted,
          state_averages: stateAvgs,
          nass_last_updated: new Date().toISOString(),
        })
        .eq('fips_code', fips)
      
      if (error) {
        console.error(`    Error updating crops for ${fips}:`, error.message)
      }
      totalProcessed++
    }
  }

  await completePipelineRun(pipelineRun, totalProcessed)
  console.log(`  ✅ Enriched ${totalProcessed} counties with crop data`)
}

// ============================================================
// Step 4: 10-year yield history for major crops
// ============================================================

async function enrichYieldHistory(): Promise<void> {
  console.log('\n📈 Step 4: Building 10-year yield history...')
  
  const pipelineRun = await startPipelineRun('nass-yield-history')
  let totalProcessed = 0
  const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024']

  for (const crop of MAJOR_CROPS) {
    console.log(`  ${crop}...`)
    
    for (const [stateFips, stateInfo] of Object.entries(STATE_LOOKUP)) {
      // Pull all years at once for this state + crop
      const data = await nassQuery({
        source_desc: 'SURVEY',
        sector_desc: 'CROPS',
        group_desc: 'FIELD CROPS',
        commodity_desc: crop,
        statisticcat_desc: 'YIELD',
        agg_level_desc: 'COUNTY',
        state_fips_code: stateFips,
        year__GE: '2015',
        year__LE: '2024',
      })
      
      if (data.length === 0) {
        await sleep(500)
        continue
      }
      
      // Group by county
      const countyYields: Record<string, { year: number; yield: number }[]> = {}
      for (const d of data) {
        if (!d.county_code || d.county_code === '998' || d.county_code === '999') continue
        const fips = `${stateFips}${d.county_code}`
        const yieldVal = parseNumeric(d.Value)
        if (yieldVal === null) continue
        
        if (!countyYields[fips]) countyYields[fips] = []
        countyYields[fips].push({
          year: parseInt(d.year),
          yield: yieldVal,
        })
      }
      
      // Update each county's yield_history JSONB
      for (const [fips, yields] of Object.entries(countyYields)) {
        // Get existing yield_history
        const { data: existing } = await supabase
          .from('county_profiles')
          .select('yield_history')
          .eq('fips_code', fips)
          .single()
        
        const history = existing?.yield_history || {}
        history[crop] = yields.sort((a, b) => a.year - b.year)
        
        const { error } = await supabase
          .from('county_profiles')
          .update({ yield_history: history })
          .eq('fips_code', fips)
        
        if (error) {
          console.error(`    Error updating yield history for ${fips}:`, error.message)
        }
        totalProcessed++
      }
      
      await sleep(DELAY_MS)
    }
  }

  await completePipelineRun(pipelineRun, totalProcessed)
  console.log(`  ✅ Updated yield history for ${totalProcessed} county-crop combinations`)
}

// ============================================================
// Pipeline tracking helpers
// ============================================================

async function startPipelineRun(source: string): Promise<string> {
  const { data, error } = await supabase
    .from('data_pipeline_runs')
    .insert({ source, status: 'running' })
    .select('id')
    .single()
  
  if (error) {
    console.error('Error starting pipeline run:', error.message)
    return ''
  }
  return data?.id || ''
}

async function completePipelineRun(id: string, processed: number): Promise<void> {
  if (!id) return
  await supabase
    .from('data_pipeline_runs')
    .update({ 
      status: 'completed', 
      counties_processed: processed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
}

// ============================================================
// Main execution
// ============================================================

async function main() {
  console.log('🚜 HarvestFile NASS Data Ingestion Pipeline — YIELD HISTORY RE-RUN')
  console.log('============================================')
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`NASS API Key: ${NASS_API_KEY?.substring(0, 8)}...`)
  console.log()
  
  const startTime = Date.now()
  
  try {
     Steps 1-3 already completed — skip them
     await seedCounties()
     await enrichCensusData()
     await enrichCropData()
    
     Step 4: Re-run yield history with longer delays
    await enrichYieldHistory()
    
    const { count } = await supabase
      .from('county_profiles')
      .select('*', { count: 'exact', head: true })
    
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    
    console.log('\n============================================')
    console.log('✅ Yield history re-run complete!')
    console.log(`  Counties in database: ${count}`)
    console.log(`  Time elapsed: ${elapsed} minutes`)
    console.log('============================================')
    
  } catch (err) {
    console.error('\n❌ Pipeline failed:', err)
    process.exit(1)
  }
}
main()
