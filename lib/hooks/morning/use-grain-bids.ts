// =============================================================================
// HarvestFile — Surface 2 Deploy 1: Grain Bids Query Hook
// lib/hooks/morning/use-grain-bids.ts
//
// TanStack Query hook wrapping /api/grain-bids.
// Polls every 15 minutes during market hours.
// Supports FIPS, ZIP, or lat/lng lookups (matching API flexibility).
//
// Response shape from API:
// {
//   query: { fips, zip, lat, lng },
//   count: number,
//   commodities: string[],
//   elevators: Array<{
//     name: string,
//     city: string,
//     state: string,
//     distance_mi: number,
//     bids: Array<{
//       commodity: string,
//       deliveryMonth: string,
//       cashPrice: number,
//       basis: number,
//       futuresPrice: number,
//       lastUpdated: string,
//     }>
//   }>,
//   attribution: string,
//   meta: { marketPeriod: string, cached: boolean }
// }
// =============================================================================

import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GrainBid {
  commodity: string;
  deliveryMonth: string;
  cashPrice: number;
  basis: number;
  futuresPrice: number;
  lastUpdated: string;
}

export interface Elevator {
  name: string;
  city: string;
  state: string;
  distance_mi: number;
  bids: GrainBid[];
}

export interface GrainBidsData {
  query: { fips?: string; zip?: string; lat?: string; lng?: string };
  count: number;
  commodities: string[];
  elevators: Elevator[];
  attribution: string;
  meta: {
    marketPeriod: string;
    cached: boolean;
  };
}

// ─── Market Hours (for polling) ──────────────────────────────────────────────

function isGrainMarketActive(): boolean {
  const ct = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  );
  const day = ct.getDay();
  const h = ct.getHours() + ct.getMinutes() / 60;

  // Weekends
  if (day === 0 || day === 6) return false;
  // Active during business hours when elevators update bids (6 AM - 4 PM CT)
  return h >= 6 && h < 16;
}

// ─── Fetch Function ──────────────────────────────────────────────────────────

interface GrainBidsParams {
  fips?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  commodities?: string[];
  max?: number;
}

async function fetchGrainBids(params: GrainBidsParams): Promise<GrainBidsData> {
  const searchParams = new URLSearchParams();

  if (params.fips) searchParams.set('fips', params.fips);
  else if (params.zip) searchParams.set('zip', params.zip);
  else if (params.lat !== undefined && params.lng !== undefined) {
    searchParams.set('lat', String(params.lat));
    searchParams.set('lng', String(params.lng));
  } else {
    throw new Error('Grain bids require fips, zip, or lat+lng');
  }

  if (params.commodities && params.commodities.length > 0) {
    searchParams.set('commodities', params.commodities.join('|'));
  }
  if (params.max) {
    searchParams.set('max', String(params.max));
  }

  const res = await fetch(`/api/grain-bids?${searchParams}`);
  if (!res.ok) {
    throw new Error(`Grain bids fetch failed: ${res.status}`);
  }
  return res.json();
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseGrainBidsOptions {
  fips?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  commodities?: string[];
  max?: number;
  enabled?: boolean;
}

export function useGrainBids(options: UseGrainBidsOptions = {}) {
  const { fips, zip, lat, lng, commodities, max = 20, enabled = true } = options;

  // Build a stable cache key
  const locationKey = fips || zip || (lat && lng ? `${lat},${lng}` : '');

  return useQuery({
    queryKey: [
      'grain-bids',
      locationKey,
      commodities?.sort().join('|') || 'all',
      max,
    ],
    queryFn: () => fetchGrainBids({ fips, zip, lat, lng, commodities, max }),
    enabled: enabled && !!locationKey,
    staleTime: 5 * 60 * 1000,       // 5 minutes
    gcTime: 30 * 60 * 1000,         // 30 minutes
    // Poll every 15 min during active elevator hours, stop off-hours
    refetchInterval: () => (isGrainMarketActive() ? 15 * 60 * 1000 : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
