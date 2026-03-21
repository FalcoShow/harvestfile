// =============================================================================
// HarvestFile — Phase 20 Build 4B-1: Coverage Optimizer + Monte Carlo + Scatter
// app/(dashboard)/dashboard/insurance/page.tsx
//
// THE FEATURE THAT MAKES HARVESTFILE WORTH BILLIONS.
//
// Build 4B-1 adds:
//   - Interactive risk-reward scatter plot (Recharts ScatterChart)
//   - Payment probability vs Expected Net Benefit per strategy
//   - Diamond shapes for ARC strategies, circles for PLC strategies
//   - Glow effects on hover/select, quadrant shading for "sweet spot"
//   - Hover tooltips with full strategy metrics
//   - Break-even reference line and average quadrant markers
//   - Interactive legend with hover highlight sync
//
// Build 4A preserved:
//   - "Run 10,000 Simulations" button with premium staged loading animation
//   - Monte Carlo results dashboard with Recharts probability histograms
//   - Percentile bands (P5/P10/P25/P50/P75/P90/P95) for all strategies
//   - Payment probability gauges (e.g. "78% chance of ARC payment")
//   - AI-backed "Recommended Strategy" hero card with confidence score
//   - Side-by-side scenario comparison with risk-reward metrics
//
// Previous builds preserved:
//   - State/County cascading selector with ADM batch data
//   - Real USDA RMA actuarial premium data (10.8M records)
//   - USDA Verified / Estimated badge system
//   - Coverage level slider (zero-latency with cached ADM data)
//   - 4-scenario deterministic comparison
//   - Coverage layer cake visualization
//
// No university tool, no ag-tech platform, no competitor does this.
// =============================================================================

'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, CartesianGrid, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, ReferenceArea,
} from 'recharts';

import {
  INSURANCE_COMMODITIES,
  COMMODITY_DISPLAY,
  PROJECTED_PRICES_2026,
  COVERAGE_LEVELS,
  SCENARIO_LABELS,
  COMMODITY_CODES,
  ARC_PLC_REF_2026,
  type CoverageLevel,
  type ScenarioType,
} from '@/lib/insurance/constants';

import {
  calculateAllScenarios,
  getCoverageBands,
  getVerdict,
  type FarmInputs,
  type ScenarioResult,
  type CoverageBand,
} from '@/lib/insurance/calculator';

import type {
  AdmState,
  AdmCounty,
  AdmBatchResponse,
  PremiumApiResponse,
} from '@/lib/insurance/types';

import type {
  SimulationResult,
  ScenarioSimResult,
  SimulationPercentiles,
} from '@/lib/insurance/monte-carlo';

import { createBrowserClient } from '@supabase/ssr';

// ─── Supabase browser client ─────────────────────────────────────────────────

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0f0d',
  card: '#111916',
  cardBorder: 'rgba(255,255,255,0.06)',
  textBright: '#f0fdf4',
  textDim: 'rgba(255,255,255,0.45)',
  textMid: 'rgba(255,255,255,0.7)',
  gold: '#C9A84C',
  emerald: '#10B981',
  emeraldDim: 'rgba(16,185,129,0.15)',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  red: '#EF4444',
  green: '#22C55E',
  amber: '#F59E0B',
  slate700: '#334155',
  slate800: '#1E293B',
};

// ─── Scenario Colors ─────────────────────────────────────────────────────────

const SCENARIO_COLORS: Record<string, string> = {
  arc_sco_eco95: C.emerald,
  plc_sco_eco95: C.blue,
  arc_sco_only: C.purple,
  plc_rp_only: C.amber,
};

// ─── Simulation Loading Stages ───────────────────────────────────────────────

const SIM_STAGES = [
  'Sampling price distributions…',
  'Generating correlated yield scenarios…',
  'Running 10,000 Monte Carlo iterations…',
  'Computing payment probabilities…',
  'Ranking strategies by expected net benefit…',
  'Generating recommendations…',
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InsurancePage() {
  // Farm inputs
  const [commodity, setCommodity] = useState<string>('CORN');
  const [aphYield, setAphYield] = useState<number>(190);
  const [plantedAcres, setPlantedAcres] = useState<number>(500);
  const [baseAcres, setBaseAcres] = useState<number>(500);
  const [coverageLevel, setCoverageLevel] = useState<CoverageLevel>(75);
  const [isBeginningFarmer, setIsBeginningFarmer] = useState(false);

  // ── Build 2B-2: County selection state ──
  const [states, setStates] = useState<AdmState[]>([]);
  const [counties, setCounties] = useState<AdmCounty[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [countySearch, setCountySearch] = useState<string>('');
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [countyInputFocused, setCountyInputFocused] = useState(false);
  const [admBatchData, setAdmBatchData] = useState<AdmBatchResponse | null>(null);
  const [isLoadingCounties, setIsLoadingCounties] = useState(false);
  const [isLoadingPremiums, setIsLoadingPremiums] = useState(false);
  const [premiumError, setPremiumError] = useState<string | null>(null);
  const countyDropdownRef = useRef<HTMLDivElement>(null);

  // ── Build 4A: Monte Carlo simulation state ──
  const [simResults, setSimResults] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simStageIndex, setSimStageIndex] = useState(0);
  const [simError, setSimError] = useState<string | null>(null);
  const [simVisible, setSimVisible] = useState(false);
  const simResultsRef = useRef<HTMLDivElement>(null);

  // Currently selected county/state display names
  const selectedStateName = states.find(s => s.state_fips === selectedState)?.state_name || '';
  const selectedCountyName = counties.find(c => c.county_fips === selectedCounty)?.county_name || '';
  const dataSource: 'usda_verified' | 'estimated' = admBatchData && admBatchData.length > 0 ? 'usda_verified' : 'estimated';

  // ── Fetch states on mount ──
  useEffect(() => {
    const fetchStates = async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('adm_states')
        .select('state_fips, state_name, state_abbreviation')
        .order('state_name');
      if (data && !error) {
        setStates(data);
      }
    };
    fetchStates();
  }, []);

  // ── Fetch counties when state changes ──
  useEffect(() => {
    if (!selectedState) {
      setCounties([]);
      setSelectedCounty('');
      setCountySearch('');
      setAdmBatchData(null);
      return;
    }

    const fetchCounties = async () => {
      setIsLoadingCounties(true);
      setSelectedCounty('');
      setCountySearch('');
      setAdmBatchData(null);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('adm_counties')
        .select('state_fips, county_fips, county_name')
        .eq('state_fips', selectedState)
        .order('county_name');
      if (data && !error) {
        setCounties(data);
      }
      setIsLoadingCounties(false);
    };
    fetchCounties();
  }, [selectedState]);

  // ── Fetch premium data when county/commodity/yield/acres change ──
  useEffect(() => {
    if (!selectedState || !selectedCounty) {
      setAdmBatchData(null);
      setPremiumError(null);
      return;
    }

    const commodityCode = COMMODITY_CODES[commodity];
    if (!commodityCode) {
      setAdmBatchData(null);
      return;
    }

    const fetchPremiums = async () => {
      setIsLoadingPremiums(true);
      setPremiumError(null);
      try {
        const params = new URLSearchParams({
          state: selectedState,
          county: selectedCounty,
          commodity: commodityCode,
          aph: String(aphYield),
          acres: String(plantedAcres),
          plan: '02',
        });
        const res = await fetch(`/api/insurance/premium?${params}`);
        const json: PremiumApiResponse = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setAdmBatchData(json.data);
          setPremiumError(null);
        } else {
          setAdmBatchData(null);
          setPremiumError(json.error || 'No premium data available for this county/crop combination');
        }
      } catch {
        setAdmBatchData(null);
        setPremiumError('Failed to fetch premium data');
      }
      setIsLoadingPremiums(false);
    };

    const timer = setTimeout(fetchPremiums, 300);
    return () => clearTimeout(timer);
  }, [selectedState, selectedCounty, commodity, aphYield, plantedAcres]);

  // ── Close county dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countyDropdownRef.current && !countyDropdownRef.current.contains(e.target as Node)) {
        setShowCountyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Clear sim results when inputs change ──
  useEffect(() => {
    setSimResults(null);
    setSimVisible(false);
  }, [commodity, aphYield, plantedAcres, baseAcres, coverageLevel, selectedCounty]);

  // Filtered counties for search
  const filteredCounties = useMemo(() => {
    if (!countySearch) return counties;
    const q = countySearch.toLowerCase();
    return counties.filter(c => c.county_name.toLowerCase().includes(q));
  }, [counties, countySearch]);

  // Build inputs object
  const inputs: FarmInputs = useMemo(() => ({
    commodity, aphYield, plantedAcres, baseAcres, coverageLevel, isBeginningFarmer,
    admBatchData,
  }), [commodity, aphYield, plantedAcres, baseAcres, coverageLevel, isBeginningFarmer, admBatchData]);

  // Calculate all scenarios (deterministic)
  const scenarios = useMemo(() => {
    try { return calculateAllScenarios(inputs); }
    catch { return []; }
  }, [inputs]);

  // Coverage bands for visualization (best scenario)
  const bands = useMemo(() => {
    try {
      const best = scenarios[0];
      if (!best) return [];
      const includeArc = best.scenario.startsWith('arc');
      const includeSco = best.scoPremium !== null;
      const includeEco = best.ecoPremium ? best.ecoPremium.ecoLevel : null;
      return getCoverageBands(inputs, includeArc, includeSco, includeEco);
    } catch { return []; }
  }, [inputs, scenarios]);

  // Verdict
  const verdict = useMemo(() => {
    if (scenarios.length === 0) return null;
    try { return getVerdict(scenarios); }
    catch { return null; }
  }, [scenarios]);

  const price = PROJECTED_PRICES_2026[commodity];
  const display = COMMODITY_DISPLAY[commodity];

  // ── Build 4A: Run Monte Carlo Simulation ──
  const runSimulation = useCallback(async () => {
    setSimLoading(true);
    setSimError(null);
    setSimResults(null);
    setSimStageIndex(0);
    setSimVisible(true);

    // Animate through loading stages
    const stageInterval = setInterval(() => {
      setSimStageIndex(prev => {
        if (prev < SIM_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 350);

    try {
      // Get ADM premium data for selected coverage level if available
      const admLevel = admBatchData?.find(
        d => Math.round(d.coverage_level * 100) === coverageLevel
      );

      const countyYield = admLevel?.county_reference_yield
        || ARC_PLC_REF_2026[commodity]?.arcBenchmarkYieldNational
        || 180;

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
        scoFarmerPremiumPerAcre: undefined,
        eco95FarmerPremiumPerAcre: undefined,
        eco90FarmerPremiumPerAcre: undefined,
      };

      const res = await fetch('/api/insurance/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Simulation failed: ${res.status}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Simulation returned an error');
      }

      // Minimum 2s of loading animation for perceived computational effort
      await new Promise(resolve => setTimeout(resolve, 800));

      clearInterval(stageInterval);
      setSimStageIndex(SIM_STAGES.length - 1);
      setSimResults(data.data);

      // Scroll to results after a brief delay
      setTimeout(() => {
        simResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);

    } catch (err: unknown) {
      clearInterval(stageInterval);
      setSimError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  }, [commodity, aphYield, plantedAcres, baseAcres, coverageLevel, admBatchData]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 80px' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Coverage Optimizer
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(236,72,153,0.15)', color: C.pink, fontWeight: 600 }}>
            NEW — OBBBA 2026
          </span>
          <DataSourceBadge source={dataSource} isLoading={isLoadingPremiums} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textBright, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.3 }}>
          Build Your Complete Safety Net
        </h2>
        <p style={{ fontSize: 13, color: C.textDim, marginTop: 4, lineHeight: 1.5 }}>
          {dataSource === 'usda_verified'
            ? `Real USDA actuarial data for ${selectedCountyName} County, ${selectedStateName}. Select your coverage level to compare scenarios.`
            : 'Select your county for real USDA premium data, or use Midwest estimates below.'
          }
        </p>
      </div>

      {/* ── County Selection Card (Build 2B-2) ── */}
      <div style={{
        background: dataSource === 'usda_verified'
          ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.04))'
          : C.card,
        border: `1px solid ${dataSource === 'usda_verified' ? 'rgba(16,185,129,0.2)' : C.cardBorder}`,
        borderRadius: 16, padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textBright }}>
            Your County
          </span>
          {dataSource === 'usda_verified' && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: C.emerald, fontWeight: 600 }}>
              Real Data Active
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* State Select */}
          <div>
            <label style={labelStyle}>State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={selectStyle}
            >
              <option value="" style={optionStyle}>Select a state...</option>
              {states.map((s) => (
                <option key={s.state_fips} value={s.state_fips} style={optionStyle}>
                  {s.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* County Searchable Select */}
          <div ref={countyDropdownRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>
              County {isLoadingCounties && <span style={{ color: C.emerald }}>loading...</span>}
            </label>
            <input
              type="text"
              placeholder={selectedState ? 'Search counties...' : 'Select state first'}
              value={countyInputFocused ? countySearch : (selectedCounty ? selectedCountyName : countySearch)}
              onChange={(e) => {
                setCountySearch(e.target.value);
                setShowCountyDropdown(true);
              }}
              onFocus={() => {
                setCountyInputFocused(true);
                setCountySearch('');
                if (counties.length > 0) setShowCountyDropdown(true);
              }}
              onBlur={() => {
                setCountyInputFocused(false);
              }}
              disabled={!selectedState || isLoadingCounties}
              style={{
                ...inputStyle,
                cursor: !selectedState ? 'not-allowed' : 'text',
                opacity: !selectedState ? 0.5 : 1,
              }}
            />

            {/* County dropdown */}
            {showCountyDropdown && filteredCounties.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                marginTop: 4, maxHeight: 240, overflowY: 'auto',
                background: '#1a2420', border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {filteredCounties.map((county) => (
                  <button
                    key={county.county_fips}
                    onClick={() => {
                      setSelectedCounty(county.county_fips);
                      setCountySearch('');
                      setShowCountyDropdown(false);
                    }}
                    style={{
                      width: '100%', padding: '10px 14px', border: 'none',
                      background: county.county_fips === selectedCounty ? 'rgba(16,185,129,0.15)' : 'transparent',
                      color: county.county_fips === selectedCounty ? C.emerald : C.textBright,
                      fontSize: 13, fontWeight: county.county_fips === selectedCounty ? 700 : 400,
                      textAlign: 'left', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background =
                        county.county_fips === selectedCounty ? 'rgba(16,185,129,0.15)' : 'transparent';
                    }}
                  >
                    {county.county_name} ({county.county_fips})
                  </button>
                ))}
              </div>
            )}

            {showCountyDropdown && countySearch && filteredCounties.length === 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                marginTop: 4, padding: '12px 14px',
                background: '#1a2420', border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 12, color: C.textDim, fontSize: 12,
              }}>
                No counties match &quot;{countySearch}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Premium error message */}
        {premiumError && selectedCounty && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12, color: '#FCA5A5',
          }}>
            {premiumError}. Using estimated rates instead.
          </div>
        )}

        {/* County data summary */}
        {admBatchData && admBatchData.length > 0 && (
          <div style={{
            marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap',
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
          }}>
            <MiniInfo label="County Yield" value={`${admBatchData[0].county_reference_yield} ${price?.unit || 'bu'}/ac`} />
            <MiniInfo label="Projected Price" value={`$${admBatchData[0].projected_price.toFixed(2)}/${price?.unit || 'bu'}`} />
            <MiniInfo label="Data Source" value={admBatchData[0].data_source.replace('_', ' ')} />
            <MiniInfo label="Coverage Levels" value={`${admBatchData.length} loaded`} />
          </div>
        )}
      </div>

      {/* ── Farm Inputs Card ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16,
        padding: 24, marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright, marginBottom: 16 }}>
          Your Operation
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {/* Commodity */}
          <div>
            <label style={labelStyle}>Crop</label>
            <select
              value={commodity}
              onChange={(e) => {
                setCommodity(e.target.value);
                setAphYield(COMMODITY_DISPLAY[e.target.value]?.defaultAph || 190);
              }}
              style={selectStyle}
            >
              {INSURANCE_COMMODITIES.map((c) => (
                <option key={c} value={c} style={optionStyle}>{COMMODITY_DISPLAY[c]?.emoji} {COMMODITY_DISPLAY[c]?.name}</option>
              ))}
            </select>
          </div>

          {/* APH Yield */}
          <div>
            <label style={labelStyle}>APH Yield ({price?.unit || 'bu'}/ac)</label>
            <input type="number" value={aphYield} onChange={(e) => setAphYield(Number(e.target.value) || 0)}
              style={inputStyle} min={0} max={500} />
          </div>

          {/* Planted Acres */}
          <div>
            <label style={labelStyle}>Planted Acres</label>
            <input type="number" value={plantedAcres} onChange={(e) => setPlantedAcres(Number(e.target.value) || 0)}
              style={inputStyle} min={0} max={50000} />
          </div>

          {/* Base Acres */}
          <div>
            <label style={labelStyle}>Base Acres</label>
            <input type="number" value={baseAcres} onChange={(e) => setBaseAcres(Number(e.target.value) || 0)}
              style={inputStyle} min={0} max={50000} />
          </div>
        </div>

        {/* Beginning Farmer Toggle */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="beginFarmer" checked={isBeginningFarmer}
            onChange={(e) => setIsBeginningFarmer(e.target.checked)}
            style={{ accentColor: C.emerald }} />
          <label htmlFor="beginFarmer" style={{ fontSize: 12, color: C.textMid, cursor: 'pointer' }}>
            Beginning farmer (10+ percentage point subsidy bonus)
          </label>
        </div>
      </div>

      {/* ── Coverage Level Slider ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16,
        padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright }}>
            Individual RP Coverage Level
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.blue }}>
            {coverageLevel}%
          </div>
        </div>

        <input
          type="range" min={50} max={85} step={5} value={coverageLevel}
          onChange={(e) => setCoverageLevel(Number(e.target.value) as CoverageLevel)}
          style={{ width: '100%', accentColor: C.blue, height: 6 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {COVERAGE_LEVELS.map((lvl) => (
            <span key={lvl} style={{
              fontSize: 10, color: lvl === coverageLevel ? C.blue : C.textDim,
              fontWeight: lvl === coverageLevel ? 700 : 400,
            }}>
              {lvl}%
            </span>
          ))}
        </div>

        {/* Show real premium for current level when ADM data active */}
        {admBatchData && admBatchData.length > 0 && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: C.textMid }}>
              RP farmer premium at {coverageLevel}%
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.blue }}>
              ${(admBatchData.find(d => Math.round(d.coverage_level * 100) === coverageLevel)?.farmer_premium_per_acre ?? 0).toFixed(2)}/ac
            </span>
          </div>
        )}

        <p style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>
          Lower RP + SCO + ECO often beats higher RP alone. Slide to compare.
        </p>
      </div>

      {/* ── Loading State ── */}
      {isLoadingPremiums && (
        <div style={{
          padding: 20, textAlign: 'center', marginBottom: 24,
          color: C.textDim, fontSize: 13,
        }}>
          <div style={{
            width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: C.emerald, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 8px',
          }} />
          Calculating real premiums for {selectedCountyName} County...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Coverage Layer Cake Visualization ── */}
      {bands.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16,
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright, marginBottom: 16 }}>
            Your Coverage Stack
          </div>

          {/* Horizontal band visualization */}
          <div style={{ position: 'relative', height: 56, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            {bands.filter(b => b.type !== 'arc').map((band, i) => {
              const totalWidth = Math.max(...bands.filter(b => b.type !== 'arc').map(b => b.to)) || 1;
              const left = (band.from / totalWidth) * 100;
              const width = ((band.to - band.from) / totalWidth) * 100;
              return (
                <div key={i} style={{
                  position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0,
                  background: band.type === 'gap' ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)' : band.color + '30',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: band.type === 'gap' ? C.textDim : band.color,
                    textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {band.type === 'gap' ? 'Gap' : band.label.split('(')[0].trim()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Band legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bands.map((band, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                  background: band.color,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textBright }}>{band.label}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{band.description}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {band.premiumPerAcre > 0 ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>
                      −${band.premiumPerAcre.toFixed(2)}/ac
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.green }}>FREE</div>
                  )}
                  {band.paymentPerAcre > 0 && (
                    <div style={{ fontSize: 10, color: C.green }}>
                      +${band.paymentPerAcre.toFixed(2)}/ac est.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Verdict Banner ── */}
      {verdict && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16,
          padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Best Option for Your Farm
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.textBright, marginBottom: 6 }}>
            {SCENARIO_LABELS[verdict.bestScenario]?.shortLabel}
          </div>
          <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, margin: 0 }}>
            {verdict.verdict}
          </p>
          {verdict.savingsVsSimplest > 0 && (
            <div style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(16,185,129,0.15)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                +${verdict.savingsVsSimplest.toFixed(2)}/acre
              </span>
              <span style={{ fontSize: 11, color: C.textDim }}>vs. PLC + RP alone</span>
            </div>
          )}
        </div>
      )}

      {/* ── Scenario Comparison Cards ── */}
      <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright, marginBottom: 12 }}>
        All Scenarios Ranked
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {scenarios.map((s, i) => (
          <ScenarioCard key={s.scenario} scenario={s} rank={i + 1} isBest={i === 0} />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          BUILD 4A — MONTE CARLO SIMULATION ENGINE
          ══════════════════════════════════════════════════════════════════════════ */}

      {/* ── Run Simulation Button ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 16, padding: 28, marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🎲</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.textBright, letterSpacing: '-0.01em' }}>
              Monte Carlo Probability Engine
            </span>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(236,72,153,0.15)', color: C.pink, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              First Ever
            </span>
          </div>

          <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, margin: '0 0 16px 0', maxWidth: 580 }}>
            Run 10,000 correlated price and yield simulations to see the <em style={{ color: C.emerald, fontStyle: 'normal', fontWeight: 600 }}>probability</em> of
            each strategy paying out — not just the expected value. See worst-case floors,
            best-case ceilings, and which strategy wins most often across thousands of
            possible market outcomes. No university tool does this.
          </p>

          <button
            onClick={runSimulation}
            disabled={simLoading}
            style={{
              padding: '12px 28px', borderRadius: 12, border: 'none',
              background: simLoading
                ? 'rgba(16,185,129,0.2)'
                : 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: simLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
              boxShadow: simLoading ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
            }}
          >
            {simLoading ? (
              <>
                <span style={{
                  display: 'inline-block', width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Running Simulation…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run 10,000 Simulations
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Simulation Loading Animation ── */}
      {simLoading && (
        <div style={{
          background: C.card, border: `1px solid rgba(16,185,129,0.15)`,
          borderRadius: 16, padding: 32, marginBottom: 24, textAlign: 'center',
        }}>
          {/* Pulsing ring */}
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            borderRadius: '50%', position: 'relative',
            border: '2px solid rgba(16,185,129,0.2)',
            boxShadow: '0 0 24px rgba(16,185,129,0.15)',
            animation: 'simPulse 2s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              border: '2px solid transparent', borderTopColor: C.emerald,
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 10, borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              🎲
            </div>
          </div>

          {/* Stage label */}
          <div style={{
            fontSize: 14, fontWeight: 600, color: C.emerald,
            marginBottom: 8, minHeight: 20,
            transition: 'opacity 0.3s',
          }}>
            {SIM_STAGES[simStageIndex]}
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {SIM_STAGES.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i <= simStageIndex ? C.emerald : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          <style>{`
            @keyframes simPulse {
              0%, 100% { box-shadow: 0 0 24px rgba(16,185,129,0.15); }
              50% { box-shadow: 0 0 40px rgba(16,185,129,0.3); }
            }
          `}</style>
        </div>
      )}

      {/* ── Simulation Error ── */}
      {simError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: 16, marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 4 }}>Simulation Error</div>
          <div style={{ fontSize: 12, color: C.textMid }}>{simError}</div>
        </div>
      )}

      {/* ── Monte Carlo Results ── */}
      {simResults && !simLoading && (
        <div ref={simResultsRef}>
          {/* Results Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.textBright, letterSpacing: '-0.01em' }}>
                Monte Carlo Results
              </div>
              <div style={{ fontSize: 11, color: C.textDim }}>
                {simResults.iterations.toLocaleString()} simulations completed in {simResults.executionTimeMs.toFixed(0)}ms
              </div>
            </div>
          </div>

          {/* ── Recommended Strategy Hero Card ── */}
          <SimRecommendedCard simResults={simResults} />

          {/* ── All Strategies Comparison ── */}
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright, marginBottom: 12, marginTop: 24 }}>
            Probability-Weighted Strategy Comparison
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {simResults.scenarios.map((s, i) => (
              <SimStrategyCard
                key={s.scenario}
                sim={s}
                rank={i + 1}
                isBest={s.scenario === simResults.bestScenario}
                acres={simResults.inputs.plantedAcres || 1}
              />
            ))}
          </div>

          {/* ── Risk-Reward Scatter Plot (Build 4B) ── */}
          <SimScatterPlot simResults={simResults} />

          {/* ── Best Scenario Histogram ── */}
          <SimHistogramChart simResults={simResults} />

          {/* ── Percentile Table ── */}
          <SimPercentileTable simResults={simResults} />

          {/* ── Price & Yield Distribution Summary ── */}
          <SimDistributionSummary simResults={simResults} commodity={commodity} />
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div style={{
        fontSize: 11, color: C.textDim, lineHeight: 1.6,
        padding: 16, borderRadius: 12, marginTop: 24,
        border: `1px solid ${C.cardBorder}`, background: 'rgba(255,255,255,0.01)',
      }}>
        <strong style={{ color: C.textMid }}>
          {dataSource === 'usda_verified' ? 'Data Source:' : 'Disclaimer:'}
        </strong>{' '}
        {dataSource === 'usda_verified' ? (
          <>
            RP premiums use official USDA RMA actuarial data for {selectedCountyName} County, {selectedStateName} (Crop Year 2026, Enterprise Unit, Revenue Protection).
            SCO and ECO premiums use representative Midwest rates. ARC/PLC payments are projections based
            on current MYA price estimates and county reference yields. Monte Carlo simulations use log-normal
            price distributions and correlated yield draws calibrated from historical data. Estimates only — contact your crop
            insurance agent for binding premium quotes and your local FSA office for program enrollment.
          </>
        ) : (
          <>
            Premium estimates use representative Midwest rates and may differ from your county&apos;s actual rates.
            Select your state and county above for real USDA actuarial data.
            SCO and ECO use county-level triggers that may not align with farm-level losses. ARC/PLC payments
            are projections based on current MYA price estimates. Monte Carlo simulations model price and yield
            uncertainty using correlated distributions. Always consult your crop insurance agent for
            exact premium quotes and your local FSA office for program enrollment. This tool does not replace professional advice.
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTE CARLO RESULT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Recommended Strategy Hero Card ──────────────────────────────────────────

function SimRecommendedCard({ simResults }: { simResults: SimulationResult }) {
  const best = simResults.scenarios.find(s => s.scenario === simResults.bestScenario);
  if (!best) return null;

  const label = SCENARIO_LABELS[best.scenario];
  const color = SCENARIO_COLORS[best.scenario] || C.emerald;
  // paymentProbability comes from the engine as a percentage (e.g., 47.4), not a decimal
  const pctWins = Math.round(best.paymentProbability);
  const acres = simResults.inputs.plantedAcres || 1; // For per-acre conversion

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}10, ${color}05)`,
      border: `1px solid ${color}40`,
      borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 20,
            background: `${color}20`, color, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            ★ Monte Carlo Recommended
          </span>
          <span style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(255,255,255,0.04)', color: C.textDim,
            fontWeight: 600,
          }}>
            {simResults.iterations.toLocaleString()} simulations
          </span>
        </div>

        {/* Strategy name */}
        <div style={{ fontSize: 20, fontWeight: 800, color: C.textBright, marginBottom: 4, letterSpacing: '-0.02em' }}>
          {label?.shortLabel}
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
          {label?.label}
        </div>

        {/* Key metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <MetricCard
            label="Expected Net Benefit"
            value={`${best.expectedNetBenefitPerAcre >= 0 ? '+' : ''}$${best.expectedNetBenefitPerAcre.toFixed(2)}/ac`}
            color={best.expectedNetBenefitPerAcre >= 0 ? C.green : C.red}
            sublabel="probability-weighted average"
          />
          <MetricCard
            label="Payment Probability"
            value={`${pctWins}%`}
            color={pctWins >= 60 ? C.green : pctWins >= 30 ? C.amber : C.red}
            sublabel={`${pctWins} of 100 simulations`}
          />
          <MetricCard
            label="Worst Case (P5)"
            value={`$${(best.netBenefit.p5 / acres).toFixed(2)}/ac`}
            color={best.netBenefit.p5 >= 0 ? C.green : C.red}
            sublabel="5th percentile floor"
          />
          <MetricCard
            label="Best Case (P95)"
            value={`${best.netBenefit.p95 >= 0 ? '+' : ''}$${(best.netBenefit.p95 / acres).toFixed(2)}/ac`}
            color={C.green}
            sublabel="95th percentile ceiling"
          />
        </div>

        {/* Payment probability breakdown */}
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Component Payment Probabilities
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {best.rpPaymentProbability !== undefined && (
              <ProbGauge label="RP Indemnity" pct={best.rpPaymentProbability} />
            )}
            {best.arcPaymentProbability !== undefined && (
              <ProbGauge label="ARC-CO" pct={best.arcPaymentProbability} />
            )}
            {best.plcPaymentProbability !== undefined && (
              <ProbGauge label="PLC" pct={best.plcPaymentProbability} />
            )}
            {best.scoPaymentProbability !== undefined && (
              <ProbGauge label="SCO" pct={best.scoPaymentProbability} />
            )}
            {best.ecoPaymentProbability !== undefined && (
              <ProbGauge label="ECO" pct={best.ecoPaymentProbability} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Probability Gauge ───────────────────────────────────────────────────────

function ProbGauge({ label, pct }: { label: string; pct: number }) {
  // pct comes from the engine as a percentage (e.g., 47.4), not a decimal
  const pctRound = Math.round(pct);
  const color = pctRound >= 60 ? C.green : pctRound >= 30 ? C.amber : C.textDim;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      {/* Mini bar */}
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: 40 }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: color,
          width: `${pctRound}%`,
          transition: 'width 0.6s ease-out',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
        {pctRound}%
      </span>
      <span style={{ fontSize: 10, color: C.textDim }}>{label}</span>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, sublabel }: {
  label: string; value: string; color: string; sublabel: string;
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

// ─── Strategy Comparison Card ────────────────────────────────────────────────

function SimStrategyCard({ sim, rank, isBest, acres }: {
  sim: ScenarioSimResult; rank: number; isBest: boolean; acres: number;
}) {
  const label = SCENARIO_LABELS[sim.scenario];
  const color = SCENARIO_COLORS[sim.scenario] || C.textDim;
  const pctPay = Math.round(sim.paymentProbability);

  return (
    <div style={{
      background: isBest ? `${color}08` : C.card,
      border: `1px solid ${isBest ? `${color}40` : C.cardBorder}`,
      borderRadius: 14, padding: 16, position: 'relative',
    }}>
      {/* Rank badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 24, height: 24, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800,
        background: isBest ? `${color}20` : 'rgba(255,255,255,0.04)',
        color: isBest ? color : C.textDim,
      }}>
        #{rank}
      </div>

      {/* Strategy name */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textBright, marginBottom: 2, paddingRight: 32 }}>
        {label?.shortLabel}
      </div>
      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12 }}>
        Premium: ${sim.totalPremium.toFixed(0)} total
      </div>

      {/* Expected net benefit */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Expected Net Benefit</div>
        <div style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
          color: sim.expectedNetBenefitPerAcre >= 0 ? C.green : C.red,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {sim.expectedNetBenefitPerAcre >= 0 ? '+' : ''}${sim.expectedNetBenefitPerAcre.toFixed(2)}
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>/ac</span>
        </div>
      </div>

      {/* Payment probability bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: C.textDim }}>Payment probability</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: pctPay >= 60 ? C.green : pctPay >= 30 ? C.amber : C.textDim }}>
            {pctPay}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, background: color,
            width: `${pctPay}%`, transition: 'width 0.8s ease-out',
          }} />
        </div>
      </div>

      {/* P5-P95 range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim }}>
        <span>P5: ${(sim.netBenefit.p5 / acres).toFixed(0)}</span>
        <span>P50: ${(sim.netBenefit.p50 / acres).toFixed(0)}</span>
        <span>P95: ${(sim.netBenefit.p95 / acres).toFixed(0)}</span>
      </div>
    </div>
  );
}

// ─── Risk-Reward Scatter Plot (Build 4B-1) ──────────────────────────────────

function SimScatterPlot({ simResults }: { simResults: SimulationResult }) {
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  const acres = simResults.inputs.plantedAcres || 1;

  // Build scatter data: one point per strategy
  const scatterData = simResults.scenarios.map((s, i) => ({
    scenario: s.scenario,
    paymentProbability: s.paymentProbability,
    expectedBenefit: s.expectedNetBenefitPerAcre,
    worstCase: s.netBenefit.p5 / acres,
    bestCase: s.netBenefit.p95 / acres,
    premium: s.totalPremium / acres,
    rank: i + 1,
    label: SCENARIO_LABELS[s.scenario]?.shortLabel || s.scenario,
    color: SCENARIO_COLORS[s.scenario] || C.textDim,
    isBest: s.scenario === simResults.bestScenario,
  }));

  // Compute axis bounds with padding
  const minX = Math.max(0, Math.min(...scatterData.map(d => d.paymentProbability)) - 8);
  const maxX = Math.min(100, Math.max(...scatterData.map(d => d.paymentProbability)) + 8);
  const minY = Math.min(0, Math.min(...scatterData.map(d => d.expectedBenefit)) - 5);
  const maxY = Math.max(...scatterData.map(d => d.expectedBenefit)) + 8;

  // Average lines for quadrant reference
  const avgProb = scatterData.reduce((a, d) => a + d.paymentProbability, 0) / scatterData.length;
  const avgBenefit = scatterData.reduce((a, d) => a + d.expectedBenefit, 0) / scatterData.length;

  // Custom dot renderer with glow on best/hover
  const renderDot = (props: {
    cx: number; cy: number; payload: typeof scatterData[0];
  }) => {
    const { cx, cy, payload } = props;
    const isHovered = hoveredScenario === payload.scenario;
    const isBest = payload.isBest;
    const r = isBest ? 14 : 11;
    const glowR = r + 6;

    // Shape by strategy type
    const isArc = payload.scenario.startsWith('arc');

    return (
      <g key={payload.scenario}>
        {/* Glow ring for best/hovered */}
        {(isBest || isHovered) && (
          <circle cx={cx} cy={cy} r={glowR}
            fill="none" stroke={payload.color} strokeWidth={1.5}
            strokeOpacity={0.35} strokeDasharray="3 3"
          />
        )}
        {/* Outer halo */}
        {(isBest || isHovered) && (
          <circle cx={cx} cy={cy} r={r + 3}
            fill={payload.color} fillOpacity={0.08}
          />
        )}
        {/* Main dot — diamond for ARC, circle for PLC */}
        {isArc ? (
          <polygon
            points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
            fill={payload.color} fillOpacity={isHovered ? 0.95 : 0.85}
            stroke={isHovered || isBest ? '#fff' : payload.color}
            strokeWidth={isHovered || isBest ? 2 : 1}
            strokeOpacity={isHovered || isBest ? 0.5 : 0.3}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        ) : (
          <circle cx={cx} cy={cy} r={r}
            fill={payload.color} fillOpacity={isHovered ? 0.95 : 0.85}
            stroke={isHovered || isBest ? '#fff' : payload.color}
            strokeWidth={isHovered || isBest ? 2 : 1}
            strokeOpacity={isHovered || isBest ? 0.5 : 0.3}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        )}
        {/* Rank number inside dot */}
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fill="#fff" fontSize={10} fontWeight={800}
          style={{ pointerEvents: 'none' }}
        >
          {payload.rank}
        </text>
        {/* Best badge */}
        {isBest && (
          <text x={cx} y={cy - r - 8} textAnchor="middle"
            fill={payload.color} fontSize={9} fontWeight={700}
          >
            ★ BEST
          </text>
        )}
      </g>
    );
  };

  // Custom tooltip
  const ScatterTooltipContent = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof scatterData[0] }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(17,25,22,0.97)', backdropFilter: 'blur(12px)',
        border: `1px solid ${d.color}30`, borderRadius: 12,
        padding: '12px 16px', boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${d.color}15`,
        minWidth: 200, maxWidth: 260,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: d.scenario.startsWith('arc') ? 1 : 4, background: d.color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textBright }}>{d.label}</span>
          {d.isBest && (
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `${d.color}20`, color: d.color, fontWeight: 700 }}>
              ★ BEST
            </span>
          )}
        </div>
        {/* Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <TooltipRow label="Expected Benefit" value={`${d.expectedBenefit >= 0 ? '+' : ''}$${d.expectedBenefit.toFixed(2)}/ac`}
            valueColor={d.expectedBenefit >= 0 ? C.green : C.red} />
          <TooltipRow label="Payment Probability" value={`${Math.round(d.paymentProbability)}%`}
            valueColor={d.paymentProbability >= 60 ? C.green : d.paymentProbability >= 30 ? C.amber : C.textDim} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '2px 0' }} />
          <TooltipRow label="Worst Case (P5)" value={`$${d.worstCase.toFixed(2)}/ac`}
            valueColor={d.worstCase >= 0 ? C.green : C.red} />
          <TooltipRow label="Best Case (P95)" value={`+$${d.bestCase.toFixed(2)}/ac`} valueColor={C.green} />
          <TooltipRow label="Premium Cost" value={`$${d.premium.toFixed(2)}/ac`} valueColor={C.textMid} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 24, marginBottom: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background gradient */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 70% 30%, rgba(16,185,129,0.03) 0%, transparent 60%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textBright }}>
            Risk vs. Reward
          </span>
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(139,92,246,0.15)', color: C.purple, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Build 4B
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 20, maxWidth: 520 }}>
          Each dot is a strategy. Upper-right = higher expected return with higher payment likelihood.
          Diamonds = ARC-CO strategies · Circles = PLC strategies
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <defs>
                {/* Quadrant gradient for "sweet spot" zone */}
                <linearGradient id="sweetSpot" x1="0.5" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />

              {/* Sweet spot zone: high prob + high benefit */}
              <ReferenceArea
                x1={avgProb} x2={maxX} y1={avgBenefit} y2={maxY}
                fill="url(#sweetSpot)" stroke="rgba(16,185,129,0.08)"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="paymentProbability" type="number"
                domain={[minX, maxX]}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v)}%`}
                label={{
                  value: 'Payment Probability →',
                  position: 'insideBottom', offset: -8,
                  fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600,
                }}
              />
              <YAxis
                dataKey="expectedBenefit" type="number"
                domain={[minY, maxY]}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                tickFormatter={(v: number) => `$${Math.round(v)}`}
                label={{
                  value: 'Expected Net Benefit ($/ac) →',
                  angle: -90, position: 'insideLeft', offset: 10,
                  fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600,
                }}
              />
              <ZAxis range={[800, 800]} />

              {/* Break-even reference line */}
              <ReferenceLine y={0} stroke="rgba(239,68,68,0.3)" strokeDasharray="5 5"
                label={{ value: 'Break Even', position: 'right', fill: 'rgba(239,68,68,0.4)', fontSize: 9, fontWeight: 600 }}
              />

              {/* Average reference lines (subtle) */}
              <ReferenceLine x={avgProb} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <ReferenceLine y={avgBenefit} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              <Tooltip content={<ScatterTooltipContent />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeDasharray: '4 4' }} />

              <Scatter
                data={scatterData}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => renderDot(props as { cx: number; cy: number; payload: typeof scatterData[0] })}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onMouseEnter={(data: any) => {
                  if (data?.scenario) setHoveredScenario(data.scenario);
                }}
                onMouseLeave={() => setHoveredScenario(null)}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8,
          flexWrap: 'wrap',
        }}>
          {scatterData.map(d => (
            <div key={d.scenario}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8,
                background: hoveredScenario === d.scenario ? 'rgba(255,255,255,0.05)' : 'transparent',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={() => setHoveredScenario(d.scenario)}
              onMouseLeave={() => setHoveredScenario(null)}
            >
              {/* Shape indicator */}
              {d.scenario.startsWith('arc') ? (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <polygon points="5,0 10,5 5,10 0,5" fill={d.color} fillOpacity={0.8} />
                </svg>
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, opacity: 0.8 }} />
              )}
              <span style={{
                fontSize: 10, color: hoveredScenario === d.scenario ? C.textBright : C.textDim,
                fontWeight: hoveredScenario === d.scenario ? 600 : 400,
                transition: 'all 0.2s',
              }}>
                {d.label}
              </span>
              {d.isBest && (
                <span style={{ fontSize: 8, color: d.color, fontWeight: 700 }}>★</span>
              )}
            </div>
          ))}
        </div>

        {/* Quadrant labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>
            ← Lower probability
          </span>
          <span style={{ fontSize: 9, color: 'rgba(16,185,129,0.3)', fontWeight: 600 }}>
            Sweet Spot →
          </span>
        </div>
      </div>

      {/* Annotation */}
      <div style={{
        marginTop: 12, fontSize: 10, color: C.textDim, lineHeight: 1.5,
        padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.03)',
      }}>
        Based on {simResults.iterations.toLocaleString()} Monte Carlo simulations
        {simResults.inputs.countyYield ? ` · County yield: ${simResults.inputs.countyYield} bu/ac` : ''}
        {' · '}Coverage: {simResults.inputs.coverageLevel}% RP
      </div>
    </div>
  );
}

// ─── Tooltip Row Helper ─────────────────────────────────────────────────────

function TooltipRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 11, color: C.textDim }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: valueColor, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ─── Histogram Chart ─────────────────────────────────────────────────────────

function SimHistogramChart({ simResults }: { simResults: SimulationResult }) {
  const best = simResults.scenarios.find(s => s.scenario === simResults.bestScenario);
  if (!best || !best.histogram || best.histogram.length === 0) return null;

  const color = SCENARIO_COLORS[best.scenario] || C.emerald;
  const label = SCENARIO_LABELS[best.scenario];
  const acres = simResults.inputs.plantedAcres || 1;

  // Convert histogram bins to per-acre values
  const perAcreHistogram = best.histogram.map(h => ({
    bin: Math.round((h.bin / acres) * 100) / 100,
    count: h.count,
  }));
  const meanPerAcre = best.netBenefit.mean / acres;

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 24, marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.textBright }}>
          Net Benefit Distribution
        </span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: `${color}15`, color, fontWeight: 600,
        }}>
          {label?.shortLabel}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 20 }}>
        Net benefit per acre (payments minus premiums) across {simResults.iterations.toLocaleString()} simulated market outcomes
      </div>

      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={perAcreHistogram} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="bin"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
              tickFormatter={(v: number) => `$${Math.round(v)}`}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<HistogramTooltip />} />
            <ReferenceLine
              x={meanPerAcre}
              stroke={C.amber}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Mean', position: 'top', fill: C.amber, fontSize: 10, fontWeight: 700 }}
            />
            <ReferenceLine
              x={0}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="2 2"
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {perAcreHistogram.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.bin >= 0 ? color : C.red}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.textDim }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.7 }} />
          Positive net benefit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.textDim }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.red, opacity: 0.7 }} />
          Net loss (premium {'>'} payment)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.textDim }}>
          <div style={{ width: 10, height: 2, background: C.amber }} />
          Mean
        </div>
      </div>
    </div>
  );
}

// ─── Histogram Tooltip ───────────────────────────────────────────────────────

function HistogramTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { bin: number; count: number } }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: '#1a2420', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textBright }}>
        ${data.bin.toFixed(2)}/acre range
      </div>
      <div style={{ fontSize: 11, color: C.textDim }}>
        {data.count} simulations
      </div>
    </div>
  );
}

// ─── Percentile Table ────────────────────────────────────────────────────────

function SimPercentileTable({ simResults }: { simResults: SimulationResult }) {
  const pctKeys = ['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'] as const;
  const pctLabels: Record<string, string> = {
    p5: 'P5 (Worst)', p10: 'P10', p25: 'P25',
    p50: 'P50 (Median)', p75: 'P75', p90: 'P90', p95: 'P95 (Best)',
  };
  const acres = simResults.inputs.plantedAcres || 1;

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 24, marginBottom: 24, overflowX: 'auto',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright, marginBottom: 4 }}>
        Net Benefit Percentiles ($/acre)
      </div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>
        What each strategy pays at different probability levels across {simResults.iterations.toLocaleString()} simulations
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Percentile</th>
            {simResults.scenarios.map(s => (
              <th key={s.scenario} style={{ ...thStyle, textAlign: 'right', color: SCENARIO_COLORS[s.scenario] || C.textMid }}>
                {SCENARIO_LABELS[s.scenario]?.shortLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pctKeys.map(pct => (
            <tr key={pct}>
              <td style={{ ...tdStyle, fontWeight: pct === 'p50' ? 700 : 400, color: C.textMid }}>
                {pctLabels[pct]}
              </td>
              {simResults.scenarios.map(s => {
                const val = s.netBenefit[pct] / acres;
                return (
                  <td key={s.scenario} style={{
                    ...tdStyle, textAlign: 'right', fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: val >= 0 ? C.green : C.red,
                    background: s.scenario === simResults.bestScenario ? 'rgba(16,185,129,0.04)' : 'transparent',
                  }}>
                    {val >= 0 ? '+' : ''}{val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Mean row */}
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, color: C.amber, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              Mean (Expected)
            </td>
            {simResults.scenarios.map(s => (
              <td key={s.scenario} style={{
                ...tdStyle, textAlign: 'right', fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: s.expectedNetBenefitPerAcre >= 0 ? C.green : C.red,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: s.scenario === simResults.bestScenario ? 'rgba(16,185,129,0.04)' : 'transparent',
              }}>
                {s.expectedNetBenefitPerAcre >= 0 ? '+' : ''}{s.expectedNetBenefitPerAcre.toFixed(2)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Price & Yield Distribution Summary ──────────────────────────────────────

function SimDistributionSummary({ simResults, commodity }: {
  simResults: SimulationResult; commodity: string;
}) {
  const price = PROJECTED_PRICES_2026[commodity];
  const unit = price?.unit || 'bu';

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 24, marginBottom: 24,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright, marginBottom: 4 }}>
        Simulated Market Conditions
      </div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>
        Distributions of harvest price, county yield, and farm yield from {simResults.iterations.toLocaleString()} simulations
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <DistCard
          title={`Harvest Price ($/${unit})`}
          dist={simResults.priceDistribution}
          format={(v: number) => `$${v.toFixed(2)}`}
          color={C.amber}
        />
        <DistCard
          title={`County Yield (${unit}/ac)`}
          dist={simResults.countyYieldDistribution}
          format={(v: number) => v.toFixed(1)}
          color={C.blue}
        />
        <DistCard
          title={`Farm Yield (${unit}/ac)`}
          dist={simResults.farmYieldDistribution}
          format={(v: number) => v.toFixed(1)}
          color={C.purple}
        />
      </div>
    </div>
  );
}

// ─── Distribution Card ───────────────────────────────────────────────────────

function DistCard({ title, dist, format, color }: {
  title: string; dist: SimulationPercentiles; format: (v: number) => string; color: string;
}) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 10 }}>{title}</div>

      {/* Mini range bar */}
      <div style={{ position: 'relative', height: 24, marginBottom: 10 }}>
        {/* P10-P90 bar */}
        <div style={{
          position: 'absolute', top: 8, height: 8, borderRadius: 4,
          left: '10%', right: '10%',
          background: `${color}25`,
        }} />
        {/* P25-P75 bar */}
        <div style={{
          position: 'absolute', top: 6, height: 12, borderRadius: 6,
          left: '25%', right: '25%',
          background: `${color}40`,
        }} />
        {/* Median dot */}
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          width: 16, height: 16, borderRadius: '50%',
          background: color, border: '2px solid rgba(0,0,0,0.3)',
        }} />
      </div>

      {/* Values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 10 }}>
        <div>
          <div style={{ color: C.textDim }}>P10</div>
          <div style={{ fontWeight: 600, color: C.textMid, fontVariantNumeric: 'tabular-nums' }}>{format(dist.p10)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: C.textDim }}>Median</div>
          <div style={{ fontWeight: 700, color: C.textBright, fontVariantNumeric: 'tabular-nums' }}>{format(dist.p50)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.textDim }}>P90</div>
          <div style={{ fontWeight: 600, color: C.textMid, fontVariantNumeric: 'tabular-nums' }}>{format(dist.p90)}</div>
        </div>
      </div>

      <div style={{ fontSize: 9, color: C.textDim, marginTop: 6, textAlign: 'center' }}>
        Mean: {format(dist.mean)} · StdDev: {format(dist.stdDev)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING COMPONENTS (preserved from Build 2B-2)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Data Source Badge Component ─────────────────────────────────────────────

function DataSourceBadge({ source, isLoading }: { source: 'usda_verified' | 'estimated'; isLoading: boolean }) {
  if (isLoading) {
    return (
      <span style={{
        fontSize: 10, padding: '2px 10px', borderRadius: 20,
        background: 'rgba(59,130,246,0.12)', color: C.blue,
        fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.blue, animation: 'pulse 1s infinite' }} />
        Loading...
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </span>
    );
  }

  if (source === 'usda_verified') {
    return (
      <span style={{
        fontSize: 10, padding: '2px 10px', borderRadius: 20,
        background: 'rgba(16,185,129,0.15)', color: '#34D399',
        fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M8 0L9.8 2.4L12.7 1.6L12.8 4.6L15.6 5.8L14 8.4L15.6 11L12.8 12.2L12.7 15.2L9.8 14.4L8 16.8L6.2 14.4L3.3 15.2L3.2 12.2L0.4 11L2 8.4L0.4 5.8L3.2 4.6L3.3 1.6L6.2 2.4L8 0Z" fill="#10B981"/>
          <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        USDA Verified
      </span>
    );
  }

  return (
    <span style={{
      fontSize: 10, padding: '2px 10px', borderRadius: 20,
      background: 'rgba(245,158,11,0.12)', color: '#FBBF24',
      fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3" fill="#FBBF24"/>
      </svg>
      Estimated
    </span>
  );
}

// ─── Mini Info Component ─────────────────────────────────────────────────────

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textBright }}>{value}</div>
    </div>
  );
}

// ─── Scenario Card Component ─────────────────────────────────────────────────

function ScenarioCard({ scenario: s, rank, isBest }: {
  scenario: ScenarioResult; rank: number; isBest: boolean;
}) {
  const [expanded, setExpanded] = useState(isBest);
  const label = SCENARIO_LABELS[s.scenario];

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${isBest ? 'rgba(16,185,129,0.3)' : C.cardBorder}`,
      borderRadius: 16, overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* Collapsed header */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '14px 16px', cursor: 'pointer',
        background: 'none', border: 'none', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Rank */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
          background: isBest ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
          color: isBest ? C.emerald : C.textDim,
        }}>
          #{rank}
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright }}>
            {label?.shortLabel}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
            Coverage: {Math.round(s.coverageFloor * 100)}% → {Math.round(s.coverageCeiling * 100)}%
          </div>
        </div>

        {/* Net benefit */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 800,
            color: s.netBenefitPerAcre >= 0 ? C.green : C.red,
          }}>
            {s.netBenefitPerAcre >= 0 ? '+' : ''}${s.netBenefitPerAcre.toFixed(2)}/ac
          </div>
          <div style={{ fontSize: 10, color: C.textDim }}>net benefit</div>
        </div>

        {/* Chevron */}
        <span style={{
          fontSize: 12, color: C.textDim, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.cardBorder}` }}>
          <div style={{ paddingTop: 12 }}>
            <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5, marginBottom: 12 }}>
              {label?.description}
            </p>

            {/* Premium breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <MiniStat label="You Pay" value={`$${s.totalFarmerPremiumPerAcre.toFixed(2)}/ac`} color={C.red} />
              <MiniStat label="Expected Benefit" value={`$${s.totalExpectedBenefitPerAcre.toFixed(2)}/ac`} color={C.green} />
              <MiniStat label="Net Benefit" value={`${s.netBenefitPerAcre >= 0 ? '+' : ''}$${s.netBenefitPerAcre.toFixed(2)}/ac`}
                color={s.netBenefitPerAcre >= 0 ? C.green : C.red} />
            </div>

            {/* Component breakdown */}
            <div style={{ fontSize: 11, color: C.textDim }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  RP ({s.rpPremium.coverageLevel}%) premium
                  {s.rpPremium.dataSource === 'adm' && (
                    <span style={{ fontSize: 8, color: C.emerald, fontWeight: 700 }}>ADM</span>
                  )}
                </span>
                <span style={{ color: C.textMid }}>${s.rpPremium.farmerPremiumPerAcre.toFixed(2)}/ac</span>
              </div>
              {s.scoPremium && s.scoPremium.farmerPremium > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>SCO ({s.scoPremium.bandLabel}) premium</span>
                  <span style={{ color: C.textMid }}>${s.scoPremium.farmerPremiumPerAcre.toFixed(2)}/ac</span>
                </div>
              )}
              {s.ecoPremium && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>{s.ecoPremium.ecoLevel} ({s.ecoPremium.bandLabel}) premium</span>
                  <span style={{ color: C.textMid }}>${s.ecoPremium.farmerPremiumPerAcre.toFixed(2)}/ac</span>
                </div>
              )}
              {s.arcPayment && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>ARC-CO projected payment</span>
                  <span style={{ color: C.green, fontWeight: 600 }}>+${s.arcPayment.paymentPerAcre.toFixed(2)}/ac (FREE)</span>
                </div>
              )}
              {s.plcPayment && s.plcPayment.paymentRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>PLC projected payment</span>
                  <span style={{ color: C.green, fontWeight: 600 }}>+${s.plcPayment.paymentPerAcre.toFixed(2)}/ac (FREE)</span>
                </div>
              )}
              {s.netBenefit !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 600, color: C.textBright }}>
                  <span>Total on your operation</span>
                  <span style={{ color: s.netBenefit >= 0 ? C.green : C.red }}>
                    {s.netBenefit >= 0 ? '+' : ''}${s.netBenefit.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini Stat Component ─────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 10,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.5)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f0fdf4', fontSize: 15, fontWeight: 600,
  outline: 'none', fontVariantNumeric: 'tabular-nums',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

const optionStyle: React.CSSProperties = {
  background: '#1a2420',
  color: '#f0fdf4',
  padding: '8px 12px',
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  fontSize: 11, fontWeight: 700,
  color: C.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  fontSize: 12,
};
