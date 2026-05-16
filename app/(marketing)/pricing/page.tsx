"use client";

// =============================================================================
// HarvestFile — /pricing Page
// Phase 1 Migration Update (May 16, 2026): Sell Score Architecture Cohesion
//
// Changes from prior version:
//   - FEATURES array: removed Morning Dashboard, Ag Weather, Marketing Score
//     references (all archived in Phase 1 cleanup). Replaced with honest
//     Phase 1 product features.
//   - FAQ #1, #2, #4 updated for current product structure.
//   - Future Price pill: changed from "$29/mo" (pre-pivot Pro tier) to
//     "Standard Sell Score: $149/yr" to reflect what Founding Farmer locks
//     against.
//   - Founding Farmer card subtitle clarifies it is the lifetime-locked
//     version of Sell Score for the first 500 farmers, same product.
//   - Hero subtitle expanded to mention Sell Score alongside Founding Farmer.
//   - "Or choose a different plan" separator changed to "Or lock in Founding
//     Farmer pricing" — honest framing since Founding IS Sell Score, just
//     locked at lifetime $79/yr for first 500.
//   - Free Tools for Every Farmer section: lists only tools that actually
//     exist as dedicated surfaces (no archived references).
//
// Known follow-ups (NOT fixed in this commit, documented for Sunday audit):
//   - Auth state detection queries professionals/organizations (legacy chain).
//     Will not detect Sell Score users (farms.owner_id chain) as active.
//     Fix on Sunday with nav audit.
//   - Hero text "The right election is worth $12,000" still anchors on ARC/PLC
//     framing. Sell Score is grain marketing, different value prop. Reframe
//     in Phase 4 polish.
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
import SellScoreCTA from "@/components/pricing/SellScoreCTA";

// ---------------------------------------------------------------------------
// Feature comparison data — Free vs Founding Farmer
// Reflects Phase 1 product reality (Sell Score + Markets + Settings).
// ---------------------------------------------------------------------------
const FEATURES = [
  // Free tier — what /check, /advisor, /programs, county pages, and 5 AM email provide
  { name: "ARC/PLC decision calculator", free: true, paid: true, category: "analysis" },
  { name: "AI Farm Advisor — commodity, weather, basis Q&A", free: true, paid: true, category: "analysis" },
  { name: "County payment data (3,143 counties)", free: true, paid: true, category: "analysis" },
  { name: "Side-by-side ARC vs PLC comparison", free: true, paid: true, category: "analysis" },
  { name: "Historical payment lookups", free: true, paid: true, category: "analysis" },
  { name: "USDA program guides (ARC, PLC, CRP, EQIP)", free: true, paid: true, category: "analysis" },
  { name: "5 AM Farm Brief daily email", free: true, paid: true, category: "analysis" },

  // Paid only — Sell Score / Founding Farmer
  { name: "Daily Sell Score with sell, hold, or wait recommendation", free: false, paid: true, category: "action" },
  { name: "Personalized breakeven and position tracking", free: false, paid: true, category: "action" },
  { name: "Live cash bids from your nearest elevators", free: false, paid: true, category: "action" },
  { name: "Basis tracker vs 3-year norm", free: false, paid: true, category: "action" },
  { name: "Marketing pace tracking vs target", free: false, paid: true, category: "action" },
  { name: "Downside protection display (PLC + crop insurance floor)", free: false, paid: true, category: "action" },
  { name: "Live commodity markets and MYA tracker", free: false, paid: true, category: "action" },
  { name: "Priority support and expert Q&A", free: false, paid: true, category: "action" },
  { name: "Price locked forever — never increases", free: false, paid: true, category: "action" },
];

// ---------------------------------------------------------------------------
// FAQ data — updated for Phase 1 product structure
// ---------------------------------------------------------------------------
const FAQS = [
  {
    q: "Is HarvestFile really free?",
    a: "Yes. The ARC/PLC calculator, AI Farm Advisor, USDA county data for 3,143 counties, program guides, and the 5 AM Farm Brief daily email are 100% free, forever. No account required for most tools. Sell Score ($149/yr standard, or $79/yr lifetime for the first 500 Founding Farmers) adds the daily personalized grain marketing recommendation.",
  },
  {
    q: "What does 'Founding Farmer' mean?",
    a: "The first 500 farmers get Sell Score at $79/yr lifetime — locked forever, never increasing. After the 500 spots fill, the standard Sell Score price is $149/yr. Founding Farmers also get a numbered certificate, their name on the Founders Wall at harvestfile.com, direct access to the founder, and first access to new features as they ship. Same product as standard Sell Score. The price lock and the perks are the difference.",
  },
  {
    q: "Where does HarvestFile get its data?",
    a: "Official USDA Farm Service Agency data via the NASS Quick Stats API, updated as new county-level information is published. Commodity prices from Barchart's market data feed. Weather from NOAA and Open-Meteo. Cash bids and basis from elevator networks. We source from the same data your FSA county office uses for ARC/PLC, plus real-time grain marketing inputs your local elevator board posts.",
  },
  {
    q: "How much can HarvestFile actually save me?",
    a: "Two ways. (1) ARC/PLC: the average mid-size row crop farmer leaves $12,000+ on the table from suboptimal elections. A single correct decision on 500 base acres can be worth $2,000–$15,000 per year. (2) Grain marketing: capturing $0.05 better basis on 90,000 bushels of corn is $4,500/yr. Top-third grain marketers consistently outearn bottom-third marketers by $40–$200 per acre annually. At $79/yr Founding or $149/yr standard, one good decision pays for years of subscription.",
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
    a: "University tools require you to find USDA data yourself and input it manually into Excel. HarvestFile pulls data automatically for 3,143 counties, runs every scenario in seconds, gives you a clear recommendation, and generates a PDF you can take to your FSA office. Plus daily grain marketing decisions through Sell Score — no spreadsheet does that.",
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
  // NOTE: This queries the legacy professionals/organizations chain and will
  // not correctly detect Sell Score users (farms.owner_id chain). Sell Score
  // users will appear as "anon" until Sunday's auth-chain unification.
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

    // Anonymous — link to Founding Farmer campaign flow
    return (
      <Link
        href="/founding-farmer"
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
  const standardAnnualPrice = 149;

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
            <p className="text-[16px] sm:text-[18px] text-white/35 leading-relaxed max-w-[640px] mx-auto mb-10">
              Free tools show your county data. Sell Score reads your farm
              every morning and tells you when to price. Founding Farmer locks
              that pricing at $79/yr for life.
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
      {/* SELL SCORE HERO BAND — Primary offer                             */}
      {/* ================================================================ */}
      <section className="relative z-10 mx-auto max-w-[900px] px-5 sm:px-6 pb-12 sm:pb-16">
        <ScrollReveal>
          <div
            className="relative rounded-[24px] overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 38, 28, 0.4) 100%)",
              border: "1.5px solid rgba(52, 211, 153, 0.22)",
              boxShadow: "0 0 100px -20px rgba(52, 211, 153, 0.18)",
            }}
          >
            {/* Subtle radial glow */}
            <div
              className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 70% 30%, rgba(52, 211, 153, 0.10) 0%, transparent 60%)",
              }}
            />

            <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 p-8 sm:p-10 lg:p-12">
              {/* Left column: copy */}
              <div>
                {/* Eyebrow */}
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
                  style={{
                    background: "rgba(52, 211, 153, 0.10)",
                    border: "1px solid rgba(52, 211, 153, 0.20)",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                  <span className="text-[11px] font-bold text-[#34D399] uppercase tracking-wider">
                    New · Daily Personalized Recommendation
                  </span>
                </div>

                {/* Headline */}
                <h2
                  className="text-[clamp(28px,4.5vw,42px)] font-extrabold text-white tracking-[-0.035em] leading-[1.08] mb-4"
                  style={{
                    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                  }}
                >
                  One number every morning.{" "}
                  <span
                    className="text-[#34D399]"
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}
                  >
                    Sell, hold, or wait.
                  </span>
                </h2>

                {/* Subhead */}
                <p className="text-[15px] sm:text-[16px] text-white/55 leading-relaxed mb-7 max-w-[540px]">
                  Sell Score reads your unsold position, breakeven, local
                  elevator basis, and ARC/PLC floor every morning at 5 AM —
                  and tells you exactly how many bushels of which crop to
                  price today.
                </p>

                {/* Three-feature row */}
                <ul className="space-y-2.5 mb-8">
                  {[
                    "Daily personalized recommendation for your farm",
                    "Live cash bids from your nearest elevator",
                    "Three-minute setup. Ready tomorrow morning.",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2.5 text-[14px] text-white/70 leading-relaxed"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 mt-0.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {line}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <SellScoreCTA label="Get started — $149/yr" />

                <p className="text-[12px] text-white/30 mt-4">
                  Annual billing · Cancel anytime · Money-back if it doesn&apos;t pay
                  for itself in 30 days
                </p>
              </div>

              {/* Right column: price card */}
              <div className="lg:border-l lg:border-white/[0.06] lg:pl-12 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-[#34D399]/70 uppercase tracking-wider mb-3">
                  HarvestFile Sell Score
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span
                    className="text-[56px] font-extrabold text-white tracking-[-0.04em] leading-none"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    $149
                  </span>
                  <span className="text-[16px] text-white/35 font-medium">/year</span>
                </div>
                <p className="text-[13px] text-white/35 mb-6">
                  That&apos;s $0.41/day for a decision tool that pays for itself with{" "}
                  <span className="text-white/60 font-semibold">
                    one priced bushel.
                  </span>
                </p>

                {/* Math callout */}
                <div
                  className="rounded-[12px] p-4"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    The math
                  </div>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex justify-between text-white/55">
                      <span>500 acres of corn</span>
                      <span className="tabular-nums">90,000 bu</span>
                    </div>
                    <div className="flex justify-between text-white/55">
                      <span>$0.05 better basis</span>
                      <span className="tabular-nums">+$4,500/yr</span>
                    </div>
                    <div
                      className="flex justify-between pt-2 mt-2 text-[#34D399] font-bold"
                      style={{ borderTop: "1px solid rgba(52, 211, 153, 0.15)" }}
                    >
                      <span>Return</span>
                      <span className="tabular-nums">30×</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom border accent */}
            <div
              className="h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.30), transparent)",
              }}
            />
          </div>
        </ScrollReveal>

        {/* "Or lock in Founding Farmer pricing" separator */}
        <div className="flex items-center justify-center mt-12 sm:mt-16 mb-2">
          <div className="flex items-center gap-4 text-[12px] font-bold text-white/30 uppercase tracking-wider">
            <div
              className="w-12 h-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <span>Or lock in Founding Farmer pricing</span>
            <div
              className="w-12 h-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
          </div>
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
                  ARC/PLC calculator, AI Farm Advisor, county data, USDA
                  program guides, and the 5 AM Farm Brief — free forever. No
                  account required.
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
                  Same Sell Score product. Locked at $79/yr for life — never
                  increases. First 500 farmers only.
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
                    Standard Sell Score: ${standardAnnualPrice}/yr
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
                One correct ARC/PLC election decision is worth thousands. Here&apos;s
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
              ARC/PLC Calculator, AI Farm Advisor, USDA Program Guides, 3,143
              County Pages, and the 5 AM Farm Brief daily email &mdash; all
              free, forever. No credit card. No account required for most
              tools.
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
