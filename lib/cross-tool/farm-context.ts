// =============================================================================
// HarvestFile — Phase 31 Build 1: Cross-Tool Farm Context
// lib/cross-tool/farm-context.ts
//
// Assembles everything known about a farmer from across all tools into a
// single context object. This powers the AI Advisor's hyper-personalized
// responses and enables any tool to surface relevant insights from other tools.
//
// Data sources:
//   - Calculator bridge data (localStorage → bridge API → calculations table)
//   - Benchmark submissions (election_submissions table)
//   - Organization/farmer profile (if authenticated)
//
// This module is the "contextual enrichment" engine from the research brief.
// When a farmer uses Tool A, we automatically surface insights from Tool B.
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { getBenchmarkContextForCounty } from './benchmark-context';
import type { CrossToolFarmContext } from './types';

// ─── Supabase client (server-side only) ──────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// =============================================================================
// Build context from a county/commodity pair (anonymous users)
// This is the primary path — works for anyone who has used the calculator.
// =============================================================================

export async function buildAnonymousContext(
  countyFips: string,
  commodity: string,
  baseAcres?: number,
  recommendedChoice?: 'ARC-CO' | 'PLC',
  arcPayment?: number,
  plcPayment?: number,
  sessionId?: string
): Promise<CrossToolFarmContext> {
  // Fetch benchmark data in parallel
  const benchmark = await getBenchmarkContextForCounty(countyFips, commodity);

  // Check if this session has submitted a benchmark
  let hasSubmitted = false;
  if (sessionId) {
    const supabase = getSupabase();
    const { count } = await supabase
      .from('election_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('county_fips', countyFips);
    hasSubmitted = (count || 0) > 0;
  }

  return {
    county_fips: countyFips,
    county_name: benchmark?.county.county_name || null,
    state_abbr: benchmark?.county.state_abbr || null,
    commodity,
    base_acres: baseAcres || null,
    recommended_choice: recommendedChoice || null,
    arc_payment: arcPayment || null,
    plc_payment: plcPayment || null,
    has_submitted_benchmark: hasSubmitted,
    benchmark,
  };
}

// =============================================================================
// Build context from an authenticated farmer's profile
// Used when a logged-in farmer uses the AI Advisor or Morning Dashboard.
// =============================================================================

export async function buildAuthenticatedContext(
  farmerId: string,
  orgId: string
): Promise<CrossToolFarmContext> {
  const supabase = getSupabase();

  // Fetch farmer profile
  const { data: farmer } = await supabase
    .from('farmers')
    .select('county_fips, state')
    .eq('id', farmerId)
    .eq('org_id', orgId)
    .single();

  if (!farmer?.county_fips) {
    return {
      county_fips: null,
      county_name: null,
      state_abbr: null,
      commodity: null,
      base_acres: null,
      recommended_choice: null,
      arc_payment: null,
      plc_payment: null,
      has_submitted_benchmark: false,
      benchmark: null,
    };
  }

  // Get their most recent calculation
  const { data: calc } = await supabase
    .from('calculations')
    .select('commodity, base_acres, arc_payment, plc_payment, recommended_choice')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const commodity = calc?.commodity || 'ALL';

  // Fetch benchmark data
  const benchmark = await getBenchmarkContextForCounty(farmer.county_fips, commodity);

  return {
    county_fips: farmer.county_fips,
    county_name: benchmark?.county.county_name || null,
    state_abbr: farmer.state || benchmark?.county.state_abbr || null,
    commodity: calc?.commodity || null,
    base_acres: calc?.base_acres || null,
    recommended_choice: calc?.recommended_choice || null,
    arc_payment: calc?.arc_payment || null,
    plc_payment: calc?.plc_payment || null,
    has_submitted_benchmark: false,
    benchmark,
  };
}

// =============================================================================
// Format context as a text block for AI consumption
// Produces a clean, structured summary that gets injected into the AI prompt.
// =============================================================================

export function formatContextForAI(context: CrossToolFarmContext): string {
  const parts: string[] = [];

  if (context.county_name && context.state_abbr) {
    parts.push(`FARMER LOCATION: ${context.county_name}, ${context.state_abbr} (FIPS: ${context.county_fips})`);
  }

  if (context.commodity) {
    parts.push(`PRIMARY CROP: ${context.commodity}`);
  }

  if (context.base_acres) {
    parts.push(`BASE ACRES: ${context.base_acres.toLocaleString()}`);
  }

  if (context.recommended_choice) {
    parts.push(`CALCULATOR RECOMMENDATION: ${context.recommended_choice}`);
    if (context.arc_payment !== null) {
      parts.push(`  ARC-CO projected payment: $${context.arc_payment.toLocaleString()}`);
    }
    if (context.plc_payment !== null) {
      parts.push(`  PLC projected payment: $${context.plc_payment.toLocaleString()}`);
    }
  }

  if (context.benchmark?.insights) {
    parts.push('');
    parts.push('COUNTY BENCHMARK DATA:');
    parts.push(context.benchmark.insights.summary);

    if (context.benchmark.insights.historical_dominant !== 'SPLIT') {
      parts.push(
        `Historical pattern: ${context.benchmark.county.county_name} has historically favored ${context.benchmark.insights.historical_dominant} (avg ${context.benchmark.insights.historical_avg_arc_pct}% ARC-CO).`
      );
    }
  }

  if (parts.length === 0) {
    return 'No farm context available. Ask the farmer for their state, county, and crop to provide personalized advice.';
  }

  return parts.join('\n');
}
