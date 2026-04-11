// =============================================================================
// HarvestFile — No-Auth Founding Farmer Checkout (v2 — idempotent)
// Route: POST /api/stripe/checkout/founding
//
// v2 CHANGE: Before creating any Stripe customer or checkout session, we
// check if the email already has an active founding subscription. If so,
// we skip Stripe entirely, send a fresh magic link, and return a redirect
// to /login. This prevents returning users from being re-charged.
// =============================================================================

import { NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { resend, EMAIL_FROM } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, billing_period = 'monthly' } = body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }
    if (billing_period !== 'monthly' && billing_period !== 'annual') {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    // ── IDEMPOTENCY CHECK: Already a Founding Farmer? ───────────────────
    // Look up the professional by email, then check if their org has an
    // active founding subscription. If yes, skip checkout entirely and
    // send a fresh magic link to log them in.
    const { data: existingPro } = await supabaseAdmin
      .from('professionals')
      .select('id, auth_id, org_id, organizations(subscription_tier, subscription_status)')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    const existingOrg = existingPro?.organizations as any;
    const PAID_TIERS = ['founding', 'starter', 'pro', 'team', 'enterprise'];
    const hasExistingAccount =
      existingPro && existingOrg && PAID_TIERS.includes(existingOrg?.subscription_tier);

    if (hasExistingAccount) {
      const tier = existingOrg.subscription_tier;
      const status = existingOrg.subscription_status;
      console.log(`[FoundingCheckout] ${trimmedEmail} already has account (tier=${tier}, status=${status}) — sending magic link instead of charging`);

      // Generate a fresh magic link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: trimmedEmail,
        options: { redirectTo: 'https://www.harvestfile.com/auth/callback?next=/dashboard&welcome=returning' },
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error('[FoundingCheckout] Failed to generate magic link:', linkError);
        // Fall through to normal login redirect — user can click "Forgot password" to get a new link
        return NextResponse.json({
          already_member: true,
          redirect: '/login?welcome=returning&email=' + encodeURIComponent(trimmedEmail),
          message: "You're already a Founding Farmer. Check your email for a login link, or sign in below.",
        });
      }

      const magicLink = linkData.properties.action_link;

      // Send a "welcome back" branded email with the magic link
      try {
        await resend.emails.send({
          from: EMAIL_FROM.onboarding,
          to: [trimmedEmail],
          subject: "Welcome back to HarvestFile — your login link",
          html: buildReturningMemberEmailHtml(magicLink),
        });
      } catch (emailErr) {
        console.error('[FoundingCheckout] Failed to send returning-member email:', emailErr);
      }

      return NextResponse.json({
        already_member: true,
        redirect: '/login?welcome=returning&email=' + encodeURIComponent(trimmedEmail),
        message: "You're already a Founding Farmer — we just sent you a login link.",
      });
    }

    // ── NEW CUSTOMER FLOW: Create Stripe checkout session ───────────────
    const priceKey = billing_period === 'monthly' ? 'founding_monthly' : 'founding_annual';
    const priceId = STRIPE_PRICES[priceKey];

    if (!priceId) {
      console.error(`[FoundingCheckout] Missing price ID for ${priceKey}`);
      return NextResponse.json({ error: 'Pricing configuration error' }, { status: 500 });
    }

    // Find or create Stripe customer by email (reuse if prior interaction exists)
    let customerId: string;
    const existingCustomers = await stripe.customers.list({ email: trimmedEmail, limit: 1 });

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

    const origin = request.headers.get('origin') || 'https://www.harvestfile.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
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
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${origin}/founding-farmer/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/founding-farmer?checkout=canceled`,
    });

    if (!session.url) {
      console.error('[FoundingCheckout] Stripe returned session without URL');
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    console.log(`[FoundingCheckout] Created session ${session.id} for ${trimmedEmail} (${billing_period})`);

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (error: any) {
    console.error('[FoundingCheckout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETURNING-MEMBER WELCOME-BACK EMAIL — Branded HarvestFile template
// ─────────────────────────────────────────────────────────────────────────────
function buildReturningMemberEmailHtml(magicLink: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome back to HarvestFile</title></head>
<body style="margin:0;padding:0;background-color:#0a0f0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0a0f0d;"><tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#0F261C;border-radius:16px;border:1px solid rgba(201,168,76,0.10);"><tr><td style="padding:48px 40px 32px 40px;">
      <div style="text-align:center;margin-bottom:32px;"><div style="display:inline-block;width:56px;height:56px;background:#1B4332;border-radius:14px;line-height:56px;font-size:24px;font-weight:800;color:#C9A84C;">HF</div></div>
      <h1 style="margin:0 0 16px 0;font-size:32px;font-weight:800;color:#F2F0E8;text-align:center;letter-spacing:-0.02em;">Welcome back.</h1>
      <p style="margin:0 0 8px 0;font-size:18px;color:#C9A84C;text-align:center;font-weight:600;">You're already a Founding Farmer.</p>
      <p style="margin:0 0 32px 0;font-size:16px;color:#A8A48C;text-align:center;line-height:1.6;">No need to sign up again — your lifetime founding rate is still locked in <strong style="color:#F2F0E8;">forever</strong>. Just click below to log back in.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="padding:16px 0 32px 0;">
        <a href="${magicLink}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C9A84C 0%,#E2C366 100%);color:#0a0f0d;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;letter-spacing:-0.01em;">Log in to HarvestFile →</a>
      </td></tr></table>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;margin-top:8px;">
        <p style="margin:0 0 12px 0;font-size:14px;color:#6B6852;text-align:center;line-height:1.6;">This login link expires in 1 hour. If it expires, request a new one from <a href="https://www.harvestfile.com/login" style="color:#C9A84C;text-decoration:none;">harvestfile.com/login</a>.</p>
        <p style="margin:0;font-size:13px;color:#6B6852;text-align:center;">Need help? Just reply to this email — it goes straight to me.<br><span style="color:#A8A48C;">Andrew Angerstien, Founder</span></p>
      </div>
    </td></tr></table>
    <p style="margin:24px 0 0 0;font-size:12px;color:#6B6852;text-align:center;">HarvestFile LLC · Akron, Ohio · <a href="https://www.harvestfile.com" style="color:#6B6852;text-decoration:none;">harvestfile.com</a></p>
  </td></tr></table></body></html>`;
}