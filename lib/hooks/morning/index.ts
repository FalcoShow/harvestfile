// =============================================================================
// lib/hooks/morning/index.ts
// HarvestFile — Surface 2 Deploy 3A: Morning Query Hooks Index
//
// Barrel export for all TanStack Query hooks used by /morning.
// Import like: import { useMarketPrices, useWeather, useGrainBids } from '@/lib/hooks/morning';
//
// Deploy 2B: Added CurrentConditions, HourlyPoint, SprayWindowData exports
// Deploy 3A: Added MarketPricesResponse.marketState, PricePoint OHLCV for TradingView
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
