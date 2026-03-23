// =============================================================================
// app/(marketing)/cashflow/page.tsx
// HarvestFile — Phase 27 Build 2: Farm Cash Flow Forecaster
//
// FREE TOOL #13 — The only free cash flow forecasting tool built specifically
// for American row crop farmers. No Excel spreadsheet. No $1,600/yr software.
//
// Every other cash flow tool: "Enter 400 cells in a spreadsheet, good luck."
// HarvestFile: "Your operating line hits $420K in April. You're cash-positive
//              by October 18th. Store 40% of grain → $31K more net income."
//
// Data: Regional cost benchmarks (UIUC, ISU, Purdue), CME futures from
//       /api/prices/futures, USDA program payment timing
// =============================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// When operating expenses hit during the year (% of total per month)
// Based on Midwest row crop timing: heavy spring spend, harvest costs in fall
const EXPENSE_TIMING: Record<string, number[]> = {
  seed:          [0, 0, 5, 45, 45, 5, 0, 0, 0, 0, 0, 0],
  fertilizer:    [0, 5, 20, 40, 25, 5, 5, 0, 0, 0, 0, 0],
  chemicals:     [0, 0, 10, 30, 35, 15, 10, 0, 0, 0, 0, 0],
  cropInsurance: [0, 0, 0, 0, 0, 0, 0, 50, 50, 0, 0, 0],
  fuelLube:      [3, 3, 8, 18, 18, 5, 5, 3, 7, 15, 12, 3],
  equipment:     [8, 8, 8, 8, 8, 8, 8, 8, 8, 10, 10, 8],
  labor:         [3, 3, 8, 18, 18, 8, 5, 3, 7, 15, 9, 3],
  landRent:      [0, 0, 50, 0, 0, 0, 0, 0, 50, 0, 0, 0],
  drying:        [0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 35, 15],
  hauling:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 35, 25],
  interest:      [8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 8, 8],
  other:         [8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 8, 8],
  living:        [8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.34, 8.33, 8.33, 8.33],
};

// Grain sale timing by strategy (% of crop sold per month)
const MARKETING_STRATEGIES: Record<string, { label: string; desc: string; timing: number[] }> = {
  harvest: {
    label: 'Sell at Harvest',
    desc: 'Sell 100% at harvest — immediate cash, no storage costs',
    timing: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 35, 25],
  },
  store50: {
    label: 'Store 50%',
    desc: 'Sell 50% at harvest, store remainder for spring rally',
    timing: [0, 0, 10, 10, 10, 0, 0, 0, 0, 20, 17, 13, 0, 10, 10],
    // Note: only first 12 used; simplify to 12 months
  },
  forward: {
    label: 'Forward Contract 40%',
    desc: 'Lock in 40% pre-harvest, sell remainder at harvest',
    timing: [0, 0, 0, 0, 0, 10, 15, 15, 0, 24, 21, 15],
  },
  spread: {
    label: 'Spread Sales Evenly',
    desc: 'Sell monthly Oct–Jun for diversified pricing',
    timing: [0, 0, 8, 8, 8, 8, 0, 0, 0, 15, 15, 15, 0, 8, 8, 8, 7],
  },
};

// Fix marketing strategies to ensure they're proper 12-month arrays summing to ~100
const SALE_TIMING: Record<string, number[]> = {
  harvest: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 35, 25],
  store50:  [0, 0, 10, 10, 10, 0, 0, 0, 0, 20, 17, 13],
  forward:  [0, 0, 0, 0, 0, 10, 15, 15, 0, 24, 21, 15],
  spread:   [5, 5, 8, 8, 8, 5, 0, 0, 0, 20, 18, 13],
};

// Crop configurations (shared with breakeven)
interface CropConfig {
  code: string;
  name: string;
  emoji: string;
  unit: string;
  color: string;
  defaultYield: number;
  defaultAcres: number;
  defaultPrice: number;
  benchmarks: Record<string, number>;
}

const CROP_CONFIGS: Record<string, CropConfig> = {
  CORN: {
    code: 'CORN', name: 'Corn', emoji: '🌽', unit: '$/bu', color: '#F59E0B',
    defaultYield: 200, defaultAcres: 500, defaultPrice: 4.20,
    benchmarks: {
      seed: 125, fertilizer: 175, chemicals: 45, cropInsurance: 35,
      fuelLube: 28, equipment: 55, labor: 22, landRent: 240,
      drying: 35, hauling: 12, interest: 18, other: 10,
    },
  },
  SOYBEANS: {
    code: 'SOYBEANS', name: 'Soybeans', emoji: '🫘', unit: '$/bu', color: '#059669',
    defaultYield: 55, defaultAcres: 500, defaultPrice: 10.20,
    benchmarks: {
      seed: 70, fertilizer: 30, chemicals: 50, cropInsurance: 28,
      fuelLube: 22, equipment: 45, labor: 18, landRent: 220,
      drying: 0, hauling: 10, interest: 14, other: 8,
    },
  },
  WHEAT: {
    code: 'WHEAT', name: 'Wheat', emoji: '🌾', unit: '$/bu', color: '#D97706',
    defaultYield: 60, defaultAcres: 300, defaultPrice: 5.50,
    benchmarks: {
      seed: 35, fertilizer: 95, chemicals: 35, cropInsurance: 22,
      fuelLube: 20, equipment: 40, labor: 15, landRent: 180,
      drying: 0, hauling: 8, interest: 12, other: 8,
    },
  },
};

const EXPENSE_LABELS: Record<string, string> = {
  seed: 'Seed', fertilizer: 'Fertilizer & Lime', chemicals: 'Chemicals & Herbicide',
  cropInsurance: 'Crop Insurance', fuelLube: 'Fuel & Lube', equipment: 'Equipment & Repairs',
  labor: 'Hired Labor', landRent: 'Land Rent / Ownership', drying: 'Drying & Storage',
  hauling: 'Hauling & Trucking', interest: 'Operating Interest', other: 'Miscellaneous',
  living: 'Family Living',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CropEntry {
  id: string;
  cropCode: string;
  acres: number;
  expectedYield: number;
  priceAssumption: number;
  costs: Record<string, number>;
}

interface FuturesData {
  latestSettle: number | null;
  latestDate: string | null;
  change: number | null;
  changePct: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n);
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 text-xs">
      <div className="font-bold text-gray-900 mb-2">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-600">{p.name}</span>
          </div>
          <span className={`font-bold ${p.value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Waterfall Tooltip ──────────────────────────────────────────────────────

function WaterfallTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
  const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
  const net = income - Math.abs(expenses);
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 text-xs">
      <div className="font-bold text-gray-900 mb-2">{label}</div>
      <div className="flex items-center justify-between gap-4 mb-0.5">
        <span className="text-emerald-600">Income</span>
        <span className="font-bold text-emerald-700">{fmt(income)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-0.5">
        <span className="text-red-500">Expenses</span>
        <span className="font-bold text-red-600">{fmt(Math.abs(expenses))}</span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-gray-100">
        <span className="font-bold text-gray-900">Net</span>
        <span className={`font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(net)}</span>
      </div>
    </div>
  );
}

// ─── LOC Gauge ──────────────────────────────────────────────────────────────

function LOCGauge({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  const isWarning = pct > 75;
  const isDanger = pct > 90;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-900">Operating Line of Credit</div>
        <div className={`text-sm font-extrabold ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-700'}`}>
          {pct.toFixed(0)}% Used
        </div>
      </div>
      <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
            isDanger ? 'bg-gradient-to-r from-red-400 to-red-600' :
            isWarning ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
            'bg-gradient-to-r from-emerald-400 to-emerald-600'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Tick marks */}
        {[25, 50, 75].map((tick) => (
          <div key={tick} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${tick}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-gray-500">Drawn: <span className="font-bold text-gray-700">{fmtK(used)}</span></span>
        <span className="text-gray-500">Available: <span className="font-bold text-emerald-600">{fmtK(remaining)}</span></span>
        <span className="text-gray-500">Limit: <span className="font-bold text-gray-700">{fmtK(limit)}</span></span>
      </div>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({ label, value, subtext, status }: {
  label: string; value: string; subtext?: string;
  status?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const ring = status === 'good' ? 'ring-emerald-200 bg-emerald-50' :
    status === 'warn' ? 'ring-amber-200 bg-amber-50' :
    status === 'bad' ? 'ring-red-200 bg-red-50' : 'ring-gray-200 bg-white';
  const textColor = status === 'good' ? 'text-emerald-700' :
    status === 'warn' ? 'text-amber-700' :
    status === 'bad' ? 'text-red-600' : 'text-gray-900';

  return (
    <div className={`rounded-xl p-4 ring-1 ${ring}`}>
      <div className="text-[11px] text-gray-500 font-medium mb-1">{label}</div>
      <div className={`text-xl font-extrabold ${textColor}`}>{value}</div>
      {subtext && <div className="text-[10px] text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function CashFlowPage() {
  // ── Farm setup state ─────────────────────────────────────────────────
  const [crops, setCrops] = useState<CropEntry[]>(() => [{
    id: genId(), cropCode: 'CORN', acres: 500,
    expectedYield: 200, priceAssumption: 4.20,
    costs: { ...CROP_CONFIGS.CORN.benchmarks },
  }, {
    id: genId(), cropCode: 'SOYBEANS', acres: 500,
    expectedYield: 55, priceAssumption: 10.20,
    costs: { ...CROP_CONFIGS.SOYBEANS.benchmarks },
  }]);

  const [familyLiving, setFamilyLiving] = useState(74000);
  const [offFarmIncome, setOffFarmIncome] = useState(0);
  const [locLimit, setLocLimit] = useState(500000);
  const [locRate, setLocRate] = useState(7.5);
  const [marketingStrategy, setMarketingStrategy] = useState('harvest');
  const [usdaPayments, setUsdaPayments] = useState(0); // ARC/PLC + CRP
  const [cropInsIndemnity, setCropInsIndemnity] = useState(0);
  const [storageCostBu, setStorageCostBu] = useState(0.10);
  const [startingCash, setStartingCash] = useState(50000);

  // What-if sliders
  const [priceAdjust, setPriceAdjust] = useState(0); // -30% to +30%
  const [yieldAdjust, setYieldAdjust] = useState(0);

  // Futures
  const [futures, setFutures] = useState<Record<string, FuturesData>>({});
  const [futuresLoading, setFuturesLoading] = useState(true);

  // View toggle
  const [chartView, setChartView] = useState<'cumulative' | 'monthly'>('cumulative');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Fetch live futures ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchFutures() {
      try {
        const res = await fetch('/api/prices/futures?commodities=CORN,SOYBEANS,WHEAT,OATS');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) {
          setFutures(json.data);
          // Update price assumptions with live data
          setCrops(prev => prev.map(crop => {
            const live = json.data[crop.cropCode]?.latestSettle;
            if (live && crop.priceAssumption === CROP_CONFIGS[crop.cropCode]?.defaultPrice) {
              return { ...crop, priceAssumption: Math.round(live * 100) / 100 };
            }
            return crop;
          }));
        }
      } catch { /* silent */ } finally {
        setFuturesLoading(false);
      }
    }
    fetchFutures();
  }, []);

  // ── Crop management ───────────────────────────────────────────────────
  const addCrop = useCallback((code: string) => {
    const config = CROP_CONFIGS[code];
    if (!config) return;
    const live = futures[code]?.latestSettle;
    setCrops(prev => [...prev, {
      id: genId(), cropCode: code,
      acres: config.defaultAcres, expectedYield: config.defaultYield,
      priceAssumption: live || config.defaultPrice,
      costs: { ...config.benchmarks },
    }]);
  }, [futures]);

  const removeCrop = useCallback((id: string) => {
    setCrops(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCrop = useCallback((id: string, field: string, value: number) => {
    setCrops(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  // ── Monthly Cash Flow Model ───────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const data: Array<{
      month: string;
      monthFull: string;
      income: number;
      expenses: number;
      net: number;
      cumulative: number;
      locDraw: number;
      grainSales: number;
      govPayments: number;
      otherIncome: number;
    }> = [];

    const saleTiming = SALE_TIMING[marketingStrategy] || SALE_TIMING.harvest;
    let cumulative = startingCash;

    for (let m = 0; m < 12; m++) {
      // ── EXPENSES ──
      let monthExpenses = 0;

      // Crop production costs
      for (const crop of crops) {
        const adjYield = crop.expectedYield * (1 + yieldAdjust / 100);
        const totalCropCost = Object.entries(crop.costs).reduce((sum, [key, val]) => {
          const timing = EXPENSE_TIMING[key] || EXPENSE_TIMING.other;
          return sum + (val * crop.acres * (timing[m] / 100));
        }, 0);
        monthExpenses += totalCropCost;
      }

      // Family living (monthly)
      monthExpenses += familyLiving / 12;

      // Storage costs (if storing grain, months after harvest that grain is held)
      if (marketingStrategy !== 'harvest') {
        // Estimate bushels still in storage
        const soldPctThrough = saleTiming.slice(0, m + 1).reduce((a, b) => a + b, 0);
        const totalBu = crops.reduce((sum, c) => {
          const adjYield = c.expectedYield * (1 + yieldAdjust / 100);
          return sum + (adjYield * c.acres);
        }, 0);
        const buInStorage = totalBu * Math.max(0, (100 - soldPctThrough)) / 100;
        if (m >= 9) { // Only charge storage after harvest
          monthExpenses += buInStorage * storageCostBu;
        }
      }

      // ── INCOME ──
      let grainSales = 0;
      for (const crop of crops) {
        const adjYield = crop.expectedYield * (1 + yieldAdjust / 100);
        const adjPrice = crop.priceAssumption * (1 + priceAdjust / 100);
        const totalBu = adjYield * crop.acres;
        grainSales += totalBu * adjPrice * (saleTiming[m] / 100);
      }

      // Government payments (ARC/PLC + CRP arrive in October)
      const govPayments = m === 9 ? usdaPayments : 0;

      // Crop insurance indemnity (if any, arrives December)
      const insPayment = m === 11 ? cropInsIndemnity : 0;

      // Off-farm income (monthly)
      const otherIncome = (offFarmIncome / 12) + insPayment;

      const totalIncome = grainSales + govPayments + otherIncome;
      const net = totalIncome - monthExpenses;
      cumulative += net;

      // LOC draw = how negative the cumulative is (farmer borrows to cover)
      const locDraw = Math.max(0, -cumulative + startingCash);

      data.push({
        month: MONTHS[m],
        monthFull: MONTH_FULL[m],
        income: Math.round(totalIncome),
        expenses: Math.round(-monthExpenses), // Negative for chart
        net: Math.round(net),
        cumulative: Math.round(cumulative),
        locDraw: Math.round(locDraw),
        grainSales: Math.round(grainSales),
        govPayments: Math.round(govPayments),
        otherIncome: Math.round(otherIncome),
      });
    }

    return data;
  }, [crops, familyLiving, offFarmIncome, marketingStrategy, storageCostBu,
      priceAdjust, yieldAdjust, usdaPayments, cropInsIndemnity, startingCash]);

  // ── Summary Metrics ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
    const totalExpenses = monthlyData.reduce((s, d) => s + Math.abs(d.expenses), 0);
    const netIncome = totalIncome - totalExpenses;
    const minCash = Math.min(...monthlyData.map(d => d.cumulative));
    const maxLOC = Math.max(...monthlyData.map(d => d.locDraw));
    const peakDeficitMonth = monthlyData.find(d => d.cumulative === minCash)?.month || 'Sep';

    // Cash positive month = first month after min where cumulative > starting cash
    const minIdx = monthlyData.findIndex(d => d.cumulative === minCash);
    const cashPositiveMonth = monthlyData.slice(minIdx).find(d => d.cumulative > startingCash)?.month || '—';

    const opExpenseRatio = totalIncome > 0 ? ((totalExpenses - familyLiving) / totalIncome * 100) : 0;
    const locUtilization = locLimit > 0 ? (maxLOC / locLimit * 100) : 0;

    // LOC interest estimate
    const avgLocBalance = monthlyData.reduce((s, d) => s + d.locDraw, 0) / 12;
    const estInterest = avgLocBalance * (locRate / 100);

    // Working capital at year end
    const yearEndCash = monthlyData[11]?.cumulative || 0;

    return {
      totalIncome, totalExpenses, netIncome, minCash, maxLOC,
      peakDeficitMonth, cashPositiveMonth, opExpenseRatio, locUtilization,
      estInterest, yearEndCash, avgLocBalance,
    };
  }, [monthlyData, familyLiving, locLimit, locRate, startingCash]);

  // Available crops not yet added
  const availableCrops = Object.keys(CROP_CONFIGS).filter(
    code => !crops.some(c => c.cropCode === code)
  );

  // Total acres
  const totalAcres = crops.reduce((s, c) => s + c.acres, 0);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* ══ Hero ════════════════════════════════════════════════════════════ */}
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
              FREE TOOL #13
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              12-MONTH PROJECTION
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
            Farm Cash Flow
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Forecaster
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg max-w-xl leading-relaxed mb-6">
            See exactly when your money comes in and goes out — month by month.
            Model grain marketing strategies, track your operating line, and know your
            cash position before the bank does.{' '}
            <span className="text-white/70 font-semibold">Free. No signup required.</span>
          </p>

          {/* Live price badges */}
          {!futuresLoading && (
            <div className="flex flex-wrap gap-3">
              {crops.map(crop => {
                const f = futures[crop.cropCode];
                const config = CROP_CONFIGS[crop.cropCode];
                if (!f?.latestSettle || !config) return null;
                return (
                  <div key={crop.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
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
            </div>
          )}
        </div>
      </section>

      {/* ══ Main Content ═══════════════════════════════════════════════════ */}
      <section className="relative -mt-2 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">

          {/* ── Key Metrics Row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <MetricCard
              label="Year-End Cash Position"
              value={fmtK(metrics.yearEndCash)}
              subtext={`Starting: ${fmtK(startingCash)}`}
              status={metrics.yearEndCash > startingCash ? 'good' : metrics.yearEndCash > 0 ? 'warn' : 'bad'}
            />
            <MetricCard
              label="Peak LOC Draw"
              value={fmtK(metrics.maxLOC)}
              subtext={`${metrics.locUtilization.toFixed(0)}% of ${fmtK(locLimit)} limit`}
              status={metrics.locUtilization < 60 ? 'good' : metrics.locUtilization < 85 ? 'warn' : 'bad'}
            />
            <MetricCard
              label="Tightest Month"
              value={metrics.peakDeficitMonth}
              subtext={`Cash position: ${fmtK(metrics.minCash)}`}
              status={metrics.minCash > 0 ? 'good' : metrics.minCash > -locLimit ? 'warn' : 'bad'}
            />
            <MetricCard
              label="Net Farm Income"
              value={fmtK(metrics.netIncome)}
              subtext={`Op. ratio: ${metrics.opExpenseRatio.toFixed(0)}%`}
              status={metrics.netIncome > 0 ? 'good' : 'bad'}
            />
          </div>

          {/* ── Cash Flow Chart ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                12-Month Cash Flow Projection
              </h2>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setChartView('cumulative')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    chartView === 'cumulative' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Cumulative
                </button>
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    chartView === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              {chartView === 'cumulative' ? (
                <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashGradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="locGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => fmtK(v)} width={65} />
                  <Tooltip content={<CashFlowTooltip />} />
                  <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
                  <ReferenceLine y={startingCash} stroke="#059669" strokeDasharray="4 4" strokeOpacity={0.4}
                    label={{ value: 'Starting Cash', position: 'right', fontSize: 10, fill: '#059669' }} />
                  {locLimit > 0 && (
                    <ReferenceLine y={-locLimit + startingCash} stroke="#DC2626" strokeDasharray="4 4" strokeOpacity={0.4}
                      label={{ value: 'LOC Limit', position: 'right', fontSize: 10, fill: '#DC2626' }} />
                  )}
                  <Area type="monotone" dataKey="cumulative" name="Cash Position" stroke="#059669" strokeWidth={2.5}
                    fill="url(#cashGradPos)" dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} />
                </AreaChart>
              ) : (
                <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => fmtK(v)} width={65} />
                  <Tooltip content={<WaterfallTooltip />} />
                  <ReferenceLine y={0} stroke="#d1d5db" />
                  <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[0, 0, 4, 4]} barSize={20} />
                </BarChart>
              )}
            </ResponsiveContainer>

            {/* LOC gauge */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <LOCGauge used={metrics.maxLOC} limit={locLimit} />
            </div>
          </div>

          {/* ── Two-Column: Inputs + Marketing Strategy ───────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* LEFT: Farm Setup (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Crop Cards */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                    Farm Setup — {totalAcres.toLocaleString()} Total Acres
                  </h3>
                  {availableCrops.length > 0 && (
                    <div className="relative group">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Crop
                      </button>
                      <div className="hidden group-hover:block absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[150px]">
                        {availableCrops.map(code => {
                          const config = CROP_CONFIGS[code];
                          return (
                            <button key={code} onClick={() => addCrop(code)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <span>{config.emoji}</span> {config.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {crops.map(crop => {
                    const config = CROP_CONFIGS[crop.cropCode];
                    if (!config) return null;
                    const totalCostPerAcre = Object.values(crop.costs).reduce((a, b) => a + b, 0);
                    const adjPrice = crop.priceAssumption * (1 + priceAdjust / 100);
                    const adjYield = crop.expectedYield * (1 + yieldAdjust / 100);
                    const grossRev = adjPrice * adjYield * crop.acres;
                    const totalCost = totalCostPerAcre * crop.acres;

                    return (
                      <div key={crop.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.emoji}</span>
                            <span className="text-sm font-bold text-gray-900">{config.name}</span>
                            <span className="text-xs text-gray-400">${totalCostPerAcre}/acre</span>
                          </div>
                          {crops.length > 1 && (
                            <button onClick={() => removeCrop(crop.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Acres</label>
                            <input type="number" value={crop.acres || ''} onChange={e => updateCrop(crop.id, 'acres', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Yield (bu/acre)</label>
                            <input type="number" value={crop.expectedYield || ''} onChange={e => updateCrop(crop.id, 'expectedYield', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Price Assumption</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                              <input type="number" step="0.01" value={crop.priceAssumption || ''}
                                onChange={e => updateCrop(crop.id, 'priceAssumption', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Cost/Acre</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                              <input type="number" value={totalCostPerAcre || ''} readOnly
                                className="w-full rounded-lg border border-gray-200 bg-gray-100 pl-7 pr-3 py-2 text-sm text-gray-500 cursor-not-allowed [appearance:textfield]" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/60">
                          <span className="text-[11px] text-gray-400">
                            Gross Revenue: <span className="font-semibold text-gray-600">{fmtK(grossRev)}</span>
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Total Cost: <span className="font-semibold text-gray-600">{fmtK(totalCost)}</span>
                          </span>
                          <span className={`text-[11px] font-bold ${grossRev - totalCost >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            Net: {fmtK(grossRev - totalCost)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* What-If Sliders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  What-If Scenarios
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Price slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Commodity Prices</span>
                      <span className={`text-sm font-bold ${priceAdjust === 0 ? 'text-gray-400' : priceAdjust > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {priceAdjust > 0 ? '+' : ''}{priceAdjust}%
                      </span>
                    </div>
                    <input type="range" min={-30} max={30} step={1} value={priceAdjust}
                      onChange={e => setPriceAdjust(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Bear (−30%)</span>
                      <button onClick={() => setPriceAdjust(0)} className="text-emerald-600 font-semibold hover:underline">Reset</button>
                      <span>Bull (+30%)</span>
                    </div>
                  </div>
                  {/* Yield slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Crop Yields</span>
                      <span className={`text-sm font-bold ${yieldAdjust === 0 ? 'text-gray-400' : yieldAdjust > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {yieldAdjust > 0 ? '+' : ''}{yieldAdjust}%
                      </span>
                    </div>
                    <input type="range" min={-30} max={30} step={1} value={yieldAdjust}
                      onChange={e => setYieldAdjust(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Drought (−30%)</span>
                      <button onClick={() => setYieldAdjust(0)} className="text-emerald-600 font-semibold hover:underline">Reset</button>
                      <span>Bumper (+30%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Marketing Strategy + Financial Inputs */}
            <div className="space-y-6">
              {/* Marketing Strategy */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Grain Marketing Strategy
                </h3>
                <div className="space-y-2">
                  {Object.entries(MARKETING_STRATEGIES).map(([key, strat]) => (
                    <button key={key} onClick={() => setMarketingStrategy(key)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        marketingStrategy === key
                          ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}>
                      <div className="text-xs font-bold text-gray-900">{strat.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{strat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Financial Inputs */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  Financial Inputs
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Starting Cash', value: startingCash, setter: setStartingCash, step: 1000 },
                    { label: 'Operating LOC Limit', value: locLimit, setter: setLocLimit, step: 10000 },
                    { label: 'LOC Interest Rate (%)', value: locRate, setter: setLocRate, step: 0.25, isDollar: false },
                    { label: 'Family Living Expenses', value: familyLiving, setter: setFamilyLiving, step: 1000 },
                    { label: 'Off-Farm Income (annual)', value: offFarmIncome, setter: setOffFarmIncome, step: 1000 },
                    { label: 'USDA Payments (ARC/PLC + CRP)', value: usdaPayments, setter: setUsdaPayments, step: 1000 },
                    { label: 'Crop Insurance Indemnity', value: cropInsIndemnity, setter: setCropInsIndemnity, step: 1000 },
                  ].map(item => (
                    <div key={item.label}>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">{item.label}</label>
                      <div className="relative">
                        {item.isDollar !== false && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                        )}
                        <input type="number" step={item.step} value={item.value || ''}
                          onChange={e => item.setter(parseFloat(e.target.value) || 0)}
                          className={`w-full rounded-lg border border-gray-200 bg-white ${item.isDollar !== false ? 'pl-7' : 'pl-3'} pr-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Monthly Breakdown Table ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Monthly Breakdown
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Month</th>
                  <th className="text-right py-2 px-2 text-emerald-600 font-medium">Grain Sales</th>
                  <th className="text-right py-2 px-2 text-blue-600 font-medium">Gov&apos;t</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Other</th>
                  <th className="text-right py-2 px-2 text-red-500 font-medium">Expenses</th>
                  <th className="text-right py-2 px-2 font-bold text-gray-700">Net</th>
                  <th className="text-right py-2 pl-2 font-bold text-gray-900">Cash Position</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((d, i) => (
                  <tr key={d.month} className={`border-b border-gray-50 ${d.cumulative < 0 ? 'bg-red-50/30' : ''}`}>
                    <td className="py-2 pr-4 font-semibold text-gray-700">{d.monthFull}</td>
                    <td className="py-2 px-2 text-right text-emerald-700">{d.grainSales > 0 ? fmtK(d.grainSales) : '—'}</td>
                    <td className="py-2 px-2 text-right text-blue-600">{d.govPayments > 0 ? fmtK(d.govPayments) : '—'}</td>
                    <td className="py-2 px-2 text-right text-gray-500">{d.otherIncome > 0 ? fmtK(d.otherIncome) : '—'}</td>
                    <td className="py-2 px-2 text-right text-red-500">{fmtK(Math.abs(d.expenses))}</td>
                    <td className={`py-2 px-2 text-right font-bold ${d.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {d.net >= 0 ? '+' : ''}{fmtK(d.net)}
                    </td>
                    <td className={`py-2 pl-2 text-right font-extrabold ${d.cumulative >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {fmtK(d.cumulative)}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="py-3 pr-4 text-gray-900">TOTAL</td>
                  <td className="py-3 px-2 text-right text-emerald-700">
                    {fmtK(monthlyData.reduce((s, d) => s + d.grainSales, 0))}
                  </td>
                  <td className="py-3 px-2 text-right text-blue-600">
                    {fmtK(monthlyData.reduce((s, d) => s + d.govPayments, 0))}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-500">
                    {fmtK(monthlyData.reduce((s, d) => s + d.otherIncome, 0))}
                  </td>
                  <td className="py-3 px-2 text-right text-red-600">
                    {fmtK(Math.abs(monthlyData.reduce((s, d) => s + d.expenses, 0)))}
                  </td>
                  <td className={`py-3 px-2 text-right ${metrics.netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {metrics.netIncome >= 0 ? '+' : ''}{fmtK(metrics.netIncome)}
                  </td>
                  <td className={`py-3 pl-2 text-right text-gray-900`}>
                    {fmtK(metrics.yearEndCash)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── How It Works ─────────────────────────────────────────────── */}
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-3">How This Forecaster Works</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Enter your crops, acreage, and expected yields. HarvestFile distributes your expenses
              across the year using real Midwest row crop timing patterns — rent in March and September,
              seed and fertilizer in April–May, insurance premium in August–September. Revenue is
              timed based on your grain marketing strategy. The cumulative chart shows your cash
              position every month so you can see exactly when you&apos;ll need your operating line
              and when you can pay it back.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-400">
              <span className="px-3 py-1.5 bg-gray-100 rounded-full">Expense timing = real Midwest patterns</span>
              <span className="px-3 py-1.5 bg-gray-100 rounded-full">Revenue = Price × Yield × Acres × Sale %</span>
              <span className="px-3 py-1.5 bg-gray-100 rounded-full">Cash Position = Starting + Σ(Monthly Net)</span>
            </div>
          </div>

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <div className="mt-12 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Take Your Cash Flow to the Next Level</h3>
            <p className="text-white/50 text-sm mb-5 max-w-md mx-auto">
              Save your projections, get PDF exports for your lender, track actual vs. projected
              cash flow, and access Farm Score, AI reports, and 12 more free tools.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] text-sm font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all">
                Create Free Account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/breakeven"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:border-white/40 hover:text-white transition-all">
                Try Breakeven Calculator →
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
