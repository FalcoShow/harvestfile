import PageShell from "@/components/PageShell";

export const metadata = {
  title: "How PLC Works — Price Loss Coverage Program Explained",
  description: "Complete guide to the PLC program: effective reference prices, payment calculations, and when PLC beats ARC-CO for your farm. Updated for 2025 OBBBA.",
  keywords: ["PLC", "price loss coverage", "farm bill", "USDA program", "PLC calculator", "PLC payment", "reference price", "OBBBA 2025"],
};

const s = { h2: { fontSize: 22, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 40 }, h3: { fontSize: 17, fontWeight: 700, color: "#1B4332", marginBottom: 8, marginTop: 28 }, p: { fontSize: 15, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, highlight: { background: "#ECFDF5", borderRadius: 12, padding: "20px 24px", border: "1px solid rgba(5,150,105,0.1)", marginBottom: 20, marginTop: 20 }, card: { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 16 } };

export default function PlcPage() {
  return (
    <PageShell title="How PLC Works" subtitle="Price Loss Coverage Program | Updated for 2025 OBBBA">
      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>Price Loss Coverage (PLC) is the second safety-net option available to farmers alongside ARC-CO. Unlike ARC-CO which protects against county-level revenue declines, PLC protects against national price drops — it pays when the Marketing Year Average price falls below a reference price, regardless of what happens to yields.</p>

        <div style={s.highlight}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 8 }}>2025 OBBBA Update</div>
          <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>The One Big Beautiful Bill Act significantly raised statutory reference prices: corn from $3.70 to <strong style={{ color: "#1B4332" }}>$4.10/bu</strong>, soybeans from $8.40 to <strong style={{ color: "#1B4332" }}>$10.00/bu</strong>, and wheat from $5.50 to <strong style={{ color: "#1B4332" }}>$6.35/bu</strong>. The escalation formula also improved from 85% to <strong style={{ color: "#1B4332" }}>88%</strong> of Olympic average MYA.</div>
        </div>

        <h2 style={s.h2}>The PLC Formula</h2>

        <h3 style={s.h3}>Step 1: Effective Reference Price (ERP)</h3>
        <p style={s.p}>The ERP is the key mechanism. It&apos;s the higher of the statutory reference price OR 88% of the Olympic average of the most recent 5 MYA prices (capped at 115% of statutory). This means the reference price ratchets upward when market prices are high, providing more protection.</p>

        <h3 style={s.h3}>Step 2: PLC Rate</h3>
        <p style={s.p}>PLC Rate = Effective Reference Price minus the higher of the national MYA price or the national loan rate. If MYA is above the ERP, there is no PLC payment for that year.</p>

        <h3 style={s.h3}>Step 3: Your Payment</h3>
        <p style={s.p}>Payment = PLC Rate × your farm&apos;s PLC payment yield × 85% of base acres, minus approximately 5.7% sequestration.</p>

        <h2 style={s.h2}>PLC Payment Yield</h2>
        <p style={s.p}>Unlike ARC-CO which uses county yields, PLC uses a farm-specific payment yield set during 2018 Farm Bill enrollment. This was calculated as 90% of the farm&apos;s 2013–2017 average yield, with a floor of 75% of the county average. You can check your PLC payment yield on your FSA-156EZ form.</p>

        <h2 style={s.h2}>Updated Reference Prices (OBBBA)</h2>
        <div style={s.card}>
          {[
            ["Corn", "$3.70/bu", "$4.10/bu"],
            ["Soybeans", "$8.40/bu", "$10.00/bu"],
            ["Wheat", "$5.50/bu", "$6.35/bu"],
          ].map(([crop, old, curr]) => (
            <div key={crop} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ fontWeight: 600, color: "#1B4332", flex: 1 }}>{crop}</span>
              <span style={{ color: "#9CA3AF", flex: 1, textAlign: "center", textDecoration: "line-through" }}>{old}</span>
              <span style={{ fontWeight: 700, color: "#059669", flex: 1, textAlign: "right" }}>{curr}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontSize: 11, color: "#9CA3AF" }}>
            <span style={{ flex: 1 }}>Crop</span><span style={{ flex: 1, textAlign: "center" }}>2018 Farm Bill</span><span style={{ flex: 1, textAlign: "right" }}>OBBBA (2025+)</span>
          </div>
        </div>

        <h2 style={s.h2}>When Does PLC Pay More Than ARC-CO?</h2>
        <p style={s.p}>PLC tends to outperform ARC-CO in specific scenarios. PLC wins when national MYA prices crash significantly below the effective reference price, regardless of county yields. Because PLC has no per-acre payment cap (unlike ARC-CO&apos;s 12% cap), deep price drops generate larger PLC payments. PLC also favors farms with a high PLC payment yield relative to their county average.</p>
        <p style={s.p}>ARC-CO tends to win when both yields and prices decline moderately, or when prices stay near the reference price but yields drop in your specific county.</p>

        <h2 style={s.h2}>Key Advantage: No Payment Cap</h2>
        <p style={s.p}>ARC-CO payments are capped at 12% of benchmark revenue per acre. PLC has no such cap. If corn prices dropped to $3.00/bu with a $4.43 effective reference price, PLC would pay $1.43/bu × payment yield — potentially much larger than ARC-CO&apos;s capped payment. This uncapped structure is PLC&apos;s biggest advantage in severe price-drop scenarios.</p>

        <div style={{ background: "rgba(201,168,76,0.08)", borderRadius: 14, padding: "24px 28px", border: "1px solid rgba(201,168,76,0.15)", marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1B4332", marginBottom: 8 }}>Compare ARC-CO vs PLC for your farm</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>See which program puts more money in your pocket.</div>
          <a href="/" style={{ display: "inline-block", background: "#1B4332", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>Open Calculator →</a>
        </div>
      </div>
    </PageShell>
  );
}
