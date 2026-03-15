"use client";

import { useEffect, useState, type ReactNode } from "react";

// =============================================================================
// Floating glass pill header — works on any background (dark hero or light page)
// Always has enough background opacity to maintain text contrast
// Gains stronger bg + shadow on scroll
// =============================================================================

export function HeaderScrollWrapper({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] px-4 sm:px-6">
      <div
        className={`
          mx-auto max-w-[1200px] mt-3 rounded-2xl transition-all duration-300
          ${
            scrolled
              ? "bg-[#FAFAF7]/92 backdrop-blur-2xl border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
              : "bg-[#FAFAF7]/80 backdrop-blur-xl border border-black/[0.04]"
          }
        `}
      >
        <div className="px-5 sm:px-6">{children}</div>
      </div>
    </header>
  );
}
