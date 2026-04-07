/**
 * HarvestFile: County Data Access Layer
 * 
 * This module provides typed data access for county profile pages.
 * All data comes from the pre-aggregated county_profiles table,
 * meaning each page load is a single Supabase query — no external
 * API calls at render time.
 * 
 * Used by: app/(marketing)/[state]/[county]/arc-plc/page.tsx
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use anon key for public reads (RLS allows SELECT for everyone)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// Types
// ============================================================

export interface CropData {
  crop: string
  planted_acres?: number
  harvested_acres?: number
  yield?: number
  yield_unit?: string
  production?: number
  year: number
}

export interface YieldHistoryEntry {
  year: number
  yield: number
}

export interface NeighboringCounty {
  fips: string
  name: string
  state: string
  slug: string
  state_slug: string
}

export interface CropInsuranceData {
  loss_ratio?: number
  total_premium?: number
  total_indemnity?: number
  policies_earning_premium?: number
  top_causes?: Array<{ cause: string; pct: number }>
}

export interface ArcBenchmarkEntry {
  benchmark_yield?: number
  benchmark_revenue?: number
  trend_yield_factor?: number
  effective_ref_price?: number
  guarantee_90pct?: number
}

export interface PlcDataEntry {
  plc_yield?: number
  ref_price?: number
  eff_ref_price?: number
}

export interface PaymentHistoryEntry {
  year: number
  arc_payment: number
  plc_payment: number
}

export interface ElectionStatsEntry {
  arc_co_pct?: number
  plc_pct?: number
  total_base_acres?: number
}

export interface ArcPlcRecommendation {
  recommendation?: string
  confidence?: string
  reasoning?: string
  projected_arc_payment?: number
  projected_plc_payment?: number
}

export interface CountyProfile {
  id: string
  fips_code: string
  state_fips: string
  county_fips: string
  state_name: string
  state_abbr: string
  county_name: string
  county_slug: string
  state_slug: string
  latitude?: number
  longitude?: number
  
  // Census data
  total_farms?: number
  total_farmland_acres?: number
  avg_farm_size_acres?: number
  market_value_products?: number
  cropland_acres?: number
  irrigated_acres?: number
  avg_operator_age?: number
  beginning_farmers_pct?: number
  female_operators_pct?: number
  
  // Crop data
  top_crops: CropData[]
  yield_history: Record<string, YieldHistoryEntry[]>
  state_averages: Record<string, { yield?: number; unit?: string; planted_acres?: number }>
  
  // ARC/PLC data
  arc_benchmark_data: Record<string, ArcBenchmarkEntry>
  plc_data: Record<string, PlcDataEntry>
  payment_history: Record<string, PaymentHistoryEntry[]>
  election_stats: Record<string, ElectionStatsEntry>
  enrolled_acres: { arc_co_acres?: number; plc_acres?: number; arc_ic_acres?: number }
  
  // Soil data
  prime_farmland_pct?: number
  soil_types: Array<{ name: string; pct: number; rating: string }>
  
  // Climate data
  avg_annual_temp_f?: number
  avg_annual_precip_in?: number
  growing_season_days?: number
  monthly_climate: Array<{ month: string; avg_temp: number; avg_precip: number }>
  
  // Insurance data
  crop_insurance_data: CropInsuranceData
  
  // ERS classifications
  rural_urban_code?: number
  rural_urban_desc?: string
  economic_typology?: string
  is_farming_dependent: boolean
  
  // FSA office
  fsa_office_address?: string
  fsa_office_city?: string
  fsa_office_state?: string
  fsa_office_zip?: string
  fsa_office_phone?: string
  
  // Computed
  arc_plc_recommendation: ArcPlcRecommendation
  neighboring_counties: NeighboringCounty[]
  
  updated_at: string
}

// ============================================================
// Data Fetching Functions
// ============================================================

/**
 * Fetch a single county profile by state and county slug.
 * Used by the county page server component.
 */
export async function getCountyProfile(
  stateSlug: string,
  countySlug: string
): Promise<CountyProfile | null> {
  const { data, error } = await supabase
    .from('county_profiles')
    .select('*')
    .eq('state_slug', stateSlug)
    .eq('county_slug', countySlug)
    .single()

  if (error || !data) return null
  return data as CountyProfile
}

/**
 * Fetch all counties for a state (used by state hub pages).
 */
export async function getStateCounties(stateSlug: string): Promise<CountyProfile[]> {
  const { data, error } = await supabase
    .from('county_profiles')
    .select('fips_code, county_name, county_slug, state_slug, total_farms, total_farmland_acres, top_crops, arc_plc_recommendation')
    .eq('state_slug', stateSlug)
    .order('county_name')

  if (error || !data) return []
  return data as CountyProfile[]
}

/**
 * Fetch all state/county slug combinations for generateStaticParams.
 */
export async function getAllCountySlugs(): Promise<Array<{ state: string; county: string }>> {
  const allSlugs: Array<{ state: string; county: string }> = []
  let page = 0
  const pageSize = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from('county_profiles')
      .select('state_slug, county_slug')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('state_slug')
    
    if (error || !data || data.length === 0) break
    
    for (const row of data) {
      allSlugs.push({ state: row.state_slug, county: row.county_slug })
    }
    
    if (data.length < pageSize) break
    page++
  }
  
  return allSlugs
}

/**
 * Fetch all unique state slugs for state hub generateStaticParams.
 */
export async function getAllStateSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('county_profiles')
    .select('state_slug')
    .order('state_slug')
  
  if (error || !data) return []
  
  // Deduplicate
  const unique = Array.from(new Set(data.map(d => d.state_slug)))
  return unique
}

/**
 * Get county count per state (for state hub pages).
 */
export async function getStateSummary(stateSlug: string): Promise<{
  stateName: string
  stateAbbr: string
  countyCount: number
  totalFarms: number
  totalFarmland: number
} | null> {
  const { data, error } = await supabase
    .from('county_profiles')
    .select('state_name, state_abbr, total_farms, total_farmland_acres')
    .eq('state_slug', stateSlug)
  
  if (error || !data || data.length === 0) return null
  
  return {
    stateName: data[0].state_name,
    stateAbbr: data[0].state_abbr,
    countyCount: data.length,
    totalFarms: data.reduce((sum, c) => sum + (c.total_farms || 0), 0),
    totalFarmland: data.reduce((sum, c) => sum + (c.total_farmland_acres || 0), 0),
  }
}

// ============================================================
// Content Generation Helpers
// ============================================================

/**
 * Generate the conditional narrative text for a county page.
 * This produces genuinely different content for each county
 * based on the actual USDA data — not just name swapping.
 */
export function generateCountyNarrative(profile: CountyProfile): string {
  const paragraphs: string[] = []
  const { state_name, state_abbr } = profile
  const county_name = toProperCountyName(profile.county_name)
  
  // Opening paragraph — always unique because data differs
  if (profile.total_farms && profile.total_farmland_acres) {
    const farmSizeDesc = profile.avg_farm_size_acres 
      ? profile.avg_farm_size_acres > 500 ? 'large-scale' 
        : profile.avg_farm_size_acres > 200 ? 'mid-size' 
        : 'small' 
      : ''
    
    paragraphs.push(
      `${county_name}, ${state_name} is home to ${profile.total_farms.toLocaleString()} farms ` +
      `spanning ${profile.total_farmland_acres.toLocaleString()} acres of farmland` +
      (profile.avg_farm_size_acres 
        ? `, with an average ${farmSizeDesc} operation of ${profile.avg_farm_size_acres.toLocaleString()} acres` 
        : '') +
      `. Understanding ARC-CO and PLC program options is critical for ${county_name} producers ` +
      `making their 2026 safety net election under the One Big Beautiful Bill Act (OBBBA).`
    )
  }
  
  // Top crops paragraph
  if (profile.top_crops && profile.top_crops.length > 0) {
    const cropList = profile.top_crops
      .filter(c => c.harvested_acres && c.harvested_acres > 0)
      .slice(0, 3)
      .map(c => {
        const yieldStr = c.yield ? ` with a ${c.yield.toFixed(1)} ${c.yield_unit || 'BU/ACRE'} average yield` : ''
        return `${c.crop.toLowerCase()} (${(c.harvested_acres || 0).toLocaleString()} harvested acres${yieldStr})`
      })
    
    if (cropList.length > 0) {
      paragraphs.push(
        `The leading crops in ${county_name} include ${formatList(cropList)}. ` +
        `These commodities form the foundation of the county's ARC-CO and PLC ` +
        `program elections, with each crop evaluated independently for optimal safety net coverage.`
      )
    }
  }
  
  // Yield comparison paragraph
  if (profile.top_crops?.[0] && profile.state_averages) {
    const topCrop = profile.top_crops[0]
    const stateAvg = profile.state_averages[topCrop.crop]
    
    if (topCrop.yield && stateAvg?.yield) {
      const pctDiff = ((topCrop.yield - stateAvg.yield) / stateAvg.yield * 100).toFixed(1)
      const comparison = parseFloat(pctDiff) > 5 
        ? `${pctDiff}% above the ${state_name} state average of ${stateAvg.yield.toFixed(1)} ${topCrop.yield_unit || 'BU/ACRE'}`
        : parseFloat(pctDiff) < -5
        ? `${Math.abs(parseFloat(pctDiff))}% below the state average of ${stateAvg.yield.toFixed(1)} ${topCrop.yield_unit || 'BU/ACRE'}`
        : `near the state average of ${stateAvg.yield.toFixed(1)} ${topCrop.yield_unit || 'BU/ACRE'}`
      
      paragraphs.push(
        `${county_name}'s ${topCrop.crop.toLowerCase()} yield of ${topCrop.yield.toFixed(1)} ${topCrop.yield_unit || 'BU/ACRE'} is ` +
        `${comparison}. This yield performance directly impacts both ARC-CO benchmark revenue ` +
        `calculations and the likelihood of triggering ARC-CO payments in any given year.`
      )
    }
  }
  
  // ERS classification
  if (profile.is_farming_dependent) {
    paragraphs.push(
      `The USDA Economic Research Service classifies ${county_name} as a farming-dependent county, ` +
      `meaning agriculture is the primary driver of the local economy. Farm program payments through ` +
      `ARC-CO and PLC have an outsized impact on the economic health of farming-dependent communities like ${county_name}.`
    )
  } else if (profile.economic_typology) {
    paragraphs.push(
      `${county_name} is classified by the USDA Economic Research Service as ` +
      `${profile.economic_typology.toLowerCase()}-dependent` +
      (profile.rural_urban_desc ? `, with a ${profile.rural_urban_desc.toLowerCase()} designation` : '') +
      `. Agricultural operations in ${county_name} benefit from both ARC-CO revenue protection and PLC price protection options under the OBBBA.`
    )
  }

  // OBBBA changes paragraph
  paragraphs.push(
    `Under the One Big Beautiful Bill Act (signed July 2025), ${county_name} farmers face a mandatory ` +
    `ARC/PLC election for the 2026 crop year. Key OBBBA changes affecting ${county_name} include ` +
    `higher statutory reference prices (corn $4.10/bu, soybeans $10.00/bu, wheat $6.35/bu), ` +
    `an increased ARC-CO guarantee from 86% to 90% of benchmark revenue, and a higher payment ` +
    `cap of 12% (up from 10%). For 2025 only, farmers automatically receive the higher of ARC-CO or PLC ` +
    `with no election required. The 2026 election deadline has been delayed to mid-2026 while USDA ` +
    `processes 30 million new base acres.`
  )
  
  // Prime farmland
  if (profile.prime_farmland_pct) {
    const quality = profile.prime_farmland_pct > 70 ? 'exceptionally high'
      : profile.prime_farmland_pct > 50 ? 'above average'
      : profile.prime_farmland_pct > 30 ? 'moderate'
      : 'below average'
    
    paragraphs.push(
      `${county_name} has ${quality} soil quality for crop production, with ` +
      `${profile.prime_farmland_pct.toFixed(1)}% of the county designated as prime farmland ` +
      `by the USDA Natural Resources Conservation Service. Soil quality directly influences ` +
      `yield expectations and ARC-CO benchmark yield calculations.`
    )
  }
  
  // Climate
  if (profile.avg_annual_temp_f && profile.avg_annual_precip_in) {
    paragraphs.push(
      `${county_name} receives an average of ${profile.avg_annual_precip_in.toFixed(1)} inches ` +
      `of annual precipitation with an average temperature of ${profile.avg_annual_temp_f.toFixed(1)}°F` +
      (profile.growing_season_days 
        ? ` and a ${profile.growing_season_days}-day growing season` 
        : '') +
      `. Weather variability is a key factor in both ARC-CO payment triggers (when actual county ` +
      `revenue falls below the guarantee) and crop insurance decisions.`
    )
  }
  
  return paragraphs.join('\n\n')
}

/**
 * Generate county-specific FAQ content with real data.
 */
export function generateCountyFAQs(profile: CountyProfile): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = []
  const { state_name } = profile
  const county_name = toProperCountyName(profile.county_name)
  
  // FAQ 1: ARC vs PLC recommendation
  const topCrop = profile.top_crops?.[0]
  if (topCrop) {
    faqs.push({
      question: `Should I choose ARC-CO or PLC for ${topCrop.crop.toLowerCase()} in ${county_name}, ${state_name} for 2026?`,
      answer: profile.arc_plc_recommendation?.reasoning ||
        `The optimal choice between ARC-CO and PLC for ${topCrop.crop.toLowerCase()} in ${county_name} depends on your ` +
        `farm's specific base acres, PLC yield, and risk tolerance. Under the OBBBA, ARC-CO now provides a 90% ` +
        `revenue guarantee (up from 86%), making it more protective in years with moderate revenue declines. ` +
        `PLC triggers when the marketing year average price falls below the effective reference price. ` +
        `Use our free ARC/PLC calculator above to compare projected payments for your specific operation.`
    })
  }
  
  // FAQ 2: Average yield
  if (topCrop?.yield) {
    faqs.push({
      question: `What is the average ${topCrop.crop.toLowerCase()} yield in ${county_name}?`,
      answer: `${county_name}'s average ${topCrop.crop.toLowerCase()} yield is ${topCrop.yield.toFixed(1)} ` +
        `${topCrop.yield_unit || 'BU/ACRE'} based on the most recent USDA NASS survey data` +
        (profile.state_averages?.[topCrop.crop]?.yield 
          ? `, compared to the ${state_name} state average of ${profile.state_averages[topCrop.crop].yield!.toFixed(1)} ${topCrop.yield_unit || 'BU/ACRE'}`
          : '') +
        `. County yield directly affects ARC-CO benchmark calculations and payment triggers.`
    })
  }
  
  // FAQ 3: Number of farms
  if (profile.total_farms) {
    faqs.push({
      question: `How many farms are in ${county_name}, ${state_name}?`,
      answer: `According to the USDA Census of Agriculture, ${county_name} has ${profile.total_farms.toLocaleString()} farms ` +
        (profile.total_farmland_acres 
          ? `covering ${profile.total_farmland_acres.toLocaleString()} acres of farmland` 
          : '') +
        (profile.avg_farm_size_acres 
          ? `, with an average farm size of ${profile.avg_farm_size_acres.toLocaleString()} acres` 
          : '') +
        `.`
    })
  }
  
  // FAQ 4: OBBBA reference prices
  faqs.push({
    question: `What are the new OBBBA reference prices affecting ${county_name} farmers?`,
    answer: `The One Big Beautiful Bill Act (OBBBA) increased statutory reference prices for all covered commodities. ` +
      `Key prices affecting ${county_name} include: corn at $4.10/bu (up from $3.70), soybeans at $10.00/bu ` +
      `(up from $8.40), and wheat at $6.35/bu (up from $5.50). The effective reference price formula now uses ` +
      `88% of the Olympic average (previously 85%), capped at 115% of statutory. For 2025-2026, effective ` +
      `reference prices are even higher: corn $4.42/bu, soybeans $10.44/bu.`
  })
  
  // FAQ 5: Election deadline
  faqs.push({
    question: `When is the 2026 ARC/PLC election deadline for ${county_name}?`,
    answer: `The 2026 ARC/PLC election deadline has been significantly delayed from the original target. ` +
      `USDA FSA must first process 30 million new base acres under the OBBBA before opening the election ` +
      `period. Current estimates place the signup window in mid-to-late 2026. All ${county_name} producers ` +
      `with base acres must make an affirmative election for 2026 — failure to elect results in zero ` +
      `payment for 2026 and a default to the 2025 election for 2027-2031.`
  })
  
  // FAQ 6: Crop insurance
  if (profile.crop_insurance_data?.loss_ratio) {
    const lr = profile.crop_insurance_data.loss_ratio
    const riskLevel = lr > 1.0 ? 'high-risk' : lr > 0.7 ? 'moderate-risk' : 'lower-risk'
    faqs.push({
      question: `What are the biggest crop insurance risks in ${county_name}?`,
      answer: `${county_name} is a ${riskLevel} county for crop insurance with a loss ratio of ` +
        `${lr.toFixed(2)} (a ratio above 1.0 means indemnities exceed premiums)` +
        (profile.crop_insurance_data.top_causes?.length 
          ? `. The leading causes of crop insurance claims are ${profile.crop_insurance_data.top_causes.slice(0, 3).map(c => `${c.cause.toLowerCase()} (${c.pct.toFixed(0)}%)`).join(', ')}`
          : '') +
        `. Under the OBBBA, SCO (Supplemental Coverage Option) is now available with both ARC-CO and PLC elections.`
    })
  }
  
  // FAQ 7: Neighboring counties comparison
  if (profile.neighboring_counties?.length > 0) {
    const neighbors = profile.neighboring_counties.slice(0, 3)
    faqs.push({
      question: `How does ${county_name} compare to neighboring counties for ARC/PLC?`,
      answer: `ARC-CO and PLC calculations vary significantly between counties because they use ` +
        `county-specific benchmark yields and revenue data. Neighboring counties like ` +
        `${neighbors.map(n => toProperCountyName(n.name)).join(', ')} may have different yield histories, different ` +
        `top crops, and different ARC-CO payment likelihoods. Use our county comparison tool to ` +
        `see how ${county_name}'s ARC/PLC projections compare to nearby counties.`
    })
  }
  
  return faqs
}

// ============================================================
// JSON-LD Schema Generation
// ============================================================

export function generateCountyJsonLd(profile: CountyProfile): object {
  const { state_name, state_abbr } = profile
  const county_name = toProperCountyName(profile.county_name)
  
  const schemas: any[] = []
  
  // BreadcrumbList
  schemas.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://harvestfile.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${state_name} ARC/PLC Data`,
        item: `https://harvestfile.com/${profile.state_slug}/arc-plc`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${county_name} ARC/PLC Data`,
        item: `https://harvestfile.com/${profile.state_slug}/${profile.county_slug}/arc-plc`,
      },
    ],
  })
  
  // Place
  if (profile.latitude && profile.longitude) {
    schemas.push({
      '@type': 'Place',
      name: `${county_name}, ${state_abbr}`,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: profile.latitude,
        longitude: profile.longitude,
      },
      containedInPlace: {
        '@type': 'State',
        name: state_name,
      },
    })
  }
  
  // Dataset
  schemas.push({
    '@type': 'Dataset',
    name: `${county_name}, ${state_name} Agricultural Data and ARC/PLC Analysis`,
    description: `County-level agricultural statistics, ARC-CO and PLC program data, crop yields, and farm program election analysis for ${county_name}, ${state_name}.`,
    sourceOrganization: {
      '@type': 'GovernmentOrganization',
      name: 'United States Department of Agriculture',
      url: 'https://www.usda.gov',
    },
    temporalCoverage: '2014/2026',
    spatialCoverage: {
      '@type': 'Place',
      name: `${county_name}, ${state_abbr}`,
      ...(profile.latitude && profile.longitude ? {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: profile.latitude,
          longitude: profile.longitude,
        }
      } : {}),
    },
    license: 'https://www.usda.gov/policies-and-links',
    isAccessibleForFree: true,
  })
  
  // GovernmentService
  schemas.push({
    '@type': 'GovernmentService',
    name: 'USDA ARC-CO and PLC Farm Safety Net Programs',
    serviceType: 'Agricultural Risk Coverage and Price Loss Coverage',
    provider: {
      '@type': 'GovernmentOrganization',
      name: 'USDA Farm Service Agency',
      url: 'https://www.fsa.usda.gov',
    },
    areaServed: {
      '@type': 'Place',
      name: `${county_name}, ${state_abbr}`,
    },
  })
  
  // FAQPage
  const faqs = generateCountyFAQs(profile)
  if (faqs.length > 0) {
    schemas.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }
  
  return {
    '@context': 'https://schema.org',
    '@graph': schemas,
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Convert NASS uppercase county names to proper title case.
 * Handles edge cases: "MC LEAN" → "McLean County", "DE KALB" → "DeKalb County",
 * "ST CLAIR" → "St. Clair County", "O BRIEN" → "O'Brien County".
 * If the name already contains "County", it won't be appended again.
 */
function toProperCountyName(raw: string): string {
  if (!raw) return ''
  
  const trimmed = raw.trim()
  
  // If it's already mixed case (not all uppercase), return as-is with County suffix
  if (trimmed !== trimmed.toUpperCase()) {
    return trimmed.includes('County') ? trimmed : `${trimmed} County`
  }
  
  // Handle common prefixes before title-casing
  let name = trimmed
    // MC prefix: "MC LEAN" → "McLean"
    .replace(/\bMC\s+(\w)/gi, (_, letter) => `Mc${letter.toUpperCase()}`)
    // DE prefix: "DE KALB" → "DeKalb", "DE WITT" → "DeWitt"
    .replace(/\bDE\s+(\w)/gi, (_, letter) => `De${letter.toUpperCase()}`)
    // ST prefix: "ST CLAIR" → "St. Clair"
    .replace(/\bST\s+/gi, 'St. ')
    // O' prefix: "O BRIEN" → "O'Brien"
    .replace(/\bO\s+(\w)/gi, (_, letter) => `O'${letter.toUpperCase()}`)
    // LA prefix for Louisiana-style names: "LA SALLE" → "LaSalle"
    .replace(/\bLA\s+(\w)/gi, (_, letter) => `La${letter.toUpperCase()}`)
  
  // Title-case the rest
  name = name
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Preserve already-processed prefixes (Mc, De, St., O', La)
      if (/^(mc|de|st\.|o'|la)[a-z]/i.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
  
  // Re-apply prefix capitalizations that may have been lowered
  name = name
    .replace(/^Mc(\w)/, (_, l) => `Mc${l.toUpperCase()}`)
    .replace(/\sMc(\w)/g, (_, l) => ` Mc${l.toUpperCase()}`)
    .replace(/^De(\w)/, (_, l) => `De${l.toUpperCase()}`)
    .replace(/\sDe(\w)/g, (_, l) => ` De${l.toUpperCase()}`)
    .replace(/^O'(\w)/, (_, l) => `O'${l.toUpperCase()}`)
    .replace(/\sO'(\w)/g, (_, l) => ` O'${l.toUpperCase()}`)
    .replace(/^La(\w)/, (_, l) => `La${l.toUpperCase()}`)
    .replace(/\sLa(\w)/g, (_, l) => ` La${l.toUpperCase()}`)
  
  // Append "County" if not already present
  if (!name.toLowerCase().includes('county')) {
    name = `${name} County`
  }
  
  return name
}

function formatList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}
