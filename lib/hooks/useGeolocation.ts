// =============================================================================
// HarvestFile — useGeolocation Hook
// Build 8 Deploy 3: Browser Geolocation with Graceful Fallback
//
// Detects the farmer's location via browser Geolocation API.
// Saves to localStorage so subsequent visits don't re-prompt.
// Falls back to default coords (Akron, OH) if permission denied.
//
// Usage:
//   const { lat, lng, locationName, isDetecting } = useGeolocation();
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hf_location';
const DEFAULT_LAT = 41.085;
const DEFAULT_LNG = -81.518;
const DEFAULT_NAME = 'Summit County, OH';

interface LocationState {
  lat: number;
  lng: number;
  locationName: string;
  isDetecting: boolean;
  isDefault: boolean;
  error: string | null;
}

interface SavedLocation {
  lat: number;
  lng: number;
  name?: string;
  timestamp?: number;
}

/**
 * Reverse geocode coordinates to a county/city name using our geo API.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/geo/detect?lat=${lat}&lng=${lng}`);
    if (!res.ok) return '';
    const data = await res.json();
    // API returns { county, state, stateAbbr, fips } or similar
    if (data.county && data.stateAbbr) {
      return `${data.county}, ${data.stateAbbr}`;
    }
    if (data.city && data.stateAbbr) {
      return `${data.city}, ${data.stateAbbr}`;
    }
    return '';
  } catch {
    return '';
  }
}

export function useGeolocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    locationName: DEFAULT_NAME,
    isDetecting: true,
    isDefault: true,
    error: null,
  });

  const detectLocation = useCallback(async () => {
    // Step 1: Check localStorage for saved location
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: SavedLocation = JSON.parse(saved);
          if (parsed.lat && parsed.lng) {
            // Check if saved location is less than 30 days old
            const age = Date.now() - (parsed.timestamp || 0);
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;

            if (age < thirtyDays) {
              setState({
                lat: parsed.lat,
                lng: parsed.lng,
                locationName: parsed.name || DEFAULT_NAME,
                isDetecting: false,
                isDefault: false,
                error: null,
              });
              return;
            }
          }
        }
      } catch {
        // Invalid localStorage data — continue to geolocation
      }
    }

    // Step 2: Try browser geolocation
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false, // Low accuracy is fine — just need county
              timeout: 8000,
              maximumAge: 24 * 60 * 60 * 1000, // Accept cached position up to 24h
            });
          }
        );

        const lat = Math.round(position.coords.latitude * 1000) / 1000;
        const lng = Math.round(position.coords.longitude * 1000) / 1000;

        // Reverse geocode to get location name
        const name = await reverseGeocode(lat, lng);
        const locationName = name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;

        // Save to localStorage
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lat, lng, name: locationName, timestamp: Date.now() })
          );
        } catch {
          // localStorage full or disabled — continue anyway
        }

        setState({
          lat,
          lng,
          locationName,
          isDetecting: false,
          isDefault: false,
          error: null,
        });
        return;
      } catch (err: any) {
        // Geolocation denied or timed out — use default
        console.info('[Geolocation] Denied or timed out, using default:', err?.message);
      }
    }

    // Step 3: Fall back to defaults
    setState({
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      locationName: DEFAULT_NAME,
      isDetecting: false,
      isDefault: true,
      error: null,
    });
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return state;
}

/**
 * Manually set the user's location (from county page, search, etc.)
 */
export function setUserLocation(lat: number, lng: number, name: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lat, lng, name, timestamp: Date.now() })
    );
  } catch {
    // Silent fail
  }
}
