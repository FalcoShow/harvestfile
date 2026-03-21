'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

// =============================================================================
// HarvestFile — /sdrp SDRP Eligibility Checker & Payment Estimator
// Phase 21B: $16 Billion Supplemental Disaster Relief Program
// Covers Stage 1 (insurance indemnity) and Stage 2 (shallow/uncovered/quality)
// Deadline: April 30, 2026
// =============================================================================

// ─── Constants & Data Tables ────────────────────────────────────────────────

const SDRP_DEADLINE = new Date('2026-04-30T23:59:59');

const EXCLUDED_STATES = ['Connecticut', 'Hawaii', 'Maine', 'Massachusetts'];

// Insurance coverage level → SDRP Factor (Stage 1 & Stage 2 insured)
const INSURANCE_SDRP_FACTORS: { min: number; max: number; label: string; factor: number }[] = [
  { min: 0, max: 0, label: 'Catastrophic (CAT)', factor: 0.75 },
  { min: 1, max: 54, label: 'Above CAT but below 55%', factor: 0.80 },
  { min: 55, max: 59, label: '55% to 59%', factor: 0.825 },
  { min: 60, max: 64, label: '60% to 64%', factor: 0.85 },
  { min: 65, max: 69, label: '65% to 69%', factor: 0.875 },
  { min: 70, max: 74, label: '70% to 74%', factor: 0.90 },
  { min: 75, max: 79, label: '75% to 79%', factor: 0.925 },
  { min: 80, max: 100, label: '80% or higher', factor: 0.95 },
];

// NAP coverage level → SDRP Factor
const NAP_SDRP_FACTORS: { value: string; label: string; factor: number }[] = [
  { value: 'cat', label: 'Catastrophic (CAT)', factor: 0.75 },
  { value: '50', label: '50% Buy-Up', factor: 0.80 },
  { value: '55', label: '55% Buy-Up', factor: 0.85 },
  { value: '60', label: '60% Buy-Up', factor: 0.90 },
  { value: '65', label: '65% Buy-Up', factor: 0.95 },
];

const UNINSURED_FACTOR = 0.70;

const PAYMENT_FACTOR = 0.35; // 35% multiplier applied to all SDRP payments

const QUALIFYING_DISASTERS = [
  { name: 'Wildfire', icon: '🔥', qualifies: true },
  { name: 'Hurricane', icon: '🌀', qualifies: true },
  { name: 'Flood', icon: '🌊', qualifies: true },
  { name: 'Derecho', icon: '💨', qualifies: true },
  { name: 'Excessive Heat', icon: '🌡️', qualifies: true },
  { name: 'Tornado', icon: '🌪️', qualifies: true },
  { name: 'Winter Storm / Freeze', icon: '❄️', qualifies: true },
  { name: 'Smoke Exposure', icon: '🌫️', qualifies: true },
  { name: 'Excessive Moisture', icon: '💧', qualifies: true },
  { name: 'Qualifying Drought (D2 8wk / D3+)', icon: '☀️', qualifies: true },
  { name: 'Hail (with qualifying event)', icon: '🧊', qualifies: true },
  { name: 'Hail alone', icon: '🚫', qualifies: false },
];

const CROP_CATEGORIES = [
  { value: 'row', label: 'Row Crops (corn, soybeans, wheat, cotton, rice, sorghum, etc.)' },
  { value: 'specialty', label: 'Specialty Crops (fruits, vegetables, tree nuts)' },
  { value: 'perennial', label: 'Perennial Crops (citrus, apples, pecans, grapes)' },
  { value: 'forage', label: 'Forage Crops (non-grazing hay, alfalfa)' },
  { value: 'nursery', label: 'Nursery / Floriculture / Turfgrass' },
  { value: 'aquaculture', label: 'Aquaculture' },
  { value: 'tree_vine', label: 'Trees, Bushes, or Vines (commercial production)' },
];

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual / Sole Proprietor' },
  { value: 'joint', label: 'Joint Venture / General Partnership' },
  { value: 'llc', label: 'LLC (multi-member)' },
  { value: 'scorp', label: 'S-Corporation' },
  { value: 'trust', label: 'Irrevocable Trust' },
  { value: 'estate', label: 'Estate' },
];

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

// ─── Helper Functions ───────────────────────────────────────────────────────

function getDaysUntilDeadline(): number {
  const now = new Date();
  const diff = SDRP_DEADLINE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSdrpFactor(coverageLevel: number): number {
  const match = INSURANCE_SDRP_FACTORS.find(
    (f) => coverageLevel >= f.min && coverageLevel <= f.max
  );
  return match?.factor ?? 0.75;
}

function getNapFactor(napLevel: string): number {
  const match = NAP_SDRP_FACTORS.find((f) => f.value === napLevel);
  return match?.factor ?? 0.75;
}

// ─── Deadline Badge Components ──────────────────────────────────────────────

function HeroDeadlineBadge() {
  const days = getDaysUntilDeadline();
  const isUrgent = days <= 14;
  const isCritical = days <= 7;
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold tracking-wide ${
        isCritical
          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
          : isUrgent
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isCritical
            ? 'bg-red-400 animate-pulse'
            : isUrgent
            ? 'bg-amber-400 animate-pulse'
            : 'bg-emerald-400'
        }`}
      />
      {days === 0
        ? 'DEADLINE TODAY'
        : `${days} days left to apply`}
    </span>
  );
}

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

export default function SDRPCheckerPage() {
  // ── Form State ──────────────────────────────────────────────────────────
  const [state, setState] = useState('Ohio');
  const [county, setCounty] = useState('');
  const [lossYear, setLossYear] = useState<'2023' | '2024'>('2024');

  // Insurance & Stage
  const [receivedIndemnity, setReceivedIndemnity] = useState<'yes' | 'no' | ''>('');
  const [insuranceStatus, setInsuranceStatus] = useState<'insured' | 'nap' | 'uninsured'>('insured');
  const [coverageLevel, setCoverageLevel] = useState('75');
  const [napLevel, setNapLevel] = useState('cat');

  // Stage 1 inputs
  const [expectedValue, setExpectedValue] = useState('');
  const [productionValue, setProductionValue] = useState('');
  const [grossIndemnity, setGrossIndemnity] = useState('');
  const [premiumsPaid, setPremiumsPaid] = useState('');

  // Stage 2 inputs
  const [stage2LossType, setStage2LossType] = useState<'shallow' | 'uncovered' | 'quality'>('shallow');
  const [s2ExpectedValue, setS2ExpectedValue] = useState('');
  const [s2ActualRevenue, setS2ActualRevenue] = useState('');
  const [s2QualityLossPct, setS2QualityLossPct] = useState('');
  const [s2RevenueToCount, setS2RevenueToCount] = useState('');

  // Crop & entity
  const [cropCategory, setCropCategory] = useState('row');
  const [producerShare, setProducerShare] = useState('100');
  const [entityType, setEntityType] = useState('individual');
  const [farmIncomeOver75, setFarmIncomeOver75] = useState(false);

  // Disaster
  const [disasterType, setDisasterType] = useState('Qualifying Drought (D2 8wk / D3+)');

  // UI state
  const [hasChecked, setHasChecked] = useState(false);

  // ── Derived state ───────────────────────────────────────────────────────
  const isExcludedState = EXCLUDED_STATES.includes(state);
  const isStage1 = receivedIndemnity === 'yes';
  const isStage2 = receivedIndemnity === 'no';
  const isSpecialtyCrop = ['specialty', 'perennial', 'nursery', 'tree_vine', 'aquaculture'].includes(cropCategory);

  // ── SDRP Factor ─────────────────────────────────────────────────────────
  const sdrpFactor = useMemo(() => {
    if (insuranceStatus === 'uninsured') return UNINSURED_FACTOR;
    if (insuranceStatus === 'nap') return getNapFactor(napLevel);
    return getSdrpFactor(parseInt(coverageLevel) || 75);
  }, [insuranceStatus, coverageLevel, napLevel]);

  // ── Payment Calculation ─────────────────────────────────────────────────
  const calculation = useMemo(() => {
    const share = (parseFloat(producerShare) || 100) / 100;

    if (isStage1) {
      // Stage 1 formula:
      // 1. Expected Value × SDRP Factor = SDRP Liability
      // 2. SDRP Liability − Value of Production = Gross SDRP Amount
      // 3. Gross SDRP Amount − Net Indemnity = Pre-factor Payment
      // 4. Pre-factor × 35% × producer share = Final Payment
      const ev = parseFloat(expectedValue) || 0;
      const pv = parseFloat(productionValue) || 0;
      const gi = parseFloat(grossIndemnity) || 0;
      const prem = parseFloat(premiumsPaid) || 0;

      const sdrpLiability = ev * sdrpFactor;
      const grossSdrpAmount = Math.max(0, sdrpLiability - pv);
      const netIndemnity = Math.max(0, gi - prem);
      const preFactor = Math.max(0, grossSdrpAmount - netIndemnity);
      const rawPayment = preFactor * PAYMENT_FACTOR * share;

      // 90% cap: SDRP + crop insurance ≤ 90% of loss
      const totalLoss = Math.max(0, ev - pv);
      const maxAllowed = totalLoss * 0.90;
      const afterCap = Math.min(rawPayment, Math.max(0, maxAllowed - gi));
      const finalPayment = Math.max(0, afterCap);

      return {
        stage: 1 as const,
        sdrpFactor,
        expectedValue: ev,
        sdrpLiability,
        productionValue: pv,
        grossSdrpAmount,
        grossIndemnity: gi,
        premiumsPaid: prem,
        netIndemnity,
        preFactor,
        rawPayment,
        totalLoss,
        maxAllowed,
        cappedBy90: rawPayment > afterCap && afterCap < rawPayment,
        finalPayment,
        share,
      };
    }

    if (isStage2) {
      const ev = parseFloat(s2ExpectedValue) || 0;
      const ar = parseFloat(s2ActualRevenue) || 0;
      const qlPct = (parseFloat(s2QualityLossPct) || 0) / 100;
      const rtc = parseFloat(s2RevenueToCount) || 0;

      if (stage2LossType === 'shallow') {
        // Shallow loss: insured but no indemnity triggered
        // SDRP Liability − Actual Revenue = gap, apply 35%
        const sdrpLiability = ev * sdrpFactor;
        const gap = Math.max(0, sdrpLiability - ar);
        const rawPayment = gap * PAYMENT_FACTOR * share;
        return {
          stage: 2 as const,
          lossType: 'shallow' as const,
          sdrpFactor,
          expectedValue: ev,
          sdrpLiability,
          actualRevenue: ar,
          gap,
          rawPayment,
          finalPayment: Math.max(0, rawPayment),
          share,
        };
      }

      if (stage2LossType === 'uncovered') {
        // Uncovered/uninsured: uses 70% fixed factor
        const factor = UNINSURED_FACTOR;
        const sdrpLiability = ev * factor;
        const gap = Math.max(0, sdrpLiability - ar);
        const rawPayment = gap * PAYMENT_FACTOR * share;
        return {
          stage: 2 as const,
          lossType: 'uncovered' as const,
          sdrpFactor: factor,
          expectedValue: ev,
          sdrpLiability,
          actualRevenue: ar,
          gap,
          rawPayment,
          finalPayment: Math.max(0, rawPayment),
          share,
        };
      }

      // Quality loss
      const qualityLossAmount = rtc * qlPct;
      const rawPayment = qualityLossAmount * PAYMENT_FACTOR * share;
      return {
        stage: 2 as const,
        lossType: 'quality' as const,
        sdrpFactor,
        qualityLossPct: qlPct,
        revenueToCount: rtc,
        qualityLossAmount,
        rawPayment,
        finalPayment: Math.max(0, rawPayment),
        share,
      };
    }

    return null;
  }, [
    isStage1, isStage2, expectedValue, productionValue, grossIndemnity,
    premiumsPaid, sdrpFactor, producerShare, stage2LossType,
    s2ExpectedValue, s2ActualRevenue, s2QualityLossPct, s2RevenueToCount,
  ]);

  // ── Payment Limits ──────────────────────────────────────────────────────
  const paymentLimit = useMemo(() => {
    const baseLimit = 125_000;
    const increasedSpecialty = 900_000;
    const increasedOther = 250_000;

    if (farmIncomeOver75) {
      return isSpecialtyCrop ? increasedSpecialty : increasedOther;
    }
    return baseLimit;
  }, [farmIncomeOver75, isSpecialtyCrop]);

  const isOverLimit = (calculation?.finalPayment ?? 0) > paymentLimit;
  const cappedPayment = Math.min(calculation?.finalPayment ?? 0, paymentLimit);
  const lostToLimit = Math.max(0, (calculation?.finalPayment ?? 0) - paymentLimit);

  // ── Calculate handler ───────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    setHasChecked(true);
    setTimeout(() => {
      document.getElementById('sdrp-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const canCheck =
    receivedIndemnity !== '' &&
    !isExcludedState &&
    (isStage1
      ? parseFloat(expectedValue) > 0
      : isStage2
      ? (stage2LossType === 'quality'
          ? parseFloat(s2RevenueToCount) > 0 && parseFloat(s2QualityLossPct) > 0
          : parseFloat(s2ExpectedValue) > 0)
      : false);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0C1F17] via-[#1B4332] to-[#0C1F17] text-white">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-14 text-center">
          <HeroDeadlineBadge />
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            SDRP Eligibility Checker
          </h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl mx-auto leading-relaxed">
            Check if you qualify for the{' '}
            <span className="text-emerald-400 font-semibold">$16 billion</span>{' '}
            Supplemental Disaster Relief Program — and estimate your payment.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            2023–2024 crop losses · Stage 1 &amp; Stage 2 · Free, no signup required
          </p>
        </div>
      </section>

      {/* ── Form Section ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {/* ── Step 1: Location & Year ─────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">1</span>
              <h2 className="text-lg font-bold text-gray-900">Location &amp; Crop Year</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                <select
                  value={state}
                  onChange={(e) => { setState(e.target.value); setCounty(''); }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                >
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* County */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">County</label>
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g. Summit"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Crop Year of Loss</label>
                <div className="flex gap-2">
                  {(['2023', '2024'] as const).map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setLossYear(yr)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        lossYear === yr
                          ? 'bg-[#1B4332] text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Excluded state warning */}
            {isExcludedState && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 mt-0.5 flex-shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{state} is excluded from SDRP</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Connecticut, Hawaii, Maine, and Massachusetts receive separate block grants ($220M total) to administer their own disaster compensation. Contact your state department of agriculture for assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Insurance & Stage Routing ──────────────────────── */}
          {!isExcludedState && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">2</span>
                <h2 className="text-lg font-bold text-gray-900">Insurance &amp; Loss Type</h2>
              </div>

              {/* Indemnity question — routes to Stage */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Did you receive a crop insurance indemnity or NAP payment for your {lossYear} loss?
                </label>
                <div className="flex gap-3">
                  {[
                    { val: 'yes' as const, label: 'Yes — I received an indemnity', desc: 'Stage 1' },
                    { val: 'no' as const, label: 'No — I did not', desc: 'Stage 2' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setReceivedIndemnity(opt.val)}
                      className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                        receivedIndemnity === opt.val
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className={`block text-sm font-semibold ${receivedIndemnity === opt.val ? 'text-emerald-800' : 'text-gray-800'}`}>
                        {opt.label}
                      </span>
                      <span className={`block text-xs mt-0.5 ${receivedIndemnity === opt.val ? 'text-emerald-600' : 'text-gray-500'}`}>
                        → SDRP {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage routing indicator */}
              {receivedIndemnity && (
                <div className={`mb-5 rounded-xl p-4 ${isStage1 ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                  <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isStage1 ? 'text-blue-600' : 'text-purple-600'}>
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span className={`text-sm font-semibold ${isStage1 ? 'text-blue-800' : 'text-purple-800'}`}>
                      You qualify for SDRP {isStage1 ? 'Stage 1' : 'Stage 2'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isStage1 ? 'text-blue-700' : 'text-purple-700'}`}>
                    {isStage1
                      ? 'Stage 1 covers additional losses beyond your crop insurance indemnity. FSA mails pre-filled FSA-526 applications — check your mailbox.'
                      : 'Stage 2 covers shallow losses (insured but no indemnity triggered), uninsured/uncovered crop losses, and quality losses. You must visit your FSA office with a completed FSA-504.'}
                  </p>
                </div>
              )}

              {/* Insurance status */}
              {receivedIndemnity && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Status</label>
                    <select
                      value={insuranceStatus}
                      onChange={(e) => setInsuranceStatus(e.target.value as 'insured' | 'nap' | 'uninsured')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                    >
                      <option value="insured">Federal Crop Insurance</option>
                      <option value="nap">NAP (Noninsured Crop Assistance)</option>
                      <option value="uninsured">Uninsured / No Coverage</option>
                    </select>
                  </div>

                  {/* Coverage level */}
                  {insuranceStatus === 'insured' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Coverage Level
                        <span className="ml-1.5 text-xs text-gray-400">→ SDRP Factor: {(sdrpFactor * 100).toFixed(1)}%</span>
                      </label>
                      <select
                        value={coverageLevel}
                        onChange={(e) => setCoverageLevel(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      >
                        <option value="0">CAT (Catastrophic)</option>
                        <option value="50">50%</option>
                        <option value="55">55%</option>
                        <option value="60">60%</option>
                        <option value="65">65%</option>
                        <option value="70">70%</option>
                        <option value="75">75%</option>
                        <option value="80">80%</option>
                        <option value="85">85%</option>
                      </select>
                    </div>
                  )}

                  {insuranceStatus === 'nap' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        NAP Coverage Level
                        <span className="ml-1.5 text-xs text-gray-400">→ SDRP Factor: {(sdrpFactor * 100).toFixed(1)}%</span>
                      </label>
                      <select
                        value={napLevel}
                        onChange={(e) => setNapLevel(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      >
                        {NAP_SDRP_FACTORS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {insuranceStatus === 'uninsured' && (
                    <div className="flex items-end">
                      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-600 w-full">
                        SDRP Factor: <span className="font-semibold text-gray-900">{(UNINSURED_FACTOR * 100).toFixed(0)}%</span> (fixed for uninsured)
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 2: Loss type sub-selection */}
              {isStage2 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type of Loss</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { val: 'shallow' as const, label: 'Shallow Loss', desc: 'Insured but loss didn\'t trigger indemnity' },
                      { val: 'uncovered' as const, label: 'Uncovered / Uninsured', desc: 'No crop insurance or NAP coverage' },
                      { val: 'quality' as const, label: 'Quality Loss', desc: 'Grade, test weight, or nutritional decline' },
                    ].map((lt) => (
                      <button
                        key={lt.val}
                        onClick={() => setStage2LossType(lt.val)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          stage2LossType === lt.val
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className={`block text-sm font-semibold ${stage2LossType === lt.val ? 'text-purple-800' : 'text-gray-800'}`}>
                          {lt.label}
                        </span>
                        <span className={`block text-xs mt-0.5 ${stage2LossType === lt.val ? 'text-purple-600' : 'text-gray-500'}`}>
                          {lt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Financial Details ─────────────────────────────── */}
          {receivedIndemnity && !isExcludedState && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">3</span>
                <h2 className="text-lg font-bold text-gray-900">
                  {isStage1 ? 'Stage 1 — Loss & Indemnity Details' : 'Stage 2 — Loss Details'}
                </h2>
              </div>

              {/* Crop category & producer share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Crop Category</label>
                  <select
                    value={cropCategory}
                    onChange={(e) => setCropCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  >
                    {CROP_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Producer Share (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={producerShare}
                    onChange={(e) => setProducerShare(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* STAGE 1 INPUTS */}
              {isStage1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Expected Value
                      <span className="block text-xs text-gray-400 font-normal">From your crop insurance records</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={expectedValue}
                        onChange={(e) => setExpectedValue(e.target.value)}
                        placeholder="500,000"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Value of Production
                      <span className="block text-xs text-gray-400 font-normal">What you actually harvested (dollar value)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={productionValue}
                        onChange={(e) => setProductionValue(e.target.value)}
                        placeholder="250,000"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Gross Indemnity Received
                      <span className="block text-xs text-gray-400 font-normal">Total crop insurance payout before fees</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={grossIndemnity}
                        onChange={(e) => setGrossIndemnity(e.target.value)}
                        placeholder="75,000"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Premiums &amp; Fees Paid
                      <span className="block text-xs text-gray-400 font-normal">Insurance premiums + administrative fees</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={premiumsPaid}
                        onChange={(e) => setPremiumsPaid(e.target.value)}
                        placeholder="3,500"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2 INPUTS */}
              {isStage2 && stage2LossType !== 'quality' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Expected Value
                      <span className="block text-xs text-gray-400 font-normal">
                        {stage2LossType === 'uncovered'
                          ? 'County expected yield × USDA average price × acres'
                          : 'From your crop insurance guarantee'}
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={s2ExpectedValue}
                        onChange={(e) => setS2ExpectedValue(e.target.value)}
                        placeholder="300,000"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Actual Revenue
                      <span className="block text-xs text-gray-400 font-normal">Dollar value of what you actually produced</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={s2ActualRevenue}
                        onChange={(e) => setS2ActualRevenue(e.target.value)}
                        placeholder="240,000"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isStage2 && stage2LossType === 'quality' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Revenue to Count
                      <span className="block text-xs text-gray-400 font-normal">Total revenue from the affected crop</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={s2RevenueToCount}
                        onChange={(e) => setS2RevenueToCount(e.target.value)}
                        placeholder="200,000"
                        className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Quality Loss Percentage
                      <span className="block text-xs text-gray-400 font-normal">Grade/test weight/damage reduction (%)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={s2QualityLossPct}
                        onChange={(e) => setS2QualityLossPct(e.target.value)}
                        placeholder="15"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Payment Limits ────────────────────────────────── */}
          {receivedIndemnity && !isExcludedState && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">4</span>
                <h2 className="text-lg font-bold text-gray-900">Payment Limits</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Entity Type</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  >
                    {ENTITY_TYPES.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer p-2.5">
                    <input
                      type="checkbox"
                      checked={farmIncomeOver75}
                      onChange={(e) => setFarmIncomeOver75(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">
                      Farm income is 75%+ of my average AGI
                      <span className="block text-xs text-gray-400">Enables increased payment limits (Form FSA-510)</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Your payment limit per year:</span>
                  <span className="font-bold text-gray-900">{formatCurrencyFull(paymentLimit)}</span>
                </div>
                {farmIncomeOver75 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Increased limit requires FSA-510 form with CPA/attorney certification.
                    {isSpecialtyCrop ? ' Specialty crop limit: $900,000/year.' : ' Non-specialty limit: $250,000/year.'}
                  </p>
                )}
                {!farmIncomeOver75 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Default $125,000 limit per person per year (separate limits for {lossYear === '2023' ? '2023' : '2024'}).
                  </p>
                )}
              </div>

              {/* Calculate button */}
              <button
                onClick={handleCheck}
                disabled={!canCheck}
                className={`w-full mt-5 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                  canCheck
                    ? 'bg-[#1B4332] hover:bg-[#0C1F17] text-white shadow-lg shadow-[#1B4332]/20 hover:shadow-xl hover:shadow-[#1B4332]/30 active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Check My SDRP Eligibility &amp; Estimate Payment
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────────────────────────────── */}
      {!hasChecked && (
        <section className="max-w-3xl mx-auto px-6 pb-10">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">$16B</span>
              <span>total funding</span>
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">381K+</span>
              <span>farmers paid (Stage 1)</span>
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">$125K</span>
              <span>default limit/year</span>
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
      {hasChecked && calculation && (
        <section id="sdrp-results" className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs text-gray-500 mb-1">Estimated SDRP Payment</div>
              <div className="text-3xl font-bold text-emerald-700 tabular-nums">
                {formatCurrencyFull(cappedPayment)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isOverLimit ? 'after payment limit' : `Stage ${calculation.stage}`}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500 mb-1">SDRP Stage</div>
              <div className="text-3xl font-bold text-gray-900">{calculation.stage}</div>
              <div className="text-xs text-gray-500 mt-1">
                {calculation.stage === 1 ? 'Insurance indemnity' : `${(calculation as any).lossType ?? 'N/A'} loss`}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500 mb-1">Enrollment Deadline</div>
              <div className="text-lg font-bold text-gray-900">April 30, 2026</div>
              <ResultDeadlineBadge />
            </div>
          </div>

          {/* Over-limit warning */}
          {isOverLimit && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 mt-0.5 flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-base font-bold text-amber-800">
                    You&apos;re leaving {formatCurrencyFull(lostToLimit)} on the table
                  </p>
                  <p className="text-sm text-amber-700 mt-1.5">
                    Your calculated payment of {formatCurrencyFull(calculation.finalPayment)} exceeds the {formatCurrencyFull(paymentLimit)} payment limit.
                    {!farmIncomeOver75 && (
                      <> If farm income is 75%+ of your average AGI, filing <strong>Form FSA-510</strong> could increase your limit to {isSpecialtyCrop ? '$900,000' : '$250,000'} per year.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Breakdown Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Payment Calculation Breakdown</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                SDRP Stage {calculation.stage} · {lossYear} crop year · SDRP Factor: {(calculation.sdrpFactor * 100).toFixed(1)}%
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {calculation.stage === 1 && 'expectedValue' in calculation && (
                <>
                  <Row label="Expected Value" value={formatCurrencyFull(calculation.expectedValue)} />
                  <Row label={`× SDRP Factor (${(calculation.sdrpFactor * 100).toFixed(1)}%)`} value={formatCurrencyFull(calculation.sdrpLiability)} sub />
                  <Row label="= SDRP Liability" value={formatCurrencyFull(calculation.sdrpLiability)} bold />
                  <Row label="− Value of Production" value={formatCurrencyFull(calculation.productionValue)} />
                  <Row label="= Gross SDRP Amount" value={formatCurrencyFull(calculation.grossSdrpAmount)} bold />
                  <Row label={`− Net Indemnity ($${(calculation.grossIndemnity).toLocaleString()} − $${(calculation.premiumsPaid).toLocaleString()})`} value={formatCurrencyFull(calculation.netIndemnity)} />
                  <Row label="= Pre-factor Payment" value={formatCurrencyFull(calculation.preFactor)} bold />
                  <Row label="× 35% Payment Factor" value="" sub />
                  {calculation.share < 1 && <Row label={`× ${(calculation.share * 100).toFixed(0)}% Producer Share`} value="" sub />}
                  <Row label="Calculated SDRP Payment" value={formatCurrencyFull(calculation.finalPayment)} bold green />
                  {calculation.cappedBy90 && (
                    <Row label="90% cap applied (SDRP + insurance ≤ 90% of loss)" value="" sub warning />
                  )}
                  {isOverLimit && (
                    <Row label={`Payment limit reduction (−${formatCurrencyFull(lostToLimit)})`} value="" sub warning />
                  )}
                  {isOverLimit && (
                    <Row label="Your Estimated SDRP Payment" value={formatCurrencyFull(cappedPayment)} bold green />
                  )}
                </>
              )}

              {calculation.stage === 2 && 'lossType' in calculation && calculation.lossType !== 'quality' && 'expectedValue' in calculation && (
                <>
                  <Row label="Expected Value" value={formatCurrencyFull((calculation as any).expectedValue)} />
                  <Row label={`× SDRP Factor (${(calculation.sdrpFactor * 100).toFixed(1)}%)`} value={formatCurrencyFull((calculation as any).sdrpLiability)} sub />
                  <Row label="= SDRP Liability" value={formatCurrencyFull((calculation as any).sdrpLiability)} bold />
                  <Row label="− Actual Revenue" value={formatCurrencyFull((calculation as any).actualRevenue)} />
                  <Row label="= Loss Gap" value={formatCurrencyFull((calculation as any).gap)} bold />
                  <Row label="× 35% Payment Factor" value="" sub />
                  {calculation.share < 1 && <Row label={`× ${(calculation.share * 100).toFixed(0)}% Producer Share`} value="" sub />}
                  <Row label="Your Estimated SDRP Payment" value={formatCurrencyFull(cappedPayment)} bold green />
                </>
              )}

              {calculation.stage === 2 && 'lossType' in calculation && calculation.lossType === 'quality' && (
                <>
                  <Row label="Revenue to Count" value={formatCurrencyFull((calculation as any).revenueToCount)} />
                  <Row label={`× Quality Loss (${((calculation as any).qualityLossPct * 100).toFixed(1)}%)`} value={formatCurrencyFull((calculation as any).qualityLossAmount)} sub />
                  <Row label="= Quality Loss Amount" value={formatCurrencyFull((calculation as any).qualityLossAmount)} bold />
                  <Row label="× 35% Payment Factor" value="" sub />
                  {calculation.share < 1 && <Row label={`× ${(calculation.share * 100).toFixed(0)}% Producer Share`} value="" sub />}
                  <Row label="Your Estimated SDRP Payment" value={formatCurrencyFull(cappedPayment)} bold green />
                </>
              )}
            </div>
          </div>

          {/* Insurance purchase requirement warning */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800">Insurance Purchase Requirement</p>
                <p className="text-sm text-blue-700 mt-1">
                  All SDRP recipients must purchase crop insurance or NAP at 60%+ coverage for the next two crop years. Failure requires full repayment with interest.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="rounded-xl bg-gradient-to-r from-[#0C1F17] to-[#1B4332] p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">
              Save Your Results — Create a Free Account
            </h3>
            <p className="text-sm text-gray-300 mb-4 max-w-lg mx-auto">
              Get deadline alerts, track your payments across all USDA programs, and access our full suite of farm optimization tools. Free 14-day Pro trial — no credit card required.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C9A84C] hover:bg-[#E2C366] text-[#0C1F17] text-sm font-bold transition-colors"
              >
                Create Free Account
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
              >
                Scan All 12 USDA Programs
              </Link>
            </div>
          </div>

          {/* How to Apply */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">How to Apply for SDRP</h3>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: isStage1 ? 'Check Your Mailbox for FSA-526' : 'Complete Form FSA-504',
                  desc: isStage1
                    ? 'FSA mails pre-filled applications to eligible producers. You cannot alter the pre-filled data. Review it and sign.'
                    : 'Stage 2 requires a separate application form FSA-504. Download it from fsa.usda.gov or get it from your local FSA office.',
                },
                {
                  step: 2,
                  title: 'Visit Your Local FSA Office',
                  desc: 'Bring your signed application, photo ID, and supporting documentation. For quality losses, bring evidence (grade sheets, test weight reports).',
                },
                {
                  step: 3,
                  title: 'Submit by April 30, 2026',
                  desc: `You have ${getDaysUntilDeadline()} days remaining. Late applications cannot be accepted. Both Stage 1 and Stage 2 share this deadline.`,
                },
                {
                  step: 4,
                  title: 'Purchase Insurance for Next 2 Crop Years',
                  desc: 'SDRP requires you to buy crop insurance or NAP at 60%+ coverage for the next two available crop years. Contact your crop insurance agent.',
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <a
                href="https://www.fsa.usda.gov/resources/programs/supplemental-disaster-relief-program-sdrp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                SDRP at FSA.gov
              </a>
              <a
                href="https://offices.sc.egov.usda.gov/locator/app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Find Your FSA Office
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── SDRP Factor Table (always visible) ───────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">SDRP Factor by Coverage Level</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Higher coverage = higher SDRP factor = larger payment. The factor determines what percentage of expected value becomes your SDRP liability.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left font-semibold text-gray-700">Coverage Level</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-700">SDRP Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {INSURANCE_SDRP_FACTORS.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-2.5 text-gray-800">{f.label}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{(f.factor * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-amber-50/50">
                  <td className="px-5 py-2.5 text-gray-800">Uninsured / Not Covered</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-amber-700 tabular-nums">{(UNINSURED_FACTOR * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Source: 7 CFR Part 760 Subpart V — Supplemental Disaster Relief Program. NAP coverage levels use a separate scale.
            </p>
          </div>
        </div>
      </section>

      {/* ── Qualifying Disasters ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">What Disasters Qualify for SDRP?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUALIFYING_DISASTERS.map((d, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                  d.qualifies
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-red-50 text-red-700 line-through decoration-red-400'
                }`}
              >
                <span>{d.icon}</span>
                <span className="font-medium">{d.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs text-gray-600">
              <strong>Drought criteria:</strong> County must be rated D2 (Severe) for 8+ consecutive weeks or D3+ (Extreme/Exceptional) for any period during the crop year. Check the{' '}
              <a href="https://droughtmonitor.unl.edu/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">U.S. Drought Monitor</a>.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              <strong>Note:</strong> Hail alone does not qualify. Hail associated with a qualifying event (hurricane, severe storm) is eligible.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
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

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Estimates are for informational purposes only. Actual SDRP payments depend on final FSA determinations, RMA indemnity data, and applicable payment limitations. Stage 1 payments use pre-filled FSA data that cannot be altered. This tool is not affiliated with or endorsed by USDA, FSA, or RMA. Program rules per 7 CFR Part 760 Subpart V, 90 FR 30561 (Stage 1), and 90 FR 51956 (Stage 2). Consult your local FSA office for official eligibility determination.
        </p>
      </section>
    </div>
  );
}

// ─── Table Row Helper ────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
  sub,
  green,
  warning,
}: {
  label: string;
  value: string;
  bold?: boolean;
  sub?: boolean;
  green?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-2.5 ${bold ? 'bg-gray-50' : ''} ${warning ? 'bg-amber-50' : ''}`}>
      <span className={`text-sm ${sub ? 'text-gray-500 pl-4' : bold ? 'font-semibold text-gray-900' : 'text-gray-700'} ${warning ? 'text-amber-700' : ''}`}>
        {label}
      </span>
      {value && (
        <span className={`text-sm tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${green ? 'text-emerald-700' : warning ? 'text-amber-700' : 'text-gray-900'}`}>
          {value}
        </span>
      )}
    </div>
  );
}
