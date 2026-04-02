// =============================================================================
// HarvestFile — Build 18 Deploy 5 Final: Multi-Crop Optimization Panel
// app/(marketing)/check/components/multi-crop/MultiCropPanel.tsx
//
// Final fixes:
//   - Result card payment data uses STACKED layout (not side-by-side)
//   - Per-acre and total on separate lines — zero text overlap at any width
//   - Dark select styling on all dropdowns
// =============================================================================

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  useFarmStore,
  type MultiCropResult,
  CROP_NAMES,
  generateEntryId,
  getMultiCropTotals,
} from '@/lib/stores/farm-store';

const AVAILABLE_CROPS = [
  { code: 'CORN', name: 'Corn' }, { code: 'SOYBEANS', name: 'Soybeans' },
  { code: 'WHEAT', name: 'Wheat' }, { code: 'SORGHUM', name: 'Sorghum' },
  { code: 'BARLEY', name: 'Barley' }, { code: 'OATS', name: 'Oats' },
  { code: 'RICE', name: 'Rice' }, { code: 'PEANUTS', name: 'Peanuts' },
  { code: 'COTTON', name: 'Cotton' },
];

const MAX_CROPS = 9;

const SEL: React.CSSProperties = {
  backgroundColor: '#1B4332', color: '#fff',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84C' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};
const OPT: React.CSSProperties = { backgroundColor: '#1B4332', color: '#fff', padding: '8px 12px' };
const OPT_D: React.CSSProperties = { backgroundColor: '#1B4332', color: 'rgba(255,255,255,0.3)', padding: '8px 12px' };
const INP: React.CSSProperties = { backgroundColor: '#1B4332' };

function getConf(has: boolean, yrs: number) { if (!has) return 30; if (yrs >= 7) return 95; if (yrs >= 5) return 85; if (yrs >= 3) return 70; return 50; }
function confLabel(c: number) { if (c >= 85) return { l: 'High', col: '#16A34A' }; if (c >= 60) return { l: 'Moderate', col: '#D97706' }; return { l: 'Low', col: '#DC2626' }; }

function IPlus() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function ITrash() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>; }
function IZap() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>; }
function IWarn() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>; }
function IChk() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>; }

interface Props { countyFips: string; countyName: string; stateAbbr: string; isActive: boolean; }

export default function MultiCropPanel({ countyFips, countyName, stateAbbr, isActive }: Props) {
  const inputs = useFarmStore((s) => s.inputs);
  const entries = useFarmStore((s) => s.multiCropEntries);
  const results = useFarmStore((s) => s.optimization);
  const loading = useFarmStore((s) => s.loadingOptimization);
  const error = useFarmStore((s) => s.optimizationError);
  const cacheKey = useFarmStore((s) => s.optimizationCacheKey);
  const setEntries = useFarmStore((s) => s.setMultiCropEntries);
  const addEntry = useFarmStore((s) => s.addMultiCropEntry);
  const removeEntry = useFarmStore((s) => s.removeMultiCropEntry);
  const updateEntry = useFarmStore((s) => s.updateMultiCropEntry);
  const setOpt = useFarmStore((s) => s.setOptimization);
  const setLoad = useFarmStore((s) => s.setLoadingOptimization);
  const setErr = useFarmStore((s) => s.setOptimizationError);
  const setKey = useFarmStore((s) => s.setOptimizationCacheKey);
  const init = useRef(false);

  useEffect(() => {
    if (init.current || !isActive || entries.length > 0) return;
    init.current = true;
    if (inputs.cropCode && inputs.acres) {
      setEntries([{ id: generateEntryId(), cropCode: inputs.cropCode, cropName: CROP_NAMES[inputs.cropCode] || inputs.cropCode, acres: inputs.acres }]);
    }
  }, [isActive, inputs.cropCode, inputs.acres, entries.length, setEntries]);

  const used = new Set(entries.map((e) => e.cropCode));

  const handleAdd = useCallback(() => {
    if (entries.length >= MAX_CROPS) return;
    const a = AVAILABLE_CROPS.find((c) => !used.has(c.code));
    if (!a) return;
    addEntry({ id: generateEntryId(), cropCode: a.code, cropName: a.name, acres: '' });
  }, [entries.length, used, addEntry]);

  const handleRun = useCallback(async () => {
    const valid = entries.filter((e) => e.cropCode && e.acres && parseInt(e.acres.replace(/,/g, '')) > 0);
    if (!valid.length) { setErr('Please add at least one crop with base acres.'); return; }
    if (!countyFips) { setErr('County data is required.'); return; }
    const k = valid.map((e) => `${e.cropCode}:${e.acres}`).sort().join('|') + `@${countyFips}`;
    if (k === cacheKey && results) return;
    setLoad(true); setErr(null); setOpt(null);
    try {
      const ps = valid.map((e) => {
        const a = parseInt(e.acres.replace(/,/g, '')) || 0;
        return fetch(`/api/calculator/estimate?county_fips=${countyFips}&crop=${e.cropCode}&acres=${a}`).then((r) => r.json());
      });
      const settled = await Promise.allSettled(ps);
      const out: MultiCropResult[] = settled.map((r, i) => {
        const e = valid[i]; const a = parseInt(e.acres.replace(/,/g, '')) || 0;
        if (r.status === 'fulfilled' && r.value?.hasCountyData) {
          const d = r.value;
          return { cropCode: e.cropCode, cropName: e.cropName, acres: a, recommended: d.best || 'PLC', arcPerAcre: d.arcPerAcre || 0, plcPerAcre: d.plcPerAcre || 0, arcTotal: d.arc || 0, plcTotal: d.plc || 0, advantage: d.diff || 0, advantagePerAcre: d.diffPerAcre || 0, confidence: getConf(true, d.dataYears || 0), hasCountyData: true, dataYears: d.dataYears || 0 };
        }
        return { cropCode: e.cropCode, cropName: e.cropName, acres: a, recommended: 'PLC' as const, arcPerAcre: 0, plcPerAcre: 0, arcTotal: 0, plcTotal: 0, advantage: 0, advantagePerAcre: 0, confidence: r.status === 'fulfilled' ? getConf(false, 0) : 0, hasCountyData: false, dataYears: 0 };
      });
      setOpt(out); setKey(k);
    } catch { setErr('Failed to run optimization. Please try again.'); } finally { setLoad(false); }
  }, [entries, countyFips, cacheKey, results, setLoad, setErr, setOpt, setKey]);

  const totals = results ? getMultiCropTotals(results) : null;
  const vc = entries.filter((e) => e.cropCode && e.acres && parseInt(e.acres.replace(/,/g, '')) > 0).length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 py-2">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Multi-Crop Election Strategy</h3>
        <p className="text-sm text-white/40 max-w-[520px] mx-auto leading-relaxed">Add all your crops below to see the optimal ARC-CO or PLC election for each commodity simultaneously. Under OBBBA, elections are made per-crop — you can elect differently for each.</p>
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
        <span className="text-white/50">Analyzing for <strong className="text-white/70">{countyName}, {stateAbbr}</strong></span>
      </div>

      {/* Crop rows */}
      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div key={entry.id} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>{i + 1}</div>
            <select value={entry.cropCode} onChange={(e) => { const c = AVAILABLE_CROPS.find((x) => x.code === e.target.value); if (c) updateEntry(entry.id, { cropCode: c.code, cropName: c.name }); }} className="min-h-[48px] flex-1 min-w-0 rounded-lg border border-white/10 px-3 py-2 text-sm focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] appearance-none" style={SEL}>
              {AVAILABLE_CROPS.map((c) => <option key={c.code} value={c.code} disabled={used.has(c.code) && c.code !== entry.cropCode} style={used.has(c.code) && c.code !== entry.cropCode ? OPT_D : OPT}>{c.name}</option>)}
            </select>
            <input type="text" inputMode="numeric" placeholder="Acres" value={entry.acres} onChange={(e) => updateEntry(entry.id, { acres: e.target.value.replace(/[^0-9,]/g, '') })} className="min-h-[48px] w-24 sm:w-28 rounded-lg border border-white/10 px-3 py-2 text-sm text-white text-right tabular-nums placeholder:text-white/20 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]" style={INP} />
            {entries.length > 1 ? <button onClick={() => removeEntry(entry.id)} className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-white/20 hover:text-red-400/80 hover:bg-red-400/10 transition-colors active:scale-95" aria-label={`Remove ${entry.cropName}`}><ITrash /></button> : <div className="w-9" />}
          </div>
        ))}
        {entries.length < MAX_CROPS && <button onClick={handleAdd} className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]" style={{ color: '#C9A84C', border: '2px dashed rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.03)' }}><IPlus /> Add Another Crop</button>}
      </div>

      {/* Optimize button */}
      <button onClick={handleRun} disabled={loading || vc === 0} className="flex items-center justify-center gap-2.5 w-full min-h-[56px] p-4 rounded-[14px] text-[15px] sm:text-base font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none" style={{ background: loading ? 'rgba(201,168,76,0.15)' : 'linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)', color: loading ? '#C9A84C' : '#0C1F17', boxShadow: loading ? 'none' : '0 6px 28px rgba(201,168,76,0.2)' }}>
        {loading ? <><div className="w-4 h-4 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" /> Analyzing {vc} crops...</> : <><IZap /> Optimize All {vc > 1 ? `${vc} Crops` : 'Crops'}</>}
      </button>

      {error && <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5' }}><IWarn /><span>{error}</span></div>}

      {/* RESULTS */}
      {results && results.length > 0 && (
        <div className="space-y-5">
          {/* Total */}
          {totals && (
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.15)' }}>
              <div className="text-center space-y-3">
                <div className="text-xs font-bold text-[#C9A84C]/60 uppercase tracking-wider">Optimized Total Estimated Payment</div>
                <div className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">${totals.totalOptimal.toLocaleString()}</div>
                {totals.savings > 0 && <div className="text-sm text-emerald-400/80">Saves ${totals.savings.toLocaleString()} vs choosing the same program for all crops</div>}
                {totals.approachingLimit && <div className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: totals.exceedsLimit ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)', border: `1px solid ${totals.exceedsLimit ? 'rgba(220,38,38,0.3)' : 'rgba(217,119,6,0.3)'}`, color: totals.exceedsLimit ? '#FCA5A5' : '#FCD34D' }}><IWarn />{totals.exceedsLimit ? `Exceeds $${totals.paymentLimit.toLocaleString()} OBBBA limit` : `Approaching $${totals.paymentLimit.toLocaleString()} OBBBA limit`}</div>}
              </div>
            </div>
          )}

          {/* Per-crop cards — FIXED: fully stacked layout, no overlap */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => {
              const cf = confLabel(r.confidence);
              const isArc = r.recommended === 'ARC-CO';
              return (
                <div key={r.cropCode} className="rounded-xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isArc ? 'rgba(45,212,191,0.15)' : 'rgba(201,168,76,0.15)'}` }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <div className="text-[17px] font-bold text-white">{r.cropName}</div>
                      <div className="text-[13px] text-white/40 mt-1">{r.acres.toLocaleString()} base acres</div>
                    </div>
                    <div className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: isArc ? 'rgba(45,212,191,0.12)' : 'rgba(201,168,76,0.12)', color: isArc ? '#2DD4BF' : '#C9A84C', border: `1px solid ${isArc ? 'rgba(45,212,191,0.25)' : 'rgba(201,168,76,0.25)'}` }}>{r.recommended}</div>
                  </div>

                  {r.hasCountyData ? (
                    <div className="space-y-3">
                      {/* ARC-CO — stacked, not side-by-side */}
                      <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.08)' }}>
                        <div className="text-[11px] font-bold text-[#2DD4BF]/50 uppercase tracking-wider">ARC-CO</div>
                        <div className="text-[16px] font-bold text-white/70 tabular-nums">${r.arcPerAcre.toFixed(2)}<span className="text-[12px] text-white/30 font-medium">/acre</span></div>
                        <div className="text-[13px] text-white/40 tabular-nums">Total: ${r.arcTotal.toLocaleString()}</div>
                      </div>

                      {/* PLC — stacked */}
                      <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.08)' }}>
                        <div className="text-[11px] font-bold text-[#C9A84C]/50 uppercase tracking-wider">PLC</div>
                        <div className="text-[16px] font-bold text-white/70 tabular-nums">${r.plcPerAcre.toFixed(2)}<span className="text-[12px] text-white/30 font-medium">/acre</span></div>
                        <div className="text-[13px] text-white/40 tabular-nums">Total: ${r.plcTotal.toLocaleString()}</div>
                      </div>

                      {/* Advantage */}
                      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-[13px] text-white/40">Advantage</span>
                        <span className="text-[16px] font-bold text-emerald-400 tabular-nums">+${r.advantage.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-white/30 text-center py-6 px-3 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>Insufficient county data for {r.cropName}. Estimate not available.</div>
                  )}

                  {/* Confidence */}
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${cf.col}15`, color: cf.col, border: `1px solid ${cf.col}30` }}>{r.confidence >= 85 ? <IChk /> : null}{cf.l} Confidence</div>
                    {r.hasCountyData && <span className="text-[10px] text-white/20">{r.dataYears}yr data</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-white/20 text-center leading-relaxed space-y-1 pt-2">
            <p>Estimates use OBBBA (2025 Farm Bill) rules: 90% ARC-CO guarantee, 88% PLC escalator, 85% payment acres, 5.7% sequestration. Per-crop elections are independent.</p>
            <p>Projections based on {countyName} USDA NASS historical data. Actual payments depend on final MYA prices and official county yields. Consult your FSA office before making elections.</p>
          </div>
        </div>
      )}

      {!results && !loading && !error && entries.length > 0 && <div className="text-center py-6"><p className="text-sm text-white/30">Add your crops above and tap <strong className="text-[#C9A84C]/60">Optimize All Crops</strong> to see recommendations.</p></div>}
    </div>
  );
}
