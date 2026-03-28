// =============================================================================
// HarvestFile — Stripe Checkout Session Creator
// Build 9 Deploy 1: Use Existing Stripe Customer from Organization
//
// Creates a Stripe Checkout Session for the authenticated user.
// Supports: starter_monthly, starter_annual, pro_monthly, pro_annual,
//           team_monthly, team_annual
//
// Auth chain: auth.users → professionals (auth_id) → organizations (org_id)
// CRITICAL: professionals table uses `auth_id` column, NOT `auth_user_id`
//
// WHAT CHANGED (Build 9):
//   - Checks org for existing stripe_customer_id FIRST before creating new one.
//     Since Build 9 creates Stripe Customer at signup, most users will already
//     have one. This prevents duplicate Stripe customers.
//   - On successful checkout redirect, updates subscription_status immediately
//     (webhook is the source of truth, but this gives instant UI feedback)
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getOrCreateCustomer, STRIPE_PRICES } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { priceType = 'pro_monthly' } = await request.json();

    // Validate price type
    const priceId = STRIPE_PRICES[priceType as keyof typeof STRIPE_PRICES];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid price type: ${priceType}` },
        { status: 400 }
      );
    }

    // ── Look up the professional's organization ───────────────────────────
    // Auth chain: auth.users → professionals (auth_id) → organizations
    // CRITICAL: Column is `auth_id`, NOT `auth_user_id`
    const { data: professional } = await supabase
      .from('professionals')
      .select('org_id')
      .eq('auth_id', user.id)
      .single();

    if (!professional?.org_id) {
      return NextResponse.json(
        { error: 'No organization found. Please contact support.' },
        { status: 400 }
      );
    }

    const orgId = professional.org_id;

    // ── BUILD 9: Use existing Stripe customer if available ────────────────
    // Since we now create Stripe Customer at signup, most users will have one.
    // Fall back to getOrCreateCustomer only if org doesn't have one yet.
    const { data: orgData } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    let customerId: string;

    if (orgData?.stripe_customer_id) {
      // Use existing customer — no duplicate creation
      customerId = orgData.stripe_customer_id;
    } else {
      // Fallback: create Stripe customer (covers pre-Build-9 signups)
      customerId = await getOrCreateCustomer(
        user.email!,
        user.id,
        user.user_metadata?.full_name
      );

      // Store Stripe customer ID on the organization
      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId);
    }

    // ── Create Stripe Checkout Session ────────────────────────────────────
    // NO trial_period_days — the user is already in a database-tracked trial
    // (or their trial has expired and they're upgrading to paid).
    // When they subscribe, they're paying immediately.
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
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          organization_id: orgId,
        },
      },
      success_url: `${request.headers.get('origin')}/dashboard?subscription=success`,
      cancel_url: `${request.headers.get('origin')}/pricing?subscription=canceled`,
      metadata: {
        supabase_user_id: user.id,
        organization_id: orgId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
