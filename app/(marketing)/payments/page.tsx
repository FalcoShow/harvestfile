'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getFBARateForCrop,
  formatCurrencyFull,
  USDA_PROGRAMS,
} from '@/lib/data/usda-programs';
import { quickScan, type QuickScanInput, type ScanResult, type ScanSummary } from '@/lib/engines/payment-hunter';

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Urgency badge ──────────────────────────────────────────────────────────

function UrgencyBadge({ urgency, days }: { urgency: string; days: number | null }) {
  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Ongoing
      </span>
    );
  }

  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500 animate-pulse',
      label: `${days}d left — ACT NOW`,
    },
    high: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: `${days} days left`,
    },
    medium: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      label: `${days} days left`,
    },
    low: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      dot: 'bg-green-500',
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

// ─── Program card (light theme) ─────────────────────────────────────────────

function ProgramCard({ result, index }: { result: ScanResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const categoryColors: Record<string, string> = {
    bridge: 'text-emerald-700 bg-emerald-50',
    commodity: 'text-blue-700 bg-blue-50',
    disaster: 'text-red-700 bg-red-50',
    conservation: 'text-green-700 bg-green-50',
    livestock: 'text-amber-700 bg-amber-50',
    insurance: 'text-purple-700 bg-purple-50',
  };

  const catStyle = categoryColors[result.program.category] || 'text-gray-700 bg-gray-50';

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 ${
        result.isEligible
          ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
          : 'bg-gray-50/50 border-gray-100 opacity-60'
      }`}
    >
      {result.urgency === 'critical' && result.isEligible && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500 rounded-t-xl" />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${catStyle}`}>
                {result.program.category}
              </span>
              <UrgencyBadge urgency={result.urgency} days={result.daysUntilDeadline} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {result.program.name}
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({result.program.abbreviation})
              </span>
            </h3>
          </div>

          {result.isEligible && result.estimatedPayment > 0 && (
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-gray-400 mb-0.5">Est. Payment</div>
              <div className="text-xl font-bold text-emerald-600 tabular-nums">
                {result.estimatedPaymentFormatted}
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-3">
          {result.program.description}
        </p>

        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            {result.program.totalFunding}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {result.program.coveredCropYears}
          </div>
        </div>

        <div className={`text-xs font-medium px-3 py-2 rounded-lg mb-3 ${
          result.urgency === 'critical'
            ? 'bg-red-50 text-red-700'
            : result.urgency === 'high'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-gray-50 text-gray-500'
        }`}>
          {result.actionRequired}
        </div>

        {result.eligibilityNotes.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {expanded ? 'Hide' : 'Show'} eligibility details ({result.eligibilityNotes.length})
            </button>

            {expanded && (
              <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-gray-100">
                {result.eligibilityNotes.map((note, i) => (
                  <p key={i} className="text-xs text-gray-500 leading-relaxed">{note}</p>
                ))}
              </div>
            )}
          </>
        )}

        {result.isEligible && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <a
              href={result.program.enrollmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              Apply Now
            </a>
            <a
              href={result.program.factSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Learn More
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Public Payment Scanner Page ───────────────────────────────────────

export default function PublicPaymentScanner() {
  const [state, setState] = useState('Ohio');
  const [county, setCounty] = useState('');
  const [crops, setCrops] = useState<{ commodity: string; acres: string }[]>([
    { commodity: 'Corn', acres: '' },
  ]);
  const [hasLivestock, setHasLivestock] = useState(false);
  const [livestockType, setLivestockType] = useState('Cattle');
  const [livestockCount, setLivestockCount] = useState('');
  const [hasCropInsurance, setHasCropInsurance] = useState(true);
  const [hasDisasterLoss, setHasDisasterLoss] = useState(false);

  const [scanResults, setScanResults] = useState<ScanSummary | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const addCrop = useCallback(() => {
    setCrops((prev) => [...prev, { commodity: 'Soybeans', acres: '' }]);
  }, []);

  const removeCrop = useCallback((index: number) => {
    setCrops((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCrop = useCallback((index: number, field: 'commodity' | 'acres', value: string) => {
    setCrops((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }, []);

  const fbaPreview = useMemo(() => {
    let total = 0;
    for (const crop of crops) {
      const acres = parseFloat(crop.acres) || 0;
      const rate = getFBARateForCrop(crop.commodity);
      total += acres * rate;
    }
    return Math.min(total, 155000);
  }, [crops]);

  const runScan = useCallback(() => {
    const input: QuickScanInput = {
      state,
      county: county || 'Unknown County',
      crops: crops
        .filter((c) => c.acres && parseFloat(c.acres) > 0)
        .map((c) => ({ commodity: c.commodity, acres: parseFloat(c.acres) })),
      hasLivestock,
      livestockType: hasLivestock ? livestockType : undefined,
      livestockCount: hasLivestock ? parseInt(livestockCount) || 0 : 0,
      hasCropInsurance,
      hasExperiencedDisaster: hasDisasterLoss,
    };

    const results = quickScan(input);
    setScanResults(results);
    setHasScanned(true);
  }, [state, county, crops, hasLivestock, livestockType, livestockCount, hasCropInsurance, hasDisasterLoss]);

  const eligibleResults = scanResults?.results.filter((r) => r.isEligible) || [];

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0C1F17]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")' }} />

        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-emerald-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Free · No signup required · Instant results
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Are you leaving{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              money
            </span>{' '}
            on the table?
          </h1>

          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-4">
            Over <span className="text-white font-semibold">$44 billion</span> in USDA payments are flowing to American farmers in 2026. Billions more go unclaimed every year. Find out what you&apos;re owed in 60 seconds.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-300">
                FBA ($12B) closes April 17 — {Math.ceil((new Date('2026-04-17').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-300">
                SDRP ($16B) closes April 30 — {Math.ceil((new Date('2026-04-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scanner Form ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 -mt-8 relative z-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-black/5 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Your Farm Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your operation info to scan all active USDA programs</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                >
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">County</label>
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g., Darke County"
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Crops */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Crops</label>
                <button onClick={addCrop} className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
                  + Add Crop
                </button>
              </div>
              <div className="space-y-2">
                {crops.map((crop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={crop.commodity}
                      onChange={(e) => updateCrop(i, 'commodity', e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                    >
                      {COVERED_COMMODITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={crop.acres}
                      onChange={(e) => updateCrop(i, 'acres', e.target.value)}
                      placeholder="Acres"
                      className="w-28 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none transition-all"
                    />
                    {crops.length > 1 && (
                      <button onClick={() => removeCrop(i)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {fbaPreview > 0 && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-700">
                    <span className="font-semibold">FBA Quick Estimate:</span> {formatCurrencyFull(fbaPreview)} based on current acreage
                  </p>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={hasLivestock}
                  onChange={(e) => setHasLivestock(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/25"
                />
                <span className="text-sm text-gray-700">Livestock operation</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={hasCropInsurance}
                  onChange={(e) => setHasCropInsurance(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/25"
                />
                <span className="text-sm text-gray-700">Have crop insurance</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={hasDisasterLoss}
                  onChange={(e) => setHasDisasterLoss(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/25"
                />
                <span className="text-sm text-gray-700">Crop loss in 2023/2024</span>
              </label>
            </div>

            {/* Livestock details */}
            {hasLivestock && (
              <div className="flex items-center gap-3">
                <select
                  value={livestockType}
                  onChange={(e) => setLivestockType(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                >
                  {LIVESTOCK_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={livestockCount}
                  onChange={(e) => setLivestockCount(e.target.value)}
                  placeholder="Head count"
                  className="w-32 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>
            )}

            {/* Scan button */}
            <button
              onClick={runScan}
              className="w-full px-8 py-3.5 rounded-xl bg-[#0C1F17] text-white font-semibold text-sm hover:bg-[#1B4332] active:bg-[#0C1F17] transition-colors shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Scan for Eligible Payments — Free
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {hasScanned && scanResults && (
        <section className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs text-gray-500 mb-1">Total Estimated Payments</div>
              <div className="text-3xl font-bold text-emerald-700 tabular-nums">
                {scanResults.totalEstimatedPaymentsFormatted}
              </div>
              <div className="text-xs text-gray-500 mt-1">across eligible programs</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500 mb-1">Eligible Programs</div>
              <div className="text-3xl font-bold text-gray-900 tabular-nums">
                {scanResults.eligibleProgramCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">of {USDA_PROGRAMS.length} scanned</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500 mb-1">Open Deadlines</div>
              <div className="text-3xl font-bold text-gray-900 tabular-nums">
                {eligibleResults.filter((r) => r.daysUntilDeadline !== null).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">programs with active enrollment</div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="rounded-xl bg-gradient-to-r from-[#0C1F17] to-[#1B4332] p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">
              Save Your Results — Create a Free Account
            </h3>
            <p className="text-sm text-gray-300 mb-4 max-w-lg mx-auto">
              Get deadline alerts, track your payments, and access our full suite of farm optimization tools. Free 14-day Pro trial — no credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C9A84C] text-[#0C1F17] font-semibold text-sm hover:bg-[#E2C366] transition-colors"
            >
              Create Free Account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Program results */}
          {eligibleResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Eligible Programs ({eligibleResults.length})
              </h3>
              <div className="space-y-3">
                {eligibleResults.map((result, i) => (
                  <ProgramCard key={result.program.id} result={result} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Want deadline alerts and payment tracking?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              HarvestFile monitors every USDA program and sends you alerts before enrollment windows close. Join thousands of farmers who never miss a payment.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/check"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Try ARC/PLC Calculator
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Trust bar (before scan) ──────────────────────────────────────── */}
      {!hasScanned && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">$44.3B</div>
              <div className="text-xs text-gray-500 mt-1">2026 Gov&apos;t Payments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">12</div>
              <div className="text-xs text-gray-500 mt-1">Programs Tracked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">50</div>
              <div className="text-xs text-gray-500 mt-1">States Covered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Free</div>
              <div className="text-xs text-gray-500 mt-1">No Signup Required</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
