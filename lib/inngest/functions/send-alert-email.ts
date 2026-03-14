// =============================================================================
// HarvestFile - Send Alert Email (Inngest Event Handler)
// Phase 3D: Individual alert email with deduplication
// =============================================================================

import { inngest } from '../client';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { PriceAlertEmail } from '@/emails/PriceAlertEmail';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const sendAlertEmail = inngest.createFunction(
  {
    id: 'send-alert-email',
    retries: 3,
    concurrency: [{ limit: 5 }],
    throttle: { limit: 2, period: '1s' },
  },
  { event: 'app/alert.triggered' },
  async ({ event, step }) => {
    const { alertId, userId, orgId, email, farmerName, commodity, currentPrice, threshold, condition, state, priceUnit } = event.data;

    // Step 1: Idempotency check
    const today = new Date().toISOString().split('T')[0];
    const idempotencyKey = `${userId}:${alertId}:${today}`;

    const isDuplicate = await step.run('check-duplicate', async () => {
      const { data } = await supabase
        .from('notification_log')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .limit(1);
      return (data?.length || 0) > 0;
    });

    if (isDuplicate) return { skipped: true, reason: 'duplicate' };

    // Step 2: Send email
    const emailResult = await step.run('send-email', async () => {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM.alerts,
        to: [email],
        subject: `${condition === 'above' ? '▲' : '▼'} ${commodity} at $${currentPrice.toFixed(2)}${priceUnit} — Alert Triggered`,
        react: PriceAlertEmail({
          farmerName,
          commodity,
          currentPrice,
          threshold,
          condition: condition as 'above' | 'below',
          state,
          priceUnit,
        }),
      });
      if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
      return data;
    });

    // Step 3: Log notification
    await step.run('log-notification', async () => {
      await supabase.from('notification_log').insert({
        alert_id: alertId,
        user_id: userId,
        org_id: orgId,
        commodity,
        trigger_price: currentPrice,
        threshold_price: threshold,
        idempotency_key: idempotencyKey,
        delivery_status: 'sent',
        external_id: emailResult?.id || null,
      });
    });

    return { sent: true, to: email, commodity, resendId: emailResult?.id };
  }
);
