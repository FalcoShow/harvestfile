// =============================================================================
// HarvestFile - AI Report Generation API Route
// POST /api/generate-report
// Phase 3A: Calls Claude API to generate personalized farm program report
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  buildSystemPrompt, 
  buildUserPrompt, 
  parseReportResponse,
  getPreviewSections 
} from '@/lib/report-prompt';
import { GenerateReportRequest, GenerateReportResponse, ReportData } from '@/lib/types/report';

// Store reports in memory for now — replace with Supabase in production
// This is fine for MVP since Vercel serverless functions are stateless
// and we'll move to Supabase persistence in the next phase
const reportCache = new Map<string, ReportData>();

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportRequest = await request.json();
    const { farmData } = body;

    // ---- Validate input ----
    if (!farmData) {
      return NextResponse.json(
        { success: false, error: 'Missing farm data' } as GenerateReportResponse,
        { status: 400 }
      );
    }
    if (!farmData.state || !farmData.county) {
      return NextResponse.json(
        { success: false, error: 'State and county are required' } as GenerateReportResponse,
        { status: 400 }
      );
    }
    if (!farmData.email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' } as GenerateReportResponse,
        { status: 400 }
      );
    }
    if (!farmData.crops || farmData.crops.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one crop is required' } as GenerateReportResponse,
        { status: 400 }
      );
    }

    // ---- Check API key ----
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Report generation is temporarily unavailable' } as GenerateReportResponse,
        { status: 503 }
      );
    }

    // ---- Call Claude API ----
    console.log(`Generating report for ${farmData.county}, ${farmData.state} — ${farmData.crops.length} crop(s)`);
    
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(farmData),
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorBody);
      return NextResponse.json(
        { success: false, error: 'Failed to generate report. Please try again.' } as GenerateReportResponse,
        { status: 500 }
      );
    }

    const claudeData = await claudeResponse.json();
    
    // Extract text content from Claude's response
    const textContent = claudeData.content?.find(
      (block: { type: string }) => block.type === 'text'
    );
    
    if (!textContent?.text) {
      console.error('No text content in Claude response:', JSON.stringify(claudeData.content?.map((b: { type: string }) => b.type)));
      return NextResponse.json(
        { success: false, error: 'Report generation produced empty result' } as GenerateReportResponse,
        { status: 500 }
      );
    }

    // ---- Parse the report ----
    const report = parseReportResponse(textContent.text);

    // ---- Save to Supabase (future) ----
    // For now, we rely on the report being returned directly
    // TODO: Save to Supabase `reports` table for persistence
    // await supabase.from('reports').insert({
    //   report_id: report.reportId,
    //   email: farmData.email,
    //   state: farmData.state,
    //   county: farmData.county,
    //   report_data: report,
    //   tier: 'preview',
    //   created_at: new Date().toISOString(),
    // });

    // ---- Track email for follow-up (use existing Supabase) ----
    // This reuses your existing email_captures table
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        await fetch(`${supabaseUrl}/rest/v1/email_captures`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            email: farmData.email,
            source: 'report_generation',
            metadata: {
              state: farmData.state,
              county: farmData.county,
              crops: farmData.crops.map(c => c.cropName),
              recommendation: report.executiveSummary.recommendation,
              reportId: report.reportId,
            },
          }),
        });
      }
    } catch (emailError) {
      // Don't fail the report generation if email capture fails
      console.error('Email capture failed (non-critical):', emailError);
    }

    // ---- Return the report ----
    console.log(`Report generated successfully: ${report.reportId}`);
    
    return NextResponse.json({
      success: true,
      reportId: report.reportId,
      report,
      previewSections: getPreviewSections(),
    } as GenerateReportResponse);

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      } as GenerateReportResponse,
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'harvestfile-report-generator',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  });
}
