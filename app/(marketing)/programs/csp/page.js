import PageShell from "@/components/PageShell";

export const metadata = {
  title: "CSP Guide — Conservation Stewardship Program Explained | HarvestFile",
  description: "Complete guide to the USDA Conservation Stewardship Program: eligibility, enhancement activities, payment rates, and how CSP rewards farmers already doing conservation. Updated for 2025.",
  keywords: ["CSP", "conservation stewardship program", "USDA CSP", "CSP payments", "CSP eligibility", "NRCS conservation", "stewardship payments"],
};

const s = { h2: { fontSize: 22, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 40 }, h3: { fontSize: 17, fontWeight: 700, color: "#1B4332", marginBottom: 8, marginTop: 28 }, p: { fontSize: 15, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, highlight: { background: "#ECFDF5", borderRadius: 12, padding: "20px 24px", border: "1px solid rgba(5,150,105,0.1)", marginBottom: 20, marginTop: 20 }, card: { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 16 } };

export default function CspPage() {
  return (
    <PageShell title="CSP Program Guide" subtitle="Conservation Stewardship Program | Updated for 2025">
      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>The Conservation Stewardship Program (CSP) is USDA&apos;s largest conservation program by acreage, rewarding farmers who are already practicing good stewardship and helping them go further. Unlike EQIP which pays for new conservation practices, CSP pays you an annual per-acre rate for maintaining and enhancing conservation activities across your entire operation.</p>

        <div style={s.highlight}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 8 }}>Key Difference from EQIP</div>
          <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>EQIP pays you to <strong style={{ color: "#1B4332" }}>start</strong> conservation practices. CSP pays you to <strong style={{ color: "#1B4332" }}>continue and improve</strong> them. If you&apos;re already doing cover crops, no-till, nutrient management, or other conservation work, CSP can pay you for what you&apos;re already doing — plus more for additional enhancements.</div>
        </div>

        <h2 style={s.h2}>How CSP Works</h2>
        <p style={s.p}>CSP operates on a whole-farm basis. NRCS evaluates the conservation performance of your entire operation — cropland, pasture, forest, and associated land — using the Conservation Measurement Tool (CMT). You receive an annual payment based on your current conservation level plus additional payments for adopting new enhancement activities during the 5-year contract period.</p>

        <h2 style={s.h2}>Payment Structure</h2>
        <p style={s.p}>CSP payments have two components. The annual stewardship payment covers the cost of maintaining existing conservation activities on your operation, typically ranging from $1,500 to $40,000 per year depending on operation size and conservation level. Enhancement payments are additional per-acre or per-activity payments for adopting new practices during the contract.</p>

        <div style={s.card}>
          {[
            ["Contract length", "5 years (renewable for one additional 5-year period)"],
            ["Annual payment cap", "$40,000 per year for individuals, $80,000 for joint operations"],
            ["Payment basis", "Per-acre rate based on conservation performance level + enhancement payments"],
            ["Typical cropland rate", "$8–$18 per acre per year (varies by state and conservation level)"],
            ["Enhancement payments", "Additional $2–$12 per acre for each new enhancement adopted"],
            ["Whole-farm coverage", "Payments cover your entire agricultural operation, not just individual fields"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "#1B4332", minWidth: 140 }}>{k}</span><span style={{ flex: 1, lineHeight: 1.6 }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Who Is Eligible?</h2>
        <p style={s.p}>CSP has a higher bar than EQIP — you need to already be practicing conservation at a certain level to qualify. NRCS uses the CMT to score your operation, and you must meet or exceed a minimum threshold on at least two priority resource concerns (like soil quality, water quality, or wildlife habitat) to be eligible.</p>

        <div style={s.card}>
          {[
            ["Conservation baseline", "Must already meet minimum stewardship thresholds on at least 2 resource concerns"],
            ["Land control", "Must have control of eligible land for the contract period (5 years)"],
            ["Operation type", "Cropland, pastureland, rangeland, and non-industrial private forestland"],
            ["Income limit", "Adjusted gross income under $900,000 (3-year average)"],
            ["Willingness to improve", "Must agree to adopt at least one new enhancement activity during the contract"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "#1B4332", minWidth: 140 }}>{k}</span><span style={{ flex: 1, lineHeight: 1.6 }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Common Enhancement Activities</h2>
        <p style={s.p}>CSP offers hundreds of enhancement activities across multiple resource concerns. You choose which enhancements to adopt based on your operation and conservation goals.</p>

        <div style={s.card}>
          {[
            ["Soil Health", "Advanced cover crop mixes, reduced tillage intensity, soil testing and amendment plans, compaction reduction"],
            ["Water Quality", "Precision nutrient application, advanced IPM, filter strip management, drainage water management"],
            ["Water Quantity", "Irrigation scheduling technology, deficit irrigation strategies, soil moisture monitoring"],
            ["Wildlife Habitat", "Pollinator habitat establishment, nesting cover management, wildlife-friendly harvest timing"],
            ["Energy", "Fuel use reduction plans, energy audits, renewable energy adoption"],
            ["Air Quality", "Reduced burn frequency, precision application to reduce drift, windbreak establishment"],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: "#1B4332" }}>{k}:</span>{" "}<span style={{ lineHeight: 1.6 }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>CSP vs. EQIP vs. CRP</h2>
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "10px 0 8px", borderBottom: "2px solid rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 700, color: "#1B4332" }}>
            <span></span><span>CSP</span><span>EQIP</span><span>CRP</span>
          </div>
          {[
            ["Purpose", "Reward & enhance existing conservation", "Fund new conservation practices", "Retire land from production"],
            ["Payment type", "Annual per-acre + enhancement", "Cost-share (50–75%)", "Annual rental payment"],
            ["Land status", "Stays in production", "Stays in production", "Removed from production"],
            ["Contract", "5 years (renewable once)", "1–10 years", "10–15 years"],
            ["Baseline required", "Yes — must already be conserving", "No — can start from scratch", "No"],
            ["ARC/PLC compatible", "Yes — fully compatible", "Yes — fully compatible", "No — enrolled land excluded"],
          ].map(([k, csp, eqip, crp]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 13, gap: 8 }}>
              <span style={{ fontWeight: 600, color: "#1B4332" }}>{k}</span><span>{csp}</span><span>{eqip}</span><span>{crp}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>How to Apply</h2>
        <p style={s.p}>CSP applications are accepted through your local NRCS office during designated ranking periods (usually once or twice per year). The process starts with scheduling a meeting with your local NRCS conservationist, who will assess your current conservation activities using the CMT. Based on your score, they&apos;ll help you identify enhancement activities that would increase your ranking and payment. Applications are ranked competitively within each state, so higher conservation performance means better chances of acceptance.</p>

        <h2 style={s.h2}>Bottom Line</h2>
        <p style={s.p}>CSP is the most underutilized program for farmers who are already good stewards. If you&apos;re doing cover crops, no-till, nutrient management, or any other conservation practices, you may already qualify for $8–$18 per acre in annual payments across your entire operation — and that&apos;s before enhancement payments. A 1,000-acre operation could earn $10,000–$25,000 per year through CSP, stacked on top of ARC/PLC payments. The key is talking to your NRCS office to get your CMT score and see where you stand.</p>

        <div style={{ background: "rgba(201,168,76,0.08)", borderRadius: 14, padding: "24px 28px", border: "1px solid rgba(201,168,76,0.15)", marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1B4332", marginBottom: 8 }}>Stack CSP with the right ARC/PLC choice</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>CSP payments are on top of ARC/PLC. Make sure you&apos;re maximizing both.</div>
          <a href="/" style={{ display: "inline-block", background: "#1B4332", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>Open Calculator →</a>
        </div>
      </div>
    </PageShell>
  );
}
