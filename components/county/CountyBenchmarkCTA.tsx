// =============================================================================
// HarvestFile — Phase 25 Build 1: County Benchmark CTA (Client Component)
// The "contribute to unlock" viral mechanic — share your election, see your
// county's real-time 2026 data.
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CountyBenchmarkCTAProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
}

interface BenchmarkData {
  historical: { year: number; arc_pct: number; plc_pct: number; total: number }[];
  live_2026: {
    arc_co_count: number;
    plc_count: number;
    total: number;
    arc_co_pct: number | null;
    plc_pct: number | null;
    is_visible: boolean;
  };
  social_proof: {
    state_this_week: number;
    state_counties_this_week: number;
    state_total: number;
    county_total: number;
  };
}

export function CountyBenchmarkCTA({
  countyFips,
  countyName,
  stateAbbr,
}: CountyBenchmarkCTAProps) {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/benchmarks/county?county_fips=${countyFips}&commodity=ALL`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [countyFips]);

  const threshold = 5;
  const contributed = data?.live_2026?.total || 0;
  const remaining = Math.max(0, threshold - contributed);
  const progressPct = Math.min(100, (contributed / threshold) * 100);
  const isUnlocked = data?.live_2026?.is_visible || false;

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-100 rounded mb-3" />
        <div className="h-4 w-72 bg-gray-100 rounded mb-6" />
        <div className="h-3 w-full bg-gray-100 rounded-full" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C1F17] to-[#1B4332] px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            2026 Live Benchmark
          </span>
        </div>
        <h3 className="text-[18px] font-extrabold text-white tracking-tight">
          What is {countyName} choosing for 2026?
        </h3>
        <p className="text-[13px] text-white/40 mt-1">
          See real-time ARC-CO vs PLC election data from farmers in your county.
          {!isUnlocked && ' Contribute your election to unlock the results.'}
        </p>
      </div>

      <div className="px-6 py-5">
        {isUnlocked && data?.live_2026 ? (
          /* ── UNLOCKED STATE: Show live data ── */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[13px] font-bold text-emerald-700">
                Live Data — {data.live_2026.total} farmers reporting
              </span>
            </div>

            {/* Live ARC/PLC Bar */}
            <div className="mb-4">
              <div className="flex h-8 rounded-xl overflow-hidden">
                <div
                  className="bg-emerald-500 flex items-center justify-center text-[11px] font-bold text-white transition-all"
                  style={{ width: `${data.live_2026.arc_co_pct || 50}%` }}
                >
                  ARC-CO {data.live_2026.arc_co_pct}%
                </div>
                <div
                  className="bg-blue-500 flex items-center justify-center text-[11px] font-bold text-white transition-all"
                  style={{ width: `${data.live_2026.plc_pct || 50}%` }}
                >
                  PLC {data.live_2026.plc_pct}%
                </div>
              </div>
            </div>

            {/* Social Proof */}
            {data.social_proof && (
              <div className="flex flex-wrap gap-4 text-[11px] text-gray-400">
                {data.social_proof.state_this_week > 0 && (
                  <span>
                    {data.social_proof.state_this_week} {stateAbbr} farmers
                    shared this week
                  </span>
                )}
                {data.social_proof.state_total > 0 && (
                  <span>
                    {data.social_proof.state_total} total {stateAbbr}{' '}
                    submissions
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href="/check"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1B4332] hover:text-emerald-700 transition-colors"
              >
                Run your personalized analysis →
              </Link>
            </div>
          </div>
        ) : (
          /* ── LOCKED STATE: Encourage contribution ── */
          <div>
            {/* Progress toward unlock */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-gray-600">
                  {contributed} of {threshold} farmers needed to unlock
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {remaining > 0 && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {remaining} more farmer{remaining !== 1 ? 's' : ''} from{' '}
                  {countyName} needed to reveal 2026 benchmark data
                </p>
              )}
            </div>

            {/* What you get */}
            <div className="space-y-2.5 mb-5">
              {[
                'See what % of your county chose ARC-CO vs PLC for 2026',
                'Compare your county to statewide and national trends',
                'Updated in real-time as more farmers contribute',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-[13px] text-gray-600">{item}</span>
                </div>
              ))}
            </div>

            {/* Privacy assurance */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-3.5 h-3.5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-[11px] font-bold text-gray-500">
                  100% Anonymous
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Only county-level totals are shown. Individual elections are
                never displayed. Minimum {threshold} submissions required before
                any data is revealed.
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/check"
              className="flex items-center justify-center gap-2 w-full bg-[#1B4332] hover:bg-[#0C1F17] text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-[#1B4332]/15 transition-all text-[14px]"
            >
              Run the Free Calculator &amp; Contribute
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
