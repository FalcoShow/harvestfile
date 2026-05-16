'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  type FarmProfile,
  type CropEntry,
  type LivestockEntry,
  USDA_PROGRAMS,
  getFBARateForCrop,
  formatCurrencyFull,
} from '@/lib/data/usda-programs';
import { scanForPayments, type ScanResult, type ScanSummary } from '@/lib/engines/payment-hunter';

// ─── Covered commodities for dropdowns ──────────────────────────────────────

const COVERED_COMMODITIES = [
  'Corn', 'Soybeans', 'Wheat', 'Cotton', 'Rice', 'Sorghum',
  'Barley', 'Oats', 'Peanuts', 'Sunflowers', 'Canola',
  'Dry Peas', 'Lentils', 'Chickpeas', 'Safflower',
  'Mustard Seed', 'Sesame', 'Flaxseed', 'Rapeseed',
];

const LIVESTOCK_TYPES = ['Cattle', 'Hogs', 'Sheep', 'Goats', 'Poultry', 'Honeybees', 'Fish'];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

// ─── Urgency badge component ────────────────────────────────────────────────

function UrgencyBadge({ urgency, days }: { urgency: string; days: number | null }) {
  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        Ongoing
      </span>
    );
  }

  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    critical: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      dot: 'bg-red-500 animate-pulse',
      label: `${days}d left — ACT NOW`,
    },
    high: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
      label: `${days} days left`,
    },
    medium: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      dot: 'bg-blue-500',
      label: `${days} days left`,
    },
    low: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      dot: 'bg-emerald-500',
      label: `${days} days left`,
    },
  };

  const c = config[urgency] || config.low;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Program result card ────────────────────────────────────────────────────

function ProgramCard({ result, index }: { result: ScanResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const categoryColors: Record<string, string> = {
    bridge: 'text-emerald-400 bg-emerald-500/10',
    commodity: 'text-blue-400 bg-blue-500/10',
    disaster: 'text-red-400 bg-red-500/10',
    conservation: 'text-green-400 bg-green-500/10',
    livestock: 'text-amber-400 bg-amber-500/10',
    insurance: 'text-purple-400 bg-purple-500/10',
  };

  const catStyle = categoryColors[result.program.category] || 'text-gray-400 bg-gray-500/10';

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 ${
        result.isEligible
          ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
          : 'bg-white/[0.01] border-white/[0.04] opacity-50'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Urgency stripe */}
      {result.urgency === 'critical' && result.isEligible && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500 rounded-t-xl" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${catStyle}`}>
                {result.program.category}
              </span>
              <UrgencyBadge urgency={result.urgency} days={result.daysUntilDeadline} />
            </div>
            <h3 className="text-base font-semibold text-white leading-tight">
              {result.program.name}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({result.program.abbreviation})
              </span>
            </h3>
          </div>

          {/* Payment estimate */}
          {result.isEligible && result.estimatedPayment > 0 && (
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-gray-500 mb-0.5">Est. Payment</div>
              <div className="text-xl font-bold text-emerald-400 tabular-nums">
                {result.estimatedPaymentFormatted}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 leading-relaxed mb-3">
          {result.program.description}
        </p>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            {result.program.totalFunding}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {result.program.coveredCropYears}
          </div>
          {result.program.paymentLimit > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Limit: {formatCurrencyFull(result.program.paymentLimit)}
            </div>
          )}
        </div>

        {/* Action required */}
        <div className={`text-xs font-medium px-3 py-2 rounded-lg mb-3 ${
          result.urgency === 'critical'
            ? 'bg-red-500/10 text-red-400'
            : result.urgency === 'high'
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-white/[0.04] text-gray-400'
        }`}>
          {result.actionRequired}
        </div>

        {/* Eligibility notes (expandable) */}
        {result.eligibilityNotes.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {expanded ? 'Hide' : 'Show'} eligibility details ({result.eligibilityNotes.length})
            </button>

            {expanded && (
              <div className="mt-3 space-y-1.5 pl-4 border-l border-white/[0.06]">
                {result.eligibilityNotes.map((note, i) => (
                  <p key={i} className="text-xs text-gray-400 leading-relaxed">
                    {note}
                  </p>
                ))}
                {result.program.eligibilityCriteria.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.04]">
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5 font-medium">
                      Program Requirements
                    </p>
                    {result.program.eligibilityCriteria.map((crit, i) => (
                      <p key={i} className="text-xs text-gray-500 leading-relaxed">
                        • {crit}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        {result.isEligible && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.04]">
            <a
              href={result.program.enrollmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Apply Now
            </a>
            <a
              href={result.program.factSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] text-gray-400 text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              Learn More
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function PaymentHunterPage() {
  // ── Form state ──────────────────────────────────────────────────────────
  const [state, setState] = useState('Ohio');
  const [county, setCounty] = useState('');
  const [crops, setCrops] = useState<{ commodity: string; acres: string }[]>([
    { commodity: 'Corn', acres: '' },
  ]);
  const [hasLivestock, setHasLivestock] = useState(false);
  const [livestock, setLivestock] = useState<{ type: string; count: string }[]>([]);
  const [baseAcres, setBaseAcres] = useState('');
  const [hasCropInsurance, setHasCropInsurance] = useState(true);
  const [hasDisasterLoss, setHasDisasterLoss] = useState(false);
  const [isDairy, setIsDairy] = useState(false);
  const [dairyLbs, setDairyLbs] = useState('');
  const [isBeginning, setIsBeginning] = useState(false);
  const [isVeteran, setIsVeteran] = useState(false);

  // ── Scan results ────────────────────────────────────────────────────────
  const [scanResults, setScanResults] = useState<ScanSummary | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  // ── Add/remove crop rows ────────────────────────────────────────────────
  const addCrop = useCallback(() => {
    setCrops((prev) => [...prev, { commodity: 'Soybeans', acres: '' }]);
  }, []);

  const removeCrop = useCallback((index: number) => {
    setCrops((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCrop = useCallback((index: number, field: 'commodity' | 'acres', value: string) => {
    setCrops((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }, []);

  // ── Add/remove livestock rows ───────────────────────────────────────────
  const addLivestock = useCallback(() => {
    setLivestock((prev) => [...prev, { type: 'Cattle', count: '' }]);
  }, []);

  const removeLivestock = useCallback((index: number) => {
    setLivestock((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateLivestock = useCallback((index: number, field: 'type' | 'count', value: string) => {
    setLivestock((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }, []);

  // ── Run scan ────────────────────────────────────────────────────────────
  const runScan = useCallback(() => {
    const totalAcres = crops.reduce((sum, c) => sum + (parseFloat(c.acres) || 0), 0);

    const profile: FarmProfile = {
      state,
      county: county || 'Unknown County',
      crops: crops
        .filter((c) => c.acres && parseFloat(c.acres) > 0)
        .map((c) => ({
          commodity: c.commodity,
          acres: parseFloat(c.acres),
          baseAcres: parseFloat(baseAcres) > 0
            ? (parseFloat(baseAcres) / crops.length)
            : parseFloat(c.acres) * 0.85,
          isIrrigated: false,
        })),
      livestock: livestock
        .filter((l) => l.count && parseInt(l.count) > 0)
        .map((l) => ({
          type: l.type,
          headCount: parseInt(l.count),
        })),
      totalAcres,
      baseAcres: parseFloat(baseAcres) || totalAcres * 0.85,
      hasCropInsurance,
      hasNAP: false,
      agi: 500000,
      isBeginningFarmer: isBeginning,
      isVeteran,
      isSociallyDisadvantaged: false,
      isDairyOperation: isDairy,
      dairyProductionLbs: parseFloat(dairyLbs) || 0,
      hasExperiencedDisaster: hasDisasterLoss,
      disasterYear: 2024,
    };

    const results = scanForPayments(profile);
    setScanResults(results);
    setHasScanned(true);
  }, [state, county, crops, livestock, baseAcres, hasCropInsurance, hasDisasterLoss, isDairy, dairyLbs, isBeginning, isVeteran]);

  // ── Live FBA estimate preview ───────────────────────────────────────────
  const fbaPreview = useMemo(() => {
    let total = 0;
    for (const crop of crops) {
      const acres = parseFloat(crop.acres) || 0;
      const rate = getFBARateForCrop(crop.commodity);
      total += acres * rate;
    }
    return Math.min(total, 155000);
  }, [crops]);

  // ── Eligible results only ───────────────────────────────────────────────
  const eligibleResults = scanResults?.results.filter((r) => r.isEligible) || [];
  const ineligibleResults = scanResults?.results.filter((r) => !r.isEligible) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/5 border border-white/[0.08] p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Payment Hunter</h1>
              <p className="text-sm text-gray-400">Find every dollar you&apos;re owed</p>
            </div>
          </div>
          <p className="text-gray-400 max-w-2xl leading-relaxed mb-4">
            Over <span className="text-white font-semibold">$44 billion</span> in government payments are flowing to American farmers in 2026 — and billions more go unclaimed every year. Enter your farm details below and we&apos;ll scan every active USDA program to find payments you may be eligible for.
          </p>

          {/* Countdown alerts */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-400">
                FBA ($12B) closes April 17 — {Math.ceil((new Date('2026-04-17').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-400">
                SDRP ($16B) closes April 30 — {Math.ceil((new Date('2026-04-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Farm Profile Form ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">Your Farm Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter your operation details to scan for eligible programs
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none transition-colors"
              >
                {US_STATES.map((s) => (
                  <option key={s} value={s} className="bg-[#0a0f0d]">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g., Darke County"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Crops */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-400">Crops</label>
              <button
                onClick={addCrop}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                + Add Crop
              </button>
            </div>
            <div className="space-y-2">
              {crops.map((crop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={crop.commodity}
                    onChange={(e) => updateCrop(i, 'commodity', e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                  >
                    {COVERED_COMMODITIES.map((c) => (
                      <option key={c} value={c} className="bg-[#0a0f0d]">{c}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      value={crop.acres}
                      onChange={(e) => updateCrop(i, 'acres', e.target.value)}
                      placeholder="Acres"
                      className="w-28 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                  {crops.length > 1 && (
                    <button
                      onClick={() => removeCrop(i)}
                      className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* FBA live preview */}
            {fbaPreview > 0 && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-xs text-emerald-400">
                  <span className="font-semibold">FBA Quick Estimate:</span> {formatCurrencyFull(fbaPreview)} based on current acreage
                  <span className="text-gray-500 ml-1">(before payment limits)</span>
                </p>
              </div>
            )}
          </div>

          {/* Base acres */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Total Base Acres (for ARC/PLC)
              <span className="text-gray-600 font-normal ml-1">— leave blank if unsure</span>
            </label>
            <input
              type="number"
              value={baseAcres}
              onChange={(e) => setBaseAcres(e.target.value)}
              placeholder="e.g., 500"
              className="w-48 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Toggle row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Livestock toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={hasLivestock}
                onChange={(e) => {
                  setHasLivestock(e.target.checked);
                  if (e.target.checked && livestock.length === 0) {
                    setLivestock([{ type: 'Cattle', count: '' }]);
                  }
                }}
                className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/25 bg-white/[0.04]"
              />
              <span className="text-sm text-gray-300">Livestock operation</span>
            </label>

            {/* Crop insurance toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={hasCropInsurance}
                onChange={(e) => setHasCropInsurance(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/25 bg-white/[0.04]"
              />
              <span className="text-sm text-gray-300">Have crop insurance</span>
            </label>

            {/* Disaster loss toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={hasDisasterLoss}
                onChange={(e) => setHasDisasterLoss(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/25 bg-white/[0.04]"
              />
              <span className="text-sm text-gray-300">Crop loss in 2023/2024</span>
            </label>

            {/* Dairy toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={isDairy}
                onChange={(e) => setIsDairy(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/25 bg-white/[0.04]"
              />
              <span className="text-sm text-gray-300">Dairy operation</span>
            </label>

            {/* Beginning farmer */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={isBeginning}
                onChange={(e) => setIsBeginning(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/25 bg-white/[0.04]"
              />
              <span className="text-sm text-gray-300">Beginning farmer (&lt;10yr)</span>
            </label>

            {/* Veteran */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={isVeteran}
                onChange={(e) => setIsVeteran(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/25 bg-white/[0.04]"
              />
              <span className="text-sm text-gray-300">Veteran farmer</span>
            </label>
          </div>

          {/* Livestock details (conditional) */}
          {hasLivestock && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-gray-400">Livestock</label>
                <button
                  onClick={addLivestock}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  + Add Type
                </button>
              </div>
              <div className="space-y-2">
                {livestock.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={l.type}
                      onChange={(e) => updateLivestock(i, 'type', e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                    >
                      {LIVESTOCK_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-[#0a0f0d]">{t}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={l.count}
                      onChange={(e) => updateLivestock(i, 'count', e.target.value)}
                      placeholder="Head count"
                      className="w-32 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => removeLivestock(i)}
                      className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dairy details (conditional) */}
          {isDairy && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Annual Milk Production (lbs)
              </label>
              <input
                type="number"
                value={dairyLbs}
                onChange={(e) => setDairyLbs(e.target.value)}
                placeholder="e.g., 2000000"
                className="w-48 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Scan button */}
          <button
            onClick={runScan}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 active:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Scan for Eligible Payments
            </span>
          </button>
        </div>
      </div>

      {/* ── Scan Results ─────────────────────────────────────────────────── */}
      {hasScanned && scanResults && (
        <>
          {/* Summary card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs text-gray-400 mb-1">Total Estimated Payments</div>
              <div className="text-3xl font-bold text-emerald-400 tabular-nums">
                {scanResults.totalEstimatedPaymentsFormatted}
              </div>
              <div className="text-xs text-gray-500 mt-1">across eligible programs</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="text-xs text-gray-400 mb-1">Eligible Programs</div>
              <div className="text-3xl font-bold text-white tabular-nums">
                {scanResults.eligibleProgramCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                of {USDA_PROGRAMS.length} programs scanned
              </div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="text-xs text-gray-400 mb-1">Urgent Deadlines</div>
              <div className="text-3xl font-bold text-red-400 tabular-nums">
                {scanResults.criticalDeadlineCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">programs closing within 30 days</div>
            </div>
          </div>

          {/* Profile summary */}
          <div className="text-xs text-gray-500 px-1">
            Scan results for: {scanResults.profileSummary}
          </div>

          {/* Eligible programs */}
          {eligibleResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Eligible Programs ({eligibleResults.length})
              </h3>
              <div className="space-y-3">
                {eligibleResults.map((result, i) => (
                  <ProgramCard key={result.program.id} result={result} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Ineligible programs (collapsed) */}
          {ineligibleResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-600" />
                Not Matched ({ineligibleResults.length})
              </h3>
              <div className="space-y-3">
                {ineligibleResults.map((result, i) => (
                  <ProgramCard key={result.program.id} result={result} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-400">Important:</span> Payment estimates are approximations based on published program rates and the information you provided. Actual eligibility and payment amounts are determined by your local FSA office. This tool is for informational purposes only and does not constitute an application for any program. Always verify eligibility directly with USDA before making financial decisions. Contact your local FSA office or visit{' '}
              <a href="https://www.farmers.gov" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                farmers.gov
              </a>{' '}
              for official program information.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
