// =============================================================================
// HarvestFile — Stripe Configuration
// Updated: Pricing Restructure — Added Founding Farmer tier ($9/mo, $79/yr)
//
// PRODUCTS (Live Mode):
//   Founding Farmer — prod_UHr1pInuSTYBn1
//     $9/mo   (price_1TJHIzPQui3axCMcd4ni0WJh)
//     $79/yr  (price_1TJHJNPQui3axCMcH6jvbeGK)
//
//   HarvestFile Starter — prod_UBXj6RqSYOsv43 (legacy, keep for existing subs)
//     $29/mo  (lookup key: starter_monthly)
//     $278/yr (lookup key: starter_annual)
//
//   HarvestFile Pro — prod_UBXNsh24CktzWa (legacy, keep for existing subs)
//     $59/mo  (lookup key: pro_monthly)
//     $566/yr (lookup key: pro_annual)
//
//   HarvestFile Team — prod_UBXNIK92GZk1XP (legacy, keep for existing subs)
//     $149/mo  (lookup key: team_monthly)
//     $1,430/yr (lookup key: team_annual)
//
// ENV VARS (set in Vercel for Production):
//   STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
//   STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_MONTHLY_PRICE_ID,
//   STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_PRO_MONTHLY_PRICE_ID,
//   STRIPE_PRO_ANNUAL_PRICE_ID, STRIPE_TEAM_MONTHLY_PRICE_ID,
//   STRIPE_TEAM_ANNUAL_PRICE_ID
//
// WHAT CHANGED (Pricing Restructure):
//   - Added founding_monthly and founding_annual to STRIPE_PRICES
//   - Founding Farmer prices are hardcoded (not env vars) since they're
//     a single permanent product — no need for env var indirection
//   - Updated getTierFromPriceId to recognize founding farmer prices
//   - Added 'founding' tier to TIER_LIMITS (same limits as Pro)
// =============================================================================

import Stripe from 'stripe';

// Initialize Stripe — used in API routes only (server-side)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

// ── Founding Farmer Price IDs (hardcoded — single permanent product) ────────
const FOUNDING_MONTHLY_PRICE_ID = 'price_1TJHIzPQui3axCMcd4ni0WJh';
const FOUNDING_ANNUAL_PRICE_ID = 'price_1TJHJNPQui3axCMcH6jvbeGK';

// ── Stripe Price IDs ────────────────────────────────────────────────────────
// Maps human-readable price types to Stripe price IDs.
// The checkout route validates against these keys.

export const STRIPE_PRICES: Record<string, string> = {
  // ── Active tier (Founding Farmer $9/mo or $79/yr) ──
  founding_monthly: FOUNDING_MONTHLY_PRICE_ID,
  founding_annual: FOUNDING_ANNUAL_PRICE_ID,

  // ── Legacy tiers (keep for existing subscribers, not shown on pricing page) ──
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
  starter_annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID!,
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID!,
  team_annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID!,
};

// ── Reverse lookup: price ID → tier name ────────────────────────────────────
// Used by the webhook handler to determine which tier to provision.
// Checks Founding Farmer first (new primary), then Team, Pro, defaults Starter.

export function getTierFromPriceId(priceId: string): 'founding' | 'starter' | 'pro' | 'team' {
  // Founding Farmer (new primary tier)
  if (priceId === FOUNDING_MONTHLY_PRICE_ID || priceId === FOUNDING_ANNUAL_PRICE_ID) {
    return 'founding';
  }

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
//
// Founding Farmer gets the same limits as Pro — they're paying customers
// who deserve full access. The price is lower, not the features.

export const TIER_LIMITS: Record<string, { max_farmers: number; max_users: number }> = {
  free: { max_farmers: 3, max_users: 1 },
  founding: { max_farmers: 50, max_users: 1 },
  starter: { max_farmers: 5, max_users: 1 },
  pro: { max_farmers: 50, max_users: 1 },
  team: { max_farmers: 250, max_users: 3 },
  enterprise: { max_farmers: 99999, max_users: 99999 },
};

// ── Trial limits (same as Pro during trial period) ──────────────────────────
export const TRIAL_TIER_LIMITS = TIER_LIMITS.pro;

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
