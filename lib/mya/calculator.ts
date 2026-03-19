// =============================================================================
// HarvestFile — Phase 14A: MYA Calculation Engine
// lib/mya/calculator.ts
//
// Implements the USDA ERS Season-Average Price Forecast methodology:
//   1. Actual NASS monthly prices (where available)
//   2. Futures + historical basis projection (for remaining months)
//   3. Weighted by marketing percentages → MYA
//
// This is THE feature no competitor has. Every university calculator requires
// manual price entry. HarvestFile does it automatically, every day.
// =============================================================================

import {
  COMMODITIES,
  MARKETING_YEARS,
  getMarketingYearMonths,
  PAYMENT_ACRES_PCT,
  SEQUESTRATION_PCT,
  type CommodityMYAConfig,
} from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyPriceData {
  month: number;          // Calendar month (1-12)
  label: string;          // 'SEP', 'OCT', etc.
  year: number;           // Calendar year
  order: number;          // Order within marketing year (1-12)
  price: number | null;   // Price in $/unit (null = not yet available)
  isActual: boolean;      // true = NASS published, false = projected
  weight: number;         // Marketing percentage (e.g., 12.68)
  weightedPrice: number;  // price × weight / 100
  source: string;         // 'nass', 'futures_basis', 'ers_projection'
}

export interface MYACalculation {
  commodity: string;
  marketingYear: string;
  computedAt: string;

  // Monthly breakdown
  months: MonthlyPriceData[];

  // Aggregates
  monthsActual: number;
  monthsProjected: number;
  monthsRemaining: number;

  // MYA values
  partialMYA: number | null;    // Weighted avg of actual months only
  projectedMYA: number;         // Full 12-month projected MYA
  confidence: 'low' | 'medium' | 'high';

  // Reference price comparison
  config: CommodityMYAConfig;
  statutoryRefPrice: number;
  effectiveRefPrice: number;

  // Payment projections
  plcPaymentRate: number;       // ERP - max(MYA, loan_rate), floored at 0
  plcPaymentPerAcre: number;    // Approximate: plc_rate × national_avg_yield × 0.85
  arcBenchmarkRevenue: number | null;

  // Delta
  myaVsRefPrice: number;        // Positive = above ref, negative = below
  myaVsRefPricePct: number;     // Percentage
  paymentLikelihood: 'none' | 'possible' | 'likely' | 'certain';
}

// ─── Core Calculation ────────────────────────────────────────────────────────

/**
 * Calculate the projected MYA for a commodity given actual NASS prices,
 * marketing weights, and optional futures-based projections.
 *
 * This implements the ERS 8-step methodology:
 * 1. Actual NASS prices for completed months
 * 2. Futures + basis projections for remaining months
 * 3. Marketing percentage weighting
 * 4. Sum = projected MYA
 */
export function calculateMYA(params: {
  commodity: string;
  marketingYear: string;
  actualPrices: Map<number, number>;       // month_num → NASS price
  projectedPrices: Map<number, number>;    // month_num → futures+basis price
  weights: Map<number, number>;            // month_num → marketing percentage
  nationalAvgYield?: number;               // For PLC payment calculation
}): MYACalculation {
  const { commodity, marketingYear, actualPrices, projectedPrices, weights, nationalAvgYield } = params;
  const config = COMMODITIES[commodity];
  if (!config) throw new Error(`Unknown commodity: ${commodity}`);

  const myMonths = getMarketingYearMonths(commodity, marketingYear);
  const now = new Date();

  // Build monthly breakdown
  const months: MonthlyPriceData[] = myMonths.map((m) => {
    const weight = weights.get(m.month) || 0;
    const actualPrice = actualPrices.get(m.month);
    const projected = projectedPrices.get(m.month);

    // Use actual NASS price if available, otherwise futures projection
    let price: number | null = null;
    let isActual = false;
    let source = 'pending';

    if (actualPrice !== undefined && actualPrice !== null) {
      price = actualPrice;
      isActual = true;
      source = 'nass';
    } else if (projected !== undefined && projected !== null) {
      price = projected;
      isActual = false;
      source = 'futures_basis';
    }

    const weightedPrice = price !== null ? (price * weight) / 100 : 0;

    return {
      month: m.month,
      label: m.label,
      year: m.year,
      order: m.order,
      price,
      isActual,
      weight,
      weightedPrice,
      source,
    };
  });

  // Count months
  const monthsActual = months.filter((m) => m.isActual).length;
  const monthsProjected = months.filter((m) => !m.isActual && m.price !== null).length;
  const monthsRemaining = months.filter((m) => m.price === null).length;

  // Calculate partial MYA (actual months only)
  let partialMYA: number | null = null;
  if (monthsActual > 0) {
    const actualWeightedSum = months
      .filter((m) => m.isActual)
      .reduce((sum, m) => sum + m.weightedPrice, 0);
    const actualWeightSum = months
      .filter((m) => m.isActual)
      .reduce((sum, m) => sum + m.weight, 0);
    // Partial MYA = weighted sum / total weight of actual months, then scale to full year
    partialMYA = actualWeightSum > 0
      ? round(actualWeightedSum / actualWeightSum * 100 / 100, 4)
      : null;
  }

  // Calculate projected MYA (all 12 months, using projections for unavailable months)
  const totalWeightedSum = months.reduce((sum, m) => sum + m.weightedPrice, 0);
  const totalWeightUsed = months
    .filter((m) => m.price !== null)
    .reduce((sum, m) => sum + m.weight, 0);

  // If we have incomplete data, scale up proportionally
  let projectedMYA: number;
  if (totalWeightUsed >= 99) {
    // All months covered (weights should sum to ~100)
    projectedMYA = round(totalWeightedSum, 4);
  } else if (totalWeightUsed > 0) {
    // Scale to full year: MYA ≈ (weighted_sum / weight_covered) × 100
    projectedMYA = round((totalWeightedSum / totalWeightUsed) * 100, 4);
  } else {
    projectedMYA = 0;
  }

  // Confidence based on months of actual data
  const confidence: 'low' | 'medium' | 'high' =
    monthsActual >= 9 ? 'high' : monthsActual >= 4 ? 'medium' : 'low';

  // ── Payment projections ──────────────────────────────────────────────────

  // PLC payment rate = ERP - max(MYA, loan_rate), floored at 0
  const plcPaymentRate = Math.max(
    0,
    config.effectiveRefPrice - Math.max(projectedMYA, config.loanRate)
  );
  const plcPaymentRate_rounded = round(plcPaymentRate, 4);

  // Approximate PLC payment per acre using national average yield
  // Real calculation uses farm-specific PLC yield × 85% of base acres
  // This is a national estimate for the dashboard
  const avgYield = nationalAvgYield || getDefaultNationalYield(commodity);
  const plcPaymentPerAcre = round(
    plcPaymentRate_rounded * avgYield * PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT),
    2
  );

  // MYA vs reference price
  const myaVsRefPrice = round(projectedMYA - config.effectiveRefPrice, 4);
  const myaVsRefPricePct = config.effectiveRefPrice > 0
    ? round((projectedMYA / config.effectiveRefPrice) * 100 - 100, 2)
    : 0;

  // Payment likelihood
  let paymentLikelihood: 'none' | 'possible' | 'likely' | 'certain';
  if (plcPaymentRate_rounded <= 0) {
    paymentLikelihood = 'none';
  } else if (monthsActual >= 10) {
    paymentLikelihood = 'certain';
  } else if (monthsActual >= 6) {
    paymentLikelihood = 'likely';
  } else {
    paymentLikelihood = 'possible';
  }

  return {
    commodity,
    marketingYear,
    computedAt: now.toISOString(),
    months,
    monthsActual,
    monthsProjected,
    monthsRemaining,
    partialMYA,
    projectedMYA,
    confidence,
    config,
    statutoryRefPrice: config.statutoryRefPrice,
    effectiveRefPrice: config.effectiveRefPrice,
    plcPaymentRate: plcPaymentRate_rounded,
    plcPaymentPerAcre,
    arcBenchmarkRevenue: null, // Requires county-specific data
    myaVsRefPrice,
    myaVsRefPricePct,
    paymentLikelihood,
  };
}

// ─── Futures + Basis Projection ──────────────────────────────────────────────

/**
 * Project a monthly price using:
 *   Projected Price = Current Futures Settlement + Historical Average Basis
 *
 * This is step 5 of the ERS methodology.
 */
export function projectMonthlyPrice(
  futuresSettle: number,
  historicalBasis: number
): number {
  return round(futuresSettle + historicalBasis, 4);
}

/**
 * Calculate the effective reference price (ERP) under OBBBA.
 *
 * ERP = min(
 *   1.15 × Statutory_Ref_Price,
 *   max(Statutory_Ref_Price, 0.88 × Olympic_Average_MYA)
 * )
 */
export function calculateERP(
  statutoryRefPrice: number,
  recentMYAs: number[] // 5 most recent MYA prices
): number {
  if (recentMYAs.length < 5) return statutoryRefPrice;

  // Olympic average: drop highest and lowest, average the middle 3
  const sorted = [...recentMYAs].sort((a, b) => a - b);
  const middle = sorted.slice(1, -1);
  const olympicAvg = middle.reduce((a, b) => a + b, 0) / middle.length;

  const escalated = 0.88 * olympicAvg;
  const cap = 1.15 * statutoryRefPrice;

  return round(Math.min(cap, Math.max(statutoryRefPrice, escalated)), 4);
}

// ─── Helper: Get default national average yield for payment estimates ────────
// Source: USDA NASS national yields (approximate, for dashboard display)

function getDefaultNationalYield(commodity: string): number {
  const yields: Record<string, number> = {
    CORN: 177,        // bu/acre (2024 national avg)
    SOYBEANS: 51,     // bu/acre
    WHEAT: 52,        // bu/acre
    SORGHUM: 72,      // bu/acre
    BARLEY: 77,       // bu/acre
    OATS: 64,         // bu/acre
  };
  return yields[commodity] || 100;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * Format a price for display with the appropriate number of decimals.
 * Corn/soybeans/wheat: 2 decimals. Peanuts/cotton: 4 decimals.
 */
export function formatPrice(price: number | null, commodity: string): string {
  if (price === null || price === undefined) return '—';
  const config = COMMODITIES[commodity];
  if (!config) return price.toFixed(2);

  // Most grains use 2 decimals
  return `$${price.toFixed(2)}`;
}

/**
 * Format a payment rate for display.
 */
export function formatPaymentRate(rate: number, commodity: string): string {
  const config = COMMODITIES[commodity];
  if (!config) return `$${rate.toFixed(2)}`;
  return `$${rate.toFixed(2)}/${config.unitLabel}`;
}

/**
 * Get the color status for MYA vs reference price.
 * Green = above ref (no PLC payment), Amber = within 5%, Red = below (PLC triggered)
 */
export function getMYAStatus(
  projectedMYA: number,
  effectiveRefPrice: number
): { status: 'above' | 'near' | 'below'; color: string; label: string } {
  const pct = (projectedMYA / effectiveRefPrice) * 100;

  if (pct >= 100) {
    return { status: 'above', color: '#22c55e', label: 'Above Reference' };
  } else if (pct >= 95) {
    return { status: 'near', color: '#f59e0b', label: 'Near Reference' };
  } else {
    return { status: 'below', color: '#ef4444', label: 'Below Reference' };
  }
}
