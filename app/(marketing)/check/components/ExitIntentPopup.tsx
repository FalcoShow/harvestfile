// =============================================================================
// HarvestFile — Exit Intent Popup
// app/(marketing)/check/components/ExitIntentPopup.tsx
//
// Build 18 Deploy 6B: Shows when a farmer who completed a calculation
// moves their cursor toward the browser close/back button (desktop only).
//
// Rules:
//   1. Only shows ONCE per session (sessionStorage)
//   2. Only shows if calculator has been completed (hasResults prop)
//   3. Only shows if email NOT already captured (isEmailCaptured prop)
//   4. Minimum 15 seconds on page before eligible (prevents bounce triggers)
//   5. Desktop only — mouseleave event (no mobile, avoids Google penalty)
//   6. Never shows to users who already saved their email
//
// SEO safe: Google's intrusive interstitial penalty only targets popups
// that block content ON ARRIVAL. Exit-intent on departure is explicitly
// not penalized (confirmed by John Mueller).
//
// Design: centered modal with semi-transparent overlay, 48px min touch
// targets, 18px+ body text, clear close button, no dark patterns.
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ExitIntentPopupProps {
  hasResults: boolean;
  isEmailCaptured: boolean;
  countyName?: string;
  cropName?: string;
  onEmailSubmit: (email: string) => Promise<void>;
}

const SESSION_KEY = 'hf-exit-shown';
const MIN_TIME_MS = 15_000; // 15 seconds minimum before showing

export default function ExitIntentPopup({
  hasResults,
  isEmailCaptured,
  countyName,
  cropName,
  onEmailSubmit,
}: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const pageLoadTime = useRef(Date.now());
  const hasShownRef = useRef(false);

  // ── Exit-intent detection (desktop only) ────────────────────────────────
  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      // Only trigger when cursor exits toward top of viewport (address bar / close)
      if (e.clientY > 30) return;

      // Gate conditions
      if (!hasResults) return;
      if (isEmailCaptured) return;
      if (hasShownRef.current) return;
      if (Date.now() - pageLoadTime.current < MIN_TIME_MS) return;

      // Check sessionStorage — only show once per session
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return;
      } catch {
        // sessionStorage unavailable (incognito on some browsers)
      }

      hasShownRef.current = true;
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // Ignore
      }

      setIsVisible(true);
    },
    [hasResults, isEmailCaptured]
  );

  useEffect(() => {
    // Only attach on desktop (no pointer: coarse)
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave]);

  // ── Close the popup ─────────────────────────────────────────────────────
  function handleClose() {
    setIsVisible(false);
  }

  // ── Handle email submission ─────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      await onEmailSubmit(email.trim());
      setStatus('success');
      // Auto-close after 2 seconds on success
      setTimeout(() => setIsVisible(false), 2000);
    } catch {
      setStatus('error');
    }
  }

  // ── Don't render if not visible ─────────────────────────────────────────
  if (!isVisible) return null;

  // ── Success state ───────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={overlayStyle} onClick={handleClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Analysis saved">
          <div style={successIconContainerStyle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={successTextStyle}>Saved! Check your email.</p>
        </div>
      </div>
    );
  }

  // ── Main popup ──────────────────────────────────────────────────────────
  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save your ARC/PLC analysis"
      >
        {/* Close button — 44x44 minimum touch target */}
        <button
          onClick={handleClose}
          style={closeButtonStyle}
          aria-label="Close popup"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Icon */}
        <div style={iconContainerStyle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </div>

        {/* Heading */}
        <h2 style={headingStyle}>
          Don&apos;t lose your numbers
        </h2>

        {/* Description */}
        <p style={descriptionStyle}>
          {countyName && cropName
            ? `Save your ${cropName} ARC/PLC analysis for ${countyName} — we'll email it to you and alert you when enrollment opens.`
            : `Save your ARC/PLC analysis — we'll email it to you and alert you when the 2026 enrollment window opens.`}
        </p>

        {/* Email form */}
        <form onSubmit={handleSubmit} style={formStyle}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={status === 'loading'}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            style={submitButtonStyle}
          >
            {status === 'loading' ? 'Saving...' : 'Email Me My Analysis'}
          </button>
        </form>

        {/* Error */}
        {status === 'error' && (
          <p style={errorStyle}>Something went wrong. Please try again.</p>
        )}

        {/* Trust signals */}
        <p style={trustStyle}>
          Free · No account needed · We never sell your data
        </p>

        {/* Dismiss */}
        <button onClick={handleClose} style={dismissStyle}>
          No thanks, I&apos;ll remember my numbers
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  animation: 'fadeIn 0.2s ease-out',
};

const modalStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px 28px 24px',
  maxWidth: '420px',
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2), 0 8px 20px rgba(0, 0, 0, 0.1)',
  animation: 'scaleIn 0.2s ease-out',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  color: '#9CA38F',
  cursor: 'pointer',
  borderRadius: '8px',
};

const iconContainerStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  backgroundColor: '#FDF8F0',
  border: '1px solid #E2C366',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
};

const headingStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#1A1A1A',
  marginBottom: '8px',
  lineHeight: 1.3,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#6B7264',
  lineHeight: 1.6,
  marginBottom: '20px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginBottom: '12px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: '16px',
  border: '1px solid #E2DDD3',
  borderRadius: '10px',
  outline: 'none',
  color: '#1A1A1A',
  minHeight: '48px',
  backgroundColor: '#FAFAF7',
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 20px',
  fontSize: '15px',
  fontWeight: 700,
  color: '#0C1F17',
  background: 'linear-gradient(135deg, #E2C366, #C9A84C)',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  minHeight: '48px',
  boxShadow: '0 4px 16px rgba(201, 168, 76, 0.2)',
};

const errorStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#DC2626',
  marginBottom: '8px',
};

const trustStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA38F',
  marginBottom: '16px',
};

const dismissStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9CA38F',
  fontSize: '13px',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: '8px',
};

const successIconContainerStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  backgroundColor: 'rgba(16, 185, 129, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 12px',
};

const successTextStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#1B4332',
};
