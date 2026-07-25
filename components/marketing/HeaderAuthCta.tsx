// =============================================================================
// HarvestFile — Header Auth CTA (Client Island)
// Hotfix R2.1 Item A: county-page 500s (DYNAMIC_SERVER_USAGE)
//
// MarketingHeader was an async Server Component calling cookies() via the
// server Supabase client inside the (marketing) layout. Cookie access during
// static/ISR regeneration of the /[state]/... pages threw
// DYNAMIC_SERVER_USAGE → FUNCTION_INVOCATION_FAILED → 500 on every cold
// render. The header is now synchronous and cookie-free; ALL auth awareness
// lives in this client island.
//
// Resolution strategy (cheap for the anonymous SEO majority):
//   1. On mount, read the LOCAL session via the browser Supabase client —
//      no network round-trip. No session → stay on logged-out defaults and
//      never touch the network.
//   2. Session present → GET /api/auth/header-cta (a route handler, dynamic
//      by nature) which runs the same short farms.sellscore_active chain as
//      /sellscore/me and returns { authenticated, paidSellScore }.
//
// The result is cached module-wide (one promise per pageview), so the
// desktop CTA, the "Sell Score" nav link, and the mobile menu share a
// single resolution instead of firing three.
//
// Until resolved, everything renders the logged-out default — same labels,
// same widths — so anonymous visitors (the county-page audience) see zero
// layout shift. Logged-in users see the CTA swap once, on mount.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export interface HeaderAuthState {
  isAuthenticated: boolean;
  /** Active Sell Score subscriber (farms.sellscore_active) */
  isPaidSellScore: boolean;
}

const LOGGED_OUT: HeaderAuthState = {
  isAuthenticated: false,
  isPaidSellScore: false,
};

// Module-level cache: one auth resolution per pageview, shared by every
// header component that calls useHeaderAuth().
let authPromise: Promise<HeaderAuthState> | null = null;

function resolveHeaderAuth(): Promise<HeaderAuthState> {
  if (!authPromise) {
    authPromise = (async (): Promise<HeaderAuthState> => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return LOGGED_OUT;

        // Session cookie exists — verify server-side and resolve paid
        // status. RLS posture for browser reads on farms is unproven, so
        // the check stays server-side behind a lightweight GET route.
        const res = await fetch('/api/auth/header-cta', { cache: 'no-store' });
        if (!res.ok) return { isAuthenticated: true, isPaidSellScore: false };
        const json = await res.json();
        return {
          isAuthenticated: !!json.authenticated,
          isPaidSellScore: !!json.paidSellScore,
        };
      } catch {
        return LOGGED_OUT;
      }
    })();
  }
  return authPromise;
}

export function useHeaderAuth(): HeaderAuthState & { resolved: boolean } {
  const [state, setState] = useState<HeaderAuthState & { resolved: boolean }>({
    ...LOGGED_OUT,
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    resolveHeaderAuth().then((auth) => {
      if (!cancelled) setState({ ...auth, resolved: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * The "Sell Score" desktop nav link. Logged-out default (/pricing, the
 * conversion page); active subscribers swap to /sellscore/me. Label never
 * changes, so there is no layout shift.
 */
export function SellScoreNavLink() {
  const { isPaidSellScore } = useHeaderAuth();

  return (
    <Link
      href={isPaidSellScore ? '/sellscore/me' : '/pricing'}
      className="text-sm font-medium transition-colors duration-500 hover:opacity-80"
      style={{ color: 'var(--nav-text-muted)' }}
    >
      Sell Score
    </Link>
  );
}

/**
 * Desktop CTA cluster. Markup is identical to the pre-hotfix server render:
 * logged-out → "Log in" + "Get Started Free"; logged-in → gold pill
 * ("Sell Score" → /sellscore/me for subscribers, "Dashboard" → /dashboard
 * otherwise). Pre-resolution renders the logged-out default.
 */
export function HeaderAuthCta() {
  const { resolved, isAuthenticated, isPaidSellScore } = useHeaderAuth();

  if (resolved && isAuthenticated) {
    return (
      <Link
        href={isPaidSellScore ? '/sellscore/me' : '/dashboard'}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-500"
        style={{
          backgroundColor: 'var(--nav-cta-bg)',
          color: 'var(--nav-cta-text)',
        }}
      >
        {isPaidSellScore ? 'Sell Score' : 'Dashboard'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="text-sm font-medium transition-colors duration-500 hover:opacity-80"
        style={{ color: 'var(--nav-text-muted)' }}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-500"
        style={{
          backgroundColor: 'var(--nav-cta-bg)',
          color: 'var(--nav-cta-text)',
        }}
      >
        Get Started Free
      </Link>
    </>
  );
}
