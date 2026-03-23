// =============================================================================
// HarvestFile — Marketing Footer (Server Component)
// Phase 26 Build 4: Updated Free Tools column to include all 11 free tools
//
// CHANGES:
//   - Added Morning Dashboard (/morning) to Free Tools column at top
//   - Updated tool count to 11
// =============================================================================

import Link from "next/link";
import { Logo } from "./logo";

// ── Footer link columns ─────────────────────────────────────────────────
const footerLinks = {
  "Free Tools": [
    { label: "Morning Dashboard", href: "/morning" },
    { label: "Commodity Markets", href: "/markets" },
    { label: "Insurance Calculator", href: "/insurance" },
    { label: "Election Optimizer", href: "/optimize" },
    { label: "ARC/PLC Calculator", href: "/check" },
    { label: "Ag Weather Dashboard", href: "/weather" },
    { label: "Spray Window Calculator", href: "/spray-window" },
    { label: "Payment Scanner", href: "/payments" },
    { label: "Base Acre Analyzer", href: "/fba" },
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
  "Top Counties": [
    { label: "Champaign County, IL", href: "/illinois/champaign-county/arc-plc" },
    { label: "McLean County, IL", href: "/illinois/mclean-county/arc-plc" },
    { label: "Whitman County, WA", href: "/washington/whitman-county/arc-plc" },
    { label: "Stearns County, MN", href: "/minnesota/stearns-county/arc-plc" },
    { label: "Darke County, OH", href: "/ohio/darke-county/arc-plc" },
    { label: "Story County, IA", href: "/iowa/story-county/arc-plc" },
    { label: "Lancaster County, NE", href: "/nebraska/lancaster-county/arc-plc" },
    { label: "Sedgwick County, KS", href: "/kansas/sedgwick-county/arc-plc" },
  ],
  Company: [
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "mailto:hello@harvestfile.com" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

// ── All 50 states (sorted by abbreviation) ──────────────────────────────
const STATES = [
  { abbr: "AL", slug: "alabama" },
  { abbr: "AK", slug: "alaska" },
  { abbr: "AZ", slug: "arizona" },
  { abbr: "AR", slug: "arkansas" },
  { abbr: "CA", slug: "california" },
  { abbr: "CO", slug: "colorado" },
  { abbr: "CT", slug: "connecticut" },
  { abbr: "DE", slug: "delaware" },
  { abbr: "FL", slug: "florida" },
  { abbr: "GA", slug: "georgia" },
  { abbr: "HI", slug: "hawaii" },
  { abbr: "ID", slug: "idaho" },
  { abbr: "IL", slug: "illinois" },
  { abbr: "IN", slug: "indiana" },
  { abbr: "IA", slug: "iowa" },
  { abbr: "KS", slug: "kansas" },
  { abbr: "KY", slug: "kentucky" },
  { abbr: "LA", slug: "louisiana" },
  { abbr: "ME", slug: "maine" },
  { abbr: "MD", slug: "maryland" },
  { abbr: "MA", slug: "massachusetts" },
  { abbr: "MI", slug: "michigan" },
  { abbr: "MN", slug: "minnesota" },
  { abbr: "MS", slug: "mississippi" },
  { abbr: "MO", slug: "missouri" },
  { abbr: "MT", slug: "montana" },
  { abbr: "NE", slug: "nebraska" },
  { abbr: "NV", slug: "nevada" },
  { abbr: "NH", slug: "new-hampshire" },
  { abbr: "NJ", slug: "new-jersey" },
  { abbr: "NM", slug: "new-mexico" },
  { abbr: "NY", slug: "new-york" },
  { abbr: "NC", slug: "north-carolina" },
  { abbr: "ND", slug: "north-dakota" },
  { abbr: "OH", slug: "ohio" },
  { abbr: "OK", slug: "oklahoma" },
  { abbr: "OR", slug: "oregon" },
  { abbr: "PA", slug: "pennsylvania" },
  { abbr: "RI", slug: "rhode-island" },
  { abbr: "SC", slug: "south-carolina" },
  { abbr: "SD", slug: "south-dakota" },
  { abbr: "TN", slug: "tennessee" },
  { abbr: "TX", slug: "texas" },
  { abbr: "UT", slug: "utah" },
  { abbr: "VT", slug: "vermont" },
  { abbr: "VA", slug: "virginia" },
  { abbr: "WA", slug: "washington" },
  { abbr: "WV", slug: "west-virginia" },
  { abbr: "WI", slug: "wisconsin" },
  { abbr: "WY", slug: "wyoming" },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-harvest-forest-950 text-white">
      <div className="hf-noise-subtle" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-16 pb-8">
        {/* Top section: logo + link columns */}
        <div className="flex flex-wrap justify-between gap-10 mb-12">
          {/* Brand */}
          <div className="min-w-[200px] max-w-[240px]">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={26} />
              <span className="text-[17px] font-extrabold tracking-[-0.04em] text-white">
                Harvest<span className="text-harvest-gold">File</span>
              </span>
            </Link>
            <p className="text-[13px] text-white/20 leading-relaxed">
              The farmer&apos;s Bloomberg Terminal. 11 free tools powered by live USDA data for every farming county in America.
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
                      key={link.href}
                      href={link.href}
                      className="block text-[13px] text-white/30 hover:text-harvest-gold transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block text-[13px] text-white/30 hover:text-harvest-gold transition-colors"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Browse by State grid */}
        <div className="mb-10">
          <div className="text-[11px] font-extrabold text-white/40 uppercase tracking-[0.1em] mb-4">
            Browse by State
          </div>
          <div className="flex flex-wrap gap-x-1 gap-y-1">
            {STATES.map((state) => (
              <Link
                key={state.abbr}
                href={`/${state.slug}/arc-plc`}
                className="inline-flex items-center justify-center w-[38px] h-[28px] text-[11px] font-bold text-white/25 hover:text-harvest-gold hover:bg-white/[0.04] rounded transition-colors"
                title={state.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              >
                {state.abbr}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/[0.06]">
          <p className="text-[12px] text-white/15">
            &copy; {new Date().getFullYear()} HarvestFile LLC. All rights reserved.
          </p>
          <p className="text-[11px] text-white/10 max-w-[500px] text-right leading-relaxed">
            HarvestFile is not affiliated with, endorsed by, or connected to the USDA, FSA, or any government agency.
            Data sourced from USDA NASS, ERS, and FSA public databases.
          </p>
        </div>
      </div>
    </footer>
  );
}
