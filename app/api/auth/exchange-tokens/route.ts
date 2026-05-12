// app/api/auth/exchange-tokens/route.ts
// =============================================================================
// HarvestFile — Fragment Token Exchange Endpoint
//
// Called by the auth/callback HTML when a magic link arrives with tokens in
// the URL fragment. The endpoint:
//   1. Accepts access_token + refresh_token in the POST body
//   2. Uses @supabase/ssr to call supabase.auth.setSession(), which writes
//      the session cookie correctly (the cookie middleware can later read)
//   3. Runs the same provisioning logic as the OAuth callback
//   4. Returns the appropriate redirect target
//
// Critical: this uses createServerClient from @supabase/ssr (NOT the regular
// JS client) because @supabase/ssr is what knows how to write cookies in a
// Next.js Route Handler context.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import { getOrCreateCustomer } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExchangeBody {
  access_token?: string;
  refresh_token?: string;
  welcome?: string;
}

export async function POST(request: NextRequest) {
  let body: ExchangeBody = {};
  try {
    body = (await request.json()) as ExchangeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { access_token, refresh_token, welcome } = body;

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: 'access_token and refresh_token are required' },
      { status: 400 }
    );
  }

  // ── Use @supabase/ssr to set the session cookie ──────────────────────────
  // This is the same library middleware.ts uses to READ the cookie, so
  // setting it here means middleware will see the user as authenticated.
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Setting cookies from a Server Component can throw; this is a
              // Route Handler, so it should work, but catch defensively.
            }
          });
        },
      },
    }
  );

  // Set the session — this writes the session cookie via the cookies adapter
  const { data: setData, error: setError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (setError || !setData.session) {
    console.error('[exchange-tokens] setSession failed:', setError);
    return NextResponse.json(
      { error: 'Session exchange failed: ' + (setError?.message ?? 'no session returned') },
      { status: 401 }
    );
  }

  const user = setData.session.user;
  console.log('[exchange-tokens] Session set for user:', user.id, user.email);

  // ── Provisioning (skipped for Sell Score users; runs for legacy/B2B) ─────
  await provisionUserOnFirstLogin(user);

  // ── Determine redirect target ────────────────────────────────────────────
  const redirect = await determineRedirectTarget(user.id, welcome);

  return NextResponse.json({ ok: true, redirect, userId: user.id });
}

// =============================================================================
// Provisioning logic — uses service-role client to bypass RLS for org creation
// =============================================================================

async function provisionUserOnFirstLogin(user: {
  id: string;
  email?: string;
  user_metadata?: any;
}): Promise<void> {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Sell Score subscribers: have a farms row, no provisioning needed
  const { data: farm } = await admin
    .from('farms')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (farm) return;

  // Legacy/B2B: check if professional exists
  const { data: existingPro } = await admin
    .from('professionals')
    .select('id, org_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existingPro) return;

  // First-time legacy user — create org + professional + Stripe customer
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const { data: org } = await admin
    .from('organizations')
    .insert({
      name: `${user.email?.split('@')[0]}'s Organization`,
      subscription_tier: 'pro',
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
      max_farmers: 50,
      max_users: 1,
    })
    .select('id')
    .single();

  if (!org) return;

  await admin.from('professionals').insert({
    org_id: org.id,
    auth_id: user.id,
    email: user.email!,
    full_name:
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User',
    role: 'admin',
  });

  try {
    const stripeCustomerId = await getOrCreateCustomer(
      user.email!,
      user.id,
      user.user_metadata?.full_name
    );
    await admin
      .from('organizations')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id);
  } catch (stripeErr) {
    console.error('[exchange-tokens] Stripe customer creation failed:', stripeErr);
  }

  await admin.from('activity_log').insert({
    org_id: org.id,
    actor_id: user.id,
    action: 'user_signup',
    entity_type: 'professional',
    description: `${user.email} created an account — 14-day Pro trial started`,
  });

  try {
    await inngest.send({
      name: 'app/user.trial_started',
      data: {
        userId: user.id,
        email: user.email!,
        firstName:
          user.user_metadata?.full_name?.split(' ')[0] ||
          user.email?.split('@')[0] ||
          'there',
      },
    });
  } catch (err) {
    console.error('[Inngest] Failed to fire trial_started:', err);
  }
}

// =============================================================================
// Redirect target — Sell Score farms route to /onboard or /sellscore/me
// =============================================================================

async function determineRedirectTarget(
  userId: string,
  welcome?: string
): Promise<string> {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: farm } = await admin
    .from('farms')
    .select('id, sellscore_setup_complete')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (farm) {
    const base = farm.sellscore_setup_complete ? '/sellscore/me' : '/onboard';
    return welcome ? `${base}?welcome=${welcome}` : base;
  }

  return welcome ? `/dashboard?welcome=${welcome}` : '/dashboard';
}
