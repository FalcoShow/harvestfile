// =============================================================================
// HarvestFile — Twilio SMS Status Webhook
// Phase 19: Receives delivery status callbacks from Twilio
//
// POST /api/sms/status
// Twilio sends form-encoded data with MessageSid, MessageStatus, etc.
// Updates sms_logs table with delivery confirmation.
//
// CRITICAL: This route must be excluded from auth middleware (no Supabase JWT)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
    } = params;

    if (!MessageSid || !MessageStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[SMS Status] SID: ${MessageSid}, Status: ${MessageStatus}${ErrorCode ? `, Error: ${ErrorCode}` : ''}`);

    // Update the sms_logs record with delivery status
    const { error } = await supabaseAdmin
      .from('sms_logs')
      .update({
        delivery_status: MessageStatus, // queued, sent, delivered, undelivered, failed
        error_message: ErrorCode ? `${ErrorCode}: ${ErrorMessage || 'Unknown'}` : null,
        status_updated_at: new Date().toISOString(),
      })
      .eq('twilio_sid', MessageSid);

    if (error) {
      console.error(`[SMS Status] Failed to update log for ${MessageSid}:`, error.message);
    }

    // Return 200 to acknowledge — Twilio retries on non-2xx
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err: any) {
    console.error('[SMS Status] Webhook error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
