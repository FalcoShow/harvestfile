// =============================================================================
// HarvestFile — Consolidated Middleware
// Build 18 Deploy 6B: Added /api/unsubscribe route exclusion for email unsub
// Build 18 Deploy 6: Added /api/leads route exclusion for email capture
// Build 18 Deploy 4: Added county-elections API route exclusion
// Build 18 Deploy 3: Added historical-payments + calculator API route exclusions
// Phase 19: Added SMS webhook route exclusions
// Build 5 Deploy 1: Added geo detection API route exclusion
// Build 17 Deploy 6: Added sitemap + robots.txt bypass for Google crawling
//
// Handles: auth session refresh, dashboard route protection, auth redirects
// CRITICAL: Stripe webhook, SMS webhooks, geo detection, sitemaps, and
// robots.txt are EXCLUDED to prevent 307 redirects and crawl failures.
// =============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── EARLY RETURN: Skip auth for sitemaps + robots (Google crawling) ───
  // This is the PRIMARY fix for "Couldn't fetch" in Google Search Console.
  // Without this, Googlebot's requests run through Supabase auth.getUser()
  // with no session cookie, adding latency and occasional failures that
  // GSC caches for weeks.
  if (
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemap/') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  // ── EARLY RETURN: Skip auth logic for Stripe webhook ──────────────────
  if (pathname.startsWith('/api/stripe/webhook') || pathname.startsWith('/api/webhooks/stripe')) {
    return NextResponse.next();
  }

  // ── EARLY RETURN: Skip auth logic for public API routes ───────────────
  if (
    pathname.startsWith('/api/benchmarks') ||
    pathname.startsWith('/api/counties') ||
    pathname.startsWith('/api/calculator') ||        // Build 18: Calculator estimate API
    pathname.startsWith('/api/historical-payments') || // Build 18 Deploy 3: Historical payment data
    pathname.startsWith('/api/county-elections') ||    // Build 18 Deploy 4: County election data
    pathname.startsWith('/api/leads') ||               // Build 18 Deploy 6: Email capture (pre-auth)
    pathname.startsWith('/api/unsubscribe') ||         // Deploy 6B: Email unsubscribe (RFC 8058)
    pathname.startsWith('/api/inngest') ||
    pathname.startsWith('/api/geo') ||           // Build 5: Geo detection (public, no auth needed)
    pathname.startsWith('/api/grain-bids') ||    // Build 5: Grain bids (public)
    pathname.startsWith('/api/sms/status') ||    // Phase 19: Twilio delivery status
    pathname.startsWith('/api/sms/inbound')      // Phase 19: Twilio inbound SMS
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could lead to users
  // being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Protect dashboard routes ──────────────────────────────────────────
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ── Redirect authenticated users away from auth pages ─────────────────
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = redirect;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files, _next internals, and crawlable XML/JSON
    // CRITICAL: sitemap.xml, sitemap/*, and robots.txt MUST be excluded here
    // AND have early returns above (belt + suspenders for Google crawling)
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|sitemap/|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};
