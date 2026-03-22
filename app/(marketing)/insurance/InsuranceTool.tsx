// =============================================================================
// HarvestFile — Phase 24A: Free Public Crop Insurance Calculator
// app/(marketing)/insurance/InsuranceTool.tsx
//
// The first tool ANYWHERE that shows a farmer's complete safety net:
// RP + SCO + ECO + ARC-CO/PLC — in one interactive view.
//
// No university tool does this. No ag-tech platform does this. Nobody.
//
// Light-theme marketing design matching /check and /optimize.
// Reuses all existing API routes and the Monte Carlo engine.
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

import {
  INSURANCE_COMMODITIES,
  COMMODITY_DISPLAY,
  PROJECTED_PRICES_2026,
  COVERAGE_LEVELS,
  SCENARIO_LABELS,
  COMMODITY_CODES,
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
} from '@/lib/insurance/constants';

import type { AdmBatchResponse, PremiumApiResponse } from '@/lib/insurance/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Scenario colors ─────────────────────────────────────────────────────────

const SCENARIO_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  arc_sco_eco95: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', light: 'bg-emerald-100' },
  plc_sco_eco95: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', light: 'bg-blue-100' },
  arc_sco_only:  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', light: 'bg-purple-100' },
  plc_rp_only:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', light: 'bg-amber-100' },
};

const SCENARIO_HEX: Record<string, string> = {
  arc_sco_eco95: '#059669',
  plc_sco_eco95: '#2563EB',
  arc_sco_only:  '#7C3AED',
  plc_rp_only:   '#D97706',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface SimScenario {
  scenario: ScenarioType;
  expectedNetBenefitPerAcre: number;
  paymentProbability: number;
  totalPremium: number;
  netBenefit: { p5: number; p50: number; p95: number; mean: number };
  rpPaymentProbability?: number;
  arcPaymentProbability?: number;
  plcPaymentProbability?: number;
  scoPaymentProbability?: number;
  ecoPaymentProbability?: number;
  histogram?: { bin: number; count: number }[];
}

interface SimResult {
  scenarios: SimScenario[];
  bestScenario: ScenarioType;
  bestExpectedNetBenefitPerAcre: number;
  iterations: number;
  executionTimeMs: number;
  inputs: { plantedAcres: number; coverageLevel: number; commodity: string; countyYield?: number };
  priceDistribution: { p10: number; p50: number; p90: number; mean: number };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsuranceTool() {
  // ── ADM State/County selection ──
  const [states, setStates] = useState<{ state_fips: string; state_name: string; state_abbreviation: string }[]>([]);
  const [counties, setCounties] = useState<{ state_fips: string; county_fips: string; county_name: string }[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [loadingCounties, setLoadingCounties] = useState(false);

  // ── Farm inputs ──
  const [commodity, setCommodity] = useState('CORN');
  const [aphYield, setAphYield] = useState(190);
  const [plantedAcres, setPlantedAcres] = useState(500);
  const [baseAcres, setBaseAcres] = useState(500);
  const [coverageLevel, setCoverageLevel] = useState<CoverageLevel>(75);

  // ── ADM premium data ──
  const [admData, setAdmData] = useState<AdmBatchResponse | null>(null);
  const [loadingPremiums, setLoadingPremiums] = useState(false);
  const [premiumError, setPremiumError] = useState('');

  // ── Simulation ──
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simError, setSimError] = useState('');

  // ── Derived values ──
  const selectedStateName = states.find(s => s.state_fips === selectedState)?.state_name || '';
  const selectedStateAbbr = states.find(s => s.state_fips === selectedState)?.state_abbreviation || '';
  const selectedCountyName = counties.find(c => c.county_fips === selectedCounty)?.county_name || '';
  const hasRealData = admData && admData.length > 0;
  const price = PROJECTED_PRICES_2026[commodity];
  const display = COMMODITY_DISPLAY[commodity];
  const arcPlc = ARC_PLC_REF_2026[commodity];

  // ── Load ADM states on mount ──
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('adm_states')
        .select('state_fips, state_name, state_abbreviation')
        .order('state_name');
      if (data) setStates(data);
    })();
  }, []);

  // ── Load ADM counties when state changes ──
  useEffect(() => {
    if (!selectedState) { setCounties([]); setSelectedCounty(''); setAdmData(null); return; }
    (async () => {
      setLoadingCounties(true);
      setSelectedCounty('');
      setAdmData(null);
      const { data } = await supabase
        .from('adm_counties')
        .select('state_fips, county_fips, county_name')
        .eq('state_fips', selectedState)
        .order('county_name');
      if (data) setCounties(data);
      setLoadingCounties(false);
    })();
  }, [selectedState]);

  // ── Fetch ADM premiums when county/commodity/inputs change ──
  useEffect(() => {
    if (!selectedState || !selectedCounty) { setAdmData(null); setPremiumError(''); return; }
    const code = COMMODITY_CODES[commodity];
    if (!code) return;

    const timer = setTimeout(async () => {
      setLoadingPremiums(true);
      setPremiumError('');
      try {
        const params = new URLSearchParams({
          state: selectedState,
          county: selectedCounty,
          commodity: code,
          aph: String(aphYield),
          acres: String(plantedAcres),
          plan: '02',
        });
        const res = await fetch(`/api/insurance/premium?${params}`);
        const json: PremiumApiResponse = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setAdmData(json.data);
          setPremiumError('');
        } else {
          setAdmData(null);
          setPremiumError(json.error || 'No premium data for this county/crop.');
        }
      } catch {
        setAdmData(null);
        setPremiumError('Failed to fetch premium data.');
      }
      setLoadingPremiums(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedState, selectedCounty, commodity, aphYield, plantedAcres]);

  // ── Clear sim when inputs change ──
  useEffect(() => {
    setSimResult(null);
    setSimError('');
  }, [commodity, aphYield, plantedAcres, baseAcres, coverageLevel, selectedCounty]);

  // ── Compute coverage band visualization ──
  const coverageBands = useMemo(() => {
    const cl = coverageLevel / 100;
    const scoTop = SCO_TRIGGER_2026; // 0.86
    const scoBand = Math.max(0, scoTop - cl);
    const ecoTop = 0.95;
    const ecoBand = ecoTop - scoTop; // 0.09

    // Get premium data for current coverage level
    const admLevel = admData?.find(d => Math.round(d.coverage_level * 100) === coverageLevel);
    const rpFarmerPremium = admLevel?.farmer_premium_per_acre
      ?? calculateEstimatedRPPremium(commodity, coverageLevel, aphYield, price?.projectedPrice || 4.62);
    const scoFarmerPremium = calculateSCOPremium(commodity, cl, scoTop, aphYield, price?.projectedPrice || 4.62);
    const ecoFarmerPremium = calculateECOPremium(commodity, scoTop, ecoTop, aphYield, price?.projectedPrice || 4.62);

    return {
      rp: { from: 0, to: cl, premium: rpFarmerPremium, label: `RP ${coverageLevel}%` },
      sco: { from: cl, to: scoTop, premium: scoFarmerPremium, label: `SCO ${coverageLevel}%→86%`, band: scoBand },
      eco: { from: scoTop, to: ecoTop, premium: ecoFarmerPremium, label: 'ECO 86%→95%', band: ecoBand },
      totalPremium: rpFarmerPremium + scoFarmerPremium + ecoFarmerPremium,
      rpPremium: rpFarmerPremium,
      scoPremium: scoFarmerPremium,
      ecoPremium: ecoFarmerPremium,
    };
  }, [commodity, coverageLevel, aphYield, admData, price]);

  // ── Compute ARC/PLC expected payments ──
  const programPayments = useMemo(() => {
    if (!arcPlc || !price) return null;
    const projectedMYA = price.projectedPrice * 0.92; // Approx MYA below projected
    const countyYield = admData?.[0]?.county_reference_yield || arcPlc.arcBenchmarkYieldNational;

    // ARC-CO
    const benchmarkRev = arcPlc.arcBenchmarkPrice * countyYield;
    const arcGuarantee = benchmarkRev * ARC_GUARANTEE_PCT;
    const actualRev = projectedMYA * countyYield;
    const arcPaymentRate = Math.min(Math.max(0, arcGuarantee - actualRev), benchmarkRev * ARC_MAX_PAYMENT_PCT);
    const arcPerAcre = arcPaymentRate * ARC_PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT);

    // PLC
    const plcRate = Math.max(0, arcPlc.effectiveRefPrice - projectedMYA);
    const plcYield = arcPlc.plcYieldNational;
    const plcPerAcre = plcRate * plcYield * PLC_PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT);

    return { arcPerAcre, plcPerAcre, projectedMYA, countyYield };
  }, [arcPlc, price, admData]);

  // ── Run Monte Carlo simulation ──
  const runSimulation = useCallback(async () => {
    setSimLoading(true);
    setSimError('');
    setSimResult(null);
    setSimProgress(0);

    const interval = setInterval(() => {
      setSimProgress(prev => prev >= 92 ? prev : prev + Math.random() * 12);
    }, 120);

    try {
      const admLevel = admData?.find(d => Math.round(d.coverage_level * 100) === coverageLevel);
      const countyYield = admLevel?.county_reference_yield
        || arcPlc?.arcBenchmarkYieldNational || 180;

      const body = {
        commodity,
        aphYield,
        plantedAcres,
        baseAcres,
        coverageLevel,
        countyYield,
        farmCountyCorrelation: 0.7,
        numIterations: 10000,
        rpFarmerPremiumPerAcre: admLevel?.farmer_premium_per_acre,
      };

      const res = await fetch('/api/insurance/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      clearInterval(interval);
      setSimProgress(100);

      if (!res.ok || !json.success) {
        setSimError(json.error || 'Simulation failed');
        setSimLoading(false);
        return;
      }

      await new Promise(r => setTimeout(r, 400));
      setSimResult(json.data);
    } catch (err: any) {
      clearInterval(interval);
      setSimError(err.message || 'Network error');
    } finally {
      setSimLoading(false);
    }
  }, [commodity, aphYield, plantedAcres, baseAcres, coverageLevel, admData, arcPlc]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
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
              10,000 Monte Carlo Simulations · Real USDA Data
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-4 tracking-tight"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Your Complete{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Farm Safety Net
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            The first tool that shows RP + SCO + ECO + ARC/PLC in one view.
            See exactly what you pay, what you're covered for, and which strategy
            wins across 10,000 market scenarios — with OBBBA's 80% subsidies built in.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> OBBBA 80% Subsidies
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Real RMA Actuarial Data
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Free · No Signup
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Tool ──────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 pb-16">

        {/* ── Step 1: Location + Crop ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-sm font-bold">1</div>
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Your Location & Crop
            </h2>
            {hasRealData && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L9.8 2.4L12.7 1.6L12.8 4.6L15.6 5.8L14 8.4L15.6 11L12.8 12.2L12.7 15.2L9.8 14.4L8 16.8L6.2 14.4L3.3 15.2L3.2 12.2L0.4 11L2 8.4L0.4 5.8L3.2 4.6L3.3 1.6L6.2 2.4L8 0Z" fill="#059669"/>
                  <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                USDA Verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">State</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all"
              >
                <option value="">Select state...</option>
                {states.map(s => (
                  <option key={s.state_fips} value={s.state_fips}>{s.state_name}</option>
                ))}
              </select>
            </div>

            {/* County */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                County {loadingCounties && <span className="text-emerald-600 text-xs">(loading...)</span>}
              </label>
              <select
                value={selectedCounty}
                onChange={e => setSelectedCounty(e.target.value)}
                disabled={!selectedState || loadingCounties}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all disabled:opacity-40"
              >
                <option value="">{selectedState ? 'Select county...' : 'Select state first'}</option>
                {counties.map(c => (
                  <option key={c.county_fips} value={c.county_fips}>{c.county_name}</option>
                ))}
              </select>
            </div>

            {/* Commodity */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Crop</label>
              <select
                value={commodity}
                onChange={e => { setCommodity(e.target.value); setAphYield(COMMODITY_DISPLAY[e.target.value]?.defaultAph || 190); }}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all"
              >
                {INSURANCE_COMMODITIES.map(c => (
                  <option key={c} value={c}>{COMMODITY_DISPLAY[c]?.emoji} {COMMODITY_DISPLAY[c]?.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* County data confirmation */}
          {hasRealData && (
            <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
              <span className="text-gray-600">County Yield: <strong className="text-gray-900">{admData![0].county_reference_yield} {price?.unit}/ac</strong></span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">Projected Price: <strong className="text-gray-900">${admData![0].projected_price.toFixed(2)}/{price?.unit}</strong></span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">Data: <strong className="text-emerald-700">{admData![0].data_source.replace('_', ' ')}</strong></span>
            </div>
          )}

          {premiumError && selectedCounty && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
              {premiumError} Using estimated Midwest rates.
            </div>
          )}
        </div>

        {/* ── Step 2: Farm Inputs ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-sm font-bold">2</div>
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Your Farm Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                APH Yield ({price?.unit || 'bu'}/ac)
              </label>
              <input
                type="number" value={aphYield}
                onChange={e => setAphYield(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all"
                min={0} max={500}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Planted Acres</label>
              <input
                type="number" value={plantedAcres}
                onChange={e => setPlantedAcres(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all"
                min={0} max={50000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Base Acres <span className="text-gray-400 font-normal">(for ARC/PLC)</span>
              </label>
              <input
                type="number" value={baseAcres}
                onChange={e => setBaseAcres(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition-all"
                min={0} max={50000}
              />
            </div>
          </div>
        </div>

        {/* ── Step 3: Coverage Level + Layer Cake ──────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-sm font-bold">3</div>
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Coverage Level & Premium Breakdown
            </h2>
          </div>

          {/* Slider */}
          <div className="mb-8">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm font-medium text-gray-600">Individual RP Coverage Level</span>
              <span className="text-3xl font-bold text-[#1B4332]" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {coverageLevel}%
              </span>
            </div>
            <input
              type="range" min={50} max={85} step={5} value={coverageLevel}
              onChange={e => setCoverageLevel(Number(e.target.value) as CoverageLevel)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B4332]"
            />
            <div className="flex justify-between mt-2">
              {COVERAGE_LEVELS.map(lvl => (
                <span key={lvl} className={`text-xs ${lvl === coverageLevel ? 'text-[#1B4332] font-bold' : 'text-gray-400'}`}>
                  {lvl}%
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Tip: Lower RP (e.g. 75%) + SCO + ECO-95% often beats higher RP alone. Slide to compare.
            </p>
          </div>

          {/* ── Coverage Layer Cake ────────────────────────────────────────── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Your Coverage Stack</h3>
            <div className="relative h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex">
              {/* RP band */}
              <div
                className="h-full flex items-center justify-center transition-all duration-300"
                style={{ width: `${(coverageBands.rp.to / 0.95) * 100}%`, background: 'rgba(37,99,235,0.15)', borderRight: '2px solid rgba(37,99,235,0.3)' }}
              >
                <span className="text-xs font-bold text-blue-700 truncate px-2">{coverageBands.rp.label}</span>
              </div>
              {/* SCO band */}
              {coverageBands.sco.band > 0 && (
                <div
                  className="h-full flex items-center justify-center transition-all duration-300"
                  style={{ width: `${(coverageBands.sco.band / 0.95) * 100}%`, background: 'rgba(124,58,237,0.12)', borderRight: '2px solid rgba(124,58,237,0.3)' }}
                >
                  <span className="text-xs font-bold text-purple-700 truncate px-1">SCO</span>
                </div>
              )}
              {/* ECO band */}
              <div
                className="h-full flex items-center justify-center transition-all duration-300"
                style={{ width: `${(coverageBands.eco.band / 0.95) * 100}%`, background: 'rgba(236,72,153,0.12)' }}
              >
                <span className="text-xs font-bold text-pink-700 truncate px-1">ECO-95</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
              <span>0%</span>
              <span>{coverageLevel}%</span>
              <span>86%</span>
              <span>95%</span>
            </div>
          </div>

          {/* ── Premium Breakdown Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <PremiumCard
              label={`RP ${coverageLevel}%`}
              sublabel="Individual Revenue Protection"
              premium={coverageBands.rpPremium}
              color="blue"
              isReal={!!hasRealData}
            />
            <PremiumCard
              label={`SCO ${coverageLevel}%→86%`}
              sublabel="Supplemental Coverage Option"
              premium={coverageBands.scoPremium}
              color="purple"
              isReal={false}
              subsidyNote="80% subsidy (OBBBA)"
            />
            <PremiumCard
              label="ECO 86%→95%"
              sublabel="Enhanced Coverage Option"
              premium={coverageBands.ecoPremium}
              color="pink"
              isReal={false}
              subsidyNote="80% subsidy (OBBBA)"
            />
          </div>

          {/* Total premium + ARC/PLC payments */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-gray-700">Total Farmer-Paid Premium (RP+SCO+ECO)</span>
              <span className="text-xl font-bold text-red-600" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                ${coverageBands.totalPremium.toFixed(2)}/ac
              </span>
            </div>
            {programPayments && (
              <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-200 text-sm">
                <div>
                  <span className="text-gray-500">ARC-CO est. payment: </span>
                  <span className="font-bold text-emerald-700">+${programPayments.arcPerAcre.toFixed(2)}/ac</span>
                  <span className="text-gray-400 text-xs ml-1">(FREE)</span>
                </div>
                <div>
                  <span className="text-gray-500">PLC est. payment: </span>
                  <span className="font-bold text-blue-700">+${programPayments.plcPerAcre.toFixed(2)}/ac</span>
                  <span className="text-gray-400 text-xs ml-1">(FREE)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 4: Run Simulation ───────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0C1F17] via-[#132B1E] to-[#1B4332] rounded-2xl shadow-xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-[-40px] right-[-40px] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-bold">4</div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Find Your Optimal Strategy
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 font-bold uppercase tracking-wider">
                First Ever
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-xl">
              Run 10,000 correlated price × yield simulations to see which ARC/PLC + insurance
              combination wins most often. No university tool does this in real-time.
            </p>

            <button
              onClick={runSimulation}
              disabled={simLoading}
              className="w-full md:w-auto px-8 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] hover:shadow-lg hover:shadow-[#C9A84C]/30 active:scale-[0.99]"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
            >
              {simLoading ? 'Running 10,000 Simulations...' : 'Run 10,000 Simulations →'}
            </button>

            {simLoading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Simulating correlated price & yield scenarios...</span>
                  <span>{Math.min(100, Math.round(simProgress))}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#C9A84C] rounded-full transition-all duration-200"
                    style={{ width: `${Math.min(100, simProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {simError && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {simError}
              </div>
            )}
          </div>
        </div>

        {/* ── Simulation Results ───────────────────────────────────────────── */}
        {simResult && (
          <>
            {/* Winner card */}
            <div className={`rounded-2xl shadow-xl border-2 p-6 md:p-8 mb-6 ${
              SCENARIO_COLORS[simResult.bestScenario]?.bg || 'bg-gray-50'
            } ${SCENARIO_COLORS[simResult.bestScenario]?.border || 'border-gray-200'}`}>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                Recommended Strategy
              </div>
              <div
                className={`text-3xl md:text-4xl font-bold mb-2 ${SCENARIO_COLORS[simResult.bestScenario]?.text || 'text-gray-900'}`}
                style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
              >
                {SCENARIO_LABELS[simResult.bestScenario]?.shortLabel}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {SCENARIO_LABELS[simResult.bestScenario]?.label}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ResultMetric
                  label="Expected Net Benefit"
                  value={`${simResult.bestExpectedNetBenefitPerAcre >= 0 ? '+' : ''}$${simResult.bestExpectedNetBenefitPerAcre.toFixed(2)}/ac`}
                  positive={simResult.bestExpectedNetBenefitPerAcre >= 0}
                />
                {(() => {
                  const best = simResult.scenarios.find(s => s.scenario === simResult.bestScenario);
                  if (!best) return null;
                  const acres = simResult.inputs.plantedAcres || 1;
                  return (
                    <>
                      <ResultMetric
                        label="Payment Probability"
                        value={`${Math.round(best.paymentProbability)}%`}
                        positive={best.paymentProbability >= 50}
                        sublabel={`${Math.round(best.paymentProbability)} of 100 scenarios`}
                      />
                      <ResultMetric
                        label="Worst Case (P5)"
                        value={`$${(best.netBenefit.p5 / acres).toFixed(2)}/ac`}
                        positive={best.netBenefit.p5 >= 0}
                        sublabel="5th percentile floor"
                      />
                      <ResultMetric
                        label="Best Case (P95)"
                        value={`+$${(best.netBenefit.p95 / acres).toFixed(2)}/ac`}
                        positive={true}
                        sublabel="95th percentile ceiling"
                      />
                    </>
                  );
                })()}
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Based on {simResult.iterations.toLocaleString()} Monte Carlo simulations · {simResult.executionTimeMs.toFixed(0)}ms compute time
                {hasRealData && ` · Real USDA data for ${selectedCountyName} County, ${selectedStateAbbr}`}
              </div>
            </div>

            {/* All strategies comparison */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                All Strategies Ranked
              </h3>
              <div className="space-y-3">
                {simResult.scenarios.map((s, i) => {
                  const isBest = s.scenario === simResult.bestScenario;
                  const colors = SCENARIO_COLORS[s.scenario];
                  const label = SCENARIO_LABELS[s.scenario];
                  const acres = simResult.inputs.plantedAcres || 1;
                  return (
                    <div key={s.scenario} className={`rounded-xl border-2 p-4 transition-all ${
                      isBest ? `${colors?.border || 'border-gray-300'} ${colors?.bg || 'bg-gray-50'}` : 'border-gray-100 bg-white hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isBest ? `${colors?.light || 'bg-gray-100'} ${colors?.text || 'text-gray-700'}` : 'bg-gray-100 text-gray-500'
                          }`}>
                            #{i + 1}
                          </div>
                          <div>
                            <div className={`font-bold ${isBest ? colors?.text || 'text-gray-900' : 'text-gray-900'}`}>
                              {label?.shortLabel}
                              {isBest && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-[#C9A84C]/20 text-[#8B6914] font-bold">★ BEST</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              Premium: ${(s.totalPremium / acres).toFixed(2)}/ac · Payment prob: {Math.round(s.paymentProbability)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${s.expectedNetBenefitPerAcre >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                            {s.expectedNetBenefitPerAcre >= 0 ? '+' : ''}${s.expectedNetBenefitPerAcre.toFixed(2)}/ac
                          </div>
                          <div className="text-xs text-gray-400">
                            P5: ${(s.netBenefit.p5 / acres).toFixed(0)} · P95: +${(s.netBenefit.p95 / acres).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── CTA Section ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0C1F17] via-[#132B1E] to-[#1B4332] rounded-2xl p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Save Your Analysis &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              Track Payments
            </span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Create a free account to save your coverage optimization, get alerts when MYA prices
            change your best strategy, and track projected payments in real time.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl font-bold text-[#0C1F17] bg-gradient-to-r from-[#C9A84C] to-[#E2C366] hover:shadow-lg hover:shadow-[#C9A84C]/20 transition-all"
            >
              Create Free Account
            </Link>
            <Link
              href="/optimize"
              className="px-8 py-3.5 rounded-xl font-bold text-white border border-white/20 hover:bg-white/5 transition-all"
            >
              ARC vs PLC Optimizer
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            {[
              { href: '/check', label: 'ARC/PLC Calculator', icon: '🧮' },
              { href: '/optimize', label: 'Election Optimizer', icon: '🎯' },
              { href: '/payments', label: 'Payment Scanner', icon: '💰' },
              { href: '/fba', label: 'FBA Calculator', icon: '🌾' },
              { href: '/sdrp', label: 'SDRP Checker', icon: '🛡️' },
              { href: '/calendar', label: 'Payment Calendar', icon: '📅' },
            ].map(tool => (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                <span>{tool.icon}</span>
                <span className="font-medium text-xs">{tool.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Methodology + Disclaimer ──────────────────────────────────────── */}
        <div className="mt-8 space-y-3 text-sm text-gray-500">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            How This Works
          </h3>
          <p>
            This calculator models four ARC/PLC + crop insurance combinations using 10,000
            Monte Carlo simulations with correlated price and yield draws. Premiums use real
            USDA RMA actuarial data when you select your county (or Midwest estimates as fallback).
            OBBBA changes are built in: 90% ARC guarantee, 12% payment cap, 80% SCO/ECO subsidies,
            and SCO decoupled from PLC election.
          </p>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>Important Disclaimer:</strong> This tool provides estimates based on statistical
            modeling and publicly available USDA data. Actual premiums, payments, and indemnities depend
            on final MYA prices, actual yields, and FSA/RMA administrative determinations. Contact your
            crop insurance agent for binding premium quotes and your local FSA office for program enrollment.
            HarvestFile is not affiliated with USDA, FSA, RMA, or any government agency.
          </div>
        </div>
      </section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function PremiumCard({ label, sublabel, premium, color, isReal, subsidyNote }: {
  label: string; sublabel: string; premium: number; color: string; isReal: boolean; subsidyNote?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue:   { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    pink:   { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-xl border p-4 ${c.border} ${c.bg}`}>
      <div className={`text-sm font-bold ${c.text} mb-0.5`}>{label}</div>
      <div className="text-xs text-gray-500 mb-3">{sublabel}</div>
      <div className={`text-2xl font-bold ${c.text}`} style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
        ${premium.toFixed(2)}
        <span className="text-sm font-normal text-gray-400">/ac</span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {isReal ? '✓ USDA Verified' : subsidyNote || 'Estimated'}
      </div>
    </div>
  );
}

function ResultMetric({ label, value, positive, sublabel }: {
  label: string; value: string; positive: boolean; sublabel?: string;
}) {
  return (
    <div className="rounded-lg bg-white/60 border border-white/80 p-3">
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className={`text-lg font-bold ${positive ? 'text-emerald-700' : 'text-red-600'}`}
        style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
        {value}
      </div>
      {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PREMIUM ESTIMATION HELPERS (fallback when no ADM data)
// ═════════════════════════════════════════════════════════════════════════════

function calculateEstimatedRPPremium(
  commodity: string, coverageLevel: number, aphYield: number, projectedPrice: number,
): number {
  const rate = ESTIMATED_RP_RATES[commodity]?.[coverageLevel] || 0.042;
  const liability = aphYield * projectedPrice * (coverageLevel / 100);
  const totalPremium = liability * rate;
  const subsidyRate = (SUBSIDY_RATES.individual[coverageLevel] || 0.55)
    + (SUBSIDY_RATES.enterpriseBonus[coverageLevel] || 0.25);
  return totalPremium * (1 - Math.min(subsidyRate, 1));
}

function calculateSCOPremium(
  commodity: string, rpCoverage: number, scoTrigger: number, aphYield: number, projectedPrice: number,
): number {
  const band = Math.max(0, scoTrigger - rpCoverage);
  if (band <= 0) return 0;
  const expectedRevenue = aphYield * projectedPrice;
  const supplementalProtection = expectedRevenue * band;
  const rate = ESTIMATED_SCO_RATES[commodity] || 0.15;
  const totalPremium = supplementalProtection * rate;
  return totalPremium * (1 - SUBSIDY_RATES.sco);
}

function calculateECOPremium(
  commodity: string, scoTrigger: number, ecoTrigger: number, aphYield: number, projectedPrice: number,
): number {
  const band = ecoTrigger - scoTrigger;
  if (band <= 0) return 0;
  const expectedRevenue = aphYield * projectedPrice;
  const protection = expectedRevenue * band;
  const rates = ESTIMATED_ECO_RATES[commodity] || { eco90: 0.12, eco95: 0.18 };
  const rate = ecoTrigger >= 0.95 ? rates.eco95 : rates.eco90;
  const totalPremium = protection * rate;
  return totalPremium * (1 - SUBSIDY_RATES.eco);
}
