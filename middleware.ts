// =============================================================================
// HarvestFile — Consolidated Middleware
// Phase 8A: Revenue Plumbing Fix
//
// Handles: auth session refresh, dashboard route protection, auth redirects
// CRITICAL: Stripe webhook route is EXCLUDED from the matcher to prevent
// 307 redirects that kill webhook delivery.
// =============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── EARLY RETURN: Skip auth logic for Stripe webhook ──────────────────
  // Stripe POSTs have no Supabase cookies. Running the SSR cookie logic
  // on them corrupts the response into a 307 redirect.
  if (pathname.startsWith('/api/stripe/webhook') || pathname.startsWith('/api/webhooks/stripe')) {
    return NextResponse.next();
  }

  // ── EARLY RETURN: Skip auth logic for public API routes ───────────────
  // These are called from client components or external services
  if (
    pathname.startsWith('/api/benchmarks') ||
    pathname.startsWith('/api/counties') ||
    pathname.startsWith('/api/inngest')
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

  // ── Protect dashboard routes — redirect to login if no session ────────
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ── Redirect logged-in users away from auth pages ─────────────────────
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match dashboard routes (protected)
    '/dashboard/:path*',
    // Match auth pages (redirect if logged in)
    '/login',
    '/signup',
    // Match API routes that need session refresh
    // NOTE: Stripe webhook, benchmarks, counties, and inngest are excluded
    // via early returns above (they still match here for session refresh
    // on authenticated API calls like /api/stripe/checkout)
    '/api/:path*',
  ],
};
