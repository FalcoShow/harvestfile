// =============================================================================
// HarvestFile — Payment Impact Bridge (Server Component)
// Build 10 Deploy 1: "What Today's Prices Mean for This County"
//
// THE DIFFERENTIATOR. No other platform connects live grain bids to
// ARC/PLC payment projections. This is the narrative bridge that makes
// HarvestFile revolutionary.
//
// This component takes static ARC/PLC data (crop reference prices,
// benchmarks) and renders a contextual explanation of how current
// commodity prices relate to potential payments. It does NOT fetch
// live prices — it provides the framework. The GrainBidCard above it
// provides the live data, and the farmer's brain connects the dots.
//
// For the full live-price-to-payment calculation, we'd need the
// client-side PaymentNarrative component (which already exists).
// This server component provides the static context that makes
// the live data meaningful.
//
// Server Component — no 'use client' directive. Zero JS shipped.
// =============================================================================

import Link from 'next/link';

// ── OBBBA Reference Prices (effective 2025+) ────────────────────────────
// Source: One Big Beautiful Bill Act (H.R. 1), signed July 4, 2025

const OBBBA_REFERENCE_PRICES: Record<string, {
  statutory: number;
  erp: number;
  unit: string;
  arcGuarantee: number; // 90% of benchmark revenue under OBBBA
}> = {
  CORN: { statutory: 4.10, erp: 4.42, unit: 'bu', arcGuarantee: 0.90 },
  SOYBEANS: { statutory: 10.00, erp: 10.71, unit: 'bu', arcGuarantee: 0.90 },
  WHEAT: { statutory: 6.35, erp: 6.87, unit: 'bu', arcGuarantee: 0.90 },
  SORGHUM: { statutory: 4.10, erp: 4.42, unit: 'bu', arcGuarantee: 0.90 },
  OATS: { statutory: 2.80, erp: 3.01, unit: 'bu', arcGuarantee: 0.90 },
  BARLEY: { statutory: 5.60, erp: 6.04, unit: 'bu', arcGuarantee: 0.90 },
};

// ── Types ────────────────────────────────────────────────────────────────

interface CropPriceContext {
  commodity: string;
  displayName: string;
  statutoryRefPrice: number;
  effectiveRefPrice: number;
  unit: string;
  /** Whether PLC payments are likely based on recent MYA trends */
  plcLikely: boolean;
  /** Latest MYA price from crop data if available */
  latestMya?: number;
}

interface PaymentImpactBridgeProps {
  /** County display name */
  countyName: string;
  /** State abbreviation */
  stateAbbr: string;
  /** Crop data from the county — we extract reference prices */
  cropData: Array<{
    commodity_code: string;
    display_name: string;
    statutory_ref_price: number;
    effective_ref_price?: number;
    unit_label: string;
    years: Array<{
      crop_year: number;
      mya_price?: number | null;
      arc_payment_rate?: number | null;
      plc_payment_rate?: number | null;
    }>;
  }>;
  /** County FIPS for link to calculator */
  countyFips: string;
}

// ── Component ────────────────────────────────────────────────────────────

export function PaymentImpactBridge({
  countyName,
  stateAbbr,
  cropData,
  countyFips,
}: PaymentImpactBridgeProps) {
  if (!cropData || cropData.length === 0) return null;

  // Build price context for top 3 crops
  const contexts: CropPriceContext[] = cropData.slice(0, 3).map((crop) => {
    const obbba = OBBBA_REFERENCE_PRICES[crop.commodity_code.toUpperCase()];
    const latestYear = crop.years.find((y) => y.mya_price && y.mya_price > 0);

    return {
      commodity: crop.commodity_code,
      displayName: crop.display_name,
      statutoryRefPrice: crop.statutory_ref_price,
      effectiveRefPrice: crop.effective_ref_price || obbba?.erp || crop.statutory_ref_price,
      unit: crop.unit_label,
      plcLikely: latestYear
        ? (latestYear.mya_price || 0) < (crop.effective_ref_price || crop.statutory_ref_price)
        : false,
      latestMya: latestYear?.mya_price || undefined,
    };
  });

  if (contexts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#1B4332] flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5 text-[#E2C366]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-[16px] font-extrabold text-[#1B4332] tracking-tight">
            What Today's Prices Mean for {countyName}
          </h3>
          <p className="text-[11px] text-gray-400 font-medium">
            Live grain bids above connect to program payment projections below
          </p>
        </div>
      </div>

      {/* Price-to-Payment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {contexts.map((ctx) => {
          const erp = ctx.effectiveRefPrice;
          return (
            <div
              key={ctx.commodity}
              className="rounded-xl border border-gray-200/80 bg-white px-4 py-3.5"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400 mb-1.5">
                {ctx.displayName}
              </div>

              {/* Reference Prices */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[10px] text-gray-400">PLC Ref:</span>
                <span className="text-[14px] font-extrabold text-blue-700 tabular-nums">
                  ${ctx.statutoryRefPrice.toFixed(2)}
                </span>
                {erp !== ctx.statutoryRefPrice && (
                  <>
                    <span className="text-[10px] text-gray-300">→</span>
                    <span className="text-[13px] font-bold text-emerald-700 tabular-nums">
                      ${erp.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-semibold">
                      ERP
                    </span>
                  </>
                )}
              </div>

              {/* Payment Signal */}
              <div className="flex items-center gap-1.5">
                {ctx.latestMya ? (
                  ctx.latestMya < ctx.statutoryRefPrice ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[11px] font-semibold text-blue-700">
                        PLC payments triggered
                      </span>
                    </>
                  ) : ctx.latestMya < erp ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-semibold text-emerald-700">
                        ARC-CO payments likely
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      <span className="text-[11px] font-medium text-gray-500">
                        No payments at current prices
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[11px] font-medium text-amber-700">
                      Watch local bids vs. ${ctx.statutoryRefPrice.toFixed(2)}
                    </span>
                  </>
                )}
              </div>

              {/* MYA context if available */}
              {ctx.latestMya && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">
                    Latest MYA: ${ctx.latestMya.toFixed(2)}/{ctx.unit}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanatory text */}
      <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
        <span className="font-semibold text-[#1B4332]">How to read this:</span>{' '}
        When local cash prices (shown in grain bids above) track below the PLC
        reference price, PLC payments are likely. When county revenue drops
        below 90% of the ARC-CO benchmark, ARC-CO payments trigger. Under
        OBBBA, the higher effective reference price (ERP) means ARC-CO
        benchmarks are elevated — potentially favoring ARC-CO in counties with
        strong yields.
      </p>

      {/* CTA */}
      <Link
        href={`/check?county=${encodeURIComponent(countyName)}&state=${stateAbbr}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1B4332] hover:text-emerald-700 transition-colors"
      >
        Run a personalized ARC vs PLC analysis for your farm
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
