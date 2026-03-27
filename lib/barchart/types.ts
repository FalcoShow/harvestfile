// =============================================================================
// HarvestFile — Barchart OnDemand API Types
// Build 6 Deploy 1: Updated to match actual Barchart API response format
//
// Endpoints enabled (confirmed 3/27/2026 by Thomas Willis @ Barchart):
//   - getGrainBids (cash grain bids by FIPS, zip, or coordinates)
//   - getGrainInstruments (instrument metadata / symbology lookup)
//   - getHistory (historical basis/cash price time series)
//   - getUSDAGrainPrices (USDA-sourced terminal/export/processor prices)
//
// Response structures verified against Barchart onboarding PDF (page 8)
// and live API example queries from Thomas Willis's onboarding email.
// =============================================================================

// ── Raw Barchart getGrainBids Response ───────────────────────────────────
// These match the ACTUAL field names returned by the Barchart API.
// Do NOT rename these — the normalizer handles field name translation.

export interface BarchartRawLocation {
  /** Facility type: "Country Elevator", "Terminal Elevator", etc. */
  facility_type?: string;
  /** Distance from query origin in miles (string from API) */
  distance?: string;
  /** Company/elevator name */
  company?: string;
  /** Barchart internal location ID */
  locationId?: number | string;
  /** Display location label */
  location?: string;
  /** Street address */
  address?: string;
  /** City */
  city?: string;
  /** State abbreviation */
  state?: string;
  /** ZIP code */
  zip?: string;
  /** Phone number */
  phone?: string;
  /** Website URL */
  url?: string;
  /** Latitude (string from API) */
  lat?: string;
  /** Longitude (string from API) */
  lng?: string;
  /** Array of bid objects for this location */
  bids?: BarchartRawBid[];
}

export interface BarchartRawBid {
  /** Internal bid ID */
  id?: string;
  /** Commodity name, e.g. "CORN", "SOYBEANS" */
  commodity?: string;
  /** Futures contract symbol, e.g. "ZCZ23" */
  symbol?: string;
  /** Delivery start date */
  delivery_start?: string;
  /** Delivery end date */
  delivery_end?: string;
  /** Basis in dollars per bushel (string, e.g. "-38.00") */
  basis?: string;
  /** Notes or special conditions */
  notes?: string | null;
  /** Whether this bid is active */
  active?: boolean;
  /** Commodity root symbol, e.g. "ZC" */
  sym_root?: string;
  /** Display name, e.g. "Corn (#2 Yellow)" */
  commodity_display_name?: string;
  /** Delivery month label, e.g. "Oct23" */
  deliveryMonth?: string;
  /** Delivery year, e.g. "2023" */
  deliveryYear?: string;
  /** Basis month label, e.g. "Dec 2023" */
  basismonth?: string;
  /** Unix timestamp of last update */
  timestamp?: number;
  /** Human-readable date, e.g. "10/3/23" */
  as_of?: string;
  /** Cash price in $/bushel (string, e.g. "4.50") */
  price?: string;
  /** Cash price — duplicate field name used in some responses */
  cashprice?: string;
  /** Price per hundredweight (string) */
  pricecwt?: string;
  /** Daily change in $/bushel (string, e.g. "-0.0125") */
  change?: string;
  /** Raw daily change as number */
  rawchange?: number;
  /** Percent change (string, e.g. "-0.28") */
  pctchange?: string;
  /** Basis symbol for getHistory, e.g. "ZCBV23-21264-8981.CM" */
  basisSymbol?: string;
  /** Cash price symbol for getHistory, e.g. "ZCPV23-21264-8981.CM" */
  cashPriceSymbol?: string;
  /** Rolling basis symbol (front month), e.g. "ZCBA-21264-8981.CM" */
  basisRollingSymbol?: string;
  /** Rolling cash price symbol, e.g. "ZCPA-21264-8981.CM" */
  cashPriceRollingSymbol?: string;
}

export interface BarchartGrainBidsResponse {
  status: { code: number; message: string };
  results?: BarchartRawLocation[];
}

// ── Raw Barchart getUSDAGrainPrices Response ─────────────────────────────

export interface BarchartRawUSDAPrice {
  commodity?: string;
  commodityType?: string;
  bidType?: string;
  location?: string;
  city?: string;
  state?: string;
  price?: string;
  basis?: string;
  symbol?: string;
  reportDate?: string;
  reportDateRaw?: string;
}

export interface BarchartUSDAGrainPricesResponse {
  status: { code: number; message: string };
  results?: BarchartRawUSDAPrice[];
}

// ── Raw Barchart getHistory Response ─────────────────────────────────────

export interface BarchartRawHistoryEntry {
  tradingDay?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  symbol?: string;
}

export interface BarchartHistoryResponse {
  status: { code: number; message: string };
  results?: BarchartRawHistoryEntry[];
}

// ── Raw Barchart getGrainInstruments Response ────────────────────────────

export interface BarchartRawInstrument {
  symbol?: string;
  instrumentType?: string;
  instrumentRoot?: string;
  deliveryMonth?: string;
  locationId?: string | number;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface BarchartGrainInstrumentsResponse {
  status: { code: number; message: string };
  results?: BarchartRawInstrument[];
}

// ── Normalized types for HarvestFile consumption ─────────────────────────
// These are the clean, typed objects that components and pages consume.

export interface GrainElevator {
  /** Barchart location ID */
  id: string;
  /** Elevator/company name */
  name: string;
  /** Facility type */
  facilityType: string;
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
  /** Website URL */
  website: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Distance from query origin (miles) */
  distance: number;
  /** Normalized bids for this location */
  bids: NormalizedBid[];
}

export interface NormalizedBid {
  /** Commodity name (normalized to title case: "Corn", "Soybeans") */
  commodity: string;
  /** Display name, e.g. "Corn (#2 Yellow)" */
  displayName: string;
  /** Futures contract symbol, e.g. "ZCZ26" */
  symbol: string;
  /** Commodity root, e.g. "ZC" */
  symRoot: string;
  /** Delivery period label, e.g. "Oct23" */
  deliveryMonth: string;
  /** Delivery start date (ISO) */
  deliveryStart: string;
  /** Delivery end date (ISO) */
  deliveryEnd: string;
  /** Basis month, e.g. "Dec 2023" */
  basisMonth: string;
  /** Basis in dollars/bushel (negative means below futures) */
  basis: number;
  /** Cash price in $/bushel */
  cashPrice: number;
  /** Daily price change in $/bushel */
  change: number;
  /** Percent change */
  changePercent: number;
  /** Last update timestamp (Date-parseable string or "as_of" label) */
  lastUpdate: string;
  /** Basis symbol for getHistory lookups */
  basisSymbol: string;
  /** Cash price symbol for getHistory lookups */
  cashPriceSymbol: string;
  /** Rolling basis symbol (front month continuous) */
  basisRollingSymbol: string;
  /** Whether this bid is marked active */
  active: boolean;
}

// ── Query parameter types ────────────────────────────────────────────────

export interface GrainBidQuery {
  /** 5-digit ZIP code */
  zipCode?: string;
  /** 4-5 digit FIPS code (state + county) */
  fipsCode?: string;
  /** Latitude for coordinate-based search */
  latitude?: number;
  /** Longitude for coordinate-based search */
  longitude?: number;
  /** Commodity filter (e.g., ["Corn", "Soybeans", "Wheat"]) */
  commodities?: string[];
  /** Max distance in miles (default 50) */
  maxDistance?: number;
  /** Max number of locations to return */
  maxLocations?: number;
  /** Max bids per commodity per location */
  bidsPerCommodity?: number;
}

// ── Cache types ──────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
