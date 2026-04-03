// =============================================================================
// HarvestFile — Inngest Enrollment Drip Campaign
// lib/inngest/functions/enrollment-drip.ts
//
// Build 18 Deploy 6B: 4-email nurture sequence triggered by email capture
// on /check. Uses step.sleep() for Day 0/3/7/14 timing. Each step.run()
// is independently retried and memoized. No compute cost during sleep.
//
// Sequence:
//   Email 1 (Day 0):  Welcome + analysis saved confirmation
//   Email 2 (Day 3):  ARC vs PLC plain-language educational guide
//   Email 3 (Day 7):  Enrollment preparation checklist
//   Email 4 (Day 14): Morning Dashboard invitation (skipped if converted)
//
// CAN-SPAM compliance:
//   - Physical address in footer (PO Box, Tallmadge OH)
//   - One-click unsubscribe via RFC 8058 headers
//   - Honor opt-out within 48 hours
//   - Accurate sender identification
//
// Triggered by: 'leads/analysis.saved' event from /api/leads/capture
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import WelcomeEmail from '@/components/emails/drip/WelcomeEmail';
import ARCPLCGuideEmail from '@/components/emails/drip/ARCPLCGuideEmail';
import ChecklistEmail from '@/components/emails/drip/ChecklistEmail';
import UpgradeOfferEmail from '@/components/emails/drip/UpgradeOfferEmail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const BASE_URL = 'https://www.harvestfile.com';

// ── Shared email headers for RFC 8058 one-click unsubscribe ──────────────────
function getUnsubscribeHeaders(token: string) {
  return {
    'List-Unsubscribe': `<${BASE_URL}/api/unsubscribe?token=${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ── CROP CODE → Display Name mapping ─────────────────────────────────────────
const CROP_NAMES: Record<string, string> = {
  CORN: 'Corn', SOYBEANS: 'Soybeans', WHEAT: 'Wheat', 'WHEAT, WINTER': 'Winter Wheat',
  'WHEAT, SPRING': 'Spring Wheat', OATS: 'Oats', BARLEY: 'Barley', SORGHUM: 'Sorghum',
  RICE: 'Rice', PEANUTS: 'Peanuts', SUNFLOWER: 'Sunflowers', CANOLA: 'Canola',
  'MUSTARD SEED': 'Mustard Seed', 'FLAXSEED': 'Flaxseed', SAFFLOWER: 'Safflower',
  CRAMBE: 'Crambe',
};

// ─── The Drip Campaign Function ──────────────────────────────────────────────

export const enrollmentDripCampaign = inngest.createFunction(
  {
    id: 'enrollment-drip-campaign',
    retries: 3,
    concurrency: [{ limit: 10 }],
  },
  { event: 'leads/analysis.saved' },
  async ({ event, step }) => {
    const {
      leadId,
      email,
      countyName,
      stateAbbr,
      cropCode,
      acres,
      recommendation,
      arcPerAcre,
      plcPerAcre,
    } = event.data;

    const cropName = CROP_NAMES[cropCode] || cropCode || 'your crop';
    const unsubscribeToken = leadId; // Use lead ID as opaque token

    // ── Email 1: Welcome (Day 0, immediate) ──────────────────────────────
    await step.run('email-1-welcome', async () => {
      const { error } = await resend.emails.send({
        from: 'HarvestFile <hello@harvestfile.com>',
        to: [email],
        subject: 'Your ARC/PLC Analysis Is Saved',
        headers: getUnsubscribeHeaders(unsubscribeToken),
        react: WelcomeEmail({
          countyName: countyName || 'your county',
          stateAbbr: stateAbbr || '',
          cropName,
          acres: acres || '',
          recommendation: recommendation || 'ARC-CO',
          arcPerAcre: arcPerAcre || 0,
          plcPerAcre: plcPerAcre || 0,
          unsubscribeToken,
        }),
      });
      if (error) throw new Error(`Welcome email failed: ${JSON.stringify(error)}`);

      // Track send
      await supabase
        .from('leads')
        .update({ send_count: 1, last_email_sent_at: new Date().toISOString() })
        .eq('id', leadId);
    });

    // ── Wait 3 days ──────────────────────────────────────────────────────
    await step.sleep('wait-day-3', '3 days');

    // ── Check if still active before Email 2 ─────────────────────────────
    const isActive2 = await step.run('check-status-day-3', async () => {
      const { data } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();
      return data?.status === 'active';
    });
    if (!isActive2) return { completed: 'unsubscribed', stoppedAt: 'day-3' };

    // ── Email 2: ARC vs PLC Guide (Day 3) ────────────────────────────────
    await step.run('email-2-guide', async () => {
      const { error } = await resend.emails.send({
        from: 'HarvestFile <hello@harvestfile.com>',
        to: [email],
        subject: `ARC vs PLC: A Plain-Language Guide for ${countyName || 'Your County'} Farmers`,
        headers: getUnsubscribeHeaders(unsubscribeToken),
        react: ARCPLCGuideEmail({
          countyName: countyName || 'your county',
          stateAbbr: stateAbbr || '',
          cropName,
          unsubscribeToken,
        }),
      });
      if (error) throw new Error(`Guide email failed: ${JSON.stringify(error)}`);

      await supabase
        .from('leads')
        .update({
          send_count: 2,
          last_email_sent_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    });

    // ── Wait 4 more days (Day 7 total) ───────────────────────────────────
    await step.sleep('wait-day-7', '4 days');

    // ── Check if still active before Email 3 ─────────────────────────────
    const isActive3 = await step.run('check-status-day-7', async () => {
      const { data } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();
      return data?.status === 'active';
    });
    if (!isActive3) return { completed: 'unsubscribed', stoppedAt: 'day-7' };

    // ── Email 3: Enrollment Checklist (Day 7) ────────────────────────────
    await step.run('email-3-checklist', async () => {
      const { error } = await resend.emails.send({
        from: 'HarvestFile <hello@harvestfile.com>',
        to: [email],
        subject: 'Your 2026 Enrollment Checklist — 7 Steps Before You Visit FSA',
        headers: getUnsubscribeHeaders(unsubscribeToken),
        react: ChecklistEmail({
          countyName: countyName || 'your county',
          stateAbbr: stateAbbr || '',
          unsubscribeToken,
        }),
      });
      if (error) throw new Error(`Checklist email failed: ${JSON.stringify(error)}`);

      await supabase
        .from('leads')
        .update({
          send_count: 3,
          last_email_sent_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    });

    // ── Wait 7 more days (Day 14 total) ──────────────────────────────────
    await step.sleep('wait-day-14', '7 days');

    // ── Check if still active AND hasn't created account ─────────────────
    const shouldSendEmail4 = await step.run('check-status-day-14', async () => {
      const { data } = await supabase
        .from('leads')
        .select('status, auth_user_id')
        .eq('id', leadId)
        .single();
      // Skip if unsubscribed or if they've already created an account
      return data?.status === 'active' && !data?.auth_user_id;
    });
    if (!shouldSendEmail4) return { completed: 'converted-or-unsubscribed', stoppedAt: 'day-14' };

    // ── Email 4: Morning Dashboard Invitation (Day 14) ───────────────────
    await step.run('email-4-upgrade', async () => {
      const { error } = await resend.emails.send({
        from: 'HarvestFile <hello@harvestfile.com>',
        to: [email],
        subject: `See ${countyName || 'Your County'}'s Latest Numbers Every Morning`,
        headers: getUnsubscribeHeaders(unsubscribeToken),
        react: UpgradeOfferEmail({
          countyName: countyName || 'your county',
          stateAbbr: stateAbbr || '',
          cropName,
          unsubscribeToken,
        }),
      });
      if (error) throw new Error(`Upgrade email failed: ${JSON.stringify(error)}`);

      await supabase
        .from('leads')
        .update({
          send_count: 4,
          last_email_sent_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    });

    return { completed: 'full-sequence', emailsSent: 4 };
  }
);
