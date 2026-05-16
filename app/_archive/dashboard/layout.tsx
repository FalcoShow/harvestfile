// =============================================================================
// HarvestFile — (dashboard) Route Group Layout
// Build 9 Deploy 1 HOTFIX: Stripe Customer on ALL signup paths
//
// Auth gate → redirects to /login if no session
// Trial expiration gate → auto-downgrades expired trials in DB (lazy enforcement)
// Subscription gate → redirects to /trial-expired if expired
// Creates org + professional if missing (edge case: email/password signup)
// Wraps children in SubscriptionProvider for client-side access
//
// HOTFIX: The edge-case org creation path (for email/password signups) was
// missing Stripe Customer creation. Google OAuth signups go through
// app/auth/callback/route.ts which has Stripe Customer creation, but
// email/password signups skip that route entirely and land here.
// Now BOTH paths create a Stripe Customer at signup.
// =============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from './_components/Sidebar';
import DashboardHeader from './_components/DashboardHeader';
import { SubscriptionProvider } from './_components/SubscriptionProvider';
import { TrialBanner } from './_components/TrialBanner';

// ── Inline subscription state builder (can't import from 'use client' file) ─
function buildSubscriptionState(org: {
  subscription_status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string | null;
}) {
  const now = new Date();
  const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const isTrialing = org.subscription_status === 'trialing';
  const isActive = org.subscription_status === 'active';
  const isPastDue = org.subscription_status === 'past_due';
  const isExpired =
    org.subscription_status === 'expired' ||
    org.subscription_status === 'canceled' ||
    (isTrialing && trialEnd !== null && trialEnd < now);

  let daysRemaining: number | null = null;
  if (isTrialing && trialEnd) {
    const msRemaining = trialEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  }

  const hasAccess = isActive || (isTrialing && !isExpired) || isPastDue;

  return {
    status: org.subscription_status,
    tier: org.subscription_tier,
    trialEndsAt: org.trial_ends_at,
    currentPeriodEnd: org.current_period_end || null,
    cancelAtPeriodEnd: org.cancel_at_period_end || false,
    stripeCustomerId: org.stripe_customer_id || null,
    isActive,
    isTrialing: isTrialing && !isExpired,
    isPastDue,
    isExpired,
    hasAccess,
    daysRemaining,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // ── Auth check ──────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ── Step 1: Get professional record ─────────────────────────────────────
  // CRITICAL: Column is `auth_id` (NOT `auth_user_id`)
  let professional: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    org_id: string;
  } | null = null;

  const { data: proData, error: proError } = await supabase
    .from('professionals')
    .select('id, full_name, email, role, org_id')
    .eq('auth_id', user.id)
    .single();

  if (proData) {
    professional = proData;
  }

  // ── Edge case: no professional record — create org + professional ───────
  // This path fires for email/password signups (which skip the OAuth callback)
  if (!professional) {
    if (proError?.code === 'PGRST116' || !proData) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const { data: org } = await supabase
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

      if (org) {
        // CRITICAL: Column is `auth_id` (NOT `auth_user_id`)
        await supabase.from('professionals').insert({
          org_id: org.id,
          auth_id: user.id,
          email: user.email!,
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'User',
          role: 'admin',
        });

        // ── HOTFIX: Create Stripe Customer for email/password signups ──
        // Google OAuth signups create the Stripe Customer in the callback
        // route, but email/password signups skip that route entirely and
        // land here. This ensures ALL signup paths create a Stripe Customer.
        // Non-blocking: if Stripe fails, the signup still works and the
        // checkout route will create the customer when the user upgrades.
        try {
          const { getOrCreateCustomer } = await import('@/lib/stripe');
          const stripeCustomerId = await getOrCreateCustomer(
            user.email!,
            user.id,
            user.user_metadata?.full_name
          );

          await supabase
            .from('organizations')
            .update({
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', org.id);
        } catch (stripeErr) {
          // Non-fatal: trial works without Stripe customer
          console.error('[Dashboard Layout] Stripe customer creation failed:', stripeErr);
        }

        redirect('/dashboard');
      }
    }

    console.error(
      '[Dashboard Layout] Could not load professional:',
      proError?.message || 'unknown error'
    );
  }

  // ── Step 2: Get organization data ───────────────────────────────────────
  let orgData: {
    id: string;
    name: string;
    subscription_tier: string;
    subscription_status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    max_farmers: number;
    max_users: number;
  } | null = null;

  if (professional?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select(
        'id, name, subscription_tier, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id, max_farmers, max_users'
      )
      .eq('id', professional.org_id)
      .single();

    orgData = org as typeof orgData;
  }

  // ── BUILD 9: Backfill Stripe Customer for existing orgs without one ────
  // This catches users who signed up before Build 9 or whose Stripe Customer
  // creation failed on their original signup. Runs once per dashboard load
  // until the org has a stripe_customer_id.
  if (orgData && !orgData.stripe_customer_id && user.email) {
    try {
      const { getOrCreateCustomer } = await import('@/lib/stripe');
      const stripeCustomerId = await getOrCreateCustomer(
        user.email,
        user.id,
        user.user_metadata?.full_name
      );

      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgData.id);

      orgData.stripe_customer_id = stripeCustomerId;
    } catch (stripeErr) {
      console.error('[Dashboard Layout] Stripe customer backfill failed:', stripeErr);
    }
  }

  // ── BUILD 9: Server-side lazy trial expiration enforcement ──────────────
  if (orgData) {
    const isStillMarkedTrialing = orgData.subscription_status === 'trialing';
    const trialEnd = orgData.trial_ends_at
      ? new Date(orgData.trial_ends_at)
      : null;
    const trialHasExpired = trialEnd !== null && trialEnd < new Date();

    if (isStillMarkedTrialing && trialHasExpired) {
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'expired',
          subscription_tier: 'free',
          max_farmers: 3,
          max_users: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgData.id);

      orgData.subscription_status = 'expired';
      orgData.subscription_tier = 'free';
      orgData.max_farmers = 3;
      orgData.max_users = 1;

      console.log(
        `[Dashboard Layout] Trial expired for org=${orgData.id}, auto-downgraded to free`
      );
    }
  }

  // ── Build subscription state ────────────────────────────────────────────
  const subscriptionState = buildSubscriptionState({
    subscription_status: orgData?.subscription_status || 'trialing',
    subscription_tier: orgData?.subscription_tier || 'pro',
    trial_ends_at: orgData?.trial_ends_at || null,
    current_period_end: orgData?.current_period_end || null,
    cancel_at_period_end: orgData?.cancel_at_period_end || false,
    stripe_customer_id: orgData?.stripe_customer_id || null,
  });

  // ── Trial expired gate ──────────────────────────────────────────────────
  if (orgData && subscriptionState.isExpired) {
    redirect('/trial-expired');
  }

  return (
    <SubscriptionProvider subscription={subscriptionState}>
      <div data-theme="dark" className="flex min-h-screen bg-[#0a0f0d]">
        <Sidebar
          user={{
            email: professional?.email || user.email || '',
            full_name: professional?.full_name || 'User',
          }}
          org={{
            name: orgData?.name || 'My Organization',
            subscription_tier: orgData?.subscription_tier || 'pro',
            subscription_status: orgData?.subscription_status || 'trialing',
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner />
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SubscriptionProvider>
  );
}
