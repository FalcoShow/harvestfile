// =============================================================================
// HarvestFile — (dashboard) Route Group Layout
// Phase 8A: Fixed auth_user_id → auth_id to match actual DB column
//
// Auth gate → redirects to /login if no session
// Subscription gate → redirects to /trial-expired if trial expired
// Creates org + professional if missing (edge case: direct signup)
// Wraps children in SubscriptionProvider for client-side access
// =============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./_components/Sidebar";
import DashboardHeader from "./_components/DashboardHeader";
import { SubscriptionProvider } from "./_components/SubscriptionProvider";
import { TrialBanner } from "./_components/TrialBanner";

// ── Inline subscription state builder (can't import from 'use client' file) ─
function buildSubscriptionState(org: {
  subscription_status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string | null;
}) {
  const now = new Date();
  const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const isTrialing = org.subscription_status === "trialing";
  const isActive = org.subscription_status === "active";
  const isPastDue = org.subscription_status === "past_due";
  const isExpired =
    org.subscription_status === "expired" ||
    org.subscription_status === "canceled" ||
    (isTrialing && trialEnd !== null && trialEnd < now);

  let daysRemaining: number | null = null;
  if (isTrialing && trialEnd) {
    const msRemaining = trialEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  }

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // ── Auth check ──────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Step 1: Get professional record ─────────────────────────────────────
  // FIXED: Use auth_id directly (the actual column name in the DB)
  let professional: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    org_id: string;
  } | null = null;

  const { data: proData, error: proError } = await supabase
    .from("professionals")
    .select("id, full_name, email, role, org_id")
    .eq("auth_id", user.id)
    .single();

  if (proData) {
    professional = proData;
  }

  // ── Edge case: no professional record — create org + professional ───────
  if (!professional) {
    // Check if this is genuinely "no row" vs some other error
    if (proError?.code === "PGRST116" || !proData) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const { data: org } = await supabase
        .from("organizations")
        .insert({
          name: `${user.email?.split("@")[0]}'s Organization`,
          subscription_tier: "pro",
          subscription_status: "trialing",
          trial_ends_at: trialEndsAt.toISOString(),
          max_farmers: 50,
          max_users: 1,
        })
        .select("id")
        .single();

      if (org) {
        // FIXED: column is auth_id (not auth_user_id)
        await supabase.from("professionals").insert({
          org_id: org.id,
          auth_id: user.id,
          email: user.email!,
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User",
          role: "admin",
        });

        redirect("/dashboard");
      }
    }

    console.error(
      "[Dashboard Layout] Could not load professional:",
      proError?.message || "unknown error"
    );
  }

  // ── Step 2: Get organization data ───────────────────────────────────────
  let orgData: {
    id: string;
    name: string;
    subscription_tier: string;
    subscription_status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    max_farmers: number;
    max_users: number;
  } | null = null;

  if (professional?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select(
        "id, name, subscription_tier, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id, max_farmers, max_users"
      )
      .eq("id", professional.org_id)
      .single();

    orgData = org as typeof orgData;
  }

  // ── Build subscription state ────────────────────────────────────────────
  const subscriptionState = buildSubscriptionState({
    subscription_status: orgData?.subscription_status || "trialing",
    subscription_tier: orgData?.subscription_tier || "pro",
    trial_ends_at: orgData?.trial_ends_at || null,
    current_period_end: orgData?.current_period_end || null,
    cancel_at_period_end: orgData?.cancel_at_period_end || false,
    stripe_customer_id: orgData?.stripe_customer_id || null,
  });

  // ── Trial expired gate ──────────────────────────────────────────────────
  if (orgData && subscriptionState.isExpired) {
    redirect("/trial-expired");
  }

  return (
    <SubscriptionProvider subscription={subscriptionState}>
      <div data-theme="dark" className="flex min-h-screen bg-[#0a0f0d]">
        <Sidebar
          user={{
            email: professional?.email || user.email || "",
            full_name: professional?.full_name || "User",
          }}
          org={{
            name: orgData?.name || "My Organization",
            subscription_tier: orgData?.subscription_tier || "pro",
            subscription_status: orgData?.subscription_status || "trialing",
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner />
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SubscriptionProvider>
  );
}
