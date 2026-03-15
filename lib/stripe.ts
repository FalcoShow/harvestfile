// =============================================================================
// HarvestFile — Stripe Configuration
// Build 3: Trial Gating — Updated with Pro + Team products, portal session
// =============================================================================

import Stripe from 'stripe';

// Initialize Stripe — used in API routes only (server-side)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

// ── Stripe Price IDs ────────────────────────────────────────────────────────
// Products created in Stripe Dashboard (sandbox):
//   HarvestFile Pro  — prod_U9NFmebeL2SCCB
//   HarvestFile Team — prod_U9NFrEdxoLXdAG
// Old HarvestFile Pro ($29/mo) archived: prod_U8eGJ75u6N9Ndm

export const STRIPE_PRICES: Record<string, string> = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID!,
  team_annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID!,
};

// ── Reverse lookup: price ID → tier name ────────────────────────────────────
// Used by webhooks to determine which tier a subscription belongs to
export function getTierFromPriceId(priceId: string): 'pro' | 'team' {
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const teamMonthly = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
  const teamAnnual = process.env.STRIPE_TEAM_ANNUAL_PRICE_ID;

  if (priceId === teamMonthly || priceId === teamAnnual) return 'team';
  // Default to 'pro' for pro prices or unknown prices
  return 'pro';
}

// ── Tier limits ─────────────────────────────────────────────────────────────
export const TIER_LIMITS: Record<string, { max_farmers: number; max_users: number }> = {
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
