// =============================================================================
// HarvestFile — Founding Farmer Success Page
// Route: /founding-farmer/success?session_id={CHECKOUT_SESSION_ID}
//
// Landing page after a successful Stripe Checkout payment. Server-verifies
// the session, shows a celebratory welcome state, and instructs the user
// to check their email for a magic link login.
//
// SECURITY: We verify the session server-side by calling Stripe directly.
// This prevents someone from typing the URL with a fake session_id and
// seeing a success state without actually paying.
//
// FAILURE STATES HANDLED:
//   - No session_id in query params → "Invalid link" state
//   - Session ID doesn't exist in Stripe → "Session not found" state
//   - Session exists but payment_status !== 'paid' → "Payment not complete" state
//   - Session valid and paid → Welcome success state
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export const metadata: Metadata = {
  title: "You're in — Welcome, Founding Farmer | HarvestFile",
  description: 'Your Founding Farmer subscription is active. Check your email for your login link.',
  robots: {
    index: false, // Success pages should never be indexed
    follow: false,
  },
};

// Disable all caching — this page is user-specific and transactional
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HarvestFile Brand Logo — inline SVG (matches founding-farmer-client.tsx)
// ─────────────────────────────────────────────────────────────────────────────
function HFLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1B4332" />
      <path d="M12 28L20 12L28 20" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2.5" fill="#C9A84C" opacity="0.5" />
      <circle cx="20" cy="12" r="2.5" fill="#C9A84C" />
      <circle cx="28" cy="20" r="2.5" fill="#C9A84C" opacity="0.7" />
      <path d="M20 24V32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M17 27L20 24L23 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout wrapper used by all states (success and error)
// ─────────────────────────────────────────────────────────────────────────────
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#1B4332]/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#C9A84C]/8 blur-[100px]" />
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-xl w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error state — used for all failure cases
// ─────────────────────────────────────────────────────────────────────────────
function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <PageWrapper>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 sm:p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white/90 mb-3" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>
          {title}
        </h1>
        <p className="text-base text-white/50 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/founding-farmer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0a0f0d] hover:shadow-[0_0_30px_rgba(201,168,76,0.25)] transition-all"
          >
            Back to Founding Farmer
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-colors"
          >
            Go to Home
          </Link>
        </div>
        <p className="mt-8 text-xs text-white/30">
          If you completed a payment and are seeing this, please contact{' '}
          <a href="mailto:hello@harvestfile.com" className="text-[#C9A84C] hover:text-[#E2C366] transition-colors">
            hello@harvestfile.com
          </a>{' '}
          and we&apos;ll sort it out immediately.
        </p>
      </div>
    </PageWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success state — the happy path
// ─────────────────────────────────────────────────────────────────────────────
function SuccessState({ email, billingPeriod }: { email: string; billingPeriod: string }) {
  const priceLabel = billingPeriod === 'annual' ? '$79/year' : '$9/month';

  return (
    <PageWrapper>
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <HFLogo size={72} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[#C9A84C]">
            Payment Confirmed
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.03em] leading-[1.08] mb-6"
          style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}
        >
          <span className="text-white/90">You&apos;re in.</span>
          <br />
          <span className="text-[#C9A84C]">Welcome, Founding Farmer.</span>
        </h1>

        {/* Subhead */}
        <p className="text-lg sm:text-xl text-white/50 max-w-lg mx-auto leading-relaxed mb-10">
          Your {priceLabel} subscription is active and your founding rate is locked in{' '}
          <span className="text-white/80 font-semibold">forever</span>. Even when prices go up for everyone else, yours never will.
        </p>

        {/* Next steps card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 text-left mb-8">
          <h2 className="text-sm font-bold text-[#C9A84C] uppercase tracking-wider mb-5">
            What happens next
          </h2>
          <ol className="space-y-5">
            <li className="flex gap-4">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#C9A84C] text-[#0a0f0d] font-bold text-sm flex items-center justify-center">
                1
              </div>
              <div>
                <p className="text-white/85 text-sm font-semibold mb-1">Check your email</p>
                <p className="text-white/45 text-xs leading-relaxed">
                  We just sent a welcome email to{' '}
                  <span className="text-white/70 font-mono">{email}</span> with a magic login link. No password needed — one click and you&apos;re in.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#C9A84C]/40 text-[#0a0f0d] font-bold text-sm flex items-center justify-center">
                2
              </div>
              <div>
                <p className="text-white/85 text-sm font-semibold mb-1">Explore the platform</p>
                <p className="text-white/45 text-xs leading-relaxed">
                  All 16 free tools are live and ready. Start with the ARC/PLC calculator or the Morning Dashboard — both are tuned to your county the moment you log in.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#C9A84C]/20 text-[#0a0f0d] font-bold text-sm flex items-center justify-center">
                3
              </div>
              <div>
                <p className="text-white/85 text-sm font-semibold mb-1">Get your receipt</p>
                <p className="text-white/45 text-xs leading-relaxed">
                  Stripe has sent a payment receipt to your inbox. Save it for your records — HarvestFile is a business expense.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Email hint banner */}
        <div className="rounded-xl bg-[#1B4332]/30 border border-[#2D6A4F]/40 p-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6FCF97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#6FCF97] mb-1">Don&apos;t see the email?</p>
              <p className="text-xs text-white/50 leading-relaxed">
                It should arrive within 60 seconds. Check your spam folder and look for an email from{' '}
                <span className="text-white/70 font-mono">hello@mail.harvestfile.com</span>. Still nothing? Reply to any HarvestFile email or contact{' '}
                <a href="mailto:hello@harvestfile.com" className="text-[#C9A84C] hover:text-[#E2C366] transition-colors">
                  hello@harvestfile.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-colors"
          >
            Return to Home
          </Link>
          <Link
            href="/check"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-colors"
          >
            Try the ARC/PLC Calculator
          </Link>
        </div>

        {/* Footer brand */}
        <p className="mt-12 text-xs text-white/25">
          HarvestFile LLC · Akron, Ohio · Built by farmers, for farmers
        </p>
      </div>
    </PageWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component — server-side session verification
// ─────────────────────────────────────────────────────────────────────────────
export default async function FoundingFarmerSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  // ── Failure state 1: No session_id in URL ────────────────────────────────
  if (!sessionId) {
    return (
      <ErrorState
        title="Invalid link"
        message="This success page requires a valid checkout session. It looks like you arrived here without completing a purchase."
      />
    );
  }

  // ── Fetch and verify the session from Stripe ─────────────────────────────
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err: any) {
    console.error('[FoundingFarmerSuccess] Failed to retrieve session:', err);

    // Failure state 2: Session ID doesn't exist or Stripe error
    return (
      <ErrorState
        title="Session not found"
        message="We couldn't find your checkout session. If you just completed a payment, please wait a moment and refresh this page. If the problem persists, contact us — we'll track it down."
      />
    );
  }

  // ── Failure state 3: Session exists but payment wasn't completed ─────────
  if (session.payment_status !== 'paid') {
    return (
      <ErrorState
        title="Payment not complete"
        message={`Your checkout session was found, but payment status is "${session.payment_status}". If you were charged, please contact us and we'll resolve it right away.`}
      />
    );
  }

  // ── Failure state 4: Session is paid but metadata is wrong ───────────────
  // Defensive check: confirm this was a Founding Farmer checkout specifically.
  if (session.metadata?.tier !== 'founding') {
    return (
      <ErrorState
        title="Wrong checkout type"
        message="This checkout session doesn't appear to be a Founding Farmer purchase. If you completed a payment and believe this is an error, please contact us."
      />
    );
  }

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  const email = session.metadata?.founding_farmer_email || session.customer_details?.email || 'your email';
  const billingPeriod = session.metadata?.billing_period || 'monthly';

  return <SuccessState email={email} billingPeriod={billingPeriod} />;
}