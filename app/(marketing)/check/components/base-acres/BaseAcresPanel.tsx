// =============================================================================
// HarvestFile — Build 18 Deploy 5: Base Acre Analysis Panel
// app/(marketing)/check/components/base-acres/BaseAcresPanel.tsx
//
// THE EDUCATIONAL POWERHOUSE. Most farmers don't fully understand how base
// acres drive their ARC/PLC payments. This tab makes it crystal clear with
// an interactive calculator and plain-language explanations.
//
// Three sections:
//   1. Base Acre Calculator — enter base acres + PLC yield per crop,
//      see payment acres (×0.85) and estimated payment under each program
//   2. OBBBA New Base Acre Estimator — enter 2019-2023 planting data,
//      estimate eligibility for the 30 million new base acres
//   3. Educational Content — explains decoupling, payment acres, and
//      how base acres differ from planted acres
//
// All calculations are CLIENT-SIDE. No API calls needed.
// Uses OBBBA reference prices and current estimate API data from
// the Comparison tab's result.
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useFarmStore,
  type BaseAcreEntry,
  OBBBA_REFERENCE_PRICES,
  CROP_NAMES,
  generateEntryId,
} from '@/lib/stores/farm-store';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAYMENT_ACRES_FACTOR = 0.85;
const SEQUESTRATION_RATE = 0.057;
const NATIONAL_CAP_ACRES = 30_000_000;
// Estimated eligible acres nationally (~38.7M), used for pro-rata
const ESTIMATED_ELIGIBLE_ACRES = 38_700_000;

const AVAILABLE_CROPS = [
  { code: 'CORN', name: 'Corn' },
  { code: 'SOYBEANS', name: 'Soybeans' },
  { code: 'WHEAT', name: 'Wheat' },
  { code: 'SORGHUM', name: 'Sorghum' },
  { code: 'BARLEY', name: 'Barley' },
  { code: 'OATS', name: 'Oats' },
  { code: 'RICE', name: 'Rice' },
  { code: 'PEANUTS', name: 'Peanuts' },
  { code: 'COTTON', name: 'Cotton' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="8" y2="18" />
      <line x1="12" y1="18" x2="16" y2="18" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface BaseAcresPanelProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  isActive: boolean;
}

export default function BaseAcresPanel({
  countyFips,
  countyName,
  stateAbbr,
  isActive,
}: BaseAcresPanelProps) {
  // ── Store ─────────────────────────────────────────────────────────────
  const inputs = useFarmStore((s) => s.inputs);
  const comparison = useFarmStore((s) => s.comparison);
  const entries = useFarmStore((s) => s.baseAcreEntries);
  const setEntries = useFarmStore((s) => s.setBaseAcreEntries);
  const addEntry = useFarmStore((s) => s.addBaseAcreEntry);
  const removeEntry = useFarmStore((s) => s.removeBaseAcreEntry);
  const updateEntry = useFarmStore((s) => s.updateBaseAcreEntry);

  const [showOBBBA, setShowOBBBA] = useState(false);
  const [totalFarmAcres, setTotalFarmAcres] = useState('');
  const hasInitialized = useRef(false);

  // ── Initialize with current crop ──────────────────────────────────────
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!isActive) return;
    if (entries.length > 0) return;

    hasInitialized.current = true;

    if (inputs.cropCode && inputs.acres) {
      const name = CROP_NAMES[inputs.cropCode] || inputs.cropCode;
      setEntries([
        {
          id: generateEntryId(),
          cropCode: inputs.cropCode,
          cropName: name,
          baseAcres: inputs.acres,
          plcYield: '',
          plantedAcres: inputs.acres,
        },
      ]);
    }
  }, [isActive, inputs.cropCode, inputs.acres, entries.length, setEntries]);

  const usedCrops = new Set(entries.map((e) => e.cropCode));

  // ── Add entry ─────────────────────────────────────────────────────────
  const handleAddEntry = useCallback(() => {
    if (entries.length >= 9) return;
    const availableCrop = AVAILABLE_CROPS.find((c) => !usedCrops.has(c.code));
    if (!availableCrop) return;

    addEntry({
      id: generateEntryId(),
      cropCode: availableCrop.code,
      cropName: availableCrop.name,
      baseAcres: '',
      plcYield: '',
      plantedAcres: '',
    });
  }, [entries.length, usedCrops, addEntry]);

  // ── Compute base acre analysis ────────────────────────────────────────
  const analysis = entries.map((entry) => {
    const baseAcres = parseInt(entry.baseAcres.replace(/,/g, '')) || 0;
    const paymentAcres = Math.round(baseAcres * PAYMENT_ACRES_FACTOR);
    const plcYield = parseFloat(entry.plcYield) || 0;
    const refPrice = OBBBA_REFERENCE_PRICES[entry.cropCode];

    // Rough PLC estimate: if MYA is below ref price, payment triggers
    // Use comparison data if available for current crop
    let estimatedPlcPerAcre = 0;
    let estimatedArcPerAcre = 0;

    if (comparison && inputs.cropCode === entry.cropCode) {
      estimatedArcPerAcre = comparison.arcPerAcre || 0;
      estimatedPlcPerAcre = comparison.plcPerAcre || 0;
    }

    const estimatedArcTotal = Math.round(estimatedArcPerAcre * paymentAcres * (1 - SEQUESTRATION_RATE));
    const estimatedPlcTotal = Math.round(estimatedPlcPerAcre * paymentAcres * (1 - SEQUESTRATION_RATE));

    return {
      ...entry,
      baseAcresNum: baseAcres,
      paymentAcres,
      refPrice: refPrice?.price || 0,
      refUnit: refPrice?.unit || '',
      estimatedArcPerAcre,
      estimatedPlcPerAcre,
      estimatedArcTotal,
      estimatedPlcTotal,
      hasEstimate: estimatedArcPerAcre > 0 || estimatedPlcPerAcre > 0,
    };
  });

  const totalBaseAcres = analysis.reduce((sum, a) => sum + a.baseAcresNum, 0);
  const totalPaymentAcres = analysis.reduce((sum, a) => sum + a.paymentAcres, 0);

  // ── OBBBA new base calculation ────────────────────────────────────────
  const totalPlantedAvg = entries.reduce(
    (sum, e) => sum + (parseInt(e.plantedAcres.replace(/,/g, '')) || 0),
    0
  );
  const totalFarmAcresNum = parseInt(totalFarmAcres.replace(/,/g, '')) || 0;
  const nonCoveredAllowance = Math.min(totalFarmAcresNum * 0.15, 0); // simplified
  const updatedBaseAcres = totalPlantedAvg + nonCoveredAllowance;
  const newBaseEligible = Math.max(0, updatedBaseAcres - totalBaseAcres);
  // Pro-rata reduction estimate
  const proRataFactor = Math.min(1, NATIONAL_CAP_ACRES / ESTIMATED_ELIGIBLE_ACRES);
  const estimatedNewBase = Math.round(newBaseEligible * proRataFactor);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="text-center space-y-2 py-2">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Base Acre Analysis
        </h3>
        <p className="text-sm text-white/40 max-w-[520px] mx-auto leading-relaxed">
          Your base acres are the foundation of every ARC and PLC payment. Enter your base acres below
          to see exactly how they translate into payment dollars.
        </p>
      </div>

      {/* ── Key Concept Card ────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 sm:p-5"
        style={{
          background: 'rgba(45, 212, 191, 0.03)',
          border: '1px solid rgba(45, 212, 191, 0.1)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-[#2DD4BF]/60"><IconInfo /></div>
          <div className="text-sm text-white/50 leading-relaxed">
            <strong className="text-white/70">Base acres ≠ planted acres.</strong> Base acres are historical
            crop-specific acreages permanently tied to your FSA farm number. You receive ARC/PLC payments on
            <strong className="text-[#C9A84C]"> 85% of your base acres</strong> — regardless of what you
            actually plant. This &ldquo;decoupling&rdquo; means you can plant soybeans on corn base acres and
            still receive corn program payments if triggered.
          </div>
        </div>
      </div>

      {/* ── Base Acre Entry Rows ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Your Base Acres</span>
          <span className="text-xs text-white/20">From FSA-156EZ farm record</span>
        </div>

        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="p-3 sm:p-4 rounded-xl space-y-3"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Number badge */}
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(201, 168, 76, 0.1)', color: '#C9A84C' }}
              >
                {index + 1}
              </div>

              {/* Crop */}
              <select
                value={entry.cropCode}
                onChange={(e) => {
                  const crop = AVAILABLE_CROPS.find((c) => c.code === e.target.value);
                  if (crop) updateEntry(entry.id, { cropCode: crop.code, cropName: crop.name });
                }}
                className="min-h-[48px] flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.04]
                           px-3 py-2 text-sm text-white
                           focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]
                           appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84C' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                {AVAILABLE_CROPS.map((crop) => (
                  <option
                    key={crop.code}
                    value={crop.code}
                    disabled={usedCrops.has(crop.code) && crop.code !== entry.cropCode}
                  >
                    {crop.name}
                  </option>
                ))}
              </select>

              {/* Remove */}
              {entries.length > 1 ? (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center
                             rounded-lg text-white/20 hover:text-red-400/80 hover:bg-red-400/10
                             transition-colors active:scale-95"
                  aria-label={`Remove ${entry.cropName}`}
                >
                  <IconTrash />
                </button>
              ) : (
                <div className="w-9" />
              )}
            </div>

            {/* Base acres + PLC yield inputs */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-[11px] text-white/30 font-medium mb-1 px-1">Base Acres</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  value={entry.baseAcres}
                  onChange={(e) => updateEntry(entry.id, { baseAcres: e.target.value.replace(/[^0-9,]/g, '') })}
                  className="w-full min-h-[48px] rounded-lg border border-white/10 bg-white/[0.04]
                             px-3 py-2 text-sm text-white text-right tabular-nums
                             placeholder:text-white/20
                             focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 font-medium mb-1 px-1">PLC Yield ({OBBBA_REFERENCE_PRICES[entry.cropCode]?.unit?.replace('$/', '') || 'bu/ac'})</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 175"
                  value={entry.plcYield}
                  onChange={(e) => updateEntry(entry.id, { plcYield: e.target.value.replace(/[^0-9.]/g, '') })}
                  className="w-full min-h-[48px] rounded-lg border border-white/10 bg-white/[0.04]
                             px-3 py-2 text-sm text-white text-right tabular-nums
                             placeholder:text-white/20
                             focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                />
              </div>
            </div>

            {/* Computed: Payment acres + reference price */}
            {(parseInt(entry.baseAcres.replace(/,/g, '')) || 0) > 0 && (
              <div className="flex items-center gap-4 text-xs text-white/30 px-1">
                <span>
                  Payment acres: <strong className="text-[#C9A84C]/70">
                    {Math.round((parseInt(entry.baseAcres.replace(/,/g, '')) || 0) * 0.85).toLocaleString()}
                  </strong> (85%)
                </span>
                {OBBBA_REFERENCE_PRICES[entry.cropCode] && (
                  <span>
                    Ref price: <strong className="text-white/50">
                      {OBBBA_REFERENCE_PRICES[entry.cropCode].price} {OBBBA_REFERENCE_PRICES[entry.cropCode].unit}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add button */}
        {entries.length < 9 && (
          <button
            onClick={handleAddEntry}
            className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 py-3
                       rounded-xl text-sm font-semibold transition-all duration-150
                       active:scale-[0.98]"
            style={{
              color: '#C9A84C',
              border: '2px dashed rgba(201, 168, 76, 0.25)',
              background: 'rgba(201, 168, 76, 0.03)',
            }}
          >
            <IconPlus />
            Add Another Crop
          </button>
        )}
      </div>

      {/* ── Summary Card ────────────────────────────────────────────── */}
      {totalBaseAcres > 0 && (
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.06), rgba(201, 168, 76, 0.02))',
            border: '1px solid rgba(201, 168, 76, 0.15)',
          }}
        >
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">Total Base Acres</div>
              <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {totalBaseAcres.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-[#C9A84C]/50 uppercase tracking-wider mb-1">Payment Acres (85%)</div>
              <div className="text-2xl sm:text-3xl font-black text-[#C9A84C] tabular-nums">
                {totalPaymentAcres.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Per-crop estimate table (if comparison data exists) */}
          {analysis.some((a) => a.hasEstimate) && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">
                Estimated Payments (Using Comparison Data)
              </div>
              {analysis.filter((a) => a.hasEstimate).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">{a.cropName}</span>
                  <div className="flex gap-4 tabular-nums">
                    <span className="text-[#2DD4BF]/70">ARC: ${a.estimatedArcTotal.toLocaleString()}</span>
                    <span className="text-[#C9A84C]/70">PLC: ${a.estimatedPlcTotal.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OBBBA New Base Acres Section ─────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          onClick={() => setShowOBBBA(!showOBBBA)}
          className="flex items-center justify-between w-full p-4 sm:p-5
                     text-left transition-colors hover:bg-white/[0.02]"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(45, 212, 191, 0.08)' }}
            >
              <IconCalculator />
            </div>
            <div>
              <div className="text-sm font-semibold text-white/80">
                OBBBA New Base Acre Estimator
              </div>
              <div className="text-xs text-white/30 mt-0.5">
                Up to 30 million new base acres nationwide for 2026
              </div>
            </div>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${showOBBBA ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showOBBBA && (
          <div className="p-4 sm:p-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Explanation */}
            <div className="text-sm text-white/40 leading-relaxed">
              The OBBBA authorizes up to 30 million new base acres for the 2026 crop year. Your farm
              qualifies if a covered commodity was planted in at least one year during 2019-2023 and your
              updated base exceeds current base acres.
            </div>

            {/* Planted acres inputs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-white/30 uppercase tracking-wider">
                2019-2023 Average Planted Acres Per Crop
              </label>
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-sm text-white/50 min-w-[80px]">{entry.cropName}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Avg acres"
                    value={entry.plantedAcres}
                    onChange={(e) => updateEntry(entry.id, { plantedAcres: e.target.value.replace(/[^0-9,]/g, '') })}
                    className="flex-1 min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04]
                               px-3 py-2 text-sm text-white text-right tabular-nums
                               placeholder:text-white/20
                               focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]"
                  />
                </div>
              ))}
            </div>

            {/* Total farm acres */}
            <div>
              <label className="block text-xs font-bold text-white/30 uppercase tracking-wider mb-2">
                Total Farm Acres (all land)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1200"
                value={totalFarmAcres}
                onChange={(e) => setTotalFarmAcres(e.target.value.replace(/[^0-9,]/g, ''))}
                className="w-full min-h-[48px] rounded-lg border border-white/10 bg-white/[0.04]
                           px-3 py-2 text-sm text-white text-right tabular-nums
                           placeholder:text-white/20
                           focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]"
              />
            </div>

            {/* Result */}
            {totalPlantedAvg > 0 && totalBaseAcres > 0 && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: estimatedNewBase > 0
                    ? 'rgba(45, 212, 191, 0.06)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    estimatedNewBase > 0
                      ? 'rgba(45, 212, 191, 0.15)'
                      : 'rgba(255, 255, 255, 0.06)'
                  }`,
                }}
              >
                {estimatedNewBase > 0 ? (
                  <div className="text-center space-y-2">
                    <div className="text-xs font-bold text-[#2DD4BF]/60 uppercase tracking-wider">
                      Estimated New Base Acres (After Pro-Rata)
                    </div>
                    <div className="text-2xl font-black text-[#2DD4BF] tabular-nums">
                      +{estimatedNewBase.toLocaleString()} acres
                    </div>
                    <div className="text-xs text-white/30">
                      Based on {Math.round(proRataFactor * 100)}% pro-rata factor
                      ({(NATIONAL_CAP_ACRES / 1_000_000).toFixed(0)}M cap ÷ ~{(ESTIMATED_ELIGIBLE_ACRES / 1_000_000).toFixed(1)}M eligible)
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-white/40">
                    Based on the data entered, your farm may not be eligible for additional base acres
                    under OBBBA (current base already covers your average plantings).
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-[11px] text-white/20 italic leading-relaxed">
              This is a rough estimate. Actual new base acre allocations will be determined by FSA based on
              certified planting records and may differ. The pro-rata reduction depends on total national
              eligibility. Contact your local FSA office for official calculations.
            </div>
          </div>
        )}
      </div>

      {/* ── Educational Footer ──────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <details className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer text-[13px] font-semibold text-white/50 hover:text-white/70 transition-colors list-none [&::-webkit-details-marker]:hidden">
            How do base acres affect payments?
            <svg className="w-4 h-4 text-white/20 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </summary>
          <div className="px-4 pb-4 text-sm text-white/40 leading-relaxed space-y-3">
            <p>
              Both ARC-CO and PLC use <strong className="text-white/60">85% of your base acres</strong> as
              &ldquo;payment acres.&rdquo; This means if you have 1,000 base acres, only 850 acres generate
              payments. This 85% factor was set by Congress and applies equally to both programs.
            </p>
            <p>
              <strong className="text-[#2DD4BF]/70">ARC-CO</strong> pays when actual county revenue falls
              below 90% of the benchmark. The payment is capped at 12% of benchmark revenue per base acre.
              ARC-CO protects against both price drops and yield losses at the county level.
            </p>
            <p>
              <strong className="text-[#C9A84C]/70">PLC</strong> pays when the national Marketing Year Average
              (MYA) price falls below the effective reference price. The payment rate is multiplied by your
              farm&apos;s specific PLC yield. PLC protects against price drops only.
            </p>
            <p>
              After the payment rate is calculated, a 5.7% sequestration reduction is applied to the final
              payment amount per the Budget Control Act.
            </p>
          </div>
        </details>

        <details className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer text-[13px] font-semibold text-white/50 hover:text-white/70 transition-colors list-none [&::-webkit-details-marker]:hidden">
            Where do I find my base acres?
            <svg className="w-4 h-4 text-white/20 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </summary>
          <div className="px-4 pb-4 text-sm text-white/40 leading-relaxed space-y-3">
            <p>
              Your base acres are listed on the <strong className="text-white/60">FSA-156EZ</strong> (Abbreviated
              Farm Record). You can access this through your account at{' '}
              <strong className="text-white/60">farmers.gov</strong> or request it from your local FSA county office.
            </p>
            <p>
              The farm record shows base acres by commodity, PLC payment yields, total cropland,
              CRP acres, and other program eligibility data. If you lease land, the landowner&apos;s
              FSA farm number determines the base acres — they follow the land, not the farmer.
            </p>
          </div>
        </details>
      </div>

      {/* ── Methodology Note ────────────────────────────────────────── */}
      <div className="text-xs text-white/20 text-center leading-relaxed pt-1">
        Base acre data comes from your FSA farm record. OBBBA reference prices effective for 2025-2030
        crop years. Payment estimates are projections — consult your FSA office for official calculations.
      </div>
    </div>
  );
}
