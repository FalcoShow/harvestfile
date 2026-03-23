// =============================================================================
// HarvestFile — Tools Dropdown (Client Component)
// Phase 27 Build 1: Added Breakeven Calculator (12 free tools)
//
// Premium dropdown showing all 12 free tools with icons and descriptions.
// Hover-activated on desktop, click on mobile. Uses CSS custom properties
// from HeaderScrollWrapper for adaptive theming.
// =============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const FREE_TOOLS = [
  {
    href: '/morning',
    label: 'Morning Dashboard',
    description: 'Weather, markets & spray — one page',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
    badge: null,
  },
  {
    href: '/breakeven',
    label: 'Breakeven Calculator',
    description: 'Cost analysis vs. live futures prices',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    badge: 'NEW',
  },
  {
    href: '/markets',
    label: 'Commodity Markets',
    description: 'Futures prices with ARC/PLC payment impact',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/insurance',
    label: 'Insurance Calculator',
    description: 'RP + SCO + ECO stacking optimizer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7h-3a2 2 0 0 1-2-2V2" /><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" /><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" /><path d="M12 10v6" /><path d="M9 13h6" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/optimize',
    label: 'Election Optimizer',
    description: 'Monte Carlo ARC vs PLC analysis',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/check',
    label: 'ARC/PLC Calculator',
    description: 'Compare programs by county & crop',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/weather',
    label: 'Ag Weather Dashboard',
    description: 'GDD tracking, soil temps & planting windows',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/spray-window',
    label: 'Spray Window Calculator',
    description: '7-factor GO/NO-GO spray decisions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/payments',
    label: 'Payment Scanner',
    description: 'Estimate ARC-CO & PLC payments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/fba',
    label: 'Base Acre Analyzer',
    description: 'Farmer Bridge Assistance eligibility',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><rect x="7" y="13" width="4" height="5" rx="0.5" /><rect x="13" y="8" width="4" height="10" rx="0.5" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/sdrp',
    label: 'SDRP Checker',
    description: 'Spot market price relief eligibility',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    badge: null,
  },
  {
    href: '/calendar',
    label: 'Policy Calendar',
    description: 'USDA deadlines & payment dates',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    badge: null,
  },
];

export function ToolsDropdown() {
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
        Free Tools
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
          className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[340px] max-h-[75vh] rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--dropdown-bg, rgba(12,31,23,0.97))',
            borderColor: 'var(--dropdown-border, rgba(255,255,255,0.08))',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div className="px-4 pt-4 pb-2">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--dropdown-muted, rgba(255,255,255,0.3))' }}
            >
              Free Tools — No Account Required
            </p>
          </div>

          <div className="px-2 pb-2 max-h-[55vh] overflow-y-auto">
            {FREE_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.06] group"
              >
                <div
                  className="mt-0.5 shrink-0 transition-colors"
                  style={{ color: 'var(--dropdown-icon, rgba(255,255,255,0.4))' }}
                >
                  {tool.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold transition-colors group-hover:text-harvest-gold"
                      style={{ color: 'var(--dropdown-text, rgba(255,255,255,0.85))' }}
                    >
                      {tool.label}
                    </span>
                    {tool.badge && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-harvest-gold/20 text-harvest-gold">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: 'var(--dropdown-muted, rgba(255,255,255,0.35))' }}
                  >
                    {tool.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'var(--dropdown-border, rgba(255,255,255,0.06))' }}
          >
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-xs font-semibold transition-colors hover:text-harvest-gold"
              style={{ color: 'var(--dropdown-muted, rgba(255,255,255,0.4))' }}
            >
              <span>Create free account to save results</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
