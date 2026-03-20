// =============================================================================
// HarvestFile — Stripe Configuration
// Phase 18A: Stripe Live Mode — 3-Tier Pricing (Starter, Pro, Team)
//
// PRODUCTS (Live Mode):
//   HarvestFile Starter — prod_UBXj6RqSYOsv43
//     $29/mo  (lookup key: starter_monthly)
//     $278/yr (lookup key: starter_annual)
//
//   HarvestFile Pro — prod_UBXNsh24CktzWa
//     $59/mo  (lookup key: pro_monthly)
//     $566/yr (lookup key: pro_annual)
//
//   HarvestFile Team — prod_UBXNIK92GZk1XP
//     $149/mo  (lookup key: team_monthly)
//     $1,430/yr (lookup key: team_annual)
//
// ENV VARS (set in Vercel for Production):
//   STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
//   STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_MONTHLY_PRICE_ID,
//   STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_PRO_MONTHLY_PRICE_ID,
//   STRIPE_PRO_ANNUAL_PRICE_ID, STRIPE_TEAM_MONTHLY_PRICE_ID,
//   STRIPE_TEAM_ANNUAL_PRICE_ID
// =============================================================================

import Stripe from 'stripe';

// Initialize Stripe — used in API routes only (server-side)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

// ── Stripe Price IDs ────────────────────────────────────────────────────────
// Maps human-readable price types to Stripe price IDs from env vars.
// The checkout route validates against these keys.

export const STRIPE_PRICES: Record<string, string> = {
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
  starter_annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID!,
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID!,
  team_annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID!,
};

// ── Reverse lookup: price ID → tier name ────────────────────────────────────
// Used by the webhook handler to determine which tier to provision.
// Checks Team first (highest), then Pro, defaults to Starter.

export function getTierFromPriceId(priceId: string): 'starter' | 'pro' | 'team' {
  const teamMonthly = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
  const teamAnnual = process.env.STRIPE_TEAM_ANNUAL_PRICE_ID;
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;

  if (priceId === teamMonthly || priceId === teamAnnual) return 'team';
  if (priceId === proMonthly || priceId === proAnnual) return 'pro';
  // Starter prices or any unknown price defaults to starter (safest fallback)
  return 'starter';
}

// ── Tier limits ─────────────────────────────────────────────────────────────
// Used by webhook to set organization.max_farmers and organization.max_users
// when provisioning or upgrading a subscription.

export const TIER_LIMITS: Record<string, { max_farmers: number; max_users: number }> = {
  starter: { max_farmers: 5, max_users: 1 },
  pro: { max_farmers: 50, max_users: 1 },
  team: { max_farmers: 250, max_users: 3 },
  enterprise: { max_farmers: 99999, max_users: 99999 },
};

// ── Helper: Get or create a Stripe customer for a Supabase user ─────────────
export async function getOrCreateCustomer(
  email: string,
  userId: string,
  name?: string
): Promise<string> {
  // Search for existing customer by email
  const existing = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      supabase_user_id: userId,
    },
  });

  return customer.id;
}

// ── Helper: Create a Stripe Customer Portal session ─────────────────────────
// Used in /api/stripe/portal route for self-service billing management
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}
