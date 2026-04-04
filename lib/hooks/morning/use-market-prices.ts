// =============================================================================
// HarvestFile — Surface 2 Deploy 1: Market Prices Query Hook
// lib/hooks/morning/use-market-prices.ts
//
// TanStack Query hook wrapping /api/prices/futures.
// Polls every 5 minutes during market hours, stops on weekends.
//
// Response shape from API:
// {
//   success: boolean,
//   data: Record<string, {
//     commodity: string,
//     contractCode: string,
//     latestSettle: number | null,
//     latestDate: string | null,
//     previousSettle: number | null,
//     change: number | null,
//     changePct: number | null,
//     referencePrice: number | null,
//     unit: string | null,
//     prices: Array<{ date: string, settle: number, open: number|null, high: number|null, low: number|null, volume: number|null }>,
//     count: number,
//   }>,
//   source: string,
//   timestamp: string,
// }
// =============================================================================

import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PricePoint {
  date: string;
  settle: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

export interface CommodityPriceData {
  commodity: string;
  contractCode: string;
  latestSettle: number | null;
  latestDate: string | null;
  previousSettle: number | null;
  change: number | null;
  changePct: number | null;
  referencePrice: number | null;
  unit: string | null;
  prices: PricePoint[];
  count: number;
}

export interface MarketPricesResponse {
  success: boolean;
  data: Record<string, CommodityPriceData>;
  source: string;
  timestamp: string;
}

// ─── Market Hours Detection ──────────────────────────────────────────────────

function isMarketHours(): boolean {
  const ct = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  );
  const day = ct.getDay();
  const h = ct.getHours() + ct.getMinutes() / 60;

  // Weekend
  if (day === 0 || day === 6) return false;
  // Friday after close
  if (day === 5 && h >= 13.333) return false;
  // Overnight electronic session or day session
  if (h >= 19 || h < 13.333) return true;

  return false;
}

// ─── Fetch Function ──────────────────────────────────────────────────────────

async function fetchMarketPrices(
  commodities: string[],
  days: number
): Promise<MarketPricesResponse> {
  const codes = commodities.join(',');
  const res = await fetch(`/api/prices/futures?commodities=${codes}&days=${days}`);
  if (!res.ok) {
    throw new Error(`Market prices fetch failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Market prices fetch returned unsuccessful');
  }
  return json;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseMarketPricesOptions {
  commodities?: string[];
  days?: number;
  enabled?: boolean;
}

export function useMarketPrices(options: UseMarketPricesOptions = {}) {
  const {
    commodities = ['CORN', 'SOYBEANS', 'WHEAT'],
    days = 30,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['market-prices', commodities.sort().join(','), days],
    queryFn: () => fetchMarketPrices(commodities, days),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
    // Poll every 5 min during market hours, stop when markets closed
    refetchInterval: () => (isMarketHours() ? 5 * 60 * 1000 : false),
    // Don't poll when tab is hidden
    refetchIntervalInBackground: false,
    // Refresh when farmer returns to tab
    refetchOnWindowFocus: true,
  });
}
