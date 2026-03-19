// =============================================================================
// HarvestFile — Phase 14A: MYA Constants
// lib/mya/constants.ts
//
// All commodity configuration for the Marketing Year Average calculation engine.
// Sources: OBBBA (Pub. L. 119-21), ERS Season-Average Price Forecasts,
//          NASS Agricultural Prices, FSA ARC/PLC fact sheets.
//
// IMPORTANT: Update effective reference prices annually when ERS publishes
// new 5-year Olympic averages (typically after WASDE in October).
// =============================================================================

// ─── Marketing Year Definitions ──────────────────────────────────────────────

export interface MarketingYearDef {
  startMonth: number;     // 1-indexed calendar month (6=Jun, 9=Sep, 8=Aug)
  endMonth: number;       // Last month of the MY
  label: string;          // e.g., 'Sep–Aug'
}

export const MARKETING_YEARS: Record<string, MarketingYearDef> = {
  CORN:     { startMonth: 9,  endMonth: 8,  label: 'Sep–Aug' },
  SOYBEANS: { startMonth: 9,  endMonth: 8,  label: 'Sep–Aug' },
  SORGHUM:  { startMonth: 9,  endMonth: 8,  label: 'Sep–Aug' },
  WHEAT:    { startMonth: 6,  endMonth: 5,  label: 'Jun–May' },
  BARLEY:   { startMonth: 6,  endMonth: 5,  label: 'Jun–May' },
  OATS:     { startMonth: 6,  endMonth: 5,  label: 'Jun–May' },
  PEANUTS:  { startMonth: 8,  endMonth: 7,  label: 'Aug–Jul' },
  RICE:     { startMonth: 8,  endMonth: 7,  label: 'Aug–Jul' },
};

// ─── Commodity Configuration ─────────────────────────────────────────────────

export interface CommodityMYAConfig {
  code: string;
  name: string;
  emoji: string;
  unit: string;           // Price unit display: '$/bu', '$/cwt', '$/lb'
  unitLabel: string;      // Short unit: 'bu', 'cwt', 'lb'
  nassName: string;       // NASS commodity_desc value
  nassPriceUnit: string;  // NASS unit_desc value
  // OBBBA statutory reference price
  statutoryRefPrice: number;
  // Current effective reference price (higher of statutory or 88% Olympic avg)
  effectiveRefPrice: number;
  // National loan rate (2026+)
  loanRate: number;
  // Nasdaq Data Link CHRIS contract code (null = no futures available)
  futuresCode: string | null;
  // Color for charts
  color: string;
}

export const COMMODITIES: Record<string, CommodityMYAConfig> = {
  CORN: {
    code: 'CORN',
    name: 'Corn',
    emoji: '🌽',
    unit: '$/bu',
    unitLabel: 'bu',
    nassName: 'CORN',
    nassPriceUnit: '$ / BU',
    statutoryRefPrice: 4.10,
    effectiveRefPrice: 4.42,
    loanRate: 2.20,
    futuresCode: 'CHRIS/CME_C1',
    color: '#F59E0B',
  },
  SOYBEANS: {
    code: 'SOYBEANS',
    name: 'Soybeans',
    emoji: '🫘',
    unit: '$/bu',
    unitLabel: 'bu',
    nassName: 'SOYBEANS',
    nassPriceUnit: '$ / BU',
    statutoryRefPrice: 10.00,
    effectiveRefPrice: 10.71,
    loanRate: 6.20,
    futuresCode: 'CHRIS/CME_S1',
    color: '#059669',
  },
  WHEAT: {
    code: 'WHEAT',
    name: 'Wheat',
    emoji: '🌾',
    unit: '$/bu',
    unitLabel: 'bu',
    nassName: 'WHEAT',
    nassPriceUnit: '$ / BU',
    statutoryRefPrice: 6.35,
    effectiveRefPrice: 6.35,
    loanRate: 3.38,
    futuresCode: 'CHRIS/CME_W1',
    color: '#D97706',
  },
  SORGHUM: {
    code: 'SORGHUM',
    name: 'Grain Sorghum',
    emoji: '🌿',
    unit: '$/bu',
    unitLabel: 'bu',
    nassName: 'SORGHUM',
    nassPriceUnit: '$ / BU',
    statutoryRefPrice: 4.40,
    effectiveRefPrice: 4.67,
    loanRate: 2.20,
    futuresCode: null, // No exchange-traded sorghum futures
    color: '#8B5CF6',
  },
  BARLEY: {
    code: 'BARLEY',
    name: 'Barley',
    emoji: '🪴',
    unit: '$/bu',
    unitLabel: 'bu',
    nassName: 'BARLEY',
    nassPriceUnit: '$ / BU',
    statutoryRefPrice: 5.45,
    effectiveRefPrice: 5.45,
    loanRate: 2.50,
    futuresCode: null, // Thin liquidity, not reliable
    color: '#3B82F6',
  },
  OATS: {
    code: 'OATS',
    name: 'Oats',
    emoji: '🌱',
    unit: '$/bu',
    unitLabel: 'bu',
    nassName: 'OATS',
    nassPriceUnit: '$ / BU',
    statutoryRefPrice: 2.65,
    effectiveRefPrice: 3.05, // At 115% cap
    loanRate: 1.43,
    futuresCode: 'CHRIS/CME_O1',
    color: '#6B7280',
  },
};

// Ordered list for display (corn/soybeans/wheat first, then secondary)
export const COMMODITY_ORDER = [
  'CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'BARLEY', 'OATS'
] as const;

// ─── Nearby Futures Contract Mappings ────────────────────────────────────────
// Maps each marketing year month to the appropriate nearby futures contract.
// Key = calendar month number, Value = futures contract month code.
// Used to project future monthly prices: Projected = Futures Settle + Avg Basis

export const NEARBY_CONTRACTS: Record<string, Record<number, string>> = {
  CORN: {
    // MY month → CBOT contract month
    9: 'Z',   // Sep → December
    10: 'Z',  // Oct → December
    11: 'Z',  // Nov → December
    12: 'H',  // Dec → March
    1: 'H',   // Jan → March
    2: 'H',   // Feb → March
    3: 'K',   // Mar → May
    4: 'K',   // Apr → May
    5: 'N',   // May → July
    6: 'N',   // Jun → July
    7: 'U',   // Jul → September
    8: 'U',   // Aug → September
  },
  SOYBEANS: {
    9: 'X',   // Sep → November
    10: 'X',  // Oct → November
    11: 'F',  // Nov → January
    12: 'F',  // Dec → January
    1: 'H',   // Jan → March
    2: 'H',   // Feb → March
    3: 'K',   // Mar → May
    4: 'K',   // Apr → May
    5: 'N',   // May → July
    6: 'N',   // Jun → July
    7: 'Q',   // Jul → August
    8: 'U',   // Aug → September
  },
  WHEAT: {
    // Wheat MY is Jun-May
    6: 'N',   // Jun → July
    7: 'U',   // Jul → September
    8: 'U',   // Aug → September
    9: 'Z',   // Sep → December
    10: 'Z',  // Oct → December
    11: 'Z',  // Nov → December
    12: 'H',  // Dec → March
    1: 'H',   // Jan → March
    2: 'H',   // Feb → March
    3: 'K',   // Mar → May
    4: 'K',   // Apr → May
    5: 'K',   // May → May
  },
  OATS: {
    9: 'Z',   // Sep → December
    10: 'Z',  // Oct → December
    11: 'Z',  // Nov → December
    12: 'H',  // Dec → March
    1: 'H',   // Jan → March
    2: 'H',   // Feb → March
    3: 'K',   // Mar → May
    4: 'K',   // Apr → May
    5: 'N',   // May → July
    6: 'N',   // Jun → July
    7: 'U',   // Jul → September
    8: 'U',   // Aug → September
  },
};

// ─── Month Helpers ───────────────────────────────────────────────────────────

export const MONTH_LABELS = [
  '', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Get the marketing year string for a given commodity and date.
 * Example: Corn on Oct 15, 2025 → '2025/26' (MY starts Sep 2025)
 * Example: Wheat on Mar 10, 2026 → '2025/26' (MY started Jun 2025)
 */
export function getMarketingYear(commodity: string, date: Date = new Date()): string {
  const my = MARKETING_YEARS[commodity];
  if (!my) return '';

  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();

  // If current month >= start month, we're in year/year+1 MY
  // If current month < start month, we're in year-1/year MY
  if (month >= my.startMonth) {
    return `${year}/${(year + 1).toString().slice(2)}`;
  } else {
    return `${year - 1}/${year.toString().slice(2)}`;
  }
}

/**
 * Get ordered list of {month_num, month_label, calendarYear} for a marketing year.
 * Example: getMarketingYearMonths('CORN', '2025/26') →
 *   [{month: 9, label: 'SEP', year: 2025}, ..., {month: 8, label: 'AUG', year: 2026}]
 */
export function getMarketingYearMonths(
  commodity: string,
  marketingYear: string
): Array<{ month: number; label: string; year: number; order: number }> {
  const my = MARKETING_YEARS[commodity];
  if (!my) return [];

  const startYear = parseInt(marketingYear.split('/')[0]);
  const months: Array<{ month: number; label: string; year: number; order: number }> = [];

  for (let i = 0; i < 12; i++) {
    const m = ((my.startMonth - 1 + i) % 12) + 1; // 1-indexed
    const y = m >= my.startMonth ? startYear : startYear + 1;
    months.push({
      month: m,
      label: MONTH_LABELS[m],
      year: y,
      order: i + 1,
    });
  }

  return months;
}

// ─── OBBBA Program Parameters ────────────────────────────────────────────────

export const ARC_GUARANTEE_PCT = 0.90;
export const ARC_PAYMENT_CAP_PCT = 0.12;
export const PAYMENT_ACRES_PCT = 0.85;
export const SEQUESTRATION_PCT = 0.057;
export const ERP_ESCALATOR_PCT = 0.88;
export const ERP_CAP_PCT = 1.15;
export const PAYMENT_LIMIT = 155_000;
