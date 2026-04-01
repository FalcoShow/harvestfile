// =============================================================================
// HarvestFile — Build 18 Deploy 3: Historical Payments Table
// app/(marketing)/check/components/historical/HistoricalTable.tsx
//
// Year-by-year data table showing ARC-CO vs PLC per-acre payments with:
//   - Winner column: colored pill badge with checkmark
//   - Alternating row backgrounds: #0C1F17 / #132A1F
//   - 48px minimum row height for farmer touch targets
//   - Right-aligned dollar amounts, center-aligned year and winner
//   - Muted text for $0.00 values (not blank — confirms data exists)
//   - "Estimated" badge for years where MYA prices aren't finalized
//   - 2025 OBBBA indicator with info tooltip
//
// The table is the "trust builder" — farmers will cross-reference these
// numbers against their FSA office statements. Accuracy is paramount.
// =============================================================================

'use client';

import type { HistoricalPaymentYear } from '@/lib/stores/farm-store';

interface HistoricalTableProps {
  data: HistoricalPaymentYear[];
}

function WinnerBadge({ winner }: { winner: 'ARC-CO' | 'PLC' | 'TIE' }) {
  if (winner === 'TIE') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          color: 'rgba(255, 255, 255, 0.3)',
        }}
      >
        Tie
      </span>
    );
  }

  const isArc = winner === 'ARC-CO';
  const color = isArc ? '#C9A84C' : '#34D399';

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{
        background: `${color}15`,
        color: color,
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {winner}
    </span>
  );
}

export default function HistoricalTable({ data }: HistoricalTableProps) {
  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* Table header */}
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'minmax(70px, 1fr) minmax(90px, 1.2fr) minmax(90px, 1.2fr) minmax(90px, 1.2fr) minmax(80px, 1fr)',
          background: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <div className="px-3 sm:px-4 py-3 text-[11px] font-bold text-white/25 uppercase tracking-wider" style={{ background: '#0C1F17' }}>
          Year
        </div>
        <div className="px-3 sm:px-4 py-3 text-[11px] font-bold text-[#C9A84C]/50 uppercase tracking-wider text-right" style={{ background: '#0C1F17' }}>
          ARC-CO
        </div>
        <div className="px-3 sm:px-4 py-3 text-[11px] font-bold text-[#34D399]/50 uppercase tracking-wider text-right" style={{ background: '#0C1F17' }}>
          PLC
        </div>
        <div className="px-3 sm:px-4 py-3 text-[11px] font-bold text-white/25 uppercase tracking-wider text-right hidden sm:block" style={{ background: '#0C1F17' }}>
          Diff
        </div>
        <div className="px-3 sm:px-4 py-3 text-[11px] font-bold text-white/25 uppercase tracking-wider text-center" style={{ background: '#0C1F17' }}>
          Winner
        </div>
      </div>

      {/* Table rows */}
      {data.map((row, idx) => {
        const isEven = idx % 2 === 0;
        const diff = Math.abs(row.arcPerAcre - row.plcPerAcre);
        const isZeroYear = row.arcPerAcre === 0 && row.plcPerAcre === 0;
        const rowBg = isEven ? '#0C1F17' : '#132A1F';

        return (
          <div
            key={row.cropYear}
            className="grid gap-px items-center min-h-[48px]"
            style={{
              gridTemplateColumns: 'minmax(70px, 1fr) minmax(90px, 1.2fr) minmax(90px, 1.2fr) minmax(90px, 1.2fr) minmax(80px, 1fr)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            {/* Year */}
            <div
              className="px-3 sm:px-4 py-3 flex items-center gap-1.5"
              style={{ background: rowBg }}
            >
              <span className="text-[14px] sm:text-[15px] font-semibold text-white/70 tabular-nums">
                {row.cropYear}
              </span>
              {row.dataStatus === 'estimated' && (
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(201, 168, 76, 0.1)',
                    color: 'rgba(201, 168, 76, 0.6)',
                  }}
                >
                  Est.
                </span>
              )}
              {row.cropYear === 2025 && (
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(201, 168, 76, 0.08)',
                    color: 'rgba(201, 168, 76, 0.5)',
                  }}
                  title="OBBBA: Farmers receive the higher of ARC-CO or PLC for 2025"
                >
                  OBBBA
                </span>
              )}
            </div>

            {/* ARC-CO per acre */}
            <div
              className="px-3 sm:px-4 py-3 text-right"
              style={{ background: rowBg }}
            >
              <span
                className="text-[14px] sm:text-[15px] font-semibold tabular-nums"
                style={{
                  color:
                    row.winner === 'ARC-CO'
                      ? '#C9A84C'
                      : isZeroYear
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.5)',
                }}
              >
                ${row.arcPerAcre.toFixed(2)}
              </span>
            </div>

            {/* PLC per acre */}
            <div
              className="px-3 sm:px-4 py-3 text-right"
              style={{ background: rowBg }}
            >
              <span
                className="text-[14px] sm:text-[15px] font-semibold tabular-nums"
                style={{
                  color:
                    row.winner === 'PLC'
                      ? '#34D399'
                      : isZeroYear
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.5)',
                }}
              >
                ${row.plcPerAcre.toFixed(2)}
              </span>
            </div>

            {/* Difference (hidden on mobile) */}
            <div
              className="px-3 sm:px-4 py-3 text-right hidden sm:block"
              style={{ background: rowBg }}
            >
              <span
                className="text-[13px] font-medium tabular-nums"
                style={{ color: isZeroYear ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)' }}
              >
                {diff > 0 ? `+$${diff.toFixed(2)}` : '$0.00'}
              </span>
            </div>

            {/* Winner badge */}
            <div
              className="px-3 sm:px-4 py-3 flex justify-center"
              style={{ background: rowBg }}
            >
              {isZeroYear ? (
                <span className="text-[11px] text-white/15 font-medium">
                  No payment
                </span>
              ) : (
                <WinnerBadge winner={row.winner} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
