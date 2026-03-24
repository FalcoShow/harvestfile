// =============================================================================
// app/(marketing)/grain/_components/PeerContextSidebar.tsx
// HarvestFile — Phase 31 Build 4: Peer Context Sidebar
//
// Collapsible right-side panel showing anonymized county-level ARC/PLC election
// data alongside the Marketing Score. This is the FINAL cross-tool integration
// surface — completing the data layer across AI Advisor, County SEO, Morning
// Dashboard, and now Grain Marketing.
//
// Design: StockTwits sentiment gauge meets FINBIN transparency.
// - 280px wide when open, 48px icon strip when collapsed
// - Fixed position, independently scrollable
// - k ≥ 5 privacy threshold enforced
// - Confidence meter (1–3 bars like cell signal)
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PeerContextData {
  county: {
    county_fips: string;
    county_name: string;
    state_abbr: string;
    state_fips: string;
  };
  commodity: string;
  election: {
    arc_co_pct: number | null;
    plc_pct: number | null;
    total_reporters: number;
    is_visible: boolean;
  };
  insights: {
    dominant: 'ARC-CO' | 'PLC' | 'SPLIT';
    avg_arc_pct: number;
    trend: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE';
    most_recent_arc_pct: number;
    most_recent_year: number;
    summary: string;
  };
  history: Array<{ year: number; arc_pct: number; plc_pct: number }>;
  yoy_change: number | null;
  social_proof: {
    state_this_week: number;
    state_total: number;
    county_total: number;
  };
  confidence_level: 1 | 2 | 3;
  data_scope: 'county' | 'region' | 'state';
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

const SIDEBAR_STATE_KEY = 'harvestfile_grain_sidebar_open';
const CALCULATOR_RESULTS_KEY = 'harvestfile_calculator_results';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCalcResults(): { countyFips: string; commodity: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CALCULATOR_RESULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Try multiple shapes — the calculator stores data in different formats
    const fips = parsed.county_fips || parsed.countyFips || parsed.fips || null;
    const commodity = parsed.commodity || parsed.crop || 'ALL';
    if (fips && /^\d{5}$/.test(fips)) {
      return { countyFips: fips, commodity: commodity.toUpperCase() };
    }
    return null;
  } catch {
    return null;
  }
}

function loadSidebarState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(SIDEBAR_STATE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

function saveSidebarState(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(open));
  } catch {}
}

// ─── Confidence Bars Component ──────────────────────────────────────────────

function ConfidenceBars({ level }: { level: 1 | 2 | 3 }) {
  const labels = ['Low', 'Medium', 'High'];
  const colors = ['#F59E0B', '#10B981', '#10B981'];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-end gap-[2px]">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className="rounded-sm transition-colors"
            style={{
              width: 4,
              height: 6 + bar * 4,
              backgroundColor: bar <= level ? colors[level - 1] : '#E5E7EB',
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold" style={{ color: colors[level - 1] }}>
        {labels[level - 1]}
      </span>
    </div>
  );
}

// ─── Trend Arrow ────────────────────────────────────────────────────────────

function TrendArrow({ direction }: { direction: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE' }) {
  if (direction === 'TOWARD_ARC') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 17 12 12 17 17" /><polyline points="7 7 12 2 17 7" /></svg>
        Trending toward ARC-CO
      </span>
    );
  }
  if (direction === 'TOWARD_PLC') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 7 12 12 7 7" /><polyline points="17 17 12 22 7 17" /></svg>
        Trending toward PLC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      Stable
    </span>
  );
}

// ─── Election Bar ───────────────────────────────────────────────────────────

function ElectionBar({
  arcPct,
  plcPct,
  label,
  year,
}: {
  arcPct: number;
  plcPct: number;
  label?: string;
  year?: number;
}) {
  return (
    <div className="mb-2">
      {(label || year) && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500">{label || year}</span>
          <span className="text-[10px] text-gray-400">{arcPct}% ARC · {plcPct}% PLC</span>
        </div>
      )}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        <div
          className="transition-all duration-700 ease-out"
          style={{
            width: `${arcPct}%`,
            background: 'linear-gradient(90deg, #059669, #10B981)',
          }}
        />
        <div
          className="transition-all duration-700 ease-out"
          style={{
            width: `${plcPct}%`,
            background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
          }}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function PeerContextSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PeerContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasCalcData, setHasCalcData] = useState(false);

  // ── Load sidebar state ────────────────────────────────────────────────
  useEffect(() => {
    setIsOpen(loadSidebarState());
  }, []);

  // ── Fetch peer context data ───────────────────────────────────────────
  useEffect(() => {
    const calcResults = getCalcResults();
    if (!calcResults) {
      setHasCalcData(false);
      return;
    }

    setHasCalcData(true);

    async function fetchPeerContext() {
      const results = getCalcResults();
      if (!results) return;

      setLoading(true);
      try {
        const params = new URLSearchParams({
          county_fips: results.countyFips,
          commodity: results.commodity,
        });
        const res = await fetch(`/api/benchmarks/peer-context?${params}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData(json.data);
          }
        }
      } catch (err) {
        console.error('[PeerSidebar] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPeerContext();
  }, []);

  // ── Toggle handler ────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      saveSidebarState(next);
      return next;
    });
  }, []);

  // ── Don't render if no calculator data ────────────────────────────────
  // The sidebar only appears for users who have run the ARC/PLC calculator,
  // since we need a county FIPS to show peer data.
  if (!hasCalcData && !data) return null;

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ── Collapsed Toggle Button (always visible) ──────────────────── */}
      <button
        onClick={toggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 rounded-l-xl border border-r-0 shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-[#0C1F17] border-emerald-700/30 text-white px-2 py-3'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-4'
        }`}
        title={isOpen ? 'Close peer context' : 'View county peer data'}
      >
        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span className="text-[9px] font-bold leading-tight text-center">
              Peer<br />Data
            </span>
          </div>
        )}
      </button>

      {/* ── Sidebar Panel ─────────────────────────────────────────────── */}
      <div
        className={`fixed right-0 top-0 h-full z-30 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 300 }}
      >
        <div className="h-full bg-white border-l border-gray-200 shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-[#0C1F17] to-[#143026] p-4 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">County Peer Context</h3>
                  <p className="text-[10px] text-white/40">Anonymized election benchmarks</p>
                </div>
              </div>
              <button
                onClick={toggle}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {data && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-semibold">
                  📍 {data.county.county_name}, {data.county.state_abbr}
                </span>
                {data.commodity !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-semibold">
                    🌾 {data.commodity}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-5">
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Loading county data...</p>
              </div>
            )}

            {/* No data state */}
            {!loading && !data && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No County Data Available</p>
                <p className="text-xs text-gray-400 mb-4">
                  Run the ARC/PLC Calculator first to see peer benchmarks for your county.
                </p>
                <Link
                  href="/check"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0C1F17] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Go to Calculator →
                </Link>
              </div>
            )}

            {/* Main content when data is loaded */}
            {!loading && data && (
              <>
                {/* ── ARC/PLC Election Snapshot ─────────────────────────── */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Election Breakdown
                    </span>
                    <ConfidenceBars level={data.confidence_level} />
                  </div>

                  {data.election.is_visible && data.election.arc_co_pct !== null ? (
                    <>
                      {/* Current live data */}
                      <ElectionBar
                        arcPct={data.election.arc_co_pct}
                        plcPct={data.election.plc_pct || 0}
                        label="2026 Live"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-gray-400">
                          {data.election.total_reporters} farmer{data.election.total_reporters !== 1 ? 's' : ''} reported
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-600">
                          USDA DATA + COMMUNITY
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-xs text-gray-500 mb-2">
                        {data.election.total_reporters > 0
                          ? `${data.election.total_reporters} of 5 needed for county visibility`
                          : 'Be the first to share your election choice'}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, (data.election.total_reporters / 5) * 100)}%` }}
                        />
                      </div>
                      <Link
                        href="/check"
                        className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Share your election to unlock county data →
                      </Link>
                    </div>
                  )}
                </div>

                {/* ── Historical Trend ──────────────────────────────────── */}
                {data.history.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Historical Trend
                      </span>
                      <TrendArrow direction={data.insights.trend} />
                    </div>

                    {data.history.map((y) => (
                      <ElectionBar
                        key={y.year}
                        arcPct={y.arc_pct}
                        plcPct={y.plc_pct}
                        year={y.year}
                      />
                    ))}

                    {data.yoy_change !== null && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        {data.yoy_change > 0
                          ? `ARC-CO share increased ${data.yoy_change} pts year-over-year`
                          : data.yoy_change < 0
                          ? `ARC-CO share decreased ${Math.abs(data.yoy_change)} pts year-over-year`
                          : 'ARC-CO share unchanged year-over-year'}
                      </p>
                    )}
                  </div>
                )}

                {/* ── County Insights ──────────────────────────────────── */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                    County Intelligence
                  </span>

                  <div className="space-y-3">
                    {/* Dominant Program */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold ${
                        data.insights.dominant === 'ARC-CO'
                          ? 'bg-emerald-600'
                          : data.insights.dominant === 'PLC'
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      }`}>
                        {data.insights.dominant === 'ARC-CO' ? 'ARC' : data.insights.dominant === 'PLC' ? 'PLC' : '—'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-700">
                          {data.insights.dominant === 'ARC-CO'
                            ? 'ARC-CO Dominant'
                            : data.insights.dominant === 'PLC'
                            ? 'PLC Dominant'
                            : 'Evenly Split'}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Historical avg: {data.insights.avg_arc_pct}% ARC-CO
                        </div>
                      </div>
                    </div>

                    {/* Most Recent Year */}
                    {data.insights.most_recent_year > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-600">
                            {String(data.insights.most_recent_year).slice(-2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700">
                            {data.insights.most_recent_arc_pct}% chose ARC-CO
                          </div>
                          <div className="text-[10px] text-gray-400">
                            In {data.insights.most_recent_year} enrollment
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Social Proof ─────────────────────────────────────── */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">
                    Community Activity
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-gray-900">
                        {data.social_proof.county_total}
                      </div>
                      <div className="text-[10px] text-gray-400">County Reports</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-gray-900">
                        {data.social_proof.state_total}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {data.county.state_abbr} State Total
                      </div>
                    </div>
                  </div>

                  {data.social_proof.state_this_week > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-gray-500">
                        {data.social_proof.state_this_week} farmer{data.social_proof.state_this_week !== 1 ? 's' : ''} in {data.county.state_abbr} reported this week
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Data Scope Notice ────────────────────────────────── */}
                {data.data_scope !== 'county' && (
                  <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    <p className="text-[10px] text-amber-700">
                      Showing {data.data_scope}-level data. Your county needs {Math.max(0, 5 - data.election.total_reporters)} more reports for county-specific benchmarks.
                    </p>
                  </div>
                )}

                {/* ── CTAs ─────────────────────────────────────────────── */}
                <div className="space-y-2 pt-1">
                  <Link
                    href="/check"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0C1F17] to-[#1B4332] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /></svg>
                    Compare Your Election
                  </Link>
                  <Link
                    href="/advisor"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    💬 Ask AI Advisor
                  </Link>
                </div>

                {/* ── Source Attribution ────────────────────────────────── */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[9px] text-gray-300 text-center leading-relaxed">
                    Historical enrollment from USDA FSA public records.
                    Live 2026 data from anonymized HarvestFile community reports.
                    Minimum 5 reports required for county-level visibility.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Backdrop overlay on mobile ────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={toggle}
        />
      )}
    </>
  );
}
