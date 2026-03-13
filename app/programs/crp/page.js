import PageShell from "../../../components/PageShell";

export const metadata = {
  title: "CRP Guide — Conservation Reserve Program Explained | HarvestFile",
  description: "Complete guide to the USDA Conservation Reserve Program: eligible land, rental rates, signup periods, and how CRP interacts with ARC/PLC. Updated for 2025.",
  keywords: ["CRP", "conservation reserve program", "USDA CRP", "CRP rental rates", "CRP signup", "CRP eligibility", "farm conservation"],
};

const s = { h2: { fontSize: 22, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 40 }, h3: { fontSize: 17, fontWeight: 700, color: "#1B4332", marginBottom: 8, marginTop: 28 }, p: { fontSize: 15, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, highlight: { background: "#ECFDF5", borderRadius: 12, padding: "20px 24px", border: "1px solid rgba(5,150,105,0.1)", marginBottom: 20, marginTop: 20 }, card: { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 16 } };

export default function CrpPage() {
  return (
    <PageShell title="CRP Program Guide" subtitle="Conservation Reserve Program | Updated for 2025">
      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>The Conservation Reserve Program (CRP) pays farmers an annual rental rate to take environmentally sensitive cropland out of production and plant conservation covers like grasses, trees, or wildlife habitat. CRP is administered by the Farm Service Agency (FSA) and is one of the largest private-lands conservation programs in the country.</p>

        <div style={s.highlight}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 8 }}>Why CRP Matters</div>
          <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>CRP enrolled over <strong style={{ color: "#1B4332" }}>23 million acres</strong> nationally as of 2025. For many farmers, CRP provides a guaranteed annual payment on marginal land that would otherwise lose money in production — often <strong style={{ color: "#1B4332" }}>$150–$350 per acre per year</strong> depending on county soil rental rates.</div>
        </div>

        <h2 style={s.h2}>How CRP Works</h2>
        <p style={s.p}>Farmers submit offers to enroll eligible land in CRP during designated signup periods. FSA evaluates offers using an Environmental Benefits Index (EBI) that considers wildlife habitat, water quality, soil erosion reduction, and cost. If your offer is accepted, you sign a 10- to 15-year contract and receive annual rental payments plus cost-share assistance (up to 50%) for establishing the conservation cover.</p>

        <h2 style={s.h2}>CRP Signup Types</h2>
        <div style={s.card}>
          {[
            ["General Signup", "Competitive enrollment during designated periods. Offers ranked by EBI score. Best for larger tracts of cropland. Contracts are 10–15 years."],
            ["Continuous Signup", "Non-competitive, year-round enrollment for high-priority conservation practices. Includes filter strips, riparian buffers, wetland restoration, and grass waterways. Easier to get accepted."],
            ["CLEAR30", "30-year contracts for farmable wetlands. Higher rental rates. Permanent easement option available in some states."],
            ["CRP Grasslands", "Protects working grasslands. Allows haying and grazing while receiving payments. Contracts are 10–15 years. Up to 200 acres per offer."],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: "#1B4332" }}>{k}</span>
              <div style={{ color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>{v}</div>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Who Is Eligible?</h2>
        <div style={s.card}>
          {[
            ["Land ownership", "Must own or operate the land for at least 12 months prior to enrollment (general signup) or close of the previous CRP signup (continuous)"],
            ["Cropping history", "Land must have been planted or considered planted to an agricultural commodity in 4 of the 6 crop years before enrollment"],
            ["Land type", "Cropland, marginal pastureland (for certain practices), or certain farmable wetlands"],
            ["Income limit", "Adjusted gross income under $900,000 (average of 3 tax years)"],
            ["Acreage cap", "National cap of 27 million acres. Individual limits apply to CRP Grasslands (200 acres per offer)"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "#1B4332", minWidth: 120 }}>{k}</span><span style={{ flex: 1, lineHeight: 1.6 }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Payment Structure</h2>
        <p style={s.p}>CRP payments have three components. Annual rental payments are based on your county&apos;s soil rental rates, adjusted for site-specific productivity. These rates are set by FSA and vary significantly by county — from under $100/acre in arid Western counties to over $300/acre in prime Midwest farmland. Signing Incentive Payments (SIPs) are one-time per-acre payments offered in some signup periods. Practice Incentive Payments (PIPs) provide an additional 40% of establishment costs for continuous signup practices.</p>
        <p style={s.p}>Cost-share assistance covers up to 50% of the cost of establishing the conservation cover (grasses, trees, etc.).</p>

        <h2 style={s.h2}>CRP and ARC/PLC Interaction</h2>
        <div style={s.highlight}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 8 }}>Critical Rule</div>
          <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>Land enrolled in CRP is <strong style={{ color: "#1B4332" }}>not eligible</strong> for ARC or PLC payments during the CRP contract period. However, when a CRP contract expires and land returns to production, those acres regain ARC/PLC base acre eligibility. This is a key financial planning consideration — you need to compare CRP rental rates against potential ARC/PLC payments plus crop revenue.</div>
        </div>

        <h2 style={s.h2}>When CRP Makes Sense</h2>
        <div style={s.card}>
          {[
            ["Marginal cropland", "Land with low yields that barely breaks even in production — CRP often pays more than farming it"],
            ["Highly erodible land", "Required conservation compliance becomes expensive; CRP covers the cost and pays rent"],
            ["Retirement planning", "Guaranteed income for 10–15 years without the cost and labor of farming"],
            ["Environmental goals", "Wildlife habitat, water quality, and soil health benefits alongside payments"],
            ["Risk reduction", "Eliminates production risk, input costs, and crop insurance premiums on enrolled acres"],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: "#1B4332" }}>{k}:</span>{" "}<span style={{ lineHeight: 1.6 }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Key Numbers for 2025</h2>
        <div style={s.card}>
          {[
            ["National enrollment", "~23 million acres"],
            ["National cap", "27 million acres"],
            ["Contract length", "10–15 years (standard), 30 years (CLEAR30)"],
            ["Cost-share", "Up to 50% of establishment costs"],
            ["Rental rate range", "~$50–$350/acre/year (varies by county)"],
            ["Income limit", "$900,000 AGI (3-year average)"],
            ["Sequestration", "~5.7% reduction on payments"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ color: "#6B7280" }}>{k}</span><span style={{ fontWeight: 600, color: "#1B4332" }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Bottom Line</h2>
        <p style={s.p}>CRP is one of the most financially attractive options for marginal cropland. If you have acres that consistently underperform, CRP can replace that uncertain income with a guaranteed annual payment while building soil health and wildlife habitat. The key is comparing your county&apos;s CRP rental rate against what you&apos;d realistically earn from farming those acres — including ARC/PLC payments, crop revenue, and input costs. For many Midwest farmers, the math clearly favors CRP on their least productive ground.</p>

        <div style={{ background: "rgba(201,168,76,0.08)", borderRadius: 14, padding: "24px 28px", border: "1px solid rgba(201,168,76,0.15)", marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1B4332", marginBottom: 8 }}>Optimize your productive acres first</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>Make sure your ARC/PLC election is maximizing payments on the land you&apos;re still farming.</div>
          <a href="/" style={{ display: "inline-block", background: "#1B4332", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>Open Calculator →</a>
        </div>
      </div>
    </PageShell>
  );
}
