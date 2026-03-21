// =============================================================================
// HarvestFile — SMS Subscription API
// Phase 19: Manage SMS alert subscriptions from dashboard
//
// GET    /api/sms/subscribe — Get current user's SMS subscription
// POST   /api/sms/subscribe — Create or update SMS subscription
// DELETE /api/sms/subscribe — Opt out / deactivate SMS subscription
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { formatPhoneE164, sendSMS, SMS_TEMPLATES } from '@/lib/twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Helper: Get authenticated user ──────────────────────────────────────────
async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Get org_id from professionals table
  const { data: professional } = await supabaseAdmin
    .from('professionals')
    .select('org_id')
    .eq('auth_id', user.id)
    .single();

  return {
    userId: user.id,
    email: user.email || '',
    orgId: professional?.org_id || null,
  };
}

// ── GET: Fetch current subscription ──────────────────────────────────────────
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('sms_subscriptions')
    .select('*')
    .eq('user_id', user.userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscription: data || null });
}

// ── POST: Create or update subscription ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    phone,
    timezone = 'America/Chicago',
    alert_types = ['price_threshold', 'mya_update', 'enrollment_deadline'],
    commodity_preferences = ['CORN', 'SOYBEANS', 'WHEAT'],
    price_thresholds = [],
  } = body;

  // Validate phone number
  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  const formattedPhone = formatPhoneE164(phone);
  if (!formattedPhone) {
    return NextResponse.json({ error: 'Invalid US phone number' }, { status: 400 });
  }

  // Check if subscription already exists
  const { data: existing } = await supabaseAdmin
    .from('sms_subscriptions')
    .select('id')
    .eq('user_id', user.userId)
    .single();

  if (existing) {
    // Update existing subscription
    const { data, error } = await supabaseAdmin
      .from('sms_subscriptions')
      .update({
        phone: formattedPhone,
        timezone,
        alert_types,
        commodity_preferences,
        price_thresholds,
        is_active: true,
        opt_out_at: null,
        opt_out_method: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscription: data, updated: true });
  }

  // Create new subscription
  const { data, error } = await supabaseAdmin
    .from('sms_subscriptions')
    .insert({
      user_id: user.userId,
      org_id: user.orgId,
      phone: formattedPhone,
      timezone,
      alert_types,
      commodity_preferences,
      price_thresholds,
      is_active: true,
      opt_in_at: new Date().toISOString(),
      consent_text: 'Opted in via HarvestFile dashboard SMS preferences',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send opt-in confirmation SMS
  try {
    await sendSMS({
      to: formattedPhone,
      body: SMS_TEMPLATES.optInConfirmation(),
      alertType: 'fsa_announcement',
    });
  } catch (err) {
    console.error('[SMS Subscribe] Failed to send confirmation:', err);
    // Don't fail the subscription if confirmation SMS fails
  }

  return NextResponse.json({ subscription: data, created: true });
}

// ── DELETE: Opt out ──────────────────────────────────────────────────────────
export async function DELETE() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('sms_subscriptions')
    .update({
      is_active: false,
      opt_out_at: new Date().toISOString(),
      opt_out_method: 'dashboard',
    })
    .eq('user_id', user.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'SMS alerts deactivated' });
}
