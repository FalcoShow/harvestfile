// =============================================================================
// HarvestFile — Build 18 Deploy 4: County Elections Panel
// app/(marketing)/check/components/elections/ElectionsPanel.tsx
//
// CONTAINER COMPONENT. Owns the data lifecycle for the County Elections tab:
//   1. Fetches election data on first tab activation (lazy loading)
//   2. Caches in Zustand with a countyFips key
//   3. Invalidates when user changes county selection
//   4. Routes to: Loading → Error → Empty → Content
//
// Follows the same pattern as HistoricalPanel from Deploy 3.
// =============================================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFarmStore } from '@/lib/stores/farm-store';
import type { ElectionData } from '@/lib/stores/farm-store';
import ElectionDonutChart from './ElectionDonutChart';
import ElectionTrendChart from './ElectionTrendChart';
import ElectionInsights from './ElectionInsights';
import ElectionsSkeleton from './ElectionsSkeleton';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ElectionsPanelProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  isActive: boolean;
}

// ─── Retry Fetch ─────────────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  opts: { maxRetries?: number; baseDelay?: number } = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 1000 } = opts;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status >= 400 && res.status < 500) return res;
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 500));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 500));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Fetch failed after retries');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ElectionsPanel({
  countyFips,
  countyName,
  stateAbbr,
  isActive,
}: ElectionsPanelProps) {
  const electionData = useFarmStore((s) => s.electionData);
  const loading = useFarmStore((s) => s.loadingElections);
  const error = useFarmStore((s) => s.electionsError);
  const cacheKey = useFarmStore((s) => s.electionsCacheKey);

  const setElectionData = useFarmStore((s) => s.setElectionData);
  const setLoading = useFarmStore((s) => s.setLoadingElections);
  const setError = useFarmStore((s) => s.setElectionsError);
  const setCacheKey = useFarmStore((s) => s.setElectionsCacheKey);
  const invalidate = useFarmStore((s) => s.invalidateElections);

  const fetchingRef = useRef(false);
  const prevKeyRef = useRef<string | null>(null);
  const currentKey = countyFips;

  // Invalidate when county changes
  useEffect(() => {
    if (prevKeyRef.current && prevKeyRef.current !== currentKey) {
      invalidate();
    }
    prevKeyRef.current = currentKey;
  }, [currentKey, invalidate]);

  // Fetch on tab activation
  const doFetch = useCallback(async () => {
    if (!countyFips) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithRetry(
        `/api/county-elections?county_fips=${countyFips}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const json: ElectionData = await res.json();
      setElectionData(json);
      setCacheKey(currentKey);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load election data';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError('Unable to reach the server. Please check your internet connection and try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [countyFips, currentKey, setElectionData, setLoading, setError, setCacheKey]);

  useEffect(() => {
    if (!isActive) return;
    if (!countyFips) return;
    if (electionData && cacheKey === currentKey) return;
    if (loading) return;
    doFetch();
  }, [isActive, countyFips, electionData, cacheKey, currentKey, loading, doFetch]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) return <ElectionsSkeleton />;

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="rounded-[20px] p-6 sm:p-8"
        role="alert"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-[18px] font-bold text-white/80">Unable to Load Election Data</h3>
          <p className="text-[14px] text-white/40 leading-relaxed text-center max-w-[400px]">{error}</p>
          <button
            onClick={() => { invalidate(); doFetch(); }}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', minHeight: '48px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────
  if (!electionData || !electionData.data || electionData.data.length === 0) {
    return (
      <div className="rounded-[20px] p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" fill="#C9A84C" fillOpacity="0.15" />
            </svg>
          </div>
          <h3 className="text-[18px] font-bold text-white/80">No Election Data Available</h3>
          <p className="text-[14px] text-white/40 text-center max-w-[400px] leading-relaxed">
            Historical ARC-CO and PLC enrollment data is not available for {countyName}. This county may not have eligible commodity base acres.
          </p>
        </div>
      </div>
    );
  }

  // ── Content ──────────────────────────────────────────────────────────
  const { data, insights } = electionData;
  const latest = data[data.length - 1];

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white/90 tracking-[-0.02em]">
            County Election Trends
          </h3>
          <p className="text-[12px] sm:text-[13px] text-white/35 mt-1">
            {countyName}, {stateAbbr} &middot; {data.length} program years &middot;{' '}
            {data[0]?.programYear}–{latest.programYear}
          </p>
        </div>
        {/* Total acres badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
          <span className="text-[10px] font-bold text-[#C9A84C]/70 uppercase tracking-wider">
            {Math.round(latest.totalAcres).toLocaleString()} enrolled acres
          </span>
        </div>
      </div>

      {/* Two-column layout: Donut + Insights */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Donut chart — current year split */}
        <div className="lg:col-span-2 rounded-[16px] p-4 sm:p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3">
            {latest.programYear} Election Split
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ElectionDonutChart
              arccoPct={latest.arccoPct}
              plcPct={latest.plcPct}
              arccoAcres={latest.arccoAcres}
              plcAcres={latest.plcAcres}
            />
          </div>
        </div>

        {/* Insights panel */}
        <div className="lg:col-span-3 rounded-[16px] p-4 sm:p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <ElectionInsights
            data={data}
            insights={insights}
            countyName={countyName}
          />
        </div>
      </div>

      {/* Trend chart — full width */}
      <div className="rounded-[16px] p-4 sm:p-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold text-white/25 uppercase tracking-wider">
            Enrollment Trend
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#2DD4BF' }} />
              <span className="text-[11px] text-white/35 font-medium">ARC-CO</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#C9A84C' }} />
              <span className="text-[11px] text-white/35 font-medium">PLC</span>
            </div>
          </div>
        </div>
        <div className="h-[280px] sm:h-[320px]">
          <ElectionTrendChart data={data} />
        </div>
      </div>

      {/* Bridge to BenchmarkWidget CTA */}
      <div className="rounded-[16px] p-4 sm:p-5"
        style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.12)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-[14px] sm:text-[15px] font-bold text-[#C9A84C]/90">
              What are you choosing for 2026?
            </div>
            <p className="text-[12px] sm:text-[13px] text-white/35 mt-1">
              Share your election anonymously and see live county results on the Comparison tab.
            </p>
          </div>
          <button
            onClick={() => {
              const setTab = useFarmStore.getState().setActiveTab;
              setTab('comparison');
              // Scroll to benchmark widget area
              setTimeout(() => {
                const el = document.querySelector('[data-benchmark-widget]');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-full text-[13px] sm:text-[14px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
            style={{
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.25)',
              color: '#C9A84C',
              minHeight: '48px',
            }}
          >
            Cast Your Vote
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Link to full national map */}
      <div className="text-center">
        <a
          href="/elections"
          className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] text-white/25 hover:text-white/40 transition-colors font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          Explore the full national ARC/PLC election map
        </a>
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-white/20 leading-relaxed">
        Election data sourced from USDA FSA &ldquo;Enrolled Base Acres by County by Commodity by Program&rdquo;
        files for program years {data[0]?.programYear}–{latest.programYear}.
        Percentages reflect enrolled base acres, not total farmland.
        County trends reflect local conditions but may not match your individual operation.
      </p>
    </div>
  );
}
