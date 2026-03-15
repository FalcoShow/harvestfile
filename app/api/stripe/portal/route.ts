// =============================================================================
// HarvestFile — Stripe Customer Portal Session
// Build 3: Trial Gating
//
// Creates a Stripe Customer Portal session so users can:
// - Update payment method
// - Switch between monthly/annual billing
// - Upgrade from Pro to Team
// - Cancel subscription
// - View invoice history
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPortalSession } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Look up the organization's Stripe customer ID
    const { data: professional } = await supabase
      .from('professionals')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!professional?.org_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', professional.org_id)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 }
      );
    }

    const returnUrl = `${request.headers.get('origin')}/dashboard/settings`;
    const portalUrl = await createPortalSession(org.stripe_customer_id, returnUrl);

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
