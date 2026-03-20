// =============================================================================
// HarvestFile — Phase 16B Build 1: Coverage Optimizer
// app/(dashboard)/dashboard/insurance/page.tsx
//
// THE FEATURE NO COMPETITOR HAS.
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

import React, { useState, useMemo, useCallback } from 'react';

import {
  INSURANCE_COMMODITIES,
  COMMODITY_DISPLAY,
  PROJECTED_PRICES_2026,
  COVERAGE_LEVELS,
  SCENARIO_LABELS,
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

  // Build inputs object
  const inputs: FarmInputs = useMemo(() => ({
    commodity, aphYield, plantedAcres, baseAcres, coverageLevel, isBeginningFarmer,
  }), [commodity, aphYield, plantedAcres, baseAcres, coverageLevel, isBeginningFarmer]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Coverage Optimizer
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(236,72,153,0.15)', color: C.pink, fontWeight: 600 }}>
            NEW — OBBBA 2026
          </span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textBright, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.3 }}>
          Build Your Complete Safety Net
        </h2>
        <p style={{ fontSize: 13, color: C.textDim, marginTop: 4, lineHeight: 1.5 }}>
          Compare ARC/PLC + SCO + ECO + Revenue Protection in one view.
          First tool to model the new OBBBA stacking rules.
        </p>
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
                <option key={c} value={c}>{COMMODITY_DISPLAY[c]?.emoji} {COMMODITY_DISPLAY[c]?.name}</option>
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

        <p style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>
          Lower RP + SCO + ECO often beats higher RP alone. Slide to compare.
        </p>
      </div>

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
        <strong style={{ color: C.textMid }}>Disclaimer:</strong> Premium estimates use representative
        Midwest rates and may differ from your county&apos;s actual rates. SCO and ECO use county-level
        triggers that may not align with farm-level losses. ARC/PLC payments are projections based on
        current MYA price estimates. Always consult your crop insurance agent for exact premium quotes
        and your local FSA office for program enrollment. This tool does not replace professional advice.
      </div>
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
                <span>RP ({s.rpPremium.coverageLevel}%) premium</span>
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
