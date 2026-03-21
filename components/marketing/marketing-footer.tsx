// =============================================================================
// HarvestFile — Marketing Footer (Server Component)
// Phase 23 Build 1: Navigation Overhaul — All 6 free tools in footer
// =============================================================================

import Link from "next/link";
import { Logo } from "./logo";

const footerLinks = {
  "Free Tools": [
    { label: "Election Optimizer", href: "/optimize" },
    { label: "ARC/PLC Calculator", href: "/check" },
    { label: "Payment Scanner", href: "/payments" },
    { label: "Base Acre Calculator", href: "/fba" },
    { label: "SDRP Checker", href: "/sdrp" },
    { label: "Policy Calendar", href: "/calendar" },
  ],
  Learn: [
    { label: "OBBBA Guide", href: "/obbba" },
    { label: "Election Map", href: "/elections" },
    { label: "How ARC-CO Works", href: "/programs/arc-co" },
    { label: "How PLC Works", href: "/programs/plc" },
    { label: "EQIP Guide", href: "/programs/eqip" },
  ],
  Company: [
    { label: "Pricing", href: "/pricing" },
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
              The TurboTax of USDA farm programs. Free tools powered by live USDA data.
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
                      className="block text-[13px] text-white/30 hover:text-harvest-gold transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="block text-[13px] text-white/30 hover:text-harvest-gold transition-colors duration-200"
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <p className="text-[11px] text-white/15">
            © {new Date().getFullYear()} HarvestFile LLC. All rights reserved.
          </p>
          <p className="text-[11px] text-white/15">
            Not affiliated with USDA or any government agency.
          </p>
        </div>
      </div>
    </footer>
  );
}
