// app/api/auth/post-login/route.ts
// =============================================================================
// HarvestFile — Post-login provisioning endpoint
//
// Called by the client-side fragment-flow handler after it has set the session.
// Runs the same provisioning logic as the server-side auth/callback route
// (first-login org + professional creation, Stripe customer creation), then
// returns the appropriate redirect target.
//
// Auth: relies on the session cookie set by the client's setSession() call,
// OR on an explicit Bearer token in the Authorization header.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import { getOrCreateCustomer } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PostLoginBody {
  welcome?: string;
}

export async function POST(request: NextRequest) {
  let body: PostLoginBody = {};
  try {
    body = (await request.json()) as PostLoginBody;
  } catch {
    // Empty body is fine
  }

  // Try cookie-based session first
  let supabase = await createClient();
  let { data: { user } } = await supabase.auth.getUser();

  // Fallback: bearer token in Authorization header (sent by fragment-flow client)
  if (!user) {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (bearerToken) {
      const tokenClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        }
      );
      const { data: { user: bearerUser } } = await tokenClient.auth.getUser();
      if (bearerUser) {
        user = bearerUser;
        supabase = tokenClient;
      }
    }
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated', redirect: '/login' },
      { status: 401 }
    );
  }

  // ── Provisioning (idempotent) ─────────────────────────────────────────────
  await provisionUserOnFirstLogin(user);

  // ── Determine redirect target ─────────────────────────────────────────────
  const redirect = await determineRedirectTarget(user.id, body.welcome);

  return NextResponse.json({ ok: true, redirect, userId: user.id });
}

// =============================================================================
// Provisioning logic — runs with service role so it can write across
// organizations + professionals tables even if RLS would block the user.
// =============================================================================

async function provisionUserOnFirstLogin(user: { id: string; email?: string; user_metadata?: any }): Promise<void> {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Skip provisioning if this is a Sell Score subscriber — they have a farms
  // record, not a professionals record, and we don't want to duplicate-create.
  const { data: farm } = await admin
    .from('farms')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (farm) {
    // Sell Score user — no org/professional needed
    return;
  }

  // Check if professional record already exists
  const { data: existingPro } = await admin
    .from('professionals')
    .select('id, org_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existingPro) return;

  // First login as a legacy/B2B user — create org + professional + Stripe customer
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
    console.error('[post-login] Stripe customer creation failed:', stripeErr);
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
// Redirect target logic — Sell Score farmers go to /onboard or /sellscore/me,
// everyone else goes to /dashboard
// =============================================================================

async function determineRedirectTarget(userId: string, welcome?: string): Promise<string> {
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
