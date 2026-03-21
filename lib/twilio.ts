// =============================================================================
// HarvestFile — Twilio SMS Client
// Phase 19: SMS Price & Deadline Alerts
//
// Provides: Twilio client instance, sendSMS helper, timezone-aware delivery,
// message formatting, and STOP keyword detection.
//
// Environment variables required in Vercel:
//   TWILIO_ACCOUNT_SID    — (set in Vercel)
//   TWILIO_AUTH_TOKEN      — (set in Vercel)
//   TWILIO_PHONE_NUMBER    — (set in Vercel)
// =============================================================================

import twilio from 'twilio';

// ── Validate env vars ────────────────────────────────────────────────────────
if (!process.env.TWILIO_ACCOUNT_SID) {
  console.warn('⚠️ TWILIO_ACCOUNT_SID not set — SMS will not send');
}
if (!process.env.TWILIO_AUTH_TOKEN) {
  console.warn('⚠️ TWILIO_AUTH_TOKEN not set — SMS will not send');
}

// ── Twilio client (lazy init to avoid build-time crashes) ────────────────────
let _client: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return _client;
}

// ── Constants ────────────────────────────────────────────────────────────────
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+13305579717';
const MAX_SEGMENT_LENGTH = 160; // Single SMS segment

// ── Status callback URL (set after deployment) ──────────────────────────────
const STATUS_CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`
  : 'https://www.harvestfile.com/api/sms/status';

// ── Types ────────────────────────────────────────────────────────────────────
export interface SendSMSResult {
  success: boolean;
  sid: string | null;
  error: string | null;
  segmentCount: number;
}

export interface SMSAlertPayload {
  to: string;           // E.164 format: +13305551234
  body: string;         // Message body (keep under 160 chars)
  alertType: 'price_threshold' | 'mya_update' | 'wasde_release' | 'enrollment_deadline' | 'payment_date' | 'fsa_announcement';
  metadata?: Record<string, any>;
}

// ── STOP keyword detection ──────────────────────────────────────────────────
const OPT_OUT_KEYWORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'];
const OPT_IN_KEYWORDS = ['start', 'yes', 'unstop'];

export function isOptOut(body: string): boolean {
  return OPT_OUT_KEYWORDS.includes(body.trim().toLowerCase());
}

export function isOptIn(body: string): boolean {
  return OPT_IN_KEYWORDS.includes(body.trim().toLowerCase());
}

// ── Send SMS ─────────────────────────────────────────────────────────────────
export async function sendSMS(payload: SMSAlertPayload): Promise<SendSMSResult> {
  try {
    const client = getTwilioClient();

    // Estimate segment count
    const segmentCount = Math.ceil(payload.body.length / MAX_SEGMENT_LENGTH);

    const message = await client.messages.create({
      body: payload.body,
      from: TWILIO_PHONE_NUMBER,
      to: payload.to,
      statusCallback: STATUS_CALLBACK_URL,
    });

    console.log(`[Twilio] SMS sent to ${payload.to}: SID ${message.sid}, segments: ${segmentCount}`);

    return {
      success: true,
      sid: message.sid,
      error: null,
      segmentCount,
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown Twilio error';
    console.error(`[Twilio] SMS failed to ${payload.to}:`, errorMessage);

    return {
      success: false,
      sid: null,
      error: errorMessage,
      segmentCount: 0,
    };
  }
}

// ── Phone number formatting ─────────────────────────────────────────────────
// Normalize US phone numbers to E.164 format
export function formatPhoneE164(phone: string): string | null {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '');

  // US number: 10 digits or 11 digits starting with 1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already E.164
  if (phone.startsWith('+1') && digits.length === 11) {
    return `+${digits}`;
  }

  return null; // Invalid
}

// ── Timezone-aware send window check ────────────────────────────────────────
// TCPA requires messages between 8am-9pm recipient local time.
// We use 6:30am-8:30pm for agricultural users (they're early risers).
const TIMEZONE_OFFSETS: Record<string, number> = {
  'America/New_York': -5,     // ET
  'America/Chicago': -6,       // CT
  'America/Denver': -7,        // MT
  'America/Los_Angeles': -8,   // PT
  'America/Anchorage': -9,     // AK
  'America/Honolulu': -10,     // HI
};

export function isWithinSendWindow(timezone: string): boolean {
  const offset = TIMEZONE_OFFSETS[timezone] ?? -5; // Default to ET
  const now = new Date();
  const utcHour = now.getUTCHours();
  const localHour = (utcHour + offset + 24) % 24;

  // Allow sending between 6:30 AM and 8:30 PM local time
  return localHour >= 7 && localHour <= 20;
}

// ── Message templates ────────────────────────────────────────────────────────
export const SMS_TEMPLATES = {
  priceThreshold: (commodity: string, price: number, direction: 'above' | 'below', unit: string) =>
    `HarvestFile: ${commodity} at $${price.toFixed(2)}${unit} (${direction === 'above' ? '▲' : '▼'} your threshold). Check projections: harvestfile.com/dashboard Reply STOP to end`,

  myaUpdate: (commodity: string, mya: number, unit: string, change: string) =>
    `HarvestFile: ${commodity} MYA est $${mya.toFixed(2)}${unit} (${change}). ARC/PLC projections updated. harvestfile.com/dashboard Reply STOP to end`,

  wasdeRelease: (summary: string) =>
    `HarvestFile: USDA WASDE released. ${summary} Your projections updated. harvestfile.com/dashboard Reply STOP to end`,

  enrollmentDeadline: (daysUntil: number) =>
    `HarvestFile: ARC/PLC enrollment deadline is ${daysUntil} day${daysUntil !== 1 ? 's' : ''} away. Review your elections: harvestfile.com/check Reply STOP to end`,

  enrollmentAnnouncement: () =>
    `HarvestFile: USDA announced 2026 ARC/PLC enrollment dates! Review your options now: harvestfile.com/check Reply STOP to end`,

  paymentDate: (program: string, date: string) =>
    `HarvestFile: ${program} payments scheduled for ${date}. Track yours: harvestfile.com/dashboard Reply STOP to end`,

  optInConfirmation: () =>
    `HarvestFile: You're subscribed to agricultural alerts. Msg freq varies. Msg&data rates may apply. Reply STOP to cancel. harvestfile.com/terms`,
};

// ── Validate webhook signature (for inbound + status callbacks) ─────────────
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    return twilio.validateRequest(authToken, signature, url, params);
  } catch {
    return false;
  }
}
