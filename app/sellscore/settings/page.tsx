// app/sellscore/settings/page.tsx
// =============================================================================
// Sell Score Settings page (server component, M-02, May 18, 2026)
//
// Minimum-viable settings page that earns the Settings tab's existence.
// Four sections: Account, Farm, Subscription, Sign out. Read-only at v1.
// Editing capabilities (name, email change, password reset, notification
// preferences) defer to v1.1 once the Coverage Optimizer ports back from
// /dashboard in Phase 2 (August).
//
// Auth chain matches /sellscore/me:
//   auth.uid() -> farms.owner_id (short, sellscore-style)
// Plus a professionals lookup by auth_id for the display name.
//
// Manage subscription is a Link to /api/stripe/portal. That endpoint
// creates a Stripe Customer Portal session and redirects. If the user
// has no Stripe customer_id (shouldn't happen for an active Sell Score
// subscriber, but defensive), the portal endpoint will surface its own
// error rather than this page failing silently.
//
// Typography: 18px floor for all body/label/value text per the 58+
// demographic constraint. Section headers use larger sizes. The same
// dark mode palette as /sellscore/me (#0a0f0d page, #131918 cards).
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/sellscore/SignOutButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function SellScoreSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/sellscore/settings');

  // Professional record for name display
  const { data: professional } = await supabase
    .from('professionals')
    .select('full_name, email')
    .eq('auth_id', user.id)
    .maybeSingle();

  // Farm record for farm/subscription display
  const { data: farm } = await supabase
    .from('farms')
    .select(
      'id, name, county_fips, state, sellscore_active, subscription_status',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayName = professional?.full_name ?? 'Not set';
  const displayEmail = user.email ?? professional?.email ?? 'Not provided';
  const farmName = farm?.name ?? 'Not set';
  const farmState = farm?.state ?? 'Not set';
  const subscriptionStatus = formatSubscriptionStatus(
    farm?.subscription_status,
    farm?.sellscore_active,
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f0d',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#E8F0EB',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '32px 20px 64px',
        }}
      >
        {/* Page header */}
        <header style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: '#E8F0EB',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Settings
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(232, 240, 235, 0.65)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Manage your account, farm, and subscription.
          </p>
        </header>

        {/* Account section */}
        <Section title="Account">
          <Field label="Name" value={displayName} />
          <Field label="Email" value={displayEmail} />
        </Section>

        {/* Farm section */}
        <Section title="Farm">
          <Field label="Farm name" value={farmName} />
          <Field label="State" value={farmState} />
        </Section>

        {/* Subscription section */}
        <Section title="Subscription">
          <Field label="Plan" value="Sell Score" />
          <Field label="Status" value={subscriptionStatus} />
          <div style={{ marginTop: '20px' }}>
            <Link
              href="/api/stripe/portal"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '48px',
                padding: '0 20px',
                backgroundColor: '#34D399',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0a0f0d',
                textDecoration: 'none',
                letterSpacing: '-0.005em',
              }}
            >
              Manage subscription
            </Link>
          </div>
        </Section>

        {/* Sign out section */}
        <Section title="Session">
          <SignOutButton />
        </Section>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-views
// =============================================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: '24px',
        padding: '24px 20px',
        backgroundColor: '#131918',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '14px',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: '#E8F0EB',
          margin: 0,
          marginBottom: '18px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '18px',
          fontWeight: 500,
          color: 'rgba(232, 240, 235, 0.55)',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '18px',
          fontWeight: 500,
          color: '#E8F0EB',
          letterSpacing: '-0.005em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatSubscriptionStatus(
  rawStatus: string | null | undefined,
  isActive: boolean | null | undefined,
): string {
  if (isActive === false) return 'Canceled';
  if (!rawStatus) return isActive ? 'Active' : 'Unknown';
  switch (rawStatus) {
    case 'active':
    case 'trialing':
      return 'Active';
    case 'past_due':
      return 'Past due';
    case 'canceled':
      return 'Canceled';
    case 'unpaid':
      return 'Unpaid';
    case 'incomplete':
    case 'incomplete_expired':
      return 'Incomplete';
    default:
      return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  }
}
