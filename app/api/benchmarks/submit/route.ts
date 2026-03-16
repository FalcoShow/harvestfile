// =============================================================================
// HarvestFile — Phase 7A: Election Benchmark Submission API
// POST /api/benchmarks/submit
//
// Handles: validation, SHA-256 hashing, dedup, rate limiting, submission,
//          and returns updated county benchmarks in the same response.
//
// No auth required — this is the anonymous public contribution endpoint.
// Anti-fraud: email-based dedup, IP rate limiting, FIPS validation.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Service role client — bypasses RLS for writes + reads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Valid commodity codes (must match county_crop_data) ─────────────────────
const VALID_COMMODITIES = new Set([
  'CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'BARLEY', 'OATS',
  'COTTON', 'PEANUTS', 'RICE', 'SUNFLOWER', 'CANOLA', 'FLAXSEED',
  'MUSTARD SEED', 'RAPESEED', 'SAFFLOWER', 'CRAMBE',
]);

const VALID_ELECTIONS = new Set(['ARC-CO', 'PLC']);
const CURRENT_PROGRAM_YEAR = 2026;
const MIN_PROGRAM_YEAR = 2025;
const MAX_PROGRAM_YEAR = 2031;

// Rate limit: max submissions per IP per hour
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_HOURS = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '0.0.0.0';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidFIPS(fips: string): boolean {
  return /^\d{5}$/.test(fips);
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { county_fips, commodity_code, election_choice, email, program_year } = body;

    // ── Input validation ──────────────────────────────────────────────────
    const year = program_year || CURRENT_PROGRAM_YEAR;

    if (!county_fips || !isValidFIPS(county_fips)) {
      return NextResponse.json(
        { error: 'Invalid county FIPS code' },
        { status: 400 }
      );
    }

    if (!commodity_code || !VALID_COMMODITIES.has(commodity_code.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid commodity code' },
        { status: 400 }
      );
    }

    if (!election_choice || !VALID_ELECTIONS.has(election_choice)) {
      return NextResponse.json(
        { error: 'Election choice must be ARC-CO or PLC' },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (year < MIN_PROGRAM_YEAR || year > MAX_PROGRAM_YEAR) {
      return NextResponse.json(
        { error: `Program year must be between ${MIN_PROGRAM_YEAR} and ${MAX_PROGRAM_YEAR}` },
        { status: 400 }
      );
    }

    // ── Validate county exists in our database ────────────────────────────
    const { data: county } = await supabaseAdmin
      .from('counties')
      .select('county_fips')
      .eq('county_fips', county_fips)
      .eq('has_arc_plc_data', true)
      .single();

    if (!county) {
      return NextResponse.json(
        { error: 'County not found or has no ARC/PLC data' },
        { status: 400 }
      );
    }

    // ── Validate this crop exists in this county ──────────────────────────
    const { data: cropExists } = await supabaseAdmin
      .from('county_crop_data')
      .select('commodity_code')
      .eq('county_fips', county_fips)
      .eq('commodity_code', commodity_code.toUpperCase())
      .limit(1)
      .single();

    if (!cropExists) {
      return NextResponse.json(
        { error: `${commodity_code} is not grown in this county` },
        { status: 400 }
      );
    }

    // ── Rate limiting (IP-based) ──────────────────────────────────────────
    const clientIP = getClientIP(request);
    const ipHash = sha256(clientIP);
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

    const { count: recentSubmissions } = await supabaseAdmin
      .from('election_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('submitted_at', windowStart.toISOString());

    if ((recentSubmissions || 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // ── Generate hashes ───────────────────────────────────────────────────
    const emailHash = sha256(email);
    const verificationHash = sha256(
      `${email.toLowerCase().trim()}:${commodity_code.toUpperCase()}:${county_fips}:${year}`
    );

    // ── Insert submission (trigger auto-updates cache) ────────────────────
    const { error: insertError } = await supabaseAdmin
      .from('election_submissions')
      .insert({
        county_fips,
        commodity_code: commodity_code.toUpperCase(),
        election_choice,
        program_year: year,
        email_hash: emailHash,
        verification_hash: verificationHash,
        ip_hash: ipHash,
      });

    if (insertError) {
      // Unique constraint violation = duplicate submission
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted an election for this crop and county this year. You can update your choice by contacting us.' },
          { status: 409 }
        );
      }
      console.error('Submission insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      );
    }

    // ── Read updated benchmarks for this county ───────────────────────────
    const { data: benchmarks } = await supabaseAdmin
      .from('county_benchmark_cache')
      .select('commodity_code, arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible')
      .eq('county_fips', county_fips)
      .eq('program_year', year);

    // ── Return success + updated benchmarks ───────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Election submitted successfully',
      benchmarks: (benchmarks || []).map(b => ({
        commodity_code: b.commodity_code,
        arc_co_pct: b.is_visible ? b.arc_co_pct : null,
        plc_pct: b.is_visible ? b.plc_pct : null,
        total_count: b.total_count,
        is_visible: b.is_visible,
      })),
    });
  } catch (err) {
    console.error('Benchmark submission error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
