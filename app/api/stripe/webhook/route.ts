// =============================================================================
// HarvestFile — Stripe Webhook Handler (Consolidated)
// Build 3: Trial Gating
//
// CRITICAL CHANGES FROM PREVIOUS VERSION:
// 1. Writes to `organizations` table (NOT `user_profiles`)
// 2. Idempotency via `stripe_webhook_events` table
// 3. Looks up org via professionals → org_id chain
// 4. Maps price IDs to tiers using getTierFromPriceId()
// 5. Handles Pro + Team subscriptions
//
// Webhook URL: https://www.harvestfile.com/api/stripe/webhook
// Events: checkout.session.completed, customer.subscription.updated,
//         customer.subscription.deleted, invoice.payment_failed,
//         customer.subscription.trial_will_end
// =============================================================================

import { NextResponse } from 'next/server';
import { stripe, getTierFromPriceId, TIER_LIMITS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import Stripe from 'stripe';

// Use service role to bypass RLS — webhooks have no user JWT
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Helper: Extract subscription fields safely ──────────────────────────────
// The Stripe 2026-02-25.clover API version changes TypeScript types,
// but these fields still exist at runtime. Cast to access them.
function getSubFields(sub: any) {
  return {
    id: sub.id as string,
    status: sub.status as string,
    customer: (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) as string,
    trialEnd: sub.trial_end as number | null,
    currentPeriodEnd: sub.current_period_end as number | null,
    cancelAtPeriodEnd: sub.cancel_at_period_end as boolean,
    priceId: sub.items?.data?.[0]?.price?.id as string | undefined,
    metadata: sub.metadata as Record<string, string>,
  };
}

// ── Helper: Find organization by Supabase user ID ───────────────────────────
// Auth chain: auth.users → professionals (auth_user_id) → organizations (org_id)
async function findOrgByUserId(userId: string) {
  const { data: professional } = await supabaseAdmin
    .from('professionals')
    .select('org_id')
    .eq('auth_user_id', userId)
    .single();

  if (!professional?.org_id) return null;

  return professional.org_id as string;
}

// ── Helper: Find organization by Stripe customer ID ─────────────────────────
async function findOrgByCustomerId(customerId: string) {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  return org?.id as string | null;
}

// ── Main webhook handler ────────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ── Idempotency: skip already-processed events ──────────────────────────
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .single();

  if (existingEvent) {
    console.log(`[Webhook] Skipping duplicate event: ${event.id}`);
    return NextResponse.json({ received: true, skipped: true });
  }

  // Log the event before processing (for debugging + idempotency)
  await supabaseAdmin.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    data: event as any,
  });

  try {
    switch (event.type) {
      // ── Checkout completed — user just subscribed ───────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId || !session.subscription) break;

        // Find the organization through the auth chain
        const orgId = session.metadata?.organization_id || await findOrgByUserId(userId);
        if (!orgId) {
          console.error(`[Webhook] No org found for user: ${userId}`);
          break;
        }

        // Retrieve the full subscription to get price/status details
        const rawSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const sub = getSubFields(rawSubscription);

        const tier = sub.priceId ? getTierFromPriceId(sub.priceId) : 'pro';
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.pro;

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_tier: tier,
            subscription_status: sub.status === 'trialing' ? 'trialing' : 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.priceId || null,
            trial_ends_at: sub.trialEnd
              ? new Date(sub.trialEnd * 1000).toISOString()
              : null,
            current_period_end: sub.currentPeriodEnd
              ? new Date(sub.currentPeriodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancelAtPeriodEnd || false,
            max_farmers: limits.max_farmers,
            max_users: limits.max_users,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        // Log the subscription event
        await supabaseAdmin.from('subscription_events').insert({
          user_id: userId,
          event_type: 'subscription_created',
          stripe_event_id: event.id,
          metadata: {
            organization_id: orgId,
            subscription_id: sub.id,
            status: sub.status,
            tier,
            price_id: sub.priceId,
          },
        });

        // If not trialing (direct purchase), cancel drip emails
        if (sub.status === 'active') {
          try {
            await inngest.send({
              name: 'app/user.converted',
              data: { userId },
            });
          } catch (err) {
            console.error('[Inngest] Failed to fire user.converted:', err);
          }
        }

        console.log(`[Webhook] Checkout completed: org=${orgId}, tier=${tier}, status=${sub.status}`);
        break;
      }

      // ── Subscription updated (upgrade, downgrade, trial end) ────────
      case 'customer.subscription.updated': {
        const rawSubscription = event.data.object;
        const sub = getSubFields(rawSubscription);

        // Find org by Stripe customer ID (most reliable for non-checkout events)
        let orgId = await findOrgByCustomerId(sub.customer);

        // Fallback: try via user ID in metadata
        if (!orgId && sub.metadata?.supabase_user_id) {
          orgId = await findOrgByUserId(sub.metadata.supabase_user_id);
        }

        if (!orgId) {
          console.error(`[Webhook] No org found for customer: ${sub.customer}`);
          break;
        }

        const tier = sub.priceId ? getTierFromPriceId(sub.priceId) : 'pro';
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.pro;

        const statusMap: Record<string, string> = {
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          incomplete: 'incomplete',
          unpaid: 'unpaid',
          paused: 'paused',
        };

        const newStatus = statusMap[sub.status] || sub.status;

        // If canceled, downgrade tier; otherwise use price-based tier
        const newTier = sub.status === 'canceled' ? 'pro' : tier;
        const newLimits = sub.status === 'canceled'
          ? { max_farmers: 0, max_users: 1 }
          : limits;

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: newStatus,
            subscription_tier: newTier,
            stripe_price_id: sub.priceId || null,
            current_period_end: sub.currentPeriodEnd
              ? new Date(sub.currentPeriodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancelAtPeriodEnd || false,
            max_farmers: newLimits.max_farmers,
            max_users: newLimits.max_users,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        // Log subscription event
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            event_type: `subscription_${sub.status}`,
            stripe_event_id: event.id,
            metadata: {
              organization_id: orgId,
              subscription_id: sub.id,
              status: sub.status,
              tier: newTier,
              cancel_at_period_end: sub.cancelAtPeriodEnd,
            },
          });

          // Trial → Active = user converted, cancel drip emails
          const previousStatus = (event.data as any).previous_attributes?.status;
          if (previousStatus === 'trialing' && sub.status === 'active') {
            try {
              await inngest.send({
                name: 'app/user.converted',
                data: { userId },
              });
            } catch (err) {
              console.error('[Inngest] Failed to fire user.converted:', err);
            }
          }
        }

        console.log(`[Webhook] Subscription updated: org=${orgId}, status=${newStatus}, tier=${newTier}`);
        break;
      }

      // ── Subscription deleted (fully canceled) ───────────────────────
      case 'customer.subscription.deleted': {
        const rawSubscription = event.data.object;
        const sub = getSubFields(rawSubscription);

        let orgId = await findOrgByCustomerId(sub.customer);
        if (!orgId && sub.metadata?.supabase_user_id) {
          orgId = await findOrgByUserId(sub.metadata.supabase_user_id);
        }

        if (!orgId) {
          console.error(`[Webhook] No org found for customer: ${sub.customer}`);
          break;
        }

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'expired',
            stripe_subscription_id: null,
            stripe_price_id: null,
            trial_ends_at: null,
            current_period_end: null,
            cancel_at_period_end: false,
            max_farmers: 0,
            max_users: 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            event_type: 'subscription_deleted',
            stripe_event_id: event.id,
            metadata: {
              organization_id: orgId,
              subscription_id: sub.id,
            },
          });
        }

        console.log(`[Webhook] Subscription deleted: org=${orgId}`);
        break;
      }

      // ── Invoice payment failed ──────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = (typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id) as string;

        const orgId = await findOrgByCustomerId(customerId);
        if (!orgId) {
          console.error(`[Webhook] No org found for customer: ${customerId}`);
          break;
        }

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        console.log(`[Webhook] Payment failed: org=${orgId}`);
        break;
      }

      // ── Trial will end (3 days before) ──────────────────────────────
      case 'customer.subscription.trial_will_end': {
        console.log(`[Webhook] Trial ending soon for subscription: ${(event.data.object as any).id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
