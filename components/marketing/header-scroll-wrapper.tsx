// =============================================================================
// HarvestFile — HeaderScrollWrapper (Client Component)
// Phase 26 Build 2.1: Fixed invisible header on light-background pages
//
// FIX: Header now ALWAYS has dark background. Previously, unscrolled state
// was bg-transparent which made white nav text invisible on light pages
// like /about, /weather, /spray-window, /privacy, /terms, /programs/*.
//
// BEFORE: Unscrolled = transparent bg → invisible on white pages
// AFTER:  Unscrolled = dark bg (same as scrolled-on-dark) → always readable
//
// iOS Safari backdrop-filter fix retained (pointer-events pattern).
// =============================================================================

'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function HeaderScrollWrapper({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] px-4 sm:px-6 pointer-events-none">
      <div
        className={`
          mx-auto max-w-[1200px] mt-3 rounded-2xl pointer-events-auto
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          bg-[#0C1F17]/80 backdrop-blur-2xl border shadow-[0_4px_24px_rgba(0,0,0,0.3)]
          ${scrolled
            ? 'border-white/[0.08]'
            : 'border-white/[0.04]'
          }
        `}
        style={{ WebkitTransform: 'translateZ(0)' }}
      >
        <div className="px-5 sm:px-6">
          <div
            style={{
              ['--nav-text' as string]: 'rgba(255,255,255,0.85)',
              ['--nav-text-muted' as string]: 'rgba(255,255,255,0.5)',
              ['--nav-cta-bg' as string]: '#C9A84C',
              ['--nav-cta-text' as string]: '#0C1F17',
              ['--nav-cta-hover' as string]: '#E2C366',
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
