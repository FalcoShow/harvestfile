// =============================================================================
// HarvestFile — Signup Page (Phase 12 v2)
// Centered single-column. Brand-saturated. Homepage DNA.
//
// Structure:
//   • OBBBA timeliness badge (from homepage)
//   • "Know exactly what your farm is owed" heading (from homepage)
//   • Form: name → email → password (with strength indicator)
//   • Gold CTA: "Start free — 14 days of Pro"
//   • Trust line: No CC · Cancel anytime · Data stays private
//   • Divider → Google OAuth
//   • Stat counters: 50 States · 3,142 Counties · 16 Programs
//
// Auth logic preserved from previous version.
// =============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Password strength ───────────────────────────────────────────────────────

const PW_CHECKS = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'Contains a number', test: (pw: string) => /\d/.test(pw) },
  { label: 'Contains a special character', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(pw: string) {
  if (!pw) return { label: '', color: '', pct: 0 };
  const n = PW_CHECKS.filter((c) => c.test(pw)).length;
  if (n <= 1) return { label: 'Weak', color: '#EF4444', pct: 33 };
  if (n === 2) return { label: 'Fair', color: '#F59E0B', pct: 66 };
  return { label: 'Strong', color: '#4ADE80', pct: 100 };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const router = useRouter();

  const strength = useMemo(() => getStrength(password), [password]);
  const checks = useMemo(
    () => PW_CHECKS.map((c) => ({ ...c, ok: c.test(password) })),
    [password],
  );
  const emailErr =
    emailBlurred && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "That doesn't look like a valid email"
      : '';

  // ── Handlers ─────────────────────────────────────────────────

  async function handleGoogle() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (err) {
      setError(
        err.message.includes('already registered')
          ? 'An account with this email already exists. Try signing in instead.'
          : err.message,
      );
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      const { data: existing } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (!existing) {
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

    setSuccess('Account created! Check your email for a confirmation link.');
    setLoading(false);
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* OBBBA timeliness badge — from homepage */}
      <div
        className="flex justify-center hf-auth-stagger"
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <span
          className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide rounded-full px-3.5 py-1.5"
          style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.15)',
            color: 'rgba(201,168,76,0.7)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#4ADE80' }}
          />
          Updated for 2025 OBBBA Farm Bill
        </span>
      </div>

      {/* Heading — echoes homepage voice */}
      <div
        className="text-center space-y-2 hf-auth-stagger"
        style={{ '--stagger-index': 1 } as React.CSSProperties}
      >
        <h1 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.03em] leading-tight">
          Know{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #C9A84C, #E2C366)',
            }}
          >
            exactly
          </span>{' '}
          what your
          <br className="hidden sm:block" /> farm is owed
        </h1>
        <p className="text-[14px] text-white/35 leading-relaxed">
          Create your free account · 14 days of Pro included
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-[13px] flex items-start gap-2.5"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.12)',
            color: '#FF8A8A',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-xl px-4 py-3 text-[13px] flex items-start gap-2.5"
          style={{
            background: 'rgba(74,222,128,0.06)',
            border: '1px solid rgba(74,222,128,0.12)',
            color: '#4ADE80',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          {success}
        </div>
      )}

      {/* ── Form ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div
          className="space-y-1.5 hf-auth-stagger"
          style={{ '--stagger-index': 2 } as React.CSSProperties}
        >
          <label htmlFor="signup_name" className="block text-[13px] font-medium text-white/50">
            Full name
          </label>
          <input
            id="signup_name"
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
          className="space-y-1.5 hf-auth-stagger"
          style={{ '--stagger-index': 3 } as React.CSSProperties}
        >
          <label htmlFor="signup_email" className="block text-[13px] font-medium text-white/50">
            Email address
          </label>
          <input
            id="signup_email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailBlurred(true)}
            className={`hf-auth-input ${emailErr ? 'hf-auth-input-error' : ''}`}
            placeholder="you@example.com"
          />
          {emailErr && (
            <p className="text-[12px] text-[#FF6B6B] mt-1">{emailErr}</p>
          )}
        </div>

        {/* Password */}
        <div
          className="space-y-1.5 hf-auth-stagger"
          style={{ '--stagger-index': 4 } as React.CSSProperties}
        >
          <label htmlFor="signup_pw" className="block text-[13px] font-medium text-white/50">
            Password
          </label>
          <div className="relative">
            <input
              id="signup_pw"
              type={showPw ? 'text' : 'password'}
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
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/50 transition-colors"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>

          {/* Strength bar + checklist */}
          {password.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${strength.pct}%`, background: strength.color }}
                  />
                </div>
                <span className="text-[10px] font-medium min-w-[36px] text-right" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
              <div className="space-y-1">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: c.ok ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                        border: c.ok ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {c.ok && (
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </div>
                    <span className="text-[11px]" style={{ color: c.ok ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.25)' }}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gold CTA */}
        <div
          className="pt-1 hf-auth-stagger"
          style={{ '--stagger-index': 5 } as React.CSSProperties}
        >
          <button type="submit" disabled={loading} className="hf-auth-cta w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              'Start free — 14 days of Pro'
            )}
          </button>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-2.5 mt-3 flex-wrap">
            {['No credit card', 'Cancel anytime', 'Data stays private'].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] text-white/25">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </form>

      {/* ── Divider ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 hf-auth-stagger"
        style={{ '--stagger-index': 6 } as React.CSSProperties}
      >
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-[11px] text-white/20">or</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
      </div>

      {/* ── Google OAuth ─────────────────────────────── */}
      <div
        className="hf-auth-stagger"
        style={{ '--stagger-index': 7 } as React.CSSProperties}
      >
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="hf-auth-google w-full"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* ── Stat counters (from homepage — builds credibility) ── */}
      <div
        className="grid grid-cols-3 gap-1 hf-auth-stagger"
        style={{ '--stagger-index': 8 } as React.CSSProperties}
      >
        {[
          { n: '50', label: 'States' },
          { n: '3,142', label: 'Counties' },
          { n: '16', label: 'Programs' },
        ].map((s, i) => (
          <div key={i} className="text-center py-2">
            <div className="text-[16px] font-extrabold text-white/70 tracking-tight">
              {s.n}
            </div>
            <div className="text-[10px] text-white/20 uppercase tracking-[0.06em] font-medium">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <div
        className="text-center space-y-2 hf-auth-stagger"
        style={{ '--stagger-index': 9 } as React.CSSProperties}
      >
        <p className="text-[13px] text-white/35">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C9A84C] hover:text-[#E2C366] font-medium transition-colors">
            Sign in
          </Link>
        </p>
        <p className="text-[11px] text-white/15 leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-white/25 transition-colors">Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white/25 transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
