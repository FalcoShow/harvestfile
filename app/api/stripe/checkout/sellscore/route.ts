// app/api/stripe/checkout/sellscore/route.ts
// =============================================================================
// HarvestFile Sell Score — Stripe Checkout Session creator
//
// Creates a subscription-mode Stripe Checkout Session for the Sell Score
// $149/yr product. Returns the hosted-checkout URL the client redirects to.
// Customer email is collected by Stripe; on payment success the user is
// redirected to /onboard?session_id={CHECKOUT_SESSION_ID} where the
// onboarding flow verifies the session and provisions the user.
//
// The Stripe webhook at /api/stripe/webhook is the source of truth for
// subscription billing state. This endpoint only creates the session.
//
// Uses the project's shared `stripe` client from @/lib/stripe so the
// 2026-02-25.clover API version stays consistent across the codebase.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateCheckoutBody {
  email?: string;
  /** Optional referral or attribution code (e.g. 'dussel', 'fb_group_oh') */
  ref?: string;
}

function getBaseUrl(): string {
  // Match the env var convention used elsewhere in the codebase.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return 'https://www.harvestfile.com';
}

export async function POST(request: NextRequest) {
  const priceId = process.env.STRIPE_PRICE_SELLSCORE_ANNUAL;
  if (!priceId) {
    return NextResponse.json(
      { error: 'STRIPE_PRICE_SELLSCORE_ANNUAL env var not set' },
      { status: 500 }
    );
  }

  let body: CreateCheckoutBody = {};
  try {
    body = (await request.json()) as CreateCheckoutBody;
  } catch {
    // Empty body is fine — email gets collected at Stripe checkout
  }

  const baseUrl = getBaseUrl();

  // Metadata is the bridge between the checkout session and the webhook
  // handler — it's how /onboard and the webhook know this is a Sell Score
  // subscription (vs. a legacy Pro/Team or Founding Farmer purchase).
  const metadata: Record<string, string> = {
    product: 'sellscore_annual',
    product_version: 'v1',
  };
  if (body.ref) metadata.ref = body.ref.slice(0, 64);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Prefill email if the caller provided one; otherwise Stripe collects it.
      customer_email:
        body.email && body.email.includes('@') ? body.email : undefined,
      success_url: `${baseUrl}/onboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?cancelled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata,
      subscription_data: {
        // Mirror metadata onto the subscription so future events
        // (invoice.paid, customer.subscription.updated, etc.) can identify
        // Sell Score subs without joining back to the original session.
        metadata,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Checkout session created without a redirect URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[stripe/checkout/sellscore] error:', message);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
