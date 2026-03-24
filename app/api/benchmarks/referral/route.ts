// =============================================================================
// HarvestFile — Phase 30 Build 4: Referral Code System
// POST /api/benchmarks/referral — Generate a referral code for a session
// GET  /api/benchmarks/referral?code=XXXXXXXX — Validate a referral code
//
// Referral codes are generated after a farmer submits their election.
// They can then share "harvestfile.com/check?ref=XXXXXXXX" with neighbors.
// When a neighbor submits using that link, both get tracked for rewards.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Generate a referral code
export async function POST(request: Request) {
  try {
    const { session_id, county_fips } = await request.json();

    if (!session_id || !county_fips || !/^\d{5}$/.test(county_fips)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Use the RPC to generate (or retrieve existing) code
    const { data: code, error } = await supabaseAdmin.rpc('generate_referral_code', {
      p_session_id: session_id,
      p_county_fips: county_fips,
    });

    if (error) {
      console.error('Referral code generation error:', error);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    // Get referral stats for this code
    const { data: stats } = await supabaseAdmin
      .from('referral_codes')
      .select('uses, created_at')
      .eq('code', code)
      .single();

    return NextResponse.json({
      code,
      share_url: `https://www.harvestfile.com/check?ref=${code}`,
      share_sms_url: `sms:?body=${encodeURIComponent(
        `Hey — check out what farmers in our county are choosing for ARC-CO vs PLC this year. Free and anonymous: https://www.harvestfile.com/check?ref=${code}`
      )}`,
      uses: stats?.uses || 0,
      created_at: stats?.created_at,
    });
  } catch (err) {
    console.error('Referral API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET: Validate a referral code and get referrer info
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || code.length < 6 || code.length > 12) {
    return NextResponse.json({ valid: false });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('referral_codes')
      .select('code, county_fips, uses, max_uses, created_at')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false });
    }

    // Get county name for display
    const { data: county } = await supabaseAdmin
      .from('counties')
      .select('county_name, state_abbr')
      .eq('county_fips', data.county_fips)
      .single();

    return NextResponse.json({
      valid: true,
      code: data.code,
      county_fips: data.county_fips,
      county_name: county?.county_name || 'Unknown',
      state_abbr: county?.state_abbr || '',
      uses: data.uses,
      active: data.uses < data.max_uses,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
