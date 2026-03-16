// =============================================================================
// HarvestFile — Marketing Header (Server Component)
// Build 2 → Phase 8C: Added "Election Map" nav link
//
// Logged out: "Log in" + "Get Started" CTAs
// Logged in:  "Go to Dashboard →" CTA
// No "use client" — auth resolves before HTML ships = zero FOUC
// =============================================================================

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderScrollWrapper } from "./header-scroll-wrapper";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";

export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <HeaderScrollWrapper>
      <nav className="relative flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size={28} />
          <span className="text-[17px] font-extrabold tracking-[-0.04em] text-foreground">
            Harvest<span className="text-harvest-gold">File</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/check"
            className="text-sm font-medium text-foreground/55 hover:text-foreground transition-colors"
          >
            Calculator
          </Link>
          <Link
            href="/elections"
            className="text-sm font-medium text-foreground/55 hover:text-foreground transition-colors"
          >
            Election Map
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-foreground/55 hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/programs/arc-co"
            className="text-sm font-medium text-foreground/55 hover:text-foreground transition-colors"
          >
            Programs
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-foreground/55 hover:text-foreground transition-colors"
          >
            About
          </Link>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-foreground/55 hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <MobileMenu isAuthenticated={isAuthenticated} />
      </nav>
    </HeaderScrollWrapper>
  );
}
