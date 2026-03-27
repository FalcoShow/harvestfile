// =============================================================================
// HarvestFile — Marketing Header (Server Component)
// THE GREAT CONSOLIDATION — Build 1: Navigation Overhaul
//
// FROM: "Free Tools" mega-dropdown listing 17 separate tools
// TO:   5-item nav presenting HarvestFile as ONE platform
//
// Nav structure:
//   Calculator → /check (the franchise, primary SEO page)
//   Markets   → /markets (commodity prices + ARC/PLC payment impact)
//   Dashboard → /morning (the daily engagement anchor)
//   Advisor   → /advisor (AI-powered conversational interface)
//   More      → dropdown (Election Map, OBBBA Guide, Pricing, About)
//
// Every existing tool URL stays alive. The nav just stops presenting
// HarvestFile as a collection of tools and starts presenting it as
// one product with depth. This is the Credit Karma moment — they
// don't list "Credit Score Tool, Credit Card Finder, Loan Matcher"
// in their nav. They show ONE product.
//
// Auth-aware CTA: Dashboard (logged in) vs Get Started (anonymous)
// Adaptive colors via CSS custom properties from HeaderScrollWrapper
// =============================================================================

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HeaderScrollWrapper } from './header-scroll-wrapper';
import { MobileMenu } from './mobile-menu';
import { Logo } from './logo';
import { MoreDropdown } from './more-dropdown';
import { HeaderCountySearch } from './header-county-search';

export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

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

        {/* Desktop nav — 5 items, clean and focused */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { href: '/check', label: 'Calculator' },
            { href: '/markets', label: 'Markets' },
            { href: '/morning', label: 'Dashboard' },
            { href: '/advisor', label: 'Advisor' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors duration-500 hover:opacity-80"
              style={{ color: 'var(--nav-text-muted)' }}
            >
              {link.label}
            </Link>
          ))}

          {/* More dropdown — Election Map, OBBBA Guide, Pricing, About */}
          <MoreDropdown />
        </div>

        {/* Desktop: Search + CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {/* County search trigger — Cmd+K command palette */}
          <HeaderCountySearch />

          {/* Subtle divider */}
          <div className="w-px h-5 bg-current opacity-10" style={{ color: 'var(--nav-text)' }} />

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-500"
              style={{
                backgroundColor: 'var(--nav-cta-bg)',
                color: 'var(--nav-cta-text)',
              }}
            >
              Dashboard
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
          <MobileMenu isAuthenticated={isAuthenticated} />
        </div>
      </nav>
    </HeaderScrollWrapper>
  );
}
