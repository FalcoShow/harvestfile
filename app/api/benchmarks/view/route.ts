// =============================================================================
// HarvestFile — Phase 30 Build 4: Benchmark View Tracker
// POST /api/benchmarks/view
//
// Records a view event for county benchmark data. Powers impact counters:
// "Your county's data was viewed X times this week."
// Aggregated per county per day — never tracks individual users.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { county_fips, program_year = 2026 } = await request.json();

    if (!county_fips || !/^\d{5}$/.test(county_fips)) {
      return NextResponse.json({ error: 'Invalid county FIPS' }, { status: 400 });
    }

    // Atomic upsert + increment via RPC
    const { error } = await supabaseAdmin.rpc('increment_benchmark_view', {
      p_county_fips: county_fips,
      p_program_year: program_year,
    });

    if (error) {
      console.error('View tracking error:', error);
    }

    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    // View tracking should never block user experience
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
