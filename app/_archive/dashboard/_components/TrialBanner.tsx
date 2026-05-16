// =============================================================================
// HarvestFile — Trial Banner
// Build 3: Trial Gating
//
// Shows a persistent banner for trialing users with countdown.
// Color progression: emerald (14-4 days) → amber (3-2 days) → red (1 day / expired)
// Dismissible when > 3 days remain; non-dismissible in final 3 days
// Also shows payment warning for past_due status
// =============================================================================

'use client';

import { useState } from 'react';
import { useSubscription } from './SubscriptionProvider';
import Link from 'next/link';

export function TrialBanner() {
  const sub = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // ── Past due banner ─────────────────────────────────────────────────────
  if (sub.isPastDue) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
          <p className="text-red-300 text-sm truncate">
            <span className="font-semibold">Payment failed.</span>{' '}
            Update your payment method to keep access.
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/stripe/portal', { method: 'POST' });
              const { url } = await res.json();
              if (url) window.location.href = url;
            } catch {
              window.location.href = '/pricing';
            }
          }}
          className="flex-shrink-0 px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Update Payment
        </button>
      </div>
    );
  }

  // ── Cancel at period end banner ─────────────────────────────────────────
  if (sub.isActive && sub.cancelAtPeriodEnd && sub.currentPeriodEnd) {
    const endDate = new Date(sub.currentPeriodEnd);
    const daysLeft = Math.max(
      0,
      Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" />
          <p className="text-amber-300 text-sm truncate">
            Your subscription ends in <span className="font-semibold">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>.
            Reactivate to keep access to your data.
          </p>
        </div>
        <Link
          href="/pricing"
          className="flex-shrink-0 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Reactivate
        </Link>
      </div>
    );
  }

  // ── Trial banner ────────────────────────────────────────────────────────
  if (!sub.isTrialing || sub.daysRemaining === null) return null;

  const days = sub.daysRemaining;
  const canDismiss = days > 3;

  if (dismissed && canDismiss) return null;

  // Color progression based on urgency
  let bgClass: string;
  let borderClass: string;
  let dotClass: string;
  let textClass: string;
  let ctaClass: string;

  if (days <= 1) {
    // Red — urgent
    bgClass = 'bg-red-500/10';
    borderClass = 'border-red-500/20';
    dotClass = 'bg-red-400 animate-pulse';
    textClass = 'text-red-300';
    ctaClass = 'bg-red-500 hover:bg-red-400';
  } else if (days <= 3) {
    // Amber — attention
    bgClass = 'bg-amber-500/10';
    borderClass = 'border-amber-500/20';
    dotClass = 'bg-amber-400 animate-pulse';
    textClass = 'text-amber-300';
    ctaClass = 'bg-amber-500 hover:bg-amber-400';
  } else {
    // Emerald — informational
    bgClass = 'bg-emerald-500/8';
    borderClass = 'border-emerald-500/15';
    dotClass = 'bg-emerald-400';
    textClass = 'text-emerald-300';
    ctaClass = 'bg-emerald-600 hover:bg-emerald-500';
  }

  return (
    <div
      className={`${bgClass} border-b ${borderClass} px-4 py-2.5 flex items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 ${dotClass} rounded-full flex-shrink-0`} />
        <p className={`${textClass} text-sm truncate`}>
          {days === 0 ? (
            <>
              <span className="font-semibold">Your trial expires today.</span>{' '}
              Subscribe now to keep access.
            </>
          ) : days === 1 ? (
            <>
              <span className="font-semibold">1 day left</span> in your Pro
              trial. Subscribe to keep your farm data.
            </>
          ) : (
            <>
              <span className="font-semibold">{days} days left</span> in your
              Pro trial.{' '}
              {days <= 3
                ? 'Subscribe now to keep your data.'
                : 'Enjoying HarvestFile? Upgrade anytime.'}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/pricing"
          className={`${ctaClass} text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors`}
        >
          {days <= 3 ? 'Subscribe Now' : 'View Plans'}
        </Link>
        {canDismiss && (
          <button
            onClick={() => setDismissed(true)}
            className="text-white/20 hover:text-white/40 transition-colors p-1"
            aria-label="Dismiss"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
