// app/onboard/page.tsx
// =============================================================================
// HarvestFile Sell Score — Onboarding Page (server component)
//
// Three render states:
//   1. Authenticated farmer with sellscore_setup_complete=true → redirect /dashboard
//   2. Authenticated farmer with setup incomplete → render OnboardForm
//   3. Unauthenticated visitor with ?session_id query → "Check your email" page
//      (this is the post-Stripe-checkout state; user clicks magic link from
//       email to authenticate, then lands back here without session_id)
//   4. Unauthenticated visitor with no session_id → redirect /pricing
// =============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import OnboardForm from './OnboardForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OnboardPageProps {
  searchParams: Promise<{ session_id?: string; welcome?: string }>;
}

export default async function OnboardPage({ searchParams }: OnboardPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ── State 1 + 2: Authenticated user ──────────────────────────────────────
  if (user) {
    const { data: farm } = await supabase
      .from('farms')
      .select('id, name, sellscore_setup_complete, subscription_status')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Setup already done — go to dashboard
    if (farm?.sellscore_setup_complete) {
      redirect('/dashboard');
    }

    // Authenticated but no farm record yet (webhook still processing)
    // Show the form anyway; the form-submit handler will fail gracefully
    // if the farm isn't yet created. In practice, the webhook fires within
    // ~2 seconds of checkout completion, faster than the user can click
    // the magic link.
    if (!farm) {
      return <PendingProvisioning />;
    }

    // Authenticated farmer with farm record, setup incomplete → render form
    return (
      <OnboardForm
        farmId={farm.id}
        defaultFarmName={farm.name}
        userEmail={user.email ?? ''}
      />
    );
  }

  // ── State 3: Post-Stripe redirect, magic link sent, awaiting click ───────
  if (sessionId) {
    let stripeSessionEmail: string | null = null;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Only treat as valid if it's a paid Sell Score session
      if (
        session.payment_status === 'paid' &&
        session.metadata?.product === 'sellscore_annual'
      ) {
        stripeSessionEmail =
          session.customer_details?.email ??
          (typeof session.customer_email === 'string' ? session.customer_email : null);
      }
    } catch (err) {
      console.error('[onboard] Failed to retrieve Stripe session:', err);
    }

    return <CheckYourEmail email={stripeSessionEmail} />;
  }

  // ── State 4: Unauthenticated, no session_id → redirect to pricing ────────
  redirect('/pricing');
}

// =============================================================================
// Sub-views (server components, kept inline for proximity)
// =============================================================================

function CheckYourEmail({ email }: { email: string | null }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#131918',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          padding: '48px 36px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            backgroundColor: 'rgba(52, 211, 153, 0.12)',
            borderRadius: '16px',
            marginBottom: '24px',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 5L2 7" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: '#E8F0EB',
            letterSpacing: '-0.024em',
            lineHeight: 1.15,
            marginBottom: '12px',
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
          }}
        >
          Check your email
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'rgba(232, 240, 235, 0.70)',
            lineHeight: 1.55,
            marginBottom: '8px',
          }}
        >
          We've sent a sign-in link to{' '}
          <span style={{ color: '#E8F0EB', fontWeight: 600 }}>
            {email ?? 'the email you used at checkout'}
          </span>
          .
        </p>

        <p
          style={{
            fontSize: '15px',
            color: 'rgba(232, 240, 235, 0.50)',
            lineHeight: 1.55,
            marginTop: '16px',
            marginBottom: '0',
          }}
        >
          Click the link to finish setting up your farm. Takes about three
          minutes.
        </p>

        <div
          style={{
            marginTop: '36px',
            padding: '16px 20px',
            backgroundColor: 'rgba(201, 168, 76, 0.06)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
            borderRadius: '10px',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(232, 240, 235, 0.70)',
              lineHeight: 1.5,
              margin: '0',
            }}
          >
            <strong style={{ color: '#E2C366' }}>Don't see it?</strong> Check
            spam, or wait a minute and refresh your inbox. Email may take up to
            two minutes to arrive.
          </p>
        </div>
      </div>
    </div>
  );
}

function PendingProvisioning() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#131918',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 500,
            color: '#E8F0EB',
            letterSpacing: '-0.018em',
            lineHeight: 1.2,
            marginBottom: '12px',
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
          }}
        >
          Setting up your farm...
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'rgba(232, 240, 235, 0.60)',
            lineHeight: 1.55,
            marginBottom: '24px',
          }}
        >
          This usually takes a few seconds. Please refresh the page.
        </p>
        <a
          href="/onboard"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            backgroundColor: '#34D399',
            color: '#0a0f0d',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 600,
            borderRadius: '10px',
            letterSpacing: '-0.005em',
          }}
        >
          Refresh
        </a>
      </div>
    </div>
  );
}
