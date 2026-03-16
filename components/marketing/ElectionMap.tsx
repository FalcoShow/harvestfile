// =============================================================================
// HarvestFile — Phase 8B: Interactive County Election Choropleth
// "Fill the Map" — The viral growth engine visualized
//
// Premium dark-mode county-level US choropleth showing ARC-CO vs PLC
// election splits. Hover for county details, click to navigate.
// Inspired by CNN election maps, NYT data viz, and Linear's design language.
//
// Stack: react-simple-maps + us-atlas TopoJSON + d3-scale
// Performance: ~3,100 SVG paths, React.memo'd, CSS transitions for color
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CountyData {
  arc_pct: number;
  plc_pct: number;
  total: number;
}

interface CountyName {
  name: string;
  state: string;
}

interface MapData {
  counties: Record<string, CountyData>;
  names: Record<string, CountyName>;
  kpi: {
    total_counties: number;
    total_acres: number;
    arc_pct: number;
    plc_pct: number;
  };
  year: number;
  commodity: string;
}

interface TooltipState {
  x: number;
  y: number;
  fips: string;
  data: CountyData | null;
  name: CountyName | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

const COMMODITIES = [
  { code: 'ALL', label: 'All Crops', emoji: '🌾' },
  { code: 'CORN', label: 'Corn', emoji: '🌽' },
  { code: 'SOYBEANS', label: 'Soybeans', emoji: '🫘' },
  { code: 'WHEAT', label: 'Wheat', emoji: '🌾' },
  { code: 'COTTON', label: 'Cotton', emoji: '☁️' },
  { code: 'RICE', label: 'Rice', emoji: '🍚' },
  { code: 'SORGHUM', label: 'Sorghum', emoji: '🌿' },
];

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019];

// Diverging color scale: Emerald (ARC-CO) → Slate → Blue (PLC)
const COLOR_SCALE = [
  { threshold: 90, color: '#047857' },  // emerald-700 — very strong ARC
  { threshold: 75, color: '#059669' },  // emerald-600
  { threshold: 65, color: '#10b981' },  // emerald-500
  { threshold: 55, color: '#6ee7b7' },  // emerald-300 — slight ARC lean
  { threshold: 45, color: '#94a3b8' },  // slate-400 — balanced
  { threshold: 35, color: '#93c5fd' },  // blue-300 — slight PLC lean
  { threshold: 25, color: '#3b82f6' },  // blue-500
  { threshold: 10, color: '#2563eb' },  // blue-600
  { threshold: 0,  color: '#1d4ed8' },  // blue-700 — very strong PLC
];

const NO_DATA_COLOR = '#1e293b'; // slate-800
const COUNTY_STROKE = '#0f172a'; // slate-900
const STATE_STROKE = '#334155';  // slate-700

// ─── Color Utility ───────────────────────────────────────────────────────────

function getCountyColor(arcPct: number | undefined): string {
  if (arcPct === undefined || arcPct === null) return NO_DATA_COLOR;
  for (const { threshold, color } of COLOR_SCALE) {
    if (arcPct >= threshold) return color;
  }
  return COLOR_SCALE[COLOR_SCALE.length - 1].color;
}

// ─── Format Utilities ────────────────────────────────────────────────────────

function formatAcres(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ─── Memoized County Component ───────────────────────────────────────────────

interface CountyGeoProps {
  geo: any;
  color: string;
  onMouseEnter: (geo: any, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: (geo: any) => void;
}

const CountyGeo = memo(function CountyGeo({
  geo,
  color,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: CountyGeoProps) {
  return (
    <Geography
      geography={geo}
      fill={color}
      stroke={COUNTY_STROKE}
      strokeWidth={0.3}
      style={{
        default: { outline: 'none', transition: 'fill 400ms ease' },
        hover: { outline: 'none', filter: 'brightness(1.3)', cursor: 'pointer' },
        pressed: { outline: 'none', filter: 'brightness(0.9)' },
      }}
      onMouseEnter={(e) => onMouseEnter(geo, e)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(geo)}
    />
  );
});

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 sm:px-6">
      <div
        className="text-xl sm:text-2xl font-extrabold tracking-tight"
        style={{ color: accent || '#e2e8f0' }}
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-white/30 mt-0.5">
        {label}
      </div>
    </div>
  );
}

// ─── Color Legend ─────────────────────────────────────────────────────────────

function ColorLegend() {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4">
      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
        ARC-CO
      </span>
      <div className="flex h-3 rounded-full overflow-hidden">
        {['#047857', '#059669', '#10b981', '#6ee7b7', '#94a3b8', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8'].map(
          (color, i) => (
            <div key={i} className="w-6 sm:w-8" style={{ backgroundColor: color }} />
          )
        )}
      </div>
      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
        PLC
      </span>
      <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-white/10">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: NO_DATA_COLOR }} />
        <span className="text-[10px] text-white/25">No data</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ElectionMap() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);

  // State
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedCommodity, setSelectedCommodity] = useState('ALL');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [revealed, setRevealed] = useState(false);

  // ── Fetch map data ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRevealed(false);

    fetch(`/api/elections/map?year=${selectedYear}&commodity=${selectedCommodity}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setMapData(data);
          setLoading(false);
          setError(null);
          // Trigger reveal animation after data loads
          setTimeout(() => setRevealed(true), 100);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Map data fetch error:', err);
          setError('Failed to load election data');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedYear, selectedCommodity]);

  // ── Build FIPS lookup for O(1) access ───────────────────────────────────
  const countyLookup = useMemo(() => {
    if (!mapData) return new Map<string, CountyData>();
    const map = new Map<string, CountyData>();
    for (const [fips, data] of Object.entries(mapData.counties)) {
      map.set(fips, data);
    }
    return map;
  }, [mapData]);

  // ── Get county slug for navigation ──────────────────────────────────────
  const getCountySlug = useCallback(
    (fips: string) => {
      if (!mapData?.names[fips]) return null;
      const name = mapData.names[fips];
      // Convert "Darke County" → "darke-county" and "OH" → "ohio"
      const countySlug = name.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      // State abbr → slug lookup (we'd need full state names, use FIPS prefix instead)
      return { countySlug, stateAbbr: name.state };
    },
    [mapData]
  );

  // ── Tooltip handlers ────────────────────────────────────────────────────
  const handleMouseEnter = useCallback(
    (geo: any, e: React.MouseEvent) => {
      const fips = String(geo.id).padStart(5, '0');
      const data = countyLookup.get(fips) || null;
      const name = mapData?.names[fips] || null;
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        fips,
        data,
        name,
      });
    },
    [countyLookup, mapData]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // ── Click handler — navigate to county page ─────────────────────────────
  const handleClick = useCallback(
    (geo: any) => {
      const fips = String(geo.id).padStart(5, '0');
      const info = getCountySlug(fips);
      if (!info) return;

      // We need state slug, not abbreviation. Use a lookup.
      const stateSlug = STATE_ABBR_TO_SLUG[info.stateAbbr];
      if (stateSlug && info.countySlug) {
        router.push(`/${stateSlug}/${info.countySlug}/arc-plc`);
      }
    },
    [getCountySlug, router]
  );

  // ── Get color for a county ──────────────────────────────────────────────
  const getColor = useCallback(
    (geo: any) => {
      const fips = String(geo.id).padStart(5, '0');
      const data = countyLookup.get(fips);
      return getCountyColor(data?.arc_pct);
    },
    [countyLookup]
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={mapRef}>
      {/* ═══ KPI BAR ═══ */}
      <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-0 mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
        <KpiCard
          value={mapData ? formatNumber(mapData.kpi.total_counties) : '—'}
          label="Counties"
        />
        <div className="w-px h-10 bg-white/[0.06] hidden sm:block" />
        <KpiCard
          value={mapData ? formatAcres(mapData.kpi.total_acres) : '—'}
          label="Base Acres"
        />
        <div className="w-px h-10 bg-white/[0.06] hidden sm:block" />
        <KpiCard
          value={mapData ? `${mapData.kpi.arc_pct}%` : '—'}
          label="ARC-CO"
          accent="#10b981"
        />
        <div className="w-px h-10 bg-white/[0.06] hidden sm:block" />
        <KpiCard
          value={mapData ? `${mapData.kpi.plc_pct}%` : '—'}
          label="PLC"
          accent="#3b82f6"
        />
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        {/* Commodity pills */}
        <div className="flex flex-wrap gap-1.5">
          {COMMODITIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelectedCommodity(c.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCommodity === c.code
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'bg-transparent text-white/35 border border-white/[0.06] hover:border-white/15 hover:text-white/60'
              }`}
            >
              <span className="mr-1">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider mr-1">Year</span>
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedYear === y
                  ? 'bg-harvest-gold/20 text-harvest-gold border border-harvest-gold/30'
                  : 'text-white/30 hover:text-white/50 border border-transparent'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MAP ═══ */}
      <div
        className={`relative rounded-2xl border border-white/[0.06] overflow-hidden transition-opacity duration-700 ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: '#0c1222' }}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0c1222]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-xs text-white/30 font-medium">Loading election data...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0c1222]">
            <div className="text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-sm text-white/50">{error}</div>
              <button
                onClick={() => setSelectedYear(selectedYear)}
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* The Map */}
        <div onMouseMove={handleMouseMove}>
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 1050 }}
            width={980}
            height={600}
            style={{ width: '100%', height: 'auto' }}
          >
            <ZoomableGroup>
              <Geographies geography={TOPO_URL}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map((geo) => (
                    <CountyGeo
                      key={geo.rpicoordset || geo.id}
                      geo={geo}
                      color={getColor(geo)}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      onClick={handleClick}
                    />
                  ))
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Gradient fade at edges */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
          boxShadow: 'inset 0 0 60px 30px #0c1222',
        }} />
      </div>

      {/* ═══ LEGEND + INFO ═══ */}
      <ColorLegend />

      <div className="flex items-center justify-between mt-3 px-1">
        <span className="text-[10px] text-white/20">
          Source: {selectedYear <= 2025 ? 'USDA FSA Enrolled Base Acres' : 'HarvestFile Crowdsourced Elections'}
          {' · '}
          {selectedCommodity === 'ALL' ? 'All commodities' : selectedCommodity.charAt(0) + selectedCommodity.slice(1).toLowerCase()}
          {' · '}
          {selectedYear}
        </span>
        <span className="text-[10px] text-white/20">
          Pinch to zoom · Click county for details
        </span>
      </div>

      {/* ═══ TOOLTIP ═══ */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div
            className="rounded-xl border border-white/10 px-4 py-3 shadow-2xl min-w-[200px]"
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-sm font-bold text-white mb-0.5">
              {tooltip.name?.name || `County ${tooltip.fips}`}
              {tooltip.name?.state && (
                <span className="text-white/40 font-normal ml-1">{tooltip.name.state}</span>
              )}
            </div>

            {tooltip.data ? (
              <>
                {/* ARC/PLC split bar */}
                <div className="flex h-2 rounded-full overflow-hidden my-2">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${tooltip.data.arc_pct}%` }}
                  />
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${tooltip.data.plc_pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-emerald-400 font-semibold">
                    ARC-CO {tooltip.data.arc_pct}%
                  </span>
                  <span className="text-blue-400 font-semibold">
                    PLC {tooltip.data.plc_pct}%
                  </span>
                </div>

                <div className="text-[10px] text-white/25 mt-1.5">
                  {selectedYear <= 2025
                    ? `${formatAcres(tooltip.data.total)} enrolled base acres`
                    : `${tooltip.data.total} farmers reported`}
                </div>

                <div className="text-[10px] text-harvest-gold/60 mt-1 flex items-center gap-1">
                  <span>Click for county details</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </>
            ) : (
              <div className="text-[11px] text-white/30 mt-1">
                No election data for this county
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── State Abbreviation → Slug Lookup ────────────────────────────────────────

const STATE_ABBR_TO_SLUG: Record<string, string> = {
  AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california',
  CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia',
  HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa',
  KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland',
  MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi',
  MO: 'missouri', MT: 'montana', NE: 'nebraska', NV: 'nevada',
  NH: 'new-hampshire', NJ: 'new-jersey', NM: 'new-mexico', NY: 'new-york',
  NC: 'north-carolina', ND: 'north-dakota', OH: 'ohio', OK: 'oklahoma',
  OR: 'oregon', PA: 'pennsylvania', RI: 'rhode-island', SC: 'south-carolina',
  SD: 'south-dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont',
  VA: 'virginia', WA: 'washington', WV: 'west-virginia', WI: 'wisconsin',
  WY: 'wyoming',
};
