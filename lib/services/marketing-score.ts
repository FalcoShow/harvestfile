// =============================================================================
// lib/services/marketing-score.ts
// HarvestFile — Surface 2 Deploy 3A: Marketing Score Engine
//
// Extracted from app/(marketing)/grain/page.tsx into a standalone service
// so it can be consumed by both:
//   1. The /morning Farm Command Center (Marketing Score gauge card)
//   2. The /grain page (legacy, until fully sunset)
//   3. The 6 AM email digest (future)
//   4. The AI Farm Advisor context (future)
//
// The Marketing Score is a 0–100 composite index synthesizing five signals:
//   • Profitability (30%): futures price vs. cost of production
//   • Seasonal timing (25%): historical monthly price patterns
//   • Market structure (20%): futures curve shape (backwardation vs. contango)
//   • Storage cost burn (15%): how fast holding costs erode margin
//   • Basis opportunity (10%): local cash vs. futures spread (enhanced with Barchart)
//
// Score interpretation:
//   80–100 = Strong Sell (green)  — conditions strongly favor selling
//   65–79  = Favorable (gold)     — consider marketing 25–50%
//   45–64  = Neutral (gray)       — no strong signal, monitor closely
//   30–44  = Hold (amber)         — patience favored, seasonal strength ahead
//   0–29   = Strong Hold (blue)   — market signals favor waiting
// =============================================================================

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketingScoreInput {
  /** Cost of production per unit ($/bu, $/cwt, $/lb) */
  costPerUnit: number;
  /** Current nearby futures price ($/unit) */
  futuresPrice: number | null;
  /** Deferred contract price for curve shape analysis */
  deferredPrice?: number | null;
  /** Crop code: CORN, SOYBEANS, WHEAT, COTTON, RICE */
  cropCode: string;
  /** When grain entered storage (ISO date string) */
  storageStartDate?: string;
  /** Monthly storage cost per unit */
  storageCostPerMonth?: number;
  /** Current basis (cash - futures) from local elevator. Negative = "under" */
  currentBasis?: number | null;
  /** 3-year average basis for the same calendar week */
  historicalBasis?: number | null;
}

export interface ScoreBreakdown {
  profitability: number;
  seasonal: number;
  curveShape: number;
  storageBurn: number;
  basisOpportunity: number;
  composite: number;
}

export interface ScoreLabel {
  label: string;
  color: string;
  bg: string;
  recommendation: string;
}

export interface CropConfig {
  name: string;
  unit: string;
  color: string;
  defaultCost: number;
  storageCost: number;
  shrinkRate: number;
  seasonalIndex: number[];
  peakMonths: string;
  troughMonths: string;
}

// ─── Crop Configuration ──────────────────────────────────────────────────────
// Seasonal indices based on 10-year USDA cash price averages normalized to
// annual mean. 1.0 = average, >1.0 = historically above-average price month.

export const CROP_CONFIGS: Record<string, CropConfig> = {
  CORN: {
    name: 'Corn',
    unit: '$/bu',
    color: '#F59E0B',
    defaultCost: 4.20,
    storageCost: 0.05,
    shrinkRate: 0.0015,
    seasonalIndex: [1.02, 1.04, 1.05, 1.04, 1.03, 1.02, 0.99, 0.97, 0.96, 0.94, 0.96, 0.98],
    peakMonths: 'Feb–May',
    troughMonths: 'Sep–Oct',
  },
  SOYBEANS: {
    name: 'Soybeans',
    unit: '$/bu',
    color: '#059669',
    defaultCost: 10.50,
    storageCost: 0.05,
    shrinkRate: 0.001,
    seasonalIndex: [1.01, 1.02, 1.03, 1.03, 1.04, 1.05, 1.03, 0.99, 0.96, 0.93, 0.95, 0.97],
    peakMonths: 'May–Jul',
    troughMonths: 'Sep–Oct',
  },
  WHEAT: {
    name: 'Wheat',
    unit: '$/bu',
    color: '#D97706',
    defaultCost: 5.80,
    storageCost: 0.05,
    shrinkRate: 0.001,
    seasonalIndex: [1.01, 1.02, 1.04, 1.05, 1.04, 1.02, 0.97, 0.96, 0.95, 0.97, 0.98, 1.00],
    peakMonths: 'Mar–May',
    troughMonths: 'Jul–Sep',
  },
  COTTON: {
    name: 'Cotton',
    unit: '$/lb',
    color: '#EC4899',
    defaultCost: 0.75,
    storageCost: 0.003,
    shrinkRate: 0.0005,
    seasonalIndex: [0.99, 1.00, 1.02, 1.03, 1.04, 1.03, 1.01, 0.99, 0.97, 0.96, 0.97, 0.99],
    peakMonths: 'Apr–Jun',
    troughMonths: 'Sep–Nov',
  },
  RICE: {
    name: 'Rice',
    unit: '$/cwt',
    color: '#06B6D4',
    defaultCost: 15.00,
    storageCost: 0.10,
    shrinkRate: 0.001,
    seasonalIndex: [1.01, 1.02, 1.03, 1.04, 1.03, 1.02, 1.00, 0.98, 0.96, 0.95, 0.97, 0.99],
    peakMonths: 'Mar–Jun',
    troughMonths: 'Sep–Oct',
  },
};

// ─── Score Calculation ───────────────────────────────────────────────────────

export function calculateMarketingScore(input: MarketingScoreInput): ScoreBreakdown {
  const crop = CROP_CONFIGS[input.cropCode];
  if (!crop) {
    return { profitability: 50, seasonal: 50, curveShape: 50, storageBurn: 50, basisOpportunity: 50, composite: 50 };
  }

  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const costPerUnit = input.costPerUnit || crop.defaultCost;
  const storageCostPerMonth = input.storageCostPerMonth ?? crop.storageCost;

  // ── 1) PROFITABILITY (30% weight) ──────────────────────────────────────
  // How far above/below breakeven is the current market?
  let profitability = 50;
  if (input.futuresPrice && costPerUnit > 0) {
    const marginPct = (input.futuresPrice - costPerUnit) / costPerUnit;
    if (marginPct >= 0.20) profitability = 95;
    else if (marginPct >= 0.15) profitability = 85;
    else if (marginPct >= 0.10) profitability = 75;
    else if (marginPct >= 0.05) profitability = 65;
    else if (marginPct >= 0) profitability = 55;
    else if (marginPct >= -0.05) profitability = 40;
    else if (marginPct >= -0.10) profitability = 25;
    else profitability = 10;
  }

  // ── 2) SEASONAL INDEX (25% weight) ─────────────────────────────────────
  // Are we in a historically strong price month?
  const seasonal = Math.round(
    Math.min(100, Math.max(0, (crop.seasonalIndex[month] - 0.93) / (1.05 - 0.93) * 100))
  );

  // ── 3) FUTURES CURVE SHAPE (20% weight) ────────────────────────────────
  // Backwardation (nearby > deferred) = market wants grain now = high score
  // Contango (deferred > nearby) = market pays to wait = lower score
  let curveShape = 50;
  if (input.futuresPrice && input.deferredPrice) {
    const spread = input.futuresPrice - input.deferredPrice;
    const spreadPct = spread / input.futuresPrice;
    if (spreadPct > 0.03) curveShape = 90;
    else if (spreadPct > 0.01) curveShape = 75;
    else if (spreadPct > -0.01) curveShape = 50;
    else if (spreadPct > -0.03) curveShape = 30;
    else curveShape = 15;
  }

  // ── 4) STORAGE COST BURN (15% weight) ──────────────────────────────────
  // How much are holding costs eating into margin?
  let storageBurn = 50;
  if (input.futuresPrice && costPerUnit > 0) {
    const storageStart = input.storageStartDate ? new Date(input.storageStartDate) : now;
    const monthsStored = Math.max(0, (now.getTime() - storageStart.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const totalStorageCost = monthsStored * storageCostPerMonth;
    const shrinkCost = monthsStored * crop.shrinkRate * input.futuresPrice;
    const interestCost = monthsStored * (costPerUnit * 0.06 / 12); // 6% annual
    const totalCarry = totalStorageCost + shrinkCost + interestCost;
    const grossMargin = input.futuresPrice - costPerUnit;

    if (grossMargin > 0) {
      if (totalCarry > grossMargin * 0.5) storageBurn = 85;
      else if (totalCarry > grossMargin * 0.3) storageBurn = 70;
      else if (totalCarry > grossMargin * 0.15) storageBurn = 55;
      else storageBurn = 35;
    } else {
      // Already underwater — storage makes it worse
      storageBurn = monthsStored > 3 ? 90 : 70;
    }
  }

  // ── 5) BASIS OPPORTUNITY (10% weight) ──────────────────────────────────
  // Enhanced: compare current local basis to historical average.
  // Stronger-than-average basis = sell signal (local demand elevated).
  let basisOpportunity = 50; // neutral default
  if (input.currentBasis !== null && input.currentBasis !== undefined && input.historicalBasis !== null && input.historicalBasis !== undefined) {
    const basisDelta = input.currentBasis - input.historicalBasis;
    // basisDelta > 0 means current basis is stronger than historical → sell signal
    if (basisDelta > 0.15) basisOpportunity = 90;
    else if (basisDelta > 0.08) basisOpportunity = 75;
    else if (basisDelta > 0.02) basisOpportunity = 60;
    else if (basisDelta > -0.05) basisOpportunity = 45;
    else if (basisDelta > -0.12) basisOpportunity = 30;
    else basisOpportunity = 15;
  }

  // ── COMPOSITE: weighted average ────────────────────────────────────────
  const composite = Math.round(
    profitability * 0.30 +
    seasonal * 0.25 +
    curveShape * 0.20 +
    storageBurn * 0.15 +
    basisOpportunity * 0.10
  );

  return { profitability, seasonal, curveShape, storageBurn, basisOpportunity, composite };
}

// ─── Score Labeling ──────────────────────────────────────────────────────────

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return {
    label: 'Strong Sell',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    recommendation: 'Market conditions strongly favor selling. Consider marketing a significant portion of your stored grain.',
  };
  if (score >= 65) return {
    label: 'Favorable',
    color: '#C9A84C',
    bg: 'rgba(201,168,76,0.12)',
    recommendation: 'Conditions are favorable for selling. Consider marketing 25–50% of your uncommitted bushels.',
  };
  if (score >= 45) return {
    label: 'Neutral',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.12)',
    recommendation: 'No strong signal either way. Monitor basis and seasonal patterns closely before committing.',
  };
  if (score >= 30) return {
    label: 'Hold',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    recommendation: 'Conditions favor patience. Storage costs are manageable and seasonal patterns suggest better prices ahead.',
  };
  return {
    label: 'Strong Hold',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    recommendation: 'Market signals favor holding. Seasonal lows typically precede stronger prices in 2–4 months.',
  };
}

// ─── Quick Score (no position data needed) ───────────────────────────────────
// For the /morning dashboard, farmers may not have entered position data.
// This version uses crop defaults and just needs the futures price.

export function calculateQuickScore(
  cropCode: string,
  futuresPrice: number | null,
  deferredPrice?: number | null,
  currentBasis?: number | null,
  historicalBasis?: number | null,
): ScoreBreakdown {
  const crop = CROP_CONFIGS[cropCode];
  if (!crop) {
    return { profitability: 50, seasonal: 50, curveShape: 50, storageBurn: 50, basisOpportunity: 50, composite: 50 };
  }

  return calculateMarketingScore({
    cropCode,
    costPerUnit: crop.defaultCost,
    futuresPrice,
    deferredPrice,
    currentBasis,
    historicalBasis,
    // Use harvest start as default storage start (October 1 of current or previous year)
    storageStartDate: getDefaultStorageStart(),
    storageCostPerMonth: crop.storageCost,
  });
}

function getDefaultStorageStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-10-01`;
}

// ─── Factor Labels (for the 5-factor breakdown display) ──────────────────────

export interface FactorInfo {
  key: keyof Omit<ScoreBreakdown, 'composite'>;
  label: string;
  weight: string;
  description: string;
}

export const SCORE_FACTORS: FactorInfo[] = [
  {
    key: 'profitability',
    label: 'Price vs. Cost',
    weight: '30%',
    description: 'How far is the current futures price above or below your cost of production? This is the single most important factor.',
  },
  {
    key: 'seasonal',
    label: 'Seasonal Timing',
    weight: '25%',
    description: 'Cash grain prices follow predictable seasonal patterns. Selling into seasonal strength historically improves average prices by 5–15%.',
  },
  {
    key: 'curveShape',
    label: 'Market Structure',
    weight: '20%',
    description: 'Backwardation means the market wants grain now — a sell signal. Contango means the market is paying you to store.',
  },
  {
    key: 'storageBurn',
    label: 'Storage Economics',
    weight: '15%',
    description: 'Every month grain sits in storage, the effective breakeven rises. This score increases as carrying costs consume more of your margin.',
  },
  {
    key: 'basisOpportunity',
    label: 'Local Basis',
    weight: '10%',
    description: 'Compares your local elevator basis against historical averages. A basis that\'s unusually strong relative to history is a sell signal.',
  },
];

export function getFactorRating(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#10B981' };
  if (score >= 60) return { label: 'Good', color: '#22C55E' };
  if (score >= 40) return { label: 'Fair', color: '#F59E0B' };
  if (score >= 20) return { label: 'Weak', color: '#F97316' };
  return { label: 'Poor', color: '#EF4444' };
}
