import PageShell from "@/components/PageShell";

export const metadata = {
  title: "Privacy Policy — HarvestFile",
  description: "HarvestFile's privacy policy. How we collect, use, and protect your farm data. Aligned with Ag Data Transparent principles.",
};

const s = {
  h2: { fontSize: 20, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 10, marginTop: 36 },
  h3: { fontSize: 16, fontWeight: 700, color: "#1B4332", marginBottom: 8, marginTop: 24 },
  p: { fontSize: 14.5, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 },
  strong: { color: "#1B4332", fontWeight: 600 },
  li: { fontSize: 14.5, color: "#6B7280", lineHeight: 1.75, marginBottom: 6, paddingLeft: 4 },
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: March 16, 2026">
      <div style={{ fontSize: 14.5, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>HarvestFile LLC (&quot;HarvestFile,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy of farmers, agricultural professionals, and all users of our platform. This Privacy Policy explains how we collect, use, store, and safeguard your information when you use harvestfile.com, including our free ARC/PLC Calculator, Election Map, county data pages, and Pro dashboard.</p>

        <p style={s.p}>We believe farmers own their data. Our practices are aligned with the <span style={s.strong}>Ag Data Transparent</span> core principles established by the American Farm Bureau Federation and National Farmers Union. We will never sell your farm data to third parties.</p>

        {/* ── Section 1 ── */}
        <h2 style={s.h2}>1. Information We Collect</h2>

        <h3 style={s.h3}>Free Calculator &amp; Public Tools</h3>
        <p style={s.p}><span style={s.strong}>Calculator Inputs:</span> When you use our free ARC/PLC calculator at /check, you select your state, county, crop type, and enter base acres. These inputs are processed in your browser to generate payment estimates. Calculator inputs from the free tool are <span style={s.strong}>not stored on our servers</span> unless you explicitly choose to save your results or create an account.</p>
        <p style={s.p}><span style={s.strong}>Election Benchmarks:</span> If you share your ARC/PLC election choice through our anonymous benchmarking feature, we store your county FIPS code, commodity, and election choice (ARC-CO or PLC). We do <span style={s.strong}>not</span> store your name, farm name, or any personally identifiable information with benchmark submissions. Only aggregated county-level totals are displayed publicly, and individual submissions cannot be traced back to any user.</p>

        <h3 style={s.h3}>Account &amp; Dashboard (Pro Users)</h3>
        <p style={s.p}><span style={s.strong}>Account Information:</span> When you create a HarvestFile account, we collect your name, email address, and authentication credentials. If you sign in via Google OAuth, we receive your name and email from Google — we do not receive your Google password.</p>
        <p style={s.p}><span style={s.strong}>Organization &amp; Farm Data:</span> Pro dashboard users may enter farm operation information including: organization name, farmer names, county locations, crop types, base acres, PLC payment yields, and crop-specific program elections. This data is stored in our secure database to power your dashboard analytics, payment projections, and reports.</p>
        <p style={s.p}><span style={s.strong}>Billing Information:</span> Subscription payments are processed by Stripe, Inc. We do not store your credit card number, CVV, or full payment details on our servers. Stripe handles all payment data in compliance with PCI DSS Level 1 standards. We receive and store only your Stripe customer ID, subscription status, and transaction history (amounts, dates, plan type).</p>

        <h3 style={s.h3}>Automatically Collected Information</h3>
        <p style={s.p}><span style={s.strong}>Analytics:</span> We use Vercel Analytics, a privacy-focused, cookieless analytics service, to collect anonymous usage data including page views, visitor counts, and general geographic region. This data does not identify you personally.</p>
        <p style={s.p}><span style={s.strong}>Price Alerts:</span> If you set up commodity price alerts, we store your email address, selected commodities, and alert thresholds to send you notifications when prices change.</p>

        {/* ── Section 2 ── */}
        <h2 style={s.h2}>2. USDA Government Data</h2>
        <p style={s.p}>HarvestFile uses publicly available data from the United States Department of Agriculture (USDA), including data from the National Agricultural Statistics Service (NASS) Quick Stats API and Farm Service Agency (FSA) published datasets. This government data is in the public domain.</p>
        <p style={s.p}><span style={s.strong}>HarvestFile is not affiliated with, endorsed by, or connected to the USDA, FSA, NASS, or any other government agency.</span> Our use of government data does not imply government endorsement of HarvestFile or its services.</p>

        {/* ── Section 3 ── */}
        <h2 style={s.h2}>3. How We Use Your Information</h2>
        <p style={s.p}>We use the information we collect to:</p>
        <div style={{ paddingLeft: 16, marginBottom: 14 }}>
          <p style={s.li}>• Generate ARC/PLC payment estimates and farm program analysis</p>
          <p style={s.li}>• Power your Pro dashboard with farm management tools</p>
          <p style={s.li}>• Generate AI-powered farm intelligence reports using anonymized, aggregated data context</p>
          <p style={s.li}>• Send price alerts and trial/subscription email notifications</p>
          <p style={s.li}>• Display anonymous, aggregated county-level election benchmarks</p>
          <p style={s.li}>• Improve our calculator accuracy and product features</p>
          <p style={s.li}>• Process subscription payments through Stripe</p>
        </div>
        <p style={s.p}>We do <span style={s.strong}>not</span> use your individual farm data for advertising, marketing to third parties, or any purpose unrelated to providing HarvestFile&apos;s services to you.</p>

        {/* ── Section 4 ── */}
        <h2 style={s.h2}>4. Data Sharing &amp; Third Parties</h2>
        <p style={s.p}><span style={s.strong}>We do not sell, rent, or trade your personal information or farm data to any third party.</span> This includes advertisers, data brokers, agricultural input companies, commodity traders, insurance companies, and any other commercial entity.</p>
        <p style={s.p}>We share data only with the following service providers who process data on our behalf under contractual obligations:</p>
        <div style={{ paddingLeft: 16, marginBottom: 14 }}>
          <p style={s.li}>• <span style={s.strong}>Supabase</span> — database hosting and authentication (your farm data is stored here)</p>
          <p style={s.li}>• <span style={s.strong}>Stripe</span> — payment processing (receives only billing data)</p>
          <p style={s.li}>• <span style={s.strong}>Vercel</span> — website hosting and anonymous analytics</p>
          <p style={s.li}>• <span style={s.strong}>Resend</span> — transactional email delivery (receives only email addresses and notification content)</p>
          <p style={s.li}>• <span style={s.strong}>Anthropic (Claude AI)</span> — report generation (receives anonymized, aggregated county-level data context only — never your name, farm name, or personally identifiable information)</p>
        </div>
        <p style={s.p}>We may disclose information if required by law, court order, or government regulation.</p>

        {/* ── Section 5 ── */}
        <h2 style={s.h2}>5. Data Security</h2>
        <p style={s.p}>We implement industry-standard security measures to protect your information:</p>
        <div style={{ paddingLeft: 16, marginBottom: 14 }}>
          <p style={s.li}>• All data transmitted between your browser and our servers is encrypted via TLS/HTTPS</p>
          <p style={s.li}>• Database access is restricted through Row Level Security (RLS) policies — users can only access data belonging to their organization</p>
          <p style={s.li}>• Authentication is handled through Supabase Auth with secure token management</p>
          <p style={s.li}>• Payment data is processed by Stripe under PCI DSS Level 1 compliance</p>
          <p style={s.li}>• API keys and secrets are stored as environment variables and never exposed in client-side code</p>
        </div>
        <p style={s.p}>No system is 100% secure. While we take reasonable precautions, we cannot guarantee absolute security of your data.</p>

        {/* ── Section 6 ── */}
        <h2 style={s.h2}>6. Your Rights &amp; Data Control</h2>
        <p style={s.p}>You have the following rights regarding your data:</p>
        <div style={{ paddingLeft: 16, marginBottom: 14 }}>
          <p style={s.li}>• <span style={s.strong}>Access:</span> You can view all farm data stored in your account through the dashboard at any time.</p>
          <p style={s.li}>• <span style={s.strong}>Correction:</span> You can edit or update your farm data, farmer records, and crop information through the dashboard.</p>
          <p style={s.li}>• <span style={s.strong}>Deletion:</span> You may request complete deletion of your account and all associated farm data by emailing <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", textDecoration: "none", fontWeight: 600 }}>hello@harvestfile.com</a>. We will process deletion requests within 30 days and confirm deletion in writing.</p>
          <p style={s.li}>• <span style={s.strong}>Portability:</span> You may request an export of your farm data in a standard machine-readable format (CSV/JSON) by contacting us.</p>
          <p style={s.li}>• <span style={s.strong}>Opt-out:</span> You can unsubscribe from marketing emails and price alerts at any time using the unsubscribe link in any email.</p>
        </div>

        {/* ── Section 7 ── */}
        <h2 style={s.h2}>7. Data Retention</h2>
        <p style={s.p}>We retain your account and farm data for as long as your account is active. If you cancel your subscription, your data remains accessible in read-only mode for 90 days, after which it may be deleted. If you request account deletion, all personal and farm data is permanently removed within 30 days. Anonymous, aggregated benchmark data (county-level election totals) is retained indefinitely as it cannot be linked to any individual.</p>

        {/* ── Section 8 ── */}
        <h2 style={s.h2}>8. Cookies &amp; Tracking</h2>
        <p style={s.p}>HarvestFile uses minimal cookies. We use only essential cookies required for authentication (session tokens) and do not use advertising cookies, tracking pixels, or third-party marketing cookies. Vercel Analytics operates without cookies entirely.</p>

        {/* ── Section 9 ── */}
        <h2 style={s.h2}>9. Children&apos;s Privacy</h2>
        <p style={s.p}>HarvestFile is designed for use by adult farmers and agricultural professionals. We do not knowingly collect information from children under 13. If we learn that we have collected information from a child under 13, we will delete it promptly.</p>

        {/* ── Section 10 ── */}
        <h2 style={s.h2}>10. State Privacy Laws</h2>
        <p style={s.p}>If you are a resident of California, Virginia, Colorado, Connecticut, or another state with comprehensive privacy legislation, you may have additional rights under your state&apos;s consumer privacy law, including the right to know what data we collect, the right to delete your data, and the right to opt out of the sale of personal information. As stated above, we do not sell personal information. To exercise your rights, contact us at hello@harvestfile.com.</p>

        {/* ── Section 11 ── */}
        <h2 style={s.h2}>11. Changes to This Policy</h2>
        <p style={s.p}>We may update this Privacy Policy from time to time. Material changes will be communicated via email to registered users and posted on this page with an updated revision date. Continued use of HarvestFile after changes constitutes acceptance of the updated policy.</p>

        {/* ── Section 12 ── */}
        <h2 style={s.h2}>12. Contact</h2>
        <p style={s.p}>Questions or concerns about this Privacy Policy or your data? Contact us at:</p>
        <p style={s.p}>
          <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", textDecoration: "none", fontWeight: 600 }}>hello@harvestfile.com</a>
          <br />HarvestFile LLC
          <br />Ohio, United States
        </p>
      </div>
    </PageShell>
  );
}
