// =============================================================================
// HarvestFile — Stripe Webhook Handler (Hardened)
// Phase 4A Build 5: Webhook Cleanup
//
// PRODUCTION-READY HANDLER for subscription lifecycle management.
// Handles 7 Stripe events with idempotency, API-fetch ordering protection,
// and proper Inngest integration for background jobs.
//
// Webhook URL: https://www.harvestfile.com/api/stripe/webhook
// Events:
//   checkout.session.completed      — initial provisioning (anchor event)
//   customer.subscription.created   — backup provisioning (if checkout missed)
//   customer.subscription.updated   — lifecycle changes (plan, status, cancel)
//   customer.subscription.deleted   — full cancellation / access revocation
//   customer.subscription.trial_will_end — 3-day warning, triggers email
//   invoice.paid                    — confirms successful payment
//   invoice.payment_failed          — marks account past_due
//
// Auth chain: auth.users → professionals (auth_user_id) → organizations (org_id)
// =============================================================================

import { NextResponse } from 'next/server';
import { stripe, getTierFromPriceId, TIER_LIMITS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import Stripe from 'stripe';

// ── Runtime declarations ────────────────────────────────────────────────────
// Node.js required for Stripe SDK (crypto.createHmac). force-dynamic prevents
// any static optimization. maxDuration gives breathing room on Vercel.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ── Supabase admin client (bypasses RLS — webhooks have no user JWT) ────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Helper: Extract subscription fields safely ──────────────────────────────
// Stripe 2026-02-25.clover API changes TS types but fields exist at runtime.
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
async function findOrgByUserId(userId: string): Promise<string | null> {
  const { data: professional } = await supabaseAdmin
    .from('professionals')
    .select('org_id')
    .eq('auth_user_id', userId)
    .single();

  return professional?.org_id || null;
}

// ── Helper: Find organization by Stripe customer ID ─────────────────────────
async function findOrgByCustomerId(customerId: string): Promise<string | null> {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  return org?.id || null;
}

// ── Helper: Resolve org ID from multiple sources ────────────────────────────
async function resolveOrgId(
  customerId?: string | null,
  userId?: string | null,
  orgIdFromMetadata?: string | null
): Promise<string | null> {
  // Priority: explicit metadata > customer lookup > user lookup
  if (orgIdFromMetadata) return orgIdFromMetadata;
  if (customerId) {
    const orgId = await findOrgByCustomerId(customerId);
    if (orgId) return orgId;
  }
  if (userId) {
    return await findOrgByUserId(userId);
  }
  return null;
}

// ── Main webhook handler ────────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // ── Signature verification ──────────────────────────────────────────────
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

  // Record event BEFORE processing (idempotency + audit trail)
  await supabaseAdmin.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    data: event as any,
  });

  // ── Event routing ───────────────────────────────────────────────────────
  try {
    switch (event.type) {
      // ════════════════════════════════════════════════════════════════════
      // CHECKOUT.SESSION.COMPLETED — Initial provisioning (anchor event)
      // This is the ONLY event with client_reference_id and session metadata.
      // Use it as the primary event for linking Stripe → Supabase org.
      // ════════════════════════════════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId || !session.subscription) {
          console.log('[Webhook] checkout.session.completed: no userId or subscription, skipping');
          break;
        }

        const orgId = await resolveOrgId(
          session.customer as string,
          userId,
          session.metadata?.organization_id
        );

        if (!orgId) {
          console.error(`[Webhook] No org found for user: ${userId}`);
          break;
        }

        // Fetch full subscription from API for accurate state
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

        // If not trialing (direct purchase without trial), cancel drip emails
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

      // ════════════════════════════════════════════════════════════════════
      // CUSTOMER.SUBSCRIPTION.CREATED — Backup provisioning
      // Also fires when subscription is created via Checkout, but lacks
      // client_reference_id. Only write if checkout.session.completed
      // hasn't already set the subscription ID on the org.
      // ════════════════════════════════════════════════════════════════════
      case 'customer.subscription.created': {
        const rawSubscription = event.data.object;
        const sub = getSubFields(rawSubscription);

        const orgId = await resolveOrgId(
          sub.customer,
          sub.metadata?.supabase_user_id,
          sub.metadata?.org_id
        );

        if (!orgId) {
          console.log(`[Webhook] subscription.created: no org found for customer ${sub.customer}, skipping (checkout.session.completed may handle this)`);
          break;
        }

        // Only write if org doesn't already have this subscription set
        // (checkout.session.completed may have already handled it)
        const { data: existingOrg } = await supabaseAdmin
          .from('organizations')
          .select('stripe_subscription_id')
          .eq('id', orgId)
          .single();

        if (existingOrg?.stripe_subscription_id === sub.id) {
          console.log(`[Webhook] subscription.created: org=${orgId} already has sub ${sub.id}, skipping`);
          break;
        }

        // If org has no subscription yet, this is our backup provisioning path
        if (!existingOrg?.stripe_subscription_id) {
          const tier = sub.priceId ? getTierFromPriceId(sub.priceId) : 'pro';
          const limits = TIER_LIMITS[tier] || TIER_LIMITS.pro;

          await supabaseAdmin
            .from('organizations')
            .update({
              subscription_tier: tier,
              subscription_status: sub.status === 'trialing' ? 'trialing' : 'active',
              stripe_customer_id: sub.customer,
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

          console.log(`[Webhook] subscription.created (backup): org=${orgId}, sub=${sub.id}`);
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // CUSTOMER.SUBSCRIPTION.UPDATED — Lifecycle workhorse
      // Fires on: trial→active, plan change, cancellation schedule, etc.
      // Fetches latest state from Stripe API to protect against out-of-order
      // event delivery.
      // ════════════════════════════════════════════════════════════════════
      case 'customer.subscription.updated': {
        const webhookSub = getSubFields(event.data.object);

        const orgId = await resolveOrgId(
          webhookSub.customer,
          webhookSub.metadata?.supabase_user_id
        );

        if (!orgId) {
          console.error(`[Webhook] No org found for customer: ${webhookSub.customer}`);
          break;
        }

        // Fetch the LATEST subscription state from Stripe API
        // This protects against out-of-order event delivery
        let sub: ReturnType<typeof getSubFields>;
        try {
          const latestSub = await stripe.subscriptions.retrieve(webhookSub.id);
          sub = getSubFields(latestSub);
        } catch (err) {
          // If retrieve fails, fall back to webhook payload
          console.warn(`[Webhook] Failed to fetch latest sub ${webhookSub.id}, using webhook payload`);
          sub = webhookSub;
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

        // If canceled, revoke limits; otherwise use tier-based limits
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

      // ════════════════════════════════════════════════════════════════════
      // CUSTOMER.SUBSCRIPTION.DELETED — Full cancellation
      // Only fires after all payment retries exhausted or immediate cancel.
      // Marks org as expired but preserves stripe_customer_id for re-sub.
      // ════════════════════════════════════════════════════════════════════
      case 'customer.subscription.deleted': {
        const sub = getSubFields(event.data.object);

        const orgId = await resolveOrgId(
          sub.customer,
          sub.metadata?.supabase_user_id
        );

        if (!orgId) {
          console.error(`[Webhook] No org found for customer: ${sub.customer}`);
          break;
        }

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'expired',
            // Keep stripe_customer_id for resubscription
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

      // ════════════════════════════════════════════════════════════════════
      // CUSTOMER.SUBSCRIPTION.TRIAL_WILL_END — 3-day warning
      // Fires 3 days before trial expiration. Triggers Inngest email
      // sequence to nudge user toward upgrading.
      // ════════════════════════════════════════════════════════════════════
      case 'customer.subscription.trial_will_end': {
        const sub = getSubFields(event.data.object);

        const orgId = await resolveOrgId(
          sub.customer,
          sub.metadata?.supabase_user_id
        );

        const userId = sub.metadata?.supabase_user_id;

        if (userId) {
          try {
            await inngest.send({
              name: 'app/trial.ending',
              data: {
                userId,
                organizationId: orgId,
                trialEnd: sub.trialEnd
                  ? new Date(sub.trialEnd * 1000).toISOString()
                  : null,
              },
            });
          } catch (err) {
            console.error('[Inngest] Failed to fire trial.ending:', err);
          }
        }

        console.log(`[Webhook] Trial ending soon: sub=${sub.id}, org=${orgId}`);
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // INVOICE.PAID — Definitive payment confirmation
      // The most reliable signal that money was collected. Updates
      // current_period_end and confirms active status.
      // ════════════════════════════════════════════════════════════════════
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = (typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id) as string;

        const orgId = await findOrgByCustomerId(customerId);
        if (!orgId) {
          // May fire for non-subscription invoices or before checkout completes
          console.log(`[Webhook] invoice.paid: no org for customer ${customerId}, skipping`);
          break;
        }

        // Extract subscription details from the invoice
        // Stripe 2026-02-25.clover removed .subscription from Invoice TS type,
        // but it still exists at runtime. Cast through any.
        const rawSubId = (invoice as any).subscription;
        const subscriptionId = typeof rawSubId === 'string'
          ? rawSubId
          : rawSubId?.id as string | undefined;

        if (subscriptionId) {
          // Fetch latest subscription state to get accurate period_end
          try {
            const latestSub = await stripe.subscriptions.retrieve(subscriptionId);
            const sub = getSubFields(latestSub);

            await supabaseAdmin
              .from('organizations')
              .update({
                subscription_status: 'active',
                current_period_end: sub.currentPeriodEnd
                  ? new Date(sub.currentPeriodEnd * 1000).toISOString()
                  : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', orgId);
          } catch (err) {
            // If sub retrieve fails, still mark as active
            await supabaseAdmin
              .from('organizations')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', orgId);
          }
        }

        console.log(`[Webhook] Invoice paid: org=${orgId}, invoice=${invoice.id}`);
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // INVOICE.PAYMENT_FAILED — Payment declined
      // Mark as past_due but do NOT revoke access. Stripe Smart Retries
      // will attempt ~8 retries over 2 weeks. Only subscription.deleted
      // (after all retries exhausted) should revoke access.
      // ════════════════════════════════════════════════════════════════════
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

        // Only mark as past_due — do NOT revoke access
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        console.log(`[Webhook] Payment failed: org=${orgId}, invoice=${invoice.id}`);
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // DEFAULT — Unhandled event types
      // Return 200 to prevent Stripe from retrying unhandled events.
      // ════════════════════════════════════════════════════════════════════
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    // Return 500 so Stripe retries this event
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
