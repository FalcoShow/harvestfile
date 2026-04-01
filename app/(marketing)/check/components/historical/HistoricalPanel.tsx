// =============================================================================
// HarvestFile — Build 18 Deploy 3: Historical Payments Panel
// app/(marketing)/check/components/historical/HistoricalPanel.tsx
//
// CONTAINER COMPONENT. Owns the data lifecycle for the Historical tab:
//   1. Fetches payment data on first tab activation (lazy loading)
//   2. Caches in Zustand with a countyFips:cropCode key
//   3. Invalidates when user changes county or crop selection
//   4. Routes to: Loading → Error → Empty → Content
//
// Fetch-on-tab-activation means we never load data the user doesn't need.
// The Zustand cache means switching tabs back doesn't re-fetch.
// Retry with exponential backoff handles rural 4G flakiness.
// =============================================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFarmStore, type HistoricalData } from '@/lib/stores/farm-store';
import HistoricalChart from './HistoricalChart';
import HistoricalStatsRow from './HistoricalStatsRow';
import HistoricalTable from './HistoricalTable';
import HistoricalSkeleton from './HistoricalSkeleton';

// ─── Props ───────────────────────────────────────────────────────────────────

interface HistoricalPanelProps {
  countyFips: string;
  commodityCode: string;
  countyName: string;
  isActive: boolean;  // whether this tab is currently visible
}

// ─── Retry Fetch Utility ─────────────────────────────────────────────────────
// Exponential backoff: 1s → 2s → 4s. Handles rural 4G transient failures.
// Only retries on network errors and 5xx. Returns 4xx immediately.

async function fetchWithRetry(
  url: string,
  opts: { maxRetries?: number; baseDelay?: number } = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 1000 } = opts;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);

      // Don't retry 4xx errors — they won't succeed on retry
      if (res.status >= 400 && res.status < 500) return res;

      // Retry 5xx errors
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) =>
          setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 500)
        );
        continue;
      }

      return res;
    } catch (err) {
      // Network error — retry
      if (attempt < maxRetries) {
        await new Promise((r) =>
          setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 500)
        );
        continue;
      }
      throw err;
    }
  }

  // Shouldn't reach here, but TypeScript needs it
  throw new Error('Fetch failed after retries');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HistoricalPanel({
  countyFips,
  commodityCode,
  countyName,
  isActive,
}: HistoricalPanelProps) {
  const historical = useFarmStore((s) => s.historical);
  const loading = useFarmStore((s) => s.loadingHistorical);
  const error = useFarmStore((s) => s.historicalError);
  const cacheKey = useFarmStore((s) => s.historicalCacheKey);

  const setHistorical = useFarmStore((s) => s.setHistorical);
  const setLoading = useFarmStore((s) => s.setLoadingHistorical);
  const setError = useFarmStore((s) => s.setHistoricalError);
  const setCacheKey = useFarmStore((s) => s.setHistoricalCacheKey);
  const invalidate = useFarmStore((s) => s.invalidateHistorical);

  const fetchingRef = useRef(false);
  const prevKeyRef = useRef<string | null>(null);

  const currentKey = `${countyFips}:${commodityCode}`;

  // ── Invalidate cache when county or crop changes ──────────────────────
  useEffect(() => {
    if (prevKeyRef.current && prevKeyRef.current !== currentKey) {
      invalidate();
    }
    prevKeyRef.current = currentKey;
  }, [currentKey, invalidate]);

  // ── Fetch on tab activation (with cache guard) ────────────────────────
  const doFetch = useCallback(async () => {
    if (!countyFips || !commodityCode) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithRetry(
        `/api/historical-payments/${countyFips}/${commodityCode}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const json: HistoricalData = await res.json();
      setHistorical(json);
      setCacheKey(currentKey);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load historical data';

      // User-friendly error messages for common failure modes
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError(
          'Unable to reach the server. Please check your internet connection and try again.'
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [countyFips, commodityCode, currentKey, setHistorical, setLoading, setError, setCacheKey]);

  useEffect(() => {
    if (!isActive) return;
    if (!countyFips || !commodityCode) return;

    // Cache hit — data already loaded for this county/crop
    if (historical && cacheKey === currentKey) return;

    // Already fetching
    if (loading) return;

    doFetch();
  }, [isActive, countyFips, commodityCode, historical, cacheKey, currentKey, loading, doFetch]);

  // ── Render: Loading ───────────────────────────────────────────────────
  if (loading) {
    return <HistoricalSkeleton />;
  }

  // ── Render: Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="rounded-[20px] p-6 sm:p-8"
        role="alert"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
        }}
      >
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-5">
          {/* Error icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h3 className="text-[18px] font-bold text-white/80">
            Unable to Load Payment History
          </h3>

          <p className="text-[14px] text-white/40 leading-relaxed text-center max-w-[400px]">
            {error}
          </p>

          {/* Retry button — 48px touch target */}
          <button
            onClick={() => {
              invalidate();
              doFetch();
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold
                       transition-all duration-200 hover:-translate-y-0.5
                       active:scale-[0.97] active:duration-75
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
            style={{
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.25)',
              color: '#C9A84C',
              minHeight: '48px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Empty state ───────────────────────────────────────────────
  if (!historical || !historical.data || historical.data.length === 0) {
    return (
      <div
        className="rounded-[20px] p-6 sm:p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(201, 168, 76, 0.06)',
              border: '1px solid rgba(201, 168, 76, 0.12)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <rect x="7" y="13" width="3" height="5" rx="1" fill="#C9A84C" fillOpacity="0.15" />
              <rect x="14" y="9" width="3" height="9" rx="1" fill="#C9A84C" fillOpacity="0.15" />
            </svg>
          </div>
          <h3 className="text-[18px] font-bold text-white/80">
            No Payment History Available
          </h3>
          <p className="text-[14px] text-white/40 text-center max-w-[400px] leading-relaxed">
            Historical ARC-CO and PLC payment data is not available for this
            county and crop combination. This may be because the crop is not
            widely grown in this county.
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Content ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white/90 tracking-[-0.02em]">
            Historical Payment Comparison
          </h3>
          <p className="text-[12px] sm:text-[13px] text-white/35 mt-1">
            {countyName} &middot; {historical.data.length} crop years &middot;{' '}
            {historical.data[0]?.cropYear}–
            {historical.data[historical.data.length - 1]?.cropYear}
          </p>
        </div>
        {/* OBBBA 2025 indicator */}
        {historical.data.some((d) => d.cropYear >= 2025) && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(201, 168, 76, 0.06)',
              border: '1px solid rgba(201, 168, 76, 0.15)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/60" />
            <span className="text-[10px] font-bold text-[#C9A84C]/70 uppercase tracking-wider">
              Includes OBBBA 2025
            </span>
          </div>
        )}
      </div>

      {/* Summary stat cards */}
      <HistoricalStatsRow summary={historical.summary} />

      {/* Grouped bar chart */}
      <HistoricalChart data={historical.data} />

      {/* Year-by-year data table */}
      <HistoricalTable data={historical.data} />

      {/* Footnotes — builds trust with sophisticated farmers */}
      <div className="space-y-1.5 pt-2">
        <p className="text-[11px] text-white/20 leading-relaxed">
          ARC-CO payment rates shown before 5.7% sequestration adjustment.
          PLC payments estimated using county-average yields — actual payments
          depend on your farm&apos;s PLC yield on file with FSA.
        </p>
        {historical.data.some((d) => d.dataStatus === 'estimated') && (
          <p className="text-[11px] text-[#C9A84C]/40 leading-relaxed">
            Years marked &ldquo;Est.&rdquo; use projected MYA prices — final
            rates published by USDA after marketing year ends.
          </p>
        )}
        {historical.data.some((d) => d.cropYear === 2025) && (
          <p className="text-[11px] text-[#C9A84C]/40 leading-relaxed">
            2025 OBBBA provision: farmers automatically receive the higher of
            ARC-CO or PLC regardless of their election for crop year 2025.
          </p>
        )}
      </div>
    </div>
  );
}
