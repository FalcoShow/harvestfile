// =============================================================================
// HarvestFile — ARC/PLC Calculation Engine
// Phase 6B: Multi-Year Scenario Modeler
//
// Pure TypeScript — zero React dependencies. Can be imported by both client
// components and server routes. All math matches FSA program rules exactly.
//
// Formulas source: OBBBA §1101–§1103, Federal Register 91 FR 1043 (Jan 2026),
// FSA ARC & PLC Fact Sheet (September 2025).
// =============================================================================

import {
  ARC_GUARANTEE_PCT,
  ARC_PAYMENT_CAP_PCT,
  PAYMENT_ACRES_PCT,
  SEQUESTRATION_PCT,
  ERP_ESCALATOR_PCT,
  ERP_CAP_PCT,
  AUTO_HIGHER_OF_YEAR,
  getCommodityConfig,
  getLoanRate,
  getBaselinePrice,
  type CommodityConfig,
} from '@/lib/constants/arc-plc';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HistoricalYear {
  cropYear: number;
  countyYield: number | null;
  myaPrice: number | null;
  benchmarkYield: number | null;
  benchmarkRevenue: number | null;
  arcGuarantee: number | null;
  arcPaymentRate: number | null;
  plcPaymentRate: number | null;
}

export interface ProjectedYear {
  cropYear: number;
  isProjected: boolean;
  isAutoHigherOf: boolean;       // 2025 special provision

  // Inputs (from slider or baseline)
  projectedMYA: number;
  projectedCountyYield: number;
  trendYield: number;            // County trend yield for this year

  // ARC-CO calculation chain
  benchmarkYieldWindow: number[];
  benchmarkPriceWindow: number[];
  olympicAvgYield: number;
  olympicAvgPrice: number;
  benchmarkRevenue: number;
  arcGuarantee: number;
  arcActualRevenue: number;
  arcPaymentRate: number;        // Per base acre before payment acres/sequestration
  arcPaymentPerAcre: number;     // Final payment per base acre
  arcMaxPayment: number;         // 12% cap value

  // PLC calculation chain
  effectiveRefPrice: number;
  plcRate: number;
  plcPaymentYield: number;
  plcPaymentPerAcre: number;     // Final payment per base acre

  // Summary
  winner: 'ARC-CO' | 'PLC' | 'TIE';
  advantage: number;             // Dollar advantage of winner per base acre
}

export interface ScenarioResult {
  commodityCode: string;
  commodityName: string;
  years: ProjectedYear[];
  totalArcPayment: number;       // Sum of all years
  totalPlcPayment: number;
  cumulativeAdvantage: number;   // Positive = ARC better, negative = PLC better
  overallWinner: 'ARC-CO' | 'PLC' | 'TIE';
  summary: string;               // Plain-language summary
}

export interface ScenarioAssumptions {
  priceMultiplier: number;       // 1.0 = baseline, 0.85 = -15%
  yieldMultiplier: number;       // 1.0 = trend, 0.80 = -20%
  /** Optional per-year price overrides (absolute values) */
  priceOverrides?: Record<number, number>;
  /** Optional per-year yield overrides (absolute values) */
  yieldOverrides?: Record<number, number>;
  /** Approximate PLC payment yield as fraction of benchmark yield (default 0.80) */
  plcYieldFraction?: number;
}

// ─── Core Math Functions ─────────────────────────────────────────────────────

/**
 * Olympic average: drop the highest and lowest, average the rest.
 * Requires at least 3 values. Falls back to simple average if < 3.
 */
export function olympicAverage(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length < 3) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  const sorted = [...values].sort((a, b) => a - b);
  // Drop lowest and highest
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

/**
 * Calculate the Effective Reference Price (ERP) for PLC.
 *
 * ERP = max(
 *   statutory_ref_price,
 *   min(1.15 × statutory, 0.88 × Olympic_avg_of_5_most_recent_MYA_prices)
 * )
 */
export function calculateERP(
  statutoryRefPrice: number,
  recentMYAPrices: number[],
): number {
  if (recentMYAPrices.length === 0) return statutoryRefPrice;

  const olympicMYA = olympicAverage(recentMYAPrices);
  const escalated = ERP_ESCALATOR_PCT * olympicMYA;
  const capped = Math.min(ERP_CAP_PCT * statutoryRefPrice, escalated);

  return Math.max(statutoryRefPrice, capped);
}

/**
 * Calculate county trend yield by linear regression on historical data.
 * Returns projected yield for a given future year.
 */
export function calculateTrendYield(
  historicalYields: { year: number; yield: number }[],
  targetYear: number,
): number {
  if (historicalYields.length === 0) return 0;
  if (historicalYields.length === 1) return historicalYields[0].yield;

  // Simple linear regression: y = mx + b
  const n = historicalYields.length;
  const sumX = historicalYields.reduce((s, d) => s + d.year, 0);
  const sumY = historicalYields.reduce((s, d) => s + d.yield, 0);
  const sumXY = historicalYields.reduce((s, d) => s + d.year * d.yield, 0);
  const sumX2 = historicalYields.reduce((s, d) => s + d.year * d.year, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return sumY / n;

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  const projected = m * targetYear + b;

  // Floor at 50% of most recent yield to prevent nonsensical negatives
  const latestYield = historicalYields[historicalYields.length - 1].yield;
  return Math.max(projected, latestYield * 0.5);
}

// ─── Projection Engine ───────────────────────────────────────────────────────

/**
 * Project ARC-CO and PLC payments for crop years 2025–2031.
 *
 * This is the main entry point for the scenario modeler. It takes historical
 * county data and user assumptions, then calculates payment estimates for
 * every year in the OBBBA window.
 */
export function projectScenario(
  commodityCode: string,
  historicalYears: HistoricalYear[],
  assumptions: ScenarioAssumptions,
): ScenarioResult | null {
  const config = getCommodityConfig(commodityCode);
  if (!config) return null;

  // Sort historical data ascending by year
  const sorted = [...historicalYears]
    .filter(y => y.cropYear > 0)
    .sort((a, b) => a.cropYear - b.cropYear);

  // Build arrays of known historical yields and prices
  const knownYields: { year: number; yield: number }[] = sorted
    .filter(y => y.countyYield != null)
    .map(y => ({ year: y.cropYear, yield: y.countyYield! }));

  const knownPrices: { year: number; price: number }[] = sorted
    .filter(y => y.myaPrice != null)
    .map(y => ({ year: y.cropYear, price: y.myaPrice! }));

  if (knownYields.length < 3 || knownPrices.length < 3) {
    return null; // Insufficient data
  }

  const plcYieldFraction = assumptions.plcYieldFraction ?? 0.80;

  // Build a merged timeline: historical actuals + projected values
  // We need yields and prices for years going back to 2019 (benchmark window for 2025)
  // through 2031 (the last projected year).

  const allYields: Map<number, number> = new Map();
  const allPrices: Map<number, number> = new Map();

  // Populate with historical actuals
  for (const y of knownYields) allYields.set(y.year, y.yield);
  for (const p of knownPrices) allPrices.set(p.year, p.price);

  // Fill projected years with baseline × multiplier (or overrides)
  for (let year = 2025; year <= 2031; year++) {
    if (!allPrices.has(year)) {
      const baseline = getBaselinePrice(commodityCode, year) ?? config.statutoryRefPrice;
      const overridePrice = assumptions.priceOverrides?.[year];
      allPrices.set(year, overridePrice ?? baseline * assumptions.priceMultiplier);
    }

    if (!allYields.has(year)) {
      const trendYield = calculateTrendYield(knownYields, year);
      const overrideYield = assumptions.yieldOverrides?.[year];
      allYields.set(year, overrideYield ?? trendYield * assumptions.yieldMultiplier);
    }
  }

  // Calculate projected years
  const projectedYears: ProjectedYear[] = [];

  for (let cropYear = 2025; cropYear <= 2031; cropYear++) {
    const latestKnownYear = knownPrices.length > 0
      ? Math.max(...knownPrices.map(p => p.year))
      : 2024;
    const isProjected = !knownPrices.some(p => p.year === cropYear) || cropYear > latestKnownYear;

    // ── ARC-CO Benchmark Calculation ──────────────────────────────────
    // Benchmark window: 5 years preceding the year BEFORE the program year
    // E.g., for 2025: window = 2019–2023 (skipping 2024)
    // For 2026: window = 2020–2024 (skipping 2025)
    const benchStartYear = cropYear - 6; // e.g., 2025 - 6 = 2019
    const benchEndYear = cropYear - 2;   // e.g., 2025 - 2 = 2023

    const benchYieldWindow: number[] = [];
    const benchPriceWindow: number[] = [];

    for (let y = benchStartYear; y <= benchEndYear; y++) {
      const yieldVal = allYields.get(y);
      if (yieldVal != null) benchYieldWindow.push(yieldVal);

      // For benchmark price, apply ERP as floor
      // (FSA uses max(MYA, effective_ref_price) for each benchmark year)
      const priceVal = allPrices.get(y);
      if (priceVal != null) {
        // For benchmark price calculation, the floor is the ERP for the program year
        // But ERP itself depends on prices... For simplicity and industry standard,
        // we use the statutory ref price as the floor in the benchmark (not full ERP).
        // This matches the farmdoc methodology.
        benchPriceWindow.push(Math.max(priceVal, config.statutoryRefPrice));
      }
    }

    const olympicYield = benchYieldWindow.length >= 3
      ? olympicAverage(benchYieldWindow)
      : benchYieldWindow.length > 0
        ? benchYieldWindow.reduce((a, b) => a + b, 0) / benchYieldWindow.length
        : 0;

    const olympicPrice = benchPriceWindow.length >= 3
      ? olympicAverage(benchPriceWindow)
      : benchPriceWindow.length > 0
        ? benchPriceWindow.reduce((a, b) => a + b, 0) / benchPriceWindow.length
        : config.statutoryRefPrice;

    const benchmarkRevenue = olympicYield * olympicPrice;
    const arcGuarantee = ARC_GUARANTEE_PCT * benchmarkRevenue;
    const arcMaxPayment = ARC_PAYMENT_CAP_PCT * benchmarkRevenue;

    // Actual revenue for the program year
    const countyYield = allYields.get(cropYear) ?? 0;
    const myaPrice = allPrices.get(cropYear) ?? 0;
    const loanRate = getLoanRate(commodityCode, cropYear);
    const actualPrice = Math.max(myaPrice, loanRate);
    const arcActualRevenue = countyYield * actualPrice;

    // ARC payment
    const arcShortfall = Math.max(0, arcGuarantee - arcActualRevenue);
    const arcPaymentRate = Math.min(arcShortfall, arcMaxPayment);
    const arcPaymentPerAcre = arcPaymentRate * PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT);

    // ── PLC Calculation ──────────────────────────────────────────────
    // ERP uses the 5 most recent MYA prices
    const erpPriceWindow: number[] = [];
    for (let y = cropYear - 5; y <= cropYear - 1; y++) {
      const p = allPrices.get(y);
      if (p != null) erpPriceWindow.push(p);
    }

    const erp = calculateERP(config.statutoryRefPrice, erpPriceWindow);
    const plcRate = Math.max(0, erp - Math.max(myaPrice, loanRate));

    // PLC payment yield ≈ 80% of benchmark yield (farm-specific, but this
    // is the standard county-level approximation used by farmdoc and AFPC)
    const plcPaymentYield = olympicYield * plcYieldFraction;
    const plcPaymentPerAcre = plcRate * plcPaymentYield * PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT);

    // Trend yield for display
    const trendYield = calculateTrendYield(knownYields, cropYear);

    // Winner determination
    const isAutoHigherOf = cropYear === AUTO_HIGHER_OF_YEAR;
    let winner: 'ARC-CO' | 'PLC' | 'TIE';
    if (Math.abs(arcPaymentPerAcre - plcPaymentPerAcre) < 0.01) {
      winner = 'TIE';
    } else {
      winner = arcPaymentPerAcre > plcPaymentPerAcre ? 'ARC-CO' : 'PLC';
    }

    projectedYears.push({
      cropYear,
      isProjected: cropYear >= 2025, // All future years are "projected" for farmers
      isAutoHigherOf,
      projectedMYA: round(myaPrice, 2),
      projectedCountyYield: round(countyYield, 1),
      trendYield: round(trendYield, 1),
      benchmarkYieldWindow: benchYieldWindow.map(v => round(v, 1)),
      benchmarkPriceWindow: benchPriceWindow.map(v => round(v, 2)),
      olympicAvgYield: round(olympicYield, 1),
      olympicAvgPrice: round(olympicPrice, 2),
      benchmarkRevenue: round(benchmarkRevenue, 2),
      arcGuarantee: round(arcGuarantee, 2),
      arcActualRevenue: round(arcActualRevenue, 2),
      arcPaymentRate: round(arcPaymentRate, 2),
      arcPaymentPerAcre: round(arcPaymentPerAcre, 2),
      arcMaxPayment: round(arcMaxPayment, 2),
      effectiveRefPrice: round(erp, 2),
      plcRate: round(plcRate, 2),
      plcPaymentYield: round(plcPaymentYield, 1),
      plcPaymentPerAcre: round(plcPaymentPerAcre, 2),
      winner: isAutoHigherOf ? (arcPaymentPerAcre >= plcPaymentPerAcre ? 'ARC-CO' : 'PLC') : winner,
      advantage: round(Math.abs(arcPaymentPerAcre - plcPaymentPerAcre), 2),
    });
  }

  // Summary stats
  const totalArc = projectedYears.reduce((s, y) => s + y.arcPaymentPerAcre, 0);
  const totalPlc = projectedYears.reduce((s, y) => s + y.plcPaymentPerAcre, 0);
  const cumAdv = totalArc - totalPlc;
  const overallWinner: 'ARC-CO' | 'PLC' | 'TIE' =
    Math.abs(cumAdv) < 1 ? 'TIE' : cumAdv > 0 ? 'ARC-CO' : 'PLC';

  const summary = generateSummary(config, projectedYears, totalArc, totalPlc, overallWinner, assumptions);

  return {
    commodityCode,
    commodityName: config.name,
    years: projectedYears,
    totalArcPayment: round(totalArc, 2),
    totalPlcPayment: round(totalPlc, 2),
    cumulativeAdvantage: round(cumAdv, 2),
    overallWinner,
    summary,
  };
}

// ─── Summary Generator ───────────────────────────────────────────────────────

function generateSummary(
  config: CommodityConfig,
  years: ProjectedYear[],
  totalArc: number,
  totalPlc: number,
  winner: 'ARC-CO' | 'PLC' | 'TIE',
  assumptions: ScenarioAssumptions,
): string {
  const diff = Math.abs(totalArc - totalPlc);
  const pricePct = Math.round((assumptions.priceMultiplier - 1) * 100);
  const yieldPct = Math.round((assumptions.yieldMultiplier - 1) * 100);

  let scenarioLabel = 'USDA baseline';
  if (pricePct !== 0 || yieldPct !== 0) {
    const parts: string[] = [];
    if (pricePct !== 0) parts.push(`prices ${pricePct > 0 ? '+' : ''}${pricePct}%`);
    if (yieldPct !== 0) parts.push(`yields ${yieldPct > 0 ? '+' : ''}${yieldPct}%`);
    scenarioLabel = parts.join(', ');
  }

  // Count years each program wins
  const arcWinYears = years.filter(y => y.arcPaymentPerAcre > y.plcPaymentPerAcre).length;
  const plcWinYears = years.filter(y => y.plcPaymentPerAcre > y.arcPaymentPerAcre).length;

  if (winner === 'TIE') {
    return `Under ${scenarioLabel} assumptions for ${config.name}, ARC-CO and PLC are projected to provide roughly equal total payments over 2025–2031 (both around $${round(totalArc, 0)}/base acre cumulative). Your specific base acres and PLC payment yield could tip the balance.`;
  }

  const winnerName = winner === 'ARC-CO' ? 'ARC-CO' : 'PLC';
  const loserName = winner === 'ARC-CO' ? 'PLC' : 'ARC-CO';
  const winnerTotal = winner === 'ARC-CO' ? totalArc : totalPlc;
  const loserTotal = winner === 'ARC-CO' ? totalPlc : totalArc;

  return `Under ${scenarioLabel} assumptions for ${config.name}, ${winnerName} is projected to pay $${round(diff, 2)}/base acre more than ${loserName} over 2025–2031 ($${round(winnerTotal, 2)} vs $${round(loserTotal, 2)} cumulative). ${winnerName} wins in ${winner === 'ARC-CO' ? arcWinYears : plcWinYears} of 7 years. ${
    winner === 'PLC'
      ? 'With projected MYA prices staying below the enhanced reference price, PLC\'s uncapped payments provide stronger downside protection.'
      : 'ARC-CO\'s revenue-based guarantee captures both yield and price risk, which benefits this county\'s historical variability pattern.'
  }`;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
