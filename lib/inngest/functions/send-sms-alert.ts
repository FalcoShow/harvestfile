// =============================================================================
// HarvestFile — Send SMS Alert (Inngest Event Handler)
// Phase 19: Individual SMS delivery with deduplication and opt-out checking
//
// Triggered by: 'app/sms.alert.send' events (fanned out from cron jobs)
// Pattern matches send-alert-email.ts — idempotency check, send, log.
// =============================================================================

import { inngest } from '../client';
import { sendSMS, isWithinSendWindow, SMS_TEMPLATES } from '@/lib/twilio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const sendSMSAlert = inngest.createFunction(
  {
    id: 'send-sms-alert',
    retries: 3,
    concurrency: [{ limit: 3 }], // Stay within 10DLC Low Volume throughput
    throttle: { limit: 2, period: '1s' }, // ~2 MPS to respect carrier limits
  },
  { event: 'app/sms.alert.send' },
  async ({ event, step }) => {
    const {
      subscriptionId,
      phone,
      timezone,
      alertType,
      commodity,
      currentPrice,
      threshold,
      condition,
      priceUnit,
      message, // Pre-formatted message (optional — overrides template)
    } = event.data;

    // Step 1: Check opt-out status
    const isOptedOut = await step.run('check-opt-out', async () => {
      const { data } = await supabase
        .from('sms_subscriptions')
        .select('is_active, opt_out_at')
        .eq('id', subscriptionId)
        .single();

      return !data?.is_active || !!data?.opt_out_at;
    });

    if (isOptedOut) {
      return { skipped: true, reason: 'opted_out' };
    }

    // Step 2: Idempotency check (no duplicate SMS for same alert within 24h)
    const today = new Date().toISOString().split('T')[0];
    const idempotencyKey = `sms:${subscriptionId}:${alertType}:${commodity || 'general'}:${today}`;

    const isDuplicate = await step.run('check-duplicate', async () => {
      const { data } = await supabase
        .from('sms_logs')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .limit(1);
      return (data?.length || 0) > 0;
    });

    if (isDuplicate) {
      return { skipped: true, reason: 'duplicate' };
    }

    // Step 3: Check send window (TCPA compliance)
    const canSendNow = await step.run('check-send-window', async () => {
      return isWithinSendWindow(timezone || 'America/New_York');
    });

    if (!canSendNow) {
      // Re-queue for later (Inngest will retry with backoff)
      throw new Error('Outside TCPA send window — will retry');
    }

    // Step 4: Format and send SMS
    const smsResult = await step.run('send-sms', async () => {
      // Use pre-formatted message or build from template
      let body = message;

      if (!body && alertType === 'price_threshold' && commodity && currentPrice && condition) {
        body = SMS_TEMPLATES.priceThreshold(
          commodity,
          currentPrice,
          condition as 'above' | 'below',
          priceUnit || '/bu'
        );
      } else if (!body && alertType === 'mya_update' && commodity && currentPrice) {
        body = SMS_TEMPLATES.myaUpdate(
          commodity,
          currentPrice,
          priceUnit || '/bu',
          condition || 'updated'
        );
      } else if (!body && alertType === 'wasde_release') {
        body = SMS_TEMPLATES.wasdeRelease(message || 'Key commodity projections updated.');
      } else if (!body && alertType === 'enrollment_deadline') {
        body = SMS_TEMPLATES.enrollmentDeadline(threshold || 30);
      } else if (!body) {
        body = message || 'HarvestFile: Your farm program data has been updated. harvestfile.com/dashboard Reply STOP to end';
      }

      return sendSMS({
        to: phone,
        body,
        alertType: alertType as any,
      });
    });

    // Step 5: Log the SMS
    await step.run('log-sms', async () => {
      await supabase.from('sms_logs').insert({
        subscription_id: subscriptionId,
        phone,
        alert_type: alertType,
        commodity: commodity || null,
        message_body: smsResult.success ? '(sent)' : '(failed)', // Don't store full message for privacy
        twilio_sid: smsResult.sid,
        delivery_status: smsResult.success ? 'sent' : 'failed',
        segment_count: smsResult.segmentCount,
        error_message: smsResult.error,
        idempotency_key: idempotencyKey,
      });
    });

    // Step 6: Update subscription last_sent_at
    if (smsResult.success) {
      await step.run('update-subscription', async () => {
        await supabase
          .from('sms_subscriptions')
          .update({
            last_sent_at: new Date().toISOString(),
            total_sent: supabase.rpc ? undefined : undefined, // Increment handled by trigger
          })
          .eq('id', subscriptionId);
      });
    }

    return {
      sent: smsResult.success,
      sid: smsResult.sid,
      phone,
      alertType,
      commodity,
      error: smsResult.error,
    };
  }
);
