// =============================================================================
// HarvestFile — /obbba/arc-sco-stacking
// Phase 8C Build 4B: ARC + SCO Stacking Guide — Cluster Page
//
// Server Component — SEO-optimized guide to ARC+SCO decoupling under OBBBA.
// Covers what changed, premium cost examples, decision framework,
// worked scenarios for corn, soybeans, and wheat.
// =============================================================================

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "ARC + SCO Stacking 2026 — What Changed Under OBBBA | HarvestFile",
  description:
    "OBBBA removes the prohibition on purchasing SCO with ARC. Learn how ARC+SCO stacking works for 2026, premium subsidy increases to 80%, and when layering coverage makes sense for your farm.",
  keywords: [
    "ARC SCO stacking",
    "SCO with ARC 2026",
    "OBBBA SCO changes",
    "supplemental coverage option",
    "ARC SCO decoupling",
    "crop insurance stacking",
    "SCO premium subsidy 80 percent",
    "ECO coverage 2026",
    "shallow loss protection",
    "ARC-CO crop insurance",
  ],
  openGraph: {
    title: "ARC + SCO Stacking — What Changed Under OBBBA for 2026",
    description:
      "Farmers can now elect ARC and purchase SCO. Premium subsidies jumped to 80%. Here's how layered coverage works.",
    url: "https://harvestfile.com/obbba/arc-sco-stacking",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARC + SCO Stacking 2026 — Complete Guide",
  },
  alternates: {
    canonical: "https://harvestfile.com/obbba/arc-sco-stacking",
  },
};

export default function ArcScoStackingPage() {
  const lastUpdated = "March 16, 2026";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ARC + SCO Stacking 2026: What Changed Under OBBBA",
    datePublished: "2026-03-16T00:00:00Z",
    dateModified: "2026-03-16T00:00:00Z",
    author: { "@type": "Organization", name: "HarvestFile", url: "https://harvestfile.com" },
    publisher: { "@type": "Organization", name: "HarvestFile", url: "https://harvestfile.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": "https://harvestfile.com/obbba/arc-sco-stacking" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://harvestfile.com" },
      { "@type": "ListItem", position: 2, name: "OBBBA Guide", item: "https://harvestfile.com/obbba" },
      { "@type": "ListItem", position: 3, name: "ARC + SCO Stacking", item: "https://harvestfile.com/obbba/arc-sco-stacking" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <article className="min-h-screen">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden bg-harvest-forest-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.08),transparent_60%)]" />
          <div className="hf-noise-subtle" />
          <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-28 pb-14">
            <nav className="mb-8 text-[13px] text-white/30">
              <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
              <span className="mx-2">›</span>
              <Link href="/obbba" className="hover:text-white/50 transition-colors">OBBBA Guide</Link>
              <span className="mx-2">›</span>
              <span className="text-white/50">ARC + SCO Stacking</span>
            </nav>

            <div className="max-w-[720px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-harvest-gold/20 bg-harvest-gold/10 px-4 py-1.5 text-[13px] font-semibold text-harvest-gold mb-6">
                Updated {lastUpdated}
              </div>
              <h1 className="text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-[-0.03em] leading-[1.1] mb-6">
                ARC + SCO Stacking:{" "}
                <span className="text-harvest-gold">What Changed Under OBBBA for 2026</span>
              </h1>
              <p className="text-[16px] text-white/60 leading-relaxed max-w-[600px]">
                Farmers can now elect ARC-CO and purchase Supplemental Coverage
                Option (SCO) crop insurance on the same acres. This is a
                fundamental shift in how you can layer risk protection.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ CONTENT ═══ */}
        <div className="mx-auto max-w-[800px] px-6 py-16">

          {/* The Core Change */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              The Restriction That&rsquo;s Gone
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Under the 2018 Farm Bill, there was a simple rule: if you elected
              ARC-CO for a commodity on a farm, you could <em>not</em> purchase
              SCO on those acres. The logic was that both ARC-CO and SCO
              covered similar &ldquo;shallow loss&rdquo; territory, so stacking
              them would be double coverage. Farmers who wanted SCO had to
              elect PLC instead.
            </p>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              OBBBA Section 10303(b) removes this prohibition entirely,
              effective for crop year 2026. Your commodity title election
              (ARC or PLC) and your crop insurance decisions are now
              independent choices. As University of Illinois professor Gary
              Schnitkey put it — farmers can now make the best crop insurance
              choice without considering the commodity title, and vice versa.
            </p>

            {/* Before/After Table */}
            <div className="rounded-2xl border border-border/50 overflow-hidden mb-6">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/50 bg-surface/50">
                    <th className="text-left px-4 py-3 font-bold text-foreground">Coverage Combination</th>
                    <th className="text-center px-4 py-3 font-bold text-muted-foreground">Before OBBBA</th>
                    <th className="text-center px-4 py-3 font-bold text-emerald-600">After OBBBA</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { combo: "ARC-CO + SCO", before: "Prohibited ✕", after: "Allowed ✓" },
                    { combo: "ARC-CO + ECO", before: "Prohibited ✕", after: "Allowed ✓" },
                    { combo: "PLC + SCO", before: "Allowed ✓", after: "Allowed ✓" },
                    { combo: "PLC + ECO", before: "Allowed ✓", after: "Allowed ✓" },
                    { combo: "ARC-IC + SCO", before: "Prohibited ✕", after: "Allowed ✓" },
                    { combo: "SCO + STAX (cotton)", before: "Prohibited ✕", after: "Still Prohibited ✕" },
                  ].map((row, i) => (
                    <tr key={row.combo} className={i % 2 === 0 ? "bg-transparent" : "bg-surface/20"}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.combo}</td>
                      <td className={`px-4 py-2.5 text-center ${row.before.includes("✕") ? "text-red-400" : "text-emerald-600"}`}>
                        {row.before}
                      </td>
                      <td className={`px-4 py-2.5 text-center font-semibold ${row.after.includes("✕") ? "text-red-400" : "text-emerald-600"}`}>
                        {row.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-surface/30 border-t border-border/50 text-[11px] text-muted-foreground">
                Note: SCO and STAX remain incompatible on the same acres (relevant for cotton producers)
              </div>
            </div>
          </section>

          {/* Premium Subsidy Changes */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              SCO Premium Subsidies Jumped to 80%
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Beyond removing the ARC restriction, OBBBA also made SCO and ECO
              significantly more affordable. The federal premium subsidy for
              both programs increased from 65% to <strong className="text-foreground">80%</strong>.
              This means the government now covers four-fifths of the premium
              cost.
            </p>

            <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-5 mb-4">
              <div className="text-[13px] font-bold text-emerald-700 mb-2">
                Cost Example
              </div>
              <p className="text-[13px] text-emerald-700/70 leading-relaxed">
                A farmer who previously paid $15/acre for SCO (at the old 65%
                subsidy) would pay approximately <strong>$8.57/acre</strong> under
                the new 80% subsidy — a 43% reduction in out-of-pocket cost.
                For a 1,000-acre corn operation, that&rsquo;s roughly $6,430
                less per year in insurance premiums while maintaining the same
                coverage.
              </p>
            </div>

            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Additional insurance changes under OBBBA that affect the
              stacking decision:
            </p>

            <div className="space-y-3 mb-4">
              {[
                {
                  title: "SCO coverage extends to 90% (starting 2027)",
                  detail: "For crop year 2026, SCO covers the band from your individual coverage level up to 86%. Beginning in 2027, that ceiling rises to 90%. For 2026, ECO fills the 86%–90% band at the same 80% subsidy.",
                },
                {
                  title: "Beginning farmer subsidies expanded",
                  detail: "Beginning farmer premium subsidies now apply for the first 10 years of farming, up from 5. This includes the 10-percentage-point premium reduction on SCO and ECO.",
                },
                {
                  title: "County trigger methodology unchanged",
                  detail: "SCO still uses county-level expected revenue as its trigger. ARC-CO uses county revenue benchmarks. While both reference county data, they use different methodologies and data sources, so they aren't truly duplicative.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border/50 bg-surface/30 p-4">
                  <div className="text-[14px] font-bold text-foreground mb-1">{item.title}</div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How to Think About Layered Coverage */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              How Layered Coverage Works in Practice
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              With the ARC+SCO restriction removed, farmers can now build a
              multi-layer protection stack. Here&rsquo;s how the layers fit
              together for a typical operation:
            </p>

            <div className="space-y-2 mb-6">
              {[
                { layer: "Individual Crop Insurance (e.g., RP at 75%)", band: "Covers losses below 75% of revenue guarantee", color: "bg-blue-100 border-blue-200 text-blue-800" },
                { layer: "SCO (covers 75%–86% band for 2026)", band: "Fills the gap between your deductible and 86%", color: "bg-indigo-100 border-indigo-200 text-indigo-800" },
                { layer: "ECO (covers 86%–90% or 86%–95% band)", band: "Extends coverage above SCO into shallow-loss territory", color: "bg-purple-100 border-purple-200 text-purple-800" },
                { layer: "ARC-CO (county revenue benchmark)", band: "Separate county-level payment when revenue drops below 90% of benchmark", color: "bg-emerald-100 border-emerald-200 text-emerald-800" },
              ].map((item) => (
                <div key={item.layer} className={`rounded-lg border p-4 ${item.color}`}>
                  <div className="text-[13px] font-bold">{item.layer}</div>
                  <div className="text-[12px] opacity-75 mt-0.5">{item.band}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-5 mb-4">
              <div className="text-[13px] font-bold text-amber-700 mb-2">
                Important: These Are Not Fully Additive
              </div>
              <p className="text-[13px] text-amber-700/70 leading-relaxed">
                While ARC-CO and crop insurance (SCO/ECO) are now independent
                programs, they can overlap in the losses they cover. A county
                revenue decline will likely trigger both ARC-CO payments and SCO
                indemnities simultaneously. This is not double-counting — ARC-CO
                is a USDA commodity program payment, while SCO is a crop insurance
                indemnity. They operate through different mechanisms but respond
                to similar conditions. The net effect is stronger overall
                protection, not necessarily double the payout.
              </p>
            </div>
          </section>

          {/* Decision Framework */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              When Does ARC + SCO Make Sense?
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              The decoupling doesn&rsquo;t mean ARC + SCO is automatically the
              best choice. Here&rsquo;s how to think about it:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-5">
                <div className="text-[15px] font-bold text-emerald-700 mb-3">
                  ARC + SCO is strong when:
                </div>
                <div className="space-y-2 text-[13px] text-emerald-700/70 leading-relaxed">
                  <p>
                    • Your county has moderate yield and revenue volatility
                    (frequent shallow losses)
                  </p>
                  <p>
                    • Market prices are above PLC reference prices
                    (PLC wouldn&rsquo;t trigger)
                  </p>
                  <p>
                    • You want maximum shallow-loss coverage and can
                    afford the premium (even at 80% subsidy)
                  </p>
                  <p>
                    • You&rsquo;re in the Corn Belt where ARC-CO
                    has historically performed well
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-5">
                <div className="text-[15px] font-bold text-blue-700 mb-3">
                  PLC + SCO may be better when:
                </div>
                <div className="space-y-2 text-[13px] text-blue-700/70 leading-relaxed">
                  <p>
                    • Market prices are near or below reference prices
                    (PLC triggers are likely)
                  </p>
                  <p>
                    • You grow commodities with large reference price
                    increases (rice, peanuts, cotton)
                  </p>
                  <p>
                    • Your county has very high, stable yields
                    (limiting ARC-CO&rsquo;s upside)
                  </p>
                  <p>
                    • You want price-floor protection independent
                    of county yields
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[15px] text-muted-foreground leading-relaxed">
              The 2026 crop insurance sales closing date for spring crops has
              already passed in many states, but fall crop decisions are
              ahead. For 2027 (when SCO extends to 90%), the full stacking
              picture becomes even more compelling. Start modeling your
              options now.
            </p>
          </section>

          {/* CTA */}
          <div className="rounded-2xl border-2 border-harvest-gold/30 bg-harvest-gold/5 p-6 text-center mb-14">
            <div className="text-[17px] font-extrabold text-foreground mb-2">
              Compare ARC-CO vs. PLC for Your County
            </div>
            <p className="text-[13px] text-muted-foreground mb-4 max-w-[460px] mx-auto">
              Our free calculator models both programs with OBBBA parameters
              so you can see which election maximizes your safety net — then
              layer SCO on top of whichever you choose.
            </p>
            <Link
              href="/check"
              className="inline-flex items-center gap-2 rounded-full bg-harvest-gold px-6 py-3 text-[14px] font-bold text-harvest-forest-950 hover:bg-harvest-gold-bright transition-colors"
            >
              Open the ARC/PLC Calculator →
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mb-14">
            <Link href="/obbba/new-base-acres" className="text-[14px] font-semibold text-harvest-forest-700 hover:underline">
              ← New Base Acres Guide
            </Link>
            <span className="text-muted-foreground/30">|</span>
            <Link href="/obbba" className="text-[14px] font-semibold text-harvest-forest-700 hover:underline">
              Back to OBBBA Guide
            </Link>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-border/50 bg-surface/20 p-5 text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground/70">Disclaimer:</strong> HarvestFile
            is not affiliated with USDA, FSA, or RMA. Crop insurance coverage
            details, premium rates, and subsidy levels are subject to RMA
            program rules and may vary by county, crop, and practice. The
            interaction between ARC/PLC and crop insurance products is
            complex — consult your crop insurance agent for premium quotes
            specific to your operation. Sources: OBBBA Section 10303(b),
            USDA RMA MGR-25-006, Federal Register 2026-00313, farmdoc daily,
            Ohio State Farm Office.
          </div>
        </div>
      </article>
    </>
  );
}
