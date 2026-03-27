'use client';

// =============================================================================
// HarvestFile — Grain Bid Card (Client Island)
// Build 6 Deploy 2: Added FIPS-to-coordinates fallback
//
// When a FIPS lookup returns no elevators (suburban/urban counties with no
// grain facilities within the county boundary), automatically retries using
// the county's centroid coordinates with a 50-mile radius to find nearby
// elevators in adjacent counties.
//
// Props: countyFips, countyName, stateAbbr, latitude, longitude, zipCode, compact
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { BarchartAttribution } from './BarchartAttribution';

// ── Types (matching normalized output from lib/barchart/client.ts) ───────

interface NormalizedBid {
  commodity: string;
  displayName: string;
  symbol: string;
  symRoot: string;
  deliveryMonth: string;
  deliveryStart: string;
  deliveryEnd: string;
  basisMonth: string;
  basis: number;
  cashPrice: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
  basisSymbol: string;
  cashPriceSymbol: string;
  basisRollingSymbol: string;
  active: boolean;
}

interface Elevator {
  id: string;
  name: string;
  facilityType: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  distance: number;
  latitude: number;
  longitude: number;
  bids: NormalizedBid[];
}

interface GrainBidResponse {
  elevators: Elevator[];
  commodities: string[];
  count: number;
  attribution: string;
}

// ── Commodity config ─────────────────────────────────────────────────────

const COMMODITY_TABS = [
  { key: 'corn', label: 'Corn' },
  { key: 'soybeans', label: 'Soybeans' },
  { key: 'wheat', label: 'Wheat' },
] as const;

// ── Component ────────────────────────────────────────────────────────────

interface GrainBidCardProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  /** County centroid latitude — used for fallback when FIPS returns empty */
  latitude?: number;
  /** County centroid longitude — used for fallback when FIPS returns empty */
  longitude?: number;
  /** ZIP code — tertiary fallback */
  zipCode?: string;
  /** Compact mode for Morning Dashboard (fewer rows, no tabs) */
  compact?: boolean;
}

export function GrainBidCard({
  countyFips,
  countyName,
  stateAbbr,
  latitude,
  longitude,
  zipCode,
  compact = false,
}: GrainBidCardProps) {
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCommodity, setActiveCommodity] = useState<string>('corn');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [searchRadius, setSearchRadius] = useState<string | null>(null);

  const fetchBids = useCallback(async () => {
    setLoading(true);
    setError(false);
    setSearchRadius(null);

    try {
      // Step 1: Try FIPS code (direct county boundary)
      const fipsRes = await fetch(`/api/grain-bids?fips=${countyFips}&max=20`);
      if (!fipsRes.ok) throw new Error(`HTTP ${fipsRes.status}`);
      const fipsData: GrainBidResponse = await fipsRes.json();

      if (fipsData.elevators && fipsData.elevators.length > 0) {
        setElevators(fipsData.elevators);
        setLastFetched(new Date());
        autoSelectCommodity(fipsData.commodities);
        return;
      }

      // Step 2: FIPS returned empty — fallback to county centroid coordinates
      if (latitude && longitude) {
        const coordRes = await fetch(
          `/api/grain-bids?lat=${latitude}&lng=${longitude}&max=20`
        );
        if (coordRes.ok) {
          const coordData: GrainBidResponse = await coordRes.json();
          if (coordData.elevators && coordData.elevators.length > 0) {
            setElevators(coordData.elevators);
            setLastFetched(new Date());
            setSearchRadius('50mi');
            autoSelectCommodity(coordData.commodities);
            return;
          }
        }
      }

      // Step 3: Coordinates also empty — try ZIP if provided
      if (zipCode) {
        const zipRes = await fetch(`/api/grain-bids?zip=${zipCode}&max=20`);
        if (zipRes.ok) {
          const zipData: GrainBidResponse = await zipRes.json();
          if (zipData.elevators && zipData.elevators.length > 0) {
            setElevators(zipData.elevators);
            setLastFetched(new Date());
            setSearchRadius('50mi');
            autoSelectCommodity(zipData.commodities);
            return;
          }
        }
      }

      // All methods returned empty
      setElevators([]);
      setLastFetched(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [countyFips, latitude, longitude, zipCode]);

  function autoSelectCommodity(commodities: string[] | undefined) {
    if (!commodities || commodities.length === 0) return;
    const first = COMMODITY_TABS.find((t) =>
      commodities.some((c) => c.toLowerCase() === t.key)
    );
    if (first) setActiveCommodity(first.key);
  }

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // ── Filter and sort elevators for active commodity ────────────────────

  const filteredElevators = elevators
    .map((e) => {
      const commodityBids = e.bids.filter(
        (b) => b.commodity.toLowerCase() === activeCommodity
      );
      if (commodityBids.length === 0) return null;
      const bestBid = commodityBids.sort(
        (a, b) => b.cashPrice - a.cashPrice
      )[0];
      return { ...e, bestBid };
    })
    .filter(Boolean) as Array<Elevator & { bestBid: NormalizedBid }>;

  filteredElevators.sort((a, b) => b.bestBid.cashPrice - a.bestBid.cashPrice);

  const availableTabs = COMMODITY_TABS.filter((t) =>
    elevators.some((e) =>
      e.bids.some((b) => b.commodity.toLowerCase() === t.key)
    )
  );

  const maxRows = compact ? 5 : 10;

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#1B4332]/5 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#1B4332] animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 21V8l9-5 9 5v13" />
              <path d="M9 21V12h6v9" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#1B4332]">
              Loading Grain Bids...
            </h3>
            <p className="text-[11px] text-gray-400">
              Fetching nearby elevator prices
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error / no data ───────────────────────────────────────────────────
  if (error || elevators.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#1B4332]">
              Grain Bids
            </h3>
            <p className="text-[12px] text-gray-400">
              {error
                ? 'Unable to load grain bid data. Please try again later.'
                : `No grain elevator data available near ${countyName}, ${stateAbbr}. This area may not have active grain buying facilities.`}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <BarchartAttribution variant="compact" />
        </div>
      </div>
    );
  }

  // ── Summary stats ─────────────────────────────────────────────────────
  const topBid = filteredElevators[0]?.bestBid;
  const worstBid =
    filteredElevators[filteredElevators.length - 1]?.bestBid;
  const spread =
    topBid && worstBid && filteredElevators.length > 1
      ? (topBid.cashPrice - worstBid.cashPrice).toFixed(2)
      : null;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1B4332]/5 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[#1B4332]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 21V8l9-5 9 5v13" />
                <path d="M9 21V12h6v9" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1B4332]">
                {compact ? 'Local Grain Bids' : 'Nearby Grain Bids'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {filteredElevators.length} elevator
                {filteredElevators.length !== 1 ? 's' : ''} near{' '}
                {countyName}, {stateAbbr}
                {searchRadius && (
                  <span className="text-amber-500 ml-1">
                    (within {searchRadius} radius)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Top bid highlight */}
          {topBid && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {spread && parseFloat(spread) > 0 ? 'Price Spread' : 'Best Bid'}
              </span>
              <span className="text-[16px] font-extrabold text-emerald-700 tabular-nums">
                {spread && parseFloat(spread) > 0
                  ? `$${spread}`
                  : `$${topBid.cashPrice.toFixed(2)}`}
              </span>
              <span className="text-[10px] text-gray-400">/bu</span>
            </div>
          )}
        </div>

        {/* Commodity tabs */}
        {availableTabs.length > 1 && !compact && (
          <div className="flex gap-1.5">
            {availableTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveCommodity(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  activeCommodity === t.key
                    ? 'bg-[#1B4332] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Elevator list */}
      <div className="divide-y divide-gray-50">
        {filteredElevators.slice(0, maxRows).map((elevator, index) => {
          const isTop = index === 0;
          const basis = elevator.bestBid.basis;
          const basisColor =
            basis >= 0
              ? 'text-emerald-600'
              : basis > -0.30
                ? 'text-amber-600'
                : 'text-red-500';

          const changeColor =
            elevator.bestBid.change > 0
              ? 'text-emerald-600'
              : elevator.bestBid.change < 0
                ? 'text-red-500'
                : 'text-gray-400';

          return (
            <div
              key={`${elevator.id}-${index}`}
              className={`flex items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors ${
                isTop ? 'bg-emerald-50/30' : ''
              }`}
            >
              {/* Rank */}
              <div className="w-6 shrink-0">
                {isTop ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                    1
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-gray-300 tabular-nums">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Elevator info */}
              <div className="flex-1 min-w-0 ml-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[13px] font-semibold truncate ${
                      isTop ? 'text-emerald-800' : 'text-gray-700'
                    }`}
                  >
                    {elevator.name}
                  </span>
                  {isTop && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Best
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400">
                    {elevator.city}, {elevator.state}
                    {elevator.distance > 0 &&
                      ` · ${elevator.distance.toFixed(0)} mi`}
                  </span>
                  {elevator.bestBid.change !== 0 && (
                    <span
                      className={`text-[10px] font-semibold tabular-nums ${changeColor}`}
                    >
                      {elevator.bestBid.change > 0 ? '+' : ''}
                      {elevator.bestBid.change.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>

              {/* Basis */}
              <div className="text-right mr-5 shrink-0">
                <span
                  className={`text-[12px] font-bold tabular-nums ${basisColor}`}
                >
                  {basis >= 0 ? '+' : ''}
                  {(basis * 100).toFixed(0)}¢
                </span>
                <span className="block text-[9px] text-gray-400 uppercase">
                  Basis
                </span>
              </div>

              {/* Cash price */}
              <div className="text-right shrink-0">
                <span
                  className={`text-[15px] font-extrabold tabular-nums ${
                    isTop ? 'text-emerald-700' : 'text-gray-800'
                  }`}
                >
                  ${elevator.bestBid.cashPrice.toFixed(2)}
                </span>
                <span className="block text-[9px] text-gray-400 uppercase">
                  Cash/Bu
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more link if truncated */}
      {filteredElevators.length > maxRows && (
        <div className="px-5 py-2 text-center border-t border-gray-50">
          <span className="text-[11px] text-[#1B4332] font-semibold">
            +{filteredElevators.length - maxRows} more elevators
          </span>
        </div>
      )}

      {/* Footer with attribution */}
      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <BarchartAttribution variant="compact" />
          {lastFetched && (
            <span className="text-[9px] text-gray-300 shrink-0 ml-3">
              Updated:{' '}
              {lastFetched.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
