// =============================================================================
// HarvestFile - Resend Email Client
// Phase 3D: Price Alert Email System
// =============================================================================

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY not set — emails will not send');
}

export const resend = new Resend(process.env.RESEND_API_KEY || '');

export const EMAIL_FROM = {
  alerts: process.env.RESEND_FROM_EMAIL || 'HarvestFile Alerts <alerts@mail.harvestfile.com>',
  onboarding: 'HarvestFile <hello@mail.harvestfile.com>',
  noreply: 'HarvestFile <noreply@mail.harvestfile.com>',
};

export async function sendEmail({
  to,
  subject,
  react,
  from = EMAIL_FROM.alerts,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
    });
    if (error) {
      console.error('[Resend] Send error:', error);
      return { success: false, error, messageId: null };
    }
    console.log(`[Resend] Sent to ${to}: ${data?.id}`);
    return { success: true, messageId: data?.id, error: null };
  } catch (err) {
    console.error('[Resend] Error:', err);
    return { success: false, error: err, messageId: null };
  }
}
