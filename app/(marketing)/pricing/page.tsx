"use client";

// =============================================================================
// HarvestFile — /pricing Page (Complete Redesign)
// Phase 11 Build 1: Premium Pricing Page
//
// Dark forest green + gold brand system matching homepage and /check.
// Three tiers: Pro $49/mo, Team $149/mo, Enterprise (custom).
// Monthly/Annual toggle with 20% savings.
// Gold shimmer CTA, grain texture, scroll-reveal animations.
// FAQ accordion, trust badges, final CTA.
// =============================================================================

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Tier Data ──────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: "Pro",
    monthly: 49,
    description: "Everything you need to optimize your farm program elections and maximize payments.",
    features: [
      "ARC/PLC decision calculator",
      "Save unlimited farm operations",
      "Unlimited AI-generated reports",
      "Price & deadline alerts",
      "Cross-program optimization engine",
      "County-level yield data (NASS)",
      "Export reports as PDF",
      "Email support",
    ],
    cta: "Start 14-Day Free Trial",
    href: "/signup",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Team",
    monthly: 149,
    description: "For ag consultants and crop insurance agents managing multiple producers.",
    features: [
      "Everything in Pro",
      "Manage up to 25 producers",
      "Branded client reports",
      "Bulk operations import (CSV)",
      "Team member accounts (up to 3)",
      "Priority support",
      "Client portfolio analytics",
      "Quarterly market briefings",
    ],
    cta: "Start 14-Day Free Trial",
    href: "/signup",
    highlighted: false,
    badge: null,
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
    cta: "Contact Sales",
    href: "mailto:hello@harvestfile.com",
    highlighted: false,
    badge: null,
  },
];

const FAQS = [
  {
    q: "Is there really a free calculator?",
    a: "Yes. The ARC/PLC comparison calculator at /check is 100% free, uses real USDA county data, and requires no registration. It's free forever — no catch.",
  },
  {
    q: "What does the 14-day trial include?",
    a: "Full access to everything in your chosen plan. No credit card required to start. If you don't subscribe after 14 days, your data is saved and waiting for when you're ready.",
  },
  {
    q: "Can I switch between monthly and annual?",
    a: "Yes. You can switch at any time from your dashboard settings. When switching to annual, you'll get a prorated credit for the remainder of your current billing period.",
  },
  {
    q: "I'm a Farm Credit lender. What's the Enterprise plan?",
    a: "Enterprise gives you unlimited producer management, white-label client reports, API access, and a dedicated account manager. Email hello@harvestfile.com to discuss your portfolio.",
  },
  {
    q: "Is my farm data secure?",
    a: "Your data is encrypted in transit and at rest. We use Supabase with row-level security — every query is scoped to your organization. We never sell or share your data with third parties.",
  },
  {
    q: "What makes this different from university spreadsheets?",
    a: "Those tools require you to find and input county-specific USDA data yourself. HarvestFile pulls it automatically for 3,000+ counties, runs the same formulas, and gives you a shareable result in 60 seconds. Plus multi-year projections, scenario modeling, and AI-powered reports.",
  },
];

// ─── Scroll Reveal ──────────────────────────────────────────────────────────

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

// ─── Check Icon ─────────────────────────────────────────────────────────────

function Check({ gold }: { gold?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gold ? "#C9A84C" : "rgba(255,255,255,0.3)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: "#0C1F17" }}>
      {/* Grain texture */}
      <div className="hf-grain" style={{ opacity: 0.035, zIndex: 1 }} />

      {/* ═══════════════════════════════════════════════════════════════
           HERO SECTION
           ═══════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 sm:pt-40 pb-8 sm:pb-12">
        {/* Ambient gold glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(201,168,76,0.06) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 mx-auto max-w-[900px] px-5 sm:px-6 text-center">
          {/* Badge */}
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              <span className="text-[11px] font-bold text-[#C9A84C] uppercase tracking-wider">
                14-Day Free Trial · No Credit Card Required
              </span>
            </div>
          </ScrollReveal>

          {/* Headline */}
          <ScrollReveal delay={80}>
            <h1
              className="text-[clamp(32px,6vw,56px)] font-extrabold text-white tracking-[-0.04em] leading-[1.05] mb-5"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Stop leaving{" "}
              <span className="text-[#C9A84C]" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
                money on the table
              </span>
            </h1>
          </ScrollReveal>

          {/* Subheadline */}
          <ScrollReveal delay={160}>
            <p className="text-[16px] sm:text-[18px] text-white/35 leading-relaxed max-w-[600px] mx-auto mb-10">
              The average small farm misses $12,000+ in USDA payments every year.
              HarvestFile finds what you qualify for and tells you exactly what to do.
            </p>
          </ScrollReveal>

          {/* Billing toggle */}
          <ScrollReveal delay={240}>
            <div className="inline-flex items-center rounded-[14px] p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => setBilling("monthly")}
                className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 cursor-pointer"
                style={{
                  background: billing === "monthly" ? "rgba(255,255,255,0.08)" : "transparent",
                  color: billing === "monthly" ? "#fff" : "rgba(255,255,255,0.35)",
                  border: "none",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-2"
                style={{
                  background: billing === "annual" ? "rgba(255,255,255,0.08)" : "transparent",
                  color: billing === "annual" ? "#fff" : "rgba(255,255,255,0.35)",
                  border: "none",
                }}
              >
                Annual
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                  SAVE 20%
                </span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
           PRICING CARDS
           ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-[1100px] px-5 sm:px-6 pb-20 sm:pb-28">
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {TIERS.map((tier, idx) => {
            const monthly = tier.monthly ?? 0;
            const displayPrice = billing === "annual" && tier.monthly ? Math.round(monthly * 0.8) : monthly;
            const annualTotal = tier.monthly ? Math.round(monthly * 12 * 0.8) : 0;

            return (
              <ScrollReveal key={tier.name} delay={idx * 100}>
                <div
                  className="relative rounded-[20px] p-7 sm:p-8 flex flex-col h-full transition-all duration-300 hover:translate-y-[-2px]"
                  style={{
                    background: tier.highlighted
                      ? "linear-gradient(180deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.02) 100%)"
                      : "rgba(255,255,255,0.02)",
                    border: tier.highlighted
                      ? "1.5px solid rgba(201,168,76,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: tier.highlighted
                      ? "0 0 60px -20px rgba(201,168,76,0.12)"
                      : "none",
                  }}
                >
                  {/* Badge */}
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider" style={{ background: "linear-gradient(135deg, #9E7E30, #C9A84C)", color: "#0C1F17" }}>
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  {/* Tier name + description */}
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-[18px] mb-1.5">{tier.name}</h3>
                    <p className="text-[13px] text-white/30 leading-relaxed">{tier.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-7">
                    {tier.monthly !== null ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[44px] font-extrabold text-white tracking-[-0.04em]" style={{ fontVariantNumeric: "tabular-nums" }}>
                            ${displayPrice}
                          </span>
                          <span className="text-[14px] text-white/25 font-medium">/month</span>
                        </div>
                        {billing === "annual" && (
                          <p className="text-[12px] text-[#C9A84C]/70 mt-1 font-semibold">
                            ${annualTotal}/year — save ${Math.round(monthly * 12 * 0.2)}/yr
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-[44px] font-extrabold text-white tracking-[-0.04em]">Custom</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-[13px] text-white/50 leading-relaxed">
                        <Check gold={tier.highlighted} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={tier.href}
                    className="flex items-center justify-center w-full py-3.5 rounded-[12px] text-[14px] font-bold transition-all duration-200 no-underline hover:-translate-y-0.5 active:scale-[0.98] active:duration-75"
                    style={
                      tier.highlighted
                        ? {
                            background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)",
                            backgroundSize: "200% auto",
                            animation: "hf-shimmer 3s linear infinite",
                            color: "#0C1F17",
                            boxShadow: "0 4px 20px rgba(201,168,76,0.2)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.6)",
                          }
                    }
                  >
                    {tier.cta} →
                  </Link>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Trust line */}
        <div className="mt-10 flex items-center justify-center gap-6 flex-wrap text-[11px] text-white/15">
          {["No credit card required", "Cancel anytime", "Your data stays yours"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
           FREE CALCULATOR CALLOUT
           ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-[700px] px-5 sm:px-6 pb-20 sm:pb-28">
        <ScrollReveal>
          <div
            className="rounded-[20px] p-7 sm:p-10 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-[13px] font-bold text-[#C9A84C]/60 uppercase tracking-wider mb-3">
              Always Free
            </div>
            <h3 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] mb-3">
              ARC/PLC Calculator
            </h3>
            <p className="text-[14px] text-white/30 leading-relaxed max-w-[440px] mx-auto mb-6">
              Compare ARC-CO vs PLC for your county using real USDA data.
              No signup, no email gate, no catch. Free forever.
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
              Try the Free Calculator →
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
           FAQ SECTION
           ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-10">
        {/* Gold separator */}
        <div className="mx-auto max-w-[400px] px-8 mb-12 sm:mb-16">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)" }} />
        </div>

        <div className="mx-auto max-w-[640px] px-5 sm:px-6 pb-16 sm:pb-24">
          <ScrollReveal>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.02em] text-center mb-8 sm:mb-10">
              Frequently asked questions
            </h2>
          </ScrollReveal>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <ScrollReveal key={i} delay={i * 60}>
                <div
                  className="rounded-[14px] overflow-hidden transition-all duration-200"
                  style={{
                    border: openFaq === i ? "1px solid rgba(201,168,76,0.15)" : "1px solid rgba(255,255,255,0.06)",
                    background: openFaq === i ? "rgba(201,168,76,0.03)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-5 py-4 cursor-pointer text-left bg-transparent border-none transition-colors"
                    style={{ color: openFaq === i ? "#C9A84C" : "rgba(255,255,255,0.7)" }}
                  >
                    <span className="text-[14px] font-semibold pr-4">{faq.q}</span>
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
                      style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)", color: "rgba(255,255,255,0.2)" }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: openFaq === i ? "300px" : "0px",
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

      {/* ═══════════════════════════════════════════════════════════════
           FINAL CTA
           ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 pb-24 sm:pb-32">
        {/* Gold separator */}
        <div className="mx-auto max-w-[400px] px-8 mb-16 sm:mb-20">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)" }} />
        </div>

        <div className="mx-auto max-w-[600px] px-5 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-[24px] sm:text-[32px] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
              Every day without HarvestFile is money left in Washington
            </h2>
            <p className="text-[15px] text-white/30 leading-relaxed max-w-[460px] mx-auto mb-8">
              Join the farmers who are finally getting every dollar they earned.
              Start your free trial in under 60 seconds.
            </p>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-[14px] text-[16px] font-bold no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(201,168,76,0.3)] active:scale-[0.98] active:duration-75"
              style={{
                background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)",
                backgroundSize: "200% auto",
                animation: "hf-shimmer 3s linear infinite",
                color: "#0C1F17",
                boxShadow: "0 6px 28px rgba(201,168,76,0.2)",
              }}
            >
              Start Your Free 14-Day Trial →
            </Link>

            <p className="text-[11px] text-white/15 mt-4">
              No credit card required · Cancel anytime · $49/month after trial
            </p>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
