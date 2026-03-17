// =============================================================================
// HarvestFile — Premium Signup Page
// Phase 12: World-class registration experience
//
// Design decisions (research-backed):
//   • 3 fields only: name, email, password (conversion sweet spot)
//   • Email/password FIRST, Google OAuth second (farmer audience trust)
//   • Gold CTA with clear value: "Start free — Pro included"
//   • Password strength indicator with real-time checklist
//   • Show/hide password toggle (replaces confirm password field)
//   • Trust signals below CTA: no CC, cancel anytime, data privacy
//   • Staggered CSS entrance animation (80ms per element)
//   • Error states that guide, not punish
//
// Technical:
//   • Client component (form state + Supabase auth)
//   • Suspense boundary not needed (no useSearchParams)
//   • Creates org + professional records on immediate session
// =============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Password strength logic ─────────────────────────────────────────────────

interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'Contains a number', test: (pw) => /\d/.test(pw) },
  {
    label: 'Contains a special character',
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

function getStrength(pw: string): {
  score: number;
  label: string;
  color: string;
  width: string;
} {
  if (!pw) return { score: 0, label: '', color: '', width: '0%' };
  const passed = PASSWORD_CHECKS.filter((c) => c.test(pw)).length;
  if (passed <= 1)
    return { score: 1, label: 'Weak', color: '#EF4444', width: '33%' };
  if (passed === 2)
    return { score: 2, label: 'Fair', color: '#F59E0B', width: '66%' };
  return { score: 3, label: 'Strong', color: '#4ADE80', width: '100%' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const router = useRouter();

  const strength = useMemo(() => getStrength(password), [password]);
  const checks = useMemo(
    () => PASSWORD_CHECKS.map((c) => ({ ...c, passed: c.test(password) })),
    [password],
  );

  // Email validation (on blur only — "reward early, punish late")
  const emailError =
    emailTouched && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "That doesn't look like a valid email"
      : '';

  async function handleGoogleAuth() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      // Friendly error messages
      if (signUpError.message.includes('already registered')) {
        setError(
          'An account with this email already exists. Try signing in instead.',
        );
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // If session exists immediately (email confirmation disabled), create org
    if (data.user && data.session) {
      const { data: existingPro } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (!existingPro) {
        const { data: org } = await supabase
          .from('organizations')
          .insert({
            name: `${fullName}'s Organization`,
            subscription_tier: 'free',
            max_farmers: 10,
            max_users: 1,
          })
          .select('id')
          .single();

        if (org) {
          await supabase.from('professionals').insert({
            org_id: org.id,
            auth_user_id: data.user.id,
            email,
            full_name: fullName,
            role: 'admin',
          });

          await supabase.from('activity_log').insert({
            org_id: org.id,
            actor_id: data.user.id,
            action: 'user_signup',
            entity_type: 'professional',
            description: `${email} created an account`,
          });
        }
      }

      router.push('/dashboard');
      router.refresh();
      return;
    }

    // Email confirmation required
    setSuccess('Account created! Check your email for a confirmation link.');
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
          Create your account
        </h2>
        <p
          className="text-[15px]"
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
          }}
        >
          Start with full Pro access — free for 14 days
        </p>
      </div>

      {/* ── Error / Success alerts ──────────────────────────────────── */}
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

      {success && (
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
          <span>{success}</span>
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────── */}
      <form onSubmit={handleSignup} className="space-y-5">
        {/* Full Name */}
        <div
          className="space-y-2 hf-auth-stagger"
          style={{ '--stagger-index': 1 } as React.CSSProperties}
        >
          <label
            htmlFor="full_name"
            className="block text-[13px] font-medium text-white/60"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="hf-auth-input"
            placeholder="John Smith"
          />
        </div>

        {/* Email */}
        <div
          className="space-y-2 hf-auth-stagger"
          style={{ '--stagger-index': 2 } as React.CSSProperties}
        >
          <label
            htmlFor="email"
            className="block text-[13px] font-medium text-white/60"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            className={`hf-auth-input ${emailError ? 'hf-auth-input-error' : ''}`}
            placeholder="you@example.com"
          />
          {emailError && (
            <p className="text-xs text-[#FF6B6B] flex items-center gap-1.5 mt-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {emailError}
            </p>
          )}
        </div>

        {/* Password */}
        <div
          className="space-y-2 hf-auth-stagger"
          style={{ '--stagger-index': 3 } as React.CSSProperties}
        >
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-white/60"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hf-auth-input pr-11"
              placeholder="Min. 8 characters"
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

          {/* Strength bar + checklist */}
          {password.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {/* Strength bar */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: strength.width,
                      background: strength.color,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-medium min-w-[40px] text-right"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>

              {/* Requirements checklist */}
              <div className="space-y-1.5">
                {checks.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 transition-all duration-300"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: c.passed
                          ? 'rgba(74,222,128,0.15)'
                          : 'rgba(255,255,255,0.04)',
                        border: c.passed
                          ? '1px solid rgba(74,222,128,0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {c.passed && (
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4ADE80"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-[12px] transition-colors duration-300"
                      style={{
                        color: c.passed
                          ? 'rgba(74,222,128,0.8)'
                          : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Gold CTA button ───────────────────────────────────────── */}
        <div
          className="hf-auth-stagger"
          style={{ '--stagger-index': 4 } as React.CSSProperties}
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
                Creating account...
              </span>
            ) : (
              'Start free — Pro included'
            )}
          </button>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-3 mt-3.5 flex-wrap">
            {[
              { icon: 'check', text: 'No credit card' },
              { icon: 'check', text: 'Cancel anytime' },
              { icon: 'lock', text: 'Data stays private' },
            ].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] text-white/30"
              >
                {item.icon === 'check' ? (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4ADE80"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4ADE80"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </form>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 hf-auth-stagger"
        style={{ '--stagger-index': 5 } as React.CSSProperties}
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
        style={{ '--stagger-index': 6 } as React.CSSProperties}
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

        {/* Google trust note */}
        <p className="text-[11px] text-white/20 text-center mt-2.5">
          We only access your name and email — nothing else
        </p>
      </div>

      {/* ── Footer links ────────────────────────────────────────────── */}
      <div
        className="space-y-3 hf-auth-stagger"
        style={{ '--stagger-index': 7 } as React.CSSProperties}
      >
        <div className="text-center">
          <p className="text-[13px] text-white/40">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#C9A84C] hover:text-[#E2C366] font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-[11px] text-white/20 text-center leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-white/35 transition-colors"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-white/35 transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
