// =============================================================================
// HarvestFile — Phase 30 Build 6: BenchmarkWidget (County Pages, Zero-Friction)
// components/county/BenchmarkWidget.tsx
//
// "What is [County] choosing?" — The Network Effect Engine on county SEO pages.
//
// WHAT CHANGED (Build 6):
//   ✅ Email REMOVED from submission — just pick ARC-CO or PLC and submit
//   ✅ Cloudflare Turnstile invisible CAPTCHA — anti-bot without user friction
//   ✅ Anonymous session via localStorage UUID — dedup without accounts
//   ✅ Post-submit soft email capture prompt (optional)
//   ✅ Turnstile script loaded dynamically on mount
//
// This version appears on the /check results page (Step 3) after the farmer
// sees their ARC-CO vs PLC comparison. Includes historical FSA data + live 2026.
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoricalYear {
  year: number;
  arc_acres: number;
  plc_acres: number;
  total: number;
  arc_pct: number;
  plc_pct: number;
}

interface BenchmarkData {
  county_fips: string;
  county_name: string;
  state_abbr: string;
  commodity: string;
  historical: HistoricalYear[];
  live_2026: {
    arc_co_count: number;
    plc_count: number;
    total: number;
    arc_co_pct: number | null;
    plc_pct: number | null;
    is_visible: boolean;
  };
  social_proof: {
    state_this_week: number;
    state_counties_this_week: number;
    state_total: number;
    county_total: number;
  };
}

interface BenchmarkWidgetProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  cropCode: string;
  cropName: string;
  recommendedChoice: 'ARC-CO' | 'PLC';
}

// ─── Format Helpers ──────────────────────────────────────────────────────────

function formatAcres(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString()}K`;
  return n.toLocaleString();
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// ─── Anonymous Session Helper ────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const STORAGE_KEY = 'hf_session_id';
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 32) return existing;

    const uuid = crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    localStorage.setItem(STORAGE_KEY, uuid);
    return uuid;
  } catch {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

// ─── Turnstile Setup ─────────────────────────────────────────────────────────

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).turnstile) { resolve(); return; }
    const existing = document.querySelector('script[src*="turnstile"]');
    if (existing) {
      const check = setInterval(() => {
        if ((window as any).turnstile) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const check = setInterval(() => {
        if ((window as any).turnstile) { clearInterval(check); resolve(); }
      }, 50);
    };
    document.head.appendChild(script);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function BenchmarkWidget({
  countyFips,
  countyName,
  stateAbbr,
  cropCode,
  cropName,
  recommendedChoice,
}: BenchmarkWidgetProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission state — NO EMAIL REQUIRED
  const [selectedChoice, setSelectedChoice] = useState<'ARC-CO' | 'PLC' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Anonymous session + Turnstile
  const [sessionId, setSessionId] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Post-submit email capture
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [captureEmail, setCaptureEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  // Share state
  const [shared, setShared] = useState(false);

  // ── Initialize session + Turnstile ──────────────────────────────────────
  useEffect(() => {
    setSessionId(getOrCreateSessionId());

    if (TURNSTILE_SITE_KEY) {
      loadTurnstileScript().then(() => {
        const container = document.getElementById(`turnstile-county-${countyFips}`);
        if (container && (window as any).turnstile) {
          (window as any).turnstile.render(container, {
            sitekey: TURNSTILE_SITE_KEY,
            size: 'invisible',
            callback: (token: string) => setTurnstileToken(token),
            'error-callback': () => {},
            'expired-callback': () => setTurnstileToken(null),
          });
        }
      });
    }
  }, [countyFips]);

  // ── Fetch benchmark data ────────────────────────────────────────────────
  useEffect(() => {
    if (!countyFips || !cropCode) return;

    setLoading(true);
    setError(null);

    fetch(`/api/benchmarks/county?county_fips=${countyFips}&commodity=${cropCode}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load benchmark data');
        setLoading(false);
      });
  }, [countyFips, cropCode]);

  // ── Pre-select the calculator's recommendation ──────────────────────────
  useEffect(() => {
    if (recommendedChoice && !submitted) {
      setSelectedChoice(recommendedChoice);
    }
  }, [recommendedChoice, submitted]);

  // ── Submit election — ZERO FRICTION ─────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedChoice) return;
    if (!sessionId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/benchmarks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          county_fips: countyFips,
          commodity_code: cropCode,
          election_choice: selectedChoice,
          session_id: sessionId,
          program_year: 2026,
          turnstile_token: turnstileToken || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        // Duplicate submission — treat as success
        if (result.duplicate) {
          setSubmitted(true);
          setShowEmailCapture(true);
          setSubmitting(false);
          // Refresh data
          const refreshRes = await fetch(
            `/api/benchmarks/county?county_fips=${countyFips}&commodity=${cropCode}`
          );
          if (refreshRes.ok) setData(await refreshRes.json());
          return;
        }
        setSubmitError(result.error || 'Submission failed');
        setSubmitting(false);
        return;
      }

      // Refresh benchmark data after submission
      const refreshRes = await fetch(
        `/api/benchmarks/county?county_fips=${countyFips}&commodity=${cropCode}`
      );
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setData(refreshData);
      }

      setSubmitted(true);
      setShowEmailCapture(true);
      setSubmitting(false);
    } catch {
      setSubmitError('Network error — please try again');
      setSubmitting(false);
    }
  }, [selectedChoice, sessionId, countyFips, cropCode, turnstileToken]);

  // ── Email capture (optional, post-submit) ───────────────────────────────
  const handleEmailCapture = async () => {
    if (!captureEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(captureEmail)) return;

    try {
      await fetch('/api/benchmarks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          county_fips: countyFips,
          commodity_code: cropCode,
          election_choice: selectedChoice,
          session_id: sessionId,
          email: captureEmail,
          program_year: 2026,
        }),
      });
    } catch {}

    setEmailSaved(true);
    setShowEmailCapture(false);
    try { localStorage.setItem('hf_email', captureEmail); } catch {}
  };

  // ── Share handler ───────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    const text = `I just compared ARC-CO vs PLC for ${cropName} in ${countyName}, ${stateAbbr} — check yours free:`;
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({ title: 'HarvestFile ARC/PLC Calculator', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }).catch(() => {});
    }
  }, [cropName, countyName, stateAbbr]);

  // ── Derived data ────────────────────────────────────────────────────────
  const latestYear = data?.historical?.[data.historical.length - 1];
  const hasHistorical = !!latestYear && latestYear.total > 0;
  const hasLiveData = (data?.live_2026?.total || 0) > 0;
  const liveVisible = data?.live_2026?.is_visible || false;

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-[20px] p-6 animate-pulse" style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
          <div className="h-4 w-48 rounded bg-white/[0.06]" />
        </div>
        <div className="h-3 rounded-full bg-white/[0.04] mb-3" />
        <div className="h-10 rounded-xl bg-white/[0.03]" />
      </div>
    );
  }

  // ── Error / empty state ─────────────────────────────────────────────────
  if (error || !data) return null;
  if (!hasHistorical && !hasLiveData) return null;

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        animation: 'qc-enter 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both',
      }}
    >
      {/* Invisible Turnstile container */}
      <div id={`turnstile-county-${countyFips}`} className="hidden" />

      {/* ═══ HEADER ═══ */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <IconUsers />
          </div>
          <h3 className="text-[15px] font-bold text-white tracking-[-0.01em]">
            What is {countyName} choosing?
          </h3>
        </div>
        <p className="text-[12px] text-white/30 ml-[38px]">
          {cropName} · ARC-CO vs PLC · Real USDA data
        </p>
      </div>

      {/* ═══ HISTORICAL CONTEXT ═══ */}
      {hasHistorical && (
        <div className="px-5 sm:px-6 pb-4">
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">
                {latestYear.year} Enrollment
              </span>
              <span className="text-[11px] text-white/20">
                {formatAcres(latestYear.total)} base acres
              </span>
            </div>
            <div className="flex h-7 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-center transition-all duration-700"
                style={{
                  width: `${Math.max(latestYear.arc_pct, 5)}%`,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                }}
              >
                {latestYear.arc_pct >= 15 && (
                  <span className="text-[10px] font-bold text-white/90">
                    ARC {latestYear.arc_pct}%
                  </span>
                )}
              </div>
              <div
                className="flex items-center justify-center transition-all duration-700"
                style={{
                  width: `${Math.max(latestYear.plc_pct, 5)}%`,
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                }}
              >
                {latestYear.plc_pct >= 15 && (
                  <span className="text-[10px] font-bold text-white/90">
                    PLC {latestYear.plc_pct}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {data.historical.length >= 3 && (
            <div className="flex items-center gap-1 mt-2">
              <IconTrendUp />
              <span className="text-[11px] text-white/25">
                {data.historical.slice(-3).map(h =>
                  `${h.year}: ${h.arc_pct}% ARC`
                ).join(' → ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ DIVIDER ═══ */}
      <div className="mx-5 sm:mx-6 h-px" style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      }} />

      {/* ═══ SUBMISSION FORM — ZERO FRICTION (no email) ═══ */}
      {!submitted && (
        <div className="px-5 sm:px-6 py-5">
          <div className="text-[13px] font-semibold text-white/60 mb-1">
            What are you choosing for 2026?
          </div>
          <p className="text-[11px] text-white/25 mb-4">
            Share your election to unlock real-time benchmarks. 
            Anonymous — no email needed, only county totals shown.
          </p>

          {/* ARC-CO vs PLC toggle */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <button
              onClick={() => setSelectedChoice('ARC-CO')}
              className="relative p-3.5 rounded-xl text-center transition-all duration-200 cursor-pointer border"
              style={{
                background: selectedChoice === 'ARC-CO'
                  ? 'rgba(16,185,129,0.08)'
                  : 'rgba(255,255,255,0.02)',
                borderColor: selectedChoice === 'ARC-CO'
                  ? 'rgba(16,185,129,0.3)'
                  : 'rgba(255,255,255,0.06)',
                boxShadow: selectedChoice === 'ARC-CO'
                  ? '0 0 20px rgba(16,185,129,0.08)'
                  : 'none',
              }}
            >
              {selectedChoice === 'ARC-CO' && (
                <div className="absolute top-2 right-2 text-emerald-400">
                  <IconCheck />
                </div>
              )}
              <div
                className="text-[14px] font-bold mb-0.5"
                style={{
                  color: selectedChoice === 'ARC-CO' ? '#34d399' : 'rgba(255,255,255,0.4)',
                }}
              >
                ARC-CO
              </div>
              <div className="text-[10px]" style={{
                color: selectedChoice === 'ARC-CO' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)',
              }}>
                County Revenue
              </div>
            </button>

            <button
              onClick={() => setSelectedChoice('PLC')}
              className="relative p-3.5 rounded-xl text-center transition-all duration-200 cursor-pointer border"
              style={{
                background: selectedChoice === 'PLC'
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(255,255,255,0.02)',
                borderColor: selectedChoice === 'PLC'
                  ? 'rgba(59,130,246,0.3)'
                  : 'rgba(255,255,255,0.06)',
                boxShadow: selectedChoice === 'PLC'
                  ? '0 0 20px rgba(59,130,246,0.08)'
                  : 'none',
              }}
            >
              {selectedChoice === 'PLC' && (
                <div className="absolute top-2 right-2 text-blue-400">
                  <IconCheck />
                </div>
              )}
              <div
                className="text-[14px] font-bold mb-0.5"
                style={{
                  color: selectedChoice === 'PLC' ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                }}
              >
                PLC
              </div>
              <div className="text-[10px]" style={{
                color: selectedChoice === 'PLC' ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.15)',
              }}>
                Price Loss Coverage
              </div>
            </button>
          </div>

          {/* Submit button — IMMEDIATE, NO EMAIL */}
          <button
            disabled={!selectedChoice || submitting}
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.97]"
            style={{
              background: selectedChoice
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : 'rgba(255,255,255,0.06)',
              color: selectedChoice ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Share & Unlock →'
            )}
          </button>

          {/* Privacy note */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/15 mt-2">
            <IconLock />
            <span>No account needed · Anonymous · Only county totals shown</span>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="mt-3 text-[12px] text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
              {submitError}
            </div>
          )}
        </div>
      )}

      {/* ═══ POST-SUBMISSION: Live 2026 Benchmarks ═══ */}
      {submitted && (
        <div
          className="px-5 sm:px-6 py-5"
          style={{ animation: 'qc-enter 0.5s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Success banner */}
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <span className="text-emerald-400"><IconCheck /></span>
            <span className="text-[12px] text-emerald-400/80 font-medium">
              Election recorded — you chose {selectedChoice}
            </span>
          </div>

          {/* ═══ EMAIL CAPTURE — SOFT PROMPT (OPTIONAL) ═══ */}
          {showEmailCapture && !emailSaved && (
            <div className="mb-4 px-3 py-3 rounded-lg animate-in fade-in duration-500" style={{
              background: 'rgba(201,168,76,0.04)',
              border: '1px solid rgba(201,168,76,0.12)',
            }}>
              <div className="text-[12px] font-semibold text-[#C9A84C]/80 mb-1">
                Save your results?
              </div>
              <div className="text-[10px] text-white/25 mb-2">
                Get notified when {countyName} benchmark data changes. Optional.
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={captureEmail}
                  onChange={(e) => setCaptureEmail(e.target.value)}
                  placeholder="you@farm.com"
                  className="flex-1 px-3 py-2 rounded-lg text-[12px] text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#C9A84C]/30 transition-colors placeholder:text-white/15"
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailCapture()}
                />
                <button
                  onClick={handleEmailCapture}
                  disabled={!captureEmail}
                  className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30"
                  style={{
                    background: 'rgba(201,168,76,0.15)',
                    color: '#C9A84C',
                  }}
                >
                  Save
                </button>
              </div>
              <button
                onClick={() => setShowEmailCapture(false)}
                className="text-[10px] text-white/15 hover:text-white/30 mt-1.5 transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {/* Email saved confirmation */}
          {emailSaved && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-[11px]" style={{
              background: 'rgba(201,168,76,0.04)',
              border: '1px solid rgba(201,168,76,0.1)',
              color: '#C9A84C',
            }}>
              <IconCheck /> Email saved — we&apos;ll notify you of changes.
            </div>
          )}

          {/* Live 2026 bar (if enough data to show) */}
          {hasLiveData && liveVisible && data.live_2026.arc_co_pct !== null && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">
                  2026 Live Benchmark
                </span>
                <span className="text-[11px] text-white/20">
                  {data.live_2026.total} farmer{data.live_2026.total !== 1 ? 's' : ''} reported
                </span>
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: `${Math.max(data.live_2026.arc_co_pct, 8)}%`,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                  }}
                >
                  <span className="text-[11px] font-bold text-white">
                    ARC {data.live_2026.arc_co_pct}%
                  </span>
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: `${Math.max(data.live_2026.plc_pct!, 8)}%`,
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  }}
                >
                  <span className="text-[11px] font-bold text-white">
                    PLC {data.live_2026.plc_pct}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Not enough data yet */}
          {hasLiveData && !liveVisible && (
            <div className="mb-4 px-4 py-3 rounded-xl text-center" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div className="text-[13px] text-white/40 font-medium mb-1">
                {data.live_2026.total} of 5 farmers reported
              </div>
              <div className="flex h-2 rounded-full overflow-hidden mb-2 mx-auto max-w-[200px]" style={{
                background: 'rgba(255,255,255,0.04)',
              }}>
                <div
                  className="h-full rounded-full bg-emerald-500/60 transition-all"
                  style={{ width: `${(data.live_2026.total / 5) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-white/20">
                Benchmarks unlock when 5 farmers report. Share to reach the threshold faster.
              </p>
            </div>
          )}

          {/* No live data — first reporter */}
          {!hasLiveData && (
            <div className="mb-4 px-4 py-3 rounded-xl text-center" style={{
              background: 'rgba(201,168,76,0.03)',
              border: '1px solid rgba(201,168,76,0.1)',
            }}>
              <div className="text-[13px] text-[#C9A84C]/80 font-semibold mb-1">
                You&apos;re the first in {countyName}!
              </div>
              <p className="text-[11px] text-white/20">
                Share with 4 more farmers in your county to unlock live benchmarks.
              </p>
            </div>
          )}

          {/* Social proof */}
          {(data.social_proof.state_this_week > 0 || data.social_proof.state_total > 0) && (
            <div className="flex items-center justify-center gap-4 mb-4 text-[11px] text-white/20">
              {data.social_proof.state_this_week > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {data.social_proof.state_this_week} in {stateAbbr} this week
                </span>
              )}
              {data.social_proof.state_total > 0 && (
                <span>
                  {data.social_proof.state_total} total in {stateAbbr}
                </span>
              )}
            </div>
          )}

          {/* Share CTA — the viral moment */}
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: shared
                ? 'rgba(16,185,129,0.1)'
                : 'rgba(255,255,255,0.04)',
              border: shared
                ? '1px solid rgba(16,185,129,0.2)'
                : '1px solid rgba(255,255,255,0.08)',
              color: shared ? '#34d399' : 'rgba(255,255,255,0.4)',
            }}
          >
            {shared ? (
              <><IconCheck /> Link copied — share it!</>
            ) : (
              <><IconShare /> Share with your county — help unlock benchmarks</>
            )}
          </button>

          <p className="text-[10px] text-white/15 text-center mt-3">
            Every farmer who shares helps build the first real-time ARC/PLC benchmark in America.
          </p>
        </div>
      )}

      {/* ═══ FOOTER: Election map link ═══ */}
      <div className="px-5 sm:px-6 pb-4 sm:pb-5">
        <a
          href="/elections"
          className="flex items-center justify-center gap-2 w-full p-2.5 rounded-lg text-[11px] font-semibold text-white/25 hover:text-white/40 hover:bg-white/[0.02] transition-all no-underline"
        >
          <span>🗺️</span>
          Explore the full national ARC/PLC election map →
        </a>
      </div>
    </div>
  );
}
