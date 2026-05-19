// components/sellscore/SignOutButton.tsx
// =============================================================================
// Sell Score sign-out action button (client component, M-02, May 18, 2026)
//
// Lives in /sellscore/settings. Calls supabase.auth.signOut() client-side
// then redirects to /. router.refresh() forces server components to
// re-render with the cleared session.
//
// Button is intentionally styled as a destructive action with subtle red
// rather than a primary CTA. Signing out is an exit, not a feature. The
// loading state prevents double-clicks during the brief auth round-trip.
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const [signing, setSigning] = useState(false);

  async function handleSignOut() {
    if (signing) return;
    setSigning(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      // If sign-out fails for any reason, surface it and let the user
      // try again. Common failure mode: network blip mid-token-revocation.
      console.error('[sign-out] failed:', err);
      setSigning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signing}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '48px',
        padding: '0 20px',
        backgroundColor: 'transparent',
        border: '1px solid rgba(248, 113, 113, 0.30)',
        borderRadius: '10px',
        fontSize: '18px',
        fontWeight: 500,
        color: signing
          ? 'rgba(248, 113, 113, 0.50)'
          : 'rgba(248, 113, 113, 0.92)',
        cursor: signing ? 'not-allowed' : 'pointer',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        letterSpacing: '-0.005em',
        transition: 'color 120ms ease, border-color 120ms ease',
      }}
    >
      {signing ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
