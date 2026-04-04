// =============================================================================
// app/(marketing)/morning/_components/PlantingWindows.tsx
// HarvestFile — Surface 2 Deploy 2B-P2 Final: Planting Readiness Scorecards
//
// DEPLOY 2B-P2 ENHANCEMENT:
//   - Click-to-expand per crop card (collapsed by default)
//   - Collapsed: crop name + confidence % + frost badge + soil ready/not badge
//   - Expanded: soil temp progress, window dates, recommendation text
//   - First crop auto-expanded if soil is ready (most actionable)
//   - Smooth height transition via CSS
//
// Shows crop-specific planting readiness (corn, soybeans, wheat) with:
// - Overall readiness % with traffic-light indicator
// - Soil temp vs needed threshold
// - Frost risk level
// - Days until safe (if not ready)
// - Agronomist-grade recommendation text
//
// Data from /api/weather → planting_windows array.
// =============================================================================

'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlantingWindow {
  crop: string;
  optimal_start: string;
  optimal_end: string;
  soil_temp_ready: boolean;
  soil_temp_current_f: number;
  soil_temp_needed_f: number;
  frost_risk_level: 'low' | 'moderate' | 'high';
  days_until_safe: number;
  confidence: number;
  recommendation: string;
}

interface PlantingWindowsProps {
  windows: PlantingWindow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function confidenceColor(c: number): string {
  if (c >= 70) return 'text-emerald-400';
  if (c >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function confidenceBg(c: number): string {
  if (c >= 70) return 'bg-emerald-500/[0.08] border-emerald-500/15';
  if (c >= 50) return 'bg-amber-500/[0.08] border-amber-500/15';
  return 'bg-red-500/[0.08] border-red-500/15';
}

function frostBadge(level: 'low' | 'moderate' | 'high'): { bg: string; text: string; label: string } {
  if (level === 'low') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Low frost risk' };
  if (level === 'moderate') return { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Moderate frost' };
  return { bg: 'bg-red-500/10', text: 'text-red-400', label: 'High frost risk' };
}

function cropIcon(crop: string): string {
  const c = crop.toLowerCase();
  if (c.includes('corn')) return '🌽';
  if (c.includes('soy')) return '🫘';
  if (c.includes('wheat')) return '🌾';
  if (c.includes('oat')) return '🌿';
  if (c.includes('rice')) return '🍚';
  return '🌱';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlantingWindows({ windows }: PlantingWindowsProps) {
  // Auto-expand the first crop that's soil-ready, or just the first crop
  const defaultExpanded = (() => {
    const readyIdx = windows?.findIndex(w => w.soil_temp_ready);
    return readyIdx !== undefined && readyIdx >= 0 ? readyIdx : 0;
  })();

  const [expandedIdx, setExpandedIdx] = useState<number | null>(defaultExpanded);

  if (!windows || windows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v10" /><path d="M8 6l4-4 4 4" /><path d="M4 22c0-4 4-8 8-10" /><path d="M20 22c0-4-4-8-8-10" />
        </svg>
        <h2 className="text-sm font-semibold text-white/90 tracking-tight">Planting Readiness</h2>
        <span className="text-[10px] text-white/20 ml-auto">Tap to expand</span>
      </div>

      {/* Crop cards */}
      <div className="space-y-3">
        {windows.map((w, i) => {
          const frost = frostBadge(w.frost_risk_level);
          const soilPct = Math.min(100, (w.soil_temp_current_f / w.soil_temp_needed_f) * 100);
          const isExpanded = expandedIdx === i;

          return (
            <div key={i} className={`rounded-xl border ${confidenceBg(w.confidence)} overflow-hidden transition-all duration-300`}>
              {/* Clickable header — always visible */}
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-white/[0.02]"
              >
                <span className="text-base flex-shrink-0">{cropIcon(w.crop)}</span>
                <span className="text-sm font-bold text-white/90 flex-1 min-w-0">{w.crop}</span>

                {/* Compact status indicators */}
                <span className={`text-sm font-bold tabular-nums ${confidenceColor(w.confidence)}`}>
                  {w.confidence}%
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${frost.bg} ${frost.text} flex-shrink-0`}>
                  {frost.label}
                </span>

                {/* Expand chevron */}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Expandable detail section */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isExpanded ? '300px' : '0px',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <div className="px-3.5 pb-3.5 space-y-2.5">
                  {/* Soil temp progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40 font-medium">
                        Soil: {w.soil_temp_current_f.toFixed(1)}°F / {w.soil_temp_needed_f}°F needed
                      </span>
                      {w.soil_temp_ready ? (
                        <span className="text-[10px] font-bold text-emerald-400">Ready</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400">~{w.days_until_safe}d</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${soilPct}%`,
                          background: w.soil_temp_ready
                            ? 'linear-gradient(90deg, #34D399, #22C55E)'
                            : soilPct > 80
                            ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                            : 'linear-gradient(90deg, #60A5FA, #3B82F6)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Window dates */}
                  <div className="text-[10px] text-white/30">
                    Window: {w.optimal_start} – {w.optimal_end}
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-white/50 leading-relaxed">{w.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
