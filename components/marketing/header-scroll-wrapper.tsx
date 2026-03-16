// =============================================================================
// HarvestFile — HeaderScrollWrapper (Client Component)
// Phase 9 Build 1.5: Cinematic Homepage Polish
//
// ADAPTIVE NAVIGATION that changes appearance based on:
//   1. Scroll position (has user scrolled past hero?)
//   2. Current section theme (dark vs light background)
//
// States:
//   - Initial (hero visible): Fully transparent, white text, no border
//   - Scrolled + dark section: Dark frosted glass, white text
//   - Scrolled + light section: Light frosted glass, dark text
//
// This eliminates the "hard white strip" problem on the dark hero.
// =============================================================================

'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function HeaderScrollWrapper({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [navTheme, setNavTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Track scroll position
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Track which section is behind the nav using Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible at the top of viewport
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const theme = entry.target.getAttribute('data-nav-theme');
            if (theme === 'dark' || theme === 'light') {
              setNavTheme(theme);
            }
          }
        }
      },
      {
        // Only observe the top 100px of the viewport (where the nav sits)
        rootMargin: '0px 0px -90% 0px',
        threshold: [0, 0.1],
      }
    );

    // Observe all sections with data-nav-theme
    const sections = document.querySelectorAll('[data-nav-theme]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // Determine nav visual state
  const isOnDark = navTheme === 'dark';

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] px-4 sm:px-6">
      <div
        className={`
          mx-auto max-w-[1200px] mt-3 rounded-2xl
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${scrolled
            ? isOnDark
              // Scrolled + dark section: dark frosted glass
              ? 'bg-[#0C1F17]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
              // Scrolled + light section: light frosted glass  
              : 'bg-white/80 backdrop-blur-2xl border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.06)]'
            // Not scrolled: fully transparent, no border
            : 'bg-transparent border border-transparent'
          }
        `}
      >
        <div className="px-5 sm:px-6">
          {/* Inject CSS custom properties for child text colors */}
          <div
            style={{
              // When not scrolled OR on dark background: white text
              // When scrolled on light background: dark text
              ['--nav-text' as string]: (!scrolled || isOnDark) ? 'rgba(255,255,255,0.85)' : '#1A1A1A',
              ['--nav-text-muted' as string]: (!scrolled || isOnDark) ? 'rgba(255,255,255,0.5)' : 'rgba(26,26,26,0.55)',
              ['--nav-cta-bg' as string]: (!scrolled || isOnDark) ? '#C9A84C' : '#1B4332',
              ['--nav-cta-text' as string]: (!scrolled || isOnDark) ? '#0C1F17' : '#FFFFFF',
              ['--nav-cta-hover' as string]: (!scrolled || isOnDark) ? '#E2C366' : '#2D6A4F',
            } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}
