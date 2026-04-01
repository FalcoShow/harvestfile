// =============================================================================
// HarvestFile — Build 18 Deploy 4: Elections Skeleton
// app/(marketing)/check/components/elections/ElectionsSkeleton.tsx
//
// Loading state that mirrors the ElectionsPanel layout:
//   - Header bar
//   - Two-column: donut circle + insights text block
//   - Full-width trend chart area
//   - CTA card
//
// Uses .hf-skeleton-shimmer from globals.css for gold-tinted animation.
// =============================================================================

'use client';

export default function ElectionsSkeleton() {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-label="Loading county election data"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-44 rounded-lg hf-skeleton-shimmer" />
          <div className="h-3.5 w-32 rounded-lg hf-skeleton-shimmer" />
        </div>
        <div className="h-7 w-36 rounded-full hf-skeleton-shimmer hidden sm:block" />
      </div>

      {/* Two-column: Donut + Insights */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Donut skeleton */}
        <div
          className="lg:col-span-2 rounded-[16px] p-4 sm:p-5 flex flex-col items-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="h-3 w-28 rounded hf-skeleton-shimmer mb-4" />
          {/* Donut circle placeholder */}
          <div
            className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full hf-skeleton-shimmer"
            style={{ opacity: 0.6 }}
          />
        </div>

        {/* Insights skeleton */}
        <div
          className="lg:col-span-3 rounded-[16px] p-4 sm:p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="h-5 w-56 rounded hf-skeleton-shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded hf-skeleton-shimmer" />
            <div className="h-4 w-5/6 rounded hf-skeleton-shimmer" />
            <div className="h-4 w-4/6 rounded hf-skeleton-shimmer" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full rounded hf-skeleton-shimmer" />
            <div className="h-4 w-3/4 rounded hf-skeleton-shimmer" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full rounded hf-skeleton-shimmer" />
            <div className="h-4 w-2/3 rounded hf-skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Trend chart skeleton */}
      <div
        className="rounded-[16px] p-4 sm:p-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-28 rounded hf-skeleton-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 rounded hf-skeleton-shimmer" />
            <div className="h-3 w-10 rounded hf-skeleton-shimmer" />
          </div>
        </div>
        {/* Simulated trend area */}
        <div className="h-[280px] sm:h-[320px] flex items-end px-6 pb-8 gap-3">
          {[70, 72, 68, 75, 80, 78, 85].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md hf-skeleton-shimmer"
                style={{ height: `${h}%`, opacity: 0.5 }}
              />
              <div className="h-3 w-8 rounded hf-skeleton-shimmer mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA card skeleton */}
      <div
        className="rounded-[16px] p-4 sm:p-5"
        style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-48 rounded hf-skeleton-shimmer" />
            <div className="h-3 w-64 rounded hf-skeleton-shimmer" />
          </div>
          <div className="h-10 w-28 rounded-full hf-skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
