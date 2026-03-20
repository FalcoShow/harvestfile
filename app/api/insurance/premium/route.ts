// =============================================================================
// HarvestFile — Phase 16B Build 2B-2: Premium Calculation API Route
// app/api/insurance/premium/route.ts
//
// Calls the calculate_county_premium_batch() RPC function which returns
// real USDA RMA actuarial premium data for all 8 coverage levels (50-85%)
// in a single database call against 10.8M ADM records.
//
// GET /api/insurance/premium?state=19&county=169&commodity=0041&aph=190&acres=500&plan=02
//
// Returns: { success, data: AdmPremiumLevel[], meta }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { PremiumApiResponse } from '@/lib/insurance/types';

// ─── Supabase client (anon key — ADM tables have public RLS policies) ────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Input validation schema ─────────────────────────────────────────────────

const premiumParamsSchema = z.object({
  state: z.string().length(2).regex(/^\d{2}$/, 'Must be 2-digit FIPS code'),
  county: z.string().length(3).regex(/^\d{3}$/, 'Must be 3-digit FIPS code'),
  commodity: z.string().min(1).max(10).regex(/^\d+$/, 'Must be numeric commodity code'),
  aph: z.coerce.number().positive().max(999),
  acres: z.coerce.number().positive().max(100000),
  plan: z.string().min(1).max(5).default('02'),
});

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const rawParams = {
      state: searchParams.get('state') || '',
      county: searchParams.get('county') || '',
      commodity: searchParams.get('commodity') || '',
      aph: searchParams.get('aph') || '',
      acres: searchParams.get('acres') || '',
      plan: searchParams.get('plan') || '02',
    };

    // Validate
    const parsed = premiumParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          data: null,
          meta: {
            state_fips: rawParams.state,
            county_fips: rawParams.county,
            commodity_code: rawParams.commodity,
            aph_yield: Number(rawParams.aph) || 0,
            acres: Number(rawParams.acres) || 0,
            plan_code: rawParams.plan,
            calculated_at: new Date().toISOString(),
            coverage_levels_returned: 0,
          },
          error: `Validation failed: ${JSON.stringify(errors)}`,
        } satisfies PremiumApiResponse,
        { status: 400 },
      );
    }

    const { state, county, commodity, aph, acres, plan } = parsed.data;

    // Call the batch RPC function
    const { data, error } = await supabase.rpc('calculate_county_premium_batch', {
      p_state_fips: state,
      p_county_fips: county,
      p_commodity_code: commodity,
      p_aph_yield: aph,
      p_acres: acres,
      p_plan_code: plan,
    });

    if (error) {
      console.error('[Premium API] Supabase RPC error:', error);

      // Map known PostgreSQL error codes
      const status = error.code === '42883' ? 404 : error.code === '23503' ? 422 : 500;
      return NextResponse.json(
        {
          success: false,
          data: null,
          meta: {
            state_fips: state,
            county_fips: county,
            commodity_code: commodity,
            aph_yield: aph,
            acres,
            plan_code: plan,
            calculated_at: new Date().toISOString(),
            coverage_levels_returned: 0,
          },
          error: status === 500
            ? 'Internal server error — premium calculation failed'
            : `Premium data not available for this county/commodity combination`,
        } satisfies PremiumApiResponse,
        { status },
      );
    }

    // The RPC returns a JSONB array — parse if it's a string
    const batchData = typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);

    const response: PremiumApiResponse = {
      success: true,
      data: batchData,
      meta: {
        state_fips: state,
        county_fips: county,
        commodity_code: commodity,
        aph_yield: aph,
        acres,
        plan_code: plan,
        calculated_at: new Date().toISOString(),
        coverage_levels_returned: batchData.length,
      },
    };

    // Cache for 24 hours — ADM data changes 2-4x per year
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[Premium API] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {
          state_fips: '',
          county_fips: '',
          commodity_code: '',
          aph_yield: 0,
          acres: 0,
          plan_code: '',
          calculated_at: new Date().toISOString(),
          coverage_levels_returned: 0,
        },
        error: 'Internal server error',
      } satisfies PremiumApiResponse,
      { status: 500 },
    );
  }
}
