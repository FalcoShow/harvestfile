import PageShell from "@/components/PageShell";

export const metadata = {
  title: "How ARC-CO Works — Agriculture Risk Coverage County Option Explained",
  description: "Complete guide to the ARC-CO program: how benchmark revenue is calculated, the 90% guarantee, 12% payment cap, and how to know if ARC-CO is right for your farm. Updated for 2025 OBBBA.",
  keywords: ["ARC-CO", "agriculture risk coverage", "county option", "farm bill", "USDA program", "ARC-CO calculator", "ARC-CO payment", "OBBBA 2025"],
};

const s = { h2: { fontSize: 22, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 40 }, h3: { fontSize: 17, fontWeight: 700, color: "#1B4332", marginBottom: 8, marginTop: 28 }, p: { fontSize: 15, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, highlight: { background: "#ECFDF5", borderRadius: 12, padding: "20px 24px", border: "1px solid rgba(5,150,105,0.1)", marginBottom: 20, marginTop: 20 }, card: { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 16 } };

export default function ArcCoPage() {
  return (
    <PageShell title="How ARC-CO Works" subtitle="Agriculture Risk Coverage — County Option | Updated for 2025 OBBBA">
      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>The Agriculture Risk Coverage — County Option (ARC-CO) is one of two safety-net programs available to farmers under the USDA Farm Bill. ARC-CO protects against revenue declines at the county level, making payments when your county&apos;s actual crop revenue falls below a guaranteed threshold.</p>

        <div style={s.highlight}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 8 }}>2025 OBBBA Update</div>
          <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>The One Big Beautiful Bill Act (signed July 2025) increased the ARC-CO guarantee from 86% to <strong style={{ color: "#1B4332" }}>90%</strong> and raised the payment cap from 10% to <strong style={{ color: "#1B4332" }}>12%</strong> of benchmark revenue, effective for the 2025 crop year.</div>
        </div>

        <h2 style={s.h2}>The ARC-CO Formula in 5 Steps</h2>

        <h3 style={s.h3}>Step 1: Benchmark Revenue</h3>
        <p style={s.p}>Benchmark Revenue equals the Olympic average of your county&apos;s trend-adjusted yields (drop the highest and lowest of 5 years, average the remaining 3) multiplied by the Olympic average of national Marketing Year Average (MYA) prices over the same period. For each price year, USDA uses the higher of the actual MYA price or the effective reference price — so benchmark prices have a floor.</p>

        <h3 style={s.h3}>Step 2: ARC-CO Guarantee</h3>
        <p style={s.p}>Your guarantee is <strong style={{ color: "#1B4332" }}>90% of Benchmark Revenue</strong> (previously 86% before OBBBA). This is the revenue threshold — if actual county revenue falls below this, ARC-CO pays the difference.</p>

        <h3 style={s.h3}>Step 3: Actual Revenue</h3>
        <p style={s.p}>Actual Revenue = your county&apos;s actual yield × the higher of the national MYA price or the national loan rate. The loan rate floor prevents extremely low prices from zeroing out actual revenue.</p>

        <h3 style={s.h3}>Step 4: Payment Rate (with cap)</h3>
        <p style={s.p}>If the Guarantee exceeds Actual Revenue, the difference is your payment rate — but it&apos;s capped at <strong style={{ color: "#1B4332" }}>12% of Benchmark Revenue</strong> (up from 10%). This means ARC-CO covers revenue losses from 90% down to 78% of benchmark.</p>

        <h3 style={s.h3}>Step 5: Your Payment</h3>
        <p style={s.p}>Payment = Payment Rate × 85% of your base acres × your share, minus approximately 5.7% sequestration.</p>

        <h2 style={s.h2}>When Does ARC-CO Pay More Than PLC?</h2>
        <div style={s.card}>
          {[
            ["ARC-CO tends to win when", "Both prices AND yields decline moderately within the coverage band"],
            ["ARC-CO also wins when", "Prices stay near the reference price but your county has a bad yield year"],
            ["PLC tends to win when", "National prices crash well below the reference price, regardless of yields"],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: "#1B4332" }}>{k}:</span>{" "}<span>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Key Numbers for 2025</h2>
        <div style={s.card}>
          {[
            ["ARC-CO Guarantee", "90% of Benchmark Revenue"],
            ["Payment Cap", "12% of Benchmark Revenue"],
            ["Coverage Band", "90% down to 78%"],
            ["Payment Acres", "85% of base acres"],
            ["Sequestration", "~5.7%"],
            ["Corn Statutory Ref Price", "$4.10/bu (OBBBA)"],
            ["Soybeans Statutory Ref Price", "$10.00/bu (OBBBA)"],
            ["Wheat Statutory Ref Price", "$6.35/bu (OBBBA)"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
              <span style={{ color: "#6B7280" }}>{k}</span><span style={{ fontWeight: 600, color: "#1B4332" }}>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Special 2025 Provision</h2>
        <p style={s.p}>Under OBBBA, for the <strong style={{ color: "#1B4332" }}>2025 crop year only</strong>, farmers automatically receive whichever program — ARC-CO or PLC — pays more, regardless of which one they elected. Starting in 2026, annual elections resume normally.</p>

        <div style={{ background: "rgba(201,168,76,0.08)", borderRadius: 14, padding: "24px 28px", border: "1px solid rgba(201,168,76,0.15)", marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1B4332", marginBottom: 8 }}>Calculate your ARC-CO payment</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>See exactly what ARC-CO would pay for your county and crop.</div>
          <a href="/" style={{ display: "inline-block", background: "#1B4332", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>Open Calculator →</a>
        </div>
      </div>
    </PageShell>
  );
}
