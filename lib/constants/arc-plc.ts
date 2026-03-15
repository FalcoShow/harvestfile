// =============================================================================
// HarvestFile — ARC/PLC Constants & OBBBA Parameters
// Phase 6B: Multi-Year Scenario Modeler
//
// All statutory parameters from OBBBA (Pub. L. 119-21, signed July 4, 2025).
// Price projections from USDA ERS Agricultural Projections to 2035 (OCE-2026-1,
// February 2026) and WASDE-669 (March 2026).
//
// IMPORTANT: These values change ONLY with new legislation or USDA publications.
// Update this file when USDA releases new WASDE or ERS baseline reports.
// =============================================================================

// ─── Program Parameters ──────────────────────────────────────────────────────

export const ARC_GUARANTEE_PCT = 0.90;       // 90% of benchmark revenue (was 86%)
export const ARC_PAYMENT_CAP_PCT = 0.12;     // 12% of benchmark revenue (was 10%)
export const PAYMENT_ACRES_PCT = 0.85;       // 85% of base acres (unchanged)
export const SEQUESTRATION_PCT = 0.057;      // ~5.7% sequestration
export const ERP_ESCALATOR_PCT = 0.88;       // 88% of Olympic avg MYA (was 85%)
export const ERP_CAP_PCT = 1.15;             // 115% of statutory ref price
export const PAYMENT_LIMIT = 155_000;        // $155,000/person (was $125,000)

// Program years covered by OBBBA
export const OBBBA_START_YEAR = 2025;
export const OBBBA_END_YEAR = 2031;

// 2025 special provision: automatic "higher of" ARC or PLC
export const AUTO_HIGHER_OF_YEAR = 2025;

// ─── Commodity Configuration ─────────────────────────────────────────────────

export interface CommodityConfig {
  code: string;
  name: string;
  unit: string;            // $/bu, $/cwt, $/ton, ¢/lb
  unitLabel: string;       // bu, cwt, ton, lb
  statutoryRefPrice: number;
  loanRate2025: number;    // Old loan rate (2025 crop year)
  loanRate2026: number;    // New OBBBA loan rate (2026+ crop years)
  /** USDA ERS baseline MYA price projections by marketing year */
  baselinePrices: Record<number, number>;
  /** National trend yield growth rate (% per year) — for yield projection */
  yieldTrendPct: number;
}

/**
 * Master commodity configuration table.
 * Statutory ref prices: OBBBA §1101
 * Loan rates: OBBBA §1201 (effective 2026 crop year)
 * Baseline prices: USDA ERS OCE-2026-1, WASDE-669
 */
export const COMMODITIES: Record<string, CommodityConfig> = {
  CORN: {
    code: 'CORN',
    name: 'Corn',
    unit: '$/bu',
    unitLabel: 'bu',
    statutoryRefPrice: 4.10,
    loanRate2025: 2.20,
    loanRate2026: 2.42,
    baselinePrices: {
      2019: 3.56, 2020: 4.53, 2021: 6.00, 2022: 6.54, 2023: 4.65,
      2024: 4.24, 2025: 4.10, 2026: 4.10, 2027: 4.20, 2028: 4.30,
      2029: 4.40, 2030: 4.40, 2031: 4.40,
    },
    yieldTrendPct: 1.2,
  },
  SOYBEANS: {
    code: 'SOYBEANS',
    name: 'Soybeans',
    unit: '$/bu',
    unitLabel: 'bu',
    statutoryRefPrice: 10.00,
    loanRate2025: 6.20,
    loanRate2026: 6.82,
    baselinePrices: {
      2019: 8.57, 2020: 10.80, 2021: 13.30, 2022: 14.20, 2023: 12.50,
      2024: 10.00, 2025: 10.20, 2026: 10.30, 2027: 10.35, 2028: 10.45,
      2029: 10.55, 2030: 10.55, 2031: 10.55,
    },
    yieldTrendPct: 0.8,
  },
  WHEAT: {
    code: 'WHEAT',
    name: 'Wheat',
    unit: '$/bu',
    unitLabel: 'bu',
    statutoryRefPrice: 6.35,
    loanRate2025: 3.38,
    loanRate2026: 3.72,
    baselinePrices: {
      2019: 4.58, 2020: 5.05, 2021: 7.63, 2022: 8.83, 2023: 7.18,
      2024: 5.52, 2025: 4.90, 2026: 5.40, 2027: 5.50, 2028: 5.60,
      2029: 5.70, 2030: 5.80, 2031: 6.00,
    },
    yieldTrendPct: 0.5,
  },
  SORGHUM: {
    code: 'SORGHUM',
    name: 'Grain Sorghum',
    unit: '$/bu',
    unitLabel: 'bu',
    statutoryRefPrice: 4.40,
    loanRate2025: 2.20,
    loanRate2026: 2.42,
    baselinePrices: {
      2019: 3.25, 2020: 5.29, 2021: 5.94, 2022: 6.47, 2023: 4.64,
      2024: 4.07, 2025: 3.60, 2026: 3.70, 2027: 3.80, 2028: 3.85,
      2029: 3.90, 2030: 3.95, 2031: 4.00,
    },
    yieldTrendPct: 0.9,
  },
  BARLEY: {
    code: 'BARLEY',
    name: 'Barley',
    unit: '$/bu',
    unitLabel: 'bu',
    statutoryRefPrice: 5.45,
    loanRate2025: 2.50,
    loanRate2026: 2.75,
    baselinePrices: {
      2019: 4.63, 2020: 4.58, 2021: 6.25, 2022: 7.32, 2023: 6.00,
      2024: 6.31, 2025: 5.40, 2026: 5.50, 2027: 5.60, 2028: 5.70,
      2029: 5.80, 2030: 5.90, 2031: 6.00,
    },
    yieldTrendPct: 0.4,
  },
  OATS: {
    code: 'OATS',
    name: 'Oats',
    unit: '$/bu',
    unitLabel: 'bu',
    statutoryRefPrice: 2.65,
    loanRate2025: 2.00,
    loanRate2026: 2.20,
    baselinePrices: {
      2019: 2.79, 2020: 2.72, 2021: 3.75, 2022: 4.21, 2023: 3.76,
      2024: 3.35, 2025: 3.20, 2026: 3.25, 2027: 3.30, 2028: 3.35,
      2029: 3.40, 2030: 3.45, 2031: 3.50,
    },
    yieldTrendPct: 0.3,
  },
  RICE: {
    code: 'RICE',
    name: 'Long Grain Rice',
    unit: '$/cwt',
    unitLabel: 'cwt',
    statutoryRefPrice: 16.90,
    loanRate2025: 7.00,
    loanRate2026: 7.70,
    baselinePrices: {
      2019: 12.90, 2020: 13.90, 2021: 14.40, 2022: 17.30, 2023: 15.90,
      2024: 14.00, 2025: 10.50, 2026: 14.30, 2027: 14.50, 2028: 14.70,
      2029: 14.90, 2030: 15.10, 2031: 15.20,
    },
    yieldTrendPct: 0.6,
  },
  PEANUTS: {
    code: 'PEANUTS',
    name: 'Peanuts',
    unit: '$/ton',
    unitLabel: 'ton',
    statutoryRefPrice: 630.00,
    loanRate2025: 355.00,
    loanRate2026: 390.00,
    baselinePrices: {
      2019: 414.00, 2020: 420.00, 2021: 420.00, 2022: 450.00, 2023: 450.00,
      2024: 458.00, 2025: 458.00, 2026: 470.00, 2027: 480.00, 2028: 490.00,
      2029: 500.00, 2030: 510.00, 2031: 520.00,
    },
    yieldTrendPct: 0.7,
  },
  COTTON: {
    code: 'COTTON',
    name: 'Upland Cotton',
    unit: '¢/lb',
    unitLabel: 'lb',
    statutoryRefPrice: 0.42,    // Seed cotton ref price
    loanRate2025: 0.52,
    loanRate2026: 0.55,
    baselinePrices: {
      2019: 0.59, 2020: 0.66, 2021: 0.91, 2022: 0.81, 2023: 0.77,
      2024: 0.63, 2025: 0.60, 2026: 0.65, 2027: 0.66, 2028: 0.67,
      2029: 0.68, 2030: 0.69, 2031: 0.69,
    },
    yieldTrendPct: 0.5,
  },
  'SEED COTTON': {
    code: 'SEED COTTON',
    name: 'Seed Cotton',
    unit: '¢/lb',
    unitLabel: 'lb',
    statutoryRefPrice: 0.42,
    loanRate2025: 0.25,
    loanRate2026: 0.27,
    baselinePrices: {
      2019: 0.32, 2020: 0.36, 2021: 0.48, 2022: 0.44, 2023: 0.40,
      2024: 0.34, 2025: 0.33, 2026: 0.35, 2027: 0.36, 2028: 0.36,
      2029: 0.37, 2030: 0.37, 2031: 0.37,
    },
    yieldTrendPct: 0.5,
  },
};

// ─── Scenario Presets ────────────────────────────────────────────────────────

export interface ScenarioPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  priceMultiplier: number;   // 1.0 = baseline, 0.85 = -15% prices
  yieldMultiplier: number;   // 1.0 = trend, 0.80 = -20% yields
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'baseline',
    name: 'USDA Baseline',
    emoji: '📊',
    description: 'USDA ERS February 2026 long-term projections',
    priceMultiplier: 1.0,
    yieldMultiplier: 1.0,
  },
  {
    id: 'drought',
    name: 'Drought Year',
    emoji: '🏜️',
    description: 'Yields drop 20%, prices rise 10% from supply shock',
    priceMultiplier: 1.10,
    yieldMultiplier: 0.80,
  },
  {
    id: 'price_crash',
    name: 'Price Crash',
    emoji: '📉',
    description: 'Global oversupply pushes prices down 20%',
    priceMultiplier: 0.80,
    yieldMultiplier: 1.0,
  },
  {
    id: 'good_year',
    name: 'Strong Market',
    emoji: '🚀',
    description: 'High prices and good yields — lower safety net payments',
    priceMultiplier: 1.15,
    yieldMultiplier: 1.05,
  },
  {
    id: 'trade_war',
    name: 'Trade Disruption',
    emoji: '⚠️',
    description: 'Export demand falls — prices down 15%, yields normal',
    priceMultiplier: 0.85,
    yieldMultiplier: 1.0,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the correct loan rate for a given commodity and crop year */
export function getLoanRate(commodityCode: string, cropYear: number): number {
  const config = COMMODITIES[commodityCode];
  if (!config) return 0;
  return cropYear <= 2025 ? config.loanRate2025 : config.loanRate2026;
}

/** Get USDA baseline price for a commodity and crop year */
export function getBaselinePrice(commodityCode: string, cropYear: number): number | null {
  const config = COMMODITIES[commodityCode];
  if (!config) return null;
  return config.baselinePrices[cropYear] ?? null;
}

/** Get commodity config, with fuzzy matching for code variants */
export function getCommodityConfig(code: string): CommodityConfig | null {
  // Direct match
  if (COMMODITIES[code]) return COMMODITIES[code];
  // Try uppercase
  const upper = code.toUpperCase();
  if (COMMODITIES[upper]) return COMMODITIES[upper];
  // Try common variants
  const aliases: Record<string, string> = {
    'GRAIN SORGHUM': 'SORGHUM',
    'UPLAND COTTON': 'COTTON',
    'LONG GRAIN RICE': 'RICE',
    'MEDIUM GRAIN RICE': 'RICE',
  };
  if (aliases[upper]) return COMMODITIES[aliases[upper]];
  return null;
}
