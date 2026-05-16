// =============================================================================
// app/(marketing)/morning/_components/LiveClock.tsx
// HarvestFile — Surface 2 Deploy 2B: Hydration-Safe Live Clock
//
// Isolated client component that displays a live-updating clock.
// Renders null on server, mounts real time on client only.
// Updates every minute (no seconds to reduce re-renders).
//
// Hydration strategy: useState(null) → server renders placeholder,
// client renders real time after useEffect mount. No mismatch possible.
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

interface LiveClockProps {
  showSeconds?: boolean;
  className?: string;
}

export default function LiveClock({ showSeconds = false, className = '' }: LiveClockProps) {
  const [time, setTime] = useState<string | null>(null);

  const formatTime = useCallback((d: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      ...(showSeconds ? { second: '2-digit' } : {}),
      hour12: true,
    }).format(d);
  }, [showSeconds]);

  useEffect(() => {
    // Set initial time immediately on mount
    setTime(formatTime(new Date()));

    const interval = showSeconds ? 1000 : 60_000;

    // If not showing seconds, align to next minute boundary
    if (!showSeconds) {
      const now = new Date();
      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

      const alignTimeout = setTimeout(() => {
        setTime(formatTime(new Date()));
        // Start interval aligned to minute boundaries
        const id = setInterval(() => setTime(formatTime(new Date())), 60_000);
        // Store interval ID for cleanup
        (alignTimeout as any).__intervalId = id;
      }, msUntilNextMinute);

      return () => {
        clearTimeout(alignTimeout);
        if ((alignTimeout as any).__intervalId) {
          clearInterval((alignTimeout as any).__intervalId);
        }
      };
    }

    // For seconds display, just use a simple interval
    const id = setInterval(() => setTime(formatTime(new Date())), interval);
    return () => clearInterval(id);
  }, [formatTime, showSeconds]);

  // Server render: placeholder to prevent hydration mismatch
  if (time === null) {
    return (
      <time
        suppressHydrationWarning
        className={`tabular-nums text-white/30 ${className}`}
        aria-label="Loading clock"
      >
        --:-- --
      </time>
    );
  }

  return (
    <time
      suppressHydrationWarning
      className={`tabular-nums text-white/50 ${className}`}
      dateTime={new Date().toISOString()}
    >
      {time}
    </time>
  );
}
