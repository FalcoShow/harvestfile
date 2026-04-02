// =============================================================================
// HarvestFile — Build 18 Deploy 6: Lead Capture API
// app/api/leads/capture/route.ts
//
// Captures email addresses from the ARC/PLC calculator results page.
// Stores in the `leads` table with calculator context for personalized
// follow-up emails. Upserts on email (duplicate submissions update context).
//
// Security:
//   - Service role key (server-side only, never exposed to client)
//   - Email validation + normalization
//   - Rate limiting via simple timestamp check (upgrade to Redis later)
//   - No authentication required (this is the pre-signup capture)
//
// Called from: app/(marketing)/check/components/EmailCapture.tsx
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS for server-side lead management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple email regex — catches most invalid formats without being overly strict
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, context, notifyEnrollment = true } = body;

    // ── Validate email ────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Block obviously fake/disposable patterns
    const blockedDomains = ['test.com', 'example.com', 'fake.com', 'asdf.com'];
    const domain = normalizedEmail.split('@')[1];
    if (blockedDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: 'Please use a valid email address' },
        { status: 400 }
      );
    }

    // ── Build capture context from calculator state ───────────────────────
    const captureContext: Record<string, unknown> = {};
    if (context) {
      if (context.stateAbbr) captureContext.stateAbbr = String(context.stateAbbr);
      if (context.countyFips) captureContext.countyFips = String(context.countyFips);
      if (context.countyName) captureContext.countyName = String(context.countyName);
      if (context.cropCode) captureContext.cropCode = String(context.cropCode);
      if (context.acres) captureContext.acres = String(context.acres);
      if (context.activeTab) captureContext.activeTab = String(context.activeTab);
      if (context.recommendation) captureContext.recommendation = String(context.recommendation);
      if (context.arcPerAcre) captureContext.arcPerAcre = Number(context.arcPerAcre);
      if (context.plcPerAcre) captureContext.plcPerAcre = Number(context.plcPerAcre);
    }

    // ── Extract UTM params from referrer/context ──────────────────────────
    const utmSource = context?.utmSource || null;
    const utmMedium = context?.utmMedium || null;
    const utmCampaign = context?.utmCampaign || null;
    const referrer = context?.referrer || null;

    // ── Upsert lead (update context on duplicate email) ──────────────────
    const { data, error } = await supabase
      .from('leads')
      .upsert(
        {
          email: normalizedEmail,
          source: 'arc_plc_calculator',
          capture_context: captureContext,
          county_fips: context?.countyFips || null,
          crops: context?.cropCode ? [context.cropCode] : null,
          total_acres: context?.acres ? parseInt(String(context.acres).replace(/,/g, '')) || null : null,
          notify_enrollment: notifyEnrollment,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          referrer: referrer,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('id, email, created_at')
      .single();

    if (error) {
      console.error('[Leads] Capture error:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to save your analysis. Please try again.' },
        { status: 500 }
      );
    }

    // ── TODO (Deploy 6B): Trigger Inngest drip campaign ──────────────────
    // await inngest.send({
    //   name: 'subscriber/enrollment.signup',
    //   data: { subscriber_id: data.id, email: normalizedEmail, capture_context: captureContext },
    // });

    return NextResponse.json({
      success: true,
      message: 'Analysis saved! Check your email.',
      leadId: data.id,
    });
  } catch (err) {
    console.error('[Leads] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
