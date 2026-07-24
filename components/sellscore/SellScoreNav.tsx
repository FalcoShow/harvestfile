// components/sellscore/SellScoreNav.tsx
// =============================================================================
// Sell Score paid-user navigation bar (client component, M-02, May 18, 2026)
//
// Sticky top bar with two tabs: Score and Settings. Markets gets added when
// /sellscore/markets ships in June 2026 per the migration plan locked
// May 15. Three tabs total at that point, not before.
//
// Mobile-first design constraints from project instructions:
//   - 48px touch targets minimum (WCAG 2.5.5)
//   - 18px text minimum for 58+ farmer demographic
//   - Dark mode #131918 bar on #0a0f0d page background
//   - Emerald #34D399 accent for active tab (text + 2px underline)
//   - Bricolage Grotesque font family
//   - Off-white #E8F0EB instead of pure white for body text
//
// Active-state logic: usePathname() returns the current route. A tab is
// active when pathname exactly equals tab.href or starts with tab.href + '/'.
// The startsWith check covers nested routes (e.g. /sellscore/settings/billing
// still highlights Settings).
//
// Round 2 Item 1 (July 23, 2026, v6.6 backlog #4): the HARVESTFILE wordmark
// is now the back-navigation path to the marketing site
// (https://www.harvestfile.com/) instead of a redundant Score shortcut —
// the Score tab two inches to the right already covers that. Plain <a>
// rather than next/link: the marketing site is a full-page navigation out
// of the app shell, so client-side routing has nothing to prefetch.
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavTab {
  href: string;
  label: string;
}

const TABS: readonly NavTab[] = [
  { href: '/sellscore/me', label: 'Score' },
  { href: '/sellscore/settings', label: 'Settings' },
] as const;

export default function SellScoreNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sell Score primary navigation"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(19, 25, 24, 0.92)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Brand wordmark — back-navigation to the marketing site */}
        <a
          href="https://www.harvestfile.com/"
          aria-label="Back to the HarvestFile website"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '48px',
            minWidth: '48px',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'rgba(232, 240, 235, 0.95)',
            textDecoration: 'none',
            fontFamily:
              '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          HarvestFile
        </a>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  minWidth: '48px',
                  padding: '0 12px',
                  fontSize: '18px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive
                    ? '#34D399'
                    : 'rgba(232, 240, 235, 0.70)',
                  textDecoration: 'none',
                  fontFamily:
                    '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                  letterSpacing: '-0.005em',
                  transition: 'color 120ms ease',
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '12px',
                      right: '12px',
                      height: '2px',
                      backgroundColor: '#34D399',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
