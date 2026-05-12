// components/pricing/SellScoreCTA.tsx
// =============================================================================
// HarvestFile Sell Score — Pricing Page CTA
//
// Drop-in client component for the /pricing page. Calls
// /api/stripe/checkout/sellscore and redirects the browser to the returned
// hosted-checkout URL. Used as the primary CTA on /pricing for the $149/yr
// Sell Score Annual product.
//
// Usage:
//   import SellScoreCTA from '@/components/pricing/SellScoreCTA';
//   ...
//   <SellScoreCTA label="Get started" />
//   <SellScoreCTA label="Subscribe — $149/yr" ref="dussel" variant="solid" />
// =============================================================================

'use client';

import { useState } from 'react';

interface SellScoreCTAProps {
  /** Button label */
  label?: string;
  /** Optional referral code that gets attached to the Stripe session metadata */
  ref?: string;
  /** Visual style — 'solid' is the primary emerald button, 'outline' is the secondary border style */
  variant?: 'solid' | 'outline';
  /** Optional override for full-width sizing on mobile */
  fullWidth?: boolean;
}

export default function SellScoreCTA({
  label = 'Get started — $149/yr',
  ref,
  variant = 'solid',
  fullWidth = false,
}: SellScoreCTAProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout/sellscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ref ? { ref } : {}),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        const msg = data.error || 'Could not start checkout. Please try again.';
        setError(msg);
        setIsPending(false);
        return;
      }

      // Redirect to Stripe-hosted checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('[SellScoreCTA] error:', err);
      setError('Network error. Please check your connection and try again.');
      setIsPending(false);
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '56px',
    padding: '0 32px',
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '-0.005em',
    fontFamily:
      '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '12px',
    border: 'none',
    cursor: isPending ? 'wait' : 'pointer',
    transition: 'background-color 180ms ease-out, color 180ms ease-out, border-color 180ms ease-out',
    width: fullWidth ? '100%' : 'auto',
  };

  const solidStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: isPending ? 'rgba(52, 211, 153, 0.55)' : '#34D399',
    color: '#0a0f0d',
  };

  const outlineStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: 'transparent',
    color: '#34D399',
    border: '1px solid #34D399',
  };

  const style = variant === 'solid' ? solidStyle : outlineStyle;

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        style={style}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0d]"
      >
        {isPending ? (
          <>
            <span>Starting checkout...</span>
          </>
        ) : (
          <>
            <span>{label}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: 'rgba(249, 115, 22, 0.10)',
            border: '1px solid rgba(249, 115, 22, 0.30)',
            borderRadius: '8px',
            color: '#F97316',
            fontSize: '13px',
            lineHeight: 1.5,
            maxWidth: '320px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
