// =============================================================================
// HarvestFile — More Dropdown (Client Component)
// THE GREAT CONSOLIDATION — Build 1
//
// Replaces the 17-tool mega-dropdown with a compact secondary nav.
// Primary tools (Calculator, Markets, Dashboard, Advisor) are now
// direct nav links — they don't need a dropdown.
//
// This dropdown holds:
//   - Election Map (the viral/shareable surface)
//   - OBBBA Guide (educational content)
//   - Pricing
//   - About
//   - Divider
//   - "Browse All Tools" link (preserves discoverability)
//
// Same hover-activated pattern, same CSS custom properties.
// =============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const MORE_LINKS = [
  {
    href: '/elections',
    label: 'Election Map',
    description: 'County-level ARC vs PLC elections',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: '/navigator',
    label: 'USDA Programs',
    description: 'Find every program you qualify for',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    href: '/obbba',
    label: 'OBBBA Guide',
    description: '2025 farm bill explained',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: '/pricing',
    label: 'Pricing',
    description: 'Free forever + Pro plans',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    href: '/about',
    label: 'About',
    description: 'Our mission for farmers',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
];

// Tools that are still accessible but moved out of primary nav
const ALL_TOOLS_HIGHLIGHTS = [
  { href: '/grain', label: 'Grain Marketing' },
  { href: '/farm-score', label: 'Farm Score' },
  { href: '/cashflow', label: 'Cash Flow' },
  { href: '/insurance', label: 'Crop Insurance' },
  { href: '/weather', label: 'Ag Weather' },
  { href: '/breakeven', label: 'Breakeven' },
];

export function MoreDropdown() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-500 hover:opacity-80"
        style={{ color: 'var(--nav-text-muted)' }}
      >
        More
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-3 w-[280px] rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--dropdown-bg, rgba(12,31,23,0.97))',
            borderColor: 'var(--dropdown-border, rgba(255,255,255,0.08))',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Primary links */}
          <div className="px-2 py-2">
            {MORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.06] group"
              >
                <div
                  className="mt-0.5 shrink-0 transition-colors"
                  style={{ color: 'var(--dropdown-icon, rgba(255,255,255,0.4))' }}
                >
                  {link.icon}
                </div>
                <div className="min-w-0">
                  <span
                    className="text-sm font-semibold transition-colors group-hover:text-harvest-gold"
                    style={{ color: 'var(--dropdown-text, rgba(255,255,255,0.85))' }}
                  >
                    {link.label}
                  </span>
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: 'var(--dropdown-muted, rgba(255,255,255,0.35))' }}
                  >
                    {link.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Divider + Quick access to other tools */}
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'var(--dropdown-border, rgba(255,255,255,0.06))' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2.5"
              style={{ color: 'var(--dropdown-muted, rgba(255,255,255,0.25))' }}
            >
              More Tools
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TOOLS_HIGHLIGHTS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.08] hover:text-harvest-gold"
                  style={{ color: 'var(--dropdown-muted, rgba(255,255,255,0.4))' }}
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
