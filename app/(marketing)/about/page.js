import PageShell from "@/components/PageShell";

export const metadata = {
  title: "About HarvestFile — Our Mission to Help American Farmers",
  description: "HarvestFile was founded by Andrew Angerstien to help farmers navigate complex USDA programs. Learn about our mission, values, and the data behind our tools.",
};

const s = { h2: { fontSize: 22, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 40 }, p: { fontSize: 15, color: "#6B7280", lineHeight: 1.75, marginBottom: 16 }, accent: { color: "#C9A84C", fontWeight: 700 } };

export default function AboutPage() {
  return (
    <PageShell title="About HarvestFile" subtitle="Making USDA farm program data work for American farmers">
      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75 }}>

        <h2 style={s.h2}>Our Mission</h2>
        <p style={s.p}>
          Every year, American farmers leave billions of dollars on the table because the USDA&apos;s farm program system is confusing, opaque, and buried in government PDFs. Choosing between ARC-CO and PLC shouldn&apos;t require a degree in agricultural economics — it should take two minutes and a clear answer.
        </p>
        <p style={s.p}>
          That&apos;s why HarvestFile exists. We take the same official USDA data and FSA formulas that government offices use, and we turn them into a simple, free calculator that any farmer can understand. No jargon. No account required. Just your county, your crop, and your answer.
        </p>

        <h2 style={s.h2}>Founded by Andrew Angerstien</h2>
        <p style={s.p}>
          HarvestFile was founded in 2026 by <span style={s.accent}>Andrew Angerstien</span> in Ohio — one of America&apos;s most productive agricultural states. After seeing how many farmers were either choosing the wrong program or not enrolling at all simply because the process was too confusing, Andrew set out to build the tool that should have existed years ago.
        </p>
        <p style={s.p}>
          The average farmer who switches to the right ARC/PLC program gains $3,000 to $15,000 per year. For a 500-acre corn operation, that&apos;s real money — and the difference between a profitable year and a tight one. HarvestFile makes that decision obvious.
        </p>

        <h2 style={s.h2}>How We&apos;re Different</h2>
        <p style={s.p}>
          Most ARC/PLC tools are either locked behind expensive software subscriptions, buried in university extension spreadsheets, or require calling your local FSA office and waiting on hold. HarvestFile is different in three ways:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, margin: "24px 0 32px" }}>
          {[
            ["🆓", "Free forever", "No subscription, no paywall, no account required. Every farmer deserves access to their own data."],
            ["📡", "Live USDA data", "We pull real county yield data from the NASS API — the same source FSA uses for official calculations."],
            ["🇺🇸", "Nationwide", "All 50 states, every county. Not limited to one region or one crop."],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ background: "#fff", borderRadius: 16, padding: "24px 20px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1B4332", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Our Data Sources</h2>
        <p style={s.p}>
          Transparency matters. Here&apos;s exactly where our numbers come from:
        </p>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 24 }}>
          {[
            ["County yield data", "USDA National Agricultural Statistics Service (NASS) Quick Stats API"],
            ["Program rules & formulas", "Farm Service Agency (FSA) ARC/PLC program documentation"],
            ["Reference prices", "2025 One Big Beautiful Bill Act (OBBBA) statutory rates"],
            ["MYA price estimates", "USDA Economic Research Service (ERS) season-average forecasts"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14, gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "#1B4332" }}>{k}</span>
              <span style={{ color: "#6B7280" }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Contact Us</h2>
        <p style={s.p}>
          Have questions, feedback, or want to partner with us? Reach out at <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", fontWeight: 600, textDecoration: "none" }}>hello@harvestfile.com</a>. We read every email.
        </p>
        <p style={s.p}>
          HarvestFile LLC is registered in the state of Ohio.
        </p>
      </div>
    </PageShell>
  );
}
