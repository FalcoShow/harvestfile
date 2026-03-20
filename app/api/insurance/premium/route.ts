// =============================================================================
// HarvestFile — Phase 16B Build 2B-2: Premium Calculation API Route
// app/api/insurance/premium/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { PremiumApiResponse } from '@/lib/insurance/types';

// ─── Input validation schema ─────────────────────────────────────────────────

const premiumParamsSchema = z.object({
  state: z.string().length(2).regex(/^\d{2}$/, 'Must be 2-digit FIPS code'),
  county: z.string().length(3).regex(/^\d{3}$/, 'Must be 3-digit FIPS code'),
  commodity: z.string().min(1).max(10).regex(/^\d+$/, 'Must be numeric commodity code'),
  aph: z.coerce.number().positive().max(999),
  acres: z.coerce.number().positive().max(100000),
  plan: z.string().min(1).max(5).default('02'),
});

// ─── Force dynamic rendering ─────────────────────────────────────────────────
export const dynamic = 'force-dynamic';

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Create client inside handler to ensure env vars are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      data: null,
      meta: { state_fips: '', county_fips: '', commodity_code: '', aph_yield: 0, acres: 0, plan_code: '', calculated_at: new Date().toISOString(), coverage_levels_returned: 0 },
      error: 'Missing Supabase configuration',
      debug: { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey },
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { searchParams } = request.nextUrl;
    const rawParams = {
      state: searchParams.get('state') || '',
      county: searchParams.get('county') || '',
      commodity: searchParams.get('commodity') || '',
      aph: searchParams.get('aph') || '',
      acres: searchParams.get('acres') || '',
      plan: searchParams.get('plan') || '02',
    };

    const parsed = premiumParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({
        success: false,
        data: null,
        meta: { state_fips: rawParams.state, county_fips: rawParams.county, commodity_code: rawParams.commodity, aph_yield: Number(rawParams.aph) || 0, acres: Number(rawParams.acres) || 0, plan_code: rawParams.plan, calculated_at: new Date().toISOString(), coverage_levels_returned: 0 },
        error: `Validation failed: ${JSON.stringify(errors)}`,
      }, { status: 400 });
    }

    const { state, county, commodity, aph, acres, plan } = parsed.data;

    // Call the batch RPC function
    const rpcParams = {
      p_state_fips: state,
      p_county_fips: county,
      p_commodity_code: commodity,
      p_aph_yield: aph,
      p_acres: acres,
      p_plan_code: plan,
    };

    const { data, error } = await supabase.rpc('calculate_county_premium_batch', rpcParams);

    if (error) {
      return NextResponse.json({
        success: false,
        data: null,
        meta: { state_fips: state, county_fips: county, commodity_code: commodity, aph_yield: aph, acres, plan_code: plan, calculated_at: new Date().toISOString(), coverage_levels_returned: 0 },
        error: `RPC error: ${error.message}`,
        debug: { code: error.code, details: error.details, hint: error.hint, rpcParams },
      }, { status: 500 });
    }

    // Parse the response
    const batchData = typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);

    return NextResponse.json({
      success: true,
      data: batchData,
      meta: { state_fips: state, county_fips: county, commodity_code: commodity, aph_yield: aph, acres, plan_code: plan, calculated_at: new Date().toISOString(), coverage_levels_returned: batchData.length },
    } satisfies PremiumApiResponse, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      data: null,
      meta: { state_fips: '', county_fips: '', commodity_code: '', aph_yield: 0, acres: 0, plan_code: '', calculated_at: new Date().toISOString(), coverage_levels_returned: 0 },
      error: `Unexpected: ${err instanceof Error ? err.message : String(err)}`,
      debug: { stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3) : null },
    }, { status: 500 });
  }
}
