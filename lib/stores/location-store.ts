// =============================================================================
// HarvestFile — Surface 2 Deploy 1: Shared Location Store
// lib/stores/location-store.ts
//
// Shared location state between Surface 1 (/check) and Surface 2 (/morning).
// When a farmer enters their county in the ARC/PLC calculator, that location
// propagates to the Morning Dashboard for personalized weather, grain bids,
// and payment estimates — zero additional input required.
//
// Data flow:
//   1. Calculator (/check) → farmer selects Ohio > Darke County
//   2. farm-store.ts sets countyFips, stateAbbr, countyName
//   3. Calculator bridge component calls setLocation() on this store
//   4. /morning reads from this store → personalized data for Darke County
//
// Persistence: localStorage with 30-day expiry (matches useGeolocation hook).
// Falls back to browser geolocation → Akron, OH default.
//
// CRITICAL: This store is SEPARATE from both farm-store.ts and morning-store.ts.
// It is the shared data contract between surfaces. Both import it.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocationData {
  lat: number;
  lng: number;
  locationName: string;     // "Darke County, OH"
  countyFips: string | null;
  countyName: string | null;
  stateAbbr: string | null;
  isDefault: boolean;
  source: 'calculator' | 'geolocation' | 'manual' | 'default';
  updatedAt: number;        // timestamp
}

interface LocationStoreState extends LocationData {
  // Actions
  setLocation: (data: Partial<LocationData>) => void;
  setFromCalculator: (
    countyFips: string,
    countyName: string,
    stateAbbr: string,
    lat?: number,
    lng?: number
  ) => void;
  setFromGeolocation: (
    lat: number,
    lng: number,
    locationName: string,
    countyFips?: string,
    stateAbbr?: string
  ) => void;
  resetToDefault: () => void;
  isStale: () => boolean;
}

// ─── Defaults (Akron, OH — same as useGeolocation) ───────────────────────────

const DEFAULT_LOCATION: LocationData = {
  lat: 41.085,
  lng: -81.518,
  locationName: 'Summit County, OH',
  countyFips: null,
  countyName: null,
  stateAbbr: null,
  isDefault: true,
  source: 'default',
  updatedAt: 0,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLocationStore = create<LocationStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_LOCATION,

      setLocation: (data) =>
        set((s) => ({
          ...s,
          ...data,
          isDefault: false,
          updatedAt: Date.now(),
        })),

      setFromCalculator: (countyFips, countyName, stateAbbr, lat, lng) =>
        set((s) => ({
          ...s,
          countyFips,
          countyName,
          stateAbbr,
          locationName: `${countyName}, ${stateAbbr}`,
          // Keep existing lat/lng if calculator doesn't provide them
          lat: lat ?? s.lat,
          lng: lng ?? s.lng,
          isDefault: false,
          source: 'calculator' as const,
          updatedAt: Date.now(),
        })),

      setFromGeolocation: (lat, lng, locationName, countyFips, stateAbbr) =>
        set((s) => {
          // Don't overwrite calculator data with geolocation
          // Calculator data is more precise (farmer selected their exact county)
          if (s.source === 'calculator' && !s.isDefault) return s;

          return {
            ...s,
            lat,
            lng,
            locationName,
            countyFips: countyFips ?? s.countyFips,
            stateAbbr: stateAbbr ?? s.stateAbbr,
            isDefault: false,
            source: 'geolocation' as const,
            updatedAt: Date.now(),
          };
        }),

      resetToDefault: () => set({ ...DEFAULT_LOCATION }),

      isStale: () => {
        const { updatedAt } = get();
        if (updatedAt === 0) return true;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return Date.now() - updatedAt > thirtyDays;
      },
    }),
    {
      name: 'hf-location',
      // Only persist location data, not methods
      partialize: (state) => ({
        lat: state.lat,
        lng: state.lng,
        locationName: state.locationName,
        countyFips: state.countyFips,
        countyName: state.countyName,
        stateAbbr: state.stateAbbr,
        isDefault: state.isDefault,
        source: state.source,
        updatedAt: state.updatedAt,
      }),
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectLocationCoords = (s: LocationStoreState) => ({
  lat: s.lat,
  lng: s.lng,
});

export const selectLocationName = (s: LocationStoreState) => s.locationName;
export const selectCountyFips = (s: LocationStoreState) => s.countyFips;
export const selectStateAbbr = (s: LocationStoreState) => s.stateAbbr;
export const selectIsDefaultLocation = (s: LocationStoreState) => s.isDefault;
export const selectLocationSource = (s: LocationStoreState) => s.source;
