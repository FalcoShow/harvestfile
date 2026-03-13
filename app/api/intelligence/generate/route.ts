// =============================================================================
// app/api/intelligence/generate/route.ts
// HarvestFile Intelligence Report Generation API
// POST /api/intelligence/generate
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIntelligenceReport, type ReportRequest } from '@/lib/services/report-engine';

// Initialize Supabase with service role for server-side operations
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ── Auth check ──────────────────────────────────────────────────────
    const supabase = getSupabaseAdmin();
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let orgId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // If no auth header, try cookie-based auth
    if (!userId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // For cookie auth, we'll get user from the request context
        // This is handled by the middleware
      }
    }

    // Get org_id for quota checking
    if (userId) {
      const { data: pro } = await supabase
        .from('professionals')
        .select('org_id')
        .eq('auth_id', userId)
        .single();
      orgId = pro?.org_id || null;
    }

    // ── Parse request ───────────────────────────────────────────────────
    const body = await request.json();
    
    const reportReq: ReportRequest = {
      report_type: body.report_type || 'market_intelligence',
      state: body.state,
      county: body.county,
      crops: body.crops || ['CORN'],
      acres: body.acres,
      latitude: body.latitude,
      longitude: body.longitude,
      additional_context: body.additional_context,
    };

    // Validate
    if (!reportReq.state || !reportReq.county) {
      return NextResponse.json(
        { error: 'State and county are required' },
        { status: 400 }
      );
    }

    if (!['market_intelligence', 'crop_planner', 'weather_risk', 'full_analysis'].includes(reportReq.report_type)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    // ── Check quota (if authenticated) ──────────────────────────────────
    if (orgId) {
      const { data: quota } = await supabase.rpc('get_report_quota', { p_org_id: orgId });
      
      if (quota && quota.length > 0 && !quota[0].can_generate) {
        return NextResponse.json(
          { 
            error: 'Monthly report limit reached',
            reports_used: quota[0].reports_generated,
            reports_limit: quota[0].reports_limit,
            upgrade_url: '/pricing',
          },
          { status: 429 }
        );
      }
    }

    // ── Look up county coordinates if not provided ──────────────────────
    if (!reportReq.latitude || !reportReq.longitude) {
      const { data: coords } = await supabase
        .from('county_coordinates')
        .select('latitude, longitude')
        .eq('state', reportReq.state.toUpperCase())
        .ilike('county', reportReq.county)
        .single();

      if (coords) {
        reportReq.latitude = parseFloat(coords.latitude);
        reportReq.longitude = parseFloat(coords.longitude);
      }
    }

    // ── Create report record (queued) ───────────────────────────────────
    let reportRecordId: string | null = null;
    
    if (orgId) {
      const { data: record } = await supabase
        .from('intelligence_reports')
        .insert({
          org_id: orgId,
          created_by: userId,
          report_type: reportReq.report_type,
          status: 'fetching_data',
          parameters: reportReq,
        })
        .select('id')
        .single();
      
      reportRecordId = record?.id || null;
    }

    // ── Generate the report ─────────────────────────────────────────────
    console.log(`Generating ${reportReq.report_type} for ${reportReq.county}, ${reportReq.state}`);
    
    const report = await generateIntelligenceReport(reportReq);

    // ── Save completed report ───────────────────────────────────────────
    if (reportRecordId && orgId) {
      await supabase
        .from('intelligence_reports')
        .update({
          status: 'complete',
          title: report.title,
          summary: report.summary,
          content: {
            sections: report.sections,
            data_sources: report.data_sources,
          },
          raw_markdown: report.raw_markdown,
          data_sources: report.data_sources,
          generation_time_ms: report.generation_time_ms,
          ai_model: report.model,
          ai_tokens_used: report.tokens_used,
          completed_at: new Date().toISOString(),
          is_premium: reportReq.report_type === 'full_analysis',
        })
        .eq('id', reportRecordId);

      // Update quota
      const month = new Date().toISOString().substring(0, 7);
      try {
        await supabase
          .from('report_quotas')
          .upsert({
            org_id: orgId,
            month,
            reports_generated: 1,
          }, { onConflict: 'org_id,month' });
      } catch (e) {
        console.error('Quota update failed (non-critical):', e);
      }
    }

    // ── Return the report ───────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      report: {
        id: reportRecordId || report.id,
        type: report.type,
        title: report.title,
        summary: report.summary,
        sections: report.sections,
        data_sources: report.data_sources,
        generated_at: report.generated_at,
        generation_time_ms: report.generation_time_ms,
      },
    });

  } catch (error) {
    console.error('Intelligence report generation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Report generation failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
