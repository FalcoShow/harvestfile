// =============================================================================
// HarvestFile — Build 18 Deploy 3: Historical Payments Skeleton
// app/(marketing)/check/components/historical/HistoricalSkeleton.tsx
//
// Loading state that mirrors the actual HistoricalPanel layout:
//   - Header bar
//   - 4 stat card skeletons (2×2 on mobile, 4×1 on desktop)
//   - Chart area with variable-height bar skeletons
//   - Table row skeletons
//
// Uses the existing .hf-skeleton-shimmer class from globals.css for
// brand-appropriate gold-tinted shimmer animation.
// Respects prefers-reduced-motion via the CSS class definition.
// =============================================================================

'use client';

export default function HistoricalSkeleton() {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-label="Loading historical payment data"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-lg hf-skeleton-shimmer" />
          <div className="h-3.5 w-36 rounded-lg hf-skeleton-shimmer" />
        </div>
        <div className="h-7 w-32 rounded-full hf-skeleton-shimmer hidden sm:block" />
      </div>

      {/* Stat cards skeleton — 2×2 mobile, 4×1 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-3.5"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderLeft: `3px solid rgba(201, 168, 76, ${i <= 2 ? '0.15' : '0.08'})`,
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderLeftWidth: '3px',
              borderLeftColor: i % 2 === 1 ? 'rgba(201, 168, 76, 0.15)' : 'rgba(52, 211, 153, 0.15)',
            }}
          >
            <div className="h-3.5 w-20 rounded hf-skeleton-shimmer mb-2" />
            <div className="h-6 w-16 rounded hf-skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Chart skeleton — simulated bar chart */}
      <div
        className="rounded-[16px] p-4 sm:p-5"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        {/* Chart header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-32 rounded hf-skeleton-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 rounded hf-skeleton-shimmer" />
            <div className="h-3 w-12 rounded hf-skeleton-shimmer" />
          </div>
        </div>

        {/* Simulated bar chart area */}
        <div className="flex items-end gap-3 sm:gap-5 h-[280px] px-8 pb-6 pt-4">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between h-full mr-2">
            <div className="h-2.5 w-8 rounded hf-skeleton-shimmer" />
            <div className="h-2.5 w-8 rounded hf-skeleton-shimmer" />
            <div className="h-2.5 w-8 rounded hf-skeleton-shimmer" />
            <div className="h-2.5 w-6 rounded hf-skeleton-shimmer" />
          </div>

          {/* Bar pairs — variable heights for visual interest */}
          {[65, 40, 55, 20, 80, 10, 30, 45, 15].map((h, i) => (
            <div key={i} className="flex-1 flex items-end gap-1 min-w-0">
              <div
                className="flex-1 rounded-t-md hf-skeleton-shimmer"
                style={{ height: `${h}%`, minWidth: '8px' }}
              />
              <div
                className="flex-1 rounded-t-md hf-skeleton-shimmer"
                style={{
                  height: `${Math.max(10, h * 0.3 + Math.random() * 20)}%`,
                  minWidth: '8px',
                  opacity: 0.7,
                }}
              />
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-around px-8 mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-3 w-8 rounded hf-skeleton-shimmer" />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
      >
        {/* Table header */}
        <div
          className="flex gap-px py-3 px-4"
          style={{ background: '#0C1F17' }}
        >
          <div className="flex-1 h-3 rounded hf-skeleton-shimmer" />
          <div className="flex-1 h-3 rounded hf-skeleton-shimmer" />
          <div className="flex-1 h-3 rounded hf-skeleton-shimmer" />
          <div className="flex-1 h-3 rounded hf-skeleton-shimmer hidden sm:block" />
          <div className="flex-1 h-3 rounded hf-skeleton-shimmer" />
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex items-center gap-px min-h-[48px] px-4"
            style={{ background: i % 2 === 0 ? '#132A1F' : '#0C1F17' }}
          >
            <div className="flex-1 h-4 w-12 rounded hf-skeleton-shimmer" />
            <div className="flex-1 h-4 w-16 rounded hf-skeleton-shimmer" />
            <div className="flex-1 h-4 w-16 rounded hf-skeleton-shimmer" />
            <div className="flex-1 h-4 w-14 rounded hf-skeleton-shimmer hidden sm:block" />
            <div className="flex-1 flex justify-center">
              <div className="h-6 w-16 rounded-full hf-skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Footnote skeleton */}
      <div className="space-y-1.5 pt-2">
        <div className="h-3 w-full rounded hf-skeleton-shimmer" style={{ maxWidth: '480px' }} />
        <div className="h-3 w-3/4 rounded hf-skeleton-shimmer" style={{ maxWidth: '360px' }} />
      </div>
    </div>
  );
}
