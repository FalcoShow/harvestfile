// =============================================================================
// HarvestFile — Marketing Header (Server Component)
// Phase 23 Build 1: Navigation Overhaul
//
// CHANGES:
//   - "Free Tools" dropdown replaces single "Calculator" link
//   - All 6 free tools visible with icons and descriptions
//   - Clean nav: Free Tools | Election Map | OBBBA Guide | Pricing | About
//   - Auth-aware CTA (Dashboard vs Get Started)
//   - Adaptive text colors via CSS custom properties from HeaderScrollWrapper
// =============================================================================

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HeaderScrollWrapper } from './header-scroll-wrapper';
import { MobileMenu } from './mobile-menu';
import { Logo } from './logo';
import { ToolsDropdown } from './tools-dropdown';

export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <HeaderScrollWrapper>
      <nav className="relative flex h-16 items-center justify-between">
        {/* Logo — uses CSS custom property for adaptive color */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size={28} />
          <span
            className="text-[17px] font-extrabold tracking-[-0.04em] transition-colors duration-500"
            style={{ color: 'var(--nav-text)' }}
          >
            Harvest<span className="text-harvest-gold">File</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          {/* Free Tools dropdown — client component */}
          <ToolsDropdown />

          {[
            { href: '/elections', label: 'Election Map' },
            { href: '/obbba', label: 'OBBBA Guide' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/about', label: 'About' },
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
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-500"
              style={{
                backgroundColor: 'var(--nav-cta-bg)',
                color: 'var(--nav-cta-text)',
              }}
            >
              Go to Dashboard →
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
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <MobileMenu isAuthenticated={isAuthenticated} />
      </nav>
    </HeaderScrollWrapper>
  );
}
