// =============================================================================
// HarvestFile — Payment Narrative Bridge (County Pages)
// Build 8 Deploy 2: Price-to-Payment Context
//
// A single dynamic sentence between the grain bids and ARC/PLC analysis
// that connects LIVE commodity prices to program payment likelihood.
// This is the insight no university spreadsheet provides.
//
// Example output:
// "Corn is currently trading at $4.62/bu. The PLC effective reference
//  price is $4.42/bu — corn is $0.20 above, PLC payments are unlikely
//  this crop year."
//
// Fetches current prices from /api/prices/futures (same endpoint as
// Morning Dashboard). Renders as a subtle banner between grain bids
// and the ARC/PLC data tables.
// =============================================================================

'use client';

import { useState, useEffect } from 'react';

// ── OBBBA Parameters ────────────────────────────────────────────────────

interface CropConfig {
  code: string;
  name: string;
  effectiveRefPrice: number;
  statutoryRefPrice: number;
  loanRate: number;
  unit: string;
}

const SUPPORTED_CROPS: CropConfig[] = [
  { code: 'CORN', name: 'Corn', effectiveRefPrice: 4.42, statutoryRefPrice: 4.10, loanRate: 2.20, unit: 'bu' },
  { code: 'SOYBEANS', name: 'Soybeans', effectiveRefPrice: 10.71, statutoryRefPrice: 10.00, loanRate: 6.20, unit: 'bu' },
  { code: 'WHEAT', name: 'Wheat', effectiveRefPrice: 6.35, statutoryRefPrice: 6.35, loanRate: 3.38, unit: 'bu' },
];

// ── Generate Narrative ──────────────────────────────────────────────────

interface CropNarrative {
  crop: CropConfig;
  price: number;
  diff: number;
  isAbove: boolean;
  plcRate: number;
  statusColor: string;
  statusBg: string;
  message: string;
}

function generateNarrative(crop: CropConfig, price: number): CropNarrative {
  const diff = price - crop.effectiveRefPrice;
  const isAbove = diff >= 0;
  const absDiff = Math.abs(diff);
  const plcRate = Math.max(0, crop.effectiveRefPrice - Math.max(price, crop.loanRate));

  let message: string;
  let statusColor: string;
  let statusBg: string;

  if (isAbove && diff > crop.effectiveRefPrice * 0.10) {
    // Well above ERP — no payment
    message = `${crop.name} is $${absDiff.toFixed(2)} above the effective reference price — PLC payments are very unlikely this crop year.`;
    statusColor = 'text-emerald-700';
    statusBg = 'bg-emerald-50 border-emerald-200';
  } else if (isAbove) {
    // Slightly above ERP
    message = `${crop.name} is $${absDiff.toFixed(2)} above the effective reference price — PLC payments are unlikely unless prices decline before marketing year end.`;
    statusColor = 'text-emerald-700';
    statusBg = 'bg-emerald-50 border-emerald-200';
  } else if (absDiff < crop.effectiveRefPrice * 0.03) {
    // Very close to ERP (within ~3%)
    message = `${crop.name} is within $${absDiff.toFixed(2)} of the effective reference price — PLC payments are possible. Small price movements could trigger or eliminate payments.`;
    statusColor = 'text-amber-700';
    statusBg = 'bg-amber-50 border-amber-200';
  } else {
    // Below ERP — payment triggered
    message = `${crop.name} is $${absDiff.toFixed(2)} below the effective reference price — PLC would pay an estimated $${plcRate.toFixed(2)}/${crop.unit} on payment yield acres.`;
    statusColor = 'text-red-700';
    statusBg = 'bg-red-50/70 border-red-200';
  }

  return { crop, price, diff, isAbove, plcRate, statusColor, statusBg, message };
}

// ── Component ────────────────────────────────────────────────────────────

interface PaymentNarrativeProps {
  /** Filter to specific crops relevant to this county */
  crops?: string[];
}

export function PaymentNarrative({ crops }: PaymentNarrativeProps) {
  const [narratives, setNarratives] = useState<CropNarrative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices/futures?commodities=CORN,SOYBEANS,WHEAT&days=1');
        if (!res.ok) throw new Error('Price fetch failed');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error('No data');

        const results: CropNarrative[] = [];
        for (const crop of SUPPORTED_CROPS) {
          // Filter to county-relevant crops if specified
          if (crops && crops.length > 0) {
            const match = crops.some(
              (c) => c.toUpperCase().includes(crop.code) || crop.code.includes(c.toUpperCase())
            );
            if (!match) continue;
          }

          const priceData = json.data[crop.code];
          const price = priceData?.latestSettle;
          if (price && price > 0) {
            results.push(generateNarrative(crop, price));
          }
        }

        setNarratives(results);
      } catch {
        // Silently fail — this is an enhancement, not critical
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, [crops]);

  if (loading || narratives.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm overflow-hidden mb-8">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 7-8.5 8.5-5-5L2 17" />
          <path d="M16 7h6v6" />
        </svg>
        <h3 className="text-[13px] font-bold text-[#1B4332]">
          Live Price vs. Payment Threshold
        </h3>
        <span className="text-[10px] text-gray-400 ml-auto">
          Updated with latest futures
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {narratives.map((n) => (
          <div key={n.crop.code} className="px-5 py-3.5 flex items-start gap-3">
            {/* Status indicator */}
            <div className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
              n.isAbove ? 'bg-emerald-500' :
              n.plcRate > 0 ? 'bg-red-500' : 'bg-amber-500'
            }`} />

            {/* Narrative text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-bold text-gray-800">
                  {n.crop.name}
                </span>
                <span className="text-[12px] font-semibold text-gray-500 tabular-nums">
                  ${n.price.toFixed(2)}/{n.crop.unit}
                </span>
                <span className="text-[10px] text-gray-300">vs</span>
                <span className="text-[12px] font-semibold text-gray-500 tabular-nums">
                  ${n.crop.effectiveRefPrice.toFixed(2)} ERP
                </span>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                {n.message}
              </p>
            </div>

            {/* Price difference badge */}
            <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${n.statusBg} ${n.statusColor}`}>
              {n.isAbove ? '+' : ''}{n.diff.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-2.5 bg-gray-50/50 border-t border-gray-100">
        <p className="text-[9px] text-gray-400 leading-relaxed">
          ERP = Effective Reference Price under OBBBA. PLC payments trigger when MYA price falls below the ERP.
          Current prices are CME futures-based estimates and may differ from final Marketing Year Average.
        </p>
      </div>
    </div>
  );
}
