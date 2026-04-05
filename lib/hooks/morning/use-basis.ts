// =============================================================================
// lib/hooks/morning/use-basis.ts
// HarvestFile — Surface 2 Deploy 3D: Basis Tracking Query Hook
//
// TanStack Query hook wrapping /api/markets/basis-tracking.
// 30-minute stale time (basis history updates once daily at market close).
// placeholderData keeps the chart visible during refreshes.
// Exponential backoff retry for rural 4G reliability.
// Re-fetches when location or commodity changes.
// =============================================================================

import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────

export interface WeeklyBasisData {
  weekOfYear: number;
  weekLabel: string;
  threeYearAvg: number;
  currentYear: number | null;
  min: number;
  max: number;
  sampleCount: number;
}

export interface ElevatorComparison {
  name: string;
  city: string;
  state: string;
  distance: number;
  basis: number;
  basisCents: number;
  deviation: number;
  deviationLabel: string;
  commodity: string;
  deliveryMonth: string;
  futuresMonth: string;
}

export interface BasisTrackingData {
  elevator: {
    name: string;
    city: string;
    state: string;
    distance: number;
  };
  commodity: string;
  currentBasis: number;
  currentBasisCents: number;
  futuresMonth: string;
  deliveryMonth: string;
  percentileScore: number;
  trendScore: number;
  basisOpportunityScore: number;
  scoreLabel: string;
  scoreColor: string;
  threeYearAvgForWeek: number;
  deviationFromAvg: number;
  weeklyData: WeeklyBasisData[];
  currentWeekIndex: number;
  elevatorComparison: ElevatorComparison[];
  dataYears: number[];
  narrativeSummary: string;
}

export interface BasisTrackingResponse {
  success: boolean;
  data: BasisTrackingData | null;
  error?: string;
  attribution: string;
}

// ─── Fetch Function ──────────────────────────────────────────────────────

async function fetchBasisTracking(
  lat: number,
  lng: number,
  commodity: string,
): Promise<BasisTrackingResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for 4G

  try {
    const res = await fetch(
      `/api/markets/basis-tracking?lat=${lat}&lng=${lng}&commodity=${encodeURIComponent(commodity)}`,
      { signal: controller.signal }
    );

    if (!res.ok) {
      throw Object.assign(new Error(`Basis tracking fetch failed: ${res.status}`), { status: res.status });
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Query Key Factory ──────────────────────────────────────────────────

export const basisKeys = {
  all: ['basis-tracking'] as const,
  tracking: (lat: number, lng: number, commodity: string) =>
    [...basisKeys.all, lat.toFixed(2), lng.toFixed(2), commodity] as const,
};

// ─── Hook ────────────────────────────────────────────────────────────────

interface UseBasisTrackingOptions {
  lat: number;
  lng: number;
  commodity?: string;
  enabled?: boolean;
}

export function useBasisTracking(options: UseBasisTrackingOptions) {
  const {
    lat,
    lng,
    commodity = 'Corn',
    enabled = true,
  } = options;

  // Round coords for cache key stability
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;

  return useQuery({
    queryKey: basisKeys.tracking(roundedLat, roundedLng, commodity),
    queryFn: () => fetchBasisTracking(roundedLat, roundedLng, commodity),
    enabled: enabled && roundedLat !== 0 && roundedLng !== 0,

    // Basis history updates once daily — 30 min stale is generous
    staleTime: 30 * 60 * 1000,
    // Keep in memory for 1 hour
    gcTime: 60 * 60 * 1000,

    // Keep previous data visible while refreshing (elevator/commodity switch)
    placeholderData: (prev) => prev,

    // No aggressive polling — this data is daily
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,

    // 4G-resilient retry strategy
    retry: (failureCount, error: any) => {
      // Don't retry 4xx errors (bad input)
      if (error?.status >= 400 && error?.status < 500) return false;
      // Retry 429 (rate limit) more aggressively
      if (error?.status === 429) return failureCount < 5;
      // Normal retry up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(2000 * Math.pow(2, attempt), 30000),
  });
}
