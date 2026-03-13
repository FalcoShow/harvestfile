import Stripe from 'stripe';

// Initialize Stripe — will be used in API routes only (server-side)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

// Stripe Price IDs — set these in your Stripe Dashboard,
// then add to .env.local
export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
};

// Helper to get or create a Stripe customer for a Supabase user
export async function getOrCreateCustomer(
  email: string,
  userId: string,
  name?: string
): Promise<string> {
  // Search for existing customer by metadata
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
