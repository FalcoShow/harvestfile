// =============================================================================
// HarvestFile — Deploy 6B-final: PDF Report Generation API
// app/api/generate-pdf/route.tsx
//
// Generates an FSA-ready ARC/PLC analysis PDF using @react-pdf/renderer.
// Gated behind a signed JWT token (24-hour expiry) issued at email capture.
//
// Flow:
//   1. User enters email on /check → POST /api/leads/capture
//   2. /api/leads/capture returns { downloadToken: 'xxx' }
//   3. User clicks "Download Report" → GET /api/generate-pdf?token=xxx
//   4. This route verifies JWT, fetches analysis data, renders PDF, streams it
//
// Security: JWT signed with HMAC-SHA256 using LEAD_JWT_SECRET env var.
// Uses `jose` library (Edge Runtime compatible, unlike jsonwebtoken).
//
// CRITICAL: export const dynamic = 'force-dynamic' prevents Next.js from
// attempting static analysis of this route during build. Without it, the
// build logs show a "Dynamic server usage" error (non-blocking but noisy).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { renderToBuffer } from '@react-pdf/renderer';
import { ARCPLCReport } from '@/components/pdf/ARCPLCReport';
import { createClient } from '@supabase/supabase-js';

// Tell Next.js this route is always dynamic — never attempt static rendering
export const dynamic = 'force-dynamic';

// Vercel serverless: allow up to 60s for PDF generation
export const maxDuration = 60;

// Service role client for reading lead data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// JWT secret — set this in Vercel env vars (min 32 chars)
// Fallback for development only
const JWT_SECRET = new TextEncoder().encode(
  process.env.LEAD_JWT_SECRET || 'harvestfile-dev-secret-change-in-production-2026'
);

// ── Crop code → display name mapping ──────────────────────────────────────────
const CROP_NAMES: Record<string, string> = {
  CORN: 'Corn',
  SOYBEANS: 'Soybeans',
  WHEAT: 'Wheat',
  'WHEAT, WINTER': 'Winter Wheat',
  'WHEAT, SPRING': 'Spring Wheat',
  OATS: 'Oats',
  BARLEY: 'Barley',
  SORGHUM: 'Sorghum',
  RICE: 'Rice',
  PEANUTS: 'Peanuts',
  SUNFLOWER: 'Sunflowers',
  CANOLA: 'Canola',
  'MUSTARD SEED': 'Mustard Seed',
  FLAXSEED: 'Flaxseed',
  SAFFLOWER: 'Safflower',
  CRAMBE: 'Crambe',
};

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Download token is required' },
        { status: 400 }
      );
    }

    // ── Verify JWT ──────────────────────────────────────────────────────────
    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload as Record<string, unknown>;
    } catch (jwtErr) {
      console.error('[PDF] JWT verification failed:', jwtErr);
      return NextResponse.json(
        { error: 'Download link has expired or is invalid. Please save your analysis again to get a new link.' },
        { status: 401 }
      );
    }

    const leadId = payload.leadId as string;
    if (!leadId) {
      return NextResponse.json(
        { error: 'Invalid download token' },
        { status: 400 }
      );
    }

    console.log('[PDF] Generating report for lead:', leadId);

    // ── Fetch lead data from Supabase ───────────────────────────────────────
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('[PDF] Lead not found:', leadId, leadError);
      return NextResponse.json(
        { error: 'Analysis not found. Please run the calculator again.' },
        { status: 404 }
      );
    }

    // ── Extract calculator context from the lead record ─────────────────────
    const ctx = lead.capture_context || {};
    const countyName = ctx.countyName || 'Unknown County';
    const stateAbbr = ctx.stateAbbr || '';
    const cropCode = ctx.cropCode || 'CORN';
    const cropName = CROP_NAMES[cropCode] || cropCode;
    const acres = ctx.acres || '0';
    const recommendation = ctx.recommendation || 'ARC-CO';
    const arcPerAcre = Number(ctx.arcPerAcre) || 0;
    const plcPerAcre = Number(ctx.plcPerAcre) || 0;

    console.log('[PDF] Report context:', { countyName, stateAbbr, cropCode, acres, recommendation });

    // ── Try to fetch historical payments from the API ────────────────────────
    let historicalPayments: Array<{ year: number; arcPayment: number; plcPayment: number }> | undefined;
    try {
      const countyFips = ctx.countyFips || lead.county_fips;
      if (countyFips && cropCode) {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://www.harvestfile.com';

        // Route pattern: /api/historical-payments/[county_fips]/[commodity_code]
        const histRes = await fetch(
          `${baseUrl}/api/historical-payments/${countyFips}/${cropCode}`,
          { next: { revalidate: 3600 } }
        );
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData.payments && Array.isArray(histData.payments)) {
            historicalPayments = histData.payments.map((p: { year: number; arcPayment?: number; plcPayment?: number; arc_payment?: number; plc_payment?: number }) => ({
              year: p.year,
              arcPayment: p.arcPayment ?? p.arc_payment ?? 0,
              plcPayment: p.plcPayment ?? p.plc_payment ?? 0,
            }));
          }
        } else {
          console.warn('[PDF] Historical payments fetch returned:', histRes.status);
        }
      }
    } catch (histErr) {
      // Historical data is optional — continue without it
      console.warn('[PDF] Could not fetch historical payments:', histErr);
    }

    // ── Build report data ───────────────────────────────────────────────────
    const reportData = {
      countyName,
      stateAbbr,
      cropCode,
      cropName,
      acres,
      cropYear: new Date().getFullYear(),
      recommendation,
      arcPerAcre,
      plcPerAcre,
      summary: undefined,
      benchmarkYield: ctx.benchmarkYield ? Number(ctx.benchmarkYield) : undefined,
      benchmarkPrice: ctx.benchmarkPrice ? Number(ctx.benchmarkPrice) : undefined,
      effectiveRefPrice: ctx.effectiveRefPrice ? Number(ctx.effectiveRefPrice) : undefined,
      projectedMYA: ctx.projectedMYA ? Number(ctx.projectedMYA) : undefined,
      projectedYield: ctx.projectedYield ? Number(ctx.projectedYield) : undefined,
      historicalPayments,
      electionData: undefined, // Can be added later from county-elections API
      generatedAt: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    // ── Render PDF ──────────────────────────────────────────────────────────
    console.log('[PDF] Starting renderToBuffer...');
    const element = <ARCPLCReport data={reportData} />;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any);
    const responseBody = new Uint8Array(pdfBuffer);
    console.log('[PDF] PDF generated successfully, size:', responseBody.length, 'bytes');

    // ── Build filename ──────────────────────────────────────────────────────
    const safeCounty = countyName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `ARC-PLC-Analysis-${safeCounty}-${stateAbbr}-${cropName}.pdf`;

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour per user
      },
    });
  } catch (err) {
    // Log the FULL error — this is critical for debugging
    console.error('[PDF] Generation error:', err);
    console.error('[PDF] Error stack:', err instanceof Error ? err.stack : 'no stack');
    console.error('[PDF] Error message:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: 'Failed to generate report. Please try again.' },
      { status: 500 }
    );
  }
}
