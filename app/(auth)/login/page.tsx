// =============================================================================
// HarvestFile — Login Page (Phase 12 v4)
// Same split layout (inherited from layout). Simpler form.
// Google OAuth → "or" → email + password → CTA → links
// =============================================================================

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/marketing/logo';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  async function handleGoogle() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(
        err.message.includes('Invalid login credentials')
          ? "Email or password doesn't match. Try again or reset below."
          : err.message,
      );
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleReset() {
    if (!email) {
      setError('Enter your email first, then click "Forgot password?"');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* ── Logo icon + heading ─────────────────────── */}
      <div className="text-center hf-auth-stagger" style={{ '--stagger-index': 0 } as React.CSSProperties}>
        <div className="flex justify-center mb-4">
          <Logo size={32} />
        </div>
        <h2 className="text-[22px] font-extrabold text-white tracking-[-0.02em] mb-1">
          Welcome back
        </h2>
        <p className="text-[13px] text-white/40">
          Sign in to your Harvest<span className="text-[#C9A84C] font-semibold">File</span> account
        </p>
      </div>

      {/* ── Alerts ─────────────────────────────────── */}
      {error && (
        <div className="rounded-lg px-3.5 py-2.5 text-[12px] flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#FF8A8A' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          {error}
        </div>
      )}
      {resetSent && (
        <div className="rounded-lg px-3.5 py-2.5 text-[12px] flex items-start gap-2" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ADE80' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          Password reset sent! Check your inbox.
        </div>
      )}

      {/* ── Google OAuth ───────────────────────────── */}
      <div className="hf-auth-stagger" style={{ '--stagger-index': 1 } as React.CSSProperties}>
        <button onClick={handleGoogle} disabled={loading} className="hf-auth-google w-full">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
          Continue with Google
        </button>
      </div>

      {/* ── Divider ────────────────────────────────── */}
      <div className="flex items-center gap-3 hf-auth-stagger" style={{ '--stagger-index': 2 } as React.CSSProperties}>
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[11px] text-white/20">or</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* ── Form ───────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="hf-auth-stagger" style={{ '--stagger-index': 3 } as React.CSSProperties}>
          <label htmlFor="login_email" className="block text-[12px] font-semibold text-white/50 mb-1.5">Email address</label>
          <input id="login_email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="hf-auth-input" placeholder="you@example.com" />
        </div>

        <div className="hf-auth-stagger" style={{ '--stagger-index': 4 } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login_pw" className="block text-[12px] font-semibold text-white/50">Password</label>
            <button type="button" onClick={handleReset} className="text-[11px] text-[#C9A84C]/50 hover:text-[#C9A84C] transition-colors font-medium">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input id="login_pw" type={showPw ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="hf-auth-input pr-10" placeholder="Enter your password" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors" aria-label={showPw ? 'Hide' : 'Show'}>
              {showPw ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
        </div>

        <div className="pt-1 hf-auth-stagger" style={{ '--stagger-index': 5 } as React.CSSProperties}>
          <button type="submit" disabled={loading} className="hf-auth-cta w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="text-center hf-auth-stagger" style={{ '--stagger-index': 6 } as React.CSSProperties}>
        <p className="text-[13px] text-white/40">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#C9A84C] hover:text-[#E2C366] font-semibold transition-colors">Create one free</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/[0.05] animate-pulse" />
            <div className="h-7 w-40 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-56 rounded bg-white/[0.03] animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-[46px] rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-[44px] rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-[44px] rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-[46px] rounded-xl bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
