"use client";

// =============================================================================
// HarvestFile — /pricing Page
// Pricing Restructure: 2-Tier (Free + Founding Farmer $9/mo or $79/yr)
//
// Auth-aware CTAs:
//   - Not logged in → "Become a Founding Farmer" → /signup
//   - Logged in + no subscription → "Subscribe" → Stripe Checkout
//   - Logged in + active → "Manage Subscription" → Stripe Portal
//
// Stripe price keys:
//   - founding_monthly → maps to $9/mo Stripe Price ID
//   - founding_annual  → maps to $79/yr Stripe Price ID
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Feature comparison data — "Free = WHAT, Founding Farmer = WHAT TO DO"
// ---------------------------------------------------------------------------
const FEATURES = [
  { name: "ARC/PLC decision calculator", free: true, paid: true, category: "analysis" },
  { name: "County payment data (3,000+ counties)", free: true, paid: true, category: "analysis" },
  { name: "Side-by-side ARC vs PLC comparison", free: true, paid: true, category: "analysis" },
  { name: "Historical payment lookups", free: true, paid: true, category: "analysis" },
  { name: "Morning Dashboard & commodity prices", free: true, paid: true, category: "analysis" },
  { name: "Ag weather & spray conditions", free: true, paid: true, category: "analysis" },
  { name: "USDA program guides (ARC, PLC, CRP, EQIP)", free: true, paid: true, category: "analysis" },
  { name: "5 AM Farm Brief daily email", free: true, paid: true, category: "analysis" },
  { name: "Personalized election recommendation", free: false, paid: true, category: "action" },
  { name: "Dollar-impact projections for your farm", free: false, paid: true, category: "action" },
  { name: "Multi-year scenario modeling", free: false, paid: true, category: "action" },
  { name: "Exportable PDF reports for your FSA visit", free: false, paid: true, category: "action" },
  { name: "Election deadline alerts & reminders", free: false, paid: true, category: "action" },
  { name: "Grain marketing score & basis tracking", free: false, paid: true, category: "action" },
  { name: "Priority support & expert Q&A", free: false, paid: true, category: "action" },
  { name: "Price locked forever — never increases", free: false, paid: true, category: "action" },
];

// ---------------------------------------------------------------------------
// FAQ data — updated for 2-tier structure
// ---------------------------------------------------------------------------
const FAQS = [
  {
    q: "Is HarvestFile really free?",
    a: "Yes. All analysis tools, USDA county data, the Morning Dashboard, commodity prices, weather, and the 5 AM Farm Brief are 100% free, forever. No account required for most tools. The Founding Farmer plan adds personalized election recommendations and action-oriented features.",
  },
  {
    q: "What does 'Founding Farmer' mean?",
    a: "The first 500 subscribers become Founding Farmers — early supporters who lock in $9/mo (or $79/yr) forever, even when the price increases to $29/mo. You also get direct access to the founder, input on the product roadmap, and a Founding Farmer badge on your profile.",
  },
  {
    q: "Where does HarvestFile get its data?",
    a: "Official USDA Farm Service Agency data via the NASS Quick Stats API, updated as new county-level information is published. Commodity prices from real-time market feeds. Weather from NOAA and Open-Meteo. We source from the same data your FSA county office uses.",
  },
  {
    q: "How much can HarvestFile actually save me?",
    a: "The average mid-size row crop farmer leaves $12,000+ on the table from suboptimal ARC/PLC elections. A single correct election decision on 500 base acres can be worth $2,000–$15,000 per year depending on commodity prices and county yields. At $79/year, that's a 152:1 return.",
  },
  {
    q: "Do I need a credit card for the free plan?",
    a: "No. Most tools work without even creating an account. When you do sign up, it's email only — no credit card, no strings, no trial that expires. Free means free.",
  },
  {
    q: "Does HarvestFile replace my FSA office?",
    a: "No. HarvestFile helps you walk into your FSA office prepared — knowing exactly which program to elect and why. Always confirm final elections with your local FSA office. We make you a more informed farmer, not a replacement for professional guidance.",
  },
  {
    q: "Is my farm data secure?",
    a: "Bank-level encryption in transit and at rest. Row-level security means no one — not even us — can access another farmer's data. We never sell or share your information with third parties. Period. Delete your account and all data anytime with one click.",
  },
  {
    q: "What makes this different from university spreadsheets?",
    a: "University tools require you to find USDA data yourself and input it manually into Excel. HarvestFile pulls data automatically for 3,000+ counties, runs every scenario in seconds, gives you a clear recommendation, and generates a PDF you can take to your FSA office. Plus daily market intelligence, weather, and alerts — no spreadsheet does that.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. One click from your dashboard. No phone calls, no retention tricks. If you cancel, you keep full access to all free tools — your data stays. We earn your subscription every month.",
  },
  {
    q: "I'm a crop insurance agent or Farm Credit lender. Is there a team plan?",
    a: "We're building team features for agricultural professionals. For now, email hello@harvestfile.com and we'll set you up personally. Founding Farmers who are ag professionals will get first access to team features when they launch.",
  },
];

// ---------------------------------------------------------------------------
// Competitor pricing for the anchor section
// ---------------------------------------------------------------------------
const COMPETITORS = [
  { name: "Farm management consultant", price: "$200–500/hr", annual: "$2,000+" },
  { name: "Bushel Farm", price: "$50/mo", annual: "$599/yr" },
  { name: "Climate FieldView Plus", price: "$54/mo", annual: "$649/yr" },
  { name: "Harvest Profit", price: "$133/mo", annual: "$1,600/yr" },
];

// ---------------------------------------------------------------------------
// ScrollReveal — reused from existing page
// ---------------------------------------------------------------------------
function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Check & X icons
// ---------------------------------------------------------------------------
function Check({ gold }: { gold?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={gold ? "#C9A84C" : "rgba(255,255,255,0.35)"}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 mt-0.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.12)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 mt-0.5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lock icon for gated features
// ---------------------------------------------------------------------------
function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C9A84C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main pricing page component
// ---------------------------------------------------------------------------
export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authState, setAuthState] = useState<
    "loading" | "anon" | "trialing" | "expired" | "active"
  >("loading");
  const [loadingAction, setLoadingAction] = useState(false);
  const [spotsRemaining] = useState(500); // TODO: Wire to Supabase query on founding_farmer subscriber count

  // -------------------------------------------------------------------------
  // Auth state detection
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setAuthState("anon");
          return;
        }

        const { data: professional } = await supabase
          .from("professionals")
          .select("org_id")
          .eq("auth_id", user.id)
          .single();

        if (!professional?.org_id) {
          setAuthState("anon");
          return;
        }

        const { data: org } = await supabase
          .from("organizations")
          .select("subscription_status, trial_ends_at")
          .eq("id", professional.org_id)
          .single();

        if (!org) {
          setAuthState("anon");
          return;
        }

        if (org.subscription_status === "active") {
          setAuthState("active");
        } else if (org.subscription_status === "trialing") {
          const trialEnd = org.trial_ends_at
            ? new Date(org.trial_ends_at)
            : null;
          setAuthState(
            trialEnd && trialEnd > new Date() ? "trialing" : "expired"
          );
        } else {
          setAuthState("expired");
        }
      } catch {
        setAuthState("anon");
      }
    }
    checkAuth();
  }, []);

  // -------------------------------------------------------------------------
  // Stripe Checkout handler
  // -------------------------------------------------------------------------
  const handleCheckout = useCallback(async () => {
    const priceKey = billing === "annual" ? "founding_annual" : "founding_monthly";
    setLoadingAction(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType: priceKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
        setLoadingAction(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoadingAction(false);
    }
  }, [billing]);

  // -------------------------------------------------------------------------
  // Stripe Portal handler
  // -------------------------------------------------------------------------
  const handlePortal = useCallback(async () => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not open billing portal.");
        setLoadingAction(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoadingAction(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // CTA rendering based on auth state
  // -------------------------------------------------------------------------
  function renderFoundingCta(size: "large" | "compact" = "large") {
    const large = size === "large";

    if (authState === "active") {
      return (
        <button
          onClick={handlePortal}
          disabled={loadingAction}
          className={`flex items-center justify-center w-full rounded-[14px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 cursor-pointer disabled:opacity-50 ${large ? "py-4 text-[16px]" : "py-3.5 text-[15px]"}`}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {loadingAction ? "Opening..." : "Manage Subscription"}
        </button>
      );
    }

    if (authState === "trialing" || authState === "expired") {
      return (
        <button
          onClick={handleCheckout}
          disabled={loadingAction}
          className={`flex items-center justify-center w-full rounded-[14px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 cursor-pointer disabled:opacity-50 ${large ? "py-4 text-[16px]" : "py-3.5 text-[15px]"}`}
          style={{
            background:
              "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)",
            backgroundSize: "200% auto",
            animation: loadingAction ? "none" : "hf-shimmer 3s linear infinite",
            color: "#0C1F17",
            boxShadow: "0 6px 28px rgba(201,168,76,0.25)",
          }}
        >
          {loadingAction
            ? "Redirecting to Checkout..."
            : `Become a Founding Farmer — $${billing === "annual" ? "79/yr" : "9/mo"}`}
        </button>
      );
    }

    // Anonymous — link to signup
    return (
      <Link
        href="/signup"
        className={`flex items-center justify-center w-full rounded-[14px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(201,168,76,0.3)] active:scale-[0.98] active:duration-75 ${large ? "py-4 text-[16px]" : "py-3.5 text-[15px]"}`}
        style={{
          background:
            "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)",
          backgroundSize: "200% auto",
          animation: "hf-shimmer 3s linear infinite",
          color: "#0C1F17",
          boxShadow: "0 6px 28px rgba(201,168,76,0.25)",
        }}
      >
        Become a Founding Farmer — ${billing === "annual" ? "79/yr" : "9/mo"} &rarr;
      </Link>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const monthlyPrice = 9;
  const annualPrice = 79;
  const displayPrice = billing === "annual" ? annualPrice : monthlyPrice;
  const billingLabel = billing === "annual" ? "/yr" : "/mo";
  const futureMonthlyPrice = 29;

  return (
    <div className="min-h-screen" style={{ background: "#0C1F17" }}>
      <div className="hf-grain" style={{ opacity: 0.035, zIndex: 1 }} />

      {/* ================================================================ */}
      {/* HERO SECTION */}
      {/* ================================================================ */}
      <section className="relative pt-32 sm:pt-40 pb-10 sm:pb-14">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(201,168,76,0.07) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[900px] px-5 sm:px-6 text-center">
          <ScrollReveal>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.15)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              <span className="text-[11px] font-bold text-[#C9A84C] uppercase tracking-wider">
                {spotsRemaining} of 500 Founding Farmer Spots Remaining
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h1
              className="text-[clamp(32px,6vw,56px)] font-extrabold text-white tracking-[-0.04em] leading-[1.05] mb-5"
              style={{
                fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
              }}
            >
              The right election is worth{" "}
              <span
                className="text-[#C9A84C]"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                $12,000
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p className="text-[16px] sm:text-[18px] text-white/35 leading-relaxed max-w-[580px] mx-auto mb-10">
              Free tools show your county data. Founding Farmer tells you
              exactly what to elect — and why.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={240}>
            <div
              className="inline-flex items-center rounded-[14px] p-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={() => setBilling("monthly")}
                className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 cursor-pointer"
                style={{
                  background:
                    billing === "monthly"
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color:
                    billing === "monthly" ? "#fff" : "rgba(255,255,255,0.35)",
                  border: "none",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-2"
                style={{
                  background:
                    billing === "annual"
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color:
                    billing === "annual" ? "#fff" : "rgba(255,255,255,0.35)",
                  border: "none",
                }}
              >
                Annual
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-extrabold"
                  style={{
                    background: "rgba(201,168,76,0.15)",
                    color: "#C9A84C",
                  }}
                >
                  SAVE 27%
                </span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TWO-TIER PRICING CARDS */}
      {/* ================================================================ */}
      <section className="relative z-10 mx-auto max-w-[900px] px-5 sm:px-6 pb-16 sm:pb-24">
        <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
          {/* FREE TIER */}
          <ScrollReveal>
            <div
              className="relative rounded-[20px] p-7 sm:p-8 flex flex-col h-full transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="mb-6">
                <h3 className="text-white font-bold text-[20px] mb-2">Free</h3>
                <p className="text-[13px] text-white/30 leading-relaxed">
                  Every analysis tool, every county, every commodity — free
                  forever. No account required.
                </p>
              </div>

              <div className="mb-7">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[48px] font-extrabold text-white tracking-[-0.04em]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    $0
                  </span>
                  <span className="text-[14px] text-white/25 font-medium">
                    /forever
                  </span>
                </div>
                <p className="text-[12px] text-white/20 mt-1">
                  No credit card. No trial. Just free.
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {FEATURES.filter((f) => f.free).map((feature) => (
                  <li
                    key={feature.name}
                    className="flex items-start gap-2.5 text-[13px] text-white/45 leading-relaxed"
                  >
                    <Check />
                    {feature.name}
                  </li>
                ))}
              </ul>

              <Link
                href="/check"
                className="flex items-center justify-center w-full py-3.5 rounded-[12px] text-[15px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                Try Free Calculator &rarr;
              </Link>
            </div>
          </ScrollReveal>

          {/* FOUNDING FARMER TIER */}
          <ScrollReveal delay={100}>
            <div
              className="relative rounded-[20px] p-7 sm:p-8 flex flex-col h-full transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1.5px solid rgba(201,168,76,0.2)",
                boxShadow: "0 0 80px -20px rgba(201,168,76,0.12)",
              }}
            >
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="px-5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, #9E7E30, #C9A84C)",
                    color: "#0C1F17",
                  }}
                >
                  {spotsRemaining < 500
                    ? `Only ${spotsRemaining} Spots Left`
                    : "Limited to 500 Farmers"}
                </span>
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-white font-bold text-[20px] mb-2">
                  Founding Farmer
                </h3>
                <p className="text-[13px] text-white/30 leading-relaxed">
                  Everything free, plus personalized recommendations and
                  action-ready reports. Price locked for life.
                </p>
              </div>

              <div className="mb-7">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[48px] font-extrabold text-white tracking-[-0.04em]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    ${displayPrice}
                  </span>
                  <span className="text-[14px] text-white/25 font-medium">
                    {billingLabel}
                  </span>
                </div>
                {billing === "annual" ? (
                  <p className="text-[12px] text-[#C9A84C]/70 mt-1 font-semibold">
                    $6.58/mo &mdash; save $29 vs monthly
                  </p>
                ) : (
                  <p className="text-[12px] text-[#C9A84C]/50 mt-1">
                    or $79/yr (save 27%)
                  </p>
                )}
                <div
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-[11px] text-white/25 line-through">
                    Future price: ${futureMonthlyPrice}/mo
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="text-[11px] font-bold text-[#C9A84C]/60 uppercase tracking-wider mb-1">
                  Everything in Free, plus:
                </li>
                {FEATURES.filter((f) => !f.free && f.paid).map((feature) => (
                  <li
                    key={feature.name}
                    className="flex items-start gap-2.5 text-[13px] text-white/55 leading-relaxed"
                  >
                    <Check gold />
                    {feature.name}
                  </li>
                ))}
              </ul>

              {renderFoundingCta("compact")}
            </div>
          </ScrollReveal>
        </div>

        {/* Trust bar */}
        <div className="mt-8 flex items-center justify-center gap-5 sm:gap-7 flex-wrap text-[11px] text-white/15">
          {[
            "No credit card for free plan",
            "Cancel anytime",
            "Your data stays yours",
            "Price locked forever",
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* ROI SECTION — The $0.22/day value proposition */}
      {/* ================================================================ */}
      <section className="relative z-10 mx-auto max-w-[800px] px-5 sm:px-6 pb-16 sm:pb-24">
        <ScrollReveal>
          <div
            className="rounded-[20px] p-8 sm:p-10"
            style={{
              background: "rgba(201,168,76,0.03)",
              border: "1px solid rgba(201,168,76,0.1)",
            }}
          >
            <div className="text-center mb-8">
              <h2 className="text-[22px] sm:text-[28px] font-extrabold text-white tracking-[-0.02em] mb-3">
                The math speaks for itself
              </h2>
              <p className="text-[14px] text-white/30 max-w-[480px] mx-auto">
                One correct ARC/PLC election decision is worth thousands. Here's
                how HarvestFile compares to every alternative.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {COMPETITORS.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between py-3 px-4 rounded-[12px]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span className="text-[13px] text-white/40">{c.name}</span>
                  <span className="text-[14px] text-white/50 font-semibold tabular-nums">
                    {c.annual}
                  </span>
                </div>
              ))}
              {/* HarvestFile row — highlighted */}
              <div
                className="flex items-center justify-between py-3 px-4 rounded-[12px]"
                style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "1.5px solid rgba(201,168,76,0.2)",
                }}
              >
                <span className="text-[13px] text-[#C9A84C] font-bold">
                  HarvestFile Founding Farmer
                </span>
                <span className="text-[14px] text-[#C9A84C] font-extrabold tabular-nums">
                  $79/yr
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[13px] text-white/25 leading-relaxed">
                That&apos;s <span className="text-[#C9A84C] font-bold">$0.22/day</span> for a tool
                that helps you capture{" "}
                <span className="text-white/60 font-bold">
                  $12,000+ in USDA payments
                </span>{" "}
                you might otherwise miss.
                <br />
                <span className="text-white/40 font-semibold">
                  152:1 return on investment.
                </span>
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ================================================================ */}
      {/* FEATURE COMPARISON TABLE */}
      {/* ================================================================ */}
      <section className="relative z-10 mx-auto max-w-[800px] px-5 sm:px-6 pb-16 sm:pb-24">
        <ScrollReveal>
          <h2 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] text-center mb-3">
            Free shows you the data
          </h2>
          <p className="text-[14px] text-white/30 text-center max-w-[420px] mx-auto mb-8">
            Founding Farmer tells you what to do with it
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div
            className="rounded-[20px] overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] px-5 py-4"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <span className="text-[12px] font-bold text-white/30 uppercase tracking-wider">
                Feature
              </span>
              <span className="text-[12px] font-bold text-white/30 uppercase tracking-wider text-center">
                Free
              </span>
              <span className="text-[12px] font-bold text-[#C9A84C]/60 uppercase tracking-wider text-center">
                Founding
              </span>
            </div>

            {/* Rows */}
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.name}
                className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] px-5 py-3 items-center"
                style={{
                  borderBottom:
                    idx < FEATURES.length - 1
                      ? "1px solid rgba(255,255,255,0.03)"
                      : "none",
                  background: !feature.free
                    ? "rgba(201,168,76,0.02)"
                    : "transparent",
                }}
              >
                <span
                  className={`text-[13px] leading-relaxed flex items-center gap-2 ${!feature.free ? "text-white/50 font-medium" : "text-white/35"}`}
                >
                  {!feature.free && <LockIcon />}
                  {feature.name}
                </span>
                <div className="flex justify-center">
                  {feature.free ? <Check /> : <XMark />}
                </div>
                <div className="flex justify-center">
                  <Check gold />
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mt-8 text-center">{renderFoundingCta("large")}</div>
        </ScrollReveal>
      </section>

      {/* ================================================================ */}
      {/* TRUST SIGNALS */}
      {/* ================================================================ */}
      <section className="relative z-10 mx-auto max-w-[900px] px-5 sm:px-6 pb-16 sm:pb-24">
        <ScrollReveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: "🏛️",
                title: "Official USDA Data",
                desc: "Sourced directly from USDA Farm Service Agency. Same data your county FSA office uses.",
              },
              {
                icon: "🔒",
                title: "Bank-Level Security",
                desc: "Encrypted in transit and at rest. Row-level security. We never sell your data. Period.",
              },
              {
                icon: "🤝",
                title: "Built for Farmers",
                desc: "Not a Silicon Valley toy. Built by someone who understands what's at stake every season.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[16px] p-6 text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="text-[28px] mb-3">{item.icon}</div>
                <h4 className="text-[15px] font-bold text-white/80 mb-2">
                  {item.title}
                </h4>
                <p className="text-[12px] text-white/25 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ================================================================ */}
      {/* FREE TOOLS SECTION */}
      {/* ================================================================ */}
      <section className="relative z-10 mx-auto max-w-[700px] px-5 sm:px-6 pb-16 sm:pb-24">
        <ScrollReveal>
          <div
            className="rounded-[20px] p-7 sm:p-10 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-[12px] font-bold text-[#C9A84C]/60 uppercase tracking-wider mb-3">
              Always Free &middot; No Account Required
            </div>
            <h3 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] mb-3">
              Free Tools for Every Farmer
            </h3>
            <p className="text-[14px] text-white/30 leading-relaxed max-w-[520px] mx-auto mb-6">
              ARC/PLC Calculator, Morning Dashboard, Commodity Markets, Ag
              Weather, Spray Window, Grain Marketing, USDA Program Guides, 5 AM
              Farm Brief, 3,000+ County Pages, and Election Optimizer &mdash;
              all free, forever.
            </p>
            <Link
              href="/check"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-[12px] text-[14px] font-bold no-underline transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.2)",
                color: "#C9A84C",
              }}
            >
              Try the Free Calculator &rarr;
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ================================================================ */}
      {/* FAQ SECTION */}
      {/* ================================================================ */}
      <section className="relative z-10">
        <div className="mx-auto max-w-[400px] px-8 mb-12 sm:mb-16">
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)",
            }}
          />
        </div>
        <div className="mx-auto max-w-[640px] px-5 sm:px-6 pb-16 sm:pb-24">
          <ScrollReveal>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] text-center mb-8 sm:mb-10">
              Frequently asked questions
            </h2>
          </ScrollReveal>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <ScrollReveal key={i} delay={i * 50}>
                <div
                  className="rounded-[14px] overflow-hidden transition-all duration-200"
                  style={{
                    border:
                      openFaq === i
                        ? "1px solid rgba(201,168,76,0.15)"
                        : "1px solid rgba(255,255,255,0.06)",
                    background:
                      openFaq === i
                        ? "rgba(201,168,76,0.03)"
                        : "rgba(255,255,255,0.02)",
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-5 py-4 cursor-pointer text-left bg-transparent border-none transition-colors"
                    style={{
                      color:
                        openFaq === i ? "#C9A84C" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <span className="text-[14px] font-semibold pr-4">
                      {faq.q}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 transition-transform duration-200"
                      style={{
                        transform:
                          openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                        color: "rgba(255,255,255,0.2)",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: openFaq === i ? "400px" : "0px",
                      opacity: openFaq === i ? 1 : 0,
                    }}
                  >
                    <div className="px-5 pb-4 text-[13px] text-white/35 leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA */}
      {/* ================================================================ */}
      <section className="relative z-10 pb-24 sm:pb-32">
        <div className="mx-auto max-w-[400px] px-8 mb-16 sm:mb-20">
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)",
            }}
          />
        </div>
        <div className="mx-auto max-w-[600px] px-5 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-[24px] sm:text-[32px] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
              Every day without HarvestFile is money left in Washington
            </h2>
            <p className="text-[15px] text-white/30 leading-relaxed max-w-[460px] mx-auto mb-8">
              Join the farmers who are finally getting every dollar they earned.{" "}
              {spotsRemaining < 500
                ? `Only ${spotsRemaining} Founding Farmer spots remain.`
                : "500 Founding Farmer spots available."}
            </p>
            {renderFoundingCta("large")}
            <p className="text-[11px] text-white/15 mt-4">
              No credit card for free plan &middot; Cancel anytime &middot;
              Founding rate locked forever
            </p>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
