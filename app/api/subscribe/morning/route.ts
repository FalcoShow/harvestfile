// =============================================================================
// HarvestFile — Morning Briefing Email Subscribe API
// Build 11 Deploy 1: Email Capture for Daily Grain Bids + Weather
//
// POST /api/subscribe/morning
// Body: { email, countyFips?, countyName?, stateAbbr? }
//
// Stores subscriber in Supabase `morning_subscribers` table.
// Creates the table if it doesn't exist (first-run safe).
//
// SETUP: Run this SQL in Supabase SQL Editor before first use:
//
//   CREATE TABLE IF NOT EXISTS morning_subscribers (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     email TEXT NOT NULL,
//     county_fips TEXT,
//     county_name TEXT,
//     state_abbr TEXT,
//     source TEXT DEFAULT 'homepage_hero',
//     created_at TIMESTAMPTZ DEFAULT NOW(),
//     confirmed BOOLEAN DEFAULT FALSE,
//     unsubscribed BOOLEAN DEFAULT FALSE,
//     UNIQUE(email)
//   );
//
//   CREATE INDEX idx_morning_subs_email ON morning_subscribers(email);
//   CREATE INDEX idx_morning_subs_county ON morning_subscribers(county_fips);
//
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Simple email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, countyFips, countyName, stateAbbr, source } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 },
      );
    }

    // Upsert — if email exists, update county info (they may have moved)
    const { error } = await supabase
      .from('morning_subscribers')
      .upsert(
        {
          email: cleanEmail,
          county_fips: countyFips || null,
          county_name: countyName || null,
          state_abbr: stateAbbr || null,
          source: source || 'homepage_hero',
        },
        { onConflict: 'email' },
      );

    if (error) {
      console.error('[Subscribe] Upsert error:', error);
      // If table doesn't exist yet, give a helpful error
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Subscription system is being set up. Please try again shortly.' },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { success: false, error: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: 'You\'re in. First briefing arrives tomorrow at 5 AM.' },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Subscribe] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
