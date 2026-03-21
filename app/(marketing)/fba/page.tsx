// =============================================================================
// HarvestFile — FBA Payment Calculator
// Phase 21A: Free public tool at /fba
//
// $11 billion Farmer Bridge Assistance program — per-acre payments for row crops.
// Deadline: April 17, 2026. This tool calculates estimated payments, checks
// against the $155K entity payment limit and $900K AGI cap, and flags entity
// structuring opportunities most farmers miss.
//
// Design: Matches /payments pattern — dark hero, white form card, light results.
// Lives in (marketing) route group → light theme, marketing header/footer.
// =============================================================================

'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

// ─── FBA Per-Acre Payment Rates (Published by FSA, February 2026) ────────────

const FBA_RATES: { commodity: string; rate: number; label: string }[] = [
  { commodity: 'corn', rate: 44.36, label: 'Corn' },
  { commodity: 'soybeans', rate: 30.88, label: 'Soybeans' },
  { commodity: 'wheat', rate: 39.35, label: 'Wheat' },
  { commodity: 'cotton', rate: 117.35, label: 'Cotton' },
  { commodity: 'rice', rate: 132.89, label: 'Rice' },
  { commodity: 'sorghum', rate: 33.21, label: 'Sorghum' },
  { commodity: 'barley', rate: 36.42, label: 'Barley' },
  { commodity: 'oats', rate: 28.15, label: 'Oats' },
  { commodity: 'peanuts', rate: 89.67, label: 'Peanuts' },
  { commodity: 'sunflowers', rate: 31.50, label: 'Sunflowers' },
  { commodity: 'canola', rate: 29.80, label: 'Canola' },
  { commodity: 'dry peas', rate: 24.60, label: 'Dry Peas' },
  { commodity: 'lentils', rate: 26.75, label: 'Lentils' },
  { commodity: 'chickpeas', rate: 27.90, label: 'Chickpeas' },
  { commodity: 'safflower', rate: 25.40, label: 'Safflower' },
  { commodity: 'mustard seed', rate: 23.80, label: 'Mustard Seed' },
  { commodity: 'crambe', rate: 22.50, label: 'Crambe' },
  { commodity: 'sesame', rate: 35.20, label: 'Sesame' },
  { commodity: 'flaxseed', rate: 27.10, label: 'Flaxseed' },
  { commodity: 'rapeseed', rate: 28.90, label: 'Rapeseed' },
];

// ─── Entity types and their payment limit implications ───────────────────────

const ENTITY_TYPES = [
  {
    value: 'individual',
    label: 'Individual / Sole Proprietor',
    limitPerEntity: 155000,
    description: 'Single $155,000 limit for your operation.',
    tip: null,
  },
  {
    value: 'joint',
    label: 'Joint Venture / General Partnership',
    limitPerEntity: 155000,
    description: 'Each partner actively engaged in farming gets their own $155,000 limit.',
    tip: 'With 2 partners, your combined limit could be $310,000.',
  },
  {
    value: 'llc',
    label: 'LLC (not taxed as C-Corp)',
    limitPerEntity: 155000,
    description: 'Each member actively engaged in farming gets their own $155,000 limit through the entity.',
    tip: 'A 3-member LLC could have a combined limit of $465,000 if all members are actively farming.',
  },
  {
    value: 'scorp',
    label: 'S Corporation',
    limitPerEntity: 155000,
    description: 'Each shareholder actively engaged in farming receives their own $155,000 limit.',
    tip: 'S-Corp shareholders each get a separate limit — this is a key OBBBA change.',
  },
  {
    value: 'ccorp',
    label: 'C Corporation',
    limitPerEntity: 155000,
    description: 'Single $155,000 limit for the entity.',
    tip: 'C-Corps get one entity-level limit. Consider restructuring if payments exceed $155K.',
  },
  {
    value: 'trust',
    label: 'Revocable Trust',
    limitPerEntity: 155000,
    description: 'Shares the payment limit of the grantor(s).',
    tip: null,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getDaysUntilDeadline(): number {
  const deadline = new Date('2026-04-17T23:59:59');
  const now = new Date();
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Crop row component ─────────────────────────────────────────────────────

interface CropRow {
  id: string;
  commodity: string;
  acres: string;
}

function CropInput({
  crop,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  crop: CropRow;
  index: number;
  onUpdate: (id: string, field: 'commodity' | 'acres', value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const rate = FBA_RATES.find((r) => r.commodity === crop.commodity)?.rate || 0;
  const acres = parseFloat(crop.acres) || 0;
  const subtotal = acres * rate;

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {index === 0 ? 'Crop' : `Crop ${index + 1}`}
        </label>
        <select
          value={crop.commodity}
          onChange={(e) => onUpdate(crop.id, 'commodity', e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors appearance-none"
        >
          {FBA_RATES.map((r) => (
            <option key={r.commodity} value={r.commodity}>
              {r.label} — {formatCurrencyFull(r.rate)}/acre
            </option>
          ))}
        </select>
      </div>

      <div className="w-28 flex-shrink-0">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          2025 Acres
        </label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={crop.acres}
          onChange={(e) => onUpdate(crop.id, 'acres', e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
        />
      </div>

      {subtotal > 0 && (
        <div className="w-24 flex-shrink-0 pt-6 text-right">
          <span className="text-sm font-semibold text-emerald-700 tabular-nums">
            {formatCurrency(subtotal)}
          </span>
        </div>
      )}

      {canRemove && (
        <button
          onClick={() => onRemove(crop.id)}
          className="flex-shrink-0 mt-6 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Remove crop"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Countdown badge ─────────────────────────────────────────────────────────

function DeadlineBadge() {
  const days = getDaysUntilDeadline();

  const urgency =
    days <= 7 ? 'critical' : days <= 14 ? 'high' : days <= 30 ? 'medium' : 'low';

  const config = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-200', dot: 'bg-red-400 animate-pulse', border: 'border-red-500/30' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-200', dot: 'bg-orange-400 animate-pulse', border: 'border-orange-500/30' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-200', dot: 'bg-amber-400 animate-pulse', border: 'border-amber-500/30' },
    low: { bg: 'bg-emerald-500/20', text: 'text-emerald-200', dot: 'bg-emerald-400', border: 'border-emerald-500/30' },
  };

  const c = config[urgency];

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {days === 0 ? 'DEADLINE TODAY' : `${days} days left to enroll`}
    </span>
  );
}

// ─── Light-theme urgency badge for results ───────────────────────────────────

function ResultDeadlineBadge() {
  const days = getDaysUntilDeadline();
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {days} days left — act now!
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {days} days until deadline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Enrollment open — {days} days left
    </span>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function FBACalculatorPage() {
  // ── Form state ──────────────────────────────────────────────────────────
  const [crops, setCrops] = useState<CropRow[]>([
    { id: '1', commodity: 'corn', acres: '' },
  ]);
  const [entityType, setEntityType] = useState('individual');
  const [memberCount, setMemberCount] = useState('1');
  const [agiOver900k, setAgiOver900k] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // ── Crop management ─────────────────────────────────────────────────────
  const addCrop = useCallback(() => {
    setCrops((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        commodity: 'soybeans',
        acres: '',
      },
    ]);
  }, []);

  const removeCrop = useCallback((id: string) => {
    setCrops((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCrop = useCallback(
    (id: string, field: 'commodity' | 'acres', value: string) => {
      setCrops((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  // ── Calculations ────────────────────────────────────────────────────────
  const calculation = useMemo(() => {
    const cropBreakdown = crops
      .filter((c) => c.acres && parseFloat(c.acres) > 0)
      .map((c) => {
        const rate = FBA_RATES.find((r) => r.commodity === c.commodity);
        const acres = parseFloat(c.acres) || 0;
        return {
          commodity: rate?.label || c.commodity,
          rate: rate?.rate || 0,
          acres,
          subtotal: acres * (rate?.rate || 0),
        };
      });

    const grossPayment = cropBreakdown.reduce((sum, c) => sum + c.subtotal, 0);
    const totalAcres = cropBreakdown.reduce((sum, c) => sum + c.acres, 0);

    // Entity limit analysis
    const entity = ENTITY_TYPES.find((e) => e.value === entityType)!;
    const members = parseInt(memberCount) || 1;
    const isMultiMember = ['joint', 'llc', 'scorp'].includes(entityType);
    const effectiveLimit = isMultiMember ? entity.limitPerEntity * members : entity.limitPerEntity;
    const isOverLimit = grossPayment > effectiveLimit;
    const actualPayment = Math.min(grossPayment, effectiveLimit);
    const lostToLimit = Math.max(0, grossPayment - effectiveLimit);

    // AGI check
    const agiBlocked = agiOver900k;

    return {
      cropBreakdown,
      grossPayment,
      totalAcres,
      entity,
      members,
      isMultiMember,
      effectiveLimit,
      isOverLimit,
      actualPayment,
      lostToLimit,
      agiBlocked,
    };
  }, [crops, entityType, memberCount, agiOver900k]);

  // ── Calculate handler ───────────────────────────────────────────────────
  const handleCalculate = useCallback(() => {
    setHasCalculated(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById('fba-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const hasValidCrops = crops.some((c) => parseFloat(c.acres) > 0);

  // ── Live preview total ──────────────────────────────────────────────────
  const liveTotal = useMemo(() => {
    let total = 0;
    for (const crop of crops) {
      const acres = parseFloat(crop.acres) || 0;
      const rate = FBA_RATES.find((r) => r.commodity === crop.commodity)?.rate || 0;
      total += acres * rate;
    }
    return total;
  }, [crops]);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0C1F17]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-emerald-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Free · No signup required · Instant results
            </div>
            <DeadlineBadge />
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Claim your share of{' '}
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              $11 billion
            </span>
          </h1>

          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-4">
            The{' '}
            <span className="text-white font-semibold">
              Farmer Bridge Assistance Program
            </span>{' '}
            is paying flat per-acre rates to every farmer who planted covered
            commodities. Enrollment closes{' '}
            <span className="text-white font-semibold">April 17, 2026</span>.
            Calculate your payment in 30 seconds.
          </p>

          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Corn: $44.36/ac · Soybeans: $30.88/ac · Wheat: $39.35/ac · Cotton:
            $117.35/ac · Rice: $132.89/ac ·{' '}
            <span className="text-emerald-400">+ 15 more crops</span>
          </p>
        </div>
      </section>

      {/* ── Calculator Form Card ─────────────────────────────────────────── */}
      <section className="relative -mt-6 max-w-2xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Live preview bar */}
          {liveTotal > 0 && (
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">
                Live Estimate
              </span>
              <span className="text-lg font-bold text-emerald-700 tabular-nums">
                {formatCurrency(Math.min(liveTotal, 155000))}
                {liveTotal > 155000 && (
                  <span className="text-xs font-normal text-amber-600 ml-2">
                    (capped — see entity options)
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5">
            {/* Crop inputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Your 2025 Planted Crops
                </h3>
                <button
                  onClick={addCrop}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Crop
                </button>
              </div>

              {crops.map((crop, i) => (
                <CropInput
                  key={crop.id}
                  crop={crop}
                  index={i}
                  onUpdate={updateCrop}
                  onRemove={removeCrop}
                  canRemove={crops.length > 1}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Entity type */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Entity Type
                <span className="ml-2 text-xs font-normal text-gray-400">
                  (affects your payment limit)
                </span>
              </h3>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors appearance-none"
              >
                {ENTITY_TYPES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>

              {/* Member count for multi-member entities */}
              {['joint', 'llc', 'scorp'].includes(entityType) && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Number of members/partners actively farming
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    value={memberCount}
                    onChange={(e) => setMemberCount(e.target.value)}
                    className="w-24 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              {/* Entity tip */}
              {ENTITY_TYPES.find((e) => e.value === entityType)?.tip && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {ENTITY_TYPES.find((e) => e.value === entityType)?.tip}
                  </p>
                </div>
              )}
            </div>

            {/* AGI check */}
            <div className="flex items-start gap-3">
              <button
                onClick={() => setAgiOver900k(!agiOver900k)}
                className={`relative mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 transition-colors ${
                  agiOver900k
                    ? 'bg-red-500 border-red-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                {agiOver900k && (
                  <svg className="absolute inset-0 w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div>
                <span className="text-sm text-gray-900 font-medium">
                  My 3-year average AGI exceeds $900,000
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  If checked, you may be ineligible unless 75%+ of gross income is from farming.
                </p>
              </div>
            </div>

            {/* Calculate button */}
            <button
              onClick={handleCalculate}
              disabled={!hasValidCrops}
              className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                hasValidCrops
                  ? 'bg-[#1B4332] hover:bg-[#0C1F17] text-white shadow-lg shadow-[#1B4332]/20 hover:shadow-xl hover:shadow-[#1B4332]/30 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Calculate My FBA Payment
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────────────────────────────── */}
      {!hasCalculated && (
        <section className="max-w-3xl mx-auto px-6 pb-10">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">$11B</span>
              <span>total funding</span>
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">20</span>
              <span>covered crops</span>
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">$155K</span>
              <span>per-entity limit</span>
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-600">Free</span>
              <span>to use</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {hasCalculated && (
        <section id="fba-results" className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          {/* AGI Block Warning */}
          {calculation.agiBlocked && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 mt-0.5 flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <h3 className="text-base font-bold text-red-900 mb-1">
                    AGI May Exceed $900,000 Limit
                  </h3>
                  <p className="text-sm text-red-700 leading-relaxed">
                    Producers with a 3-year average AGI over $900,000 are generally ineligible for FBA payments. However, if <span className="font-semibold">75% or more</span> of your gross income comes from farming, ranching, or forestry, you may still qualify. Contact your local FSA office to verify eligibility.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs text-gray-500 mb-1">
                {calculation.isOverLimit ? 'Payment After Limit' : 'Estimated FBA Payment'}
              </div>
              <div className={`text-3xl font-bold tabular-nums ${calculation.agiBlocked ? 'text-gray-400 line-through' : 'text-emerald-700'}`}>
                {formatCurrency(calculation.actualPayment)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {calculation.totalAcres.toLocaleString()} total acres
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500 mb-1">Entity Payment Limit</div>
              <div className="text-3xl font-bold text-gray-900 tabular-nums">
                {formatCurrency(calculation.effectiveLimit)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {calculation.isMultiMember
                  ? `${calculation.members} members × $155K each`
                  : 'single entity limit'}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500 mb-1">Enrollment Deadline</div>
              <div className="text-xl font-bold text-gray-900 mt-1">
                April 17, 2026
              </div>
              <div className="mt-1.5">
                <ResultDeadlineBadge />
              </div>
            </div>
          </div>

          {/* Payment limit warning */}
          {calculation.isOverLimit && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <h3 className="text-base font-bold text-amber-900 mb-1">
                    You&apos;re leaving {formatCurrency(calculation.lostToLimit)} on the table
                  </h3>
                  <p className="text-sm text-amber-800 leading-relaxed mb-2">
                    Your gross FBA payment of {formatCurrency(calculation.grossPayment)} exceeds your current entity limit of {formatCurrency(calculation.effectiveLimit)}. Under OBBBA rules, qualified pass-through entities (LLCs, S-Corps, partnerships) allow each actively farming member to receive their own $155,000 limit.
                  </p>
                  {entityType === 'individual' && (
                    <p className="text-sm text-amber-900 font-semibold">
                      Restructuring as a 2-member LLC could increase your limit to $310,000. Consult a farm attorney or tax advisor before the April 17 deadline.
                    </p>
                  )}
                  {entityType === 'ccorp' && (
                    <p className="text-sm text-amber-900 font-semibold">
                      C-Corps receive a single entity-level limit. Converting to an S-Corp or LLC could allow each member their own $155K limit. Consult a tax advisor.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Crop-by-crop breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Payment Breakdown by Crop
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {calculation.cropBreakdown.map((crop, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {crop.commodity}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {crop.acres.toLocaleString()} ac × {formatCurrencyFull(crop.rate)}/ac
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(crop.subtotal)}
                  </span>
                </div>
              ))}

              {/* Total row */}
              <div className="px-5 py-3.5 flex items-center justify-between bg-gray-50">
                <span className="text-sm font-bold text-gray-900">
                  Gross Total
                </span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatCurrency(calculation.grossPayment)}
                </span>
              </div>

              {calculation.isOverLimit && (
                <div className="px-5 py-3.5 flex items-center justify-between bg-red-50/50">
                  <span className="text-sm font-medium text-red-700">
                    Entity limit reduction
                  </span>
                  <span className="text-sm font-semibold text-red-600 tabular-nums">
                    −{formatCurrency(calculation.lostToLimit)}
                  </span>
                </div>
              )}

              <div className="px-5 py-4 flex items-center justify-between bg-emerald-50">
                <span className="text-base font-bold text-emerald-800">
                  Your Estimated FBA Payment
                </span>
                <span className="text-xl font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(calculation.actualPayment)}
                </span>
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="rounded-xl bg-gradient-to-r from-[#0C1F17] to-[#1B4332] p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">
              Save Your Results — Create a Free Account
            </h3>
            <p className="text-sm text-gray-300 mb-4 max-w-lg mx-auto">
              Get FBA deadline alerts, track all your USDA payments, and access
              our full suite of farm optimization tools. Free 14-day Pro trial —
              no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Create Free Account →
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                Scan All 12 USDA Programs
              </Link>
            </div>
          </div>

          {/* How to enroll */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              How to Enroll in FBA
            </h3>
            <div className="space-y-4">
              {[
                {
                  step: '1',
                  title: 'Create a Login.gov account',
                  desc: 'FBA uses the new USDA digital platform. You need a Login.gov account to apply online — this is faster than visiting your FSA office.',
                  link: 'https://login.gov',
                  linkText: 'Create Login.gov account →',
                },
                {
                  step: '2',
                  title: 'Gather your information',
                  desc: 'You\'ll need your FSA farm number(s), 2024 or 2025 planted acreage by crop, and entity/tax ID information.',
                },
                {
                  step: '3',
                  title: 'Apply through farmers.gov or your local FSA office',
                  desc: 'Online applications are processed faster. In the first 4 days, 50x more producers signed up online than the previous program\'s entire enrollment period.',
                  link: 'https://www.fsa.usda.gov/resources/income-support/farmer-bridge-assistance-fba-program',
                  linkText: 'Apply on FSA.gov →',
                },
                {
                  step: '4',
                  title: 'Receive payment',
                  desc: 'Payments are being issued on a rolling basis. Most producers receive funds within 2–4 weeks of completing enrollment.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-500 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 mt-1.5 transition-colors"
                      >
                        {item.linkText}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All FBA rates reference */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                All FBA Per-Acre Payment Rates
              </h3>
              <span className="text-xs text-gray-400">
                Source: FSA, February 2026
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-50">
              {FBA_RATES.map((r) => (
                <div key={r.commodity} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-600">{r.label}</span>
                  <span className="text-xs font-semibold text-gray-900 tabular-nums">
                    ${r.rate.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="rounded-xl border border-gray-200 bg-[#FDFBF7] p-6 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Want deadline alerts and payment tracking?
            </h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Never miss an enrollment window again. HarvestFile tracks every
              USDA program and sends alerts before deadlines close.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/check"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Try ARC/PLC Calculator
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
            Estimates are for informational purposes only. Actual FBA payments
            depend on FSA verification of planted acreage, entity determinations,
            and compliance with conservation and wetland provisions. This tool is
            not affiliated with or endorsed by USDA. Payment rates are from the
            FSA FBA Program Fact Sheet published February 2026. Payment limits
            and entity rules are based on OBBBA statutory language and FSA
            guidance — consult a qualified advisor for entity structuring decisions.
          </p>
        </section>
      )}

      {/* ── About FBA (shown when no results yet) ────────────────────────── */}
      {!hasCalculated && (
        <section className="max-w-3xl mx-auto px-6 pb-16 space-y-8">
          {/* What is FBA */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              What is the Farmer Bridge Assistance Program?
            </h2>
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>
                The <span className="font-semibold text-gray-900">Farmer Bridge Assistance (FBA)</span> program
                provides <span className="font-semibold text-gray-900">$11 billion</span> in direct per-acre payments
                to producers who planted covered commodities in 2024 or 2025. An additional $1 billion is available
                for specialty crop producers through the companion ASCF program.
              </p>
              <p>
                Payments are calculated as a <span className="font-semibold text-gray-900">flat rate per planted acre</span> —
                no yield verification, no loss requirement. If you planted a covered crop, you qualify (subject to
                AGI and payment limit caps). Enrollment is open from February 23 through{' '}
                <span className="font-semibold text-gray-900">April 17, 2026</span>.
              </p>
              <p>
                In its first four days, 50x more producers signed up online than the previous ECAP program&apos;s
                entire five-month enrollment — driven by the new Login.gov digital platform. Payments are being
                issued on a rolling basis within weeks of enrollment.
              </p>
            </div>
          </div>

          {/* Key requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Eligibility
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  Planted covered commodity in 2024 or 2025
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  3-year average AGI under $900,000
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  Compliance with conservation provisions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  Login.gov account required
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Key Dates
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span><span className="font-medium text-gray-900">Feb 23:</span> Enrollment opened</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span><span className="font-medium text-gray-900">Apr 17:</span> Enrollment closes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span><span className="font-medium text-gray-900">Rolling:</span> Payments issued within 2–4 weeks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span><span className="font-medium text-gray-900">$155K:</span> Per-entity payment limit</span>
                </li>
              </ul>
            </div>
          </div>

          {/* All rates */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                All FBA Per-Acre Payment Rates
              </h3>
              <span className="text-xs text-gray-400">
                Source: FSA, February 2026
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-50">
              {FBA_RATES.map((r) => (
                <div key={r.commodity} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-600">{r.label}</span>
                  <span className="text-xs font-semibold text-gray-900 tabular-nums">
                    ${r.rate.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
            Estimates are for informational purposes only. Actual FBA payments
            depend on FSA verification of planted acreage, entity determinations,
            and compliance with conservation and wetland provisions. This tool is
            not affiliated with or endorsed by USDA. Payment rates are from the
            FSA FBA Program Fact Sheet published February 2026. Consult your
            local FSA office or a qualified agricultural advisor for decisions
            affecting your operation.
          </p>
        </section>
      )}
    </div>
  );
}
