// ============================================================
// HarvestFile Type Definitions
// ============================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
export type AlertType = 'price_drop' | 'price_spike' | 'deadline' | 'program_update';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  organization_name: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmOperation {
  id: string;
  user_id: string;
  farm_name: string;
  crop: string;
  state: string;
  county: string;
  base_acres: number | null;
  planted_acres: number | null;
  arc_co_selected: boolean;
  plc_selected: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  crop: string;
  state: string;
  county: string | null;
  alert_type: AlertType;
  last_notified_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: string;
  title: string;
  farm_operation_id: string | null;
  input_data: Record<string, any>;
  output_data: Record<string, any> | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripe_payment_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SubscriptionEvent {
  id: string;
  user_id: string;
  event_type: string;
  stripe_event_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Pricing tier configuration
export interface PricingTier {
  name: string;
  tier: SubscriptionTier;
  price: number | null; // null = custom pricing
  priceLabel: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    tier: 'free',
    price: 0,
    priceLabel: 'Free',
    description: 'Get started with basic eligibility screening and program guides.',
    features: [
      'Eligibility screener (unlimited)',
      'ARC/PLC decision calculator',
      'Program guides (ARC-CO, PLC, EQIP, CRP, CSP)',
      'One AI-generated report',
      'Email support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: 29,
    priceLabel: '$29/mo',
    description: 'Unlock the full platform. Save operations, track prices, run unlimited reports.',
    features: [
      'Everything in Starter',
      'Save unlimited farm operations',
      'Unlimited AI-generated reports',
      'Price & deadline alerts',
      'Cross-program optimization engine',
      'County-level yield data (NASS)',
      'Priority support',
      'Export reports as PDF',
    ],
    cta: 'Start 14-Day Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    price: null,
    priceLabel: 'Custom',
    description: 'For Farm Credit lenders, co-ops, and ag consultants managing multiple producers.',
    features: [
      'Everything in Pro',
      'Multi-producer management',
      'Branded client reports',
      'Bulk operations import (CSV)',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SSO & team management',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];
