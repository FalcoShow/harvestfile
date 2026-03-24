// =============================================================================
// HarvestFile — Phase 30 Build 1: Election Night Dashboard
// components/elections/ElectionDashboard.tsx
//
// The "CNN Election Night" experience for ARC/PLC elections.
// Wraps the existing ElectionMap with:
//   - National KPI bar with animated counters and live pulse
//   - State leaderboard with completion meters
//   - Live submission activity ticker
//   - "2026 Enrollment" mode vs historical view
//
// Uses SWR for polling leaderboard data (60s intervals).
// Existing ElectionMap handles its own data fetching.
// =============================================================================

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StateData {
  state_fips: string;
  state_abbr: string;
  state_name: string;
  total_submissions: number;
  unique_counties: number;
  total_farming_counties: number;
  completion_pct: number;
  this_week: number;
}

interface LeaderboardResponse {
  states: StateData[];
  national: {
    total_submissions: number;
    total_counties_with_data: number;
    total_farming_counties: number;
    completion_pct: number;
    this_week_submissions: number;
  };
  updated_at: string;
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevValue.current = end;
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Completion Bar ──────────────────────────────────────────────────────────

function CompletionBar({ pct, size = 'sm' }: { pct: number; size?: 'sm' | 'md' }) {
  const height = size === 'md' ? 'h-2' : 'h-1.5';
  const color =
    pct >= 75 ? 'bg-emerald-400' :
    pct >= 40 ? 'bg-amber-400' :
    pct >= 10 ? 'bg-blue-400' :
    'bg-white/20';

  return (
    <div className={`w-full ${height} rounded-full bg-white/[0.06] overflow-hidden`}>
      <div
        className={`${height} rounded-full ${color} transition-all duration-1000 ease-out`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Live Pulse Indicator ────────────────────────────────────────────────────

function LivePulse() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </div>
      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em]">
        Live
      </span>
    </div>
  );
}

// ─── State Flag Emoji (US state abbreviation → flag placeholder) ─────────────

function StateRankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[11px]">🥇</span>;
  if (rank === 2) return <span className="text-[11px]">🥈</span>;
  if (rank === 3) return <span className="text-[11px]">🥉</span>;
  return (
    <span className="text-[10px] font-bold text-white/20 w-4 text-center">
      {rank}
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ElectionDashboardProps {
  children: React.ReactNode; // The ElectionMap component
}

export default function ElectionDashboard({ children }: ElectionDashboardProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [expandedState, setExpandedState] = useState<string | null>(null);

  // ── Fetch leaderboard data ──────────────────────────────────────────
  const { data: leaderboard, isLoading } = useSWR<LeaderboardResponse>(
    '/api/benchmarks/leaderboard',
    fetcher,
    {
      refreshInterval: 60_000, // Poll every 60 seconds
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    }
  );

  const national = leaderboard?.national;
  const states = leaderboard?.states || [];
  const topStates = states.slice(0, 15);
  const activeStates = states.filter(s => s.this_week > 0);

  return (
    <div className="space-y-6">
      {/* ═══ NATIONAL KPI BAR ═══ */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />

        <div className="p-5 sm:p-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <LivePulse />
              <h2 className="text-[13px] font-extrabold text-white/60 uppercase tracking-[0.1em]">
                2026 Election Benchmark
              </h2>
            </div>
            <div className="text-[10px] text-white/15">
              {leaderboard?.updated_at
                ? `Updated ${new Date(leaderboard.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {/* Farmers Reporting */}
            <div className="text-center">
              <div className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight leading-none">
                {isLoading ? (
                  <div className="h-9 w-20 mx-auto rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <AnimatedCounter value={national?.total_submissions || 0} />
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] text-white/25 font-semibold uppercase tracking-wider mt-1.5">
                Farmers Reporting
              </div>
            </div>

            {/* Counties With Data */}
            <div className="text-center">
              <div className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight leading-none">
                {isLoading ? (
                  <div className="h-9 w-16 mx-auto rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <AnimatedCounter value={national?.total_counties_with_data || 0} />
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] text-white/25 font-semibold uppercase tracking-wider mt-1.5">
                Counties Reporting
              </div>
            </div>

            {/* National Completion */}
            <div className="text-center">
              <div className="text-[28px] sm:text-[36px] font-extrabold tracking-tight leading-none">
                {isLoading ? (
                  <div className="h-9 w-14 mx-auto rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <span
                    className="text-transparent bg-clip-text"
                    style={{
                      backgroundImage:
                        (national?.completion_pct || 0) >= 50
                          ? 'linear-gradient(135deg, #10b981, #34d399)'
                          : (national?.completion_pct || 0) >= 20
                          ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(135deg, #60a5fa, #93c5fd)',
                    }}
                  >
                    <AnimatedCounter value={national?.completion_pct || 0} suffix="%" />
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] text-white/25 font-semibold uppercase tracking-wider mt-1.5">
                National Coverage
              </div>
            </div>

            {/* This Week */}
            <div className="text-center">
              <div className="text-[28px] sm:text-[36px] font-extrabold text-emerald-400 tracking-tight leading-none">
                {isLoading ? (
                  <div className="h-9 w-12 mx-auto rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <>
                    <AnimatedCounter value={national?.this_week_submissions || 0} />
                  </>
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] text-white/25 font-semibold uppercase tracking-wider mt-1.5">
                This Week
              </div>
            </div>
          </div>

          {/* National completion bar */}
          <div className="mt-5">
            <CompletionBar pct={national?.completion_pct || 0} size="md" />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-white/15">
                {national?.total_counties_with_data || 0} of {national?.total_farming_counties || 0} farming counties
              </span>
              <span className="text-[10px] text-white/15">
                Goal: 100% county coverage
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAP + SIDEBAR LAYOUT ═══ */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map — takes most of the width */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Sidebar — State Leaderboard */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden sticky top-24">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px]">🏆</span>
                <h3 className="text-[12px] font-extrabold text-white/50 uppercase tracking-[0.1em]">
                  State Leaderboard
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
              >
                {showLeaderboard ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showLeaderboard && (
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  // Skeleton
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
                    ))}
                  </div>
                ) : topStates.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-[40px] mb-2">🗳️</div>
                    <div className="text-[13px] font-semibold text-white/30">
                      No submissions yet
                    </div>
                    <div className="text-[11px] text-white/15 mt-1">
                      Be the first to contribute your county&apos;s election data
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {topStates.map((state, idx) => (
                      <button
                        key={state.state_fips}
                        onClick={() =>
                          setExpandedState(
                            expandedState === state.state_fips ? null : state.state_fips
                          )
                        }
                        className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 ${
                          expandedState === state.state_fips
                            ? 'bg-white/[0.06] border border-white/[0.1]'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <StateRankBadge rank={idx + 1} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold text-white/70 truncate">
                                {state.state_name}
                              </span>
                              <span className="text-[12px] font-extrabold text-white/40 tabular-nums ml-2">
                                {state.total_submissions}
                              </span>
                            </div>

                            <div className="mt-1.5">
                              <CompletionBar pct={state.completion_pct} />
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-white/15">
                                {state.unique_counties}/{state.total_farming_counties} counties
                              </span>
                              {state.this_week > 0 && (
                                <span className="text-[9px] text-emerald-400/60 font-semibold flex items-center gap-0.5">
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                  </svg>
                                  +{state.this_week} this week
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expandedState === state.state_fips && (
                          <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div className="text-[14px] font-extrabold text-white/50">
                                {state.total_submissions}
                              </div>
                              <div className="text-[8px] text-white/15 uppercase tracking-wider">
                                Total
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[14px] font-extrabold text-white/50">
                                {state.unique_counties}
                              </div>
                              <div className="text-[8px] text-white/15 uppercase tracking-wider">
                                Counties
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[14px] font-extrabold text-emerald-400/60">
                                {state.completion_pct}%
                              </div>
                              <div className="text-[8px] text-white/15 uppercase tracking-wider">
                                Coverage
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* "Active This Week" section */}
                {activeStates.length > 0 && (
                  <div className="px-3 pb-3 pt-1">
                    <div className="border-t border-white/[0.06] pt-3">
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Active This Week
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeStates.slice(0, 20).map(s => (
                          <span
                            key={s.state_fips}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/[0.08] text-emerald-400/50 border border-emerald-500/[0.1]"
                          >
                            {s.state_abbr}
                            <span className="text-emerald-400/30">+{s.this_week}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CTA at bottom */}
            <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
              <a
                href="/check"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))',
                  border: '1px solid rgba(16,185,129,0.2)',
                  color: 'rgba(16,185,129,0.8)',
                }}
              >
                <span>🗳️</span>
                Share Your Election
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <p className="text-[9px] text-white/10 text-center mt-2">
                Anonymous — only county totals are shown
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HOW TO CONTRIBUTE ═══ */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
        <div className="max-w-[800px] mx-auto text-center">
          <h3 className="text-[18px] sm:text-[22px] font-extrabold text-white tracking-tight mb-3">
            Help build the first real-time ARC/PLC benchmark
          </h3>
          <p className="text-[13px] text-white/30 leading-relaxed mb-6 max-w-[550px] mx-auto">
            Share your planned 2026 election to see what other farmers in your county are choosing.
            100% anonymous — only county-level totals are ever displayed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              {
                icon: '🗺️',
                title: 'Explore the Map',
                desc: 'Hover over any county to see its ARC-CO vs PLC enrollment history. Filter by crop or year.',
              },
              {
                icon: '📊',
                title: 'Dive Into Your County',
                desc: 'Click any county for detailed payment projections, scenario modeling, and historical trends.',
              },
              {
                icon: '🗳️',
                title: 'Share Your 2026 Election',
                desc: 'Contribute your planned choice to build the benchmark. Minimum 5 farms per county before data is shown.',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="text-[24px] mb-2">{step.icon}</div>
                <div className="text-[13px] font-bold text-white/60 mb-1">{step.title}</div>
                <div className="text-[11px] text-white/20 leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PRIVACY COMMITMENT ═══ */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-4">
        <svg className="w-4 h-4 text-white/15 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div className="text-[10px] text-white/15 leading-relaxed">
          <span className="font-bold text-white/20">Privacy First.</span>{' '}
          HarvestFile never stores your name, farm number, or GPS coordinates. Election submissions
          use a one-way hash for deduplication — we couldn&apos;t identify you even if asked. Only
          county-level aggregate percentages are displayed, and a minimum of 5 submissions per county
          is required before any data becomes visible. We follow the American Farm Bureau
          Federation&apos;s Ag Data Transparent principles.
        </div>
      </div>
    </div>
  );
}
