// =============================================================================
// HarvestFile — Barchart OnDemand API Types
// Sandbox Phase 1: getGrainBids, getHistory (Bids/Basis), getUSDA Cash Bids
// =============================================================================

// ── getGrainBids Response ────────────────────────────────────────────────

export interface BarchartGrainBid {
  /** Barchart facility location ID */
  location_id: string;
  /** Elevator/facility name */
  name: string;
  /** Street address */
  address: string;
  /** City */
  city: string;
  /** State abbreviation */
  state: string;
  /** ZIP code */
  zip: string;
  /** Phone number */
  phone: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Distance from queried location (miles) */
  distance: number;
  /** Bids for this location */
  bids: BarchartBid[];
}

export interface BarchartBid {
  /** Commodity name (e.g., "Corn", "Soybeans") */
  commodity: string;
  /** Commodity symbol (e.g., "ZC", "ZS") */
  symbol: string;
  /** Delivery period label */
  delivery_period: string;
  /** Delivery start date (ISO) */
  delivery_start: string;
  /** Delivery end date (ISO) */
  delivery_end: string;
  /** Basis value in cents (e.g., -44 = $-0.44) */
  basis: number;
  /** Cash price ($/bushel) */
  cashPrice: number;
  /** Underlying futures price ($/bushel) */
  futuresPrice: number | null;
  /** Futures contract month symbol */
  futuresMonth: string;
  /** Notes or conditions */
  notes: string;
  /** Last update timestamp */
  lastUpdate: string;
}

export interface BarchartGrainBidsResponse {
  status: { code: number; message: string };
  results: BarchartGrainBid[];
}

// ── getUSDAGrainPrices Response ──────────────────────────────────────────

export interface BarchartUSDAPrice {
  /** Commodity name */
  commodity: string;
  /** Bid type: export, processor, river, terminal, barge */
  bidType: string;
  /** Location/market name */
  location: string;
  /** Price in $/bushel */
  price: number;
  /** Basis vs. futures */
  basis: number;
  /** Futures reference symbol */
  futuresSymbol: string;
  /** Date of report */
  reportDate: string;
}

export interface BarchartUSDAGrainPricesResponse {
  status: { code: number; message: string };
  results: BarchartUSDAPrice[];
}

// ── getHistory (Bids/Basis) Response ─────────────────────────────────────

export interface BarchartHistoryEntry {
  /** Trading date (ISO) */
  tradingDay: string;
  /** Open price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Close / last price */
  close: number;
  /** Volume (if applicable) */
  volume: number;
}

export interface BarchartHistoryResponse {
  status: { code: number; message: string };
  results: BarchartHistoryEntry[];
}

// ── Normalized types for HarvestFile consumption ─────────────────────────

export interface GrainElevator {
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

export interface NormalizedBid {
  commodity: string;
  symbol: string;
  deliveryPeriod: string;
  basis: number;
  cashPrice: number;
  futuresPrice: number | null;
  futuresMonth: string;
  lastUpdate: string;
}

export interface GrainBidQuery {
  zipCode?: string;
  countyFips?: string;
  latitude?: number;
  longitude?: number;
  commodities?: string[];
  maxLocations?: number;
}

// ── Cache types ──────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
