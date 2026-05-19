// components/sellscore/ManageSubscriptionButton.tsx
// =============================================================================
// Manage Subscription button for the Sell Score Settings page
// Client component, M-02c, May 18, 2026.
//
// /api/stripe/portal is POST-only and returns JSON of shape:
//   { "url": "https://billing.stripe.com/p/session/..." }
//
// A native form POST hits the endpoint successfully but the browser
// renders the JSON body instead of navigating, because the endpoint
// does not return a 303 redirect. Production verification on
// /sellscore/settings exposed this. The fix is a small client
// component that POSTs via fetch, reads the URL from JSON, and sets
// window.location.href so the browser navigates to Stripe.
//
// The /api/stripe/portal endpoint is left unmodified because other
// callers in the codebase may depend on the JSON response shape.
// =============================================================================

'use client';

import { useState } from 'react';

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(
          `Portal request failed (HTTP ${response.status}). Try again or contact support.`,
        );
      }
      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error(
          'No portal URL returned. Your account may be missing a Stripe customer record. Contact support.',
        );
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('[manage-subscription] failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to open subscription portal.',
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '48px',
          padding: '0 20px',
          backgroundColor: loading ? 'rgba(52, 211, 153, 0.50)' : '#34D399',
          border: 'none',
          borderRadius: '10px',
          fontSize: '18px',
          fontWeight: 600,
          color: '#0a0f0d',
          cursor: loading ? 'not-allowed' : 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          fontFamily:
            '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          letterSpacing: '-0.005em',
          transition: 'background-color 120ms ease',
        }}
      >
        {loading ? 'Opening Stripe...' : 'Manage subscription'}
      </button>
      {error && (
        <p
          style={{
            fontSize: '18px',
            color: 'rgba(248, 113, 113, 0.92)',
            lineHeight: 1.4,
            marginTop: '12px',
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
