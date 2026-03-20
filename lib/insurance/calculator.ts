// =============================================================================
// HarvestFile — Phase 16B Build 1: Crop Insurance Calculator Engine
// lib/insurance/calculator.ts
//
// Implements the complete ARC/PLC + SCO/ECO + Individual RP calculation.
// This is the feature NO COMPETITOR HAS — integrated safety net modeling.
//
// Calculation flow:
//   1. Individual RP premium (by coverage level + unit structure)
//   2. SCO premium (coverage band from underlying level to 86%)
//   3. ECO premium (86% to 90% or 95%)
//   4. ARC-CO expected payment (OBBBA 90% guarantee, 12% cap)
//   5. PLC expected payment (effective reference price - projected MYA)
//   6. Combined net benefit for 4 scenario combinations
//
// Sources:
//   - RMA 20-SCO Endorsement methodology
//   - OBBBA §10301-10303 (ARC/PLC changes)
//   - farmdoc "Comparing Crop Insurance Scenarios with SCO and ECO" (Feb 2026)
//   - Iowa State Extension SCO/ECO documentation
// =============================================================================

import {
  PROJECTED_PRICES_2026,
  ARC_PLC_REF_2026,
  SUBSIDY_RATES,
  ESTIMATED_RP_RATES,
  ESTIMATED_SCO_RATES,
  ESTIMATED_ECO_RATES,
  SCO_TRIGGER_2026,
  ARC_GUARANTEE_PCT,
  ARC_MAX_PAYMENT_PCT,
  ARC_PAYMENT_ACRES_PCT,
  PLC_PAYMENT_ACRES_PCT,
  SEQUESTRATION_PCT,
  type CoverageLevel,
  type ScenarioType,
} from './constants';

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface FarmInputs {
  commodity: string;          // 'CORN', 'SOYBEANS', 'WHEAT'
  aphYield: number;           // Actual Production History yield (bu/acre)
  plantedAcres: number;       // Acres planted this year
  baseAcres: number;          // FSA base acres for this crop
  coverageLevel: CoverageLevel; // 50-85
  plcYield?: number;          // Farm-specific PLC yield (defaults to national)
  isBeginningFarmer?: boolean;
  countyYield?: number;       // Expected county yield (defaults to national)
}

// ─── Output Types ────────────────────────────────────────────────────────────

export interface RPPremiumResult {
  coverageLevel: number;
  liability: number;            // Total liability (guarantee)
  guaranteePerAcre: number;     // $/acre guarantee
  totalPremium: number;         // Before subsidy
  subsidyAmount: number;
  farmerPremium: number;        // What farmer pays
  farmerPremiumPerAcre: number;
}

export interface SCOPremiumResult {
  coverageBand: number;         // e.g., 0.11 for 75% underlying
  bandLabel: string;            // e.g., "75% → 86%"
  supplementalProtection: number; // $ value of the band
  supplementalProtectionPerAcre: number;
  totalPremium: number;
  subsidyAmount: number;
  farmerPremium: number;
  farmerPremiumPerAcre: number;
  expectedPayment: number;      // Based on historical loss ratios
  expectedPaymentPerAcre: number;
}

export interface ECOPremiumResult {
  ecoLevel: 'ECO-90' | 'ECO-95';
  coverageBand: number;
  bandLabel: string;
  totalPremium: number;
  subsidyAmount: number;
  farmerPremium: number;
  farmerPremiumPerAcre: number;
  expectedPayment: number;
  expectedPaymentPerAcre: number;
}

export interface ArcPaymentResult {
  benchmarkRevenue: number;
  guarantee: number;            // 90% of benchmark
  projectedRevenue: number;
  paymentRate: number;          // $/acre before sequestration
  paymentPerAcre: number;       // After sequestration, on 85% of base
  totalPayment: number;
  paymentAcres: number;         // 85% of base acres
}

export interface PlcPaymentResult {
  effectiveRefPrice: number;
  projectedMYA: number;
  paymentRate: number;          // $/bu
  paymentPerAcre: number;       // Rate × PLC yield × 85%
  totalPayment: number;
  paymentAcres: number;
}

export interface ScenarioResult {
  scenario: ScenarioType;
  rpPremium: RPPremiumResult;
  scoPremium: SCOPremiumResult | null;
  ecoPremium: ECOPremiumResult | null;
  arcPayment: ArcPaymentResult | null;
  plcPayment: PlcPaymentResult | null;

  // Aggregates
  totalFarmerPremium: number;
  totalFarmerPremiumPerAcre: number;
  totalExpectedBenefit: number;
  totalExpectedBenefitPerAcre: number;
  netBenefit: number;           // Expected benefits minus premiums
  netBenefitPerAcre: number;
  coverageFloor: number;        // Lowest coverage level (0-1)
  coverageCeiling: number;      // Highest coverage level (0-1)
}

// ─── Premium Calculations ────────────────────────────────────────────────────

/**
 * Calculate individual RP (Revenue Protection) premium.
 * Enterprise unit assumed (most common for row crops).
 */
export function calculateRPPremium(inputs: FarmInputs): RPPremiumResult {
  const { commodity, aphYield, plantedAcres, coverageLevel, isBeginningFarmer } = inputs;
  const price = PROJECTED_PRICES_2026[commodity];
  if (!price) throw new Error(`Unknown commodity: ${commodity}`);

  const rates = ESTIMATED_RP_RATES[commodity];
  if (!rates) throw new Error(`No RP rates for: ${commodity}`);

  const covPct = coverageLevel / 100;
  const guaranteePerAcre = aphYield * price.projectedPrice * covPct;
  const liability = guaranteePerAcre * plantedAcres;

  // Premium = liability × base rate
  const baseRate = rates[coverageLevel] || 0.05;
  const totalPremium = round(liability * baseRate, 2);

  // Subsidy: individual rate + enterprise bonus
  const indivSubsidy = SUBSIDY_RATES.individual[coverageLevel] || 0.55;
  const entBonus = SUBSIDY_RATES.enterpriseBonus[coverageLevel] || 0.20;
  let subsidyPct = Math.min(indivSubsidy + entBonus, 0.80);

  if (isBeginningFarmer) {
    subsidyPct = Math.min(subsidyPct + SUBSIDY_RATES.beginningFarmerBonus, 0.90);
  }

  const subsidyAmount = round(totalPremium * subsidyPct, 2);
  const farmerPremium = round(totalPremium - subsidyAmount, 2);

  return {
    coverageLevel,
    liability: round(liability, 2),
    guaranteePerAcre: round(guaranteePerAcre, 2),
    totalPremium,
    subsidyAmount,
    farmerPremium,
    farmerPremiumPerAcre: plantedAcres > 0 ? round(farmerPremium / plantedAcres, 2) : 0,
  };
}

/**
 * Calculate SCO (Supplemental Coverage Option) premium.
 * SCO covers from underlying coverage level up to 86% (2026).
 * Uses county-level (area) expected revenue, NOT farm-level.
 */
export function calculateSCOPremium(inputs: FarmInputs): SCOPremiumResult {
  const { commodity, aphYield, plantedAcres, coverageLevel, isBeginningFarmer } = inputs;
  const price = PROJECTED_PRICES_2026[commodity];
  if (!price) throw new Error(`Unknown commodity: ${commodity}`);

  const scoRate = ESTIMATED_SCO_RATES[commodity] || 0.15;
  const covPct = coverageLevel / 100;
  const scoBandWidth = SCO_TRIGGER_2026 - covPct; // e.g., 0.86 - 0.75 = 0.11

  if (scoBandWidth <= 0) {
    return {
      coverageBand: 0, bandLabel: `${coverageLevel}% → 86%`,
      supplementalProtection: 0, supplementalProtectionPerAcre: 0,
      totalPremium: 0, subsidyAmount: 0, farmerPremium: 0, farmerPremiumPerAcre: 0,
      expectedPayment: 0, expectedPaymentPerAcre: 0,
    };
  }

  // Expected crop value per acre
  const expectedValue = aphYield * price.projectedPrice;

  // Supplemental protection = band width × expected value × 100%
  const suppProtPerAcre = scoBandWidth * expectedValue;
  const suppProt = suppProtPerAcre * plantedAcres;

  // Premium = supplemental protection × SCO rate
  const totalPremium = round(suppProt * scoRate, 2);

  // OBBBA: 80% subsidy on SCO
  let subsidyPct = SUBSIDY_RATES.sco;
  if (isBeginningFarmer) {
    subsidyPct = Math.min(subsidyPct + SUBSIDY_RATES.beginningFarmerBonus, 0.90);
  }
  const subsidyAmount = round(totalPremium * subsidyPct, 2);
  const farmerPremium = round(totalPremium - subsidyAmount, 2);

  // Expected payment: use total premium as approximation (actuarially fair)
  // In practice, Midwest loss ratios are ~0.40-0.88, so expected payment ≈ total premium
  const expectedPayment = round(totalPremium, 2);

  return {
    coverageBand: round(scoBandWidth, 4),
    bandLabel: `${coverageLevel}% → 86%`,
    supplementalProtection: round(suppProt, 2),
    supplementalProtectionPerAcre: round(suppProtPerAcre, 2),
    totalPremium,
    subsidyAmount,
    farmerPremium,
    farmerPremiumPerAcre: plantedAcres > 0 ? round(farmerPremium / plantedAcres, 2) : 0,
    expectedPayment,
    expectedPaymentPerAcre: plantedAcres > 0 ? round(expectedPayment / plantedAcres, 2) : 0,
  };
}

/**
 * Calculate ECO (Enhanced Coverage Option) premium.
 * ECO covers from 86% up to 90% or 95%.
 */
export function calculateECOPremium(
  inputs: FarmInputs,
  ecoLevel: 'ECO-90' | 'ECO-95'
): ECOPremiumResult {
  const { commodity, aphYield, plantedAcres, isBeginningFarmer } = inputs;
  const price = PROJECTED_PRICES_2026[commodity];
  if (!price) throw new Error(`Unknown commodity: ${commodity}`);

  const ecoRates = ESTIMATED_ECO_RATES[commodity];
  if (!ecoRates) throw new Error(`No ECO rates for: ${commodity}`);

  // ECO band: 86% → 90% or 86% → 95%
  const trigger = ecoLevel === 'ECO-90' ? 0.90 : 0.95;
  const bandWidth = trigger - SCO_TRIGGER_2026; // 0.04 or 0.09
  const rate = ecoLevel === 'ECO-90' ? ecoRates.eco90 : ecoRates.eco95;

  const expectedValue = aphYield * price.projectedPrice;
  const bandValue = bandWidth * expectedValue * plantedAcres;

  const totalPremium = round(bandValue * rate, 2);

  let subsidyPct = SUBSIDY_RATES.eco;
  if (isBeginningFarmer) {
    subsidyPct = Math.min(subsidyPct + SUBSIDY_RATES.beginningFarmerBonus, 0.90);
  }
  const subsidyAmount = round(totalPremium * subsidyPct, 2);
  const farmerPremium = round(totalPremium - subsidyAmount, 2);

  // Expected payment ≈ total premium (actuarially fair pricing)
  const expectedPayment = round(totalPremium, 2);

  return {
    ecoLevel,
    coverageBand: round(bandWidth, 4),
    bandLabel: `86% → ${Math.round(trigger * 100)}%`,
    totalPremium,
    subsidyAmount,
    farmerPremium,
    farmerPremiumPerAcre: plantedAcres > 0 ? round(farmerPremium / plantedAcres, 2) : 0,
    expectedPayment,
    expectedPaymentPerAcre: plantedAcres > 0 ? round(expectedPayment / plantedAcres, 2) : 0,
  };
}

// ─── ARC-CO and PLC Payment Calculations ─────────────────────────────────────

/**
 * Calculate projected ARC-CO payment for 2026.
 * Uses national benchmark data (county-specific in Build 2).
 */
export function calculateArcPayment(inputs: FarmInputs): ArcPaymentResult {
  const { commodity, baseAcres, countyYield } = inputs;
  const ref = ARC_PLC_REF_2026[commodity];
  const price = PROJECTED_PRICES_2026[commodity];
  if (!ref || !price) throw new Error(`Unknown commodity: ${commodity}`);

  const yld = countyYield || ref.arcBenchmarkYieldNational;

  // Benchmark revenue = Olympic avg price × Olympic avg yield
  const benchmarkRevenue = ref.arcBenchmarkPrice * yld;
  const guarantee = ARC_GUARANTEE_PCT * benchmarkRevenue;

  // Projected actual revenue = projected MYA × expected county yield
  // Using current MYA projection from HarvestFile's MYA tracker
  const projectedRevenue = price.projectedPrice * yld;

  // Payment rate = min(guarantee - actual, 12% of benchmark)
  const rawPaymentRate = Math.max(0, guarantee - projectedRevenue);
  const maxPaymentRate = ARC_MAX_PAYMENT_PCT * benchmarkRevenue;
  const paymentRate = Math.min(rawPaymentRate, maxPaymentRate);

  // Payment on 85% of base acres, minus sequestration
  const paymentAcres = baseAcres * ARC_PAYMENT_ACRES_PCT;
  const paymentPerAcre = round(paymentRate * (1 - SEQUESTRATION_PCT), 2);
  const totalPayment = round(paymentPerAcre * paymentAcres, 2);

  return {
    benchmarkRevenue: round(benchmarkRevenue, 2),
    guarantee: round(guarantee, 2),
    projectedRevenue: round(projectedRevenue, 2),
    paymentRate: round(paymentRate, 2),
    paymentPerAcre,
    totalPayment,
    paymentAcres: round(paymentAcres, 2),
  };
}

/**
 * Calculate projected PLC payment for 2026.
 */
export function calculatePlcPayment(inputs: FarmInputs): PlcPaymentResult {
  const { commodity, baseAcres, plcYield } = inputs;
  const ref = ARC_PLC_REF_2026[commodity];
  const price = PROJECTED_PRICES_2026[commodity];
  if (!ref || !price) throw new Error(`Unknown commodity: ${commodity}`);

  const yld = plcYield || ref.plcYieldNational;

  // PLC rate = max(0, effective_ref_price - max(MYA, loan_rate))
  const plcRate = Math.max(0, ref.effectiveRefPrice - Math.max(price.projectedPrice, ref.loanRate));

  // Payment on 85% of base acres × PLC yield
  const paymentAcres = baseAcres * PLC_PAYMENT_ACRES_PCT;
  const paymentPerAcre = round(plcRate * yld * (1 - SEQUESTRATION_PCT), 2);
  const totalPayment = round(paymentPerAcre * (paymentAcres / baseAcres) * baseAcres, 2);

  return {
    effectiveRefPrice: ref.effectiveRefPrice,
    projectedMYA: price.projectedPrice,
    paymentRate: round(plcRate, 4),
    paymentPerAcre,
    totalPayment: round(plcRate * yld * (1 - SEQUESTRATION_PCT) * paymentAcres, 2),
    paymentAcres: round(paymentAcres, 2),
  };
}

// ─── Scenario Comparison Engine ──────────────────────────────────────────────

/**
 * Calculate all four scenarios and return sorted by net benefit.
 * This is the core output of the Coverage Optimizer.
 */
export function calculateAllScenarios(inputs: FarmInputs): ScenarioResult[] {
  const scenarios: ScenarioResult[] = [];

  // Common calculations
  const rpPremium = calculateRPPremium(inputs);
  const scoPremium = calculateSCOPremium(inputs);
  const eco95 = calculateECOPremium(inputs, 'ECO-95');
  const arcPayment = calculateArcPayment(inputs);
  const plcPayment = calculatePlcPayment(inputs);

  const covPct = inputs.coverageLevel / 100;

  // ── Scenario 1: ARC-CO + RP + SCO + ECO-95% ──
  scenarios.push(buildScenario(
    'arc_sco_eco95', rpPremium, scoPremium, eco95,
    arcPayment, null, inputs, covPct
  ));

  // ── Scenario 2: PLC + RP + SCO + ECO-95% ──
  scenarios.push(buildScenario(
    'plc_sco_eco95', rpPremium, scoPremium, eco95,
    null, plcPayment, inputs, covPct
  ));

  // ── Scenario 3: ARC-CO + RP + SCO (no ECO) ──
  scenarios.push(buildScenario(
    'arc_sco_only', rpPremium, scoPremium, null,
    arcPayment, null, inputs, covPct
  ));

  // ── Scenario 4: PLC + RP only (no SCO/ECO) ──
  scenarios.push(buildScenario(
    'plc_rp_only', rpPremium, null, null,
    null, plcPayment, inputs, covPct
  ));

  // Sort by net benefit (highest first)
  scenarios.sort((a, b) => b.netBenefitPerAcre - a.netBenefitPerAcre);

  return scenarios;
}

function buildScenario(
  scenario: ScenarioType,
  rpPremium: RPPremiumResult,
  scoPremium: SCOPremiumResult | null,
  ecoPremium: ECOPremiumResult | null,
  arcPayment: ArcPaymentResult | null,
  plcPayment: PlcPaymentResult | null,
  inputs: FarmInputs,
  covPct: number,
): ScenarioResult {
  const acres = inputs.plantedAcres || 1;

  // Total farmer-paid premiums
  const totalFarmerPremium =
    rpPremium.farmerPremium +
    (scoPremium?.farmerPremium || 0) +
    (ecoPremium?.farmerPremium || 0);

  // Total expected benefits (ARC/PLC is free + expected insurance payments)
  // ARC/PLC payments go on base acres; insurance on planted acres
  const arcPlcBenefit = arcPayment?.totalPayment || plcPayment?.totalPayment || 0;
  const insuranceExpectedBenefit =
    (scoPremium?.expectedPayment || 0) +
    (ecoPremium?.expectedPayment || 0);
  const totalExpectedBenefit = arcPlcBenefit + insuranceExpectedBenefit;

  // Determine coverage floor and ceiling
  const coverageFloor = covPct; // Individual RP coverage
  let coverageCeiling = covPct;
  if (scoPremium && scoPremium.coverageBand > 0) coverageCeiling = SCO_TRIGGER_2026;
  if (ecoPremium) {
    coverageCeiling = ecoPremium.ecoLevel === 'ECO-95' ? 0.95 : 0.90;
  }

  return {
    scenario,
    rpPremium,
    scoPremium,
    ecoPremium,
    arcPayment,
    plcPayment,
    totalFarmerPremium: round(totalFarmerPremium, 2),
    totalFarmerPremiumPerAcre: round(totalFarmerPremium / acres, 2),
    totalExpectedBenefit: round(totalExpectedBenefit, 2),
    totalExpectedBenefitPerAcre: round(totalExpectedBenefit / acres, 2),
    netBenefit: round(totalExpectedBenefit - totalFarmerPremium, 2),
    netBenefitPerAcre: round((totalExpectedBenefit - totalFarmerPremium) / acres, 2),
    coverageFloor,
    coverageCeiling,
  };
}

// ─── Coverage Band Data for Visualization ────────────────────────────────────

export interface CoverageBand {
  label: string;
  from: number;       // 0-1
  to: number;         // 0-1
  color: string;
  type: 'rp' | 'sco' | 'eco' | 'arc' | 'gap';
  premiumPerAcre: number;
  paymentPerAcre: number;
  description: string;
}

/**
 * Generate the coverage band data for the "layer cake" visualization.
 * Returns ordered bands from lowest coverage to highest.
 */
export function getCoverageBands(
  inputs: FarmInputs,
  includeArc: boolean,
  includeSco: boolean,
  includeEco: 'ECO-90' | 'ECO-95' | null,
): CoverageBand[] {
  const bands: CoverageBand[] = [];
  const covPct = inputs.coverageLevel / 100;
  const rp = calculateRPPremium(inputs);

  // Band 1: Individual RP (0 → coverage level)
  bands.push({
    label: `Revenue Protection (${inputs.coverageLevel}%)`,
    from: 0,
    to: covPct,
    color: '#3B82F6',    // Blue
    type: 'rp',
    premiumPerAcre: rp.farmerPremiumPerAcre,
    paymentPerAcre: 0,   // RP pays on farm-level losses, not modeled here
    description: `Farm-level protection. Pays when YOUR revenue falls below ${inputs.coverageLevel}% of guarantee.`,
  });

  // Band 2: SCO (coverage level → 86%)
  if (includeSco && covPct < SCO_TRIGGER_2026) {
    const sco = calculateSCOPremium(inputs);
    bands.push({
      label: `SCO (${inputs.coverageLevel}% → 86%)`,
      from: covPct,
      to: SCO_TRIGGER_2026,
      color: '#8B5CF6',  // Purple
      type: 'sco',
      premiumPerAcre: sco.farmerPremiumPerAcre,
      paymentPerAcre: sco.expectedPaymentPerAcre,
      description: `County-based coverage. Pays when county revenue drops into this band. 80% subsidized.`,
    });
  } else if (!includeSco && covPct < SCO_TRIGGER_2026) {
    bands.push({
      label: `Gap (${inputs.coverageLevel}% → 86%)`,
      from: covPct,
      to: SCO_TRIGGER_2026,
      color: '#374151',  // Gray
      type: 'gap',
      premiumPerAcre: 0,
      paymentPerAcre: 0,
      description: `No coverage in this band. Consider adding SCO to fill this gap.`,
    });
  }

  // Band 3: ECO (86% → 90% or 95%)
  if (includeEco) {
    const eco = calculateECOPremium(inputs, includeEco);
    const trigger = includeEco === 'ECO-95' ? 0.95 : 0.90;
    bands.push({
      label: `${includeEco} (86% → ${Math.round(trigger * 100)}%)`,
      from: SCO_TRIGGER_2026,
      to: trigger,
      color: '#EC4899',  // Pink
      type: 'eco',
      premiumPerAcre: eco.farmerPremiumPerAcre,
      paymentPerAcre: eco.expectedPaymentPerAcre,
      description: `Enhanced county coverage for shallow losses. 80% subsidized. Highest expected return.`,
    });
  }

  // Band 4: ARC-CO (separate visualization — county benchmark based)
  if (includeArc) {
    const arc = calculateArcPayment(inputs);
    bands.push({
      label: 'ARC-CO (78% → 90% benchmark)',
      from: 0.78,
      to: 0.90,
      color: '#10B981',  // Emerald
      type: 'arc',
      premiumPerAcre: 0,  // Free!
      paymentPerAcre: arc.paymentPerAcre,
      description: `Free USDA program on base acres. Pays when county revenue falls below 90% of benchmark. No premium.`,
    });
  }

  return bands;
}

// ─── Helper: Generate verdict text ───────────────────────────────────────────

export function getVerdict(scenarios: ScenarioResult[]): {
  bestScenario: ScenarioType;
  verdict: string;
  savingsVsSimplest: number;
} {
  const best = scenarios[0]; // Already sorted by net benefit
  const simplest = scenarios.find(s => s.scenario === 'plc_rp_only');
  const savingsVsSimplest = simplest
    ? round(best.netBenefitPerAcre - simplest.netBenefitPerAcre, 2)
    : 0;

  let verdict = '';

  if (best.scenario === 'arc_sco_eco95') {
    verdict = `Full stacking with ARC-CO is your strongest option. The combination of free ARC-CO payments on your ${best.arcPayment?.paymentAcres || 0} base acres plus SCO and ECO-95% on your ${best.rpPremium.coverageLevel}% RP generates an estimated net benefit of $${best.netBenefitPerAcre}/acre — $${savingsVsSimplest}/acre more than PLC + RP alone.`;
  } else if (best.scenario === 'plc_sco_eco95') {
    verdict = `PLC with full insurance stacking is your best bet. With projected MYA prices well below the effective reference price, PLC generates strong payments while SCO and ECO-95% provide comprehensive county-based coverage. Net benefit: $${best.netBenefitPerAcre}/acre.`;
  } else if (best.scenario === 'arc_sco_only') {
    verdict = `ARC-CO plus SCO (without ECO) balances coverage and cost. This option provides county-level protection to 86% while keeping premiums lower than the full stack. Net benefit: $${best.netBenefitPerAcre}/acre.`;
  } else {
    verdict = `For your operation, the simpler PLC + RP approach works best. Adding SCO and ECO would cost more in premiums than the expected additional coverage benefit. Net benefit: $${best.netBenefitPerAcre}/acre.`;
  }

  return {
    bestScenario: best.scenario,
    verdict,
    savingsVsSimplest,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
