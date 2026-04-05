// =============================================================================
// lib/hooks/morning/index.ts
// HarvestFile — Surface 2 Deploy 3D: Morning Query Hooks Index
//
// Barrel export for all TanStack Query hooks used by /morning.
// Import like: import { useMarketPrices, useWeather, useGrainBids, useBasisTracking } from '@/lib/hooks/morning';
//
// Deploy 2B: Added CurrentConditions, HourlyPoint, SprayWindowData exports
// Deploy 3A: Added MarketPricesResponse.marketState, PricePoint OHLCV for TradingView
// Deploy 3D: Added useBasisTracking, BasisTrackingData, WeeklyBasisData, ElevatorComparison
// =============================================================================

export { useMarketPrices } from './use-market-prices';
export type { CommodityPriceData, PricePoint, MarketPricesResponse } from './use-market-prices';

export { useWeather } from './use-weather';
export type {
  CurrentConditions,
  HourlyPoint,
  DailyForecast,
  SoilData,
  GDDData,
  WeatherAlert,
  WeatherData,
  WeatherResponse,
  SprayWindowData,
} from './use-weather';

export { useGrainBids } from './use-grain-bids';
export type { GrainBid, Elevator, GrainBidsData } from './use-grain-bids';

export { useBasisTracking } from './use-basis';
export type {
  BasisTrackingData,
  BasisTrackingResponse,
  WeeklyBasisData,
  ElevatorComparison,
} from './use-basis';
