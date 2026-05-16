// =============================================================================
// HarvestFile — Subscription Context Provider
// Build 3: Trial Gating
//
// Server Component layout fetches subscription data → passes to this provider
// → any Client Component can call useSubscription() to access it
//
// NOTE: Wrapping children in a 'use client' provider does NOT make those
// children client components. They're rendered on the server and passed
// through as the children prop.
// =============================================================================

'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface SubscriptionState {
  status: string;
  tier: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;

  // Computed convenience fields
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isExpired: boolean;
  hasAccess: boolean; // true if user should be able to use the dashboard
  daysRemaining: number | null; // days left in trial, null if not trialing
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

interface SubscriptionProviderProps {
  subscription: SubscriptionState;
  children: ReactNode;
}

export function SubscriptionProvider({
  subscription,
  children,
}: SubscriptionProviderProps) {
  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionState {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// ── Helper: Build subscription state from raw database fields ───────────────
// Called in the dashboard layout Server Component
export function buildSubscriptionState(org: {
  subscription_status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string | null;
}): SubscriptionState {
  const now = new Date();
  const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const isTrialing = org.subscription_status === 'trialing';
  const isActive = org.subscription_status === 'active';
  const isPastDue = org.subscription_status === 'past_due';
  const isExpired =
    org.subscription_status === 'expired' ||
    org.subscription_status === 'canceled' ||
    (isTrialing && trialEnd !== null && trialEnd < now);

  // Calculate days remaining in trial
  let daysRemaining: number | null = null;
  if (isTrialing && trialEnd) {
    const msRemaining = trialEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  }

  // User has access if active, trialing (with time left), or past_due (grace period)
  const hasAccess = isActive || (isTrialing && !isExpired) || isPastDue;

  return {
    status: org.subscription_status,
    tier: org.subscription_tier,
    trialEndsAt: org.trial_ends_at,
    currentPeriodEnd: org.current_period_end || null,
    cancelAtPeriodEnd: org.cancel_at_period_end || false,
    stripeCustomerId: org.stripe_customer_id || null,
    isActive,
    isTrialing: isTrialing && !isExpired,
    isPastDue,
    isExpired,
    hasAccess,
    daysRemaining,
  };
}
