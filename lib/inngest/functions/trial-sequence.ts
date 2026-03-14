// =============================================================================
// HarvestFile - Trial Email Sequence (Inngest Multi-Step)
// Phase 3D: Day 0 / 7 / 12 onboarding emails
// =============================================================================

import { inngest } from '../client';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { TrialEndingEmail } from '@/emails/TrialEndingEmail';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const trialEmailSequence = inngest.createFunction(
  {
    id: 'trial-email-sequence',
    cancelOn: [{ event: 'app/user.converted', if: 'async.data.userId == event.data.userId' }],
    retries: 3,
  },
  { event: 'app/user.trial_started' },
  async ({ event, step }) => {
    const { userId, email, firstName } = event.data;

    // Day 0: Welcome
    await step.run('send-welcome', async () => {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM.onboarding,
        to: [email],
        subject: `Welcome to HarvestFile, ${firstName}! Your Pro trial is active.`,
        react: WelcomeEmail({ firstName }),
      });
      if (error) throw new Error(`Welcome email failed: ${JSON.stringify(error)}`);
    });

    await step.sleep('wait-day-7', '7d');

    // Day 7: Check engagement
    const stats = await step.run('check-engagement', async () => {
      const { count: reports } = await supabase.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: alerts } = await supabase.from('price_alerts').select('id', { count: 'exact', head: true }).eq('created_by', userId).eq('is_active', true);
      return { reports: reports ?? 0, alerts: alerts ?? 0 } as { reports: number; alerts: number };
    });

    const stillTrial = await step.run('check-trial-day7', async () => {
      const { data } = await supabase.from('user_profiles').select('subscription_status').eq('id', userId).single();
      return data?.subscription_status === 'trialing' || !data;
    });

    if (!stillTrial) return { completed: 'converted-early', stoppedAt: 'day-7' };

    await step.run('send-day7', async () => {
      const hasEngaged = stats.reports > 0 || stats.alerts > 0;
      await resend.emails.send({
        from: EMAIL_FROM.onboarding,
        to: [email],
        subject: hasEngaged
          ? `${firstName}, you're getting great results — here's what else HarvestFile can do`
          : `${firstName}, here's what farmers are finding with HarvestFile`,
        html: buildDay7HTML(firstName, stats, hasEngaged),
      });
    });

    await step.sleep('wait-day-12', '5d');

    // Day 12: Conversion nudge
    const stillTrial12 = await step.run('check-trial-day12', async () => {
      const { data } = await supabase.from('user_profiles').select('subscription_status').eq('id', userId).single();
      return data?.subscription_status === 'trialing' || !data;
    });

    if (!stillTrial12) return { completed: 'converted', stoppedAt: 'day-12' };

    await step.run('send-conversion', async () => {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM.onboarding,
        to: [email],
        subject: `${firstName}, your Pro trial ends in 2 days`,
        react: TrialEndingEmail({ firstName, daysLeft: 2, reportsGenerated: stats.reports, alertsCreated: stats.alerts }),
      });
      if (error) throw new Error(`Conversion email failed: ${JSON.stringify(error)}`);
    });

    return { completed: 'full-sequence', emailsSent: 3 };
  }
);

function buildDay7HTML(firstName: string, stats: { reports: number; alerts: number }, hasEngaged: boolean): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="background:#f3f4f6;font-family:Arial,sans-serif;margin:0;padding:0">
<div style="max-width:600px;margin:40px auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:#1B4332;padding:24px 30px">
    <span style="color:#10b981;font-size:24px;font-weight:bold">◆</span>
    <span style="color:#fff;font-size:18px;font-weight:bold;margin-left:8px">HarvestFile</span>
  </div>
  <div style="padding:24px 30px">
    <p style="font-size:14px;color:#4b5563;line-height:1.6">Hi ${firstName},</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6">${hasEngaged
      ? `You've generated ${stats.reports} report${stats.reports !== 1 ? 's' : ''} and set up ${stats.alerts} price alert${stats.alerts !== 1 ? 's' : ''} — great progress.`
      : `Thousands of farmers are using HarvestFile to find USDA payments they didn't know they qualified for.`}</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6"><strong>Have you tried these Pro features?</strong></p>
    <ul style="font-size:14px;color:#4b5563;line-height:1.8">
      <li><strong>Price Alerts</strong> — Get notified when commodity prices cross your thresholds</li>
      <li><strong>Intelligence Hub</strong> — Live USDA data + AI-powered reports for your county</li>
      <li><strong>PDF Export</strong> — Professional reports to take to your FSA office</li>
    </ul>
    <div style="text-align:center;padding:16px 0">
      <a href="https://harvestfile.com/dashboard" style="background:#1B4332;color:#fff;padding:14px 36px;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block">Open Your Dashboard →</a>
    </div>
  </div>
  <div style="padding:16px 30px;background:#f9fafb;text-align:center">
    <span style="font-size:11px;color:#9ca3af">HarvestFile LLC · harvestfile.com</span>
  </div>
</div></body></html>`;
}
