"use client";

// =============================================================================
// HarvestFile — /pricing Page
// Phase 27 Build 3: Updated free tools count from 6 to 14
//
// Auth-aware CTAs:
//   - Not logged in → "Start Free Trial" → /signup
//   - Logged in + trialing/expired → "Subscribe" → Stripe Checkout
//   - Logged in + active → "Manage Subscription" → Stripe Portal
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function getPriceKey(tier: string, billing: "monthly" | "annual"): string {
  return `${tier.toLowerCase()}_${billing}`;
}

const TIERS = [
  {
    name: "Starter",
    monthly: 29,
    description: "Essential tools for individual farmers making smarter program decisions.",
    features: [
      "ARC/PLC decision calculator",
      "Save up to 5 farm operations",
      "3 AI-generated reports/month",
      "Price & deadline alerts",
      "County-level yield data (NASS)",
      "Export reports as PDF",
      "Email support",
    ],
    highlighted: false,
    badge: null,
    accentColor: "rgba(255,255,255,0.3)",
  },
  {
    name: "Pro",
    monthly: 59,
    description: "Full-powered optimization for serious operations. The plan most farmers choose.",
    features: [
      "Everything in Starter",
      "Unlimited farm operations",
      "Unlimited AI reports",
      "Multi-year payment projections",
      "Scenario modeling engine",
      "Crop insurance comparison",
      "County election benchmarking",
      "Priority email support",
    ],
    highlighted: true,
    badge: "Most Popular",
    accentColor: "#C9A84C",
  },
  {
    name: "Team",
    monthly: 149,
    description: "For ag consultants, crop insurance agents, and advisors managing multiple producers.",
    features: [
      "Everything in Pro",
      "Manage up to 25 producers",
      "Branded client reports",
      "Bulk operations import (CSV)",
      "Team member accounts (up to 3)",
      "Client portfolio analytics",
      "Quarterly market briefings",
      "Phone & priority support",
    ],
    highlighted: false,
    badge: null,
    accentColor: "rgba(255,255,255,0.3)",
  },
  {
    name: "Enterprise",
    monthly: null,
    description: "For Farm Credit lenders, co-ops, and large ag firms managing 100+ producers.",
    features: [
      "Everything in Team",
      "Unlimited producers",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SSO & team management",
      "White-label reports",
      "On-call support",
    ],
    highlighted: false,
    badge: null,
    accentColor: "rgba(255,255,255,0.3)",
  },
];

const FAQS = [
  {
    q: "Is there really a free calculator?",
    a: "Yes. The ARC/PLC comparison calculator at /check is 100% free, uses real USDA county data, and requires no registration. It\u2019s free forever \u2014 no catch.",
  },
  {
    q: "What happens during the 14-day trial?",
    a: "Every trial gets full Pro-level access for 14 days. No credit card required. After 14 days, choose the plan that fits \u2014 Starter, Pro, or Team. Your data is saved regardless.",
  },
  {
    q: "What\u2019s the difference between Starter and Pro?",
    a: "Starter covers the basics \u2014 save 5 operations, 3 AI reports per month, and price alerts. Pro unlocks unlimited everything plus multi-year projections, scenario modeling, crop insurance comparison, and county election benchmarking. Most farmers choose Pro because one better decision pays for a full year.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes. Upgrade, downgrade, or switch between monthly and annual at any time from your dashboard. When upgrading, you get a prorated credit. When switching to annual, you save 20%.",
  },
  {
    q: "I\u2019m a Farm Credit lender. What\u2019s the Enterprise plan?",
    a: "Enterprise gives you unlimited producer management, white-label client reports, API access, and a dedicated account manager. Email hello@harvestfile.com to discuss your portfolio.",
  },
  {
    q: "Is my farm data secure?",
    a: "Your data is encrypted in transit and at rest. We use Supabase with row-level security \u2014 every query is scoped to your organization. We never sell or share your data with third parties.",
  },
  {
    q: "What makes this different from university spreadsheets?",
    a: "Those tools require you to find and input county-specific USDA data yourself. HarvestFile pulls it automatically for 3,000+ counties, runs the same formulas, and gives you a shareable result in 60 seconds. Plus multi-year projections, scenario modeling, crop insurance comparison, and AI-powered reports no spreadsheet can match.",
  },
];

function ScrollReveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
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

function Check({ gold }: { gold?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gold ? "#C9A84C" : "rgba(255,255,255,0.3)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authState, setAuthState] = useState<"loading" | "anon" | "trialing" | "expired" | "active">("loading");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAuthState("anon"); return; }

        const { data: professional } = await supabase
          .from("professionals")
          .select("org_id")
          .eq("auth_id", user.id)
          .single();

        if (!professional?.org_id) { setAuthState("anon"); return; }

        const { data: org } = await supabase
          .from("organizations")
          .select("subscription_status, trial_ends_at")
          .eq("id", professional.org_id)
          .single();

        if (!org) { setAuthState("anon"); return; }

        if (org.subscription_status === "active") {
          setAuthState("active");
        } else if (org.subscription_status === "trialing") {
          const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
          setAuthState(trialEnd && trialEnd > new Date() ? "trialing" : "expired");
        } else {
          setAuthState("expired");
        }
      } catch {
        setAuthState("anon");
      }
    }
    checkAuth();
  }, []);

  const handleCheckout = useCallback(async (tierName: string) => {
    const priceKey = getPriceKey(tierName, billing);
    setLoadingTier(tierName);
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
        setLoadingTier(null);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoadingTier(null);
    }
  }, [billing]);

  const handlePortal = useCallback(async () => {
    setLoadingTier("portal");
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
        setLoadingTier(null);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoadingTier(null);
    }
  }, []);

  function renderCta(tier: typeof TIERS[number]) {
    const isEnterprise = tier.monthly === null;

    if (isEnterprise) {
      return (
        <a
          href="mailto:hello@harvestfile.com"
          className="flex items-center justify-center w-full py-3.5 rounded-[12px] text-[15px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          Contact Sales
        </a>
      );
    }

    if (authState === "active") {
      return (
        <button
          onClick={handlePortal}
          disabled={loadingTier === "portal"}
          className="flex items-center justify-center w-full py-3.5 rounded-[12px] text-[15px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 cursor-pointer disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          {loadingTier === "portal" ? "Opening..." : "Manage Subscription"}
        </button>
      );
    }

    if (authState === "trialing" || authState === "expired") {
      const isLoading = loadingTier === tier.name;
      return (
        <button
          onClick={() => handleCheckout(tier.name)}
          disabled={isLoading}
          className="flex items-center justify-center w-full py-3.5 rounded-[12px] text-[15px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 cursor-pointer disabled:opacity-50"
          style={
            tier.highlighted
              ? { background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)", backgroundSize: "200% auto", animation: isLoading ? "none" : "hf-shimmer 3s linear infinite", color: "#0C1F17", boxShadow: "0 4px 20px rgba(201,168,76,0.2)" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
          }
        >
          {isLoading ? "Redirecting to Checkout..." : "Subscribe"}
        </button>
      );
    }

    return (
      <Link
        href="/signup"
        className="flex items-center justify-center w-full py-3.5 rounded-[12px] text-[15px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75"
        style={
          tier.highlighted
            ? { background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)", backgroundSize: "200% auto", animation: "hf-shimmer 3s linear infinite", color: "#0C1F17", boxShadow: "0 4px 20px rgba(201,168,76,0.2)" }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
        }
      >
        Start Free Trial
      </Link>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0C1F17" }}>
      <div className="hf-grain" style={{ opacity: 0.035, zIndex: 1 }} />

      <section className="relative pt-32 sm:pt-40 pb-8 sm:pb-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />
        <div className="relative z-10 mx-auto max-w-[900px] px-5 sm:px-6 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              <span className="text-[11px] font-bold text-[#C9A84C] uppercase tracking-wider">14-Day Free Trial &middot; No Credit Card Required</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h1 className="text-[clamp(32px,6vw,56px)] font-extrabold text-white tracking-[-0.04em] leading-[1.05] mb-5" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
              Stop leaving{" "}
              <span className="text-[#C9A84C]" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>money on the table</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p className="text-[16px] sm:text-[18px] text-white/35 leading-relaxed max-w-[600px] mx-auto mb-10">
              The average small farm misses $12,000+ in USDA payments every year. HarvestFile finds what you qualify for and tells you exactly what to do.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={240}>
            <div className="inline-flex items-center rounded-[14px] p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setBilling("monthly")} className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 cursor-pointer" style={{ background: billing === "monthly" ? "rgba(255,255,255,0.08)" : "transparent", color: billing === "monthly" ? "#fff" : "rgba(255,255,255,0.35)", border: "none" }}>Monthly</button>
              <button onClick={() => setBilling("annual")} className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-2" style={{ background: billing === "annual" ? "rgba(255,255,255,0.08)" : "transparent", color: billing === "annual" ? "#fff" : "rgba(255,255,255,0.35)", border: "none" }}>
                Annual
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>SAVE 20%</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-5 sm:px-6 pb-16 sm:pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {TIERS.map((tier, idx) => {
            const monthly = tier.monthly ?? 0;
            const displayPrice = billing === "annual" && tier.monthly ? Math.round(monthly * 0.8) : monthly;
            const annualTotal = tier.monthly ? Math.round(monthly * 12 * 0.8) : 0;

            return (
              <ScrollReveal key={tier.name} delay={idx * 80}>
                <div className="relative rounded-[20px] p-6 sm:p-7 flex flex-col h-full transition-all duration-300 hover:translate-y-[-2px]" style={{ background: tier.highlighted ? "linear-gradient(180deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.02) 100%)" : "rgba(255,255,255,0.02)", border: tier.highlighted ? "1.5px solid rgba(201,168,76,0.2)" : "1px solid rgba(255,255,255,0.06)", boxShadow: tier.highlighted ? "0 0 60px -20px rgba(201,168,76,0.12)" : "none" }}>
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap" style={{ background: "linear-gradient(135deg, #9E7E30, #C9A84C)", color: "#0C1F17" }}>{tier.badge}</span>
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="text-white font-bold text-[17px] mb-1">{tier.name}</h3>
                    <p className="text-[12px] text-white/25 leading-relaxed">{tier.description}</p>
                  </div>
                  <div className="mb-6">
                    {tier.monthly !== null ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[38px] font-extrabold text-white tracking-[-0.04em]" style={{ fontVariantNumeric: "tabular-nums" }}>${displayPrice}</span>
                          <span className="text-[13px] text-white/25 font-medium">/mo</span>
                        </div>
                        {billing === "annual" && (
                          <p className="text-[11px] text-[#C9A84C]/60 mt-0.5 font-semibold">${annualTotal}/yr &mdash; save ${Math.round(monthly * 12 * 0.2)}</p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-[38px] font-extrabold text-white tracking-[-0.04em]">Custom</span>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[12px] text-white/45 leading-relaxed">
                        <Check gold={tier.highlighted} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {renderCta(tier)}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-center gap-5 sm:gap-6 flex-wrap text-[11px] text-white/15">
          {["No credit card required", "Cancel anytime", "Your data stays yours", "All trials get Pro features"].map((t) => (
            <span key={t} className="flex items-center gap-1.5"><Check />{t}</span>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-[12px] text-white/20 max-w-[500px] mx-auto leading-relaxed">Every trial includes full Pro features for 14 days. After your trial, choose the plan that fits your operation. No credit card needed to start.</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[700px] px-5 sm:px-6 pb-16 sm:pb-24">
        <ScrollReveal>
          <div className="rounded-[20px] p-7 sm:p-10 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[12px] font-bold text-[#C9A84C]/60 uppercase tracking-wider mb-3">Always Free &middot; No Account Required</div>
            <h3 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] mb-3">14 Free Tools for Every Farmer</h3>
            <p className="text-[14px] text-white/30 leading-relaxed max-w-[520px] mx-auto mb-6">Morning Dashboard, Cash Flow Forecaster, Farm Score, Breakeven Calculator, Commodity Markets, Insurance Calculator, Election Optimizer, ARC/PLC Calculator, Ag Weather Dashboard, Spray Window Calculator, Payment Scanner, Base Acre Analyzer, SDRP Checker, and Policy Calendar &mdash; all free, forever.</p>
            <Link href="/check" className="inline-flex items-center gap-2 px-7 py-3 rounded-[12px] text-[14px] font-bold no-underline transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", color: "#C9A84C" }}>Try the Free Calculator &rarr;</Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="relative z-10">
        <div className="mx-auto max-w-[400px] px-8 mb-12 sm:mb-16">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)" }} />
        </div>
        <div className="mx-auto max-w-[640px] px-5 sm:px-6 pb-16 sm:pb-24">
          <ScrollReveal>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] text-center mb-8 sm:mb-10">Frequently asked questions</h2>
          </ScrollReveal>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <ScrollReveal key={i} delay={i * 60}>
                <div className="rounded-[14px] overflow-hidden transition-all duration-200" style={{ border: openFaq === i ? "1px solid rgba(201,168,76,0.15)" : "1px solid rgba(255,255,255,0.06)", background: openFaq === i ? "rgba(201,168,76,0.03)" : "rgba(255,255,255,0.02)" }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex items-center justify-between w-full px-5 py-4 cursor-pointer text-left bg-transparent border-none transition-colors" style={{ color: openFaq === i ? "#C9A84C" : "rgba(255,255,255,0.7)" }}>
                    <span className="text-[14px] font-semibold pr-4">{faq.q}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform duration-200" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)", color: "rgba(255,255,255,0.2)" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: openFaq === i ? "300px" : "0px", opacity: openFaq === i ? 1 : 0 }}>
                    <div className="px-5 pb-4 text-[13px] text-white/35 leading-relaxed">{faq.a}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-24 sm:pb-32">
        <div className="mx-auto max-w-[400px] px-8 mb-16 sm:mb-20">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)" }} />
        </div>
        <div className="mx-auto max-w-[600px] px-5 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-[24px] sm:text-[32px] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">Every day without HarvestFile is money left in Washington</h2>
            <p className="text-[15px] text-white/30 leading-relaxed max-w-[460px] mx-auto mb-8">Join the farmers who are finally getting every dollar they earned. Start your free trial in under 60 seconds.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 px-10 py-4 rounded-[14px] text-[16px] font-bold no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(201,168,76,0.3)] active:scale-[0.98] active:duration-75" style={{ background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)", backgroundSize: "200% auto", animation: "hf-shimmer 3s linear infinite", color: "#0C1F17", boxShadow: "0 6px 28px rgba(201,168,76,0.2)" }}>
              Start Your Free 14-Day Trial &rarr;
            </Link>
            <p className="text-[11px] text-white/15 mt-4">No credit card required &middot; Cancel anytime &middot; Plans from $29/month</p>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
