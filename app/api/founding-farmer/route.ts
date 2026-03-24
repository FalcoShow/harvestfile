// =============================================================================
// HarvestFile — Phase 32 Build 1: Founding Farmer 500 API
// POST /api/founding-farmer — Register a new founding farmer
// GET  /api/founding-farmer — Get campaign stats (public)
// GET  /api/founding-farmer?code=XXX — Validate referral code
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── GET: Campaign stats or referral code validation ──────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // If code provided, validate it
  if (code) {
    const { data, error } = await supabaseAdmin
      .from('founding_farmers')
      .select('referral_code, position, state, referral_count')
      .eq('referral_code', code.toUpperCase().trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      referrer_position: data.position,
      referrer_state: data.state,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    });
  }

  // Otherwise return campaign stats
  try {
    const { data, error } = await supabaseAdmin.rpc('get_founding_farmer_stats');

    if (error) {
      console.error('Stats RPC error:', error);
      return NextResponse.json({
        total_claimed: 0,
        spots_remaining: 500,
        is_open: true,
        recent_signups: [],
      });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=10' },
    });
  } catch (err) {
    console.error('Founding farmer stats error:', err);
    return NextResponse.json({
      total_claimed: 0,
      spots_remaining: 500,
      is_open: true,
      recent_signups: [],
    });
  }
}

// ── POST: Register a new founding farmer ─────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, referral_code, source, utm_source, utm_medium, utm_campaign } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Hash the IP for dedup (never store raw IP)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip + 'harvestfile-salt').digest('hex').slice(0, 16);

    // Rate limit: max 5 signups per IP hash per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from('founding_farmers')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo);

    if ((recentCount || 0) >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many signups from this location. Please try again later.' },
        { status: 429 }
      );
    }

    // Register via atomic RPC
    const { data, error } = await supabaseAdmin.rpc('register_founding_farmer', {
      p_email: email.trim(),
      p_referred_by: referral_code?.toUpperCase()?.trim() || null,
      p_source: source || 'direct',
      p_utm_source: utm_source || null,
      p_utm_medium: utm_medium || null,
      p_utm_campaign: utm_campaign || null,
      p_ip_hash: ipHash,
    });

    if (error) {
      console.error('Register RPC error:', error);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    // Handle already registered
    if (data?.error === 'already_registered') {
      return NextResponse.json({
        success: true,
        already_registered: true,
        position: data.position,
        referral_code: data.referral_code,
        message: "You're already a Founding Farmer!",
      });
    }

    // Handle campaign full
    if (data?.error === 'campaign_full') {
      return NextResponse.json(
        { success: false, error: 'campaign_full', message: data.message },
        { status: 410 }
      );
    }

    // Success — also capture in email_captures for marketing
    try {
      await supabaseAdmin
        .from('email_captures')
        .upsert({
          email: email.trim().toLowerCase(),
          source: 'founding_farmer',
          captured_at: new Date().toISOString(),
        }, { onConflict: 'email' });
    } catch {
      // Non-critical — don't fail the registration
    }

    return NextResponse.json({
      success: true,
      position: data.position,
      referral_code: data.referral_code,
      total_claimed: data.total_claimed,
      spots_remaining: data.spots_remaining,
      share_url: `https://www.harvestfile.com/founding-farmer?ref=${data.referral_code}`,
    });
  } catch (err) {
    console.error('Founding farmer registration error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
