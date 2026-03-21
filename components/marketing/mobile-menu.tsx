// =============================================================================
// HarvestFile — Mobile Menu (Client Component)
// Phase 23 Build 1.2: Reverted body lock to overflow:hidden (iOS safe)
//
// FIX: The position:fixed body lock from Build 1.1 caused the page to jump
// to top on menu open and prevented the menu from rendering visibly.
// Reverted to simple overflow:hidden + overscrollBehavior:contain which
// works on both Safari and Chrome on iOS.
//
// KEPT from 1.1: z-[1100] (above header z-[999]), relative z-10 on hamburger
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Logo } from "./logo";

interface MobileMenuProps {
  isAuthenticated: boolean;
}

const FREE_TOOLS = [
  { href: "/optimize", label: "Election Optimizer", desc: "Monte Carlo ARC vs PLC", badge: "NEW" },
  { href: "/check", label: "ARC/PLC Calculator", desc: "Compare programs by county", badge: null },
  { href: "/payments", label: "Payment Scanner", desc: "Projected payments", badge: null },
  { href: "/fba", label: "Base Acre Calculator", desc: "OBBBA base acres", badge: null },
  { href: "/sdrp", label: "SDRP Checker", desc: "Dairy eligibility", badge: null },
  { href: "/calendar", label: "Policy Calendar", desc: "Deadlines & dates", badge: null },
];

const OTHER_LINKS = [
  { href: "/elections", label: "Election Map" },
  { href: "/obbba", label: "OBBBA Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  // Prevent background scroll on iOS — touchmove blocker approach
  // This is the most reliable iOS Safari method, avoids position:fixed entirely
  const preventTouchMove = useCallback((e: TouchEvent) => {
    // Allow scrolling inside the menu overlay itself
    const target = e.target as HTMLElement;
    const menuContent = document.getElementById('hf-mobile-menu-content');
    if (menuContent && menuContent.contains(target)) {
      // Allow scroll inside menu content
      return;
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (open) {
      // Simple overflow hidden — no position:fixed, no scroll jump
      document.body.style.overflow = "hidden";
      // Prevent iOS rubber-band scrolling on background
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

  return (
    <>
      {/* Hamburger button — relative z-10 keeps it above any sibling elements */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 rounded-lg transition-colors hover:bg-white/10 relative z-10"
        style={{ color: 'var(--nav-text, rgba(255,255,255,0.8))' }}
        aria-label="Open menu"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Full-screen overlay — z-[1100] sits ABOVE header (z-[999]) */}
      {open && (
        <div
          className="fixed inset-0 z-[1100] bg-[#0a0f0d] md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            id="hf-mobile-menu-content"
            className="flex flex-col h-full overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar with logo + close */}
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
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav content */}
            <nav className="flex-1 px-6 pt-4">
              {/* Free Tools section */}
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mb-3">
                Free Tools
              </p>
              <div className="space-y-0.5 mb-6">
                {FREE_TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-3 border-b border-white/[0.06] group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-white/80 group-hover:text-harvest-gold transition-colors">
                          {tool.label}
                        </span>
                        {tool.badge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-harvest-gold/20 text-harvest-gold">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/30 mt-0.5">{tool.desc}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/40 transition-colors shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Other links */}
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mb-3">
                Resources
              </p>
              <div className="space-y-0.5">
                {OTHER_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-[15px] font-semibold text-white/60 hover:text-white transition-colors border-b border-white/[0.06]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Bottom CTAs */}
            <div className="px-6 pb-8 pt-6 space-y-3 shrink-0">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-harvest-gold px-6 py-3.5 text-sm font-semibold text-[#0C1F17] hover:bg-[#E2C366] transition-colors"
                >
                  Go to Dashboard →
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
      )}
    </>
  );
}
