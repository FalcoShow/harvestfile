// =============================================================================
// HarvestFile — GrainBidCard (Client Component)
// Build 17 Deploy 3 → Deploy 2B: Dark Mode + Broken Link Fix
//
// Self-contained component that fetches and displays local grain elevator bids.
// Used on TWO surfaces:
//   1. County ARC/PLC pages (full mode — filters, 10 elevators, expandable)
//   2. Morning Dashboard (compact mode — 3 elevators, no filters, DARK THEME)
//
// Deploy 2B fix: "All bids →" link pointed to /grain which 301-redirected
// back to /morning (broken loop). Now uses inline expand toggle — tapping
// "All bids" shows all elevators without navigating away from /morning.
//
// Data: /api/grain-bids (server-side Barchart proxy with caching)
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
  /** Dark mode for Morning Dashboard dark theme */
  darkMode?: boolean;
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

function formatBasis(basis: number, dark: boolean): { text: string; color: string } {
  if (basis >= 0) {
    return { text: `+${basis}`, color: dark ? 'text-emerald-400' : 'text-emerald-600' };
  }
  return { text: `${basis}`, color: dark ? 'text-red-400' : 'text-red-500' };
}

// ── Skeleton ────────────────────────────────────────────────────────────

function GrainBidSkeleton({ compact, dark }: { compact: boolean; dark: boolean }) {
  const count = compact ? 3 : 5;
  return (
    <div className={`rounded-2xl border overflow-hidden ${
      dark
        ? 'border-white/[0.06] bg-[rgba(27,67,50,0.30)]'
        : 'border-gray-100 bg-white shadow-sm'
    }`}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-5 h-5 rounded animate-pulse ${dark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
          <div className={`w-32 h-4 rounded animate-pulse ${dark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
        </div>
        {!compact && (
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-16 h-7 rounded-full animate-pulse ${dark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
            ))}
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={`flex items-center justify-between py-3 border-b last:border-0 ${
              dark ? 'border-white/[0.04]' : 'border-gray-50'
            }`}>
              <div className="space-y-1.5">
                <div className={`w-36 h-4 rounded animate-pulse ${dark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
                <div className={`w-24 h-3 rounded animate-pulse ${dark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
              </div>
              <div className="text-right space-y-1.5">
                <div className={`w-16 h-5 rounded animate-pulse ml-auto ${dark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
                <div className={`w-12 h-3 rounded animate-pulse ml-auto ${dark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
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
  darkMode = false,
  countyName,
  stateAbbr,
}: GrainBidCardProps) {
  const [elevators, setElevators] = useState<GrainElevator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('all');
  const [expandedElevator, setExpandedElevator] = useState<string | null>(null);
  const [attribution, setAttribution] = useState('');
  // Deploy 2B: Inline expand toggle replaces broken /grain navigation
  const [showAllBids, setShowAllBids] = useState(false);

  const dark = darkMode;

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

  // ── Find best bid across all elevators ────────────────────────────
  const bestBid = useMemo(() => {
    let best: { elevator: GrainElevator; bid: NormalizedBid } | null = null;
    for (const elevator of filteredElevators) {
      for (const bid of elevator.bids) {
        if (!best || bid.cashPrice > best.bid.cashPrice) {
          best = { elevator, bid };
        }
      }
    }
    return best;
  }, [filteredElevators]);

  // ── Display limits — Deploy 2B: respects showAllBids toggle ───────
  const displayLimit = compact ? (showAllBids ? filteredElevators.length : 3) : 10;
  const displayElevators = filteredElevators.slice(0, displayLimit);

  // ── Loading State ─────────────────────────────────────────────────
  if (loading) return <GrainBidSkeleton compact={compact} dark={dark} />;

  // ── Error State ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`rounded-2xl border p-5 text-center ${
        dark
          ? 'border-red-500/20 bg-red-500/[0.06]'
          : 'border-red-100 bg-red-50/50'
      }`}>
        <p className={`text-sm font-medium ${dark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
        <button
          onClick={() => fetchBids()}
          className={`mt-2 text-xs font-semibold underline ${
            dark ? 'text-red-300 hover:text-red-200' : 'text-red-700 hover:text-red-800'
          } transition-colors`}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty State ───────────────────────────────────────────────────
  if (elevators.length === 0) {
    return (
      <div className={`rounded-2xl border p-5 text-center ${
        dark
          ? 'border-white/[0.06] bg-[rgba(27,67,50,0.30)]'
          : 'border-gray-100 bg-white shadow-sm'
      }`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(255,255,255,0.4)' : '#1B4332'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
          </svg>
          <h3 className={`text-sm font-semibold ${dark ? 'text-white/90' : 'text-gray-900'}`}>Local Grain Bids</h3>
        </div>
        <p className={`text-xs ${dark ? 'text-white/30' : 'text-gray-400'}`}>
          No grain bids found for this area. Bids update throughout the day.
        </p>
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border overflow-hidden ${
      dark
        ? 'border-white/[0.06] bg-[rgba(27,67,50,0.30)]'
        : 'border-gray-100 bg-white shadow-sm'
    }`}>
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(255,255,255,0.6)' : '#1B4332'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
            </svg>
            <h2 className={`text-sm font-semibold tracking-tight ${dark ? 'text-white/90' : 'text-gray-900'}`}>
              Local Grain Bids
            </h2>
          </div>
          {bestBid && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${
              dark
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
              Best: ${bestBid.bid.cashPrice.toFixed(2)}
            </span>
          )}
        </div>
        <p className={`text-[11px] mb-4 ${dark ? 'text-white/25' : 'text-gray-400'}`}>
          Cash bids from nearby elevators
          {countyName && stateAbbr && (
            <span className={dark ? 'text-white/15' : 'text-gray-300'}>
              {' · '}{lat && lng ? `${lat.toFixed(2)}, ${lng.toFixed(2)}` : `${countyName}, ${stateAbbr}`}
            </span>
          )}
        </p>

        {/* Commodity filters (full mode only) */}
        {!compact && (
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {COMMODITY_FILTERS.map((filter) => {
              const isActive = selectedCommodity === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setSelectedCommodity(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? dark
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-[#1B4332] text-white border border-[#1B4332]'
                      : dark
                        ? 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
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
          <div className={`rounded-xl p-3.5 mb-4 ${
            dark
              ? 'bg-emerald-500/[0.06] border border-emerald-500/15'
              : 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                  dark ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  Best Local Bid — {bestBid.bid.commodity}
                </div>
                <div className={`text-sm font-bold ${dark ? 'text-white/90' : 'text-gray-900'}`}>
                  {bestBid.elevator.name}
                  <span className={`font-normal ml-1.5 ${dark ? 'text-white/30' : 'text-gray-400'}`}>
                    {bestBid.elevator.distance.toFixed(1)} mi
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-extrabold tracking-[-0.02em] ${
                  dark ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  ${bestBid.bid.cashPrice.toFixed(2)}
                </div>
                <div className={`text-[11px] font-bold ${formatBasis(bestBid.bid.basis, dark).color}`}>
                  Basis: {formatBasis(bestBid.bid.basis, dark).text}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elevator list */}
        <div className={`divide-y ${dark ? 'divide-white/[0.04]' : 'divide-gray-50'}`}>
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
                  onClick={() => setExpandedElevator(isExpanded ? null : elevator.id)}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Distance badge */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center ${
                      dark
                        ? 'bg-white/[0.04] border border-white/[0.06]'
                        : 'bg-gray-50 border border-gray-100'
                    }`}>
                      <span className={`text-[11px] font-extrabold ${dark ? 'text-white/70' : 'text-gray-700'}`}>
                        {elevator.distance < 10
                          ? elevator.distance.toFixed(1)
                          : Math.round(elevator.distance)}
                      </span>
                      <span className={`text-[8px] font-bold uppercase ${dark ? 'text-white/30' : 'text-gray-400'}`}>mi</span>
                    </div>

                    {/* Elevator info */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${dark ? 'text-white/90' : 'text-gray-900'}`}>
                        {elevator.name}
                      </div>
                      <div className={`text-[11px] truncate ${dark ? 'text-white/30' : 'text-gray-400'}`}>
                        {elevator.city}, {elevator.state}
                        {topBids.length > 1 && (
                          <span className={`ml-1.5 ${dark ? 'text-white/15' : 'text-gray-300'}`}>
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
                        <span className={`text-lg font-extrabold tracking-[-0.02em] ${dark ? 'text-white' : 'text-gray-900'}`}>
                          ${primaryBid.cashPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`text-[11px] font-bold ${formatBasis(primaryBid.basis, dark).color}`}>
                          {formatBasis(primaryBid.basis, dark).text}
                        </span>
                        <span className={`text-[10px] ${dark ? 'text-white/20' : 'text-gray-300'}`}>
                          {primaryBid.commodity}
                        </span>
                      </div>
                    </div>

                    {/* Expand chevron */}
                    {topBids.length > 0 && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''} ${
                          dark ? 'text-white/20' : 'text-gray-300'
                        }`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 ml-14 space-y-2">
                    {topBids.map((bid) => (
                      <div
                        key={`${bid.commodity}-${bid.deliveryPeriod}`}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          dark ? 'bg-white/[0.04]' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCommodityColor(bid.commodity) }}
                          />
                          <span className={`text-xs font-semibold ${dark ? 'text-white/70' : 'text-gray-700'}`}>
                            {bid.commodity}
                          </span>
                          <span className={`text-[10px] ${dark ? 'text-white/25' : 'text-gray-400'}`}>
                            {bid.deliveryPeriod}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold ${formatBasis(bid.basis, dark).color}`}>
                            {formatBasis(bid.basis, dark).text}
                          </span>
                          <span className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}>
                            ${bid.cashPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Elevator contact */}
                    {elevator.phone && (
                      <div className={`flex items-center gap-2 text-[11px] pt-1 ${dark ? 'text-white/25' : 'text-gray-400'}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
                        </svg>
                        {elevator.phone}
                        <span className={`mx-1 ${dark ? 'text-white/10' : 'text-gray-300'}`}>·</span>
                        {elevator.address && `${elevator.address}, `}{elevator.city}, {elevator.state} {elevator.zip}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more indicator — Deploy 2B: compact mode gets expand toggle */}
        {compact && filteredElevators.length > 3 && !showAllBids && (
          <button
            onClick={() => setShowAllBids(true)}
            className={`mt-3 w-full text-center py-2 rounded-lg transition-colors ${
              dark
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/30 hover:text-white/50'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xs font-medium">
              +{filteredElevators.length - 3} more elevators nearby
            </span>
          </button>
        )}
        {compact && showAllBids && filteredElevators.length > 3 && (
          <button
            onClick={() => setShowAllBids(false)}
            className={`mt-3 w-full text-center py-2 rounded-lg transition-colors ${
              dark
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/30 hover:text-white/50'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xs font-medium">Show fewer</span>
          </button>
        )}
        {!compact && filteredElevators.length > displayLimit && (
          <div className="mt-3 text-center">
            <span className={`text-xs font-medium ${dark ? 'text-white/25' : 'text-gray-400'}`}>
              +{filteredElevators.length - displayLimit} more elevators nearby
            </span>
          </div>
        )}
      </div>

      {/* Footer: Attribution */}
      <div className={`border-t px-5 sm:px-6 py-3 flex items-center justify-between ${
        dark
          ? 'border-white/[0.04] bg-white/[0.02]'
          : 'border-gray-50 bg-gray-50/40'
      }`}>
        <span className={`text-[10px] max-w-[60%] leading-relaxed ${dark ? 'text-white/15' : 'text-gray-300'}`}>
          {attribution || 'Market data provided by Barchart Solutions. Cash grain bids are based on delayed futures prices and are subject to change. Information is provided as-is for informational purposes only, not for trading purposes or advice.'}
        </span>
        {compact && (
          <Link
            href="/check"
            className={`text-xs font-semibold transition-colors flex items-center gap-1 ${
              dark
                ? 'text-[#C9A84C] hover:text-[#E2C366]'
                : 'text-[#1B4332] hover:text-emerald-600'
            }`}
          >
            Calculate payment
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
