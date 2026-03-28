// =============================================================================
// HarvestFile — OAuth Callback Handler
// Build 9 Deploy 1: Stripe Customer Creation at Signup
//
// Flow: Google OAuth → exchange code → create org + professional if new →
//       create Stripe Customer → fire trial email sequence → redirect
//
// WHAT CHANGED (Build 9):
//   - Creates a Stripe Customer immediately at signup (not deferred to checkout)
//   - Stores stripe_customer_id on the organization from day one
//   - This enables: Stripe Customer Portal during trial, early payment method
//     attachment, webhook handler can find org by customer_id immediately
//   - Stripe Customer creation is non-blocking: if it fails, signup still works
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import { getOrCreateCustomer } from '@/lib/stripe';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if professional record already exists
        // CRITICAL: Column is `auth_id` (NOT `auth_user_id`)
        const { data: existingPro } = await supabase
          .from('professionals')
          .select('id, org_id')
          .eq('auth_id', user.id)
          .single();

        if (!existingPro) {
          // ── First login — create org + professional record ──────────
          // Every new org starts with 14-day Pro trial
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
            // Create professional record
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

            // ── BUILD 9: Create Stripe Customer at signup ─────────────
            // This establishes the Stripe relationship from day one.
            // Non-blocking: if Stripe fails, the signup still succeeds
            // with a DB-only trial. Checkout will create customer later.
            try {
              const stripeCustomerId = await getOrCreateCustomer(
                user.email!,
                user.id,
                user.user_metadata?.full_name
              );

              // Store Stripe customer ID on the organization
              await supabase
                .from('organizations')
                .update({
                  stripe_customer_id: stripeCustomerId,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', org.id);
            } catch (stripeErr) {
              // Non-fatal: trial works without Stripe customer
              // Checkout route will create customer when user upgrades
              console.error('[Auth Callback] Stripe customer creation failed:', stripeErr);
            }

            // Log the signup
            await supabase.from('activity_log').insert({
              org_id: org.id,
              actor_id: user.id,
              action: 'user_signup',
              entity_type: 'professional',
              description: `${user.email} created an account — 14-day Pro trial started`,
            });

            // ── Fire trial email sequence via Inngest ────────────────
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
              // Don't block signup if Inngest fails
            }
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
