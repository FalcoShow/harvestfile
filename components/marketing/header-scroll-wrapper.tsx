// =============================================================================
// HarvestFile — HeaderScrollWrapper (Client Component)
// Phase 23 Build 1.1: iOS Safari backdrop-filter touch fix
//
// FIX: Added pointer-events-none to header, pointer-events-auto to container.
// iOS Safari's backdrop-filter on fixed elements creates a compositing layer
// that swallows touch events. This ensures only the visible pill captures
// pointer events while the invisible header area passes them through.
//
// ADAPTIVE NAVIGATION that changes appearance based on:
//   1. Scroll position (has user scrolled past hero?)
//   2. Current section theme (dark vs light background)
// =============================================================================

'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function HeaderScrollWrapper({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [navTheme, setNavTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
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
        rootMargin: '0px 0px -90% 0px',
        threshold: [0, 0.1],
      }
    );

    const sections = document.querySelectorAll('[data-nav-theme]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const isOnDark = navTheme === 'dark';
  const useDarkMode = !scrolled || isOnDark;

  return (
    // pointer-events-none on header: the invisible full-width fixed bar
    // passes through all touch/click events to content below
    <header className="fixed top-0 left-0 right-0 z-[999] px-4 sm:px-6 pointer-events-none">
      {/* pointer-events-auto on container: only the visible pill captures events */}
      <div
        className={`
          mx-auto max-w-[1200px] mt-3 rounded-2xl pointer-events-auto
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${scrolled
            ? isOnDark
              ? 'bg-[#0C1F17]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
              : 'bg-white/80 backdrop-blur-2xl border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.06)]'
            : 'bg-transparent border border-transparent'
          }
        `}
        // Force GPU compositing for iOS Safari backdrop-filter reliability
        style={{ WebkitTransform: 'translateZ(0)' }}
      >
        <div className="px-5 sm:px-6">
          {/* Inject CSS custom properties for child text colors + dropdown */}
          <div
            style={{
              ['--nav-text' as string]: useDarkMode ? 'rgba(255,255,255,0.85)' : '#1A1A1A',
              ['--nav-text-muted' as string]: useDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(26,26,26,0.55)',
              ['--nav-cta-bg' as string]: useDarkMode ? '#C9A84C' : '#1B4332',
              ['--nav-cta-text' as string]: useDarkMode ? '#0C1F17' : '#FFFFFF',
              ['--nav-cta-hover' as string]: useDarkMode ? '#E2C366' : '#2D6A4F',
              ['--dropdown-bg' as string]: 'rgba(12,31,23,0.97)',
              ['--dropdown-border' as string]: 'rgba(255,255,255,0.08)',
              ['--dropdown-text' as string]: 'rgba(255,255,255,0.85)',
              ['--dropdown-muted' as string]: 'rgba(255,255,255,0.35)',
              ['--dropdown-icon' as string]: 'rgba(255,255,255,0.4)',
            } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}
