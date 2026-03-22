// =============================================================================
// HarvestFile — Marketing Footer (Server Component)
// Phase 25 Build 2: Added "Browse by State" grid + "Popular Counties" column
//
// CHANGES:
//   - New "Browse by State" section — compact 50-state abbreviation grid
//     linking to /{state}/arc-plc hub pages (critical for SEO link equity)
//   - New "Popular Counties" column — top 8 counties by base acres
//   - Existing link columns preserved (Free Tools, Learn, Company)
//   - SEO benefit: every page now links to all 50 state hubs via footer
// =============================================================================

import Link from "next/link";
import { Logo } from "./logo";

// ── Footer link columns ─────────────────────────────────────────────────
const footerLinks = {
  "Free Tools": [
    { label: "Insurance Calculator", href: "/insurance" },
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
              The TurboTax of USDA farm programs. Free tools powered by live USDA data for every farming county in America.
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

        {/* ── Browse by State — compact 50-state grid ────────────────── */}
        <div className="mb-10">
          <div className="text-[11px] font-extrabold text-white/40 uppercase tracking-[0.1em] mb-4">
            Browse ARC/PLC Data by State
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATES.map((state) => (
              <Link
                key={state.abbr}
                href={`/${state.slug}/arc-plc`}
                className="inline-flex items-center justify-center w-[42px] h-[30px] rounded-md text-[11px] font-bold text-white/25 bg-white/[0.03] border border-white/[0.04] hover:text-harvest-gold hover:bg-white/[0.06] hover:border-harvest-gold/20 transition-all duration-200"
                title={`${state.abbr} ARC/PLC County Data`}
              >
                {state.abbr}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <p className="text-[11px] text-white/15">
            © {new Date().getFullYear()} HarvestFile LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <p className="text-[11px] text-white/15">
              Not affiliated with USDA or any government agency.
            </p>
            <Link
              href="/elections"
              className="text-[11px] text-white/15 hover:text-white/30 transition-colors"
            >
              Election Map
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
