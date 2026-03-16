// =============================================================================
// HarvestFile — /obbba/new-base-acres
// Phase 8C Build 4B: New Base Acres Under OBBBA — Cluster Page
//
// Server Component — SEO-optimized guide to the 30M new base acre provision.
// Step-by-step format optimized for HowTo-style content and featured snippets.
// =============================================================================

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "New Base Acres Under OBBBA — Eligibility, Allocation & What to Expect | HarvestFile",
  description:
    "Step-by-step guide to OBBBA's 30 million new base acres. How eligibility works, the 2019–2023 planting formula, pro-rata cap, landlord/tenant rules, and FSA notification process. Updated March 2026.",
  keywords: [
    "new base acres 2026",
    "OBBBA base acres",
    "base acre expansion",
    "farm base acres eligibility",
    "base acres calculation",
    "30 million new base acres",
    "FSA base acre allocation",
    "OBBBA new base acres formula",
    "landlord base acres",
  ],
  openGraph: {
    title: "New Base Acres Under OBBBA — Complete Farmer's Guide",
    description:
      "30 million new base acres — the first expansion since 1996. How to know if you're eligible and what to expect from FSA.",
    url: "https://harvestfile.com/obbba/new-base-acres",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "New Base Acres Under OBBBA — How Eligibility Works",
  },
  alternates: {
    canonical: "https://harvestfile.com/obbba/new-base-acres",
  },
};

// ─── Projected new base by crop ──────────────────────────────────────────────

const cropProjections = [
  { crop: "Corn", acres: "~10.4M", share: "27%" },
  { crop: "Soybeans", acres: "~7.7M", share: "20%" },
  { crop: "Wheat", acres: "~6.9M", share: "18%" },
  { crop: "Grain Sorghum", acres: "~1.5M", share: "4%" },
  { crop: "Cotton", acres: "~1.2M", share: "3%" },
  { crop: "Other Covered", acres: "~10.9M", share: "28%" },
];

export default function NewBaseAcresPage() {
  const lastUpdated = "March 16, 2026";

  // Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "New Base Acres Under OBBBA: Eligibility, Allocation & What to Expect",
    datePublished: "2026-03-16T00:00:00Z",
    dateModified: "2026-03-16T00:00:00Z",
    author: { "@type": "Organization", name: "HarvestFile", url: "https://harvestfile.com" },
    publisher: { "@type": "Organization", name: "HarvestFile", url: "https://harvestfile.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": "https://harvestfile.com/obbba/new-base-acres" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://harvestfile.com" },
      { "@type": "ListItem", position: 2, name: "OBBBA Guide", item: "https://harvestfile.com/obbba" },
      { "@type": "ListItem", position: 3, name: "New Base Acres", item: "https://harvestfile.com/obbba/new-base-acres" },
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
              <span className="text-white/50">New Base Acres</span>
            </nav>

            <div className="max-w-[720px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-harvest-gold/20 bg-harvest-gold/10 px-4 py-1.5 text-[13px] font-semibold text-harvest-gold mb-6">
                Updated {lastUpdated}
              </div>
              <h1 className="text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-[-0.03em] leading-[1.1] mb-6">
                New Base Acres Under OBBBA:{" "}
                <span className="text-harvest-gold">Eligibility, Allocation &amp; What to Expect</span>
              </h1>
              <p className="text-[16px] text-white/60 leading-relaxed max-w-[600px]">
                The first base acre expansion since the system was created in
                1996. Up to 30&nbsp;million new acres nationally — and the
                process is largely automatic.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ CONTENT ═══ */}
        <div className="mx-auto max-w-[800px] px-6 py-16">

          {/* Why This Matters */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              Why This Is Unprecedented
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Base acres are the foundation of ARC and PLC payments — you only
              receive payments on your base, not on what you actually plant.
              Since the &ldquo;Freedom to Farm&rdquo; Act of 1996 created the
              base acre system, farmers could only reallocate existing base
              among commodities. They could never add new acres.
            </p>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              OBBBA changes that. For the first time, farms that have expanded
              their planted acreage of covered commodities beyond their
              existing base can receive new base acre allocations — up to
              30&nbsp;million acres nationwide. This is roughly a 10% expansion
              of the total U.S. base acre pool.
            </p>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              For farms that have been planting covered commodities on acres
              without base, this means those acres can now generate ARC or PLC
              payments for the first time. The financial impact for eligible
              farms could be substantial.
            </p>
          </section>

          {/* The 5-Step Formula */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              How New Base Acres Are Calculated
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              The allocation formula works in five steps. FSA performs most of
              these calculations using data they already have on file — you
              generally do not need to submit anything.
            </p>

            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Calculate Your Planted Acres",
                  body: "FSA averages your planted acres of covered commodities over all five years from 2019 through 2023 (a simple average, not Olympic — all years count equally). Up to 15% of total farm acres from eligible noncovered commodities can be included. Excluded from the noncovered calculation: trees, bushes, vines, grass, pasture, tobacco, hemp, cover crops, and CRP-enrolled land.",
                },
                {
                  step: 2,
                  title: "Compare Against Existing Base",
                  body: "If your calculated planted acres from Step 1 exceed your farm's base acres as of September 30, 2024, the farm is eligible for new base. If planted acres are less than or equal to existing base, the farm receives no additional base — but keeps all existing base unchanged.",
                },
                {
                  step: 3,
                  title: "Determine the Excess",
                  body: "New base equals the difference: your 2019–2023 average planted acres minus your September 30, 2024 base acres. For example, if you averaged 1,200 planted acres and have 1,000 existing base acres, the excess is 200 acres.",
                },
                {
                  step: 4,
                  title: "Allocate Among Commodities",
                  body: "New base acres are divided among covered commodities proportionally to your 2019–2023 planting ratios. If you planted 60% corn and 40% soybeans during that period, your new base splits 60/40 between corn and soybean base.",
                },
                {
                  step: 5,
                  title: "Apply the National Pro-Rata Cap",
                  body: "If total new base nationwide exceeds 30 million acres, USDA reduces every farm's new base proportionally. Estimates suggest total eligible new base is approximately 38.7 million acres, implying a pro-rata factor around 77–78%. Your 200 new acres from Step 3 would become roughly 155 acres after pro-rating.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-xl border border-border/50 bg-surface/30 p-5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-harvest-forest-800 text-[14px] font-bold text-white shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-foreground mb-1">
                      {item.title}
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Projected Distribution */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">
              Projected Distribution by Crop
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              Based on 2019–2023 planting trends, farmdoc daily estimates the
              following distribution of new base acres (before pro-rata):
            </p>

            <div className="rounded-2xl border border-border/50 overflow-hidden mb-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/50 bg-surface/50">
                    <th className="text-left px-4 py-3 font-bold text-foreground">Commodity</th>
                    <th className="text-right px-4 py-3 font-bold text-foreground">Estimated New Acres</th>
                    <th className="text-right px-4 py-3 font-bold text-foreground">Share of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cropProjections.map((row, i) => (
                    <tr key={row.crop} className={i % 2 === 0 ? "bg-transparent" : "bg-surface/20"}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.crop}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.acres}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{row.share}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-surface/30 border-t border-border/50 text-[11px] text-muted-foreground">
                Source: farmdoc daily (University of Illinois), July 2025 estimates · Subject to pro-rata reduction
              </div>
            </div>
          </section>

          {/* What You Need to Know */}
          <section className="mb-14">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-6">
              Key Facts Farmers Keep Asking About
            </h2>

            <div className="space-y-5">
              {[
                {
                  q: "Do I need to apply for new base acres?",
                  a: "No. FSA has your planting history on file and will calculate eligibility automatically. You will receive a notification if your farm qualifies. The only action you might take is opting out within 90 days if you don't want the new base.",
                },
                {
                  q: "Can I update or reallocate my existing base acres?",
                  a: "No. OBBBA only adds new base. Your existing base acre allocations remain exactly as they were on September 30, 2024. There is no option to reallocate existing base among commodities or update base based on recent planting.",
                },
                {
                  q: "I rent land. Can I make base acre decisions?",
                  a: "Base acre decisions are owner-driven. As a tenant, you generally cannot accept or reject new base on land you rent. However, ARC/PLC election decisions (choosing between programs) still require unanimous agreement from all producers on the farm — meaning you do have a voice in how the base is used.",
                },
                {
                  q: "I'm a landlord and don't farm. Does this affect me?",
                  a: "Yes. If your farm is eligible for new base, you'll receive notification from FSA. New base increases the payment potential of your land, which could affect rental rates and lease negotiations. You can opt out within 90 days if you prefer not to receive new base.",
                },
                {
                  q: "What if my total base would exceed my total farm acres?",
                  a: "Total base (existing plus new) cannot exceed the total acres on the farm. This is an additional constraint beyond the 30 million national cap.",
                },
                {
                  q: "When will I know my allocation?",
                  a: "As of March 2026, FSA has not announced specific dates for new base acre notifications. Implementation is significantly delayed due to the scope of systems updates required. Watch for announcements from your county FSA office.",
                },
              ].map((item) => (
                <div key={item.q}>
                  <h3 className="text-[15px] font-bold text-foreground mb-1.5">
                    {item.q}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-2xl border-2 border-harvest-gold/30 bg-harvest-gold/5 p-6 text-center mb-14">
            <div className="text-[17px] font-extrabold text-foreground mb-2">
              See How ARC/PLC Payments Would Work on Your New Base
            </div>
            <p className="text-[13px] text-muted-foreground mb-4 max-w-[460px] mx-auto">
              Once you know your new base allocation, use our calculator to
              compare ARC-CO vs. PLC estimated payments at the county level.
            </p>
            <Link
              href="/check"
              className="inline-flex items-center gap-2 rounded-full bg-harvest-gold px-6 py-3 text-[14px] font-bold text-harvest-forest-950 hover:bg-harvest-gold-bright transition-colors"
            >
              Open the ARC/PLC Calculator →
            </Link>
          </div>

          {/* Back to pillar */}
          <div className="flex items-center gap-4">
            <Link
              href="/obbba"
              className="text-[14px] font-semibold text-harvest-forest-700 hover:underline"
            >
              ← Back to OBBBA Guide
            </Link>
            <span className="text-muted-foreground/30">|</span>
            <Link
              href="/obbba/arc-sco-stacking"
              className="text-[14px] font-semibold text-harvest-forest-700 hover:underline"
            >
              ARC + SCO Stacking Guide →
            </Link>
          </div>

          {/* Disclaimer */}
          <div className="mt-14 rounded-xl border border-border/50 bg-surface/20 p-5 text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground/70">Disclaimer:</strong> HarvestFile
            is not affiliated with USDA or FSA. New base acre projections are
            estimates based on published research from farmdoc daily and Iowa
            State CALT. Actual allocations depend on FSA&rsquo;s final
            calculations and the national pro-rata factor. Consult your local
            FSA office for definitive information about your farm. Sources:
            Federal Register 2026-00313, OBBBA (Pub.&nbsp;L.&nbsp;119&#8209;21),
            farmdoc daily, Iowa State CALT, CRS Report R48574.
          </div>
        </div>
      </article>
    </>
  );
}
