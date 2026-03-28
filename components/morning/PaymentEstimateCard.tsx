// =============================================================================
// HarvestFile — Payment Estimate Card (Morning Dashboard Hero Metric)
// Build 8 Deploy 1: The "Credit Karma Score" of Agriculture
//
// This is THE card that makes farmers come back every single morning.
// Shows estimated 2026 ARC/PLC payments per acre for corn, soybeans, wheat
// based on LIVE commodity futures prices. Updates every time prices change.
//
// For anonymous users: national-average estimates using OBBBA parameters.
// For authenticated users (future): personalized with their county + base acres.
//
// Architecture: Pure client component. Receives price data from parent.
// No server dependencies — all calculation logic is inline for speed.
// =============================================================================

'use client';

import { useMemo } from 'react';
import Link from 'next/link';

// ── OBBBA Reference Prices & National Avg Yields ────────────────────────
// These are the EXACT parameters from OBBBA §1101–§1103 and FSA Fact Sheet.
// Used for "quick estimate" when we don't have county-specific data.

interface CropEstimate {
  code: string;
  name: string;
  unit: string;
  /** OBBBA Statutory Reference Price */
  statutoryRefPrice: number;
  /** OBBBA Effective Reference Price (with ERP escalator) */
  effectiveRefPrice: number;
  /** National average county yield (proxy for benchmark) */
  nationalAvgYield: number;
  /** Loan rate floor */
  loanRate: number;
  /** Color for UI */
  color: string;
  /** Typical base acres for a mid-size operation */
  typicalBaseAcres: number;
}

const CROPS: CropEstimate[] = [
  {
    code: 'CORN',
    name: 'Corn',
    unit: 'bu',
    statutoryRefPrice: 4.10,
    effectiveRefPrice: 4.42,
    nationalAvgYield: 177,
    loanRate: 2.20,
    color: '#F59E0B',
    typicalBaseAcres: 250,
  },
  {
    code: 'SOYBEANS',
    name: 'Soybeans',
    unit: 'bu',
    statutoryRefPrice: 10.00,
    effectiveRefPrice: 10.71,
    nationalAvgYield: 51,
    loanRate: 6.20,
    color: '#059669',
    typicalBaseAcres: 200,
  },
  {
    code: 'WHEAT',
    name: 'Wheat',
    unit: 'bu',
    statutoryRefPrice: 6.35,
    effectiveRefPrice: 6.35,
    nationalAvgYield: 52,
    loanRate: 3.38,
    color: '#D97706',
    typicalBaseAcres: 50,
  },
];

// OBBBA Constants
const ARC_GUARANTEE_PCT = 0.90;
const ARC_PAYMENT_CAP_PCT = 0.12;
const PAYMENT_ACRES_PCT = 0.85;
const SEQUESTRATION_PCT = 0.059;
const PLC_YIELD_FRACTION = 0.80;

// ── PLC Payment Calculation ─────────────────────────────────────────────

function calcPlcPerAcre(
  currentPrice: number,
  erp: number,
  loanRate: number,
  benchmarkYield: number,
): number {
  const plcRate = Math.max(0, erp - Math.max(currentPrice, loanRate));
  const plcPaymentYield = benchmarkYield * PLC_YIELD_FRACTION;
  return plcRate * plcPaymentYield * PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT);
}

// ── ARC-CO Payment Estimate (simplified national average) ───────────────

function calcArcPerAcre(
  currentPrice: number,
  benchmarkYield: number,
  benchmarkPrice: number,
): number {
  const benchmarkRevenue = benchmarkYield * benchmarkPrice;
  const guarantee = ARC_GUARANTEE_PCT * benchmarkRevenue;
  const maxPayment = ARC_PAYMENT_CAP_PCT * benchmarkRevenue;
  const actualRevenue = benchmarkYield * Math.max(currentPrice, 2.0); // use yield at current price
  const shortfall = Math.max(0, guarantee - actualRevenue);
  const paymentRate = Math.min(shortfall, maxPayment);
  return paymentRate * PAYMENT_ACRES_PCT * (1 - SEQUESTRATION_PCT);
}

// ── Props ────────────────────────────────────────────────────────────────

interface PriceData {
  latestSettle: number | null;
  change: number | null;
  changePct: number | null;
}

interface PaymentEstimateCardProps {
  prices: Record<string, PriceData>;
  loading?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────

export function PaymentEstimateCard({ prices, loading }: PaymentEstimateCardProps) {
  const estimates = useMemo(() => {
    if (!prices || Object.keys(prices).length === 0) return null;

    let totalPaymentEstimate = 0;
    let totalBaseAcres = 0;
    let previousTotalEstimate = 0;
    const cropEstimates: Array<{
      crop: CropEstimate;
      currentPrice: number;
      plcPerAcre: number;
      arcPerAcre: number;
      bestPerAcre: number;
      bestProgram: string;
      totalPayment: number;
      dailyChange: number;
      status: 'paying' | 'near' | 'above';
    }> = [];

    for (const crop of CROPS) {
      const priceData = prices[crop.code];
      const currentPrice = priceData?.latestSettle ?? null;
      if (currentPrice === null) continue;

      const plcPerAcre = calcPlcPerAcre(
        currentPrice,
        crop.effectiveRefPrice,
        crop.loanRate,
        crop.nationalAvgYield,
      );

      const arcPerAcre = calcArcPerAcre(
        currentPrice,
        crop.nationalAvgYield,
        crop.effectiveRefPrice, // Use ERP as benchmark price proxy
      );

      const bestPerAcre = Math.max(plcPerAcre, arcPerAcre);
      const bestProgram = plcPerAcre >= arcPerAcre ? 'PLC' : 'ARC-CO';
      const totalPayment = bestPerAcre * crop.typicalBaseAcres;

      // Estimate previous day's payment for daily change
      const prevPrice = currentPrice - (priceData?.change ?? 0);
      const prevPlc = calcPlcPerAcre(prevPrice, crop.effectiveRefPrice, crop.loanRate, crop.nationalAvgYield);
      const prevArc = calcArcPerAcre(prevPrice, crop.nationalAvgYield, crop.effectiveRefPrice);
      const prevBest = Math.max(prevPlc, prevArc);
      const prevTotal = prevBest * crop.typicalBaseAcres;

      const status: 'paying' | 'near' | 'above' =
        bestPerAcre > 0.50 ? 'paying' :
        currentPrice < crop.effectiveRefPrice * 1.05 ? 'near' : 'above';

      cropEstimates.push({
        crop,
        currentPrice,
        plcPerAcre,
        arcPerAcre,
        bestPerAcre,
        bestProgram,
        totalPayment,
        dailyChange: totalPayment - prevTotal,
        status,
      });

      totalPaymentEstimate += totalPayment;
      totalBaseAcres += crop.typicalBaseAcres;
      previousTotalEstimate += prevTotal;
    }

    const dailyTotalChange = totalPaymentEstimate - previousTotalEstimate;

    return {
      total: totalPaymentEstimate,
      dailyChange: dailyTotalChange,
      totalBaseAcres,
      crops: cropEstimates,
    };
  }, [prices]);

  // ── Loading State ─────────────────────────────────────────────────────
  if (loading || !estimates) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-[#0C1F17] to-[#1B4332] p-6 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
            <div className="w-48 h-4 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="w-40 h-10 rounded-lg bg-white/10 animate-pulse mb-3" />
          <div className="w-64 h-3 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  const isPaymentLikely = estimates.total > 50;
  const changeIsUp = estimates.dailyChange >= 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-[#0C1F17] via-[#142B20] to-[#1B4332] shadow-lg overflow-hidden relative">
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E2C366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <h2 className="text-sm font-bold text-white/90 tracking-tight">
              Estimated 2026 Farm Payment
            </h2>
          </div>
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
            Live Estimate
          </span>
        </div>

        {/* Hero Number */}
        <div className="mb-1">
          <span className="text-[42px] sm:text-[48px] font-extrabold text-white tracking-[-0.04em] leading-none">
            ${Math.round(estimates.total).toLocaleString()}
          </span>
        </div>

        {/* Daily Change + Context */}
        <div className="flex items-center gap-3 mb-5">
          {Math.abs(estimates.dailyChange) >= 1 && (
            <span className={`text-sm font-bold ${
              changeIsUp ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {changeIsUp ? '▲' : '▼'} ${Math.abs(Math.round(estimates.dailyChange)).toLocaleString()} today
            </span>
          )}
          <span className="text-[11px] text-white/30">
            on {estimates.totalBaseAcres} est. base acres
          </span>
        </div>

        {/* Per-Crop Breakdown */}
        <div className="space-y-2.5 mb-5">
          {estimates.crops.map((est) => {
            const pctOfRef = ((est.crop.effectiveRefPrice - est.currentPrice) / est.crop.effectiveRefPrice * 100);

            return (
              <div key={est.crop.code} className="flex items-center gap-3">
                {/* Crop indicator */}
                <div
                  className="w-1.5 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: est.crop.color, opacity: est.status === 'above' ? 0.3 : 1 }}
                />

                {/* Crop info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white/80">
                      {est.crop.name}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      est.status === 'paying'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : est.status === 'near'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/5 text-white/30'
                    }`}>
                      {est.status === 'paying'
                        ? `${est.bestProgram} $${est.bestPerAcre.toFixed(0)}/ac`
                        : est.status === 'near'
                        ? `${pctOfRef.toFixed(0)}% below ERP`
                        : 'Above ERP'}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/25 mt-0.5">
                    ${est.currentPrice.toFixed(2)}/{est.crop.unit} vs ${est.crop.effectiveRefPrice.toFixed(2)} ERP
                  </div>
                </div>

                {/* Payment amount */}
                <div className="text-right flex-shrink-0">
                  <span className={`text-[15px] font-extrabold tabular-nums ${
                    est.totalPayment > 50 ? 'text-white' : 'text-white/25'
                  }`}>
                    ${Math.round(est.totalPayment).toLocaleString()}
                  </span>
                  {Math.abs(est.dailyChange) >= 1 && (
                    <span className={`block text-[10px] font-semibold tabular-nums ${
                      est.dailyChange >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'
                    }`}>
                      {est.dailyChange >= 0 ? '+' : ''}{Math.round(est.dailyChange).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href="/check"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] text-[13px] font-bold hover:shadow-lg hover:shadow-amber-500/15 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          Personalize with your county &amp; acres
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>

        {/* Disclaimer */}
        <p className="text-[9px] text-white/15 text-center mt-3 leading-relaxed">
          Estimate based on national avg yields, {estimates.totalBaseAcres} assumed base acres, OBBBA reference prices, and current futures. Not financial advice.
        </p>
      </div>
    </div>
  );
}
