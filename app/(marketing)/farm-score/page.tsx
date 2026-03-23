// =============================================================================
// app/(marketing)/farm-score/page.tsx
// HarvestFile — Phase 27 Build 3: Farm Score (Free Tool #14)
//
// The Credit Karma of agriculture. A 0–850 composite financial health score
// built on FFSC (Farm Financial Standards Council) standards. Five sub-scores:
// Solvency, Profitability, Repayment Capacity, Liquidity, Efficiency.
//
// Progressive scoring: Tier 1 (5 inputs) → Tier 2 (12 inputs).
// Animated SVG gauge, letter grades, peer comparison, recommendations.
// =============================================================================

'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────────

type FarmType = 'grain' | 'livestock' | 'dairy' | 'specialty';

interface Tier1Inputs {
  farmType: FarmType;
  totalAssets: number;
  totalLiabilities: number;
  grossRevenue: number;
  totalExpenses: number;
}

interface Tier2Inputs {
  currentAssets: number;
  currentLiabilities: number;
  interestExpense: number;
  annualDebtPayments: number;
  depreciation: number;
  offFarmIncome: number;
  familyLiving: number;
}

interface SubScore {
  name: string;
  score: number;
  grade: string;
  color: string;
  label: string;
  weight: number;
  ratios: { name: string; value: number | null; unit: string; benchmark: string; status: 'strong' | 'caution' | 'vulnerable' | 'na' }[];
  tip: string;
}

// ─── FFSC Thresholds by Farm Type ───────────────────────────────────────────

const THRESHOLDS: Record<FarmType, {
  currentRatio: { strong: number; weak: number };
  workingCapPct: { strong: number; weak: number };
  debtToAsset: { strong: number; weak: number };
  opm: { strong: number; weak: number };
  roa: { strong: number; weak: number };
  debtCoverage: { strong: number; weak: number };
  opExpRatio: { strong: number; weak: number };
  assetTurnover: { strong: number; weak: number };
  interestExpRatio: { strong: number; weak: number };
}> = {
  grain: {
    currentRatio:     { strong: 2.0, weak: 1.3 },
    workingCapPct:    { strong: 0.50, weak: 0.10 },
    debtToAsset:      { strong: 0.30, weak: 0.60 },
    opm:              { strong: 0.25, weak: 0.10 },
    roa:              { strong: 0.08, weak: 0.03 },
    debtCoverage:     { strong: 1.75, weak: 1.0 },
    opExpRatio:       { strong: 0.60, weak: 0.85 },
    assetTurnover:    { strong: 0.45, weak: 0.20 },
    interestExpRatio: { strong: 0.05, weak: 0.12 },
  },
  livestock: {
    currentRatio:     { strong: 1.8, weak: 1.2 },
    workingCapPct:    { strong: 0.30, weak: 0.08 },
    debtToAsset:      { strong: 0.35, weak: 0.65 },
    opm:              { strong: 0.20, weak: 0.08 },
    roa:              { strong: 0.06, weak: 0.02 },
    debtCoverage:     { strong: 1.50, weak: 0.90 },
    opExpRatio:       { strong: 0.65, weak: 0.88 },
    assetTurnover:    { strong: 0.50, weak: 0.25 },
    interestExpRatio: { strong: 0.06, weak: 0.14 },
  },
  dairy: {
    currentRatio:     { strong: 1.5, weak: 1.0 },
    workingCapPct:    { strong: 0.25, weak: 0.05 },
    debtToAsset:      { strong: 0.40, weak: 0.65 },
    opm:              { strong: 0.20, weak: 0.08 },
    roa:              { strong: 0.06, weak: 0.02 },
    debtCoverage:     { strong: 1.50, weak: 0.90 },
    opExpRatio:       { strong: 0.70, weak: 0.90 },
    assetTurnover:    { strong: 0.55, weak: 0.30 },
    interestExpRatio: { strong: 0.06, weak: 0.14 },
  },
  specialty: {
    currentRatio:     { strong: 2.0, weak: 1.3 },
    workingCapPct:    { strong: 0.35, weak: 0.10 },
    debtToAsset:      { strong: 0.30, weak: 0.55 },
    opm:              { strong: 0.30, weak: 0.12 },
    roa:              { strong: 0.10, weak: 0.04 },
    debtCoverage:     { strong: 1.75, weak: 1.0 },
    opExpRatio:       { strong: 0.55, weak: 0.80 },
    assetTurnover:    { strong: 0.50, weak: 0.25 },
    interestExpRatio: { strong: 0.05, weak: 0.12 },
  },
};

// ─── USDA Peer Averages (from ERS ARMS data, 2024) ────────────────────────

const USDA_AVERAGES: Record<FarmType, {
  debtToAsset: number; opm: number; opExpRatio: number; currentRatio: number; roa: number;
}> = {
  grain:     { debtToAsset: 0.14, opm: 0.18, opExpRatio: 0.72, currentRatio: 2.1, roa: 0.05 },
  livestock: { debtToAsset: 0.16, opm: 0.14, opExpRatio: 0.76, currentRatio: 1.9, roa: 0.04 },
  dairy:     { debtToAsset: 0.22, opm: 0.12, opExpRatio: 0.80, currentRatio: 1.6, roa: 0.04 },
  specialty: { debtToAsset: 0.12, opm: 0.22, opExpRatio: 0.68, currentRatio: 2.3, roa: 0.07 },
};

// ─── Scoring Helpers ────────────────────────────────────────────────────────

function normHigher(value: number, strong: number, weak: number): number {
  if (strong === weak) return 0.5;
  return Math.max(0, Math.min(1, (value - weak) / (strong - weak)));
}

function normLower(value: number, strong: number, weak: number): number {
  if (strong === weak) return 0.5;
  return Math.max(0, Math.min(1, (weak - value) / (weak - strong)));
}

function getGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 0.85) return { grade: 'A+', label: 'Excellent', color: '#059669' };
  if (score >= 0.70) return { grade: 'A',  label: 'Strong',    color: '#10B981' };
  if (score >= 0.55) return { grade: 'B',  label: 'Good',      color: '#34D399' };
  if (score >= 0.40) return { grade: 'C',  label: 'Fair',      color: '#F59E0B' };
  if (score >= 0.25) return { grade: 'D',  label: 'Caution',   color: '#F97316' };
  return                     { grade: 'F',  label: 'Critical',  color: '#EF4444' };
}

function ratioStatus(score: number): 'strong' | 'caution' | 'vulnerable' {
  if (score >= 0.6) return 'strong';
  if (score >= 0.3) return 'caution';
  return 'vulnerable';
}

function compositeToFarmScore(composite: number): number {
  const curved = 1 / (1 + Math.exp(-6 * (composite - 0.5)));
  return Math.round(curved * 850);
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 750) return { label: 'Excellent',       color: '#059669' };
  if (score >= 650) return { label: 'Very Good',       color: '#10B981' };
  if (score >= 500) return { label: 'Good',            color: '#34D399' };
  if (score >= 350) return { label: 'Fair',            color: '#F59E0B' };
  if (score >= 200) return { label: 'Needs Attention', color: '#F97316' };
  return                    { label: 'Critical',        color: '#EF4444' };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Recommendation Engine ──────────────────────────────────────────────────

function getRecommendations(subScores: SubScore[], tier2: boolean): string[] {
  const recs: string[] = [];
  const sorted = [...subScores].sort((a, b) => a.score - b.score);

  for (const sub of sorted.slice(0, 3)) {
    if (sub.score >= 0.7) continue;
    switch (sub.name) {
      case 'Solvency':
        if (sub.score < 0.4) recs.push('Your debt-to-asset ratio is in the danger zone. Consider accelerating debt repayment, restructuring long-term loans at lower rates, or building equity through retained earnings before taking on new debt.');
        else recs.push('Your solvency is fair but could improve. Focus on building equity by retaining farm earnings and avoiding additional debt until your debt-to-asset ratio drops below 30%.');
        break;
      case 'Profitability':
        if (sub.score < 0.4) recs.push('Your operating profit margin is critically low. Review your cost structure — input costs, custom hire, and overhead. Consider whether your crop mix or marketing strategy needs adjustment. Our Breakeven Calculator can help identify which crops are underwater.');
        else recs.push('Your profitability is adequate but below top-performing farms. Tighten operating expenses, evaluate your grain marketing timing using our Cash Flow Forecaster, and explore whether ARC-CO or PLC would increase your program payments.');
        break;
      case 'Repayment Capacity':
        if (!tier2) recs.push('Add your annual debt payments and interest expense in the detailed section below to get a precise Repayment Capacity score — this is the #1 ratio lenders evaluate.');
        else if (sub.score < 0.4) recs.push('Your debt coverage ratio is dangerously low — farm income may not cover your debt obligations. Consider refinancing to extend terms, deferring non-essential capital purchases, or increasing off-farm income temporarily.');
        else recs.push('Your repayment capacity is adequate but leaves little margin for error. Focus on increasing net farm income through better marketing strategies and reducing interest costs through refinancing.');
        break;
      case 'Liquidity':
        if (!tier2) recs.push('Add your current assets and current liabilities in the detailed section to get a precise Liquidity score — this shows whether you can cover bills due in the next 12 months.');
        else if (sub.score < 0.4) recs.push('Your current ratio indicates potential cash flow stress within the next 12 months. Build working capital by selling stored grain, deferring equipment purchases, or establishing an operating line of credit before you need it. Our Cash Flow Forecaster can model the timing.');
        else recs.push('Your liquidity is fair. Aim to build working capital to at least 30% of gross revenue as a buffer against commodity price drops and unexpected expenses.');
        break;
      case 'Efficiency':
        if (sub.score < 0.4) recs.push('Your operating expense ratio is critically high — you\'re spending too much to generate each dollar of revenue. Benchmark your individual input costs against county averages. Our Breakeven Calculator breaks down cost-per-bushel by category.');
        else recs.push('Your efficiency metrics are fair. Focus on reducing the highest-cost line items — seed, chemicals, and custom hire often have the most room for savings through competitive bidding and cooperative purchasing.');
        break;
    }
  }

  if (recs.length === 0) {
    recs.push('Your farm is performing well across all dimensions. To maintain your score, continue monitoring commodity prices with our Markets dashboard and optimize your ARC/PLC election each year using our Election Optimizer.');
  }

  return recs;
}

// ─── Dollar Input Component ─────────────────────────────────────────────────

function DollarInput({ label, value, onChange, placeholder, helpText }: {
  label: string; value: number; onChange: (v: number) => void; placeholder: string; helpText?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">$</span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white pl-7 pr-4 py-3 text-sm text-gray-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      {helpText && <p className="mt-1 text-[11px] text-gray-400">{helpText}</p>}
    </div>
  );
}

// ─── SVG Gauge Component ────────────────────────────────────────────────────

function ScoreGauge({ score, label, color, animating }: { score: number; label: string; color: string; animating: boolean }) {
  const radius = 120;
  const strokeWidth = 18;
  const cx = 160;
  const cy = 145;
  const circumference = Math.PI * radius;

  const progress = animating ? score / 850 : 0;
  const dashOffset = circumference * (1 - progress);

  const gradientId = 'farmScoreGradient';

  return (
    <div className="relative flex flex-col items-center">
      <svg width="320" height="180" viewBox="0 0 320 180" className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="25%" stopColor="#F97316" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="gaugeShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={color} floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          filter="url(#gaugeShadow)"
          style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Tick marks */}
        {[0, 200, 350, 500, 650, 750, 850].map((tick) => {
          const angle = Math.PI - (tick / 850) * Math.PI;
          const innerR = radius - strokeWidth / 2 - 6;
          const outerR = radius - strokeWidth / 2 - 2;
          const x1 = cx + innerR * Math.cos(angle);
          const y1 = cy - innerR * Math.sin(angle);
          const x2 = cx + outerR * Math.cos(angle);
          const y2 = cy - outerR * Math.sin(angle);
          const labelR = radius - strokeWidth / 2 - 16;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy - labelR * Math.sin(angle);
          return (
            <g key={tick}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D1D5DB" strokeWidth="1.5" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-gray-400 font-medium">
                {tick}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Score number overlay */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-6xl font-extrabold tracking-[-0.04em]" style={{ color, transition: 'color 1s ease' }}>
          {animating ? score : '—'}
        </div>
        <div className="text-sm font-bold mt-0.5 tracking-wide" style={{ color }}>
          {animating ? label : 'Enter your data'}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Score Card ─────────────────────────────────────────────────────────

function SubScoreCard({ sub, index, animating }: { sub: SubScore; index: number; animating: boolean }) {
  const barWidth = animating ? sub.score * 100 : 0;
  const { grade, color } = getGrade(sub.score);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{sub.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{sub.weight}% of total score</p>
        </div>
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl text-lg font-extrabold text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          {animating ? grade : '—'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transitionDelay: `${index * 120 + 400}ms`,
          }}
        />
      </div>

      {/* Ratios */}
      <div className="space-y-1.5">
        {sub.ratios.map((r) => (
          <div key={r.name} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{r.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">
                {r.value !== null ? (r.unit === '%' ? `${(r.value * 100).toFixed(1)}%` : r.unit === '$' ? `$${r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : r.value.toFixed(2)) : '—'}
              </span>
              {r.status !== 'na' && (
                <span className={`inline-block w-2 h-2 rounded-full ${
                  r.status === 'strong' ? 'bg-emerald-500' : r.status === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="mt-3 pt-3 border-t border-gray-50">
        <p className="text-[11px] text-gray-400 leading-relaxed">{sub.tip}</p>
      </div>
    </div>
  );
}

// ─── Confidence Meter ───────────────────────────────────────────────────────

function ConfidenceMeter({ tier2Complete }: { tier2Complete: boolean }) {
  const level = tier2Complete ? 'High' : 'Moderate';
  const pctFill = tier2Complete ? 90 : 55;
  const color = tier2Complete ? '#059669' : '#F59E0B';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
      <div className="text-xs font-semibold text-gray-500 whitespace-nowrap">Score Confidence</div>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pctFill}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs font-bold" style={{ color }}>{level}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function FarmScorePage() {
  const [tier1, setTier1] = useState<Tier1Inputs>({
    farmType: 'grain',
    totalAssets: 0,
    totalLiabilities: 0,
    grossRevenue: 0,
    totalExpenses: 0,
  });

  const [tier2, setTier2] = useState<Tier2Inputs>({
    currentAssets: 0,
    currentLiabilities: 0,
    interestExpense: 0,
    annualDebtPayments: 0,
    depreciation: 0,
    offFarmIncome: 0,
    familyLiving: 0,
  });

  const [showTier2, setShowTier2] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [animating, setAnimating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const tier2HasData = tier2.currentAssets > 0 || tier2.annualDebtPayments > 0;

  // ── Scoring Engine ──────────────────────────────────────────────────
  const scoringResult = useMemo(() => {
    const t = THRESHOLDS[tier1.farmType];
    const rev = tier1.grossRevenue;
    const exp = tier1.totalExpenses;
    const assets = tier1.totalAssets;
    const liabilities = tier1.totalLiabilities;

    if (assets <= 0 || rev <= 0) return null;

    const nfi = rev - exp;
    const debtToAsset = liabilities / assets;
    const opm = nfi / rev;
    const opExpRatio = exp / rev;
    const assetTurnover = rev / assets;

    // Solvency
    const solvencyScore = normLower(debtToAsset, t.debtToAsset.strong, t.debtToAsset.weak);

    // Profitability
    const opmScore = normHigher(opm, t.opm.strong, t.opm.weak);
    let roaValue: number | null = null;
    let roaScore = opmScore;
    if (tier2HasData && tier2.interestExpense >= 0) {
      roaValue = (nfi + tier2.interestExpense - tier2.familyLiving) / assets;
      roaScore = normHigher(roaValue, t.roa.strong, t.roa.weak);
    }
    const profitabilityScore = (opmScore + roaScore) / 2;

    // Repayment Capacity
    let debtCoverageValue: number | null = null;
    let repaymentScore = 0.5;
    if (tier2HasData && tier2.annualDebtPayments > 0) {
      debtCoverageValue = (nfi + tier2.depreciation + tier2.interestExpense - tier2.familyLiving) / tier2.annualDebtPayments;
      repaymentScore = normHigher(debtCoverageValue, t.debtCoverage.strong, t.debtCoverage.weak);
    }

    // Liquidity
    let currentRatioValue: number | null = null;
    let workingCapPctValue: number | null = null;
    let liquidityScore = 0.5;
    if (tier2HasData && tier2.currentLiabilities > 0) {
      currentRatioValue = tier2.currentAssets / tier2.currentLiabilities;
      workingCapPctValue = (tier2.currentAssets - tier2.currentLiabilities) / rev;
      const crScore = normHigher(currentRatioValue, t.currentRatio.strong, t.currentRatio.weak);
      const wcScore = normHigher(workingCapPctValue, t.workingCapPct.strong, t.workingCapPct.weak);
      liquidityScore = (crScore + wcScore) / 2;
    } else if (tier2HasData && tier2.currentAssets > 0) {
      liquidityScore = 0.9;
      currentRatioValue = null;
      workingCapPctValue = tier2.currentAssets / rev;
    }

    // Efficiency
    const opExpScore = normLower(opExpRatio, t.opExpRatio.strong, t.opExpRatio.weak);
    const atScore = normHigher(assetTurnover, t.assetTurnover.strong, t.assetTurnover.weak);
    let intExpRatioValue: number | null = null;
    let intExpScore = opExpScore;
    if (tier2HasData && tier2.interestExpense >= 0) {
      intExpRatioValue = tier2.interestExpense / rev;
      intExpScore = normLower(intExpRatioValue, t.interestExpRatio.strong, t.interestExpRatio.weak);
    }
    const efficiencyScore = (opExpScore + atScore + intExpScore) / 3;

    // Composite (weighted geometric mean)
    const scores = [
      { s: Math.max(solvencyScore, 0.01), w: 0.25 },
      { s: Math.max(profitabilityScore, 0.01), w: 0.25 },
      { s: Math.max(repaymentScore, 0.01), w: 0.20 },
      { s: Math.max(liquidityScore, 0.01), w: 0.15 },
      { s: Math.max(efficiencyScore, 0.01), w: 0.15 },
    ];
    const logSum = scores.reduce((acc, { s, w }) => acc + w * Math.log(s), 0);
    const composite = Math.exp(logSum);
    const farmScore = compositeToFarmScore(composite);
    const { label: scoreLabel, color: scoreColor } = getScoreLabel(farmScore);

    const subScores: SubScore[] = [
      {
        name: 'Solvency', score: solvencyScore, ...getGrade(solvencyScore), weight: 25,
        ratios: [
          { name: 'Debt-to-Asset', value: debtToAsset, unit: '%', benchmark: `< ${(t.debtToAsset.strong * 100).toFixed(0)}%`, status: ratioStatus(normLower(debtToAsset, t.debtToAsset.strong, t.debtToAsset.weak)) },
          { name: 'Equity-to-Asset', value: 1 - debtToAsset, unit: '%', benchmark: `> ${((1 - t.debtToAsset.strong) * 100).toFixed(0)}%`, status: ratioStatus(normHigher(1 - debtToAsset, 1 - t.debtToAsset.strong, 1 - t.debtToAsset.weak)) },
        ],
        tip: 'Measures long-term financial survival. Lenders consider this the #1 farm stress indicator.',
      },
      {
        name: 'Profitability', score: profitabilityScore, ...getGrade(profitabilityScore), weight: 25,
        ratios: [
          { name: 'Operating Profit Margin', value: opm, unit: '%', benchmark: `> ${(t.opm.strong * 100).toFixed(0)}%`, status: ratioStatus(opmScore) },
          { name: 'Return on Assets', value: roaValue, unit: '%', benchmark: `> ${(t.roa.strong * 100).toFixed(0)}%`, status: roaValue !== null ? ratioStatus(roaScore) : 'na' },
          { name: 'Net Farm Income', value: nfi, unit: '$', benchmark: 'Positive', status: nfi > 0 ? 'strong' : 'vulnerable' },
        ],
        tip: 'Determines whether the farm generates adequate returns to sustain operations and build equity.',
      },
      {
        name: 'Repayment Capacity', score: repaymentScore, ...getGrade(repaymentScore), weight: 20,
        ratios: [
          { name: 'Debt Coverage Ratio', value: debtCoverageValue, unit: 'x', benchmark: `> ${t.debtCoverage.strong.toFixed(2)}x`, status: debtCoverageValue !== null ? ratioStatus(repaymentScore) : 'na' },
        ],
        tip: tier2HasData ? 'The #1 ratio lenders evaluate — can your farm income cover your debt payments?' : 'Add debt payment details below to unlock this score. This is the #1 ratio lenders evaluate.',
      },
      {
        name: 'Liquidity', score: liquidityScore, ...getGrade(liquidityScore), weight: 15,
        ratios: [
          { name: 'Current Ratio', value: currentRatioValue, unit: 'x', benchmark: `> ${t.currentRatio.strong.toFixed(1)}x`, status: currentRatioValue !== null ? ratioStatus(normHigher(currentRatioValue, t.currentRatio.strong, t.currentRatio.weak)) : 'na' },
          { name: 'Working Capital / Revenue', value: workingCapPctValue, unit: '%', benchmark: `> ${(t.workingCapPct.strong * 100).toFixed(0)}%`, status: workingCapPctValue !== null ? ratioStatus(normHigher(workingCapPctValue, t.workingCapPct.strong, t.workingCapPct.weak)) : 'na' },
        ],
        tip: tier2HasData ? 'Measures ability to pay bills due in the next 12 months.' : 'Add current assets and liabilities below to unlock this score.',
      },
      {
        name: 'Efficiency', score: efficiencyScore, ...getGrade(efficiencyScore), weight: 15,
        ratios: [
          { name: 'Operating Expense Ratio', value: opExpRatio, unit: '%', benchmark: `< ${(t.opExpRatio.strong * 100).toFixed(0)}%`, status: ratioStatus(opExpScore) },
          { name: 'Asset Turnover', value: assetTurnover, unit: '%', benchmark: `> ${(t.assetTurnover.strong * 100).toFixed(0)}%`, status: ratioStatus(atScore) },
          { name: 'Interest Expense Ratio', value: intExpRatioValue, unit: '%', benchmark: `< ${(t.interestExpRatio.strong * 100).toFixed(0)}%`, status: intExpRatioValue !== null ? ratioStatus(intExpScore) : 'na' },
        ],
        tip: 'Evaluates how effectively the farm converts resources into revenue.',
      },
    ];

    const recommendations = getRecommendations(subScores, tier2HasData);

    return { farmScore, scoreLabel, scoreColor, composite, subScores, recommendations, debtToAsset, opm, opExpRatio };
  }, [tier1, tier2, tier2HasData]);

  function handleCalculate() {
    if (tier1.totalAssets <= 0 || tier1.grossRevenue <= 0) return;
    setHasCalculated(true);
    setAnimating(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  const peerAvg = USDA_AVERAGES[tier1.farmType];
  const canCalculate = tier1.totalAssets > 0 && tier1.grossRevenue > 0;

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-12 bg-gradient-to-b from-[#0C1F17] to-[#143026] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>
              FREE TOOL #14
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              FFSC STANDARDS
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              0–850 SCORE
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
            Farm{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Score
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg max-w-2xl leading-relaxed mb-6">
            The first financial health rating built for farmers — based on the same
            FFSC standards used by Farm Credit, USDA, and every major ag lender.
            Five sub-scores. Peer benchmarking. Actionable recommendations.{' '}
            <span className="text-emerald-400 font-semibold">No account required</span>.
          </p>

          <div className="flex items-center gap-6 text-white/30 text-xs font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 5 FFSC Dimensions
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> USDA Benchmarks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Instant Results
            </span>
          </div>
        </div>
      </section>

      {/* ── Input Section ────────────────────────────────────────────── */}
      <section className="relative -mt-6 z-20 mx-auto max-w-[1200px] px-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Farm Financials</h2>
                <p className="text-xs text-gray-400">Enter your numbers to get your Farm Score — 5 inputs for a quick score, expand for precision</p>
              </div>
            </div>

            {/* Farm Type */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 mb-2 tracking-wide uppercase">Farm Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { key: 'grain' as FarmType, label: 'Grain / Row Crop', icon: '🌾' },
                  { key: 'livestock' as FarmType, label: 'Livestock', icon: '🐄' },
                  { key: 'dairy' as FarmType, label: 'Dairy', icon: '🥛' },
                  { key: 'specialty' as FarmType, label: 'Specialty / Other', icon: '🌿' },
                ]).map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setTier1(p => ({ ...p, farmType: key }))}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      tier1.farmType === key
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Core financial inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DollarInput label="Total Farm Assets" value={tier1.totalAssets} onChange={(v) => setTier1(p => ({ ...p, totalAssets: v }))} placeholder="2,500,000" helpText="Land, equipment, livestock, inventory, cash" />
              <DollarInput label="Total Farm Liabilities" value={tier1.totalLiabilities} onChange={(v) => setTier1(p => ({ ...p, totalLiabilities: v }))} placeholder="600,000" helpText="All loans, lines of credit, accounts payable" />
              <DollarInput label="Gross Farm Revenue" value={tier1.grossRevenue} onChange={(v) => setTier1(p => ({ ...p, grossRevenue: v }))} placeholder="800,000" helpText="Total sales + gov't payments + insurance" />
              <DollarInput label="Total Farm Expenses" value={tier1.totalExpenses} onChange={(v) => setTier1(p => ({ ...p, totalExpenses: v }))} placeholder="650,000" helpText="All operating + depreciation + interest" />
            </div>
          </div>

          {/* Tier 2 Expand */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => setShowTier2(!showTier2)}
              className="w-full flex items-center justify-between px-6 sm:px-8 py-4 text-sm font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
                </svg>
                <span>Add Detailed Financials for Higher-Precision Score</span>
                {!tier2HasData && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">RECOMMENDED</span>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-300 ${showTier2 ? 'rotate-180' : ''}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showTier2 && (
              <div className="px-6 sm:px-8 pb-6 space-y-4">
                <p className="text-xs text-gray-400 mb-4">
                  These inputs unlock your Liquidity and Repayment Capacity sub-scores and improve accuracy across all dimensions.
                  This is the same data your lender evaluates — knowing it yourself is power.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DollarInput label="Current Assets" value={tier2.currentAssets} onChange={(v) => setTier2(p => ({ ...p, currentAssets: v }))} placeholder="400,000" helpText="Cash, grain inventory, accounts receivable" />
                  <DollarInput label="Current Liabilities" value={tier2.currentLiabilities} onChange={(v) => setTier2(p => ({ ...p, currentLiabilities: v }))} placeholder="180,000" helpText="Operating loans, bills due within 12 months" />
                  <DollarInput label="Annual Interest Expense" value={tier2.interestExpense} onChange={(v) => setTier2(p => ({ ...p, interestExpense: v }))} placeholder="35,000" helpText="All interest paid on all loans" />
                  <DollarInput label="Annual Debt Payments" value={tier2.annualDebtPayments} onChange={(v) => setTier2(p => ({ ...p, annualDebtPayments: v }))} placeholder="120,000" helpText="Principal + interest on all loans" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <DollarInput label="Depreciation" value={tier2.depreciation} onChange={(v) => setTier2(p => ({ ...p, depreciation: v }))} placeholder="85,000" helpText="Annual depreciation on equipment & buildings" />
                  <DollarInput label="Off-Farm Income" value={tier2.offFarmIncome} onChange={(v) => setTier2(p => ({ ...p, offFarmIncome: v }))} placeholder="25,000" helpText="Spouse income, off-farm jobs, investments" />
                  <DollarInput label="Family Living Expense" value={tier2.familyLiving} onChange={(v) => setTier2(p => ({ ...p, familyLiving: v }))} placeholder="60,000" helpText="Annual household expenses drawn from farm" />
                </div>
              </div>
            )}
          </div>

          {/* Calculate Button */}
          <div className="border-t border-gray-100 p-6 sm:p-8 bg-gray-50/50">
            <button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className={`w-full sm:w-auto px-10 py-4 rounded-xl text-base font-bold tracking-wide transition-all ${
                canCalculate
                  ? 'bg-gradient-to-r from-[#0C1F17] to-[#1B4332] text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {hasCalculated ? 'Recalculate Farm Score' : 'Calculate My Farm Score'}
            </button>
            {!canCalculate && (
              <p className="mt-2 text-xs text-gray-400">Enter at least your total assets and gross revenue to calculate</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Results Section ───────────────────────────────────────────── */}
      {hasCalculated && scoringResult && (
        <section ref={resultsRef} className="mx-auto max-w-[1200px] px-6 pb-16">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6">
            <div className="flex flex-col items-center">
              <h2 className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-6">Your Farm Score</h2>
              <ScoreGauge score={scoringResult.farmScore} label={scoringResult.scoreLabel} color={scoringResult.scoreColor} animating={animating} />
              <div className="mt-6 w-full max-w-sm">
                <ConfidenceMeter tier2Complete={tier2HasData} />
              </div>
              {!tier2HasData && (
                <p className="mt-3 text-xs text-amber-600 text-center max-w-md">
                  Your Liquidity and Repayment Capacity scores are estimated. Add detailed financials above for a high-confidence score — this is the same data your lender evaluates.
                </p>
              )}
            </div>
          </div>

          {/* Sub-Scores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {scoringResult.subScores.map((sub, i) => (
              <SubScoreCard key={sub.name} sub={sub} index={i} animating={animating} />
            ))}

            {/* Peer Comparison Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:col-span-2 lg:col-span-1">
              <h3 className="text-sm font-bold text-gray-900 mb-1">vs. USDA Average</h3>
              <p className="text-xs text-gray-400 mb-4">
                How your farm compares to the national average {tier1.farmType} operation (USDA ARMS data)
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Debt-to-Asset', yours: scoringResult.debtToAsset, avg: peerAvg.debtToAsset, lower: true },
                  { label: 'Operating Profit Margin', yours: scoringResult.opm, avg: peerAvg.opm, lower: false },
                  { label: 'Operating Expense Ratio', yours: scoringResult.opExpRatio, avg: peerAvg.opExpRatio, lower: true },
                ].map(({ label, yours, avg, lower }) => {
                  const better = lower ? yours < avg : yours > avg;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${better ? 'text-emerald-600' : 'text-red-500'}`}>{pct(yours)}</span>
                          <span className="text-gray-300">vs</span>
                          <span className="font-medium text-gray-500">{pct(avg)}</span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`absolute h-full rounded-full transition-all duration-1000 ${better ? 'bg-emerald-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min((yours / (avg * 2)) * 100, 100)}%` }}
                        />
                        <div className="absolute top-0 h-full w-0.5 bg-gray-400" style={{ left: `${Math.min((avg / (avg * 2)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[10px] text-gray-300">Source: USDA ERS ARMS Survey, 2024. National averages by farm type.</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7Z" />
                  <path d="M9 21h6" /><path d="M9 18h6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recommendations</h2>
                <p className="text-xs text-gray-400">Actionable steps to improve your Farm Score</p>
              </div>
            </div>
            <div className="space-y-4">
              {scoringResult.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                    <span className="text-[11px] font-bold text-emerald-700">{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology Note */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sm:p-8 mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2">About Farm Score Methodology</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Farm Score is built on the Farm Financial Standards Council (FFSC) framework — the same 13 financial ratios used by
              USDA Economic Research Service, the Farm Credit System, and university extension programs nationwide. Your score is calculated
              using a weighted geometric mean across five dimensions: Solvency (25%), Profitability (25%), Repayment Capacity (20%),
              Liquidity (15%), and Efficiency (15%). Thresholds are calibrated by farm type using benchmarks from the University of Minnesota
              Center for Farm Financial Management, USDA ARMS survey data, and Farm Credit institution guidelines. Farm Score is an educational
              tool and does not constitute financial advice. Consult your lender or farm financial advisor for decisions about your operation.
            </p>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#0C1F17] to-[#1B4332] rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            }} />
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold text-white mb-3 tracking-[-0.02em]">
                Improve your Farm Score with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">HarvestFile Pro</span>
              </h2>
              <p className="text-white/50 text-sm mb-6 max-w-xl mx-auto">
                Track your score monthly. Get AI-powered recommendations. Model what-if scenarios.
                Compare against county-level benchmarks. Export lender-ready financial packages.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] font-bold text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Start Free 14-Day Trial
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
                <Link href="/check" className="text-white/50 hover:text-white text-sm font-medium transition-colors">
                  Or try the free ARC/PLC Calculator →
                </Link>
              </div>
              <p className="text-white/20 text-xs mt-4">14 free tools · No credit card required · Cancel anytime</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Pre-calculation content ──────────────────────────────────── */}
      {!hasCalculated && (
        <section className="mx-auto max-w-[1200px] px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { step: '1', title: 'Enter your numbers', desc: 'Five inputs — total assets, liabilities, revenue, and expenses. Takes 30 seconds if you know your balance sheet.', icon: '📊' },
              { step: '2', title: 'Get your Farm Score', desc: 'Instant 0–850 score with five sub-scores across solvency, profitability, repayment, liquidity, and efficiency.', icon: '🎯' },
              { step: '3', title: 'Act on recommendations', desc: 'Personalized steps to improve your weakest areas. Know exactly what your lender will see before they do.', icon: '🚀' },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{icon}</span>
                  <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-800">{step}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-[-0.02em] mb-4">Why you need to know your Farm Score</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 leading-relaxed">
              <div className="space-y-3">
                <p><strong className="text-gray-900">Your lender already scores you.</strong> Farm Credit, FSA, and commercial banks all compute financial ratios from your balance sheet and income statement. They use these ratios to decide your loan terms. You should know these numbers before they do.</p>
                <p><strong className="text-gray-900">The FFSC framework is the standard.</strong> Farm Score uses the same 13 financial ratios defined by the Farm Financial Standards Council — adopted by every major agricultural institution in America since the 1980s farm crisis.</p>
              </div>
              <div className="space-y-3">
                <p><strong className="text-gray-900">No tool has ever given you this.</strong> Credit Karma gave 140 million people free access to their credit score. Farm Score does the same thing for farm financial health — giving you visibility into a number that was previously hidden behind lender spreadsheets.</p>
                <p><strong className="text-gray-900">Better data = better decisions.</strong> Knowing your sub-scores helps you prioritize: should you pay down debt, cut expenses, or build cash reserves? Farm Score tells you exactly where to focus, calibrated to your farm type and size.</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3">Explore our other free tools</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { href: '/check', label: 'ARC/PLC Calculator' },
                { href: '/breakeven', label: 'Breakeven Calculator' },
                { href: '/cashflow', label: 'Cash Flow Forecaster' },
                { href: '/markets', label: 'Commodity Markets' },
                { href: '/optimize', label: 'Election Optimizer' },
                { href: '/morning', label: 'Morning Dashboard' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="px-4 py-2 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
