// =============================================================================
// HarvestFile — Phase 16B Build 2B-2: Coverage Optimizer
// app/(dashboard)/dashboard/insurance/page.tsx
//
// THE FEATURE NO COMPETITOR HAS — now with REAL COUNTY DATA.
//
// Build 2B-2 upgrade:
//   - State/County cascading selector (searchable county dropdown)
//   - Real USDA RMA actuarial premium data via batch RPC (10.8M records)
//   - "USDA Verified" / "Estimated" badge system
//   - All 8 coverage levels fetched in one call — slider is zero-latency
//   - County reference yield improves ARC-CO payment accuracy
//   - Graceful fallback to estimated rates when no county selected
//
// Shows a farmer's COMPLETE safety net in one integrated view:
//   - Individual Revenue Protection (RP)
//   - Supplemental Coverage Option (SCO) — newly available with ARC under OBBBA
//   - Enhanced Coverage Option (ECO-90 / ECO-95)
//   - ARC-CO or PLC program payments
//
// Interactive coverage level slider dynamically recalculates all premiums
// and shows 4 scenario comparisons ranked by net benefit.
//
// Mobile-first, dark theme, matches existing dashboard design language.
// =============================================================================

'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import {
  INSURANCE_COMMODITIES,
  COMMODITY_DISPLAY,
  PROJECTED_PRICES_2026,
  COVERAGE_LEVELS,
  SCENARIO_LABELS,
  COMMODITY_CODES,
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
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  red: '#EF4444',
  green: '#22C55E',
};

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

    // Debounce to avoid rapid re-fetches during typing
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

  // Calculate all scenarios
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

      {/* ── Disclaimer ── */}
      <div style={{
        fontSize: 11, color: C.textDim, lineHeight: 1.6,
        padding: 16, borderRadius: 12,
        border: `1px solid ${C.cardBorder}`, background: 'rgba(255,255,255,0.01)',
      }}>
        <strong style={{ color: C.textMid }}>
          {dataSource === 'usda_verified' ? 'Data Source:' : 'Disclaimer:'}
        </strong>{' '}
        {dataSource === 'usda_verified' ? (
          <>
            RP premiums use official USDA RMA actuarial data for {selectedCountyName} County, {selectedStateName} (Crop Year 2026, Enterprise Unit, Revenue Protection).
            SCO and ECO premiums use representative Midwest rates. ARC/PLC payments are projections based
            on current MYA price estimates and county reference yields. Estimates only — contact your crop
            insurance agent for binding premium quotes and your local FSA office for program enrollment.
          </>
        ) : (
          <>
            Premium estimates use representative Midwest rates and may differ from your county&apos;s actual rates.
            Select your state and county above for real USDA actuarial data.
            SCO and ECO use county-level triggers that may not align with farm-level losses. ARC/PLC payments
            are projections based on current MYA price estimates. Always consult your crop insurance agent for
            exact premium quotes and your local FSA office for program enrollment. This tool does not replace professional advice.
          </>
        )}
      </div>
    </div>
  );
}

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
