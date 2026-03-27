// =============================================================================
// HarvestFile — Mobile Menu (Client Component)
// THE GREAT CONSOLIDATION — Build 1
//
// FROM: Flat list of 17 tools (overwhelming, feels like a directory)
// TO:   5 primary nav items + expandable "More Tools" section
//
// The mobile nav now tells a story:
//   1. Hero section — the 4 core surfaces every farmer uses daily
//   2. Resources — Election Map, OBBBA Guide, Programs
//   3. Expandable — all other tools (still accessible, not hidden)
//
// Same portal-based rendering pattern for iOS compatibility.
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Logo } from "./logo";

interface MobileMenuProps {
  isAuthenticated: boolean;
}

const PRIMARY_NAV = [
  {
    href: "/check",
    label: "ARC/PLC Calculator",
    desc: "Compare programs by county & crop",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" />
      </svg>
    ),
  },
  {
    href: "/markets",
    label: "Commodity Markets",
    desc: "Futures prices with ARC/PLC payment impact",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/morning",
    label: "Morning Dashboard",
    desc: "Weather, markets & your daily briefing",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      </svg>
    ),
  },
  {
    href: "/advisor",
    label: "AI Farm Advisor",
    desc: "AI-powered farm financial intelligence",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" /><path d="M8.24 9.93A4 4 0 0 1 12 2" /><path d="M12 18v-8" /><path d="m8 22 4-4 4 4" /><circle cx="12" cy="14" r="1" />
      </svg>
    ),
  },
];

const RESOURCES = [
  { href: "/elections", label: "Election Map" },
  { href: "/navigator", label: "USDA Programs" },
  { href: "/obbba", label: "OBBBA Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

const MORE_TOOLS = [
  { href: "/grain", label: "Grain Marketing" },
  { href: "/cashflow", label: "Cash Flow Forecaster" },
  { href: "/farm-score", label: "Farm Score" },
  { href: "/breakeven", label: "Breakeven Calculator" },
  { href: "/insurance", label: "Crop Insurance" },
  { href: "/optimize", label: "Election Optimizer" },
  { href: "/weather", label: "Ag Weather" },
  { href: "/spray-window", label: "Spray Window" },
  { href: "/payments", label: "Payment Scanner" },
  { href: "/fba", label: "Base Acre Analyzer" },
  { href: "/sdrp", label: "SDRP Checker" },
  { href: "/calendar", label: "Policy Calendar" },
];

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const preventTouchMove = useCallback((e: TouchEvent) => {
    const menuContent = document.getElementById('hf-mobile-menu-content');
    if (menuContent && menuContent.contains(e.target as HTMLElement)) {
      return;
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
    } else {
      document.body.style.overflow = "";
      document.removeEventListener('touchmove', preventTouchMove);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [open, preventTouchMove]);

  // Reset expanded state when menu closes
  useEffect(() => {
    if (!open) setToolsExpanded(false);
  }, [open]);

  const overlay = open ? (
    <div
      className="fixed inset-0 z-[1100] bg-[#0a0f0d] md:hidden"
      onClick={() => setOpen(false)}
    >
      <div
        id="hf-mobile-menu-content"
        className="flex flex-col h-full overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 h-16 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={() => setOpen(false)}
          >
            <Logo size={26} />
            <span className="text-[17px] font-extrabold tracking-[-0.04em] text-white">
              Harvest<span className="text-harvest-gold">File</span>
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 rounded-lg text-white/60 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-6 pt-2">
          {/* Primary nav — the 4 core surfaces */}
          <div className="space-y-1 mb-8">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors hover:bg-white/[0.04] group"
              >
                <div className="shrink-0 text-harvest-gold/60 group-hover:text-harvest-gold transition-colors">
                  {item.icon}
                </div>
                <div>
                  <span className="text-[15px] font-semibold text-white/90 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Resources */}
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 mb-3 px-1">
            Resources
          </p>
          <div className="space-y-0.5 mb-6">
            {RESOURCES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-3 px-1 border-b border-white/[0.04] group"
              >
                <span className="text-[15px] font-medium text-white/50 group-hover:text-white transition-colors">
                  {item.label}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/15 group-hover:text-white/30 transition-colors shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Expandable: More Tools */}
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="flex items-center justify-between w-full py-3 px-1 mb-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
              More Tools
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-white/20 transition-transform duration-200 ${toolsExpanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {toolsExpanded && (
            <div className="space-y-0.5 mb-6 animate-in slide-in-from-top-2 duration-200">
              {MORE_TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-2.5 px-1 border-b border-white/[0.03] group"
                >
                  <span className="text-[14px] font-medium text-white/35 group-hover:text-white/70 transition-colors">
                    {tool.label}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/10 group-hover:text-white/25 transition-colors shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom CTAs */}
        <div className="px-6 pb-8 pt-6 space-y-3 shrink-0">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-harvest-gold px-6 py-3.5 text-sm font-semibold text-[#0C1F17] hover:bg-[#E2C366] transition-colors"
            >
              Go to Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-harvest-gold px-6 py-3.5 text-sm font-semibold text-[#0C1F17] hover:bg-[#E2C366] transition-colors"
              >
                Get Started — Free
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-6 py-3.5 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 rounded-lg transition-colors hover:bg-white/10 relative z-10"
        style={{ color: 'var(--nav-text, rgba(255,255,255,0.8))' }}
        aria-label="Open menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {mounted && overlay && createPortal(overlay, document.body)}
    </>
  );
}
