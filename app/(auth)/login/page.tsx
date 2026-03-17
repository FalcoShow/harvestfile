// =============================================================================
// HarvestFile — Premium Login Page
// Phase 12: Matching design pair with signup page
//
// Streamlined: email + password only, forgot password link,
// gold CTA, Google OAuth secondary. Same stagger animation system.
// Suspense boundary wraps the inner form for useSearchParams safety.
// =============================================================================

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Inner form (needs useSearchParams → requires Suspense) ──────────────────

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('next') || '/dashboard';

  async function handleGoogleAuth() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError("Email or password doesn't match. Try again or reset your password.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address first, then click "Forgot password"');
      return;
    }

    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="space-y-2 hf-auth-stagger"
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <h2 className="text-[24px] sm:text-[26px] font-bold text-white tracking-tight">
          Welcome back
        </h2>
        <p
          className="text-[15px]"
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
          }}
        >
          Sign in to your HarvestFile account
        </p>
      </div>

      {/* ── Error / Reset success alerts ─────────────────────────────── */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            color: '#FF8A8A',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {resetSent && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
          style={{
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.15)',
            color: '#4ADE80',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="flex-shrink-0 mt-0.5"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>
            Password reset email sent! Check your inbox for a link to reset
            your password.
          </span>
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────── */}
      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email */}
        <div
          className="space-y-2 hf-auth-stagger"
          style={{ '--stagger-index': 1 } as React.CSSProperties}
        >
          <label
            htmlFor="login_email"
            className="block text-[13px] font-medium text-white/60"
          >
            Email address
          </label>
          <input
            id="login_email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="hf-auth-input"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div
          className="space-y-2 hf-auth-stagger"
          style={{ '--stagger-index': 2 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="login_password"
              className="block text-[13px] font-medium text-white/60"
            >
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[12px] text-[#C9A84C]/70 hover:text-[#E2C366] transition-colors font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login_password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hf-auth-input pr-11"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Gold CTA button ───────────────────────────────────────── */}
        <div
          className="hf-auth-stagger"
          style={{ '--stagger-index': 3 } as React.CSSProperties}
        >
          <button
            type="submit"
            disabled={loading}
            className="hf-auth-cta w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 hf-auth-stagger"
        style={{ '--stagger-index': 4 } as React.CSSProperties}
      >
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[12px] text-white/25 font-medium">
          or continue with
        </span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* ── Google OAuth ────────────────────────────────────────────── */}
      <div
        className="hf-auth-stagger"
        style={{ '--stagger-index': 5 } as React.CSSProperties}
      >
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* ── Footer links ────────────────────────────────────────────── */}
      <div
        className="text-center hf-auth-stagger"
        style={{ '--stagger-index': 6 } as React.CSSProperties}
      >
        <p className="text-[13px] text-white/40">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-[#C9A84C] hover:text-[#E2C366] font-medium transition-colors"
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Page export with Suspense boundary ──────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="h-5 w-64 rounded-lg bg-white/[0.03] animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
