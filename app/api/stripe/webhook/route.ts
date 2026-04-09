// =============================================================================
// HarvestFile — Stripe Webhook Handler (Hardened + Founding Farmer)
// Phase 4A Build 5: Webhook Cleanup
// Founding Farmer Update: Auto-provision user on no-auth checkout
//
// PRODUCTION-READY HANDLER for subscription lifecycle management.
// Handles 7 Stripe events with idempotency, API-fetch ordering protection,
// and proper Inngest integration for background jobs.
//
// Webhook URL: https://www.harvestfile.com/api/stripe/webhook
// Events:
//   checkout.session.completed      — initial provisioning (anchor event)
//                                     + Founding Farmer no-auth provisioning
//   customer.subscription.created   — backup provisioning (if checkout missed)
//   customer.subscription.updated   — lifecycle changes (plan, status, cancel)
//   customer.subscription.deleted   — full cancellation / access revocation
//   customer.subscription.trial_will_end — 3-day warning, triggers email
//   invoice.paid                    — confirms successful payment
//   invoice.payment_failed          — marks account past_due
//
// Auth chain: auth.users → professionals (auth_id) → organizations (org_id)
//
// FOUNDING FARMER FLOW:
//   1. User pays via /api/stripe/checkout/founding (no auth required)
//   2. Stripe fires checkout.session.completed with metadata.tier='founding'
//   3. provisionFoundingFarmer() creates auth user, org, professional records
//   4. Welcome email sent via Resend with magic link login
// =============================================================================

import { NextResponse } from 'next/server';
import { stripe, getTierFromPriceId, TIER_LIMITS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import { resend, EMAIL_FROM } from '@/lib/resend';
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
// FIXED Phase 23 Build 1: auth_user_id → auth_id (the actual column name)
async function findOrgByUserId(userId: string): Promise<string | null> {
  const { data: professional } = await supabaseAdmin
    .from('professionals')
    .select('org_id')
    .eq('auth_id', userId)
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

  // ── Signature verification ────────────────────────────────────────────────
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

  // ── Idempotency: skip already-processed events ────────────────────────────
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

  // ── Event routing ─────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      // ════════════════════════════════════════════════════════════════════
      // CHECKOUT.SESSION.COMPLETED — Initial provisioning (anchor event)
      // This is the ONLY event with client_reference_id and session metadata.
      // Use it as the primary event for linking Stripe → Supabase org.
      //
      // FOUNDING FARMER PATH: If metadata.tier === 'founding', this is a
      // no-auth checkout — create the user account from scratch.
      // ════════════════════════════════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // ── FOUNDING FARMER: No-auth provisioning path ───────────────────
        // Detected by metadata.tier === 'founding' (set by /api/stripe/checkout/founding)
        // This path runs BEFORE the standard auth check because founding
        // farmers don't have a Supabase user_id at the time of checkout.
        if (session.metadata?.tier === 'founding') {
          await provisionFoundingFarmer(session, event.id);
          break;
        }

        // ── STANDARD PATH: Authenticated user upgrade ────────────────────
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
      //
      // FOUNDING FARMER GUARD: Skip entirely if tier='founding' — let
      // checkout.session.completed be the single provisioning path.
      // ════════════════════════════════════════════════════════════════════
      case 'customer.subscription.created': {
        const rawSubscription = event.data.object;
        const sub = getSubFields(rawSubscription);

        // ── FOUNDING FARMER GUARD ────────────────────────────────────────
        // Prevent race condition with checkout.session.completed.
        if (sub.metadata?.tier === 'founding') {
          console.log(`[Webhook] subscription.created: founding farmer, skipping (handled by checkout.session.completed)`);
          break;
        }

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

// ─────────────────────────────────────────────────────────────────────────────
// FOUNDING FARMER PROVISIONING — No-auth checkout flow
// ─────────────────────────────────────────────────────────────────────────────
// Called when checkout.session.completed fires for a Founding Farmer purchase
// (identified by metadata.tier === 'founding'). Creates Supabase auth user,
// organization, and professional records, then sends a magic link email so
// the user can log in for the first time.
//
// Idempotent: safe to call multiple times for the same email/customer.
// Handles three scenarios:
//   1. Existing org with this stripe_customer_id (most common upgrade path)
//   2. Existing professional by email (manual link case)
//   3. Brand new user (most common new-signup path)
// ─────────────────────────────────────────────────────────────────────────────

async function provisionFoundingFarmer(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const email = session.metadata?.founding_farmer_email?.toLowerCase().trim();
  const billingPeriod = session.metadata?.billing_period || 'monthly';
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : (session.customer as any)?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as any)?.id;

  if (!email) {
    console.error('[FoundingFarmer] No email in session metadata');
    return;
  }

  if (!customerId || !subscriptionId) {
    console.error('[FoundingFarmer] Missing customer or subscription ID');
    return;
  }

  console.log(`[FoundingFarmer] Provisioning ${email} (${billingPeriod})`);

  // Fetch the subscription details from Stripe API for accurate state
  const rawSub = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = getSubFields(rawSub);
  const tier = 'founding' as const;
  const limits = TIER_LIMITS.founding;

  // ── SCENARIO 1: Existing org by stripe_customer_id ───────────────────────
  // Most likely upgrade path — user previously had a Stripe customer
  // (e.g., signed up via OAuth which creates one at signup per Build 9).
  const { data: existingOrgByCustomer } = await supabaseAdmin
    .from('organizations')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (existingOrgByCustomer) {
    console.log(`[FoundingFarmer] Found existing org by customer_id: ${existingOrgByCustomer.id}`);

    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_price_id: sub.priceId || null,
        trial_ends_at: null, // Founding farmers are paying, not trialing
        current_period_end: sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd * 1000).toISOString()
          : null,
        cancel_at_period_end: sub.cancelAtPeriodEnd || false,
        max_farmers: limits.max_farmers,
        max_users: limits.max_users,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingOrgByCustomer.id);

    // Get the auth_id for the subscription_events log
    const { data: pro } = await supabaseAdmin
      .from('professionals')
      .select('auth_id')
      .eq('org_id', existingOrgByCustomer.id)
      .maybeSingle();

    if (pro?.auth_id) {
      await supabaseAdmin.from('subscription_events').insert({
        user_id: pro.auth_id,
        event_type: 'founding_farmer_upgraded',
        stripe_event_id: eventId,
        metadata: {
          organization_id: existingOrgByCustomer.id,
          subscription_id: subscriptionId,
          billing_period: billingPeriod,
          previous_tier: existingOrgByCustomer.subscription_tier,
        },
      });
    }

    // Send welcome/upgrade email
    await sendFoundingFarmerWelcomeEmail(email, billingPeriod, false);

    console.log(`[FoundingFarmer] Upgraded existing org ${existingOrgByCustomer.id} to founding tier`);
    return;
  }

  // ── SCENARIO 2: Existing professional by email (no stripe link yet) ──────
  const { data: existingPro } = await supabaseAdmin
    .from('professionals')
    .select('id, auth_id, org_id')
    .eq('email', email)
    .maybeSingle();

  if (existingPro) {
    console.log(`[FoundingFarmer] Found existing professional by email: ${existingPro.id}`);

    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: sub.priceId || null,
        trial_ends_at: null,
        current_period_end: sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd * 1000).toISOString()
          : null,
        cancel_at_period_end: sub.cancelAtPeriodEnd || false,
        max_farmers: limits.max_farmers,
        max_users: limits.max_users,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPro.org_id);

    await supabaseAdmin.from('subscription_events').insert({
      user_id: existingPro.auth_id,
      event_type: 'founding_farmer_upgraded',
      stripe_event_id: eventId,
      metadata: {
        organization_id: existingPro.org_id,
        subscription_id: subscriptionId,
        billing_period: billingPeriod,
      },
    });

    await sendFoundingFarmerWelcomeEmail(email, billingPeriod, false);

    console.log(`[FoundingFarmer] Linked existing professional ${existingPro.id} to founding subscription`);
    return;
  }

  // ── SCENARIO 3: Brand new user — create everything from scratch ──────────
  console.log(`[FoundingFarmer] Creating new user account for ${email}`);

  // Create the auth user via Supabase admin API
  // email_confirm: true marks the email as verified — no confirmation email sent.
  // The user is verified by virtue of having a paid Stripe subscription.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      source: 'founding_farmer',
      billing_period: billingPeriod,
      stripe_customer_id: customerId,
    },
  });

  if (authError || !authData.user) {
    console.error('[FoundingFarmer] Failed to create auth user:', authError);
    throw new Error(`Failed to create auth user: ${authError?.message || 'unknown'}`);
  }

  const authUserId = authData.user.id;
  console.log(`[FoundingFarmer] Created auth user: ${authUserId}`);

  // Create organization (mirrors OAuth callback pattern)
  const orgName = `${email.split('@')[0]}'s Farm`;
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: orgName,
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: sub.priceId || null,
      trial_ends_at: null,
      current_period_end: sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: false,
      max_farmers: limits.max_farmers,
      max_users: limits.max_users,
    })
    .select('id')
    .single();

  if (orgError || !org) {
    console.error('[FoundingFarmer] Failed to create organization:', orgError);
    throw new Error(`Failed to create org: ${orgError?.message || 'unknown'}`);
  }

  console.log(`[FoundingFarmer] Created organization: ${org.id}`);

  // Create professional record (mirrors OAuth callback pattern)
  // CRITICAL: column is `auth_id` (not `auth_user_id`)
  const { error: proError } = await supabaseAdmin.from('professionals').insert({
    org_id: org.id,
    auth_id: authUserId,
    email,
    full_name: email.split('@')[0], // User can update later in settings
    role: 'admin',
  });

  if (proError) {
    console.error('[FoundingFarmer] Failed to create professional:', proError);
    throw new Error(`Failed to create professional: ${proError.message}`);
  }

  console.log(`[FoundingFarmer] Created professional record for ${email}`);

  // Log the subscription event
  await supabaseAdmin.from('subscription_events').insert({
    user_id: authUserId,
    event_type: 'founding_farmer_created',
    stripe_event_id: eventId,
    metadata: {
      organization_id: org.id,
      subscription_id: subscriptionId,
      billing_period: billingPeriod,
      tier: 'founding',
    },
  });

  // Log to activity_log (matches OAuth callback pattern)
  await supabaseAdmin.from('activity_log').insert({
    org_id: org.id,
    actor_id: authUserId,
    action: 'founding_farmer_signup',
    entity_type: 'professional',
    description: `${email} became a Founding Farmer (${billingPeriod})`,
  });

  // Send welcome email with magic link
  await sendFoundingFarmerWelcomeEmail(email, billingPeriod, true);

  console.log(`[FoundingFarmer] Provisioning complete for ${email}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FOUNDING FARMER WELCOME EMAIL — Magic link login
// ─────────────────────────────────────────────────────────────────────────────
// Sends a branded welcome email with a magic link the user can click to log
// in for the first time. No password required — they're verified by virtue
// of having a paid Stripe subscription.
//
// isNewAccount: true for brand new signups, false for existing users upgrading
// ─────────────────────────────────────────────────────────────────────────────

async function sendFoundingFarmerWelcomeEmail(
  email: string,
  billingPeriod: string,
  isNewAccount: boolean
): Promise<void> {
  try {
    // Generate magic link via Supabase admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'https://www.harvestfile.com/dashboard?welcome=founding',
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[FoundingFarmer] Failed to generate magic link:', linkError);
      return;
    }

    const magicLink = linkData.properties.action_link;
    const priceLabel = billingPeriod === 'annual' ? '$79/year' : '$9/month';

    // Send branded HTML email via Resend (raw HTML, not React Email)
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: EMAIL_FROM.onboarding,
      to: [email],
      subject: isNewAccount
        ? "Welcome to HarvestFile — You're a Founding Farmer"
        : "You're upgraded — Welcome, Founding Farmer",
      html: buildWelcomeEmailHtml(magicLink, priceLabel, isNewAccount),
    });

    if (emailError) {
      console.error('[FoundingFarmer] Failed to send welcome email:', emailError);
    } else {
      console.log(`[FoundingFarmer] Welcome email sent to ${email}: ${emailData?.id}`);
    }
  } catch (err) {
    console.error('[FoundingFarmer] Error in sendFoundingFarmerWelcomeEmail:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME EMAIL HTML TEMPLATE — Brand-aligned, dark theme, gold CTA
// ─────────────────────────────────────────────────────────────────────────────

function buildWelcomeEmailHtml(magicLink: string, priceLabel: string, isNewAccount: boolean): string {
  const heading = isNewAccount ? "You're in." : "You're upgraded.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HarvestFile</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0f0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0f0d;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #0F261C; border-radius: 16px; border: 1px solid rgba(201, 168, 76, 0.10);">
          <tr>
            <td style="padding: 48px 40px 32px 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 56px; height: 56px; background: #1B4332; border-radius: 14px; line-height: 56px; font-size: 24px; font-weight: 800; color: #C9A84C;">HF</div>
              </div>
              <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #F2F0E8; text-align: center; letter-spacing: -0.02em;">
                ${heading}
              </h1>
              <p style="margin: 0 0 8px 0; font-size: 18px; color: #C9A84C; text-align: center; font-weight: 600;">
                Welcome, Founding Farmer.
              </p>
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #A8A48C; text-align: center; line-height: 1.6;">
                Your ${priceLabel} subscription is active and your founding rate is locked in <strong style="color: #F2F0E8;">forever</strong>. Even when prices go up for everyone else, yours never will.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 16px 0 32px 0;">
                    <a href="${magicLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #C9A84C 0%, #E2C366 100%); color: #0a0f0d; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 12px; letter-spacing: -0.01em;">
                      Log in to HarvestFile →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; margin-top: 8px;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #6B6852; text-align: center; line-height: 1.6;">
                  This login link expires in 1 hour. If it expires, you can request a new one from <a href="https://www.harvestfile.com/login" style="color: #C9A84C; text-decoration: none;">harvestfile.com/login</a>.
                </p>
                <p style="margin: 0; font-size: 13px; color: #6B6852; text-align: center;">
                  Need help? Just reply to this email — it goes straight to me.<br>
                  <span style="color: #A8A48C;">Andrew Angerstien, Founder</span>
                </p>
              </div>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #6B6852; text-align: center;">
          HarvestFile LLC · Akron, Ohio · <a href="https://www.harvestfile.com" style="color: #6B6852; text-decoration: none;">harvestfile.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}