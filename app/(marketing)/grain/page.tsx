// =============================================================================
// app/(marketing)/grain/page.tsx
// HarvestFile — Phase 28 Build 1: Grain Marketing Command Center
//
// FREE TOOL #15 — The industry's FIRST "Marketing Score": a single 0–100
// number that tells a farmer whether conditions favor selling stored grain.
//
// No tool on the planet gives a farmer a composite score synthesizing:
//   • Futures price vs. their breakeven (profitability signal)
//   • Seasonal price patterns (historical timing intelligence)
//   • Futures curve shape (market structure signal)
//   • Storage cost burn rate (holding cost reality check)
//
// This is revolutionary. Harvest Profit charges $1,600/yr for less.
// DTN ProphetX costs $5,000+. This is free.
//
// Data: Live CME futures from /api/prices/futures
// =============================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GrainPosition {
  id: string;
  cropCode: string;
  bushels: number;
  costPerBushel: number;
  storageStartDate: string;
  storageCostPerBuMonth: number;
  percentMarketed: number;
  avgSalePrice: number;
  notes: string;
}

interface FuturesData {
  [commodity: string]: {
    latestSettle: number;
    previousSettle: number;
    contractMonth: string;
    deferredSettle?: number;
    deferredMonth?: string;
    updated: string;
  };
}

interface ScoreBreakdown {
  profitability: number;
  seasonal: number;
  curveShape: number;
  storageBurn: number;
  basisOpportunity: number;
  composite: number;
}

// ─── Crop Configuration ──────────────────────────────────────────────────────

const CROPS: Record<string, {
  name: string;
  emoji: string;
  unit: string;
  color: string;
  futuresKey: string;
  defaultCost: number;
  storageCost: number; // $/bu/month commercial
  shrinkRate: number;  // % per month
  // Monthly seasonal index (1.0 = average, >1.0 = above average price month)
  // Based on 10-year USDA cash price averages normalized to annual mean
  seasonalIndex: number[];
  peakMonths: string;
  troughMonths: string;
}> = {
  CORN: {
    name: 'Corn',
    emoji: '🌽',
    unit: '$/bu',
    color: '#F59E0B',
    futuresKey: 'CORN',
    defaultCost: 4.20,
    storageCost: 0.05,
    shrinkRate: 0.0015,
    seasonalIndex: [1.02, 1.04, 1.05, 1.04, 1.03, 1.02, 0.99, 0.97, 0.96, 0.94, 0.96, 0.98],
    peakMonths: 'Feb–May',
    troughMonths: 'Sep–Oct',
  },
  SOYBEANS: {
    name: 'Soybeans',
    emoji: '🫘',
    unit: '$/bu',
    color: '#059669',
    futuresKey: 'SOYBEANS',
    defaultCost: 10.50,
    storageCost: 0.05,
    shrinkRate: 0.001,
    seasonalIndex: [1.01, 1.02, 1.03, 1.03, 1.04, 1.05, 1.03, 0.99, 0.96, 0.93, 0.95, 0.97],
    peakMonths: 'May–Jul',
    troughMonths: 'Sep–Oct',
  },
  WHEAT: {
    name: 'Wheat',
    emoji: '🌾',
    unit: '$/bu',
    color: '#8B5CF6',
    futuresKey: 'WHEAT',
    defaultCost: 5.80,
    storageCost: 0.05,
    shrinkRate: 0.001,
    seasonalIndex: [1.01, 1.02, 1.04, 1.05, 1.04, 1.02, 0.97, 0.96, 0.95, 0.97, 0.98, 1.00],
    peakMonths: 'Mar–May',
    troughMonths: 'Jul–Sep',
  },
  COTTON: {
    name: 'Cotton',
    emoji: '🏵️',
    unit: '$/lb',
    color: '#EC4899',
    futuresKey: 'COTTON',
    defaultCost: 0.75,
    storageCost: 0.003,
    shrinkRate: 0.0005,
    seasonalIndex: [0.99, 1.00, 1.02, 1.03, 1.04, 1.03, 1.01, 0.99, 0.97, 0.96, 0.97, 0.99],
    peakMonths: 'Apr–Jun',
    troughMonths: 'Sep–Nov',
  },
  RICE: {
    name: 'Rice',
    emoji: '🍚',
    unit: '$/cwt',
    color: '#06B6D4',
    futuresKey: 'RICE',
    defaultCost: 15.00,
    storageCost: 0.10,
    shrinkRate: 0.001,
    seasonalIndex: [1.01, 1.02, 1.03, 1.04, 1.03, 1.02, 1.00, 0.98, 0.96, 0.95, 0.97, 0.99],
    peakMonths: 'Mar–Jun',
    troughMonths: 'Sep–Oct',
  },
};

// ─── Marketing Score Engine ──────────────────────────────────────────────────

function calculateMarketingScore(
  position: GrainPosition,
  futuresPrice: number | null,
  deferredPrice: number | null,
  crop: typeof CROPS[string],
): ScoreBreakdown {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed

  // 1) PROFITABILITY SCORE (30% weight)
  // How far above/below breakeven is the current market?
  let profitability = 50; // neutral default
  if (futuresPrice && position.costPerBushel > 0) {
    const marginPct = (futuresPrice - position.costPerBushel) / position.costPerBushel;
    if (marginPct >= 0.20) profitability = 95;
    else if (marginPct >= 0.15) profitability = 85;
    else if (marginPct >= 0.10) profitability = 75;
    else if (marginPct >= 0.05) profitability = 65;
    else if (marginPct >= 0) profitability = 55;
    else if (marginPct >= -0.05) profitability = 40;
    else if (marginPct >= -0.10) profitability = 25;
    else profitability = 10;
  }

  // 2) SEASONAL INDEX SCORE (25% weight)
  // Are we in a historically strong price month?
  const seasonal = Math.round(
    Math.min(100, Math.max(0, (crop.seasonalIndex[month] - 0.93) / (1.05 - 0.93) * 100))
  );

  // 3) FUTURES CURVE SHAPE (20% weight)
  // Backwardation (nearby > deferred) = market wants grain now = high score
  // Contango (deferred > nearby) = market pays to wait = lower score
  let curveShape = 50; // neutral when no deferred data
  if (futuresPrice && deferredPrice) {
    const spread = futuresPrice - deferredPrice;
    const spreadPct = spread / futuresPrice;
    if (spreadPct > 0.03) curveShape = 90;       // strong backwardation
    else if (spreadPct > 0.01) curveShape = 75;   // mild backwardation
    else if (spreadPct > -0.01) curveShape = 50;  // flat/neutral
    else if (spreadPct > -0.03) curveShape = 30;  // mild contango
    else curveShape = 15;                          // strong contango (store & wait)
  }

  // 4) STORAGE COST BURN (15% weight)
  // How much are holding costs eating into margin?
  let storageBurn = 50;
  if (futuresPrice && position.costPerBushel > 0) {
    const storageStart = new Date(position.storageStartDate || now);
    const monthsStored = Math.max(0, (now.getTime() - storageStart.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const totalStorageCost = monthsStored * position.storageCostPerBuMonth;
    const shrinkCost = monthsStored * crop.shrinkRate * futuresPrice;
    const interestCost = monthsStored * (position.costPerBushel * 0.06 / 12); // 6% annual
    const totalCarry = totalStorageCost + shrinkCost + interestCost;
    const netMargin = futuresPrice - position.costPerBushel - totalCarry;
    const marginPct = netMargin / position.costPerBushel;

    // If margin is being rapidly consumed by storage, score goes UP (sell now)
    if (totalCarry > (futuresPrice - position.costPerBushel) * 0.5) storageBurn = 85;
    else if (totalCarry > (futuresPrice - position.costPerBushel) * 0.3) storageBurn = 70;
    else if (totalCarry > (futuresPrice - position.costPerBushel) * 0.15) storageBurn = 55;
    else storageBurn = 35; // storage costs manageable, no urgency
  }

  // 5) BASIS OPPORTUNITY (10% weight) — placeholder until Barchart API
  const basisOpportunity = 50; // neutral — will be enhanced in Build 2

  // COMPOSITE: weighted average
  const composite = Math.round(
    profitability * 0.30 +
    seasonal * 0.25 +
    curveShape * 0.20 +
    storageBurn * 0.15 +
    basisOpportunity * 0.10
  );

  return { profitability, seasonal, curveShape, storageBurn, basisOpportunity, composite };
}

function getScoreLabel(score: number): { label: string; color: string; bg: string; recommendation: string } {
  if (score >= 80) return { label: 'Strong Sell', color: '#10B981', bg: 'rgba(16,185,129,0.12)', recommendation: 'Market conditions strongly favor selling. Consider marketing a significant portion of your stored grain.' };
  if (score >= 65) return { label: 'Favorable', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)', recommendation: 'Conditions are favorable for selling. Consider marketing 25–50% of your uncommitted bushels.' };
  if (score >= 45) return { label: 'Neutral', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', recommendation: 'No strong signal either way. Monitor basis and seasonal patterns closely before committing.' };
  if (score >= 30) return { label: 'Hold', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', recommendation: 'Conditions favor patience. Storage costs are manageable and seasonal patterns suggest better prices ahead.' };
  return { label: 'Strong Hold', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', recommendation: 'Market signals favor holding. Seasonal lows typically precede stronger prices in 2–4 months.' };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) => n.toFixed(decimals);
const fmtDollar = (n: number) => n >= 10000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBushels = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K bu` : `${n.toLocaleString()} bu`;

function generateId() {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Marketing Plan Templates ────────────────────────────────────────────────

const PLAN_TEMPLATES = [
  {
    name: 'Scale-Up Selling',
    description: 'Sell in increments as prices rise above breakeven targets',
    steps: [
      { pct: 20, trigger: 'Pre-harvest: Lock in 20% via forward contract' },
      { pct: 20, trigger: 'At harvest: Sell 20% at prevailing cash price' },
      { pct: 20, trigger: 'Post-harvest: Sell 20% when basis strengthens' },
      { pct: 20, trigger: 'Winter: Sell 20% during seasonal rally window' },
      { pct: 20, trigger: 'Spring: Market final 20% before new crop pressure' },
    ],
  },
  {
    name: 'Third-Third-Third',
    description: 'Classic equal-thirds spread across the marketing year',
    steps: [
      { pct: 33, trigger: 'Pre-harvest: Forward contract one-third' },
      { pct: 34, trigger: 'At harvest: Cash sell one-third' },
      { pct: 33, trigger: 'Post-harvest: Store and sell one-third by May' },
    ],
  },
  {
    name: 'Aggressive Storage',
    description: 'Store most production, sell during seasonal highs',
    steps: [
      { pct: 10, trigger: 'At harvest: Sell 10% to cover immediate cash needs' },
      { pct: 30, trigger: 'Dec–Feb: Sell 30% during winter price strength' },
      { pct: 30, trigger: 'Mar–May: Sell 30% during spring seasonal peak' },
      { pct: 30, trigger: 'Jun–Jul: Sell remaining 30% before new crop' },
    ],
  },
];

// ─── Seasonal Price Chart Data ───────────────────────────────────────────────

function generateSeasonalChart(crop: typeof CROPS[string], currentMonth: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((m, i) => ({
    month: m,
    index: Math.round(crop.seasonalIndex[i] * 100),
    isCurrent: i === currentMonth,
    isPeak: crop.seasonalIndex[i] >= 1.03,
    isTrough: crop.seasonalIndex[i] <= 0.96,
  }));
}

// ─── Storage Cost Projections ────────────────────────────────────────────────

function projectStorageCosts(
  position: GrainPosition,
  crop: typeof CROPS[string],
  futuresPrice: number | null,
  months: number = 12,
) {
  const data = [];
  const price = futuresPrice || position.costPerBushel;
  const startDate = new Date(position.storageStartDate || new Date());
  const now = new Date();
  const monthsAlreadyStored = Math.max(0, (now.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));

  for (let m = 0; m <= months; m++) {
    const totalMonths = monthsAlreadyStored + m;
    const storageFee = totalMonths * position.storageCostPerBuMonth;
    const shrinkLoss = totalMonths * crop.shrinkRate * price;
    const interestCost = totalMonths * (position.costPerBushel * 0.06 / 12);
    const totalCost = storageFee + shrinkLoss + interestCost;
    const effectiveBreakeven = position.costPerBushel + totalCost;

    data.push({
      month: m === 0 ? 'Now' : `+${m}mo`,
      monthNum: m,
      storageFee: Math.round(storageFee * 100) / 100,
      shrinkLoss: Math.round(shrinkLoss * 100) / 100,
      interestCost: Math.round(interestCost * 100) / 100,
      totalCarryCost: Math.round(totalCost * 100) / 100,
      effectiveBreakeven: Math.round(effectiveBreakeven * 100) / 100,
      futuresPrice: price,
      netMargin: Math.round((price - effectiveBreakeven) * 100) / 100,
    });
  }
  return data;
}

// ─── Local Storage ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'harvestfile_grain_positions';

function loadPositions(): GrainPosition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePositions(positions: GrainPosition[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch {}
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function GrainMarketingPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [positions, setPositions] = useState<GrainPosition[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [futures, setFutures] = useState<FuturesData>({});
  const [futuresLoading, setFuturesLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activePlan, setActivePlan] = useState(0);
  const [showEducation, setShowEducation] = useState(false);

  // Form state
  const [formCrop, setFormCrop] = useState('CORN');
  const [formBushels, setFormBushels] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  });
  const [formStorageCost, setFormStorageCost] = useState('0.05');

  // ── Load positions from localStorage ──────────────────────────────────
  useEffect(() => {
    const loaded = loadPositions();
    setPositions(loaded);
    if (loaded.length > 0) setActiveTab(loaded[0].id);
  }, []);

  // ── Fetch futures prices ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchFutures() {
      try {
        const res = await fetch('/api/prices/futures?commodities=CORN,SOYBEANS,WHEAT,COTTON,RICE');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setFutures(json.data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch futures:', e);
      } finally {
        setFuturesLoading(false);
      }
    }
    fetchFutures();
  }, []);

  // ── Add Position ──────────────────────────────────────────────────────
  const handleAddPosition = useCallback(() => {
    const bushels = parseInt(formBushels, 10);
    const cost = parseFloat(formCost);
    const storageCost = parseFloat(formStorageCost);
    if (!bushels || !cost || isNaN(bushels) || isNaN(cost)) return;

    const newPos: GrainPosition = {
      id: generateId(),
      cropCode: formCrop,
      bushels,
      costPerBushel: cost,
      storageStartDate: formDate,
      storageCostPerBuMonth: isNaN(storageCost) ? 0.05 : storageCost,
      percentMarketed: 0,
      avgSalePrice: 0,
      notes: '',
    };

    const updated = [...positions, newPos];
    setPositions(updated);
    savePositions(updated);
    setActiveTab(newPos.id);
    setShowAddForm(false);
    setFormBushels('');
    setFormCost('');
  }, [formCrop, formBushels, formCost, formDate, formStorageCost, positions]);

  // ── Remove Position ───────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    const updated = positions.filter((p) => p.id !== id);
    setPositions(updated);
    savePositions(updated);
    if (activeTab === id) setActiveTab(updated[0]?.id || '');
  }, [positions, activeTab]);

  // ── Update marketed percentage ────────────────────────────────────────
  const handleUpdateMarketed = useCallback((id: string, pct: number, avgPrice: number) => {
    const updated = positions.map((p) =>
      p.id === id ? { ...p, percentMarketed: Math.min(100, Math.max(0, pct)), avgSalePrice: avgPrice } : p
    );
    setPositions(updated);
    savePositions(updated);
  }, [positions]);

  // ── Calculations ──────────────────────────────────────────────────────
  const currentMonth = new Date().getMonth();

  const positionCalcs = useMemo(() => {
    return positions.map((pos) => {
      const crop = CROPS[pos.cropCode] || CROPS.CORN;
      const futuresInfo = futures[crop.futuresKey];
      const price = futuresInfo?.latestSettle || null;
      const deferredPrice = futuresInfo?.deferredSettle || null;

      const score = calculateMarketingScore(pos, price, deferredPrice, crop);
      const scoreInfo = getScoreLabel(score.composite);
      const storageProjection = projectStorageCosts(pos, crop, price, 12);
      const seasonalChart = generateSeasonalChart(crop, currentMonth);

      const totalValue = price ? pos.bushels * price : null;
      const totalCost = pos.bushels * pos.costPerBushel;
      const unrealizedPL = totalValue ? totalValue - totalCost : null;
      const unmarketedBu = pos.bushels * (1 - pos.percentMarketed / 100);

      // Current carry cost
      const startDate = new Date(pos.storageStartDate || new Date());
      const now = new Date();
      const monthsStored = Math.max(0, (now.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
      const currentCarryCost = monthsStored * pos.storageCostPerBuMonth +
        monthsStored * crop.shrinkRate * (price || pos.costPerBushel) +
        monthsStored * (pos.costPerBushel * 0.06 / 12);

      return {
        ...pos,
        crop,
        price,
        deferredPrice,
        score,
        scoreInfo,
        storageProjection,
        seasonalChart,
        totalValue,
        totalCost,
        unrealizedPL,
        unmarketedBu,
        monthsStored: Math.round(monthsStored * 10) / 10,
        currentCarryCost: Math.round(currentCarryCost * 100) / 100,
        effectiveBreakeven: Math.round((pos.costPerBushel + currentCarryCost) * 100) / 100,
      };
    });
  }, [positions, futures, currentMonth]);

  const activePosition = positionCalcs.find((p) => p.id === activeTab) || positionCalcs[0];

  // Portfolio summary
  const portfolio = useMemo(() => {
    const totalBushels = positionCalcs.reduce((a, p) => a + p.bushels, 0);
    const totalValue = positionCalcs.reduce((a, p) => a + (p.totalValue || 0), 0);
    const totalCost = positionCalcs.reduce((a, p) => a + p.totalCost, 0);
    const totalPL = positionCalcs.reduce((a, p) => a + (p.unrealizedPL || 0), 0);
    const avgScore = positionCalcs.length > 0
      ? Math.round(positionCalcs.reduce((a, p) => a + p.score.composite, 0) / positionCalcs.length)
      : 0;
    return { totalBushels, totalValue, totalCost, totalPL, avgScore, count: positionCalcs.length };
  }, [positionCalcs]);

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

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
              FREE TOOL #15
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              LIVE FUTURES
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              INDUSTRY FIRST
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
            Grain Marketing
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Command Center
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg max-w-2xl leading-relaxed mb-6">
            The industry&apos;s first <strong className="text-white/80">Marketing Score</strong> — a single 0–100 number
            that synthesizes profitability, seasonal timing, market structure, and storage costs to tell you
            if conditions favor selling your stored grain. No account required.
          </p>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/40">Live CME futures</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white/40">10-year seasonal data</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/40">Storage cost analysis</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 -mt-6 relative z-20 pb-20">

        {/* ── Empty State / Add Position ──────────────────────────────── */}
        {positions.length === 0 && !showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#0C1F17] to-[#1B4332] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Add Your First Grain Position</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Enter your stored grain — crop, bushels, cost of production — and instantly get a
              Marketing Score telling you whether conditions favor selling now or waiting.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#0C1F17] to-[#1B4332] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Add Grain Position
            </button>
          </div>
        )}

        {/* ── Add Position Form ──────────────────────────────────────── */}
        {(showAddForm || positions.length === 0) && showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add Grain Position</h2>
              {positions.length > 0 && (
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Crop */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Commodity</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CROPS).slice(0, 3).map(([code, c]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setFormCrop(code);
                        setFormCost(c.defaultCost.toString());
                        setFormStorageCost(c.storageCost.toString());
                      }}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        formCrop === code
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(CROPS).slice(3).map(([code, c]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setFormCrop(code);
                        setFormCost(c.defaultCost.toString());
                        setFormStorageCost(c.storageCost.toString());
                      }}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        formCrop === code
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bushels + Cost */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bushels in Storage</label>
                  <input
                    type="number"
                    value={formBushels}
                    onChange={(e) => setFormBushels(e.target.value)}
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Cost of Production ({CROPS[formCrop]?.unit || '$/bu'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder={`e.g., ${CROPS[formCrop]?.defaultCost || '4.20'}`}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Date + Storage cost */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Storage Start Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Storage Cost ($/bu/month)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formStorageCost}
                    onChange={(e) => setFormStorageCost(e.target.value)}
                    placeholder="0.05"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Commercial avg: $0.04–0.06/bu/month</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddPosition}
              disabled={!formBushels || !formCost}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#0C1F17] to-[#1B4332] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Calculate Marketing Score
            </button>
          </div>
        )}

        {/* ── Position Tabs + Add Button ──────────────────────────────── */}
        {positions.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              {positionCalcs.map((p) => {
                const crop = CROPS[p.cropCode] || CROPS.CORN;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveTab(p.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold whitespace-nowrap transition-all ${
                      activeTab === p.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>{crop.emoji}</span>
                    <span>{crop.name}</span>
                    <span className="text-xs opacity-60">{fmtBushels(p.bushels)}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all whitespace-nowrap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Add
              </button>
            </div>

            {/* ── Portfolio Summary (2+ positions) ──────────────────────── */}
            {positions.length >= 2 && (
              <div className="bg-gradient-to-br from-[#0C1F17] to-[#1B4332] rounded-2xl p-5 mb-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Portfolio Overview</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div>
                    <div className="text-white/40 text-[11px] mb-0.5">Positions</div>
                    <div className="text-xl font-extrabold">{portfolio.count}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[11px] mb-0.5">Total Bushels</div>
                    <div className="text-xl font-extrabold">{fmtBushels(portfolio.totalBushels)}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[11px] mb-0.5">Market Value</div>
                    <div className="text-xl font-extrabold">{portfolio.totalValue > 0 ? fmtDollar(portfolio.totalValue) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[11px] mb-0.5">Unrealized P&L</div>
                    <div className={`text-xl font-extrabold ${portfolio.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {portfolio.totalValue > 0 ? `${portfolio.totalPL >= 0 ? '+' : ''}${fmtDollar(portfolio.totalPL)}` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[11px] mb-0.5">Avg Marketing Score</div>
                    <div className="text-xl font-extrabold" style={{ color: getScoreLabel(portfolio.avgScore).color }}>
                      {portfolio.avgScore}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Active Position Dashboard ──────────────────────────── */}
            {activePosition && (
              <div className="space-y-6">

                {/* ── Row 1: Marketing Score + Score Breakdown ────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Marketing Score Gauge */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Marketing Score</div>

                    {/* SVG Gauge */}
                    <div className="relative w-48 h-28 mb-3">
                      <svg viewBox="0 0 200 110" className="w-full h-full">
                        {/* Background arc */}
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#F1F1EF"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        {/* Score arc */}
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke={activePosition.scoreInfo.color}
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeDasharray={`${(activePosition.score.composite / 100) * 251.2} 251.2`}
                          style={{ transition: 'stroke-dasharray 1s ease-out' }}
                        />
                        {/* Score number */}
                        <text x="100" y="85" textAnchor="middle" fontSize="42" fontWeight="900" fill="#1a1a1a">
                          {activePosition.score.composite}
                        </text>
                        <text x="100" y="105" textAnchor="middle" fontSize="11" fontWeight="600" fill={activePosition.scoreInfo.color}>
                          {activePosition.scoreInfo.label}
                        </text>
                      </svg>
                    </div>

                    <p className="text-xs text-gray-500 text-center leading-relaxed max-w-[240px]">
                      {activePosition.scoreInfo.recommendation}
                    </p>
                  </div>

                  {/* Score Breakdown */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Score Breakdown</div>
                    <div className="space-y-3">
                      {[
                        { label: 'Profitability', value: activePosition.score.profitability, weight: '30%', desc: 'Futures price vs your breakeven cost', icon: '💰' },
                        { label: 'Seasonal Timing', value: activePosition.score.seasonal, weight: '25%', desc: `${activePosition.crop.name} peaks ${activePosition.crop.peakMonths}, troughs ${activePosition.crop.troughMonths}`, icon: '📅' },
                        { label: 'Market Structure', value: activePosition.score.curveShape, weight: '20%', desc: 'Futures curve: backwardation = sell signal, contango = hold', icon: '📈' },
                        { label: 'Storage Cost Burn', value: activePosition.score.storageBurn, weight: '15%', desc: `${activePosition.monthsStored} months stored, $${activePosition.currentCarryCost}/bu carrying cost`, icon: '🏛️' },
                        { label: 'Basis Opportunity', value: activePosition.score.basisOpportunity, weight: '10%', desc: 'Enhanced with live elevator bids (coming soon)', icon: '📍' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="text-lg shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">{item.weight}</span>
                                <span className="text-sm font-bold" style={{ color: getScoreLabel(item.value).color }}>{item.value}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all duration-1000"
                                style={{
                                  width: `${item.value}%`,
                                  backgroundColor: getScoreLabel(item.value).color,
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Row 2: Position Details + Price Comparison ──────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Position Details */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Position Details</div>
                      <button
                        onClick={() => handleRemove(activePosition.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Bushels Stored</div>
                        <div className="text-xl font-extrabold text-gray-900">{activePosition.bushels.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Cost Basis</div>
                        <div className="text-xl font-extrabold text-gray-900">${fmt(activePosition.costPerBushel)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Market Price</div>
                        <div className="text-xl font-extrabold text-gray-900">
                          {activePosition.price ? `$${fmt(activePosition.price)}` : '—'}
                        </div>
                        {activePosition.price && (
                          <div className={`text-[10px] font-semibold ${
                            activePosition.price >= activePosition.effectiveBreakeven ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {activePosition.price >= activePosition.effectiveBreakeven ? '✓ Above' : '✗ Below'} effective breakeven
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Effective Breakeven</div>
                        <div className="text-xl font-extrabold text-gray-900">${fmt(activePosition.effectiveBreakeven)}</div>
                        <div className="text-[10px] text-gray-400">Cost + ${fmt(activePosition.currentCarryCost)} carry</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Total Value</div>
                        <div className="text-sm font-bold text-gray-900">
                          {activePosition.totalValue ? fmtDollar(activePosition.totalValue) : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Unrealized P&L</div>
                        <div className={`text-sm font-bold ${
                          (activePosition.unrealizedPL || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {activePosition.unrealizedPL !== null
                            ? `${activePosition.unrealizedPL >= 0 ? '+' : ''}${fmtDollar(activePosition.unrealizedPL)}`
                            : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Months Stored</div>
                        <div className="text-sm font-bold text-gray-900">{activePosition.monthsStored}</div>
                      </div>
                    </div>

                    {/* Marketed slider */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Percent Marketed</span>
                        <span className="text-xs font-bold text-emerald-600">{activePosition.percentMarketed}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={activePosition.percentMarketed}
                        onChange={(e) => handleUpdateMarketed(activePosition.id, parseInt(e.target.value, 10), activePosition.avgSalePrice)}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>0% — All in storage</span>
                        <span>100% — Fully marketed</span>
                      </div>
                    </div>
                  </div>

                  {/* Seasonal Price Pattern */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      {activePosition.crop.name} Seasonal Price Pattern (10-Year Avg)
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activePosition.seasonalChart} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[92, 106]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={30} />
                          <ReferenceLine y={100} stroke="#D1D5DB" strokeDasharray="3 3" />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                            formatter={(value: number) => [`${value}%`, 'Seasonal Index']}
                          />
                          <Bar dataKey="index" radius={[4, 4, 0, 0]}>
                            {activePosition.seasonalChart.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={entry.isCurrent ? activePosition.crop.color : entry.isPeak ? '#10B981' : entry.isTrough ? '#EF4444' : '#D1D5DB'}
                                opacity={entry.isCurrent ? 1 : 0.6}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: activePosition.crop.color }} /> Current Month</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Peak Months</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Trough Months</span>
                    </div>
                    <p className="text-[11px] text-gray-400 text-center mt-3">
                      {activePosition.crop.name} prices are historically strongest {activePosition.crop.peakMonths} and weakest {activePosition.crop.troughMonths}.
                      Current month: <strong className="text-gray-600">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][currentMonth]}</strong> — seasonal
                      index {activePosition.crop.seasonalIndex[currentMonth] >= 1.0 ? 'above' : 'below'} average.
                    </p>
                  </div>
                </div>

                {/* ── Row 3: Storage Cost Projection ──────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Storage Cost Projection</div>
                  <p className="text-xs text-gray-400 mb-4">How carrying costs erode your margin over the next 12 months</p>

                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activePosition.storageProjection} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                        <defs>
                          <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
                          formatter={(value: number, name: string) => [`$${fmt(value)}/bu`, name]}
                        />
                        <ReferenceLine y={activePosition.price || 0} stroke="#10B981" strokeDasharray="4 4" label={{ value: `Futures $${fmt(activePosition.price || 0)}`, position: 'right', fontSize: 10, fill: '#10B981' }} />
                        <Area type="monotone" dataKey="effectiveBreakeven" name="Effective Breakeven" stroke="#EF4444" strokeWidth={2} fill="url(#costGrad)" />
                        <Area type="monotone" dataKey="totalCarryCost" name="Carrying Cost" stroke="#F59E0B" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {activePosition.storageProjection.slice(0, 1).concat(
                      activePosition.storageProjection.filter((_, i) => i === 3 || i === 6 || i === 12)
                    ).map((row) => (
                      <div key={row.month} className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-gray-400 font-semibold">{row.month}</div>
                        <div className="text-sm font-bold text-gray-900">${fmt(row.effectiveBreakeven)}</div>
                        <div className={`text-[10px] font-semibold ${row.netMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {row.netMargin >= 0 ? '+' : ''}{fmt(row.netMargin)}/bu margin
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Row 4: Marketing Plan Builder ────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Marketing Plan Builder</div>
                  <p className="text-xs text-gray-400 mb-4">Choose a proven strategy template to structure your grain sales</p>

                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                    {PLAN_TEMPLATES.map((plan, idx) => (
                      <button
                        key={plan.name}
                        onClick={() => setActivePlan(idx)}
                        className={`px-4 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all ${
                          activePlan === idx
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-900">{PLAN_TEMPLATES[activePlan].name}</h4>
                      <span className="text-xs text-gray-400">{PLAN_TEMPLATES[activePlan].description}</span>
                    </div>
                    <div className="space-y-3">
                      {PLAN_TEMPLATES[activePlan].steps.map((step, idx) => {
                        const cumPct = PLAN_TEMPLATES[activePlan].steps.slice(0, idx + 1).reduce((a, s) => a + s.pct, 0);
                        const bushelsInStep = Math.round(activePosition.bushels * step.pct / 100);
                        const isCompleted = activePosition.percentMarketed >= cumPct;

                        return (
                          <div key={idx} className={`flex items-start gap-3 py-2 ${idx > 0 ? 'border-t border-gray-200' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                              isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">{step.trigger}</span>
                                <span className="text-xs font-bold text-gray-400">{step.pct}% = {bushelsInStep.toLocaleString()} bu</span>
                              </div>
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className="h-1 rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${Math.min(100, (activePosition.percentMarketed / cumPct) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Educational Section ────────────────────────────────────── */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowEducation(!showEducation)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0C1F17] to-[#1B4332] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900">Understanding the Marketing Score</h3>
                <p className="text-xs text-gray-400">How the score is calculated and what it means for your operation</p>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`text-gray-400 transition-transform ${showEducation ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showEducation && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="prose prose-sm max-w-none mt-4 text-gray-600">
                <p><strong className="text-gray-900">What is the Marketing Score?</strong> It&apos;s a composite 0–100 index that synthesizes five market signals into a single actionable number. Above 70 suggests conditions favor selling. Below 40 suggests patience may be rewarded. Between 40–70 is a neutral zone where other factors — cash flow needs, storage capacity, risk tolerance — should drive your decision.</p>
                <p><strong className="text-gray-900">Profitability (30% weight)</strong> — How far is the current futures price above or below your cost of production? This is the single most important factor. If you&apos;re profitable, the question shifts from &quot;can I sell?&quot; to &quot;should I sell now or wait for more?&quot;</p>
                <p><strong className="text-gray-900">Seasonal Timing (25% weight)</strong> — Cash grain prices follow predictable seasonal patterns driven by harvest pressure, export demand cycles, and planting intentions. Corn and soybeans are typically weakest at harvest (September–October) and strongest in late winter through spring. Selling into seasonal strength historically improves average prices by 5–15%.</p>
                <p><strong className="text-gray-900">Market Structure (20% weight)</strong> — The shape of the futures curve tells you what the market is willing to pay for time. Backwardation (nearby futures above deferred) means the market wants grain now — a sell signal. Contango (deferred above nearby) means the market is paying you to store — a hold signal, as long as the carry exceeds your actual storage costs.</p>
                <p><strong className="text-gray-900">Storage Cost Burn (15% weight)</strong> — Every month grain sits in storage, the effective breakeven rises. Commercial storage at $0.04–0.06/bu/month plus shrink (0.1–0.2% per month) plus interest on the grain&apos;s value can add $0.20–0.50/bu over a 6-month storage period. This score rises (toward &quot;sell&quot;) as carrying costs consume more of your margin.</p>
                <p><strong className="text-gray-900">Basis Opportunity (10% weight)</strong> — Coming in Phase 28 Build 2, this will compare your local elevator basis against historical averages. A basis that&apos;s unusually strong relative to history is a sell signal — it means local demand is elevated relative to supply.</p>
                <p className="text-xs text-gray-400 italic">The Marketing Score is an analytical tool, not financial advice. Always consult your marketing plan, cash flow needs, and risk tolerance before making grain sales decisions.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── CTA Section ────────────────────────────────────────────── */}
        <div className="mt-8 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] rounded-2xl p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
            Want SMS alerts when your Marketing Score spikes?
          </h3>
          <p className="text-white/50 text-sm mb-6 max-w-lg mx-auto">
            Get notified instantly when conditions favor selling — basis anomalies,
            seasonal peaks, or your score crossing a threshold you set.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] font-bold text-sm hover:opacity-90 transition-opacity shadow-lg"
            >
              Start Free Trial — 14 Days
            </Link>
            <span className="text-white/30 text-xs">15 free tools · No credit card required · Cancel anytime</span>
          </div>
        </div>

        {/* ── Cross-links ────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-3">Explore our other free tools</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: '/check', label: 'ARC/PLC Calculator' },
              { href: '/breakeven', label: 'Breakeven Calculator' },
              { href: '/cashflow', label: 'Cash Flow Forecaster' },
              { href: '/farm-score', label: 'Farm Score' },
              { href: '/markets', label: 'Commodity Markets' },
              { href: '/morning', label: 'Morning Dashboard' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="px-4 py-2 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
