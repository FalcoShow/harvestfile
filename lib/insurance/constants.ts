// =============================================================================
// HarvestFile — Phase 16B Build 2B-2: Crop Insurance Constants
// lib/insurance/constants.ts
//
// 2026 crop insurance reference data for the Coverage Optimizer.
//
// Sources:
//   - RMA Actuarial Release 25-047 (2026 projected prices)
//   - farmdoc "SCO and ECO Choices in 2026" (Feb 2026)
//   - farmdoc "Comparing Crop Insurance Scenarios" (Feb 2026)
//   - Farm Bureau "Risk Management Options for 2026" (Mar 2026)
//   - Iowa State Extension SCO/ECO documentation
//   - RMA 20-SCO Endorsement methodology
//
// Build 2B-2: Added COMMODITY_CODES for ADM actuarial table lookups.
// Estimated rates remain as fallbacks when county-specific ADM data
// is not available (user hasn't selected a county).
// =============================================================================

// ─── ADM Commodity Code Mapping ──────────────────────────────────────────────
// Maps our internal commodity names to RMA actuarial commodity codes.
// These codes are used in the calculate_county_premium_batch() RPC call.

export const COMMODITY_CODES: Record<string, string> = {
  CORN: '0041',
  SOYBEANS: '0081',
  WHEAT: '0011',
};

// Reverse lookup: commodity code → internal name
export const COMMODITY_FROM_CODE: Record<string, string> = {
  '0041': 'CORN',
  '0081': 'SOYBEANS',
  '0011': 'WHEAT',
};

// ─── 2026 Crop Insurance Projected Prices ────────────────────────────────────
// Source: RMA price discovery period (February 2026 average)
// These are final — locked in at sales closing date (March 15, 2026)

export interface CropInsurancePrice {
  commodity: string;
  projectedPrice: number;       // $/unit — final 2026 projected price
  volatilityFactor: number;     // Implied volatility from options
  unit: string;                 // 'bu', 'cwt', 'lb'
}

export const PROJECTED_PRICES_2026: Record<string, CropInsurancePrice> = {
  CORN: {
    commodity: 'CORN',
    projectedPrice: 4.62,
    volatilityFactor: 0.15,
    unit: 'bu',
  },
  SOYBEANS: {
    commodity: 'SOYBEANS',
    projectedPrice: 11.09,
    volatilityFactor: 0.13,
    unit: 'bu',
  },
  WHEAT: {
    commodity: 'WHEAT',
    projectedPrice: 5.85,
    volatilityFactor: 0.17,
    unit: 'bu',
  },
};

// ─── ARC/PLC Reference Data (OBBBA) ─────────────────────────────────────────
// These connect to the existing MYA constants but are duplicated here for
// self-contained insurance calculations

export interface ArcPlcRefData {
  commodity: string;
  statutoryRefPrice: number;
  effectiveRefPrice: number;
  arcBenchmarkPrice: number;    // 5-year Olympic avg MYA
  arcBenchmarkYieldNational: number; // National benchmark yield (bu/acre)
  plcYieldNational: number;     // National average PLC yield
  loanRate: number;
}

export const ARC_PLC_REF_2026: Record<string, ArcPlcRefData> = {
  CORN: {
    commodity: 'CORN',
    statutoryRefPrice: 4.10,
    effectiveRefPrice: 4.42,
    arcBenchmarkPrice: 5.03,
    arcBenchmarkYieldNational: 177,
    plcYieldNational: 177,
    loanRate: 2.20,
  },
  SOYBEANS: {
    commodity: 'SOYBEANS',
    statutoryRefPrice: 10.00,
    effectiveRefPrice: 10.71,
    arcBenchmarkPrice: 12.17,
    arcBenchmarkYieldNational: 51,
    plcYieldNational: 51,
    loanRate: 6.20,
  },
  WHEAT: {
    commodity: 'WHEAT',
    statutoryRefPrice: 6.35,
    effectiveRefPrice: 6.35,
    arcBenchmarkPrice: 6.98,
    arcBenchmarkYieldNational: 52,
    plcYieldNational: 52,
    loanRate: 3.38,
  },
};

// ─── Subsidy Rates (OBBBA) ──────────────────────────────────────────────────

export const SUBSIDY_RATES = {
  // Individual plans (RP, RP-HPE, YP) — by coverage level
  individual: {
    50: 0.67, 55: 0.64, 60: 0.64, 65: 0.59, 70: 0.59,
    75: 0.55, 80: 0.48, 85: 0.38,
  } as Record<number, number>,

  // Enterprise unit additional subsidy
  enterpriseBonus: {
    50: 0.13, 55: 0.13, 60: 0.13, 65: 0.21, 70: 0.21,
    75: 0.25, 80: 0.32, 85: 0.42,
  } as Record<number, number>,

  // SCO and ECO (OBBBA increased to 80%)
  sco: 0.80,
  eco: 0.80,

  // Beginning farmer additional subsidy (10 percentage points)
  beginningFarmerBonus: 0.10,
};

// ─── Estimated Premium Rates per Dollar of Liability ─────────────────────────
// These are ESTIMATED base rates for typical Midwest counties.
// Source: Derived from farmdoc 2026 analysis (Logan County, IL baseline)
//
// FALLBACK ONLY — when ADM county data is available (Build 2B-2+),
// these are overridden by real actuarial rates.
//
// Format: rate per dollar of liability (before subsidy)

export const ESTIMATED_RP_RATES: Record<string, Record<number, number>> = {
  // Corn RP enterprise unit rates (per $ of liability)
  CORN: {
    50: 0.010, 55: 0.013, 60: 0.017, 65: 0.023, 70: 0.031,
    75: 0.042, 80: 0.058, 85: 0.082,
  },
  // Soybeans RP enterprise unit rates
  SOYBEANS: {
    50: 0.008, 55: 0.011, 60: 0.015, 65: 0.020, 70: 0.027,
    75: 0.037, 80: 0.051, 85: 0.073,
  },
  // Wheat RP enterprise unit rates
  WHEAT: {
    50: 0.012, 55: 0.016, 60: 0.021, 65: 0.028, 70: 0.038,
    75: 0.051, 80: 0.070, 85: 0.098,
  },
};

// ─── SCO Premium Rates ──────────────────────────────────────────────────────
// SCO rate per dollar of supplemental protection (coverage band × expected value)
// These vary less by county than individual RP because SCO is area-based.
// Source: farmdoc analysis + RMA SCO endorsement methodology

export const ESTIMATED_SCO_RATES: Record<string, number> = {
  CORN: 0.159,        // ~15.9% of supplemental protection
  SOYBEANS: 0.109,    // ~10.9%
  WHEAT: 0.175,       // ~17.5%
};

// ─── ECO Premium Rates ──────────────────────────────────────────────────────
// ECO rates per dollar of coverage in the band
// ECO-90: covers 86%→90% (4 point band)
// ECO-95: covers 86%→95% (9 point band)

export const ESTIMATED_ECO_RATES: Record<string, { eco90: number; eco95: number }> = {
  CORN: { eco90: 0.122, eco95: 0.186 },
  SOYBEANS: { eco90: 0.088, eco95: 0.145 },
  WHEAT: { eco90: 0.140, eco95: 0.210 },
};

// ─── Coverage Level Options ─────────────────────────────────────────────────

export const COVERAGE_LEVELS = [50, 55, 60, 65, 70, 75, 80, 85] as const;
export type CoverageLevel = typeof COVERAGE_LEVELS[number];

// ─── SCO/ECO Coverage Bands ─────────────────────────────────────────────────

export const SCO_TRIGGER_2026 = 0.86;  // SCO covers up to 86% in 2026
export const SCO_TRIGGER_2027 = 0.90;  // Rises to 90% starting 2027

export const ETO_LEVELS = {
  ECO_90: { label: 'ECO-90', trigger: 0.90 },
  ECO_95: { label: 'ECO-95', trigger: 0.95 },
} as const;

// ─── ARC-CO OBBBA Parameters ────────────────────────────────────────────────

export const ARC_GUARANTEE_PCT = 0.90;      // 90% of benchmark revenue (was 86%)
export const ARC_MAX_PAYMENT_PCT = 0.12;    // 12% of benchmark revenue (was 10%)
export const ARC_PAYMENT_ACRES_PCT = 0.85;  // Payment on 85% of base acres
export const PLC_PAYMENT_ACRES_PCT = 0.85;  // Same for PLC
export const SEQUESTRATION_PCT = 0.057;     // ~5.7% sequestration reduction

// ─── Display Configuration ──────────────────────────────────────────────────

export const INSURANCE_COMMODITIES = ['CORN', 'SOYBEANS', 'WHEAT'] as const;

export const COMMODITY_DISPLAY: Record<string, {
  name: string;
  emoji: string;
  color: string;
  defaultAph: number;
}> = {
  CORN: { name: 'Corn', emoji: '🌽', color: '#F59E0B', defaultAph: 190 },
  SOYBEANS: { name: 'Soybeans', emoji: '🫘', color: '#059669', defaultAph: 55 },
  WHEAT: { name: 'Wheat', emoji: '🌾', color: '#D97706', defaultAph: 60 },
};

// ─── Scenario Labels ────────────────────────────────────────────────────────

export type ScenarioType =
  | 'arc_sco_eco95'
  | 'plc_sco_eco95'
  | 'arc_sco_only'
  | 'plc_rp_only';

export const SCENARIO_LABELS: Record<ScenarioType, {
  label: string;
  shortLabel: string;
  description: string;
}> = {
  arc_sco_eco95: {
    label: 'ARC-CO + RP + SCO + ECO-95%',
    shortLabel: 'Full Stack (ARC)',
    description: 'Maximum coverage: free ARC-CO on base acres + full county-based shallow loss protection on planted acres',
  },
  plc_sco_eco95: {
    label: 'PLC + RP + SCO + ECO-95%',
    shortLabel: 'Full Stack (PLC)',
    description: 'PLC backstop for deep price drops + full county-based coverage on planted acres',
  },
  arc_sco_only: {
    label: 'ARC-CO + RP + SCO',
    shortLabel: 'ARC + SCO',
    description: 'ARC-CO on base acres + SCO to 86% without ECO — lower premium, narrower county coverage',
  },
  plc_rp_only: {
    label: 'PLC + RP (No SCO/ECO)',
    shortLabel: 'PLC + RP Only',
    description: 'Simplest option: PLC safety net + individual crop insurance only — no area-based endorsements',
  },
};
