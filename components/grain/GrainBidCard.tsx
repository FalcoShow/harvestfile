// =============================================================================
// HarvestFile — GrainBidCard (Client Component)
// THE GREAT CONSOLIDATION — Build 2: Barchart Grain Bid UI
//
// Self-contained component that fetches and displays local grain elevator bids.
// Used on TWO surfaces:
//   1. County ARC/PLC pages (full mode — filters, 10 elevators, expandable)
//   2. Morning Dashboard (compact mode — 3 elevators, no filters)
//
// Data: /api/grain-bids (server-side Barchart proxy with caching)
// Types: GrainElevator, NormalizedBid from lib/barchart/types
//
// When Barchart key arrives: plug in BARCHART_API_KEY env var → live data.
// Until then: graceful empty state with "Coming soon" messaging.
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

// ── Types (matching /api/grain-bids response shape) ─────────────────────

interface NormalizedBid {
  commodity: string;
  symbol: string;
  deliveryPeriod: string;
  basis: number;
  cashPrice: number;
  futuresPrice: number | null;
  futuresMonth: string;
  lastUpdate: string;
}

interface GrainElevator {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance: number;
  bids: NormalizedBid[];
}

interface GrainBidResponse {
  query: Record<string, string | null>;
  count: number;
  elevators: GrainElevator[];
  attribution: string;
}

// ── Props ────────────────────────────────────────────────────────────────

interface GrainBidCardProps {
  /** County FIPS code — primary lookup for county pages */
  fips?: string;
  /** ZIP code — alternative lookup */
  zip?: string;
  /** Coordinates — fallback lookup */
  lat?: number;
  lng?: number;
  /** Compact mode for Morning Dashboard (3 elevators, no filters) */
  compact?: boolean;
  /** County name for display */
  countyName?: string;
  /** State abbreviation for display */
  stateAbbr?: string;
}

// ── Commodity filter config ─────────────────────────────────────────────

const COMMODITY_FILTERS = [
  { key: 'all', label: 'All Crops' },
  { key: 'corn', label: 'Corn' },
  { key: 'soybeans', label: 'Soybeans' },
  { key: 'wheat', label: 'Wheat' },
];

const COMMODITY_COLORS: Record<string, string> = {
  corn: '#F59E0B',
  soybeans: '#059669',
  wheat: '#D97706',
  oats: '#8B5CF6',
  sorghum: '#EF4444',
};

function getCommodityColor(commodity: string): string {
  const key = commodity.toLowerCase();
  return COMMODITY_COLORS[key] || '#6B7280';
}

// ── Basis formatter ─────────────────────────────────────────────────────

function formatBasis(basis: number): { text: string; color: string } {
  if (basis >= 0) {
    return { text: `+${basis}`, color: 'text-emerald-600' };
  }
  return { text: `${basis}`, color: 'text-red-500' };
}

// ── Skeleton ────────────────────────────────────────────────────────────

function GrainBidSkeleton({ compact }: { compact: boolean }) {
  const count = compact ? 3 : 5;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
          <div className="w-32 h-4 rounded bg-gray-200 animate-pulse" />
        </div>
        {!compact && (
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-7 rounded-full bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="space-y-1.5">
                <div className="w-36 h-4 rounded bg-gray-200 animate-pulse" />
                <div className="w-24 h-3 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="text-right space-y-1.5">
                <div className="w-16 h-5 rounded bg-gray-200 animate-pulse ml-auto" />
                <div className="w-12 h-3 rounded bg-gray-100 animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export function GrainBidCard({
  fips,
  zip,
  lat,
  lng,
  compact = false,
  countyName,
  stateAbbr,
}: GrainBidCardProps) {
  const [elevators, setElevators] = useState<GrainElevator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('all');
  const [expandedElevator, setExpandedElevator] = useState<string | null>(null);
  const [attribution, setAttribution] = useState('');

  // ── Fetch grain bids ────────────────────────────────────────────────
  const fetchBids = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (fips) params.set('fips', fips);
      else if (zip) params.set('zip', zip);
      else if (lat !== undefined && lng !== undefined) {
        params.set('lat', lat.toString());
        params.set('lng', lng.toString());
      } else {
        setError('No location provided');
        setLoading(false);
        return;
      }

      params.set('max', compact ? '5' : '15');

      const res = await fetch(`/api/grain-bids?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch grain bids');

      const data: GrainBidResponse = await res.json();
      setElevators(data.elevators || []);
      setAttribution(data.attribution || '');
    } catch (err: any) {
      setError(err.message || 'Unable to load grain bids');
    } finally {
      setLoading(false);
    }
  }, [fips, zip, lat, lng, compact]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // ── Filter elevators by commodity ─────────────────────────────────
  const filteredElevators = useMemo(() => {
    if (selectedCommodity === 'all') return elevators;
    return elevators
      .map((e) => ({
        ...e,
        bids: e.bids.filter(
          (b) => b.commodity.toLowerCase() === selectedCommodity.toLowerCase()
        ),
      }))
      .filter((e) => e.bids.length > 0);
  }, [elevators, selectedCommodity]);

  // ── Get best bid across all elevators for a commodity ─────────────
  const bestBid = useMemo(() => {
    let best: { elevator: GrainElevator; bid: NormalizedBid } | null = null;
    for (const elev of filteredElevators) {
      for (const bid of elev.bids) {
        if (!best || bid.cashPrice > best.bid.cashPrice) {
          best = { elevator: elev, bid };
        }
      }
    }
    return best;
  }, [filteredElevators]);

  // ── Available commodities (for filter visibility) ─────────────────
  const availableCommodities = useMemo(() => {
    const set = new Set<string>();
    elevators.forEach((e) => e.bids.forEach((b) => set.add(b.commodity.toLowerCase())));
    return set;
  }, [elevators]);

  // ── Display limit ─────────────────────────────────────────────────
  const displayLimit = compact ? 3 : 10;
  const displayElevators = filteredElevators.slice(0, displayLimit);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return <GrainBidSkeleton compact={compact} />;
  }

  // ── Empty state (no API key or no data) ───────────────────────────
  if (elevators.length === 0 && !error) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Local Grain Bids</h2>
          </div>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Grain Bids Coming Soon</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Live cash grain bids from nearby elevators — powered by Barchart.
              {countyName && ` Showing bids near ${countyName}${stateAbbr ? `, ${stateAbbr}` : ''}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 text-center">
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <button
          onClick={fetchBids}
          className="mt-2 text-xs font-semibold text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Local Grain Bids
            </h2>
          </div>
          {bestBid && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-emerald-700">
                Best: ${bestBid.bid.cashPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mb-4">
          Cash bids from nearby elevators
          {countyName && ` · ${countyName}`}
          {stateAbbr && `, ${stateAbbr}`}
        </p>

        {/* Commodity filter chips (full mode only) */}
        {!compact && availableCommodities.size > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {COMMODITY_FILTERS.filter(
              (f) => f.key === 'all' || availableCommodities.has(f.key)
            ).map((filter) => {
              const isActive = selectedCommodity === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setSelectedCommodity(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#1B4332] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Best bid highlight (full mode only) */}
        {!compact && bestBid && (
          <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 p-3.5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">
                  Best Local Bid — {bestBid.bid.commodity}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {bestBid.elevator.name}
                  <span className="text-gray-400 font-normal ml-1.5">
                    {bestBid.elevator.distance.toFixed(1)} mi
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-emerald-700 tracking-[-0.02em]">
                  ${bestBid.bid.cashPrice.toFixed(2)}
                </div>
                <div className={`text-[11px] font-bold ${formatBasis(bestBid.bid.basis).color}`}>
                  Basis: {formatBasis(bestBid.bid.basis).text}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elevator list */}
        <div className="divide-y divide-gray-50">
          {displayElevators.map((elevator) => {
            const isExpanded = expandedElevator === elevator.id;
            // Get the best bid per commodity for this elevator
            const commodityBids = new Map<string, NormalizedBid>();
            elevator.bids.forEach((bid) => {
              const existing = commodityBids.get(bid.commodity);
              if (!existing || bid.cashPrice > existing.cashPrice) {
                commodityBids.set(bid.commodity, bid);
              }
            });
            const topBids = Array.from(commodityBids.values())
              .sort((a, b) => b.cashPrice - a.cashPrice);
            const primaryBid = topBids[0];

            if (!primaryBid) return null;

            return (
              <div key={elevator.id} className="py-3 first:pt-0 last:pb-0">
                <button
                  onClick={() => !compact && setExpandedElevator(isExpanded ? null : elevator.id)}
                  className={`w-full text-left ${!compact ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Distance badge */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-extrabold text-gray-700">
                        {elevator.distance < 10
                          ? elevator.distance.toFixed(1)
                          : Math.round(elevator.distance)}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">mi</span>
                    </div>

                    {/* Elevator info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {elevator.name}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {elevator.city}, {elevator.state}
                        {topBids.length > 1 && (
                          <span className="ml-1.5 text-gray-300">
                            · {topBids.length} commodities
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Primary bid price + basis */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getCommodityColor(primaryBid.commodity) }}
                        />
                        <span className="text-lg font-extrabold text-gray-900 tracking-[-0.02em]">
                          ${primaryBid.cashPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`text-[11px] font-bold ${formatBasis(primaryBid.basis).color}`}>
                          {formatBasis(primaryBid.basis).text}
                        </span>
                        <span className="text-[10px] text-gray-300">
                          {primaryBid.commodity}
                        </span>
                      </div>
                    </div>

                    {/* Expand chevron (full mode) */}
                    {!compact && topBids.length > 0 && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Expanded details (full mode only) */}
                {!compact && isExpanded && (
                  <div className="mt-3 ml-14 space-y-2">
                    {topBids.map((bid) => (
                      <div
                        key={`${bid.commodity}-${bid.deliveryPeriod}`}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCommodityColor(bid.commodity) }}
                          />
                          <span className="text-xs font-semibold text-gray-700">
                            {bid.commodity}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {bid.deliveryPeriod}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold ${formatBasis(bid.basis).color}`}>
                            {formatBasis(bid.basis).text}
                          </span>
                          <span className="text-sm font-extrabold text-gray-900">
                            ${bid.cashPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Elevator contact */}
                    {elevator.phone && (
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
                        </svg>
                        {elevator.phone}
                        <span className="text-gray-300 mx-1">·</span>
                        {elevator.address && `${elevator.address}, `}{elevator.city}, {elevator.state} {elevator.zip}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more indicator */}
        {filteredElevators.length > displayLimit && (
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-400 font-medium">
              +{filteredElevators.length - displayLimit} more elevators nearby
            </span>
          </div>
        )}
      </div>

      {/* Footer: Attribution + CTA */}
      <div className="border-t border-gray-50 px-5 sm:px-6 py-3 flex items-center justify-between bg-gray-50/40">
        <span className="text-[10px] text-gray-300 max-w-[60%] leading-relaxed">
          {attribution || 'Market data provided by Barchart. Cash grain bids are for informational purposes only.'}
        </span>
        {compact && (
          <Link
            href="/grain"
            className="text-xs font-semibold text-[#1B4332] hover:text-emerald-600 transition-colors flex items-center gap-1"
          >
            All bids
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
