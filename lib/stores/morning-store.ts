// =============================================================================
// HarvestFile — Surface 2 Deploy 1: Morning Dashboard Store
// lib/stores/morning-store.ts
//
// Zustand store for the Farm Command Center (/morning).
// Manages CLIENT-SIDE UI state only — all server data lives in TanStack Query.
//
// Domain slices:
//   - season: derived from date + latitude, drives layout reordering
//   - sections: visibility, ordering, expanded/collapsed state
//   - markets: watchlist, chart timeframe, expanded commodity
//   - weather: preferred units, expanded forecast day
//   - grain: commodity filter, expanded elevator
//   - spray: wind/temp thresholds for spray window alerts
//   - calendar: visible report types, dismissed reminders
//
// Persistence: uses Zustand persist middleware with partialize to cache
// only user preferences in localStorage — NEVER volatile data.
//
// CRITICAL: This store is SEPARATE from farm-store.ts (Surface 1).
// Different data lifecycles, different refresh patterns, different pages.
// Shared location data lives in location-store.ts.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Season Types ────────────────────────────────────────────────────────────

export type AgriculturalSeason = 'planting' | 'growing' | 'harvest' | 'planning';

/**
 * Derive the current agricultural season from date and latitude.
 * Northern latitudes shift planting later, harvest earlier.
 */
export function getCurrentSeason(lat?: number): AgriculturalSeason {
  const month = new Date().getMonth(); // 0-indexed

  // Latitude adjustment: every 5° north of 35°N shifts planting ~2 weeks later
  const latOffset = lat && lat > 35 ? Math.floor((lat - 35) / 5) : 0;

  // Adjusted month boundaries (base: 35°N latitude like central Kansas)
  const plantingStart = 2 + latOffset;  // March (default) → later for ND/MN
  const growingStart = 5 + latOffset;   // June (default) → later for ND/MN
  const harvestStart = 8;                // September (universal — corn/soybean maturity)
  const planningStart = 11;              // December (universal — winter planning)

  if (month >= planningStart || month < plantingStart) return 'planning';
  if (month >= plantingStart && month < growingStart) return 'planting';
  if (month >= growingStart && month < harvestStart) return 'growing';
  return 'harvest';
}

// ─── Section Configuration ───────────────────────────────────────────────────

export type SectionId =
  | 'stats'
  | 'payments'
  | 'grain-bids'
  | 'weather'
  | 'markets'
  | 'grain-analysis'
  | 'spray'
  | 'calendar'
  | 'actions';

export interface SectionConfig {
  id: SectionId;
  visible: boolean;
  collapsed: boolean;
}

// Default section order (adjusted per season in D5)
const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'stats', visible: true, collapsed: false },
  { id: 'payments', visible: true, collapsed: false },
  { id: 'grain-bids', visible: true, collapsed: false },
  { id: 'weather', visible: true, collapsed: false },
  { id: 'markets', visible: true, collapsed: false },
  { id: 'grain-analysis', visible: true, collapsed: false },
  { id: 'spray', visible: true, collapsed: false },
  { id: 'calendar', visible: true, collapsed: false },
  { id: 'actions', visible: true, collapsed: false },
];

// ─── Markets Slice ───────────────────────────────────────────────────────────

export type ChartTimeframe = '7d' | '30d' | '90d' | '6m' | '1y';

interface MarketsSlice {
  watchlist: string[];              // commodity codes: ['CORN', 'SOYBEANS', 'WHEAT']
  chartTimeframe: ChartTimeframe;
  expandedCommodity: string | null; // null = all collapsed
}

// ─── Weather Slice ───────────────────────────────────────────────────────────

interface WeatherSlice {
  tempUnit: 'F' | 'C';
  expandedDay: number | null;       // index of expanded forecast day
  showSoilData: boolean;
  showGDD: boolean;
}

// ─── Grain Slice ─────────────────────────────────────────────────────────────

interface GrainSlice {
  commodityFilter: string;          // 'all' | 'corn' | 'soybeans' | 'wheat'
  expandedElevator: string | null;  // elevator ID
  showBasisChart: boolean;
}

// ─── Spray Slice ─────────────────────────────────────────────────────────────

interface SpraySlice {
  windThresholdMph: number;         // max wind speed for spraying (default: 10)
  tempMinF: number;                 // min temp for spraying (default: 45)
  tempMaxF: number;                 // max temp for spraying (default: 85)
  humidityMaxPct: number;           // max humidity (default: 80)
  inversionAlert: boolean;          // alert for temperature inversions
}

// ─── Calendar Slice ──────────────────────────────────────────────────────────

interface CalendarSlice {
  showHighImpactOnly: boolean;
  dismissedReportIds: string[];     // USDA report IDs dismissed this session
}

// ─── Combined Store ──────────────────────────────────────────────────────────

interface MorningStoreState {
  // Season
  season: AgriculturalSeason;
  refreshSeason: (lat?: number) => void;

  // Sections
  sections: SectionConfig[];
  toggleSectionVisibility: (id: SectionId) => void;
  toggleSectionCollapse: (id: SectionId) => void;
  reorderSections: (orderedIds: SectionId[]) => void;
  resetSections: () => void;

  // Markets
  markets: MarketsSlice;
  setWatchlist: (codes: string[]) => void;
  setChartTimeframe: (tf: ChartTimeframe) => void;
  setExpandedCommodity: (code: string | null) => void;

  // Weather
  weather: WeatherSlice;
  setTempUnit: (unit: 'F' | 'C') => void;
  setExpandedDay: (index: number | null) => void;
  toggleSoilData: () => void;
  toggleGDD: () => void;

  // Grain
  grain: GrainSlice;
  setGrainCommodityFilter: (filter: string) => void;
  setExpandedElevator: (id: string | null) => void;
  toggleBasisChart: () => void;

  // Spray
  spray: SpraySlice;
  setSprayThresholds: (partial: Partial<SpraySlice>) => void;

  // Calendar
  calendar: CalendarSlice;
  toggleHighImpactOnly: () => void;
  dismissReport: (reportId: string) => void;
  clearDismissedReports: () => void;

  // Reset everything
  resetAll: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_MARKETS: MarketsSlice = {
  watchlist: ['CORN', 'SOYBEANS', 'WHEAT'],
  chartTimeframe: '30d',
  expandedCommodity: null,
};

const DEFAULT_WEATHER: WeatherSlice = {
  tempUnit: 'F',
  expandedDay: null,
  showSoilData: true,
  showGDD: true,
};

const DEFAULT_GRAIN: GrainSlice = {
  commodityFilter: 'all',
  expandedElevator: null,
  showBasisChart: false,
};

const DEFAULT_SPRAY: SpraySlice = {
  windThresholdMph: 10,
  tempMinF: 45,
  tempMaxF: 85,
  humidityMaxPct: 80,
  inversionAlert: true,
};

const DEFAULT_CALENDAR: CalendarSlice = {
  showHighImpactOnly: false,
  dismissedReportIds: [],
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMorningStore = create<MorningStoreState>()(
  persist(
    (set) => ({
      // ── Season ──────────────────────────────────────────────────────────
      season: getCurrentSeason(),
      refreshSeason: (lat) => set({ season: getCurrentSeason(lat) }),

      // ── Sections ────────────────────────────────────────────────────────
      sections: [...DEFAULT_SECTIONS],
      toggleSectionVisibility: (id) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, visible: !sec.visible } : sec
          ),
        })),
      toggleSectionCollapse: (id) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, collapsed: !sec.collapsed } : sec
          ),
        })),
      reorderSections: (orderedIds) =>
        set((s) => {
          const sectionMap = new Map(s.sections.map((sec) => [sec.id, sec]));
          return {
            sections: orderedIds
              .map((id) => sectionMap.get(id))
              .filter(Boolean) as SectionConfig[],
          };
        }),
      resetSections: () => set({ sections: [...DEFAULT_SECTIONS] }),

      // ── Markets ─────────────────────────────────────────────────────────
      markets: { ...DEFAULT_MARKETS },
      setWatchlist: (codes) =>
        set((s) => ({ markets: { ...s.markets, watchlist: codes } })),
      setChartTimeframe: (tf) =>
        set((s) => ({ markets: { ...s.markets, chartTimeframe: tf } })),
      setExpandedCommodity: (code) =>
        set((s) => ({ markets: { ...s.markets, expandedCommodity: code } })),

      // ── Weather ─────────────────────────────────────────────────────────
      weather: { ...DEFAULT_WEATHER },
      setTempUnit: (unit) =>
        set((s) => ({ weather: { ...s.weather, tempUnit: unit } })),
      setExpandedDay: (index) =>
        set((s) => ({ weather: { ...s.weather, expandedDay: index } })),
      toggleSoilData: () =>
        set((s) => ({ weather: { ...s.weather, showSoilData: !s.weather.showSoilData } })),
      toggleGDD: () =>
        set((s) => ({ weather: { ...s.weather, showGDD: !s.weather.showGDD } })),

      // ── Grain ───────────────────────────────────────────────────────────
      grain: { ...DEFAULT_GRAIN },
      setGrainCommodityFilter: (filter) =>
        set((s) => ({ grain: { ...s.grain, commodityFilter: filter } })),
      setExpandedElevator: (id) =>
        set((s) => ({ grain: { ...s.grain, expandedElevator: id } })),
      toggleBasisChart: () =>
        set((s) => ({ grain: { ...s.grain, showBasisChart: !s.grain.showBasisChart } })),

      // ── Spray ───────────────────────────────────────────────────────────
      spray: { ...DEFAULT_SPRAY },
      setSprayThresholds: (partial) =>
        set((s) => ({ spray: { ...s.spray, ...partial } })),

      // ── Calendar ────────────────────────────────────────────────────────
      calendar: { ...DEFAULT_CALENDAR },
      toggleHighImpactOnly: () =>
        set((s) => ({
          calendar: { ...s.calendar, showHighImpactOnly: !s.calendar.showHighImpactOnly },
        })),
      dismissReport: (reportId) =>
        set((s) => ({
          calendar: {
            ...s.calendar,
            dismissedReportIds: [...s.calendar.dismissedReportIds, reportId],
          },
        })),
      clearDismissedReports: () =>
        set((s) => ({ calendar: { ...s.calendar, dismissedReportIds: [] } })),

      // ── Reset ───────────────────────────────────────────────────────────
      resetAll: () =>
        set({
          season: getCurrentSeason(),
          sections: [...DEFAULT_SECTIONS],
          markets: { ...DEFAULT_MARKETS },
          weather: { ...DEFAULT_WEATHER },
          grain: { ...DEFAULT_GRAIN },
          spray: { ...DEFAULT_SPRAY },
          calendar: { ...DEFAULT_CALENDAR },
        }),
    }),
    {
      name: 'hf-morning-prefs',
      // Only persist user preferences — NEVER volatile data
      partialize: (state) => ({
        sections: state.sections,
        markets: state.markets,
        weather: state.weather,
        grain: state.grain,
        spray: state.spray,
        calendar: state.calendar,
      }),
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectSeason = (s: MorningStoreState) => s.season;
export const selectSections = (s: MorningStoreState) => s.sections;
export const selectVisibleSections = (s: MorningStoreState) =>
  s.sections.filter((sec) => sec.visible);
export const selectMarkets = (s: MorningStoreState) => s.markets;
export const selectWeather = (s: MorningStoreState) => s.weather;
export const selectGrain = (s: MorningStoreState) => s.grain;
export const selectSpray = (s: MorningStoreState) => s.spray;
export const selectCalendar = (s: MorningStoreState) => s.calendar;
