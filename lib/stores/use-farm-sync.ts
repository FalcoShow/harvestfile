// =============================================================================
// HarvestFile — Build 18 Deploy 1: Farm Store Sync Bridge
// lib/stores/use-farm-sync.ts
//
// BRIDGE HOOK. This connects the existing CheckCalculator's useState-based
// state to the new Zustand store WITHOUT changing any existing logic.
//
// Why a bridge instead of a full refactor?
//   1. CheckCalculator.tsx is 1,440 lines of working, tested code
//   2. A full refactor risks introducing bugs in the #1 SEO page
//   3. The bridge lets us migrate incrementally — zero visual changes
//   4. New tab components (Deploy 2+) read from the store directly
//
// Usage in CheckCalculator.tsx:
//   const syncToStore = useFarmStoreSync();
//   // Call syncToStore whenever local state changes
//   useEffect(() => {
//     syncToStore({ stateAbbr, countyFips, countyName, ... });
//   }, [stateAbbr, countyFips, ...]);
//
// After Deploy 2+, we can gradually replace useState calls with
// useFarmStore selectors. But the bridge works perfectly for now.
// =============================================================================

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useFarmStore, type ComparisonResult } from './farm-store';

// ─── Input Sync ──────────────────────────────────────────────────────────────
// Call this in a useEffect whenever CheckCalculator's form state changes.

interface SyncInputsParams {
  stateAbbr: string;
  countyFips: string;
  countyName: string;
  countySlug: string;
  cropCode: string;
  acres: string;
}

export function useFarmInputSync() {
  const setInputs = useFarmStore((s) => s.setInputs);
  const prevRef = useRef<string>('');

  return useCallback(
    (params: SyncInputsParams) => {
      // Deduplicate — only write to store if values actually changed
      const key = `${params.stateAbbr}|${params.countyFips}|${params.cropCode}|${params.acres}`;
      if (key === prevRef.current) return;
      prevRef.current = key;

      setInputs({
        stateAbbr: params.stateAbbr,
        countyFips: params.countyFips,
        countyName: params.countyName,
        countySlug: params.countySlug,
        cropCode: params.cropCode,
        acres: params.acres,
      });
    },
    [setInputs]
  );
}

// ─── Results Sync ────────────────────────────────────────────────────────────
// Call this when CheckCalculator receives calculation results.

interface SyncResultsParams {
  result: ComparisonResult | null;
  isCountySpecific: boolean;
  dataYears: number;
}

export function useFarmResultSync() {
  const setComparison = useFarmStore((s) => s.setComparison);
  const setIsCountySpecific = useFarmStore((s) => s.setIsCountySpecific);
  const setDataYears = useFarmStore((s) => s.setDataYears);

  return useCallback(
    (params: SyncResultsParams) => {
      setComparison(params.result);
      setIsCountySpecific(params.isCountySpecific);
      setDataYears(params.dataYears);
    },
    [setComparison, setIsCountySpecific, setDataYears]
  );
}

// ─── Step Sync ───────────────────────────────────────────────────────────────
// Call this when the wizard step changes.

export function useFarmStepSync() {
  const setStep = useFarmStore((s) => s.setStep);
  const setCalculating = useFarmStore((s) => s.setCalculating);

  return useCallback(
    (step: number, calculating?: boolean) => {
      setStep(step);
      if (calculating !== undefined) {
        setCalculating(calculating);
      }
    },
    [setStep, setCalculating]
  );
}

// ─── Counties Sync ───────────────────────────────────────────────────────────
// Call this when counties are fetched for a state.

export function useFarmCountiesSync() {
  const setCounties = useFarmStore((s) => s.setCounties);
  const setLoadingCounties = useFarmStore((s) => s.setLoadingCounties);

  return useCallback(
    (
      counties: Array<{ county_fips: string; display_name: string; slug: string }>,
      loading: boolean
    ) => {
      setCounties(counties);
      setLoadingCounties(loading);
    },
    [setCounties, setLoadingCounties]
  );
}

// ─── Combined Sync Hook ──────────────────────────────────────────────────────
// Convenience hook that provides all sync functions in one call.

export function useFarmStoreSync() {
  const syncInputs = useFarmInputSync();
  const syncResults = useFarmResultSync();
  const syncStep = useFarmStepSync();
  const syncCounties = useFarmCountiesSync();

  return {
    syncInputs,
    syncResults,
    syncStep,
    syncCounties,
  };
}

// ─── URL Sync Hook ───────────────────────────────────────────────────────────
// Reads URL params on mount and pushes them into the store.
// Also updates the URL when the store changes (after calculation).
//
// This replaces the manual window.history.replaceState() in CheckCalculator
// and enables shareable deep links like:
//   /check?state=IL&county=17113&crop=CORN&acres=500&tab=elections

export function useFarmUrlSync() {
  const inputs = useFarmStore((s) => s.inputs);
  const activeTab = useFarmStore((s) => s.activeTab);
  const comparison = useFarmStore((s) => s.comparison);
  const setInputs = useFarmStore((s) => s.setInputs);
  const setActiveTab = useFarmStore((s) => s.setActiveTab);
  const hasInitialized = useRef(false);

  // Read URL params on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    if (typeof window === 'undefined') return;
    hasInitialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlState = params.get('state');
    const urlCounty = params.get('county');
    const urlCrop = params.get('crop');
    const urlAcres = params.get('acres');
    const urlName = params.get('name');
    const urlTab = params.get('tab') as typeof activeTab | null;

    if (urlState) {
      setInputs({
        stateAbbr: urlState,
        countyFips: urlCounty || '',
        countyName: urlName || '',
        cropCode: urlCrop || '',
        acres: urlAcres || '',
      });
    }

    if (urlTab && ['comparison', 'historical', 'elections', 'optimization', 'base-acres'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [setInputs, setActiveTab, activeTab]);

  // Write to URL after calculation (when comparison result exists)
  useEffect(() => {
    if (!comparison || typeof window === 'undefined') return;
    if (!inputs.stateAbbr || !inputs.countyFips || !inputs.cropCode) return;

    const params = new URLSearchParams();
    params.set('state', inputs.stateAbbr);
    params.set('county', inputs.countyFips);
    params.set('crop', inputs.cropCode);
    if (inputs.acres) params.set('acres', inputs.acres.replace(/,/g, ''));
    if (inputs.countyName) params.set('name', inputs.countyName);
    if (activeTab !== 'comparison') params.set('tab', activeTab);

    const newUrl = `/check?${params.toString()}`;
    const currentUrl = window.location.pathname + window.location.search;

    // Only update if URL actually changed (prevents infinite loops)
    if (newUrl !== currentUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [comparison, inputs, activeTab]);
}
