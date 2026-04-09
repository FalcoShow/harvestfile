// =============================================================================
// HarvestFile — No-Auth Founding Farmer Checkout
// Route: POST /api/stripe/checkout/founding
//
// Creates a Stripe Checkout Session for a Founding Farmer signup WITHOUT
// requiring an existing Supabase auth user. The webhook handler will
// auto-create the user account on checkout.session.completed.
//
// Flow:
//   1. User enters email on /founding-farmer page
//   2. Email is captured in founding_farmers table (existing flow)
//   3. User clicks "Lock in $9/mo forever"
//   4. This route is called with { email, billing_period }
//   5. We create a Stripe Customer (or reuse existing one by email)
//   6. We create a Checkout Session with tier='founding' metadata
//   7. User completes payment in Stripe
//   8. Webhook fires checkout.session.completed
//   9. Webhook detects tier === 'founding', creates Supabase auth user,
//      org, and professional records, then provisions the subscription
//   10. User is redirected to /founding-farmer/success
//   11. Magic link email allows them to log in
//
// IMPORTANT: This route does NOT use Supabase auth — it's the entry point
// for users who don't have accounts yet. Authentication happens AFTER
// successful payment via the webhook + magic link flow.
//
// SECURITY: Rate limiting is handled at the founding-farmer email capture
// step BEFORE this route is called. By the time a user reaches this route,
// they've already passed the IP-based rate limit in /api/founding-farmer.
// =============================================================================

import { NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, billing_period = 'monthly' } = body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (billing_period !== 'monthly' && billing_period !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid billing period. Must be "monthly" or "annual".' },
        { status: 400 }
      );
    }

    // ── Resolve price ID from STRIPE_PRICES map ─────────────────────────
    const priceKey = billing_period === 'monthly' ? 'founding_monthly' : 'founding_annual';
    const priceId = STRIPE_PRICES[priceKey];

    if (!priceId) {
      console.error(`[FoundingCheckout] Missing price ID for ${priceKey}`);
      return NextResponse.json(
        { error: 'Pricing configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // ── Find or create Stripe customer by email ─────────────────────────
    // We search by email so that if the user has previously interacted with
    // Stripe (e.g., a prior failed checkout, or a previous account), we
    // reuse that customer instead of creating a duplicate.
    let customerId: string;

    const existingCustomers = await stripe.customers.list({
      email: trimmedEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log(`[FoundingCheckout] Reusing existing Stripe customer: ${customerId}`);
    } else {
      const newCustomer = await stripe.customers.create({
        email: trimmedEmail,
        metadata: {
          tier: 'founding',
          source: 'founding_farmer_landing',
          signup_date: new Date().toISOString(),
        },
      });
      customerId = newCustomer.id;
      console.log(`[FoundingCheckout] Created new Stripe customer: ${customerId}`);
    }

    // ── Get origin for redirect URLs ────────────────────────────────────
    const origin = request.headers.get('origin') || 'https://www.harvestfile.com';

    // ── Create Stripe Checkout Session ──────────────────────────────────
    // CRITICAL METADATA: tier='founding' is the flag that the webhook
    // handler will read to trigger the no-auth provisioning path. Without
    // this, the existing webhook will skip the event because there's no
    // supabase_user_id attached.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tier: 'founding',
        billing_period,
        founding_farmer_email: trimmedEmail,
      },
      subscription_data: {
        metadata: {
          tier: 'founding',
          billing_period,
          founding_farmer_email: trimmedEmail,
        },
      },
      // Allow promo codes for future marketing campaigns (e.g., influencer codes)
      allow_promotion_codes: true,
      // Collect billing address — useful for future tax handling and US/intl segmentation
      billing_address_collection: 'auto',
      success_url: `${origin}/founding-farmer/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/founding-farmer?checkout=canceled`,
    });

    if (!session.url) {
      console.error('[FoundingCheckout] Stripe returned session without URL');
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    console.log(`[FoundingCheckout] Created session ${session.id} for ${trimmedEmail} (${billing_period})`);

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error('[FoundingCheckout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}