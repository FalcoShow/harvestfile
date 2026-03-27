// =============================================================================
// HarvestFile — Consolidated Middleware
// Phase 19: Added SMS webhook route exclusions
// Build 5 Deploy 1: Added geo detection API route exclusion
//
// Handles: auth session refresh, dashboard route protection, auth redirects
// CRITICAL: Stripe webhook + SMS webhooks + geo detection are EXCLUDED from
// the matcher to prevent 307 redirects and avoid unnecessary auth overhead.
// =============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── EARLY RETURN: Skip auth logic for Stripe webhook ──────────────────
  if (pathname.startsWith('/api/stripe/webhook') || pathname.startsWith('/api/webhooks/stripe')) {
    return NextResponse.next();
  }

  // ── EARLY RETURN: Skip auth logic for public API routes ───────────────
  if (
    pathname.startsWith('/api/benchmarks') ||
    pathname.startsWith('/api/counties') ||
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
    // Match all routes except static files, _next, and API routes that need to be public
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};
