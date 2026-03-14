import PageShell from "@/components/PageShell";

export const metadata = {
  title: "Privacy Policy — HarvestFile",
  description: "HarvestFile's privacy policy. Learn how we handle your data, what we collect, and how we protect your information.",
};

const s = { h2: { fontSize: 20, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 10, marginTop: 36 }, p: { fontSize: 14.5, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, strong: { color: "#1B4332", fontWeight: 600 } };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: March 10, 2026">
      <div style={{ fontSize: 14.5, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>HarvestFile LLC (&quot;HarvestFile,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website at harvestfile.com and our ARC/PLC Decision Calculator.</p>

        <h2 style={s.h2}>Information We Collect</h2>
        <p style={s.p}><span style={s.strong}>Calculator Inputs:</span> When you use our ARC/PLC calculator, you provide your state, county, crop type, and base acres. This information is processed in your browser to generate results and is not stored on our servers unless you choose to save your results.</p>
        <p style={s.p}><span style={s.strong}>Email Addresses:</span> If you opt in to save your results or receive price alerts, we collect your email address. This is stored securely in our database and used solely to send you updates about your calculation results and MYA price changes.</p>
        <p style={s.p}><span style={s.strong}>Analytics Data:</span> We use Vercel Analytics to collect anonymous usage data including page views, visitor counts, and general geographic information. This data does not identify you personally and is used to improve our service.</p>
        <p style={s.p}><span style={s.strong}>USDA Data:</span> Our calculator pulls publicly available county yield data from the USDA NASS Quick Stats API. This is government data and contains no personal information.</p>

        <h2 style={s.h2}>How We Use Your Information</h2>
        <p style={s.p}>We use the information we collect to: provide and improve our ARC/PLC calculator, send price alert notifications to users who opt in, analyze anonymous usage patterns to improve the site, and respond to inquiries sent to our contact email.</p>

        <h2 style={s.h2}>Information We Do NOT Collect</h2>
        <p style={s.p}>We do not collect your name, phone number, physical address, Social Security number, FSA account information, bank account details, or any other personally identifiable information beyond your email address (and only when voluntarily provided).</p>

        <h2 style={s.h2}>Data Storage & Security</h2>
        <p style={s.p}>Email addresses and associated calculation metadata are stored in a secured Supabase database with row-level security enabled. We use HTTPS encryption for all data transmission. Calculator inputs that are not saved are processed entirely in your browser and never transmitted to our servers.</p>

        <h2 style={s.h2}>Third-Party Services</h2>
        <p style={s.p}>We use the following third-party services:</p>
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 16 }}>
          {[["Vercel", "Website hosting and analytics"], ["Supabase", "Database for email storage"], ["USDA NASS API", "Public agricultural data"], ["Google Fonts", "Typography"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.03)", fontSize: 14 }}>
              <span style={{ fontWeight: 600, color: "#1B4332" }}>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>

        <h2 style={s.h2}>Cookies</h2>
        <p style={s.p}>HarvestFile does not use tracking cookies. Vercel Analytics uses a privacy-focused, cookieless approach to collect anonymous usage data.</p>

        <h2 style={s.h2}>Data Sharing</h2>
        <p style={s.p}>We do not sell, trade, or otherwise transfer your information to third parties. We do not share your email address with advertisers, partners, or any external organizations.</p>

        <h2 style={s.h2}>Your Rights</h2>
        <p style={s.p}>You may request deletion of your email address and associated data at any time by emailing <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", textDecoration: "none", fontWeight: 600 }}>hello@harvestfile.com</a>. We will process deletion requests within 30 days.</p>

        <h2 style={s.h2}>Children&apos;s Privacy</h2>
        <p style={s.p}>HarvestFile is not directed at children under 13. We do not knowingly collect information from children under 13.</p>

        <h2 style={s.h2}>Changes to This Policy</h2>
        <p style={s.p}>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of HarvestFile after changes constitutes acceptance of the updated policy.</p>

        <h2 style={s.h2}>Contact</h2>
        <p style={s.p}>Questions about this Privacy Policy? Contact us at <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", textDecoration: "none", fontWeight: 600 }}>hello@harvestfile.com</a>.</p>
        <p style={s.p}>HarvestFile LLC, Ohio, United States.</p>
      </div>
    </PageShell>
  );
}
