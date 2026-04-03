// =============================================================================
// HarvestFile — Deploy 6B-final: Lead Capture API (Updated)
// app/api/leads/capture/route.ts
//
// Deploy 6B-final changes:
//   - JWT download token generation via `jose` library
//   - Returns `downloadToken` in response for gated PDF download
//   - Token expires in 24 hours (HS256 signed)
//
// Deploy 6B changes:
//   - Inngest drip campaign trigger ACTIVATED
//   - Sends 'leads/analysis.saved' event with full calculator context
//
// Captures email addresses from the ARC/PLC calculator results page.
// Stores in the `leads` table with calculator context for personalized
// follow-up emails. Upserts on email (duplicate submissions update context).
//
// Security:
//   - Service role key (server-side only, never exposed to client)
//   - Email validation + normalization
//   - JWT token for PDF download gating
//   - No authentication required (this is the pre-signup capture)
//
// Called from: app/(marketing)/check/components/EmailCapture.tsx
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { inngest } from '@/lib/inngest/client';

// Service role client — bypasses RLS for server-side lead management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// JWT secret — must match the one in /api/generate-pdf/route.ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.LEAD_JWT_SECRET || 'harvestfile-dev-secret-change-in-production-2026'
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
      // Deploy 6B-final: Extended context for richer PDF reports
      if (context.benchmarkYield) captureContext.benchmarkYield = Number(context.benchmarkYield);
      if (context.benchmarkPrice) captureContext.benchmarkPrice = Number(context.benchmarkPrice);
      if (context.effectiveRefPrice) captureContext.effectiveRefPrice = Number(context.effectiveRefPrice);
      if (context.projectedMYA) captureContext.projectedMYA = Number(context.projectedMYA);
      if (context.projectedYield) captureContext.projectedYield = Number(context.projectedYield);
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

    // ── Deploy 6B-final: Generate JWT download token (24-hour expiry) ────
    let downloadToken = '';
    try {
      downloadToken = await new SignJWT({ leadId: data.id, email: normalizedEmail })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
    } catch (jwtError) {
      console.error('[Leads] JWT generation error (non-blocking):', jwtError);
      // Continue without download token — email capture is more important
    }

    // ── Deploy 6B: Trigger Inngest enrollment drip campaign ──────────────
    try {
      await inngest.send({
        name: 'leads/analysis.saved',
        data: {
          leadId: data.id,
          email: normalizedEmail,
          countyName: context?.countyName || null,
          stateAbbr: context?.stateAbbr || null,
          countyFips: context?.countyFips || null,  // Deploy 6B-final: for email deep-linking
          cropCode: context?.cropCode || null,
          acres: context?.acres || null,
          recommendation: context?.recommendation || null,
          arcPerAcre: context?.arcPerAcre ? Number(context.arcPerAcre) : 0,
          plcPerAcre: context?.plcPerAcre ? Number(context.plcPerAcre) : 0,
        },
      });
    } catch (inngestError) {
      // Log but don't fail the request — email capture is more important
      // than the drip campaign starting. Inngest will retry on its own.
      console.error('[Leads] Inngest send error (non-blocking):', inngestError);
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis saved! Check your email.',
      leadId: data.id,
      downloadToken: downloadToken || undefined,
    });
  } catch (err) {
    console.error('[Leads] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
