// =============================================================================
// HarvestFile — Build 18 Deploy 3: Shared Farm Data Store
// lib/stores/farm-store.ts
//
// THE FOUNDATION. This Zustand store holds all farm input state and computed
// results for all 5 merged tools (Calculator, Election Map, Optimizer,
// Payment Scanner, Base Acre Analyzer). Every tool reads from this store.
// Every calculation writes to it. The URL syncs with it.
//
// Deploy 3 additions:
//   - HistoricalPaymentYear type updated with dataStatus + context fields
//   - HistoricalSummary type for aggregate stats
//   - historicalCacheKey for fetch-on-tab-activation deduplication
//   - historicalError for error state rendering
//
// Deploy 4 additions:
//   - ElectionData type for county election enrollment data
//   - electionData, electionsCacheKey, electionsError fields
//   - invalidateElections action
//
// Architecture:
//   - inputs: farm location, crop, acres (set by wizard Steps 1-2)
//   - comparison: ARC vs PLC result (set by estimate API)
//   - historical: past payment data (fetched on results load)
//   - elections: county election context (fetched on results load)
//   - optimization: multi-crop strategy (computed on demand)
//   - baseAcres: FBA analysis (computed on demand)
//   - ui: wizard step, active tab, loading states
//
// Zustand was chosen for:
//   - 1.16KB gzipped (smallest viable state manager)
//   - Works outside React (Web Workers, SSR)
//   - Selector-based subscriptions (no unnecessary re-renders)
//   - No provider needed (unlike Context)
// =============================================================================

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FarmInputs {
  stateAbbr: string;
  countyFips: string;
  countyName: string;
  countySlug: string;
  cropCode: string;
  acres: string;  // stored as string for input formatting (commas)
}

export interface ComparisonResult {
  arc: number;
  plc: number;
  arcPerAcre: number;
  plcPerAcre: number;
  best: 'ARC-CO' | 'PLC';
  diff: number;
  diffPerAcre: number;
  // Extended fields from county-specific estimate API
  cropYear?: number;
  overallWinner?: 'ARC-CO' | 'PLC';
  cumulativeArcPerAcre?: number;
  cumulativePlcPerAcre?: number;
  summary?: string;
  benchmarkYield?: number;
  benchmarkPrice?: number;
  effectiveRefPrice?: number;
  projectedMYA?: number;
  projectedYield?: number;
  projectedYears?: number;
}

// Deploy 3: Updated historical payment types
export interface HistoricalPaymentYear {
  cropYear: number;
  arcPerAcre: number;
  plcPerAcre: number;
  winner: 'ARC-CO' | 'PLC' | 'TIE';
  dataStatus: 'final' | 'estimated';
  // Context data for tooltips
  myaPrice: number;
  countyYield: number;
  benchmarkYield: number;
}

export interface HistoricalSummary {
  years: number;
  arcWins: number;
  plcWins: number;
  ties: number;
  totalArcPerAcre: number;
  totalPlcPerAcre: number;
  avgArcPerAcre: number;
  avgPlcPerAcre: number;
  overallWinner: 'ARC-CO' | 'PLC' | 'TIE';
}

export interface HistoricalData {
  data: HistoricalPaymentYear[];
  summary: HistoricalSummary;
  countyFips: string;
  commodityCode: string;
}

// Deploy 4: County election enrollment data
export interface ElectionYearData {
  programYear: number;
  arccoAcres: number;
  plcAcres: number;
  totalAcres: number;
  arccoPct: number;
  plcPct: number;
}

export interface ElectionInsightsData {
  dominant: 'ARC-CO' | 'PLC' | 'SPLIT';
  dominantPct: number;
  trendDirection: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE';
  trendShift: number;
  streak: number;
  latestYear: number;
}

export interface ElectionData {
  data: ElectionYearData[];
  insights: ElectionInsightsData | null;
  countyName: string;
  stateName: string;
  countyFips: string;
  totalCrops: number;
}

export interface ElectionContextData {
  countyName: string;
  stateAbbr: string;
  historical: Array<{
    year: number;
    arc_acres: number;
    plc_acres: number;
    total: number;
    arc_pct: number;
    plc_pct: number;
  }>;
  live2026: {
    arc_co_count: number;
    plc_count: number;
    total: number;
    arc_co_pct: number | null;
    plc_pct: number | null;
    is_visible: boolean;
  } | null;
  insights: {
    historical_dominant: 'ARC-CO' | 'PLC' | 'SPLIT';
    historical_avg_arc_pct: number;
    trend_direction: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE';
    most_recent_arc_pct: number;
    most_recent_year: number;
    live_data_meaningful: boolean;
    summary: string;
  } | null;
}

export interface MultiCropResult {
  cropCode: string;
  cropName: string;
  acres: number;
  recommended: 'ARC-CO' | 'PLC';
  arcPerAcre: number;
  plcPerAcre: number;
  confidence: number; // 0-100
}

export interface BaseAcreData {
  cropCode: string;
  cropName: string;
  baseAcres: number;
  currentYield: number;
  historicalYield: number;
  paymentRate: number;
}

export type ResultTab =
  | 'comparison'
  | 'historical'
  | 'elections'
  | 'optimization'
  | 'base-acres';

// ─── Store Shape ─────────────────────────────────────────────────────────────

interface FarmStoreState {
  // ── Farm Inputs (set by wizard) ──────────────────────────────────────────
  inputs: FarmInputs;

  // ── County Data ──────────────────────────────────────────────────────────
  counties: Array<{
    county_fips: string;
    display_name: string;
    slug: string;
  }>;
  loadingCounties: boolean;

  // ── Wizard UI State ──────────────────────────────────────────────────────
  step: number;          // 1=location, 2=farm, 3=results
  activeTab: ResultTab;  // which results tab is shown
  calculating: boolean;

  // ── Tool Results ─────────────────────────────────────────────────────────
  comparison: ComparisonResult | null;
  isCountySpecific: boolean;
  dataYears: number;

  // Deploy 3: Historical payment data with caching
  historical: HistoricalData | null;
  loadingHistorical: boolean;
  historicalError: string | null;
  historicalCacheKey: string | null;  // "countyFips:commodityCode" — prevents re-fetch

  // Deploy 4: County election data with caching
  electionData: ElectionData | null;
  loadingElections: boolean;
  electionsError: string | null;
  electionsCacheKey: string | null;

  optimization: MultiCropResult[] | null;
  loadingOptimization: boolean;

  baseAcres: BaseAcreData[] | null;
  loadingBaseAcres: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────

  // Input actions
  setInput: <K extends keyof FarmInputs>(key: K, value: FarmInputs[K]) => void;
  setInputs: (partial: Partial<FarmInputs>) => void;
  resetInputs: () => void;

  // County actions
  setCounties: (counties: FarmStoreState['counties']) => void;
  setLoadingCounties: (v: boolean) => void;

  // Wizard actions
  setStep: (step: number) => void;
  setActiveTab: (tab: ResultTab) => void;
  setCalculating: (v: boolean) => void;

  // Result actions
  setComparison: (result: ComparisonResult | null) => void;
  setIsCountySpecific: (v: boolean) => void;
  setDataYears: (v: number) => void;

  // Deploy 3: Historical actions
  setHistorical: (data: HistoricalData | null) => void;
  setLoadingHistorical: (v: boolean) => void;
  setHistoricalError: (error: string | null) => void;
  setHistoricalCacheKey: (key: string | null) => void;
  invalidateHistorical: () => void;

  // Deploy 4: Elections actions
  setElectionData: (data: ElectionData | null) => void;
  setLoadingElections: (v: boolean) => void;
  setElectionsError: (error: string | null) => void;
  setElectionsCacheKey: (key: string | null) => void;
  invalidateElections: () => void;

  setOptimization: (data: MultiCropResult[] | null) => void;
  setLoadingOptimization: (v: boolean) => void;

  setBaseAcres: (data: BaseAcreData[] | null) => void;
  setLoadingBaseAcres: (v: boolean) => void;

  // Compound actions
  resetResults: () => void;
  resetAll: () => void;
}

// ─── Default Values ──────────────────────────────────────────────────────────

const DEFAULT_INPUTS: FarmInputs = {
  stateAbbr: '',
  countyFips: '',
  countyName: '',
  countySlug: '',
  cropCode: '',
  acres: '',
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useFarmStore = create<FarmStoreState>((set) => ({
  // Initial state
  inputs: { ...DEFAULT_INPUTS },
  counties: [],
  loadingCounties: false,
  step: 1,
  activeTab: 'comparison',
  calculating: false,
  comparison: null,
  isCountySpecific: false,
  dataYears: 0,
  historical: null,
  loadingHistorical: false,
  historicalError: null,
  historicalCacheKey: null,
  electionData: null,
  loadingElections: false,
  electionsError: null,
  electionsCacheKey: null,
  optimization: null,
  loadingOptimization: false,
  baseAcres: null,
  loadingBaseAcres: false,

  // ── Input Actions ────────────────────────────────────────────────────────

  setInput: (key, value) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: value },
    })),

  setInputs: (partial) =>
    set((state) => ({
      inputs: { ...state.inputs, ...partial },
    })),

  resetInputs: () =>
    set({ inputs: { ...DEFAULT_INPUTS } }),

  // ── County Actions ───────────────────────────────────────────────────────

  setCounties: (counties) => set({ counties }),
  setLoadingCounties: (loadingCounties) => set({ loadingCounties }),

  // ── Wizard Actions ───────────────────────────────────────────────────────

  setStep: (step) => set({ step }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setCalculating: (calculating) => set({ calculating }),

  // ── Result Actions ───────────────────────────────────────────────────────

  setComparison: (comparison) => set({ comparison }),
  setIsCountySpecific: (isCountySpecific) => set({ isCountySpecific }),
  setDataYears: (dataYears) => set({ dataYears }),

  // Deploy 3: Historical actions
  setHistorical: (historical) => set({ historical }),
  setLoadingHistorical: (loadingHistorical) => set({ loadingHistorical }),
  setHistoricalError: (historicalError) => set({ historicalError }),
  setHistoricalCacheKey: (historicalCacheKey) => set({ historicalCacheKey }),
  invalidateHistorical: () =>
    set({ historical: null, historicalCacheKey: null, historicalError: null }),

  // Deploy 4: Elections actions
  setElectionData: (electionData) => set({ electionData }),
  setLoadingElections: (loadingElections) => set({ loadingElections }),
  setElectionsError: (electionsError) => set({ electionsError }),
  setElectionsCacheKey: (electionsCacheKey) => set({ electionsCacheKey }),
  invalidateElections: () =>
    set({ electionData: null, electionsCacheKey: null, electionsError: null }),

  setOptimization: (optimization) => set({ optimization }),
  setLoadingOptimization: (loadingOptimization) => set({ loadingOptimization }),

  setBaseAcres: (baseAcres) => set({ baseAcres }),
  setLoadingBaseAcres: (loadingBaseAcres) => set({ loadingBaseAcres }),

  // ── Compound Actions ─────────────────────────────────────────────────────

  resetResults: () =>
    set({
      comparison: null,
      isCountySpecific: false,
      dataYears: 0,
      historical: null,
      historicalCacheKey: null,
      historicalError: null,
      electionData: null,
      electionsCacheKey: null,
      electionsError: null,
      optimization: null,
      baseAcres: null,
      activeTab: 'comparison',
    }),

  resetAll: () =>
    set({
      inputs: { ...DEFAULT_INPUTS },
      counties: [],
      loadingCounties: false,
      step: 1,
      activeTab: 'comparison',
      calculating: false,
      comparison: null,
      isCountySpecific: false,
      dataYears: 0,
      historical: null,
      loadingHistorical: false,
      historicalError: null,
      historicalCacheKey: null,
      electionData: null,
      loadingElections: false,
      electionsError: null,
      electionsCacheKey: null,
      optimization: null,
      loadingOptimization: false,
      baseAcres: null,
      loadingBaseAcres: false,
    }),
}));

// ─── Selectors (for performance — components subscribe to slices) ────────────
// Use these instead of accessing the full store to prevent unnecessary re-renders.

export const selectInputs = (state: FarmStoreState) => state.inputs;
export const selectStep = (state: FarmStoreState) => state.step;
export const selectActiveTab = (state: FarmStoreState) => state.activeTab;
export const selectComparison = (state: FarmStoreState) => state.comparison;
export const selectIsCountySpecific = (state: FarmStoreState) => state.isCountySpecific;
export const selectDataYears = (state: FarmStoreState) => state.dataYears;
export const selectCalculating = (state: FarmStoreState) => state.calculating;
export const selectCounties = (state: FarmStoreState) => state.counties;
export const selectLoadingCounties = (state: FarmStoreState) => state.loadingCounties;
export const selectHistorical = (state: FarmStoreState) => state.historical;
export const selectHistoricalError = (state: FarmStoreState) => state.historicalError;
export const selectLoadingHistorical = (state: FarmStoreState) => state.loadingHistorical;
export const selectElectionData = (state: FarmStoreState) => state.electionData;
export const selectElectionsError = (state: FarmStoreState) => state.electionsError;
export const selectOptimization = (state: FarmStoreState) => state.optimization;
export const selectBaseAcres = (state: FarmStoreState) => state.baseAcres;

// ─── Helper: Get parsed acres as number ──────────────────────────────────────

export function getParsedAcres(state: FarmStoreState): number {
  return parseInt(state.inputs.acres.replace(/,/g, '')) || 0;
}
