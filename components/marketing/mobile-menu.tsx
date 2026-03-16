// =============================================================================
// HarvestFile — Mobile Menu (Client Component)
// Build 2 → Phase 8C: Added "Election Map" nav link
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "./logo";

interface MobileMenuProps {
  isAuthenticated: boolean;
}

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
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

      {/* Full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar with logo + close */}
            <div className="flex items-center justify-between px-6 h-16">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                onClick={() => setOpen(false)}
              >
                <Logo size={26} />
                <span className="text-[17px] font-extrabold tracking-[-0.04em] text-foreground">
                  Harvest<span className="text-harvest-gold">File</span>
                </span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-lg text-foreground/60 hover:text-foreground transition-colors"
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

            {/* Nav links */}
            <nav className="flex-1 px-6 pt-8">
              <div className="space-y-1">
                {[
                  { href: "/check", label: "ARC/PLC Calculator" },
                  { href: "/elections", label: "Election Map" },
                  { href: "/pricing", label: "Pricing" },
                  { href: "/programs/arc-co", label: "Programs" },
                  { href: "/about", label: "About" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-3.5 text-lg font-semibold text-foreground/70 hover:text-foreground transition-colors border-b border-border/50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Bottom CTAs */}
            <div className="px-6 pb-8 space-y-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                  >
                    Get Started — Free
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-secondary-foreground hover:bg-muted transition-colors"
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
