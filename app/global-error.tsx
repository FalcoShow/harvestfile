// =============================================================================
// HarvestFile — Consolidation Phase 1, Build 1: Global Error Boundary
//
// CRITICAL FOR SEO: When Googlebot encounters a client-side error, Next.js
// shows "Application error: a client-side exception has occurred" — an empty
// page that Google classifies as a soft-404. This global error boundary
// ensures meaningful content is always returned, preventing soft-404 flags.
//
// This file catches errors that escape route-level error.tsx boundaries.
// =============================================================================

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: '#faf8f5',
          color: '#1a1a1a',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '520px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#0C1F17',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M3.6 15.4 10.6 4.6a1.6 1.6 0 0 1 2.8 0l7 10.8A1.6 1.6 0 0 1 19 18H5a1.6 1.6 0 0 1-1.4-2.6z" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
              color: '#0C1F17',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '1rem',
              color: '#6b7280',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            HarvestFile encountered an unexpected error. This has been
            logged and our team will investigate. Try refreshing the page
            or return to the homepage.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0C1F17',
                color: '#C9A84C',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#0C1F17',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Go Home
            </a>
          </div>

          {/* SEO content — ensures Googlebot sees meaningful text */}
          <div style={{ marginTop: '3rem', color: '#9ca3af', fontSize: '0.8rem' }}>
            <p>
              HarvestFile — Free ARC/PLC calculator and farm financial tools
              for American farmers. Analyze ARC-CO vs PLC elections, track
              commodity prices, and optimize your USDA program decisions.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
