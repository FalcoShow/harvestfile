// =============================================================================
// HarvestFile — Build 18 Deploy 5 Final: Base Acre Analysis Panel
// app/(marketing)/check/components/base-acres/BaseAcresPanel.tsx
//
// Final fixes:
//   - OBBBA expander has cursor-pointer + hover glow (matches FAQ style)
//   - Dark select styling on all dropdowns
//   - OBBBA calculation uses correct 15% allowance
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useFarmStore,
  OBBBA_REFERENCE_PRICES,
  CROP_NAMES,
  generateEntryId,
} from '@/lib/stores/farm-store';

const PAYMENT_ACRES_FACTOR = 0.85;
const SEQUESTRATION_RATE = 0.057;
const NATIONAL_CAP = 30_000_000;
const EST_ELIGIBLE = 38_700_000;

const CROPS = [
  { code: 'CORN', name: 'Corn' }, { code: 'SOYBEANS', name: 'Soybeans' },
  { code: 'WHEAT', name: 'Wheat' }, { code: 'SORGHUM', name: 'Sorghum' },
  { code: 'BARLEY', name: 'Barley' }, { code: 'OATS', name: 'Oats' },
  { code: 'RICE', name: 'Rice' }, { code: 'PEANUTS', name: 'Peanuts' },
  { code: 'COTTON', name: 'Cotton' },
];

const SEL: React.CSSProperties = {
  backgroundColor: '#1B4332', color: '#fff',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84C' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};
const OPT: React.CSSProperties = { backgroundColor: '#1B4332', color: '#fff', padding: '8px 12px' };
const OPT_D: React.CSSProperties = { backgroundColor: '#1B4332', color: 'rgba(255,255,255,0.3)', padding: '8px 12px' };
const INP: React.CSSProperties = { backgroundColor: '#1B4332' };

function IInfo() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>; }
function IPlus() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function ITrash() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>; }
function ICalc() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10" /><line x1="12" y1="10" x2="12" y2="10" /><line x1="16" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="8" y2="18" /><line x1="12" y1="18" x2="16" y2="18" /></svg>; }

interface Props { countyFips: string; countyName: string; stateAbbr: string; isActive: boolean; }

export default function BaseAcresPanel({ countyFips, countyName, stateAbbr, isActive }: Props) {
  const inputs = useFarmStore((s) => s.inputs);
  const comparison = useFarmStore((s) => s.comparison);
  const entries = useFarmStore((s) => s.baseAcreEntries);
  const setEntries = useFarmStore((s) => s.setBaseAcreEntries);
  const addEntry = useFarmStore((s) => s.addBaseAcreEntry);
  const removeEntry = useFarmStore((s) => s.removeBaseAcreEntry);
  const updateEntry = useFarmStore((s) => s.updateBaseAcreEntry);

  const [showOBBBA, setShowOBBBA] = useState(false);
  const [farmAcres, setFarmAcres] = useState('');
  const init = useRef(false);

  useEffect(() => {
    if (init.current || !isActive || entries.length > 0) return;
    init.current = true;
    if (inputs.cropCode && inputs.acres) {
      setEntries([{ id: generateEntryId(), cropCode: inputs.cropCode, cropName: CROP_NAMES[inputs.cropCode] || inputs.cropCode, baseAcres: inputs.acres, plcYield: '', plantedAcres: inputs.acres }]);
    }
  }, [isActive, inputs.cropCode, inputs.acres, entries.length, setEntries]);

  const used = new Set(entries.map((e) => e.cropCode));

  const handleAdd = useCallback(() => {
    if (entries.length >= 9) return;
    const a = CROPS.find((c) => !used.has(c.code));
    if (!a) return;
    addEntry({ id: generateEntryId(), cropCode: a.code, cropName: a.name, baseAcres: '', plcYield: '', plantedAcres: '' });
  }, [entries.length, used, addEntry]);

  const analysis = entries.map((entry) => {
    const ba = parseInt(entry.baseAcres.replace(/,/g, '')) || 0;
    const pa = Math.round(ba * PAYMENT_ACRES_FACTOR);
    const ref = OBBBA_REFERENCE_PRICES[entry.cropCode];
    let arcPa = 0, plcPa = 0;
    if (comparison && inputs.cropCode === entry.cropCode) { arcPa = comparison.arcPerAcre || 0; plcPa = comparison.plcPerAcre || 0; }
    return { ...entry, ba, pa, refP: ref?.price || 0, refU: ref?.unit || '', arcPa, plcPa, arcT: Math.round(arcPa * pa * (1 - SEQUESTRATION_RATE)), plcT: Math.round(plcPa * pa * (1 - SEQUESTRATION_RATE)), hasEst: arcPa > 0 || plcPa > 0 };
  });

  const totalBase = analysis.reduce((s, a) => s + a.ba, 0);
  const totalPay = analysis.reduce((s, a) => s + a.pa, 0);

  const totalPlanted = entries.reduce((s, e) => s + (parseInt(e.plantedAcres.replace(/,/g, '')) || 0), 0);
  const farmNum = parseInt(farmAcres.replace(/,/g, '')) || 0;
  const allow15 = farmNum > 0 ? Math.round(farmNum * 0.15) : 0;
  const updatedBase = totalPlanted + allow15;
  const newElig = Math.max(0, updatedBase - totalBase);
  const proRata = Math.min(1, NATIONAL_CAP / EST_ELIGIBLE);
  const estNew = Math.round(newElig * proRata);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 py-2">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Base Acre Analysis</h3>
        <p className="text-sm text-white/40 max-w-[520px] mx-auto leading-relaxed">Your base acres are the foundation of every ARC and PLC payment. Enter your base acres below to see exactly how they translate into payment dollars.</p>
      </div>

      {/* Key concept */}
      <div className="rounded-xl p-4 sm:p-5" style={{ background: 'rgba(45,212,191,0.03)', border: '1px solid rgba(45,212,191,0.1)' }}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-[#2DD4BF]/60"><IInfo /></div>
          <div className="text-sm text-white/50 leading-relaxed"><strong className="text-white/70">Base acres ≠ planted acres.</strong> Base acres are historical crop-specific acreages permanently tied to your FSA farm number. You receive ARC/PLC payments on <strong className="text-[#C9A84C]">85% of your base acres</strong> — regardless of what you actually plant. This &ldquo;decoupling&rdquo; means you can plant soybeans on corn base acres and still receive corn program payments if triggered.</div>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Your Base Acres</span>
          <span className="text-xs text-white/20">From FSA-156EZ farm record</span>
        </div>
        {entries.map((entry, i) => (
          <div key={entry.id} className="p-3 sm:p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>{i + 1}</div>
              <select value={entry.cropCode} onChange={(e) => { const c = CROPS.find((x) => x.code === e.target.value); if (c) updateEntry(entry.id, { cropCode: c.code, cropName: c.name }); }} className="min-h-[48px] flex-1 min-w-0 rounded-lg border border-white/10 px-3 py-2 text-sm focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] appearance-none" style={SEL}>
                {CROPS.map((c) => <option key={c.code} value={c.code} disabled={used.has(c.code) && c.code !== entry.cropCode} style={used.has(c.code) && c.code !== entry.cropCode ? OPT_D : OPT}>{c.name}</option>)}
              </select>
              {entries.length > 1 ? <button onClick={() => removeEntry(entry.id)} className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-white/20 hover:text-red-400/80 hover:bg-red-400/10 transition-colors active:scale-95" aria-label={`Remove ${entry.cropName}`}><ITrash /></button> : <div className="w-9" />}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div><label className="block text-[11px] text-white/30 font-medium mb-1 px-1">Base Acres</label><input type="text" inputMode="numeric" placeholder="e.g. 500" value={entry.baseAcres} onChange={(e) => updateEntry(entry.id, { baseAcres: e.target.value.replace(/[^0-9,]/g, '') })} className="w-full min-h-[48px] rounded-lg border border-white/10 px-3 py-2 text-sm text-white text-right tabular-nums placeholder:text-white/20 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]" style={INP} /></div>
              <div><label className="block text-[11px] text-white/30 font-medium mb-1 px-1">PLC Yield ({OBBBA_REFERENCE_PRICES[entry.cropCode]?.unit?.replace('$/', '') || 'bu/ac'})</label><input type="text" inputMode="decimal" placeholder="e.g. 175" value={entry.plcYield} onChange={(e) => updateEntry(entry.id, { plcYield: e.target.value.replace(/[^0-9.]/g, '') })} className="w-full min-h-[48px] rounded-lg border border-white/10 px-3 py-2 text-sm text-white text-right tabular-nums placeholder:text-white/20 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]" style={INP} /></div>
            </div>
            {(parseInt(entry.baseAcres.replace(/,/g, '')) || 0) > 0 && (
              <div className="flex items-center gap-4 text-xs text-white/30 px-1">
                <span>Payment acres: <strong className="text-[#C9A84C]/70">{Math.round((parseInt(entry.baseAcres.replace(/,/g, '')) || 0) * 0.85).toLocaleString()}</strong> (85%)</span>
                {OBBBA_REFERENCE_PRICES[entry.cropCode] && <span>Ref price: <strong className="text-white/50">{OBBBA_REFERENCE_PRICES[entry.cropCode].price} {OBBBA_REFERENCE_PRICES[entry.cropCode].unit}</strong></span>}
              </div>
            )}
          </div>
        ))}
        {entries.length < 9 && <button onClick={handleAdd} className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]" style={{ color: '#C9A84C', border: '2px dashed rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.03)' }}><IPlus /> Add Another Crop</button>}
      </div>

      {/* Summary */}
      {totalBase > 0 && (
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.15)' }}>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="text-center"><div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">Total Base Acres</div><div className="text-2xl sm:text-3xl font-black text-white tabular-nums">{totalBase.toLocaleString()}</div></div>
            <div className="text-center"><div className="text-xs font-bold text-[#C9A84C]/50 uppercase tracking-wider mb-1">Payment Acres (85%)</div><div className="text-2xl sm:text-3xl font-black text-[#C9A84C] tabular-nums">{totalPay.toLocaleString()}</div></div>
          </div>
          {analysis.some((a) => a.hasEst) && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Estimated Payments (Using Comparison Data)</div>
              {analysis.filter((a) => a.hasEst).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm"><span className="text-white/60">{a.cropName}</span><div className="flex gap-4 tabular-nums"><span className="text-[#2DD4BF]/70">ARC: ${a.arcT.toLocaleString()}</span><span className="text-[#C9A84C]/70">PLC: ${a.plcT.toLocaleString()}</span></div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OBBBA — FIXED: cursor-pointer + hover glow matching FAQ style */}
      <details className="group rounded-xl overflow-hidden hover:border-white/[0.12] transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <summary className="flex items-center justify-between w-full p-4 sm:p-5 cursor-pointer text-left list-none [&::-webkit-details-marker]:hidden hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45,212,191,0.08)' }}><ICalc /></div>
            <div><div className="text-sm font-semibold text-white/80">OBBBA New Base Acre Estimator</div><div className="text-xs text-white/30 mt-0.5">Up to 30 million new base acres nationwide for 2026</div></div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-3 group-open:rotate-180 transition-transform"><polyline points="6 9 12 15 18 9" /></svg>
        </summary>
        <div className="p-4 sm:p-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-sm text-white/40 leading-relaxed">The OBBBA authorizes up to 30 million new base acres for the 2026 crop year. Your farm qualifies if a covered commodity was planted in at least one year during 2019-2023 and your updated base exceeds current base acres. Enter your average planted acres and total farm acres below to estimate eligibility.</div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white/30 uppercase tracking-wider">2019-2023 Average Planted Acres Per Crop</label>
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3"><span className="text-sm text-white/50 min-w-[80px]">{entry.cropName}</span><input type="text" inputMode="numeric" placeholder="Avg acres" value={entry.plantedAcres} onChange={(e) => updateEntry(entry.id, { plantedAcres: e.target.value.replace(/[^0-9,]/g, '') })} className="flex-1 min-h-[44px] rounded-lg border border-white/10 px-3 py-2 text-sm text-white text-right tabular-nums placeholder:text-white/20 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]" style={INP} /></div>
            ))}
          </div>
          <div><label className="block text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Total Farm Acres (all land)</label><input type="text" inputMode="numeric" placeholder="e.g. 1200" value={farmAcres} onChange={(e) => setFarmAcres(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full min-h-[48px] rounded-lg border border-white/10 px-3 py-2 text-sm text-white text-right tabular-nums placeholder:text-white/20 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]" style={INP} /></div>
          {totalPlanted > 0 && totalBase > 0 && (
            <div className="rounded-xl p-4" style={{ background: estNew > 0 ? 'rgba(45,212,191,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${estNew > 0 ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
              {estNew > 0 ? (
                <div className="text-center space-y-2"><div className="text-xs font-bold text-[#2DD4BF]/60 uppercase tracking-wider">Estimated New Base Acres (After Pro-Rata)</div><div className="text-2xl font-black text-[#2DD4BF] tabular-nums">+{estNew.toLocaleString()} acres</div><div className="text-xs text-white/30">Updated base: {updatedBase.toLocaleString()} (planted avg {totalPlanted.toLocaleString()} + 15% allowance {allow15.toLocaleString()}) − current base {totalBase.toLocaleString()} = {newElig.toLocaleString()} eligible × {Math.round(proRata * 100)}% pro-rata</div></div>
              ) : (
                <div className="text-center space-y-2"><div className="text-sm text-white/40">Based on the data entered, your farm may not be eligible for additional base acres under OBBBA.</div><div className="text-xs text-white/25">Current base ({totalBase.toLocaleString()}) already covers your updated base calculation ({updatedBase.toLocaleString()}).</div></div>
              )}
            </div>
          )}
          {(totalPlanted === 0 || totalBase === 0) && <div className="text-center text-sm text-white/25 py-2">Enter your planted acres above and total farm acres to see your estimated eligibility.</div>}
          <div className="text-[11px] text-white/20 italic leading-relaxed">This is a rough estimate. Actual new base acre allocations will be determined by FSA based on certified planting records and may differ. The pro-rata reduction depends on total national eligibility. Contact your local FSA office for official calculations.</div>
        </div>
      </details>

      {/* Educational FAQ */}
      <details className="group rounded-xl overflow-hidden hover:border-white/[0.12] transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <summary className="flex items-center justify-between p-4 cursor-pointer text-[13px] font-semibold text-white/50 hover:text-white/70 transition-colors list-none [&::-webkit-details-marker]:hidden">How do base acres affect payments?<svg className="w-4 h-4 text-white/20 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></summary>
        <div className="px-4 pb-4 text-sm text-white/40 leading-relaxed space-y-3">
          <p>Both ARC-CO and PLC use <strong className="text-white/60">85% of your base acres</strong> as &ldquo;payment acres.&rdquo; This means if you have 1,000 base acres, only 850 acres generate payments. This 85% factor was set by Congress and applies equally to both programs.</p>
          <p><strong className="text-[#2DD4BF]/70">ARC-CO</strong> pays when actual county revenue falls below 90% of the benchmark. The payment is capped at 12% of benchmark revenue per base acre. ARC-CO protects against both price drops and yield losses at the county level.</p>
          <p><strong className="text-[#C9A84C]/70">PLC</strong> pays when the national Marketing Year Average (MYA) price falls below the effective reference price. The payment rate is multiplied by your farm&apos;s specific PLC yield. PLC protects against price drops only.</p>
          <p>After the payment rate is calculated, a 5.7% sequestration reduction is applied to the final payment amount per the Budget Control Act.</p>
        </div>
      </details>

      <details className="group rounded-xl overflow-hidden hover:border-white/[0.12] transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <summary className="flex items-center justify-between p-4 cursor-pointer text-[13px] font-semibold text-white/50 hover:text-white/70 transition-colors list-none [&::-webkit-details-marker]:hidden">Where do I find my base acres?<svg className="w-4 h-4 text-white/20 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></summary>
        <div className="px-4 pb-4 text-sm text-white/40 leading-relaxed space-y-3">
          <p>Your base acres are listed on the <strong className="text-white/60">FSA-156EZ</strong> (Abbreviated Farm Record). You can access this through your account at <strong className="text-white/60">farmers.gov</strong> or request it from your local FSA county office.</p>
          <p>The farm record shows base acres by commodity, PLC payment yields, total cropland, CRP acres, and other program eligibility data. If you lease land, the landowner&apos;s FSA farm number determines the base acres — they follow the land, not the farmer.</p>
        </div>
      </details>

      <div className="text-xs text-white/20 text-center leading-relaxed pt-1">Base acre data comes from your FSA farm record. OBBBA reference prices effective for 2025-2030 crop years. Payment estimates are projections — consult your FSA office for official calculations.</div>
    </div>
  );
}
