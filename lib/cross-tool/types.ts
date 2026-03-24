// =============================================================================
// HarvestFile — Phase 31 Build 1: Cross-Tool Integration Types
// lib/cross-tool/types.ts
//
// Shared types used across all 16+ tools for cross-tool data exchange.
// Every tool imports from here — this is the contract that binds the platform.
// =============================================================================

// ─── Historical Enrollment ───────────────────────────────────────────────────

export interface HistoricalEnrollmentYear {
  year: number;
  arc_acres: number;
  plc_acres: number;
  total: number;
  arc_pct: number;
  plc_pct: number;
}

// ─── Live Benchmark Data ─────────────────────────────────────────────────────

export interface LiveBenchmarkData {
  arc_co_count: number;
  plc_count: number;
  total: number;
  arc_co_pct: number | null;
  plc_pct: number | null;
  is_visible: boolean;
}

// ─── Social Proof ────────────────────────────────────────────────────────────

export interface SocialProofData {
  state_this_week: number;
  state_counties_this_week: number;
  state_total: number;
  county_total: number;
}

// ─── County Info ─────────────────────────────────────────────────────────────

export interface CountyInfo {
  county_fips: string;
  county_name: string;
  state_abbr: string;
  state_fips: string;
}

// ─── Full Benchmark Context ──────────────────────────────────────────────────
// This is the unified data object that any tool can request for a county/crop.
// It combines historical FSA enrollment, live 2026 crowdsourced benchmarks,
// and social proof metrics into one atomic fetch.

export interface BenchmarkContext {
  county: CountyInfo;
  commodity: string;
  historical: HistoricalEnrollmentYear[];
  live_2026: LiveBenchmarkData;
  social_proof: SocialProofData;
  // Derived insights computed from the raw data
  insights: BenchmarkInsights;
}

export interface BenchmarkInsights {
  /** Dominant program across all historical years (ARC-CO or PLC) */
  historical_dominant: 'ARC-CO' | 'PLC' | 'SPLIT';
  /** Average ARC-CO percentage across all historical years */
  historical_avg_arc_pct: number;
  /** Trend direction: are farmers shifting toward ARC or PLC? */
  trend_direction: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE';
  /** Most recent historical year's ARC percentage */
  most_recent_arc_pct: number;
  /** Most recent historical year number */
  most_recent_year: number;
  /** Whether live 2026 data has enough submissions to be meaningful */
  live_data_meaningful: boolean;
  /** Human-readable summary for AI consumption */
  summary: string;
}

// ─── Cross-Tool Farm Context ─────────────────────────────────────────────────
// Assembles everything known about a farmer's context from across all tools.
// Used by the AI Advisor to give hyper-personalized recommendations.

export interface CrossToolFarmContext {
  /** County/state from the most recent calculator run or profile */
  county_fips: string | null;
  county_name: string | null;
  state_abbr: string | null;
  /** Commodity from the most recent calculator run */
  commodity: string | null;
  /** Base acres from the most recent calculator run */
  base_acres: number | null;
  /** The calculator's recommended choice */
  recommended_choice: 'ARC-CO' | 'PLC' | null;
  /** ARC-CO projected payment from calculator */
  arc_payment: number | null;
  /** PLC projected payment from calculator */
  plc_payment: number | null;
  /** Whether this farmer has submitted a benchmark election */
  has_submitted_benchmark: boolean;
  /** Benchmark context for this farmer's county/commodity if available */
  benchmark: BenchmarkContext | null;
}

// ─── Futures Price Snapshot ──────────────────────────────────────────────────

export interface FuturesPriceSnapshot {
  commodity: string;
  settle: number;
  price_date: string;
  high: number | null;
  low: number | null;
  daily_change: number | null;
}
