// =============================================================================
// HarvestFile — Marketing Footer (Server Component)
// Build 2: Shared footer for all marketing pages
// =============================================================================

import Link from "next/link";
import { Logo } from "./logo";

const footerLinks = {
  Tools: [
    { label: "ARC/PLC Calculator", href: "/check" },
    { label: "Pricing", href: "/pricing" },
  ],
  Learn: [
    { label: "How ARC-CO Works", href: "/programs/arc-co" },
    { label: "How PLC Works", href: "/programs/plc" },
    { label: "EQIP Guide", href: "/programs/eqip" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "mailto:hello@harvestfile.com" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-harvest-forest-950 text-white">
      <div className="hf-noise-subtle" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-16 pb-8">
        {/* Top section: logo + link columns */}
        <div className="flex flex-wrap justify-between gap-10 mb-12">
          {/* Brand */}
          <div className="min-w-[200px]">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={26} />
              <span className="text-[17px] font-extrabold tracking-[-0.04em] text-white">
                Harvest<span className="text-harvest-gold">File</span>
              </span>
            </Link>
            <p className="text-[13px] text-white/20 leading-relaxed max-w-[240px]">
              Making USDA farm program data work for American farmers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <div className="text-[11px] font-extrabold text-white/40 uppercase tracking-[0.1em] mb-4">
                {heading}
              </div>
              <div className="space-y-2.5">
                {links.map((link) =>
                  link.href.startsWith("mailto") ? (
                    <a
                      key={link.label}
                      href={link.href}
                      className="block text-[13px] text-white/20 hover:text-white/50 transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="block text-[13px] text-white/20 hover:text-white/50 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] pt-5 flex flex-wrap justify-between gap-3">
          <span className="text-[11px] text-white/[0.12]">
            © 2026 HarvestFile LLC. All rights reserved.
          </span>
          <span className="text-[10px] text-white/[0.08] max-w-[420px]">
            Uses NASS API. Not endorsed by NASS or affiliated with USDA/FSA.
          </span>
        </div>
      </div>
    </footer>
  );
}
