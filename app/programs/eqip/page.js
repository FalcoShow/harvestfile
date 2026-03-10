import PageShell from "../../../components/PageShell";

export const metadata = {
  title: "EQIP Guide — Environmental Quality Incentives Program Explained",
  description: "Complete guide to the USDA EQIP program: eligibility, payment rates, conservation practices, and how to apply. Learn if your farm qualifies.",
  keywords: ["EQIP", "environmental quality incentives program", "USDA conservation", "NRCS", "farm conservation payments", "EQIP eligibility"],
};

const s = { h2: { fontSize: 22, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 40 }, h3: { fontSize: 17, fontWeight: 700, color: "#1B4332", marginBottom: 8, marginTop: 28 }, p: { fontSize: 15, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, card: { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 16 } };

export default function EqipPage() {
  return (
    <PageShell title="EQIP Program Guide" subtitle="Environmental Quality Incentives Program">
      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>The Environmental Quality Incentives Program (EQIP) is one of USDA&apos;s largest conservation programs, providing financial and technical assistance to farmers who implement conservation practices on their land. Unlike ARC-CO and PLC which are commodity payment programs, EQIP pays you to make specific improvements to your operation.</p>

        <h2 style={s.h2}>What Does EQIP Pay For?</h2>
        <p style={s.p}>EQIP provides cost-share payments (typically covering 50-75% of the cost) for a wide range of conservation practices. Common practices include cover crops, nutrient management plans, irrigation efficiency upgrades, fencing for rotational grazing, grassed waterways and terraces, manure storage facilities, pollinator habitat establishment, high tunnels for season extension, and soil health improvements like no-till transitions.</p>

        <h2 style={s.h2}>Who Is Eligible?</h2>
        <div style={s.card}>
          {[
            ["Farm type", "Cropland, livestock, forestry, or mixed operations"],
            ["Size", "All sizes — small and beginning farmers get priority"],
            ["Income limit", "Adjusted gross income under $900,000 (average of 3 years)"],
            ["Land", "Must have control of eligible agricultural land"],
            ["Plan", "Must develop an NRCS conservation plan"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14, gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "#1B4332", minWidth: 100 }}>{k}</span><span style={{ flex: 1 }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Payment Structure</h2>
        <p style={s.p}>EQIP contracts typically run 1 to 10 years. Payments are based on a cost-share model — USDA pays a percentage of the cost of implementing each practice, and you pay the rest. Payment rates vary by practice and state but common ranges include: cover crops at $15-50 per acre per year, nutrient management at $8-15 per acre, fence installation at $1.50-8.00 per linear foot, and high tunnels with up to 75% of installation costs covered.</p>
        <p style={s.p}>Beginning, limited resource, socially disadvantaged, and veteran farmers may qualify for up to 90% cost-share rates.</p>

        <h2 style={s.h2}>How to Apply</h2>
        <p style={s.p}>EQIP applications are handled through your local USDA Service Center by the Natural Resources Conservation Service (NRCS). The process involves contacting your local NRCS office, discussing your conservation goals, developing a conservation plan, submitting an EQIP application during the signup period, and getting ranked and approved based on environmental benefits.</p>
        <p style={s.p}>EQIP has continuous signup in most states, but ranking and funding decisions happen in batches. Applying early improves your chances.</p>

        <h2 style={s.h2}>EQIP vs. ARC/PLC</h2>
        <div style={s.card}>
          {[
            ["Purpose", "Conservation improvements", "Commodity price/revenue safety net"],
            ["Administered by", "NRCS", "FSA"],
            ["Payment basis", "Cost of conservation practices", "Crop prices and county yields"],
            ["Contract length", "1-10 years", "Annual election"],
            ["Can use both?", "Yes — EQIP is independent of ARC/PLC", ""],
          ].map(([k, eqip, arc]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 13.5, gap: 12 }}>
              <span style={{ fontWeight: 600, color: "#1B4332" }}>{k}</span><span>{eqip}</span><span>{arc}</span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 0 0", fontSize: 11, color: "#9CA3AF" }}>
            <span></span><span>EQIP</span><span>ARC/PLC</span>
          </div>
        </div>

        <h2 style={s.h2}>Bottom Line</h2>
        <p style={s.p}>EQIP is one of the best-kept secrets in farm programs. Many farmers don&apos;t realize they can receive thousands of dollars to implement conservation practices they might already be considering. It&apos;s completely separate from ARC/PLC — you can enroll in both. If you&apos;re thinking about cover crops, soil health, water management, or any conservation practice, EQIP can pay for most of it.</p>

        <div style={{ background: "rgba(201,168,76,0.08)", borderRadius: 14, padding: "24px 28px", border: "1px solid rgba(201,168,76,0.15)", marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1B4332", marginBottom: 8 }}>Check your ARC/PLC eligibility first</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>See how much ARC-CO or PLC could pay for your farm — it takes 2 minutes.</div>
          <a href="/" style={{ display: "inline-block", background: "#1B4332", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>Open Calculator →</a>
        </div>
      </div>
    </PageShell>
  );
}
