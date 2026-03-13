import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role key for webhook — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Checkout completed — user just subscribed ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: 'pro',
              subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          // Log subscription event
          await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            event_type: 'subscription_created',
            stripe_event_id: event.id,
            metadata: {
              subscription_id: subscription.id,
              status: subscription.status,
              trial_end: subscription.trial_end,
            },
          });
        }
        break;
      }

      // ── Subscription updated (upgrade, downgrade, trial end) ──
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const statusMap: Record<string, string> = {
            active: 'active',
            trialing: 'trialing',
            past_due: 'past_due',
            canceled: 'canceled',
            incomplete: 'incomplete',
          };

          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: statusMap[subscription.status] || subscription.status,
              subscription_tier:
                subscription.status === 'canceled' ? 'free' : 'pro',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            event_type: `subscription_${subscription.status}`,
            stripe_event_id: event.id,
            metadata: {
              subscription_id: subscription.id,
              status: subscription.status,
              cancel_at: subscription.cancel_at,
            },
          });
        }
        break;
      }

      // ── Subscription deleted (fully canceled) ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
              trial_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            event_type: 'subscription_deleted',
            stripe_event_id: event.id,
            metadata: { subscription_id: subscription.id },
          });
        }
        break;
      }

      // ── Invoice payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Look up user by Stripe customer ID
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

          await supabaseAdmin.from('subscription_events').insert({
            user_id: profile.id,
            event_type: 'payment_failed',
            stripe_event_id: event.id,
            metadata: {
              invoice_id: invoice.id,
              amount_due: invoice.amount_due,
            },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
