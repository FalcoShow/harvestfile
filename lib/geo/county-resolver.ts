// =============================================================================
// HarvestFile — Geo County Resolver
// Build 5 Deploy 1: IP Geolocation Personalization
//
// Resolves latitude/longitude coordinates to a US county using the free
// FCC Census Block API, then looks up county data and top crop ARC/PLC
// recommendation from Supabase.
//
// Pipeline: Vercel geo headers → FCC API → County FIPS → Supabase lookup
//
// The FCC API is free, requires no authentication, and returns Census-grade
// county FIPS codes. Response is cached for 24 hours (counties don't move).
// =============================================================================

import { supabasePublic } from '@/lib/supabase/public';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface FccApiResponse {
  County: {
    FIPS: string;
    name: string;
  };
  State: {
    FIPS: string;
    code: string;
    name: string;
  };
  status: string;
}

export interface DetectedCounty {
  countyFips: string;
  displayName: string;
  stateAbbr: string;
  stateName: string;
  stateSlug: string;
  countySlug: string;
  hasArcPlcData: boolean;
  topCrop: {
    name: string;
    recommendation: 'ARC-CO' | 'PLC' | 'NEUTRAL';
    arcPaymentRate: number;
    plcPaymentRate: number;
    advantagePerAcre: number;
    advantageLabel: string;
  } | null;
}

// ─── Main Resolver ──────────────────────────────────────────────────────────────

export async function resolveCountyFromCoords(
  lat: number,
  lon: number
): Promise<DetectedCounty | null> {
  try {
    // ── Step 1: Call FCC Census Block API ──────────────────────────────────
    // Free, no auth, Census-grade accuracy, ~100-200ms response time
    const fccUrl = `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json&showall=false`;

    const fccRes = await fetch(fccUrl, {
      next: { revalidate: 86400 }, // Cache 24 hours — counties don't move
    });

    if (!fccRes.ok) {
      console.error('[GeoResolver] FCC API error:', fccRes.status);
      return null;
    }

    const fcc: FccApiResponse = await fccRes.json();

    if (!fcc.County?.FIPS || fcc.County.FIPS === '0') {
      // Coordinates are outside US or in water
      return null;
    }

    const countyFips = fcc.County.FIPS;

    // ── Step 2: Look up county in Supabase ────────────────────────────────
    const { data: county, error: countyError } = await supabasePublic
      .from('counties')
      .select('county_fips, display_name, slug, state_fips, has_arc_plc_data')
      .eq('county_fips', countyFips)
      .single();

    if (countyError || !county) {
      console.error('[GeoResolver] County not found:', countyFips);
      return null;
    }

    // ── Step 3: Look up state ─────────────────────────────────────────────
    const { data: state, error: stateError } = await supabasePublic
      .from('states')
      .select('abbreviation, name, slug')
      .eq('state_fips', county.state_fips)
      .single();

    if (stateError || !state) {
      return null;
    }

    // ── Step 4: Get top crop recommendation (only if has ARC/PLC data) ────
    let topCrop: DetectedCounty['topCrop'] = null;

    if (county.has_arc_plc_data) {
      topCrop = await getTopCropRecommendation(countyFips);
    }

    return {
      countyFips: county.county_fips,
      displayName: county.display_name,
      stateAbbr: state.abbreviation,
      stateName: state.name,
      stateSlug: state.slug,
      countySlug: county.slug,
      hasArcPlcData: county.has_arc_plc_data ?? false,
      topCrop,
    };
  } catch (error) {
    console.error('[GeoResolver] Unexpected error:', error);
    return null;
  }
}

// ─── Top Crop Recommendation ────────────────────────────────────────────────────

async function getTopCropRecommendation(
  countyFips: string
): Promise<DetectedCounty['topCrop']> {
  try {
    // Get crop data for this county — just the most recent years for speed
    const { data: cropData } = await supabasePublic
      .from('county_crop_data')
      .select('commodity_code, crop_year, arc_payment_rate, plc_payment_rate, planted_acres')
      .eq('county_fips', countyFips)
      .order('crop_year', { ascending: false })
      .limit(50);

    if (!cropData || cropData.length === 0) return null;

    // Find the commodity with the most planted acres (top crop)
    const acresByComm = new Map<string, number>();
    for (const row of cropData) {
      if (row.planted_acres) {
        acresByComm.set(
          row.commodity_code,
          (acresByComm.get(row.commodity_code) || 0) + row.planted_acres
        );
      }
    }

    // If no planted acres data, use the commodity with the most data points
    let topCommCode: string;
    if (acresByComm.size > 0) {
      topCommCode = Array.from(acresByComm.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    } else {
      const countByComm = new Map<string, number>();
      for (const row of cropData) {
        countByComm.set(row.commodity_code, (countByComm.get(row.commodity_code) || 0) + 1);
      }
      topCommCode = Array.from(countByComm.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    // Get commodity display name
    const { data: commRef } = await supabasePublic
      .from('commodity_reference')
      .select('display_name')
      .eq('commodity_code', topCommCode)
      .single();

    const cropName = commRef?.display_name || topCommCode;

    // Calculate average ARC vs PLC payments for recent years
    const topCropRows = cropData
      .filter((r) => r.commodity_code === topCommCode)
      .slice(0, 5); // Last 5 years

    if (topCropRows.length < 2) return null;

    let totalArc = 0;
    let totalPlc = 0;
    let arcWins = 0;
    let plcWins = 0;

    for (const row of topCropRows) {
      const arc = row.arc_payment_rate || 0;
      const plc = row.plc_payment_rate || 0;
      totalArc += arc;
      totalPlc += plc;
      if (arc > plc) arcWins++;
      else if (plc > arc) plcWins++;
    }

    const avgArc = totalArc / topCropRows.length;
    const avgPlc = totalPlc / topCropRows.length;
    const advantage = Math.abs(avgArc - avgPlc);

    let recommendation: 'ARC-CO' | 'PLC' | 'NEUTRAL';
    let advantageLabel: string;

    if (avgArc > avgPlc * 1.1 && arcWins >= plcWins) {
      recommendation = 'ARC-CO';
      advantageLabel = `+$${advantage.toFixed(0)}/acre vs PLC`;
    } else if (avgPlc > avgArc * 1.1 && plcWins >= arcWins) {
      recommendation = 'PLC';
      advantageLabel = `+$${advantage.toFixed(0)}/acre vs ARC-CO`;
    } else {
      recommendation = 'NEUTRAL';
      advantageLabel = 'Programs are close — run a full analysis';
    }

    return {
      name: cropName,
      recommendation,
      arcPaymentRate: Math.round(avgArc * 100) / 100,
      plcPaymentRate: Math.round(avgPlc * 100) / 100,
      advantagePerAcre: Math.round(advantage * 100) / 100,
      advantageLabel,
    };
  } catch (error) {
    console.error('[GeoResolver] Crop recommendation error:', error);
    return null;
  }
}
