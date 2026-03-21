// =============================================================================
// HarvestFile — Twilio Inbound SMS Webhook
// Phase 19: Handles incoming text messages (STOP, START, etc.)
//
// POST /api/sms/inbound
// Twilio forwards incoming SMS as form-encoded data.
// Processes opt-out (STOP) and opt-in (START) keywords per TCPA/CTIA rules.
//
// CRITICAL: This route must be excluded from auth middleware (no Supabase JWT)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isOptOut, isOptIn } from '@/lib/twilio';

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
      From: fromPhone,
      Body: body,
      MessageSid: messageSid,
    } = params;

    if (!fromPhone || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedBody = body.trim().toLowerCase();
    console.log(`[SMS Inbound] From: ${fromPhone}, Body: "${normalizedBody}"`);

    // ── Handle OPT-OUT (STOP, UNSUBSCRIBE, etc.) ──────────────────────────
    if (isOptOut(body)) {
      console.log(`[SMS Inbound] Processing opt-out for ${fromPhone}`);

      // Deactivate all subscriptions for this phone number
      const { data: subs, error: fetchError } = await supabaseAdmin
        .from('sms_subscriptions')
        .select('id')
        .eq('phone', fromPhone)
        .eq('is_active', true);

      if (!fetchError && subs && subs.length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('sms_subscriptions')
          .update({
            is_active: false,
            opt_out_at: new Date().toISOString(),
            opt_out_method: 'sms_keyword',
          })
          .eq('phone', fromPhone);

        if (updateError) {
          console.error(`[SMS Inbound] Failed to opt-out ${fromPhone}:`, updateError.message);
        }
      }

      // Log the opt-out event
      await supabaseAdmin.from('sms_opt_out_log').insert({
        phone: fromPhone,
        action: 'opt_out',
        method: 'sms_keyword',
        keyword: normalizedBody,
        twilio_sid: messageSid || null,
      });

      // Twilio auto-handles STOP replies, but we return TwiML just in case
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // ── Handle OPT-IN (START, YES, UNSTOP) ────────────────────────────────
    if (isOptIn(body)) {
      console.log(`[SMS Inbound] Processing opt-in for ${fromPhone}`);

      // Reactivate subscriptions for this phone number
      const { error: updateError } = await supabaseAdmin
        .from('sms_subscriptions')
        .update({
          is_active: true,
          opt_out_at: null,
          opt_out_method: null,
          opt_in_at: new Date().toISOString(),
        })
        .eq('phone', fromPhone);

      if (updateError) {
        console.error(`[SMS Inbound] Failed to opt-in ${fromPhone}:`, updateError.message);
      }

      // Log the opt-in event
      await supabaseAdmin.from('sms_opt_out_log').insert({
        phone: fromPhone,
        action: 'opt_in',
        method: 'sms_keyword',
        keyword: normalizedBody,
        twilio_sid: messageSid || null,
      });

      // Send confirmation via TwiML
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>HarvestFile: You're re-subscribed to agricultural alerts. Reply STOP to cancel anytime.</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // ── Handle HELP keyword ───────────────────────────────────────────────
    if (normalizedBody === 'help' || normalizedBody === 'info') {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>HarvestFile: Agricultural price &amp; program alerts. Msg freq varies. Msg&amp;data rates apply. Reply STOP to cancel. Support: hello@harvestfile.com</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // ── Any other message — no response ───────────────────────────────────
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (err: any) {
    console.error('[SMS Inbound] Webhook error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
