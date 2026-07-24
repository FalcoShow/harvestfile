// =============================================================================
// HarvestFile — Marketing Header (Server Component)
// DEPLOY 3E: Navigation Restructure — 4 Surface Architecture
//
// FROM: 5 items (Calculator, Markets, Dashboard, Advisor, More)
//       "Markets" and "Dashboard" both pointed to /morning — confusing
// TO:   4 items matching the 4-surface architecture
//       My Farm → /morning (daily habit)
//       Programs → /check (acquisition tool)
//       Planner → /planner (monetization bridge — Coming Soon)
//       Advisor → /advisor (AI connective tissue)
//
// Every tab leads to a UNIQUE destination. Zero redundancy.
// Farmer-friendly language — not developer language.
// "More" dropdown eliminated — secondary pages live in footer only.
//
// July 23, 2026 (B1, Complete Screen + Front Door sprint):
//   - "Sell Score" nav item added — the paid product now appears by name
//     on every marketing surface. Logged-out (and logged-in non-
//     subscribers) route to /pricing, the conversion page; active Sell
//     Score subscribers route straight to /sellscore/me.
//   - Paid detection: farms.sellscore_active via the SHORT auth chain
//     (owner_id = auth.uid()), same source of truth as /sellscore/me.
//   - The gold CTA pill keeps its behavior for paid users but is labeled
//     "Sell Score" → /sellscore/me ("Dashboard" is meaningless to a
//     stranger, and /dashboard is an archived surface). Logged-in
//     non-subscribers keep the legacy Dashboard button unchanged.
//
// Auth-aware CTA: Sell Score (paid) / Dashboard (logged in) / Get Started
// (anonymous). Adaptive colors via CSS custom properties from
// HeaderScrollWrapper.
// =============================================================================

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HeaderScrollWrapper } from './header-scroll-wrapper';
import { MobileMenu } from './mobile-menu';
import { Logo } from './logo';
import { HeaderCountySearch } from './header-county-search';

export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // B1: is this user an active Sell Score subscriber? Same SHORT chain
  // as /sellscore/me (farms.owner_id = auth.uid(), newest farm wins).
  let isPaidSellScore = false;
  if (user) {
    const { data: farm } = await supabase
      .from('farms')
      .select('sellscore_active')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    isPaidSellScore = !!farm?.sellscore_active;
  }

  // Logged-out → /pricing (conversion page). Paid → the product itself.
  const sellScoreHref = isPaidSellScore ? '/sellscore/me' : '/pricing';

  return (
    <HeaderScrollWrapper>
      <nav className="relative flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size={28} />
          <span
            className="text-[17px] font-extrabold tracking-[-0.04em] transition-colors duration-500"
            style={{ color: 'var(--nav-text)' }}
          >
            Harvest<span className="text-harvest-gold">File</span>
          </span>
        </Link>

        {/* Desktop nav — Sell Score (the paid product) + 4 surfaces */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { href: sellScoreHref, label: 'Sell Score' },
            { href: '/morning', label: 'My Farm' },
            { href: '/check', label: 'Programs' },
            { href: '/planner', label: 'Planner' },
            { href: '/advisor', label: 'Advisor' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium transition-colors duration-500 hover:opacity-80"
              style={{ color: 'var(--nav-text-muted)' }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop: Search + CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {/* County search trigger — Cmd+K command palette */}
          <HeaderCountySearch />

          {/* Subtle divider */}
          <div className="w-px h-5 bg-current opacity-10" style={{ color: 'var(--nav-text)' }} />

          {isAuthenticated ? (
            <Link
              href={isPaidSellScore ? '/sellscore/me' : '/dashboard'}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-500"
              style={{
                backgroundColor: 'var(--nav-cta-bg)',
                color: 'var(--nav-cta-text)',
              }}
            >
              {isPaidSellScore ? 'Sell Score' : 'Dashboard'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium transition-colors duration-500 hover:opacity-80"
                style={{ color: 'var(--nav-text-muted)' }}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-500"
                style={{
                  backgroundColor: 'var(--nav-cta-bg)',
                  color: 'var(--nav-cta-text)',
                }}
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile: Search icon + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <HeaderCountySearch />
          <MobileMenu
            isAuthenticated={isAuthenticated}
            isPaidSellScore={isPaidSellScore}
            sellScoreHref={sellScoreHref}
          />
        </div>
      </nav>
    </HeaderScrollWrapper>
  );
}
