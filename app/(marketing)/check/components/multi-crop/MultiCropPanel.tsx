// =============================================================================
// HarvestFile — Build 18 Deploy 5: Multi-Crop Optimization Panel
// app/(marketing)/check/components/multi-crop/MultiCropPanel.tsx
//
// THE KILLER FEATURE. No existing university tool lets farmers optimize
// ARC vs PLC across all crops simultaneously. This does it with one tap.
//
// Architecture:
//   - Pre-populates with the crop the farmer already calculated
//   - Dynamic add/remove crop rows (max 9 — all covered commodities)
//   - "Optimize All Crops" fires Promise.allSettled against existing
//     /api/calculator/estimate endpoint for each crop in parallel
//   - Results: card-per-crop on mobile, table on desktop
//   - Total payment summary with $155K limit warning (OBBBA)
//   - Confidence indicators per crop based on data quality
//
// Per-crop elections are independent (ARC-CO or PLC for each commodity
// on the same FSA farm), which means 2^n combinations for n crops.
// We evaluate each crop independently since cross-crop interactions
// only matter at the payment limit threshold.
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useFarmStore,
  type MultiCropEntry,
  type MultiCropResult,
  CROP_NAMES,
  generateEntryId,
  getMultiCropTotals,
} from '@/lib/stores/farm-store';

// ─── Crop list (matches CheckCalculator) ─────────────────────────────────────

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

const MAX_CROPS = 9;

// ─── Confidence from data quality ────────────────────────────────────────────

function getConfidence(hasCountyData: boolean, dataYears: number): number {
  if (!hasCountyData) return 30;
  if (dataYears >= 7) return 95;
  if (dataYears >= 5) return 85;
  if (dataYears >= 3) return 70;
  return 50;
}

function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 85) return { label: 'High', color: '#16A34A' };
  if (confidence >= 60) return { label: 'Moderate', color: '#D97706' };
  return { label: 'Low', color: '#DC2626' };
}

// ─── Icons ───────────────────────────────────────────────────────────────────

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

function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MultiCropPanelProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  isActive: boolean;
}

export default function MultiCropPanel({
  countyFips,
  countyName,
  stateAbbr,
  isActive,
}: MultiCropPanelProps) {
  // ── Store ─────────────────────────────────────────────────────────────
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
  const setOptimization = useFarmStore((s) => s.setOptimization);
  const setLoading = useFarmStore((s) => s.setLoadingOptimization);
  const setError = useFarmStore((s) => s.setOptimizationError);
  const setCacheKey = useFarmStore((s) => s.setOptimizationCacheKey);

  const hasInitialized = useRef(false);

  // ── Initialize with current calculator crop ───────────────────────────
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!isActive) return;
    if (entries.length > 0) return; // already has entries

    hasInitialized.current = true;

    // Pre-populate with the crop the farmer already calculated
    if (inputs.cropCode && inputs.acres) {
      const name = CROP_NAMES[inputs.cropCode] || inputs.cropCode;
      setEntries([
        {
          id: generateEntryId(),
          cropCode: inputs.cropCode,
          cropName: name,
          acres: inputs.acres,
        },
      ]);
    }
  }, [isActive, inputs.cropCode, inputs.acres, entries.length, setEntries]);

  // ── Get crops already in the list (for disabling in dropdown) ──────────
  const usedCrops = new Set(entries.map((e) => e.cropCode));

  // ── Add crop handler ──────────────────────────────────────────────────
  const handleAddCrop = useCallback(() => {
    if (entries.length >= MAX_CROPS) return;

    // Find first unused crop
    const availableCrop = AVAILABLE_CROPS.find((c) => !usedCrops.has(c.code));
    if (!availableCrop) return;

    addEntry({
      id: generateEntryId(),
      cropCode: availableCrop.code,
      cropName: availableCrop.name,
      acres: '',
    });
  }, [entries.length, usedCrops, addEntry]);

  // ── Run optimization ──────────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    // Validate entries
    const validEntries = entries.filter(
      (e) => e.cropCode && e.acres && parseInt(e.acres.replace(/,/g, '')) > 0
    );

    if (validEntries.length === 0) {
      setError('Please add at least one crop with base acres to optimize.');
      return;
    }

    if (!countyFips) {
      setError('County data is required for optimization.');
      return;
    }

    // Check cache — skip if same data
    const newCacheKey = validEntries
      .map((e) => `${e.cropCode}:${e.acres}`)
      .sort()
      .join('|') + `@${countyFips}`;

    if (newCacheKey === cacheKey && results) return;

    setLoading(true);
    setError(null);
    setOptimization(null);

    try {
      // Fire all estimate requests in parallel
      const promises = validEntries.map((entry) => {
        const acresNum = parseInt(entry.acres.replace(/,/g, '')) || 0;
        const url = `/api/calculator/estimate?county_fips=${countyFips}&crop=${entry.cropCode}&acres=${acresNum}`;
        return fetch(url).then((res) => res.json());
      });

      const settled = await Promise.allSettled(promises);

      const cropResults: MultiCropResult[] = [];

      settled.forEach((result, index) => {
        const entry = validEntries[index];
        const acresNum = parseInt(entry.acres.replace(/,/g, '')) || 0;

        if (result.status === 'fulfilled' && result.value) {
          const data = result.value;
          const hasCountyData = data.hasCountyData === true;

          if (hasCountyData) {
            const confidence = getConfidence(true, data.dataYears || 0);
            cropResults.push({
              cropCode: entry.cropCode,
              cropName: entry.cropName,
              acres: acresNum,
              recommended: data.best || 'PLC',
              arcPerAcre: data.arcPerAcre || 0,
              plcPerAcre: data.plcPerAcre || 0,
              arcTotal: data.arc || 0,
              plcTotal: data.plc || 0,
              advantage: data.diff || 0,
              advantagePerAcre: data.diffPerAcre || 0,
              confidence,
              hasCountyData: true,
              dataYears: data.dataYears || 0,
            });
          } else {
            // No county data — show as low confidence
            cropResults.push({
              cropCode: entry.cropCode,
              cropName: entry.cropName,
              acres: acresNum,
              recommended: 'PLC',
              arcPerAcre: 0,
              plcPerAcre: 0,
              arcTotal: 0,
              plcTotal: 0,
              advantage: 0,
              advantagePerAcre: 0,
              confidence: getConfidence(false, 0),
              hasCountyData: false,
              dataYears: 0,
            });
          }
        } else {
          // Request failed
          cropResults.push({
            cropCode: entry.cropCode,
            cropName: entry.cropName,
            acres: acresNum,
            recommended: 'PLC',
            arcPerAcre: 0,
            plcPerAcre: 0,
            arcTotal: 0,
            plcTotal: 0,
            advantage: 0,
            advantagePerAcre: 0,
            confidence: 0,
            hasCountyData: false,
            dataYears: 0,
          });
        }
      });

      setOptimization(cropResults);
      setCacheKey(newCacheKey);
    } catch (err) {
      console.error('Multi-crop optimization error:', err);
      setError('Failed to run optimization. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [entries, countyFips, cacheKey, results, setLoading, setError, setOptimization, setCacheKey]);

  // ── Computed totals ───────────────────────────────────────────────────
  const totals = results ? getMultiCropTotals(results) : null;
  const validEntryCount = entries.filter(
    (e) => e.cropCode && e.acres && parseInt(e.acres.replace(/,/g, '')) > 0
  ).length;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="text-center space-y-2 py-2">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Multi-Crop Election Strategy
        </h3>
        <p className="text-sm text-white/40 max-w-[520px] mx-auto leading-relaxed">
          Add all your crops below to see the optimal ARC-CO or PLC election for each commodity simultaneously.
          Under OBBBA, elections are made per-crop — you can elect differently for each.
        </p>
      </div>

      {/* ── County Context Bar ──────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm"
        style={{
          background: 'rgba(201, 168, 76, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.1)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="text-white/50">
          Analyzing for <strong className="text-white/70">{countyName}, {stateAbbr}</strong>
        </span>
      </div>

      {/* ── Crop Entry Rows ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <CropEntryRow
            key={entry.id}
            entry={entry}
            index={index}
            usedCrops={usedCrops}
            canRemove={entries.length > 1}
            onUpdate={(partial) => updateEntry(entry.id, partial)}
            onRemove={() => removeEntry(entry.id)}
          />
        ))}

        {/* Add Crop Button */}
        {entries.length < MAX_CROPS && (
          <button
            onClick={handleAddCrop}
            className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 py-3
                       rounded-xl text-sm font-semibold
                       transition-all duration-150
                       active:scale-[0.98] active:duration-75"
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

      {/* ── Optimize Button ─────────────────────────────────────────── */}
      <button
        onClick={handleOptimize}
        disabled={loading || validEntryCount === 0}
        className="flex items-center justify-center gap-2.5 w-full min-h-[56px] p-4
                   rounded-[14px] text-[15px] sm:text-base font-bold
                   transition-all duration-200
                   hover:-translate-y-0.5 active:scale-[0.98] active:duration-75
                   disabled:opacity-40 disabled:pointer-events-none disabled:translate-y-0"
        style={{
          background: loading
            ? 'rgba(201, 168, 76, 0.15)'
            : 'linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)',
          color: loading ? '#C9A84C' : '#0C1F17',
          boxShadow: loading ? 'none' : '0 6px 28px rgba(201, 168, 76, 0.2)',
        }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
            Analyzing {validEntryCount} crops...
          </>
        ) : (
          <>
            <IconZap />
            Optimize All {validEntryCount > 1 ? `${validEntryCount} Crops` : 'Crops'}
          </>
        )}
      </button>

      {/* ── Error Message ───────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-sm"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: '#FCA5A5',
          }}
        >
          <IconAlertTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {results && results.length > 0 && (
        <div className="space-y-5">
          {/* ── Total Summary Card ──────────────────────────────────── */}
          {totals && (
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.06), rgba(201, 168, 76, 0.02))',
                border: '1px solid rgba(201, 168, 76, 0.15)',
              }}
            >
              <div className="text-center space-y-3">
                <div className="text-xs font-bold text-[#C9A84C]/60 uppercase tracking-wider">
                  Optimized Total Estimated Payment
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                  ${totals.totalOptimal.toLocaleString()}
                </div>
                {totals.savings > 0 && (
                  <div className="text-sm text-emerald-400/80">
                    Saves ${totals.savings.toLocaleString()} vs choosing the same program for all crops
                  </div>
                )}

                {/* Payment Limit Warning */}
                {totals.approachingLimit && (
                  <div
                    className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: totals.exceedsLimit
                        ? 'rgba(220, 38, 38, 0.1)'
                        : 'rgba(217, 119, 6, 0.1)',
                      border: `1px solid ${
                        totals.exceedsLimit
                          ? 'rgba(220, 38, 38, 0.3)'
                          : 'rgba(217, 119, 6, 0.3)'
                      }`,
                      color: totals.exceedsLimit ? '#FCA5A5' : '#FCD34D',
                    }}
                  >
                    <IconAlertTriangle />
                    {totals.exceedsLimit
                      ? `Total exceeds $${totals.paymentLimit.toLocaleString()} OBBBA payment limit per person`
                      : `Approaching $${totals.paymentLimit.toLocaleString()} OBBBA payment limit per person`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Per-Crop Result Cards ───────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <CropResultCard key={r.cropCode} result={r} />
            ))}
          </div>

          {/* ── Methodology Footnote ────────────────────────────────── */}
          <div className="text-xs text-white/20 text-center leading-relaxed space-y-1 pt-2">
            <p>
              Estimates use OBBBA (2025 Farm Bill) rules: 90% ARC-CO guarantee, 88% PLC escalator,
              85% payment acres, 5.7% sequestration. Per-crop elections are independent.
            </p>
            <p>
              Projections based on {countyName} USDA NASS historical data. Actual payments depend on
              final MYA prices and official county yields. Consult your FSA office before making elections.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state (no results yet, tab just opened) ─────────── */}
      {!results && !loading && !error && entries.length > 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-white/30">
            Add your crops above and tap <strong className="text-[#C9A84C]/60">Optimize All Crops</strong> to see recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Crop Entry Row ──────────────────────────────────────────────────────────

interface CropEntryRowProps {
  entry: MultiCropEntry;
  index: number;
  usedCrops: Set<string>;
  canRemove: boolean;
  onUpdate: (partial: Partial<MultiCropEntry>) => void;
  onRemove: () => void;
}

function CropEntryRow({ entry, index, usedCrops, canRemove, onUpdate, onRemove }: CropEntryRowProps) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Crop number */}
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
        style={{
          background: 'rgba(201, 168, 76, 0.1)',
          color: '#C9A84C',
        }}
      >
        {index + 1}
      </div>

      {/* Crop dropdown */}
      <select
        value={entry.cropCode}
        onChange={(e) => {
          const crop = AVAILABLE_CROPS.find((c) => c.code === e.target.value);
          if (crop) {
            onUpdate({ cropCode: crop.code, cropName: crop.name });
          }
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

      {/* Acres input */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="Acres"
        value={entry.acres}
        onChange={(e) => {
          // Allow numbers and commas only
          const val = e.target.value.replace(/[^0-9,]/g, '');
          onUpdate({ acres: val });
        }}
        className="min-h-[48px] w-24 sm:w-28 rounded-lg border border-white/10 bg-white/[0.04]
                   px-3 py-2 text-sm text-white text-right tabular-nums
                   placeholder:text-white/20
                   focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
      />

      {/* Remove button */}
      {canRemove ? (
        <button
          onClick={onRemove}
          className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center
                     rounded-lg transition-colors duration-150
                     text-white/20 hover:text-red-400/80 hover:bg-red-400/10
                     active:scale-95 active:duration-75"
          aria-label={`Remove ${entry.cropName}`}
        >
          <IconTrash />
        </button>
      ) : (
        <div className="shrink-0 w-9" /> // Spacer to maintain alignment
      )}
    </div>
  );
}

// ─── Crop Result Card ────────────────────────────────────────────────────────

interface CropResultCardProps {
  result: MultiCropResult;
}

function CropResultCard({ result }: CropResultCardProps) {
  const conf = getConfidenceLabel(result.confidence);
  const isArc = result.recommended === 'ARC-CO';

  return (
    <div
      className="rounded-xl p-4 sm:p-5 space-y-4"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${isArc ? 'rgba(45, 212, 191, 0.15)' : 'rgba(201, 168, 76, 0.15)'}`,
      }}
    >
      {/* Header: Crop + Recommendation */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-white">{result.cropName}</div>
          <div className="text-xs text-white/40 mt-0.5">
            {result.acres.toLocaleString()} base acres
          </div>
        </div>
        <div
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{
            background: isArc ? 'rgba(45, 212, 191, 0.12)' : 'rgba(201, 168, 76, 0.12)',
            color: isArc ? '#2DD4BF' : '#C9A84C',
            border: `1px solid ${isArc ? 'rgba(45, 212, 191, 0.25)' : 'rgba(201, 168, 76, 0.25)'}`,
          }}
        >
          {result.recommended}
        </div>
      </div>

      {/* Payment Comparison */}
      {result.hasCountyData ? (
        <div className="space-y-2">
          {/* ARC-CO row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#2DD4BF]/70">ARC-CO</span>
            <span className="font-semibold text-white/70 tabular-nums">
              ${result.arcPerAcre.toFixed(2)}/ac · ${result.arcTotal.toLocaleString()}
            </span>
          </div>
          {/* PLC row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#C9A84C]/70">PLC</span>
            <span className="font-semibold text-white/70 tabular-nums">
              ${result.plcPerAcre.toFixed(2)}/ac · ${result.plcTotal.toLocaleString()}
            </span>
          </div>
          {/* Advantage */}
          <div
            className="flex items-center justify-between text-sm pt-2 mt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-white/50">Advantage</span>
            <span className="font-bold text-emerald-400 tabular-nums">
              +${result.advantage.toLocaleString()} ({result.recommended})
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-white/30 text-center py-2">
          Insufficient county data for {result.cropName} projection.
          Estimate not available.
        </div>
      )}

      {/* Confidence Badge */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{
            background: `${conf.color}15`,
            color: conf.color,
            border: `1px solid ${conf.color}30`,
          }}
        >
          {result.confidence >= 85 ? <IconCheck /> : null}
          {conf.label} Confidence
        </div>
        {result.hasCountyData && (
          <span className="text-[10px] text-white/20">
            {result.dataYears}yr data
          </span>
        )}
      </div>
    </div>
  );
}
