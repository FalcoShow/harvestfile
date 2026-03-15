// =============================================================================
// HarvestFile — Interactive ARC/PLC Scenario Modeler
// Phase 6B: The feature that makes every farmer say "I need this."
//
// Client Component island embedded in the Server Component county page.
// Receives historical data as props, computes everything client-side
// (~140 arithmetic operations — runs in microseconds).
//
// Architecture: No API calls. Pure client-side math via arc-plc-engine.ts.
// Recharts ComposedChart renders ARC vs PLC projected payments 2025–2031.
// =============================================================================

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts';
import {
  projectScenario,
  type HistoricalYear,
  type ProjectedYear,
  type ScenarioResult,
} from '@/lib/arc-plc-engine';
import {
  SCENARIO_PRESETS,
  getCommodityConfig,
  type ScenarioPreset,
} from '@/lib/constants/arc-plc';

// ─── Props ───────────────────────────────────────────────────────────────────

interface CropOption {
  commodityCode: string;
  displayName: string;
  unitLabel: string;
  statutoryRefPrice: number;
  years: {
    crop_year: number;
    county_yield: number | null;
    mya_price: number | null;
    benchmark_yield: number | null;
    benchmark_revenue: number | null;
    arc_guarantee: number | null;
    arc_payment_rate: number | null;
    plc_payment_rate: number | null;
  }[];
}

interface ScenarioModelerProps {
  crops: CropOption[];
  countyName: string;
  stateAbbr: string;
}

// ─── Color Constants ─────────────────────────────────────────────────────────

const COLORS = {
  arc: '#10b981',           // Emerald-500
  arcLight: '#34d399',      // Emerald-400
  arcBg: 'rgba(16,185,129,0.08)',
  plc: '#3b82f6',           // Blue-500
  plcLight: '#60a5fa',      // Blue-400
  plcBg: 'rgba(59,130,246,0.08)',
  gold: '#C9A84C',
  goldDim: '#9E7E30',
  muted: 'rgba(255,255,255,0.25)',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#e5e7eb',
  textMuted: 'rgba(255,255,255,0.4)',
  textDim: 'rgba(255,255,255,0.2)',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScenarioModeler({ crops, countyName, stateAbbr }: ScenarioModelerProps) {
  // State
  const [selectedCrop, setSelectedCrop] = useState(0);
  const [activePreset, setActivePreset] = useState('baseline');
  const [priceAdj, setPriceAdj] = useState(0);    // -30 to +30 (percentage)
  const [yieldAdj, setYieldAdj] = useState(0);     // -30 to +30 (percentage)
  const [showTable, setShowTable] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const crop = crops[selectedCrop];
  if (!crop) return null;

  const config = getCommodityConfig(crop.commodityCode);

  // Convert crop data to engine format
  const historicalYears: HistoricalYear[] = useMemo(() =>
    crop.years
      .filter(y => y.crop_year && y.crop_year < 2025)
      .map(y => ({
        cropYear: y.crop_year,
        countyYield: y.county_yield,
        myaPrice: y.mya_price,
        benchmarkYield: y.benchmark_yield,
        benchmarkRevenue: y.benchmark_revenue,
        arcGuarantee: y.arc_guarantee,
        arcPaymentRate: y.arc_payment_rate,
        plcPaymentRate: y.plc_payment_rate,
      })),
    [crop]
  );

  // Run projection engine (instant — ~140 operations)
  const result: ScenarioResult | null = useMemo(() => {
    const multiplier = 1 + priceAdj / 100;
    const yieldMult = 1 + yieldAdj / 100;
    return projectScenario(crop.commodityCode, historicalYears, {
      priceMultiplier: multiplier,
      yieldMultiplier: yieldMult,
    });
  }, [crop.commodityCode, historicalYears, priceAdj, yieldAdj]);

  // Apply preset
  const applyPreset = useCallback((preset: ScenarioPreset) => {
    setActivePreset(preset.id);
    setPriceAdj(Math.round((preset.priceMultiplier - 1) * 100));
    setYieldAdj(Math.round((preset.yieldMultiplier - 1) * 100));
  }, []);

  if (!result || !config) {
    return (
      <div className="rounded-2xl border border-border/50 bg-surface/30 p-8 text-center">
        <p className="text-muted-foreground">
          Insufficient historical data to generate projections for {crop.displayName} in this county.
          At least 3 years of yield and price data are required.
        </p>
      </div>
    );
  }

  // Chart data
  const chartData = result.years.map(y => ({
    year: y.cropYear,
    arc: y.arcPaymentPerAcre,
    plc: y.plcPaymentPerAcre,
    mya: y.projectedMYA,
    yield: y.projectedCountyYield,
    isAuto: y.isAutoHigherOf,
    winner: y.winner,
  }));

  const maxPayment = Math.max(
    ...result.years.map(y => Math.max(y.arcPaymentPerAcre, y.plcPaymentPerAcre)),
    1
  );

  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-12" aria-label="ARC/PLC Scenario Modeler">
      <div className="rounded-2xl border border-harvest-gold/20 overflow-hidden">
        {/* ── Header with gold gradient accent ─────────────────────────── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-harvest-gold/5 via-transparent to-harvest-gold/5" />
          <div className="relative px-6 sm:px-8 py-6 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-harvest-gold/10 text-harvest-gold border border-harvest-gold/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-harvest-gold animate-pulse" />
                    Interactive
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Phase 6B
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  Multi-Year Scenario Modeler
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Projected ARC-CO vs PLC payments · {countyName}, {stateAbbr} · 2025–2031
                </p>
              </div>

              {/* Crop selector (if multiple crops) */}
              {crops.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {crops.map((c, i) => (
                    <button
                      key={c.commodityCode}
                      onClick={() => { setSelectedCrop(i); setExpandedYear(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        i === selectedCrop
                          ? 'bg-harvest-gold/15 text-harvest-gold border border-harvest-gold/30'
                          : 'bg-surface/50 text-muted-foreground border border-border/50 hover:border-border hover:text-foreground'
                      }`}
                    >
                      {c.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Scenario Presets ─────────────────────────────────────────── */}
        <div className="px-6 sm:px-8 py-4 border-b border-border/50 bg-surface/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scenario</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                title={preset.description}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activePreset === preset.id
                    ? 'bg-foreground/10 text-foreground border border-foreground/20 shadow-sm'
                    : 'bg-surface/50 text-muted-foreground border border-border/50 hover:border-border hover:text-foreground'
                }`}
              >
                <span>{preset.emoji}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Sliders ─────────────────────────────────────────────────── */}
        <div className="px-6 sm:px-8 py-5 border-b border-border/50 grid sm:grid-cols-2 gap-6">
          <SliderControl
            label="Price Adjustment"
            value={priceAdj}
            onChange={(v) => { setPriceAdj(v); setActivePreset('custom'); }}
            min={-30}
            max={30}
            unit="%"
            description={`${crop.displayName} MYA prices ${priceAdj >= 0 ? '+' : ''}${priceAdj}% from baseline`}
          />
          <SliderControl
            label="Yield Adjustment"
            value={yieldAdj}
            onChange={(v) => { setYieldAdj(v); setActivePreset('custom'); }}
            min={-30}
            max={30}
            unit="%"
            description={`County yields ${yieldAdj >= 0 ? '+' : ''}${yieldAdj}% from trend`}
          />
        </div>

        {/* ── Summary Cards ───────────────────────────────────────────── */}
        <div className="px-6 sm:px-8 py-5 border-b border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="ARC-CO Total"
              value={`$${result.totalArcPayment.toFixed(0)}`}
              sub="per base acre · 7 years"
              accent={result.overallWinner === 'ARC-CO'}
              color="emerald"
            />
            <SummaryCard
              label="PLC Total"
              value={`$${result.totalPlcPayment.toFixed(0)}`}
              sub="per base acre · 7 years"
              accent={result.overallWinner === 'PLC'}
              color="blue"
            />
            <SummaryCard
              label="Winner"
              value={result.overallWinner === 'TIE' ? 'Tie' : result.overallWinner}
              sub={result.overallWinner === 'TIE'
                ? 'Programs roughly equal'
                : `+$${result.cumulativeAdvantage > 0 ? result.cumulativeAdvantage.toFixed(0) : Math.abs(result.cumulativeAdvantage).toFixed(0)}/ac advantage`
              }
              accent={false}
              color={result.overallWinner === 'ARC-CO' ? 'emerald' : result.overallWinner === 'PLC' ? 'blue' : 'neutral'}
            />
            <SummaryCard
              label="Eff. Ref Price"
              value={`$${result.years[1]?.effectiveRefPrice.toFixed(2) ?? '—'}`}
              sub={`vs $${config?.statutoryRefPrice.toFixed(2)} statutory`}
              accent={false}
              color="gold"
            />
          </div>
        </div>

        {/* ── Chart ───────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-8 pt-6 pb-2">
          <div className="h-[320px] sm:h-[380px]" role="img" aria-label={`Bar chart comparing projected ARC-CO and PLC payments for ${crop.displayName} in ${countyName}, ${stateAbbr} from 2025 to 2031`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} barGap={2} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: COLORS.textMuted, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: COLORS.border }}
                  tickLine={false}
                  tickFormatter={(y: number) => y === 2025 ? '2025*' : String(y)}
                />
                <YAxis
                  tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                  width={52}
                />
                <Tooltip content={<CustomTooltip config={config} />} />

                {/* ARC-CO bars */}
                <Bar
                  dataKey="arc"
                  name="ARC-CO"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={`arc-${i}`}
                      fill={COLORS.arc}
                      fillOpacity={entry.year === 2025 ? 0.5 : 0.85}
                    />
                  ))}
                </Bar>

                {/* PLC bars */}
                <Bar
                  dataKey="plc"
                  name="PLC"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={`plc-${i}`}
                      fill={COLORS.plc}
                      fillOpacity={entry.year === 2025 ? 0.5 : 0.85}
                    />
                  ))}
                </Bar>

                {/* Reference line at $0 */}
                <ReferenceLine y={0} stroke={COLORS.border} />

                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value: string) => (
                    <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600 }}>
                      {value}
                    </span>
                  )}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-1 mb-3">
            * 2025: Automatic &ldquo;higher of&rdquo; provision — farmers receive whichever program pays more
          </p>
        </div>

        {/* ── AI Summary ──────────────────────────────────────────────── */}
        <div className="mx-6 sm:mx-8 mb-5 rounded-xl border border-border/50 bg-surface/30 p-5" aria-live="polite">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center">
              <span className="text-sm">💡</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">Projection Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.summary}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-2">
                Based on USDA ERS baseline projections (Feb 2026), county yield trends, and OBBBA program parameters.
                Estimates only — actual payments depend on final MYA prices and FSA county yields.
              </p>
            </div>
          </div>
        </div>

        {/* ── Data Table Toggle ────────────────────────────────────────── */}
        <div className="px-6 sm:px-8 pb-5">
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            {showTable ? 'Hide' : 'Show'} Detailed Calculation Table
          </button>

          {showTable && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface/50 border-b border-border/50">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Year</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">MYA Price</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Yield</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Bench Rev</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">ARC Guar</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-emerald-500/70">ARC $/ac</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">ERP</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-blue-400/70">PLC $/ac</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((y, i) => (
                    <React.Fragment key={y.cropYear}>
                      <tr
                        className={`border-b border-border/30 cursor-pointer hover:bg-surface/30 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-surface/10'
                        }`}
                        onClick={() => setExpandedYear(expandedYear === y.cropYear ? null : y.cropYear)}
                      >
                        <td className="px-3 py-2.5 font-semibold text-foreground">
                          {y.cropYear}{y.isAutoHigherOf ? '*' : ''}
                          <span className="ml-1 text-[10px] text-muted-foreground/40">
                            {expandedYear === y.cropYear ? '▼' : '▸'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-foreground tabular-nums">${y.projectedMYA.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-foreground tabular-nums">{y.projectedCountyYield.toFixed(1)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">${y.benchmarkRevenue.toFixed(0)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">${y.arcGuarantee.toFixed(0)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                          y.arcPaymentPerAcre > 0 ? 'text-emerald-400' : 'text-muted-foreground/40'
                        }`}>
                          ${y.arcPaymentPerAcre.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">${y.effectiveRefPrice.toFixed(2)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                          y.plcPaymentPerAcre > 0 ? 'text-blue-400' : 'text-muted-foreground/40'
                        }`}>
                          ${y.plcPaymentPerAcre.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            y.winner === 'ARC-CO' ? 'bg-emerald-500/15 text-emerald-400' :
                            y.winner === 'PLC' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-surface text-muted-foreground'
                          }`}>
                            {y.winner}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedYear === y.cropYear && (
                        <tr className="bg-surface/20">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="grid sm:grid-cols-2 gap-4 text-[11px]">
                              <div>
                                <div className="font-semibold text-emerald-400 mb-1.5">ARC-CO Calculation</div>
                                <div className="space-y-0.5 text-muted-foreground">
                                  <p>Olympic Avg Yield: {y.olympicAvgYield.toFixed(1)} {config?.unitLabel}/ac</p>
                                  <p>Olympic Avg Price: ${y.olympicAvgPrice.toFixed(2)}/{config?.unitLabel}</p>
                                  <p>Benchmark Revenue: ${y.benchmarkRevenue.toFixed(2)}/ac</p>
                                  <p>Guarantee (90%): ${y.arcGuarantee.toFixed(2)}/ac</p>
                                  <p>Actual Revenue: ${y.arcActualRevenue.toFixed(2)}/ac</p>
                                  <p>Shortfall: ${Math.max(0, y.arcGuarantee - y.arcActualRevenue).toFixed(2)} (cap: ${y.arcMaxPayment.toFixed(2)})</p>
                                  <p className="font-semibold text-emerald-400">Payment: ${y.arcPaymentPerAcre.toFixed(2)}/base acre</p>
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-blue-400 mb-1.5">PLC Calculation</div>
                                <div className="space-y-0.5 text-muted-foreground">
                                  <p>Eff. Ref Price: ${y.effectiveRefPrice.toFixed(2)}/{config?.unitLabel}</p>
                                  <p>Statutory Ref: ${config?.statutoryRefPrice.toFixed(2)}/{config?.unitLabel}</p>
                                  <p>MYA Price: ${y.projectedMYA.toFixed(2)}/{config?.unitLabel}</p>
                                  <p>PLC Rate: ${y.plcRate.toFixed(2)}/{config?.unitLabel}</p>
                                  <p>PLC Payment Yield: {y.plcPaymentYield.toFixed(1)} {config?.unitLabel}/ac</p>
                                  <p>× 85% acres × (1 − 5.7% seq.)</p>
                                  <p className="font-semibold text-blue-400">Payment: ${y.plcPaymentPerAcre.toFixed(2)}/base acre</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-surface/40 border-t border-border/50 font-semibold">
                    <td className="px-3 py-2.5 text-foreground" colSpan={5}>7-Year Cumulative Total</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 tabular-nums">
                      ${result.totalArcPayment.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right text-blue-400 tabular-nums">
                      ${result.totalPlcPayment.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        result.overallWinner === 'ARC-CO' ? 'bg-emerald-500/15 text-emerald-400' :
                        result.overallWinner === 'PLC' ? 'bg-blue-500/15 text-blue-400' :
                        'bg-surface text-muted-foreground'
                      }`}>
                        {result.overallWinner}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="px-6 sm:px-8 py-3 bg-surface/20 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[10px] text-muted-foreground/40">
            Data: USDA NASS Quick Stats · USDA ERS Baseline (Feb 2026) · OBBBA parameters (Pub. L. 119-21)
          </p>
          <p className="text-[10px] text-muted-foreground/40">
            Estimates only — not financial advice. Actual payments may differ.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SliderControl({
  label, value, onChange, min, max, unit, description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
  description: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const isNeutral = value === 0;
  const isPositive = value > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        <span className={`text-sm font-bold tabular-nums ${
          isNeutral ? 'text-muted-foreground' :
          isPositive ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {value >= 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-harvest-gold
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-harvest-gold-bright
          [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-harvest-gold/25
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-harvest-gold
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-harvest-gold-bright
          [&::-moz-range-thumb]:cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(201,168,76,0.4) 0%, rgba(201,168,76,0.4) ${pct}%, rgba(255,255,255,0.06) ${pct}%, rgba(255,255,255,0.06) 100%)`,
        }}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
      />
      <p className="text-[10px] text-muted-foreground/50 mt-1">{description}</p>
    </div>
  );
}

function SummaryCard({
  label, value, sub, accent, color,
}: {
  label: string;
  value: string;
  sub: string;
  accent: boolean;
  color: 'emerald' | 'blue' | 'gold' | 'neutral';
}) {
  const colorMap = {
    emerald: accent ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-border/50 bg-surface/30',
    blue: accent ? 'border-blue-500/30 bg-blue-500/[0.06]' : 'border-border/50 bg-surface/30',
    gold: 'border-harvest-gold/20 bg-harvest-gold/[0.04]',
    neutral: 'border-border/50 bg-surface/30',
  };

  const textColor = {
    emerald: accent ? 'text-emerald-400' : 'text-foreground',
    blue: accent ? 'text-blue-400' : 'text-foreground',
    gold: 'text-harvest-gold',
    neutral: 'text-foreground',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${colorMap[color]}`}>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-lg sm:text-xl font-extrabold mt-0.5 tabular-nums ${textColor[color]}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, config }: any) {
  if (!active || !payload?.length) return null;

  const arcData = payload.find((p: any) => p.dataKey === 'arc');
  const plcData = payload.find((p: any) => p.dataKey === 'plc');
  const isAuto = payload[0]?.payload?.isAuto;

  return (
    <div className="bg-[#0f1a14] border border-border/50 rounded-xl px-4 py-3 shadow-xl shadow-black/40 min-w-[200px]">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-sm font-bold text-foreground">{label}</span>
        {isAuto && (
          <span className="text-[9px] font-bold text-harvest-gold/70 uppercase">Auto Higher-Of</span>
        )}
      </div>
      <div className="space-y-1.5">
        {arcData && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.arc }} />
              <span className="text-xs text-muted-foreground">ARC-CO</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">
              ${arcData.value?.toFixed(2)}/ac
            </span>
          </div>
        )}
        {plcData && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.plc }} />
              <span className="text-xs text-muted-foreground">PLC</span>
            </div>
            <span className="text-xs font-bold text-blue-400 tabular-nums">
              ${plcData.value?.toFixed(2)}/ac
            </span>
          </div>
        )}
        {arcData && plcData && (
          <div className="border-t border-border/50 pt-1.5 mt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-muted-foreground/60">Difference</span>
              <span className={`text-[10px] font-bold ${
                arcData.value > plcData.value ? 'text-emerald-400' :
                plcData.value > arcData.value ? 'text-blue-400' : 'text-muted-foreground'
              }`}>
                {arcData.value > plcData.value
                  ? `ARC-CO +$${(arcData.value - plcData.value).toFixed(2)}`
                  : plcData.value > arcData.value
                    ? `PLC +$${(plcData.value - arcData.value).toFixed(2)}`
                    : 'Tie'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
