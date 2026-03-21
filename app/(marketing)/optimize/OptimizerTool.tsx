// =============================================================================
// HarvestFile — Phase 22: OBBBA Election Optimizer Tool
// app/(marketing)/optimize/OptimizerTool.tsx
//
// The most important tool in the entire platform. 1,000 Monte Carlo iterations
// tell farmers exactly whether ARC-CO or PLC pays more — with confidence levels.
// No competitor offers this. This is what makes HarvestFile revolutionary.
//
// Premium UI: dark green hero, gold accents, animated probability bars,
// confidence gauges, year-by-year breakdown, shareable results.
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface StateOption {
  state_fips: string;
  abbreviation: string;
  name: string;
}

interface CountyOption {
  county_fips: string;
  display_name: string;
}

interface CropOption {
  commodity_code: string;
  years: number;
}

interface YearResult {
  cropYear: number;
  isAutoHigherOf: boolean;
  arcWinProbability: number;
  plcWinProbability: number;
  expectedArcPayment: number;
  expectedPlcPayment: number;
  medianArcPayment: number;
  medianPlcPayment: number;
  arcPaymentProbability: number;
  plcPaymentProbability: number;
  arcPercentiles: number[];
  plcPercentiles: number[];
  expectedWinner: 'ARC-CO' | 'PLC' | 'TIE';
}

interface OptimizerResult {
  commodityCode: string;
  commodityName: string;
  countyName?: string;
  recommendation: 'ARC-CO' | 'PLC';
  confidence: number;
  confidenceTier: 'strong' | 'moderate' | 'marginal';
  years: YearResult[];
  totalExpectedArc: number;
  totalExpectedPlc: number;
  expectedAdvantage: number;
  totalDollarsArc?: number;
  totalDollarsPlc?: number;
  dollarAdvantage?: number;
  parameters: {
    iterations: number;
    priceCV: number;
    yieldCV: number;
    priceYieldCorrelation: number;
  };
  summary: string;
  computeTimeMs: number;
}

// ─── Emoji map ───────────────────────────────────────────────────────────────

const CROP_EMOJI: Record<string, string> = {
  CORN: '🌽',
  SOYBEANS: '🫘',
  WHEAT: '🌾',
  SORGHUM: '🌿',
  BARLEY: '🪴',
  OATS: '🌱',
  RICE: '🍚',
  PEANUTS: '🥜',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OptimizerTool() {
  // State
  const [states, setStates] = useState<StateOption[]>([]);
  const [counties, setCounties] = useState<CountyOption[]>([]);
  const [crops, setCrops] = useState<CropOption[]>([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [baseAcres, setBaseAcres] = useState('');
  const [plcYield, setPlcYield] = useState('');

  const [loading, setLoading] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [error, setError] = useState('');

  // ── Load states on mount ────────────────────────────────────────────────

  useEffect(() => {
    async function loadStates() {
      const { data } = await supabase
        .from('states')
        .select('state_fips, abbreviation, name')
        .gt('county_count', 0)
        .order('name');
      if (data) setStates(data);
    }
    loadStates();
  }, []);

  // ── Load counties when state changes ────────────────────────────────────

  useEffect(() => {
    if (!selectedState) {
      setCounties([]);
      setSelectedCounty('');
      return;
    }
    async function loadCounties() {
      const { data } = await supabase
        .from('counties')
        .select('county_fips, display_name')
        .eq('state_fips', selectedState)
        .eq('has_arc_plc_data', true)
        .order('display_name');
      if (data) setCounties(data);
      setSelectedCounty('');
      setCrops([]);
      setSelectedCrop('');
    }
    loadCounties();
  }, [selectedState]);

  // ── Load crops when county changes ──────────────────────────────────────

  useEffect(() => {
    if (!selectedCounty) {
      setCrops([]);
      setSelectedCrop('');
      return;
    }
    async function loadCrops() {
      const { data } = await supabase
        .from('county_crop_data')
        .select('commodity_code, crop_year')
        .eq('county_fips', selectedCounty);

      if (data) {
        const grouped: Record<string, number> = {};
        for (const row of data) {
          grouped[row.commodity_code] = (grouped[row.commodity_code] || 0) + 1;
        }
        const cropList = Object.entries(grouped)
          .filter(([, count]) => count >= 3)
          .map(([code, years]) => ({ commodity_code: code, years }))
          .sort((a, b) => b.years - a.years);
        setCrops(cropList);
        if (cropList.length === 1) setSelectedCrop(cropList[0].commodity_code);
      }
    }
    loadCrops();
    setSelectedCrop('');
    setResult(null);
    setError('');
  }, [selectedCounty]);

  // ── Run optimizer ───────────────────────────────────────────────────────

  const runOptimizer = useCallback(async () => {
    if (!selectedCounty || !selectedCrop) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSimProgress(0);

    // Fake progress animation (actual computation is server-side)
    const progressInterval = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 100);

    try {
      const params = new URLSearchParams({
        county_fips: selectedCounty,
        crop: selectedCrop,
      });
      if (baseAcres) params.set('acres', baseAcres);
      if (plcYield) params.set('plc_yield', plcYield);

      const res = await fetch(`/api/optimizer?${params}`);
      const json = await res.json();

      clearInterval(progressInterval);
      setSimProgress(100);

      if (!res.ok || !json.success) {
        setError(json.error || json.message || 'Optimization failed');
        setLoading(false);
        return;
      }

      // Brief pause for the progress bar to reach 100%
      await new Promise((r) => setTimeout(r, 300));
      setResult(json.data);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [selectedCounty, selectedCrop, baseAcres, plcYield]);

  // ── Share URL ───────────────────────────────────────────────────────────

  const shareUrl = useMemo(() => {
    if (!result) return '';
    const params = new URLSearchParams({
      county: selectedCounty,
      crop: selectedCrop,
    });
    if (baseAcres) params.set('acres', baseAcres);
    return `https://www.harvestfile.com/optimize?${params}`;
  }, [result, selectedCounty, selectedCrop, baseAcres]);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
  }, [shareUrl]);

  // ── Selected county/state names ─────────────────────────────────────────

  const countyName = counties.find((c) => c.county_fips === selectedCounty)?.display_name || '';
  const stateName = states.find((s) => s.state_fips === selectedState)?.name || '';
  const stateAbbr = states.find((s) => s.state_fips === selectedState)?.abbreviation || '';

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0C1F17] via-[#132B1E] to-[#1B4332]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-300 tracking-wide">
              1,000 Monte Carlo Simulations
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-4 tracking-tight"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Should You Choose{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              ARC-CO or PLC
            </span>
            ?
          </h1>

          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Stop guessing. The only optimizer that runs 1,000 probabilistic scenarios against your
            county's real USDA data — with the new OBBBA reference prices, 90% ARC guarantee, and
            12% payment cap already built in.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> 2,183 Counties
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> All OBBBA Changes
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Free · No Signup
            </div>
          </div>
        </div>
      </section>

      {/* ── Input Form ───────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <h2
            className="text-xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Your Farm Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all"
              >
                <option value="">Select state...</option>
                {states.map((s) => (
                  <option key={s.state_fips} value={s.state_fips}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* County */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                County
              </label>
              <select
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                disabled={!selectedState}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all disabled:opacity-40"
              >
                <option value="">
                  {selectedState ? 'Select county...' : 'Select state first'}
                </option>
                {counties.map((c) => (
                  <option key={c.county_fips} value={c.county_fips}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Crop pills */}
          {crops.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Commodity
              </label>
              <div className="flex flex-wrap gap-2">
                {crops.map((c) => (
                  <button
                    key={c.commodity_code}
                    onClick={() => setSelectedCrop(c.commodity_code)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      selectedCrop === c.commodity_code
                        ? 'bg-[#1B4332] text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {CROP_EMOJI[c.commodity_code] || '🌱'}{' '}
                    {c.commodity_code.charAt(0) + c.commodity_code.slice(1).toLowerCase()}
                    <span className="ml-1.5 text-xs opacity-60">
                      ({c.years}yr)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Base Acres{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={baseAcres}
                onChange={(e) => setBaseAcres(e.target.value)}
                placeholder="e.g., 500"
                min="0"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                PLC Payment Yield{' '}
                <span className="text-gray-400 font-normal">(optional, bu/ac)</span>
              </label>
              <input
                type="number"
                value={plcYield}
                onChange={(e) => setPlcYield(e.target.value)}
                placeholder="Uses 80% of benchmark"
                min="0"
                step="0.1"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={runOptimizer}
            disabled={!selectedCounty || !selectedCrop || loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] hover:shadow-lg hover:shadow-[#C9A84C]/20 active:scale-[0.99]"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            {loading ? 'Running Simulations...' : 'Run 1,000 Simulations →'}
          </button>

          {/* Progress bar (during loading) */}
          {loading && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Simulating price &amp; yield scenarios...</span>
                <span>{Math.min(100, Math.round(simProgress))}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#C9A84C] rounded-full transition-all duration-200"
                  style={{ width: `${Math.min(100, simProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && (
        <section className="max-w-3xl mx-auto px-4 mt-8 pb-16">
          {/* Recommendation Card */}
          <div
            className={`rounded-2xl p-8 mb-6 text-center relative overflow-hidden ${
              result.recommendation === 'ARC-CO'
                ? 'bg-gradient-to-br from-emerald-900 to-emerald-800'
                : 'bg-gradient-to-br from-blue-900 to-blue-800'
            }`}
          >
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_60%)]" />
            <div className="relative">
              <div className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-2">
                HarvestFile Recommends
              </div>
              <div
                className="text-5xl md:text-6xl font-bold text-white mb-3"
                style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
              >
                {result.recommendation}
              </div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
                  {result.confidence}% Confidence
                </div>
              </div>

              {/* Confidence bar */}
              <div className="max-w-xs mx-auto mb-4">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      result.confidenceTier === 'strong'
                        ? 'bg-emerald-400'
                        : result.confidenceTier === 'moderate'
                          ? 'bg-[#C9A84C]'
                          : 'bg-amber-400'
                    }`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-1.5">
                  {result.confidenceTier === 'strong'
                    ? 'Strong recommendation'
                    : result.confidenceTier === 'moderate'
                      ? 'Moderate confidence — worth considering farm-specific factors'
                      : 'Close call — both programs have merit'}
                </div>
              </div>

              <div className="text-white/70 text-sm max-w-lg mx-auto">
                {result.countyName && (
                  <span className="text-white font-semibold">
                    {result.commodityName} in {result.countyName}
                  </span>
                )}
                {' · '}
                {result.parameters.iterations.toLocaleString()} simulations in{' '}
                {result.computeTimeMs}ms
              </div>
            </div>
          </div>

          {/* Expected Payments */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              className={`rounded-xl p-6 border-2 ${
                result.recommendation === 'ARC-CO'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-sm font-semibold text-gray-500 mb-1">
                ARC-CO Expected
              </div>
              <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                ${result.totalExpectedArc.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">per base acre (2025–2031)</div>
              {result.totalDollarsArc != null && (
                <div className="mt-2 text-sm font-semibold text-emerald-700">
                  ${result.totalDollarsArc.toLocaleString()} total
                </div>
              )}
            </div>
            <div
              className={`rounded-xl p-6 border-2 ${
                result.recommendation === 'PLC'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-sm font-semibold text-gray-500 mb-1">
                PLC Expected
              </div>
              <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                ${result.totalExpectedPlc.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">per base acre (2025–2031)</div>
              {result.totalDollarsPlc != null && (
                <div className="mt-2 text-sm font-semibold text-blue-700">
                  ${result.totalDollarsPlc.toLocaleString()} total
                </div>
              )}
            </div>
          </div>

          {/* Advantage callout */}
          {result.dollarAdvantage != null && result.dollarAdvantage > 0 && (
            <div className="rounded-xl p-4 bg-gradient-to-r from-[#C9A84C]/10 to-[#E2C366]/10 border border-[#C9A84C]/20 text-center mb-6">
              <span className="text-[#8B6914] font-bold text-lg">
                {result.recommendation} advantage: ${result.dollarAdvantage.toLocaleString()}
              </span>
              <span className="text-[#8B6914]/60 text-sm ml-2">
                on {parseInt(baseAcres).toLocaleString()} base acres
              </span>
            </div>
          )}

          {/* Year-by-Year Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3
                className="font-bold text-gray-900"
                style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
              >
                Year-by-Year Projections
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left px-4 py-3 font-medium">Year</th>
                    <th className="text-right px-4 py-3 font-medium">ARC-CO</th>
                    <th className="text-right px-4 py-3 font-medium">PLC</th>
                    <th className="text-center px-4 py-3 font-medium">
                      ARC Win %
                    </th>
                    <th className="text-center px-4 py-3 font-medium">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((yr) => (
                    <tr
                      key={yr.cropYear}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {yr.cropYear}
                        {yr.isAutoHigherOf && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                            AUTO
                          </span>
                        )}
                      </td>
                      <td className="text-right px-4 py-3 text-gray-700 tabular-nums">
                        ${yr.expectedArcPayment.toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-3 text-gray-700 tabular-nums">
                        ${yr.expectedPlcPayment.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                              style={{
                                width: `${yr.arcWinProbability}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
                            {yr.arcWinProbability}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            yr.expectedWinner === 'ARC-CO'
                              ? 'bg-emerald-100 text-emerald-700'
                              : yr.expectedWinner === 'PLC'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {yr.expectedWinner}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-6 bg-gray-50 border border-gray-200 mb-6">
            <h3
              className="font-bold text-gray-900 mb-2"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
            >
              Analysis Summary
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {result.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
              <span>Price volatility: {(result.parameters.priceCV * 100).toFixed(0)}%</span>
              <span>·</span>
              <span>Yield variability: {(result.parameters.yieldCV * 100).toFixed(0)}%</span>
              <span>·</span>
              <span>
                Price-yield correlation: {result.parameters.priceYieldCorrelation}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={copyShareLink}
              className="px-5 py-2.5 rounded-lg bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#0C1F17] transition-colors"
            >
              📋 Copy Share Link
            </button>
            <button
              onClick={() => {
                setResult(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              🔄 Run Again
            </button>
            <Link
              href="/check"
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              🧮 Basic Calculator
            </Link>
          </div>
        </section>
      )}

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0C1F17] via-[#132B1E] to-[#1B4332] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Save Your Results &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Track Payments
            </span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Create a free account to save your optimization, get alerts when MYA prices change
            your recommendation, and track your projected payments in real time.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl font-bold text-[#0C1F17] bg-gradient-to-r from-[#C9A84C] to-[#E2C366] hover:shadow-lg hover:shadow-[#C9A84C]/20 transition-all"
            >
              Create Free Account
            </Link>
            <Link
              href="/check"
              className="px-8 py-3.5 rounded-xl font-bold text-white border border-white/20 hover:bg-white/5 transition-all"
            >
              Try ARC/PLC Calculator
            </Link>
          </div>

          {/* Cross-links to other tools */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {[
              { href: '/check', label: 'ARC/PLC Calculator', icon: '🧮' },
              { href: '/payments', label: 'Payment Scanner', icon: '💰' },
              { href: '/fba', label: 'FBA Calculator', icon: '🌾' },
              { href: '/sdrp', label: 'SDRP Checker', icon: '🛡️' },
              { href: '/calendar', label: 'Payment Calendar', icon: '📅' },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                <span>{tool.icon}</span>
                <span className="font-medium">{tool.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology + Disclaimer ─────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h3
          className="font-bold text-gray-900 mb-3"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          How the Optimizer Works
        </h3>
        <div className="text-sm text-gray-500 leading-relaxed space-y-3">
          <p>
            The HarvestFile Election Optimizer runs 1,000 Monte Carlo simulations for each
            crop year from 2025 through 2031. Each simulation samples a market price from a
            log-normal distribution (calibrated to historical MYA volatility) and a county yield
            from a normal distribution (calibrated to detrended historical yield variability).
            Prices and yields are negatively correlated (−0.35) to reflect the well-documented
            inverse relationship between supply shortfalls and commodity prices.
          </p>
          <p>
            For each simulated scenario, both ARC-CO and PLC payments are calculated using the
            exact OBBBA formulas — including the 90% ARC guarantee, 12% payment cap, updated
            effective reference prices (88% Olympic average escalator, 113% cap), 85% payment
            acres, and 5.7% sequestration. The 2025 auto-higher-of provision is modeled correctly.
          </p>
          <p>
            The recommendation reflects which program has higher expected (mean) payments across
            the majority of election years (2026–2031), with confidence measured as the percentage
            of simulations where the recommended program outperforms the alternative.
          </p>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
          <strong>Important Disclaimer:</strong> This tool provides estimates based on
          statistical modeling and publicly available USDA data. Actual payments depend on
          final MYA prices, actual county yields, farm-specific PLC payment yields, and FSA
          administrative determinations. HarvestFile is not affiliated with USDA, FSA, or any
          government agency. Consult your local FSA office or agricultural advisor before making
          election decisions. Payment projections are not guarantees.
        </div>
      </section>
    </div>
  );
}
