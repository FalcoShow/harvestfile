// =============================================================================
// HarvestFile — Marketing Header (Server Component — SYNCHRONOUS)
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
//
// July 24, 2026 (Hotfix R2.1 Item A — county pages 500):
//   This component was async and read cookies (supabase.auth.getUser())
//   while rendering inside the (marketing) layout. That layout wraps the
//   static/ISR /[state]/... pages, and cookie access during static
//   regeneration throws DYNAMIC_SERVER_USAGE → 500 on every cold render.
//   The header is now synchronous and COOKIE-FREE — it must stay that way.
//   All auth awareness (Sell Score nav href, desktop CTA, mobile menu CTA)
//   lives in client islands: see HeaderAuthCta.tsx. Pre-hydration markup is
//   the logged-out default, so anonymous visitors get a byte-identical
//   static render with zero layout shift.
//
// Adaptive colors via CSS custom properties from HeaderScrollWrapper.
// =============================================================================

import Link from 'next/link';
import { HeaderScrollWrapper } from './header-scroll-wrapper';
import { MobileMenu } from './mobile-menu';
import { Logo } from './logo';
import { HeaderCountySearch } from './header-county-search';
import { HeaderAuthCta, SellScoreNavLink } from './HeaderAuthCta';

export function MarketingHeader() {
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

        {/* Desktop nav — Sell Score (the paid product) + 4 surfaces.
            Sell Score's href is auth-aware, resolved in the client island. */}
        <div className="hidden md:flex items-center gap-7">
          <SellScoreNavLink />
          {[
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

          {/* Auth-aware CTA island (logged-out default until resolved) */}
          <HeaderAuthCta />
        </div>

        {/* Mobile: Search icon + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <HeaderCountySearch />
          <MobileMenu />
        </div>
      </nav>
    </HeaderScrollWrapper>
  );
}
