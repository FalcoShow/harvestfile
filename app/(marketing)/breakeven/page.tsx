// =============================================================================
// app/(marketing)/breakeven/page.tsx
// HarvestFile — Phase 27 Build 1: Farm Breakeven Calculator
//
// FREE TOOL #12 — The only breakeven calculator that compares your cost of
// production against LIVE CME futures prices in real-time.
//
// Every other breakeven tool: "Enter costs, get a number."
// HarvestFile: "Your corn breakeven is $4.18/bu. Futures are at $4.71.
//              You're profitable by $0.53/bu = $93.28/acre = $93,280 total."
//
// Data: Live CME futures from /api/prices/futures (Nasdaq Data Link)
// Benchmarks: University extension cost-of-production data (UIUC, ISU, Purdue)
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
} from 'recharts';

// ─── Crop Configuration ─────────────────────────────────────────────────────

interface CropConfig {
  code: string;
  name: string;
  emoji: string;
  unit: string;
  color: string;
  defaultYield: number;
  defaultAcres: number;
  effectiveRefPrice: number;
  hasFutures: boolean;
  // Default cost benchmarks ($/acre) from Midwest university extension data
  benchmarks: {
    seed: number;
    fertilizer: number;
    chemicals: number;
    cropInsurance: number;
    fuelLube: number;
    equipment: number;
    labor: number;
    landRent: number;
    drying: number;
    hauling: number;
    interest: number;
    other: number;
  };
}

const CROP_CONFIGS: Record<string, CropConfig> = {
  CORN: {
    code: 'CORN',
    name: 'Corn',
    emoji: '🌽',
    unit: '$/bu',
    color: '#F59E0B',
    defaultYield: 200,
    defaultAcres: 500,
    effectiveRefPrice: 4.42,
    hasFutures: true,
    benchmarks: {
      seed: 125,
      fertilizer: 175,
      chemicals: 45,
      cropInsurance: 35,
      fuelLube: 28,
      equipment: 55,
      labor: 22,
      landRent: 240,
      drying: 35,
      hauling: 12,
      interest: 18,
      other: 10,
    },
  },
  SOYBEANS: {
    code: 'SOYBEANS',
    name: 'Soybeans',
    emoji: '🫘',
    unit: '$/bu',
    color: '#059669',
    defaultYield: 55,
    defaultAcres: 500,
    effectiveRefPrice: 10.71,
    hasFutures: true,
    benchmarks: {
      seed: 70,
      fertilizer: 30,
      chemicals: 50,
      cropInsurance: 28,
      fuelLube: 22,
      equipment: 45,
      labor: 18,
      landRent: 220,
      drying: 0,
      hauling: 10,
      interest: 14,
      other: 8,
    },
  },
  WHEAT: {
    code: 'WHEAT',
    name: 'Wheat',
    emoji: '🌾',
    unit: '$/bu',
    color: '#D97706',
    defaultYield: 60,
    defaultAcres: 300,
    effectiveRefPrice: 6.35,
    hasFutures: true,
    benchmarks: {
      seed: 35,
      fertilizer: 95,
      chemicals: 35,
      cropInsurance: 22,
      fuelLube: 20,
      equipment: 40,
      labor: 15,
      landRent: 180,
      drying: 0,
      hauling: 8,
      interest: 12,
      other: 8,
    },
  },
  OATS: {
    code: 'OATS',
    name: 'Oats',
    emoji: '🌱',
    unit: '$/bu',
    color: '#8B5CF6',
    defaultYield: 75,
    defaultAcres: 200,
    effectiveRefPrice: 2.65,
    hasFutures: true,
    benchmarks: {
      seed: 28,
      fertilizer: 60,
      chemicals: 25,
      cropInsurance: 15,
      fuelLube: 18,
      equipment: 35,
      labor: 12,
      landRent: 150,
      drying: 0,
      hauling: 6,
      interest: 10,
      other: 5,
    },
  },
  SORGHUM: {
    code: 'SORGHUM',
    name: 'Grain Sorghum',
    emoji: '🌿',
    unit: '$/bu',
    color: '#DC2626',
    defaultYield: 80,
    defaultAcres: 300,
    effectiveRefPrice: 4.40,
    hasFutures: false,
    benchmarks: {
      seed: 20,
      fertilizer: 80,
      chemicals: 30,
      cropInsurance: 18,
      fuelLube: 18,
      equipment: 35,
      labor: 12,
      landRent: 140,
      drying: 10,
      hauling: 8,
      interest: 10,
      other: 5,
    },
  },
};

const EXPENSE_LABELS: Record<string, string> = {
  seed: 'Seed',
  fertilizer: 'Fertilizer & Lime',
  chemicals: 'Chemicals & Herbicide',
  cropInsurance: 'Crop Insurance',
  fuelLube: 'Fuel & Lube',
  equipment: 'Equipment & Repairs',
  labor: 'Hired Labor',
  landRent: 'Land Rent / Ownership',
  drying: 'Drying & Storage',
  hauling: 'Hauling & Trucking',
  interest: 'Operating Interest',
  other: 'Miscellaneous',
};

const EXPENSE_ICONS: Record<string, string> = {
  seed: '🌱',
  fertilizer: '🧪',
  chemicals: '🧴',
  cropInsurance: '🛡️',
  fuelLube: '⛽',
  equipment: '🔧',
  labor: '👷',
  landRent: '🏡',
  drying: '🌬️',
  hauling: '🚛',
  interest: '🏦',
  other: '📋',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CropEntry {
  id: string;
  cropCode: string;
  acres: number;
  expectedYield: number;
  costs: Record<string, number>;
}

interface FuturesData {
  latestSettle: number | null;
  latestDate: string | null;
  change: number | null;
  changePct: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatCurrency(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function formatBushels(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

// ─── Cost Input Row ─────────────────────────────────────────────────────────

function CostInputRow({
  expenseKey,
  value,
  benchmark,
  onChange,
}: {
  expenseKey: string;
  value: number;
  benchmark: number;
  onChange: (key: string, val: number) => void;
}) {
  const pctOfBenchmark = benchmark > 0 ? ((value / benchmark) * 100).toFixed(0) : '—';
  const isAboveBenchmark = value > benchmark * 1.15;
  const isBelowBenchmark = value < benchmark * 0.85;

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-8 text-center text-base opacity-60 group-hover:opacity-100 transition-opacity">
        {EXPENSE_ICONS[expenseKey]}
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-gray-600 mb-0.5 truncate">
          {EXPENSE_LABELS[expenseKey]}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(expenseKey, parseFloat(e.target.value) || 0)}
            placeholder={benchmark.toString()}
            className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
      <div className="w-[72px] text-right hidden sm:block">
        <div className={`text-[11px] font-medium ${
          isAboveBenchmark ? 'text-red-500' : isBelowBenchmark ? 'text-emerald-600' : 'text-gray-400'
        }`}>
          {value > 0 ? `${pctOfBenchmark}%` : '—'}
        </div>
        <div className="text-[10px] text-gray-400">
          avg ${benchmark}
        </div>
      </div>
    </div>
  );
}

// ─── Profit Meter ───────────────────────────────────────────────────────────

function ProfitMeter({ breakeven, marketPrice }: { breakeven: number; marketPrice: number | null }) {
  if (!marketPrice || breakeven <= 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
        Enter costs to see profitability
      </div>
    );
  }

  const margin = marketPrice - breakeven;
  const marginPct = (margin / breakeven) * 100;
  const isProfitable = margin > 0;
  const meterWidth = Math.min(Math.abs(marginPct), 50);

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
          isProfitable
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${isProfitable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {isProfitable ? 'PROFITABLE' : 'UNDERWATER'}
        </div>
        <div className={`text-2xl font-extrabold tracking-tight ${isProfitable ? 'text-emerald-700' : 'text-red-600'}`}>
          {isProfitable ? '+' : ''}{formatCurrency(margin, 2)}<span className="text-sm font-medium text-gray-500">/bu</span>
        </div>
      </div>

      {/* Visual meter */}
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-1/2 bg-red-50" />
          <div className="w-1/2 bg-emerald-50" />
        </div>
        {/* Center line = breakeven */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 z-10" />
        {/* Margin bar */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-700 ease-out ${
            isProfitable ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          style={{
            left: isProfitable ? '50%' : `${50 - meterWidth}%`,
            width: `${meterWidth}%`,
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[11px] text-gray-500">
        <span>Loss ←</span>
        <span className="font-semibold text-gray-700">Breakeven: {formatCurrency(breakeven, 2)}/bu</span>
        <span>→ Profit</span>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BreakevenPage() {
  // Crop entries
  const [crops, setCrops] = useState<CropEntry[]>(() => {
    const cornConfig = CROP_CONFIGS.CORN;
    return [{
      id: generateId(),
      cropCode: 'CORN',
      acres: cornConfig.defaultAcres,
      expectedYield: cornConfig.defaultYield,
      costs: { ...cornConfig.benchmarks },
    }];
  });

  // Futures data
  const [futures, setFutures] = useState<Record<string, FuturesData>>({});
  const [futuresLoading, setFuturesLoading] = useState(true);
  const [futuresError, setFuturesError] = useState(false);

  // Active crop tab
  const [activeTab, setActiveTab] = useState<string>(crops[0]?.id || '');

  // What-if yield adjustment (percentage, -30 to +30)
  const [yieldAdjust, setYieldAdjust] = useState(0);

  // Fetch futures prices
  useEffect(() => {
    async function fetchFutures() {
      try {
        setFuturesLoading(true);
        const res = await fetch('/api/prices/futures?commodities=CORN,SOYBEANS,WHEAT,OATS');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (json.success) {
          setFutures(json.data);
        }
      } catch {
        setFuturesError(true);
      } finally {
        setFuturesLoading(false);
      }
    }
    fetchFutures();
  }, []);

  // Crop CRUD
  const addCrop = useCallback((cropCode: string) => {
    const config = CROP_CONFIGS[cropCode];
    if (!config) return;
    const newCrop: CropEntry = {
      id: generateId(),
      cropCode,
      acres: config.defaultAcres,
      expectedYield: config.defaultYield,
      costs: { ...config.benchmarks },
    };
    setCrops((prev) => [...prev, newCrop]);
    setActiveTab(newCrop.id);
  }, []);

  const removeCrop = useCallback((id: string) => {
    setCrops((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeTab === id && filtered.length > 0) {
        setActiveTab(filtered[0].id);
      }
      return filtered;
    });
  }, [activeTab]);

  const updateCropField = useCallback((id: string, field: 'acres' | 'expectedYield' | 'cropCode', value: number | string) => {
    setCrops((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === 'cropCode') {
          const config = CROP_CONFIGS[value as string];
          return {
            ...c,
            cropCode: value as string,
            expectedYield: config?.defaultYield || c.expectedYield,
            costs: config ? { ...config.benchmarks } : c.costs,
          };
        }
        return { ...c, [field]: value };
      })
    );
  }, []);

  const updateCost = useCallback((id: string, key: string, value: number) => {
    setCrops((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, costs: { ...c.costs, [key]: value } } : c
      )
    );
  }, []);

  const loadBenchmarks = useCallback((id: string) => {
    setCrops((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const config = CROP_CONFIGS[c.cropCode];
        return config ? { ...c, costs: { ...config.benchmarks } } : c;
      })
    );
  }, []);

  const clearCosts = useCallback((id: string) => {
    setCrops((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const zeroed: Record<string, number> = {};
        Object.keys(c.costs).forEach((k) => { zeroed[k] = 0; });
        return { ...c, costs: zeroed };
      })
    );
  }, []);

  // Calculations
  const calculations = useMemo(() => {
    return crops.map((crop) => {
      const config = CROP_CONFIGS[crop.cropCode];
      const totalCostPerAcre = Object.values(crop.costs).reduce((a, b) => a + b, 0);
      const adjustedYield = crop.expectedYield * (1 + yieldAdjust / 100);
      const breakevenPrice = adjustedYield > 0 ? totalCostPerAcre / adjustedYield : 0;
      const totalBushels = adjustedYield * crop.acres;
      const totalCost = totalCostPerAcre * crop.acres;

      const futuresInfo = futures[crop.cropCode];
      const marketPrice = futuresInfo?.latestSettle || null;
      const margin = marketPrice ? marketPrice - breakevenPrice : null;
      const profitPerAcre = margin && adjustedYield > 0 ? margin * adjustedYield : null;
      const totalProfit = profitPerAcre ? profitPerAcre * crop.acres : null;

      // Cost breakdown for chart
      const costBreakdown = Object.entries(crop.costs)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: EXPENSE_LABELS[key] || key,
          value,
          pctOfTotal: totalCostPerAcre > 0 ? (value / totalCostPerAcre) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        ...crop,
        config,
        totalCostPerAcre,
        adjustedYield,
        breakevenPrice,
        totalBushels,
        totalCost,
        marketPrice,
        margin,
        profitPerAcre,
        totalProfit,
        costBreakdown,
      };
    });
  }, [crops, futures, yieldAdjust]);

  // Farm totals
  const farmTotals = useMemo(() => {
    const totalAcres = calculations.reduce((a, c) => a + c.acres, 0);
    const totalCost = calculations.reduce((a, c) => a + c.totalCost, 0);
    const totalProfit = calculations
      .filter((c) => c.totalProfit !== null)
      .reduce((a, c) => a + (c.totalProfit || 0), 0);
    const cropsWithPrices = calculations.filter((c) => c.marketPrice !== null);
    const totalRevenue = cropsWithPrices.reduce(
      (a, c) => a + (c.marketPrice! * c.totalBushels),
      0
    );
    return { totalAcres, totalCost, totalProfit, totalRevenue, cropsWithPrices: cropsWithPrices.length };
  }, [calculations]);

  const activeCrop = calculations.find((c) => c.id === activeTab) || calculations[0];
  const availableCrops = Object.keys(CROP_CONFIGS).filter(
    (code) => !crops.some((c) => c.cropCode === code)
  );

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-10 bg-gradient-to-b from-[#0C1F17] to-[#143026] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20" />
              </svg>
              FREE TOOL #12
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              LIVE FUTURES
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
            Farm Breakeven
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Calculator
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg max-w-xl leading-relaxed mb-6">
            Enter your input costs. See your breakeven price per bushel. Compare it
            against live CME futures.{' '}
            <span className="text-emerald-400 font-semibold">Green = profitable</span>.{' '}
            <span className="text-red-400 font-semibold">Red = underwater</span>.
            Know your numbers before you sell.
          </p>

          {/* Live futures badges */}
          {!futuresLoading && !futuresError && (
            <div className="flex flex-wrap gap-3">
              {(['CORN', 'SOYBEANS', 'WHEAT'] as const).map((code) => {
                const f = futures[code];
                if (!f?.latestSettle) return null;
                const config = CROP_CONFIGS[code];
                return (
                  <div
                    key={code}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
                  >
                    <span className="text-sm">{config.emoji}</span>
                    <span className="text-white/60 text-xs font-medium">{config.name}</span>
                    <span className="text-white text-sm font-bold">${f.latestSettle.toFixed(2)}</span>
                    {f.change !== null && (
                      <span className={`text-xs font-semibold ${f.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {f.change >= 0 ? '▲' : '▼'} {Math.abs(f.change).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
              {futuresLoading && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                  <span className="text-white/40 text-xs">Loading futures...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Main Calculator ──────────────────────────────────────────────── */}
      <section className="relative -mt-2 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">

          {/* Crop tabs + add button */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {crops.map((crop) => {
              const config = CROP_CONFIGS[crop.cropCode];
              const calc = calculations.find((c) => c.id === crop.id);
              const isActive = crop.id === activeTab;
              return (
                <button
                  key={crop.id}
                  onClick={() => setActiveTab(crop.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
                    ${isActive
                      ? 'bg-white shadow-lg shadow-black/5 ring-1 ring-black/[0.06] text-gray-900'
                      : 'bg-white/50 text-gray-500 hover:bg-white/80 hover:text-gray-700'
                    }
                  `}
                >
                  <span>{config?.emoji}</span>
                  <span>{config?.name}</span>
                  {calc && calc.marketPrice && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                      (calc.margin || 0) >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {(calc.margin || 0) >= 0 ? '+' : ''}{formatCurrency(calc.margin || 0, 2)}
                    </span>
                  )}
                  {crops.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCrop(crop.id); }}
                      className="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </button>
              );
            })}

            {/* Add crop */}
            {availableCrops.length > 0 && crops.length < 5 && (
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-all border border-dashed border-gray-300 hover:border-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Crop
                </button>
                <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[160px]">
                  {availableCrops.map((code) => {
                    const config = CROP_CONFIGS[code];
                    return (
                      <button
                        key={code}
                        onClick={() => addCrop(code)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span>{config.emoji}</span> {config.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {activeCrop && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── Left: Cost Inputs ──────────────────────────────────── */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Crop header */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        {activeCrop.config?.emoji} {activeCrop.config?.name} — Input Costs
                      </h2>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => loadBenchmarks(activeCrop.id)}
                          className="text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                        >
                          Load Avg
                        </button>
                        <button
                          onClick={() => clearCosts(activeCrop.id)}
                          className="text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Acres + Yield inputs */}
                    <div className="flex gap-3 mt-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Total Acres</label>
                        <input
                          type="number"
                          value={activeCrop.acres || ''}
                          onChange={(e) => updateCropField(activeCrop.id, 'acres', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Expected Yield (bu/acre)</label>
                        <input
                          type="number"
                          value={activeCrop.expectedYield || ''}
                          onChange={(e) => updateCropField(activeCrop.id, 'expectedYield', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expense rows */}
                  <div className="px-5 py-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Per-Acre Costs</span>
                      <span className="text-[11px] text-gray-400 hidden sm:inline">vs. Avg</span>
                    </div>
                    {Object.keys(EXPENSE_LABELS).map((key) => (
                      <CostInputRow
                        key={key}
                        expenseKey={key}
                        value={activeCrop.costs[key] || 0}
                        benchmark={activeCrop.config?.benchmarks[key as keyof typeof activeCrop.config.benchmarks] || 0}
                        onChange={(k, v) => updateCost(activeCrop.id, k, v)}
                      />
                    ))}

                    {/* Total */}
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-900">Total Cost / Acre</span>
                      <span className="text-lg font-extrabold text-gray-900">{formatCurrency(activeCrop.totalCostPerAcre)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right: Results ─────────────────────────────────────── */}
              <div className="lg:col-span-7 space-y-6">

                {/* Breakeven + Profit Meter card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <ProfitMeter
                    breakeven={activeCrop.breakevenPrice}
                    marketPrice={activeCrop.marketPrice}
                  />

                  {/* Key numbers grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-500 font-medium mb-1">Breakeven</div>
                      <div className="text-lg font-extrabold text-gray-900">
                        {activeCrop.breakevenPrice > 0 ? `$${activeCrop.breakevenPrice.toFixed(2)}` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400">per bushel</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-500 font-medium mb-1">Market Price</div>
                      <div className="text-lg font-extrabold text-gray-900">
                        {activeCrop.marketPrice ? `$${activeCrop.marketPrice.toFixed(2)}` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {futuresLoading ? 'loading...' : activeCrop.config?.hasFutures ? 'CME futures' : 'no futures data'}
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 ${
                      (activeCrop.profitPerAcre || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                    }`}>
                      <div className="text-[11px] text-gray-500 font-medium mb-1">Profit / Acre</div>
                      <div className={`text-lg font-extrabold ${
                        (activeCrop.profitPerAcre || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}>
                        {activeCrop.profitPerAcre !== null
                          ? `${activeCrop.profitPerAcre >= 0 ? '+' : ''}${formatCurrency(activeCrop.profitPerAcre)}`
                          : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400">per acre</div>
                    </div>
                    <div className={`rounded-xl p-3 ${
                      (activeCrop.totalProfit || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                    }`}>
                      <div className="text-[11px] text-gray-500 font-medium mb-1">Total P&L</div>
                      <div className={`text-lg font-extrabold ${
                        (activeCrop.totalProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}>
                        {activeCrop.totalProfit !== null
                          ? `${activeCrop.totalProfit >= 0 ? '+' : ''}${formatCurrency(activeCrop.totalProfit)}`
                          : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400">{activeCrop.acres.toLocaleString()} acres</div>
                    </div>
                  </div>
                </div>

                {/* What-If Yield Slider */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      What-If: Yield Scenario
                    </h3>
                    <div className={`text-sm font-bold ${yieldAdjust === 0 ? 'text-gray-400' : yieldAdjust > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {yieldAdjust > 0 ? '+' : ''}{yieldAdjust}% → {activeCrop.adjustedYield.toFixed(0)} bu/acre
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={yieldAdjust}
                    onChange={(e) => setYieldAdjust(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Drought (−30%)</span>
                    <button onClick={() => setYieldAdjust(0)} className="text-emerald-600 font-semibold hover:underline">Reset</button>
                    <span>Bumper (+30%)</span>
                  </div>
                </div>

                {/* Cost Breakdown Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Cost Breakdown — $/Acre</h3>
                  {activeCrop.costBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(200, activeCrop.costBreakdown.length * 32)}>
                      <BarChart
                        data={activeCrop.costBreakdown}
                        layout="vertical"
                        margin={{ top: 0, right: 60, left: 5, bottom: 0 }}
                        barSize={18}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value) + '/acre', 'Cost']}
                          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                          contentStyle={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {activeCrop.costBreakdown.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={idx === 0 ? activeCrop.config?.color || '#059669' : `${activeCrop.config?.color || '#059669'}${Math.max(30, 90 - idx * 8).toString(16)}`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                      Enter costs to see breakdown
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Farm Summary (shows when 2+ crops) ────────────────────── */}
          {crops.length >= 2 && (
            <div className="mt-8 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
                Whole Farm Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-white/40 text-[11px] font-medium mb-1">Total Acres</div>
                  <div className="text-2xl font-extrabold">{farmTotals.totalAcres.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[11px] font-medium mb-1">Total Input Cost</div>
                  <div className="text-2xl font-extrabold">{formatCurrency(farmTotals.totalCost)}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[11px] font-medium mb-1">Est. Revenue</div>
                  <div className="text-2xl font-extrabold">{farmTotals.cropsWithPrices > 0 ? formatCurrency(farmTotals.totalRevenue) : '—'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[11px] font-medium mb-1">Est. Net P&L</div>
                  <div className={`text-2xl font-extrabold ${
                    farmTotals.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {farmTotals.cropsWithPrices > 0
                      ? `${farmTotals.totalProfit >= 0 ? '+' : ''}${formatCurrency(farmTotals.totalProfit)}`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Per-crop summary row */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                {calculations.map((calc) => (
                  <div key={calc.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{calc.config?.emoji}</span>
                      <span className="text-white/70">{calc.config?.name}</span>
                      <span className="text-white/30 text-xs">{calc.acres.toLocaleString()} ac</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white/50 text-xs">
                        BE: ${calc.breakevenPrice.toFixed(2)}
                      </span>
                      <span className="text-white/50 text-xs">
                        Mkt: {calc.marketPrice ? `$${calc.marketPrice.toFixed(2)}` : '—'}
                      </span>
                      <span className={`font-bold ${
                        (calc.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {calc.totalProfit !== null
                          ? `${calc.totalProfit >= 0 ? '+' : ''}${formatCurrency(calc.totalProfit)}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── How It Works ─────────────────────────────────────────── */}
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-3">How This Calculator Works</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Enter your per-acre input costs for each crop you grow. HarvestFile divides your total cost
              by your expected yield to calculate your breakeven price per bushel — the minimum price you
              need to cover all expenses. We compare that against live CME futures settlement prices to show
              you whether you&apos;re profitable at today&apos;s market. Default costs are pre-loaded from
              Midwest university extension budgets — adjust them to match your actual operation.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-400">
              <span className="px-3 py-1.5 bg-gray-100 rounded-full">Breakeven = Total Cost ÷ Expected Yield</span>
              <span className="px-3 py-1.5 bg-gray-100 rounded-full">Margin = Market Price − Breakeven</span>
              <span className="px-3 py-1.5 bg-gray-100 rounded-full">P&L = Margin × Yield × Acres</span>
            </div>
          </div>

          {/* ── CTA ──────────────────────────────────────────────────── */}
          <div className="mt-12 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Track Your Breakeven Over Time</h3>
            <p className="text-white/50 text-sm mb-5 max-w-md mx-auto">
              Save your farm&apos;s cost data, get alerts when market prices cross your breakeven, and
              access cash flow forecasting, Farm Score, and 11 more free tools.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] text-sm font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                Create Free Account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link
                href="/check"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:border-white/40 hover:text-white transition-all"
              >
                Try ARC/PLC Calculator →
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
