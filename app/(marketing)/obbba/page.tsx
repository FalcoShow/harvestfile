// =============================================================================
// HarvestFile — /obbba Pillar Page
// Phase 8C Build 4A: OBBBA ARC/PLC Changes — Everything Farmers Need to Know
//
// Server Component — pure SEO, zero client JS.
// Premium content page: reference price tables, key changes, internal links
// to cluster pages, CTAs to /check calculator. This is the definitive
// OBBBA resource for American farmers.
//
// Sources: Federal Register 2026-00313, USDA FSA, farmdoc daily,
//          Iowa State CALT, CRS Report R48574
// =============================================================================

import Link from "next/link";

// ─── Reference Price Data ────────────────────────────────────────────────────

const referencePrices = [
  { crop: "Corn", unit: "bu", old: 3.70, new: 4.10, pct: 11 },
  { crop: "Soybeans", unit: "bu", old: 8.40, new: 10.00, pct: 19 },
  { crop: "Wheat", unit: "bu", old: 5.50, new: 6.35, pct: 15 },
  { crop: "Grain Sorghum", unit: "bu", old: 3.95, new: 4.40, pct: 11 },
  { crop: "Barley", unit: "bu", old: 4.95, new: 5.45, pct: 10 },
  { crop: "Oats", unit: "bu", old: 2.40, new: 2.65, pct: 10 },
  { crop: "Long Grain Rice", unit: "cwt", old: 14.00, new: 16.90, pct: 21 },
  { crop: "Medium Grain Rice", unit: "cwt", old: 14.00, new: 16.90, pct: 21 },
  { crop: "Peanuts", unit: "ton", old: 535, new: 630, pct: 18 },
  { crop: "Seed Cotton", unit: "lb", old: 0.367, new: 0.42, pct: 14 },
  { crop: "Sunflower Seed", unit: "cwt", old: 20.15, new: 23.00, pct: 14 },
  { crop: "Canola", unit: "cwt", old: 20.15, new: 23.00, pct: 14 },
  { crop: "Crambe", unit: "cwt", old: 20.15, new: 23.00, pct: 14 },
  { crop: "Flaxseed", unit: "cwt", old: 11.28, new: 12.41, pct: 10 },
  { crop: "Mustard Seed", unit: "cwt", old: 11.28, new: 12.41, pct: 10 },
  { crop: "Rapeseed", unit: "cwt", old: 20.15, new: 23.00, pct: 14 },
  { crop: "Safflower", unit: "cwt", old: 20.15, new: 23.00, pct: 14 },
  { crop: "Sesame Seed", unit: "cwt", old: 20.15, new: 23.00, pct: 14 },
  { crop: "Dry Peas", unit: "cwt", old: 11.00, new: 12.10, pct: 10 },
  { crop: "Lentils", unit: "cwt", old: 19.97, new: 21.97, pct: 10 },
  { crop: "Small Chickpeas", unit: "cwt", old: 19.04, new: 20.94, pct: 10 },
  { crop: "Large Chickpeas", unit: "cwt", old: 21.54, new: 23.69, pct: 10 },
];

// ─── Key Changes Summary ────────────────────────────────────────────────────

const keyChanges = [
  {
    label: "ARC-CO Guarantee",
    before: "86%",
    after: "90%",
    detail: "Payments trigger sooner — your deductible dropped from 14% to 10%",
  },
  {
    label: "ARC-CO Payment Cap",
    before: "10%",
    after: "12%",
    detail: "Maximum per-acre payment increased by 20%",
  },
  {
    label: "PLC Reference Prices",
    before: "2014 levels",
    after: "10–21% higher",
    detail: "Every covered commodity gets a raise — soybeans up 19%, rice up 21%",
  },
  {
    label: "ERP Escalator",
    before: "85%",
    after: "88%",
    detail: "Effective reference prices respond faster to rising markets",
  },
  {
    label: "ERP Cap",
    before: "115%",
    after: "115%",
    detail: "Cap unchanged — limits runaway escalation during price spikes",
  },
  {
    label: "New Base Acres",
    before: "None since 1996",
    after: "30M acres",
    detail: "First expansion ever — based on 2019–2023 planting history",
  },
  {
    label: "ARC + SCO",
    before: "Prohibited",
    after: "Allowed",
    detail: "Farmers can now stack ARC with Supplemental Coverage Option",
  },
  {
    label: "Payment Limit",
    before: "$125,000",
    after: "$155,000",
    detail: "Now inflation-indexed via CPI-U, with expanded entity provisions",
  },
  {
    label: "Program Duration",
    before: "Through 2023",
    after: "Through 2031",
    detail: "Eight crop years of certainty for long-term planning",
  },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function ObbbaPage() {
  const lastUpdated = "March 16, 2026";

  return (
    <article className="min-h-screen">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-harvest-forest-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.08),transparent_60%)]" />
        <div className="hf-noise-subtle" />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-28 pb-16">
          {/* Breadcrumb */}
          <nav className="mb-8 text-[13px] text-white/30">
            <Link href="/" className="hover:text-white/50 transition-colors">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="text-white/50">OBBBA Guide</span>
          </nav>

          <div className="max-w-[800px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-harvest-gold/20 bg-harvest-gold/10 px-4 py-1.5 text-[13px] font-semibold text-harvest-gold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-harvest-gold opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-harvest-gold" />
              </span>
              Updated {lastUpdated}
            </div>

            <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-[-0.03em] leading-[1.1] mb-6">
              OBBBA ARC/PLC Changes:{" "}
              <span className="text-harvest-gold">
                Everything Farmers Need to Know for 2026
              </span>
            </h1>

            <p className="text-[17px] text-white/60 leading-relaxed max-w-[640px] mb-8">
              The One Big Beautiful Bill Act (Pub.&nbsp;L.&nbsp;119&#8209;21)
              signed July&nbsp;4,&nbsp;2025 is the largest expansion of farm
              safety&#8209;net programs in a decade. Here&rsquo;s what changed,
              what it means for your operation, and how to make the right
              ARC&nbsp;vs.&nbsp;PLC decision.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/check"
                className="inline-flex items-center gap-2 rounded-full bg-harvest-gold px-6 py-3 text-sm font-bold text-harvest-forest-950 hover:bg-harvest-gold-bright transition-colors"
              >
                Use the ARC/PLC Calculator →
              </Link>
              <Link
                href="#key-changes"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/70 hover:text-white hover:border-white/30 transition-colors"
              >
                Jump to Key Changes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ KEY NUMBERS BAR ═══ */}
      <section className="border-b border-border/50 bg-surface/50">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { number: "90%", label: "ARC-CO Guarantee", sub: "up from 86%" },
              { number: "30M", label: "New Base Acres", sub: "first expansion ever" },
              { number: "$155K", label: "Payment Limit", sub: "up from $125K" },
              { number: "2031", label: "Programs Extended", sub: "8 crop years" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-[28px] md:text-[36px] font-extrabold tracking-[-0.03em] text-harvest-forest-800">
                  {stat.number}
                </div>
                <div className="text-[13px] font-bold text-foreground/80 mt-1">
                  {stat.label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="mx-auto max-w-[800px] px-6 py-16">
        {/* ── Table of Contents ── */}
        <nav className="rounded-2xl border border-border/50 bg-surface/40 p-6 mb-16">
          <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.1em] mb-4">
            In This Guide
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { href: "#key-changes", label: "What Changed at a Glance" },
              { href: "#arc-co", label: "ARC-CO: 90% Guarantee & 12% Cap" },
              { href: "#plc-prices", label: "Updated PLC Reference Prices" },
              { href: "#2025-higher-of", label: "The 2025 Higher-Of Rule" },
              { href: "#new-base-acres", label: "30 Million New Base Acres" },
              { href: "#arc-sco", label: "ARC + SCO Stacking Now Allowed" },
              { href: "#payment-limits", label: "Payment Limits & Entity Rules" },
              { href: "#arc-vs-plc", label: "ARC vs. PLC for 2026" },
              { href: "#deadline", label: "2026 Election Deadline Tracker" },
              { href: "#faq", label: "Frequently Asked Questions" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] text-foreground/70 hover:text-foreground hover:bg-surface transition-colors"
              >
                <span className="text-harvest-gold text-[10px]">●</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ── Key Changes at a Glance ── */}
        <section id="key-changes" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            What Changed at a Glance
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
            OBBBA adds $65.6&nbsp;billion in agricultural spending over 10
            years and extends ARC/PLC programs through crop year 2031. Here are
            the nine changes that matter most.
          </p>

          <div className="space-y-3">
            {keyChanges.map((change) => (
              <div
                key={change.label}
                className="rounded-xl border border-border/50 bg-surface/30 p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="text-[15px] font-bold text-foreground">
                    {change.label}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] text-muted-foreground line-through">
                      {change.before}
                    </span>
                    <span className="text-[13px] text-muted-foreground">→</span>
                    <span className="text-[13px] font-bold text-emerald-600">
                      {change.after}
                    </span>
                  </div>
                </div>
                <div className="text-[13px] text-muted-foreground leading-relaxed">
                  {change.detail}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ARC-CO Section ── */}
        <section id="arc-co" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            ARC-CO: 90% Guarantee and 12% Payment Cap
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Agriculture Risk Coverage at the county level (ARC-CO) protects
            against revenue declines in your county. OBBBA made two fundamental
            improvements that make ARC-CO significantly more generous.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            The guarantee band expanded from 86% to <strong className="text-foreground">90%</strong> of
            benchmark revenue. In plain terms, your deductible dropped from 14%
            to 10% — payments now trigger sooner when county revenue falls.
            The maximum payment cap increased from 10% to <strong className="text-foreground">12%</strong> of
            benchmark revenue per acre, covering the revenue band from 90%
            down to 78%.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            The benchmark calculation methodology is retained: a 5-year Olympic
            average of county yields multiplied by the higher of the effective
            reference price or the Marketing Year Average (MYA) price for
            each year. Trend-adjusted yields are now factored into benchmark
            calculations, which benefits counties with rising yield trends.
          </p>

          <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-5 mb-4">
            <div className="text-[13px] font-bold text-emerald-700 mb-2">
              What This Means for You
            </div>
            <p className="text-[13px] text-emerald-700/70 leading-relaxed">
              If your county experiences even a moderate revenue decline —
              say 12% below the benchmark — ARC-CO now pays for most of that
              loss. Under the old rules, you would have absorbed the first 14%
              yourself. The combination of a lower deductible and a higher cap
              means ARC-CO is now a stronger option for many Corn Belt counties
              where revenue volatility tends to be moderate.
            </p>
          </div>

          <p className="text-[15px] text-muted-foreground leading-relaxed">
            For a deeper analysis of how ARC-CO works including payment
            calculations,{" "}
            <Link
              href="/programs/arc-co"
              className="text-harvest-forest-700 font-semibold hover:underline"
            >
              read our complete ARC-CO explainer
            </Link>
            , or{" "}
            <Link
              href="/check"
              className="text-harvest-forest-700 font-semibold hover:underline"
            >
              run the numbers for your county
            </Link>{" "}
            using our free ARC/PLC calculator.
          </p>
        </section>

        {/* ── PLC Reference Prices ── */}
        <section id="plc-prices" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            Updated PLC Reference Prices for Every Covered Commodity
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            OBBBA raised statutory reference prices for all 22 covered
            commodities — increases range from 10% to 21%. These higher
            reference prices directly increase PLC payment potential when
            market prices fall below the trigger level.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
            The effective reference price (ERP) formula also improved. The
            escalator moved from 85% to <strong className="text-foreground">88%</strong> of
            the 5-year Olympic average of MYA prices, capped at 115% of the
            statutory reference price. This means the ERP responds faster and
            reaches higher levels after periods of elevated market prices.
          </p>

          {/* Reference Price Table */}
          <div className="rounded-2xl border border-border/50 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/50 bg-surface/50">
                    <th className="text-left px-4 py-3 font-bold text-foreground">
                      Commodity
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-foreground">
                      Unit
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-muted-foreground">
                      Previous
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-emerald-600">
                      OBBBA
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-foreground">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referencePrices.map((row, i) => (
                    <tr
                      key={row.crop}
                      className={
                        i % 2 === 0
                          ? "bg-transparent"
                          : "bg-surface/20"
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {row.crop}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        /{row.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                        ${row.old < 1 ? row.old.toFixed(3) : row.old.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                        ${row.new < 1 ? row.new.toFixed(3) : row.new.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground tabular-nums">
                        +{row.pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 bg-surface/30 border-t border-border/50 text-[11px] text-muted-foreground">
              Source: OBBBA (Pub.&nbsp;L.&nbsp;119&#8209;21), Title I · Federal Register 2026-00313
            </div>
          </div>

          <p className="text-[15px] text-muted-foreground leading-relaxed">
            Beginning with crop year 2031, statutory reference prices escalate
            0.5% per year (compounded), capped at 113% of the original
            statutory price. This built-in growth ensures reference prices
            don&rsquo;t erode against inflation over the life of the law.
          </p>
        </section>

        {/* ── 2025 Higher-Of Rule ── */}
        <section id="2025-higher-of" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            The 2025 &ldquo;Higher-Of&rdquo; Rule
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Because OBBBA was signed after farmers had already made their 2025
            ARC/PLC elections under the old rules, Congress included a
            one&#8209;time provision: for the <strong className="text-foreground">2025 crop year only</strong>,
            USDA will automatically pay whichever program — ARC-CO or PLC —
            produces a higher payment for each covered commodity on each farm.
            No action is required from farmers for 2025.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Projected 2025 payments under OBBBA exceed <strong className="text-foreground">$13.5&nbsp;billion</strong> nationally
            (farmdoc daily, November 2025), making this one of the largest
            farm safety-net payouts in program history. These payments are
            expected to be disbursed beginning in <strong className="text-foreground">October&nbsp;2026</strong>.
          </p>

          <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-5">
            <div className="text-[13px] font-bold text-amber-700 mb-2">
              Important Distinction: 2025 vs. 2026
            </div>
            <p className="text-[13px] text-amber-700/70 leading-relaxed">
              The higher-of provision applies only to 2025. For 2026 and
              beyond, farmers <strong>must</strong> make an affirmative ARC or
              PLC election — or they receive no payment. The 2026 election
              deadline has not yet been announced. If you do nothing for 2026,
              you forfeit coverage.
            </p>
          </div>
        </section>

        {/* ── New Base Acres ── */}
        <section id="new-base-acres" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            30 Million New Base Acres
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            This is historically unprecedented. Since base acres were first
            established in 1996, farmers could only reallocate existing
            base — never add new acres. OBBBA allows farms to add entirely
            new base for the first time, up to 30&nbsp;million acres nationally.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Eligible farms are those whose average acres planted to covered
            commodities during 2019–2023 exceeded their existing base as of
            September&nbsp;30, 2024. The process is largely automatic — FSA
            has the planting history and will notify eligible owners of
            their allocation. Owners who don&rsquo;t want new base can opt
            out within 90 days of notification.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
            Because total eligible new base is estimated at approximately
            38.7&nbsp;million acres (exceeding the 30M cap), USDA will apply a
            pro-rata reduction — meaning most farms will receive roughly
            77–78% of their calculated new base.
          </p>

          <Link
            href="/obbba/new-base-acres"
            className="inline-flex items-center gap-2 rounded-xl border border-harvest-forest-700/20 bg-harvest-forest-800/5 px-5 py-3.5 text-[14px] font-bold text-harvest-forest-800 hover:bg-harvest-forest-800/10 transition-colors"
          >
            Read the Full New Base Acres Guide →
          </Link>
        </section>

        {/* ── ARC + SCO Stacking ── */}
        <section id="arc-sco" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            ARC + SCO Stacking Now Allowed
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Under the 2018 Farm Bill, farmers who elected ARC were prohibited
            from purchasing the Supplemental Coverage Option (SCO) for crop
            insurance. OBBBA removes this restriction entirely, effective for
            crop year 2026. This is a fundamental shift in how farmers can
            layer risk protection.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Three additional changes amplify the impact: SCO premium subsidies
            jumped from 65% to <strong className="text-foreground">80%</strong>,
            SCO coverage extends from 86% to <strong className="text-foreground">90%</strong> beginning
            crop year 2027 (ECO fills the gap for 2026), and beginning farmer
            eligibility for premium subsidies was extended from 5 to 10 years.
          </p>

          <Link
            href="/obbba/arc-sco-stacking"
            className="inline-flex items-center gap-2 rounded-xl border border-harvest-forest-700/20 bg-harvest-forest-800/5 px-5 py-3.5 text-[14px] font-bold text-harvest-forest-800 hover:bg-harvest-forest-800/10 transition-colors"
          >
            Read the Full ARC + SCO Stacking Guide →
          </Link>
        </section>

        {/* ── Payment Limits ── */}
        <section id="payment-limits" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            Payment Limits Raised to $155,000 with Entity Changes
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            The combined ARC/PLC payment limit rose from $125,000 to{" "}
            <strong className="text-foreground">$155,000</strong> per person or
            legal entity, now adjusted annually for inflation via CPI-U.
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            A significant structural change:{" "}
            <strong className="text-foreground">
              qualified pass-through entities
            </strong>{" "}
            (S&nbsp;corporations, LLCs not taxed as C&nbsp;corps) are now treated
            like general partnerships for payment limit purposes. Each
            shareholder or member who is actively engaged in farming receives
            their own $155,000 limit. For a three-member family operation,
            this could mean up to <strong className="text-foreground">$465,000</strong> in
            combined limits (indexed for inflation).
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            The adjusted gross income (AGI) limitation was also modified:
            producers with AGI exceeding $900,000 can still participate if 75%
            or more of their gross income derives from farming, ranching, or
            forestry operations.
          </p>
        </section>

        {/* ── ARC vs PLC for 2026 ── */}
        <section id="arc-vs-plc" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            ARC-CO vs. PLC for 2026: How to Decide
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            The right choice depends on your specific crops, county yield
            history, and where you think market prices are headed. Under OBBBA,
            both programs are stronger — the question is which one provides
            more protection for your particular situation.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-5">
              <div className="text-[15px] font-bold text-emerald-700 mb-3">
                ARC-CO May Be Better If:
              </div>
              <div className="space-y-2 text-[13px] text-emerald-700/70 leading-relaxed">
                <p>
                  • Your county has moderate revenue volatility (the 90%
                  guarantee catches shallower losses)
                </p>
                <p>
                  • Market prices are expected to stay above reference
                  prices (PLC wouldn&rsquo;t trigger, but county revenue
                  could still dip)
                </p>
                <p>
                  • You want to layer ARC-CO with SCO crop insurance (newly
                  allowed under OBBBA)
                </p>
                <p>
                  • Your county yields tend to fluctuate more than national
                  prices
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-5">
              <div className="text-[15px] font-bold text-blue-700 mb-3">
                PLC May Be Better If:
              </div>
              <div className="space-y-2 text-[13px] text-blue-700/70 leading-relaxed">
                <p>
                  • Market prices are projected to fall near or below the
                  reference price (PLC triggers at the national level)
                </p>
                <p>
                  • You grow Southern crops (rice, peanuts, cotton) where
                  OBBBA reference price increases are largest
                </p>
                <p>
                  • Your county already has high, stable yields (reducing
                  ARC-CO&rsquo;s relative advantage)
                </p>
                <p>
                  • You want price-based protection that isn&rsquo;t
                  affected by your neighbors&rsquo; yields
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-harvest-gold/30 bg-harvest-gold/5 p-6 text-center">
            <div className="text-[18px] font-extrabold text-foreground mb-2">
              Run the Numbers for Your County
            </div>
            <p className="text-[14px] text-muted-foreground mb-4 max-w-[480px] mx-auto">
              Our free ARC/PLC calculator uses live USDA NASS data to compare
              estimated payments for your exact county and crop — updated for
              all OBBBA parameters.
            </p>
            <Link
              href="/check"
              className="inline-flex items-center gap-2 rounded-full bg-harvest-gold px-6 py-3 text-[14px] font-bold text-harvest-forest-950 hover:bg-harvest-gold-bright transition-colors"
            >
              Open the Calculator →
            </Link>
          </div>
        </section>

        {/* ── Deadline Tracker ── */}
        <section id="deadline" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2">
            2026 Election Deadline Tracker
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
            As of {lastUpdated}, FSA has <strong className="text-foreground">not
            announced</strong> the 2026 ARC/PLC election and enrollment dates.
            Implementation of OBBBA&rsquo;s new base acre provisions and
            updated program parameters requires significant systems
            updates. Current estimates from extension economists and FSA
            sources suggest enrollment may not open until{" "}
            <strong className="text-foreground">summer or fall 2026</strong>.
          </p>

          <div className="space-y-3">
            {[
              {
                date: "July 4, 2025",
                event: "OBBBA signed into law",
                status: "complete" as const,
              },
              {
                date: "January 12, 2026",
                event: "Federal Register implementing rule published (2026-00313)",
                status: "complete" as const,
              },
              {
                date: "TBD (est. Spring 2026)",
                event: "FSA notifies eligible owners of new base acre allocations",
                status: "pending" as const,
              },
              {
                date: "TBD (est. Summer–Fall 2026)",
                event: "2026 ARC/PLC election and enrollment period opens",
                status: "pending" as const,
              },
              {
                date: "October 2026",
                event: "2025 higher-of payments begin disbursement",
                status: "pending" as const,
              },
            ].map((item) => (
              <div
                key={item.event}
                className="flex items-start gap-4 rounded-xl border border-border/50 bg-surface/30 p-4"
              >
                <div
                  className={`mt-0.5 h-3 w-3 rounded-full shrink-0 ${
                    item.status === "complete"
                      ? "bg-emerald-500"
                      : "border-2 border-muted-foreground/30 bg-transparent"
                  }`}
                />
                <div>
                  <div className="text-[13px] font-bold text-foreground">
                    {item.date}
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {item.event}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[13px] text-muted-foreground mt-4 italic">
            This timeline is updated as new information becomes available.
            Sign up for a free HarvestFile account to receive email alerts
            when dates are announced.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="mb-16 scroll-mt-24">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-6">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Do I need to do anything for 2025?",
                a: "No. The higher-of provision automatically gives you whichever program — ARC-CO or PLC — produces a larger payment for each covered commodity on each farm. No election, no paperwork. Payments are expected beginning October 2026.",
              },
              {
                q: "When is the 2026 ARC/PLC election deadline?",
                a: "As of March 2026, FSA has not announced the 2026 election deadline. Current estimates from extension economists suggest enrollment may open in summer or fall 2026. The Federal Register implementing rule indicates farmers will know their 2026 production and yields before they need to decide.",
              },
              {
                q: "How do I get new base acres?",
                a: "The process is largely automatic. FSA has your planting history from 2019–2023 and will notify eligible farm owners of their allocation. You do not need to apply. If you don't want the new base, you can opt out within 90 days of notification.",
              },
              {
                q: "Can my existing base acres be updated or reallocated?",
                a: "No. OBBBA only allows the addition of new base acres. Existing base acre allocations cannot be changed, reallocated among commodities, or updated based on recent planting history.",
              },
              {
                q: "Can I really buy SCO crop insurance with ARC now?",
                a: "Yes, starting with crop year 2026. The restriction that prohibited SCO purchases for ARC-elected acres has been removed. SCO premium subsidies also increased from 65% to 80%, making it significantly more affordable.",
              },
              {
                q: "What if I don't make a 2026 election?",
                a: "You would receive no ARC or PLC payment for 2026. Unlike 2025 (where the higher-of provision is automatic), 2026 and all future years require an affirmative election. Inaction means forfeited coverage — not a default to the previous election.",
              },
              {
                q: "Do the new payment limits apply to my LLC or S-corp?",
                a: "Yes, and the rules are more favorable. Qualified pass-through entities (S-corps, LLCs not taxed as C-corps) are now treated like general partnerships — each actively-engaged member or shareholder receives their own $155,000 limit (indexed for inflation).",
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="text-[16px] font-bold text-foreground mb-2">
                  {faq.q}
                </h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related Guides ── */}
        <section className="mb-16">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-6">
            Dive Deeper
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                href: "/obbba/new-base-acres",
                title: "New Base Acres Under OBBBA",
                desc: "Step-by-step guide to eligibility, allocation, and the pro-rata cap",
              },
              {
                href: "/obbba/arc-sco-stacking",
                title: "ARC + SCO Stacking Guide",
                desc: "How the decoupling works and when to layer coverage",
              },
              {
                href: "/programs/arc-co",
                title: "How ARC-CO Works",
                desc: "Complete guide to Agriculture Risk Coverage at the county level",
              },
              {
                href: "/programs/plc",
                title: "How PLC Works",
                desc: "Price Loss Coverage explained with updated OBBBA reference prices",
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-xl border border-border/50 bg-surface/30 p-5 hover:bg-surface/60 hover:border-harvest-forest-700/20 transition-all"
              >
                <div className="text-[15px] font-bold text-foreground group-hover:text-harvest-forest-700 transition-colors mb-1">
                  {card.title} →
                </div>
                <div className="text-[13px] text-muted-foreground">
                  {card.desc}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── USDA Disclaimer ── */}
        <div className="rounded-xl border border-border/50 bg-surface/20 p-5 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground/70">Disclaimer:</strong> HarvestFile
          is not affiliated with, endorsed by, or sponsored by the USDA, FSA,
          or any government agency. All estimates are projections based on
          published USDA NASS data and OBBBA statutory parameters. Actual
          payments depend on final county yields, national Marketing Year
          Average prices, and individual farm configurations determined by FSA.
          This content is for educational purposes and does not constitute
          financial or legal advice. Consult your local FSA office or a
          qualified agricultural advisor for decisions affecting your
          operation. Data sources: Federal Register 2026-00313, USDA FSA,
          USDA NASS Quick Stats, farmdoc daily (University of Illinois),
          Iowa State CALT, CRS Report R48574.
        </div>
      </div>
    </article>
  );
}
