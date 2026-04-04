// =============================================================================
// HarvestFile — Build 18 Deploy 6B-final: Inline Email Capture + PDF Download
// app/(marketing)/check/components/EmailCapture.tsx
//
// THE CONVERSION ENGINE. This component:
//   1. Captures email WITHOUT requiring full account creation
//   2. Auto-opts-in to enrollment deadline notifications
//   3. Stores calculator context for personalized follow-up emails
//   4. Returns a downloadToken from /api/leads/capture
//   5. Wires "Download FSA Report" button → /api/generate-pdf?token=xxx
//   6. Keeps "Print for FSA Office" as secondary action (browser print)
//
// PDF Download Flow:
//   EmailCapture → POST /api/leads/capture → { success, downloadToken }
//   → "Download FSA Report" button opens /api/generate-pdf?token=xxx
//   → Server validates JWT (HS256, 24h expiry), generates branded PDF
//   → Content-Disposition: attachment triggers browser download
//
// Design: dark forest-green theme, gold accents, glassmorphism cards.
// 48px min touch targets. 18px input text.
// =============================================================================

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface EmailCaptureProps {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  cropCode: string;
  acres: string;
  activeTab: string;
  recommendation?: string;
  arcPerAcre?: number;
  plcPerAcre?: number;
  countySlug?: string;
  stateSlug?: string;
}

export default function EmailCapture({
  countyFips,
  countyName,
  stateAbbr,
  cropCode,
  acres,
  activeTab,
  recommendation,
  arcPerAcre,
  plcPerAcre,
  countySlug,
  stateSlug,
}: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [notifyEnrollment, setNotifyEnrollment] = useState(true);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      // Collect UTM params from current URL
      const params = new URLSearchParams(window.location.search);

      const response = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          notifyEnrollment,
          context: {
            stateAbbr,
            countyFips,
            countyName,
            cropCode,
            acres,
            activeTab,
            recommendation,
            arcPerAcre,
            plcPerAcre,
            utmSource: params.get('utm_source'),
            utmMedium: params.get('utm_medium'),
            utmCampaign: params.get('utm_campaign'),
            referrer: document.referrer || null,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        // Store the download token for PDF generation
        if (data.downloadToken) {
          setDownloadToken(data.downloadToken);
        }
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    if (!downloadToken) return;
    setDownloading(true);

    // Open in new tab — server responds with Content-Disposition: attachment
    // which triggers download. This works reliably on Mobile Safari, Chrome,
    // and all desktop browsers. No blob URL manipulation needed.
    const url = `/api/generate-pdf?token=${encodeURIComponent(downloadToken)}`;
    window.open(url, '_blank');

    // Reset downloading state after a brief delay (the download starts in the new tab)
    setTimeout(() => setDownloading(false), 2000);
  }

  // ── SUCCESS STATE ─────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="space-y-4">
        {/* Success confirmation */}
        <div
          className="rounded-[16px] p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] sm:text-[16px] font-bold text-emerald-400 mb-1">
                Analysis saved
              </p>
              <p className="text-[13px] sm:text-[14px] text-white/40 leading-relaxed">
                We sent a copy to <span className="text-white/60 font-medium">{email}</span>.
                {notifyEnrollment && (
                  <> We&apos;ll also notify you when 2026 ARC/PLC enrollment opens.</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Post-save actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* PRIMARY: Download FSA Report (branded PDF) */}
          {downloadToken ? (
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-[14px] text-[13px] sm:text-[14px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 disabled:opacity-60 disabled:hover:translate-y-0 print:hidden"
              style={{
                background: 'linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)',
                color: '#0C1F17',
                boxShadow: '0 4px 20px rgba(201,168,76,0.15)',
                border: 'none',
              }}
            >
              {downloading ? (
                <>
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download FSA Report
                </>
              )}
            </button>
          ) : (
            // Fallback: if no downloadToken, show Create Account as primary
            <Link
              href="/signup"
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-[14px] text-[13px] sm:text-[14px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 no-underline print:hidden"
              style={{
                background: 'linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)',
                color: '#0C1F17',
                boxShadow: '0 4px 20px rgba(201,168,76,0.15)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Create Free Account
            </Link>
          )}

          {/* SECONDARY: Print for FSA Office (browser print) */}
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-[14px] text-[13px] sm:text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.12] active:scale-[0.98] active:duration-75 print:hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              background: 'transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print for FSA Office
          </button>
        </div>

        {/* Create Account CTA (shown below when downloadToken exists) */}
        {downloadToken && (
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 w-full p-3.5 rounded-[14px] text-[13px] sm:text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.12] active:scale-[0.98] active:duration-75 no-underline print:hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              background: 'transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Create Free Account
          </Link>
        )}

        {/* County page link */}
        {countySlug && stateSlug && (
          <Link
            href={`/${stateSlug}/${countySlug}/arc-plc`}
            className="flex items-center justify-center gap-2 p-3 rounded-[12px] text-[12px] sm:text-[13px] font-medium transition-all duration-200 hover:bg-white/[0.03] no-underline print:hidden"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            View {countyName} County Page →
          </Link>
        )}
      </div>
    );
  }

  // ── DEFAULT STATE (form) ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Primary CTA: Save My Analysis */}
      <div
        className="rounded-[16px] p-5 sm:p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] sm:text-[16px] font-bold text-white/80">
              Keep your ARC/PLC numbers
            </p>
            <p className="text-[12px] sm:text-[13px] text-white/30">
              We&apos;ll email this analysis and alert you when enrollment opens.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={status === 'loading'}
            className="flex-1 px-4 py-3 rounded-[12px] text-[16px] sm:text-[15px] font-medium transition-all duration-200 outline-none disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
              minHeight: '48px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)',
              color: '#0C1F17',
              boxShadow: '0 6px 28px rgba(201,168,76,0.2), 0 0 0 0.5px rgba(201,168,76,0.3)',
              minHeight: '48px',
              border: 'none',
            }}
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save My Analysis
              </>
            )}
          </button>
        </form>

        {/* Error message */}
        {status === 'error' && (
          <p className="mt-2.5 text-[13px] text-red-400/80 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {errorMessage}
          </p>
        )}

        {/* Enrollment notification opt-in */}
        <label className="flex items-center gap-2.5 mt-3 cursor-pointer group">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={notifyEnrollment}
              onChange={(e) => setNotifyEnrollment(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all duration-200"
              style={{
                background: notifyEnrollment ? 'rgba(201,168,76,0.9)' : 'rgba(255,255,255,0.06)',
                border: notifyEnrollment ? '1px solid rgba(201,168,76,1)' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {notifyEnrollment && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0C1F17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[12px] sm:text-[13px] text-white/35 group-hover:text-white/50 transition-colors select-none">
            Alert me when 2026 ARC/PLC enrollment opens
          </span>
        </label>

        {/* Trust signals */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-white/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.6)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            No account needed
          </span>
          <span className="text-white/10">·</span>
          <span className="flex items-center gap-1 text-[11px] text-white/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.6)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            We never sell your data
          </span>
          <span className="text-white/10">·</span>
          <span className="flex items-center gap-1 text-[11px] text-white/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.6)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            Unsubscribe anytime
          </span>
        </div>
      </div>

      {/* Secondary actions row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Print Report (free, no email required) */}
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-[14px] text-[13px] sm:text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.12] active:scale-[0.98] active:duration-75 print:hidden"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.4)',
            background: 'transparent',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print for FSA Office
        </button>

        {/* View County Page */}
        {countySlug && stateSlug && (
          <Link
            href={`/${stateSlug}/${countySlug}/arc-plc`}
            className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-[14px] text-[13px] sm:text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.12] active:scale-[0.98] active:duration-75 no-underline print:hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            View {countyName} Page →
          </Link>
        )}
      </div>
    </div>
  );
}
