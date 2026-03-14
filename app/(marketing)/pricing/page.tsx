'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PRICING_TIERS } from '@/types';
import Link from 'next/link';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handleSubscribe = async (tier: string) => {
    if (tier === 'free') {
      window.location.href = '/check';
      return;
    }

    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@harvestfile.com?subject=Enterprise%20Inquiry';
      return;
    }

    setLoading(tier);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — redirect to signup with return URL
        window.location.href = '/login?redirect=/pricing&upgrade=pro';
        return;
      }

      // Create Stripe Checkout session
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceType: billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly',
        }),
      });

      const { url, error } = await res.json();

      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d]">
      {/* ── Nav ── */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              HarvestFile
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/check"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Free Screener
            </Link>
            <Link
              href="/login"
              className="text-sm bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium tracking-wide uppercase">
            14-day free trial on Pro
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
          Stop leaving{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            money on the table
          </span>
        </h1>

        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          The average small farm misses $12,000+ in USDA payments every year.
          HarvestFile finds what you qualify for and tells you exactly what to do.
        </p>

        {/* ── Billing Toggle ── */}
        <div className="inline-flex items-center bg-white/5 rounded-xl p-1 mb-16">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              billingCycle === 'annual'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Annual
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* ── Pricing Cards ── */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.tier}
              className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/30 shadow-[0_0_60px_-20px_rgba(16,185,129,0.2)]'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-semibold text-lg mb-1">
                  {tier.name}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <div className="mb-8">
                {tier.price !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">
                      {tier.price === 0
                        ? '$0'
                        : `$${billingCycle === 'annual' ? Math.round(tier.price * 0.8) : tier.price}`}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-white/30 text-sm">/month</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-white">
                      Custom
                    </span>
                  </div>
                )}
                {billingCycle === 'annual' && tier.price && tier.price > 0 && (
                  <p className="text-emerald-400 text-xs mt-1">
                    ${tier.price * 12 * 0.8}/year — save ${tier.price * 12 * 0.2}
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <svg
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        tier.highlighted ? 'text-emerald-400' : 'text-white/30'
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.tier)}
                disabled={loading === tier.tier}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  tier.highlighted
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30'
                    : tier.tier === 'enterprise'
                    ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tier.tier ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  tier.cta
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social Proof / Trust Strip ── */}
      <div className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-8">
            Built for the farmers who feed America
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '50', label: 'States Covered' },
              { value: '3,000+', label: 'Counties' },
              { value: '7', label: 'USDA Programs' },
              { value: '$12K+', label: 'Avg. Missed Annually' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-white text-center mb-12">
            Common Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'What happens during the 14-day trial?',
                a: 'You get full access to every Pro feature — unlimited reports, saved farm operations, price alerts, the works. No credit card charged until day 15.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from your dashboard with one click. No contracts, no penalties. Your data stays accessible on the free tier.',
              },
              {
                q: 'What does the AI report include?',
                a: 'A personalized analysis of your operation covering ARC-CO vs PLC recommendations, EQIP/CRP/CSP eligibility, estimated payment projections, and step-by-step enrollment instructions.',
              },
              {
                q: "I'm a Farm Credit lender. What's the Enterprise plan?",
                a: 'Enterprise gives you multi-producer management, branded client reports, bulk CSV import, API access, and a dedicated account manager. Contact us to discuss your portfolio size.',
              },
              {
                q: 'Is my farm data secure?',
                a: 'Your data is encrypted in transit and at rest. We use Supabase with row-level security — every query is scoped to your user ID. We never sell or share your data.',
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group border border-white/10 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm hover:bg-white/[0.02] transition-colors">
                  {faq.q}
                  <svg
                    className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-white/50 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Every day without HarvestFile is money left in Washington
          </h2>
          <p className="text-white/40 mb-8 max-w-lg mx-auto">
            Join the farmers who are finally getting every dollar they earned.
            Start your free trial in under 60 seconds.
          </p>
          <button
            onClick={() => handleSubscribe('pro')}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 transition-all duration-200 text-sm"
          >
            Start Your Free 14-Day Trial →
          </button>
        </div>
      </div>
    </div>
  );
}
