// =============================================================================
// HarvestFile — Hero Email Capture
// Build 11 Deploy 1: Single-field email capture for daily morning briefing
//
// Client Component — handles form state, submission, and success animation.
// Posts to /api/subscribe/morning.
//
// Design: One input, one button, one line of copy. No friction.
// "Get [County] grain bids at 5 AM — free."
// =============================================================================

'use client';

import { useState, useCallback } from 'react';

interface HeroEmailCaptureProps {
  countyName?: string;
  stateAbbr?: string;
  countyFips?: string;
}

export function HeroEmailCapture({
  countyName,
  stateAbbr,
  countyFips,
}: HeroEmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || status === 'loading') return;

      setStatus('loading');
      setMessage('');

      try {
        const res = await fetch('/api/subscribe/morning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            countyFips: countyFips || null,
            countyName: countyName || null,
            stateAbbr: stateAbbr || null,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'You\'re in. First briefing arrives tomorrow at 5 AM.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Something went wrong. Please try again.');
        }
      } catch {
        setStatus('error');
        setMessage('Connection error. Please try again.');
      }
    },
    [email, status, countyFips, countyName, stateAbbr],
  );

  const locationLabel = countyName && stateAbbr
    ? `${countyName}, ${stateAbbr}`
    : 'your county';

  // Success state
  if (status === 'success') {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-sm font-semibold text-emerald-400">
            {message}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Headline */}
      <p
        className="text-[13px] font-medium mb-3 text-center"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        Get {locationLabel} grain bids delivered at 5 AM — free.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          placeholder="your@email.com"
          required
          autoComplete="email"
          className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: status === 'error'
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : '1px solid rgba(255,255,255,0.1)',
            color: '#F0EDE6',
            fontSize: '16px', // Prevent iOS zoom
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="flex-shrink-0 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #E2C366)',
            color: '#0C1F17',
          }}
        >
          {status === 'loading' ? (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Sending
            </span>
          ) : (
            'Send My Briefing'
          )}
        </button>
      </form>

      {/* Error message */}
      {status === 'error' && message && (
        <p className="text-xs text-red-400 mt-2 text-center">{message}</p>
      )}

      {/* Privacy note */}
      <p className="text-[10px] mt-2.5 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
        One email, every morning. Unsubscribe anytime. We never share your email.
      </p>
    </div>
  );
}
