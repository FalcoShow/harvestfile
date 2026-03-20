// =============================================================================
// HarvestFile — Phase 16B Build 2B-2: Shared Insurance Types
// lib/insurance/types.ts
//
// Types for ADM actuarial data returned by the batch RPC function.
// Used by the API route, calculator, and page component.
// =============================================================================

/**
 * Single coverage level result from calculate_county_premium_batch().
 * Represents real USDA RMA actuarial data for one state/county/commodity/coverage.
 */
export interface AdmPremiumLevel {
  acres: number;
  offer_id: number;
  aph_yield: number;
  plan_code: string;
  type_code: string;
  state_fips: string;
  state_name: string;
  county_fips: string;
  county_name: string;
  data_source: string;
  base_rate_65: number;
  subsidy_rate: number;
  practice_code: string;
  commodity_code: string;
  coverage_level: number;        // 0.50 - 0.85
  effective_rate: number;
  projected_price: number;
  rate_differential: number;
  volatility_factor: number;
  liability_per_acre: number;
  total_farm_premium: number;
  enterprise_residual: number;
  county_reference_yield: number;
  total_premium_per_acre: number;
  farmer_premium_per_acre: number;
}

/**
 * Full batch response — array of 8 coverage levels.
 */
export type AdmBatchResponse = AdmPremiumLevel[];

/**
 * API response envelope from /api/insurance/premium
 */
export interface PremiumApiResponse {
  success: boolean;
  data: AdmBatchResponse | null;
  meta: {
    state_fips: string;
    county_fips: string;
    commodity_code: string;
    aph_yield: number;
    acres: number;
    plan_code: string;
    calculated_at: string;
    coverage_levels_returned: number;
  };
  error?: string;
}

/**
 * State reference data from adm_states table.
 */
export interface AdmState {
  state_fips: string;
  state_name: string;
  state_abbreviation: string;
}

/**
 * County reference data from adm_counties table.
 */
export interface AdmCounty {
  state_fips: string;
  county_fips: string;
  county_name: string;
}
