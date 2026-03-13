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

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      user.email!,
      user.id,
      user.user_metadata?.full_name
    );

    // Update Supabase profile with Stripe customer ID
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    // Create checkout session
    const priceId = STRIPE_PRICES[priceType as keyof typeof STRIPE_PRICES];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      );
    }

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
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
        },
      },
      success_url: `${request.headers.get('origin')}/dashboard?subscription=success`,
      cancel_url: `${request.headers.get('origin')}/pricing?subscription=canceled`,
      metadata: {
        supabase_user_id: user.id,
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
