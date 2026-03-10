import PageShell from "../../components/PageShell";

export const metadata = {
  title: "Terms of Service — HarvestFile",
  description: "Terms of Service for HarvestFile's ARC/PLC calculator and farm program tools.",
};

const s = { h2: { fontSize: 20, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 10, marginTop: 36 }, p: { fontSize: 14.5, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 }, strong: { color: "#1B4332", fontWeight: 600 } };

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: March 10, 2026">
      <div style={{ fontSize: 14.5, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>These Terms of Service (&quot;Terms&quot;) govern your use of harvestfile.com and all tools and services provided by HarvestFile LLC (&quot;HarvestFile,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By using our website, you agree to these Terms.</p>

        <h2 style={s.h2}>1. Service Description</h2>
        <p style={s.p}>HarvestFile provides a free, web-based ARC/PLC Decision Calculator that estimates potential payments under USDA&apos;s Agriculture Risk Coverage (ARC-CO) and Price Loss Coverage (PLC) programs. Our calculator uses publicly available data from the USDA National Agricultural Statistics Service (NASS) and applies program formulas based on current Farm Service Agency (FSA) rules.</p>

        <h2 style={s.h2}>2. Estimates, Not Guarantees</h2>
        <p style={s.p}><span style={s.strong}>All calculations provided by HarvestFile are estimates only.</span> Actual ARC-CO and PLC payments are determined solely by the USDA Farm Service Agency and may differ from our estimates due to final Marketing Year Average (MYA) prices, RMA-adjusted yield data, trend-adjustment factors, farm-specific PLC payment yields, sequestration adjustments, and other factors we cannot fully account for.</p>
        <p style={s.p}>HarvestFile does not guarantee the accuracy of any calculation and is not responsible for financial decisions made based on our estimates. Always consult your local FSA office for official payment calculations and program enrollment decisions.</p>

        <h2 style={s.h2}>3. Not Financial or Legal Advice</h2>
        <p style={s.p}>HarvestFile provides informational tools only. Nothing on this website constitutes financial advice, legal advice, tax advice, or a recommendation to enroll in any specific USDA program. We are not a licensed financial advisor, attorney, or government agency. Consult qualified professionals for decisions specific to your farm operation.</p>

        <h2 style={s.h2}>4. Data Sources & Accuracy</h2>
        <p style={s.p}>Our data comes from publicly available USDA sources including the NASS Quick Stats API and FSA program documentation. While we strive for accuracy, we cannot guarantee that USDA data sources are error-free or that our formulas perfectly replicate FSA&apos;s internal calculations. Data may be delayed, incomplete, or subject to revision by USDA.</p>

        <h2 style={s.h2}>5. Acceptable Use</h2>
        <p style={s.p}>You agree to use HarvestFile for lawful purposes only. You may not attempt to access our systems without authorization, reverse-engineer our calculator, use automated tools to scrape data, or misrepresent HarvestFile&apos;s estimates as official USDA calculations.</p>

        <h2 style={s.h2}>6. Intellectual Property</h2>
        <p style={s.p}>The HarvestFile name, logo, website design, and calculator code are the property of HarvestFile LLC. USDA data used in our calculations is public domain. You may share calculator results freely but may not reproduce or redistribute our website or tools.</p>

        <h2 style={s.h2}>7. Limitation of Liability</h2>
        <p style={s.p}>To the maximum extent permitted by law, HarvestFile LLC, its founder, employees, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of our tools or reliance on our estimates. This includes, without limitation, any financial losses resulting from program enrollment decisions made based on our calculator results.</p>

        <h2 style={s.h2}>8. Disclaimer of Warranties</h2>
        <p style={s.p}>HarvestFile is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

        <h2 style={s.h2}>9. Government Affiliation Disclaimer</h2>
        <p style={s.p}>HarvestFile is not affiliated with, endorsed by, or connected to the United States Department of Agriculture (USDA), Farm Service Agency (FSA), National Agricultural Statistics Service (NASS), or any other government agency. Our use of USDA data is pursuant to the NASS API terms of service.</p>

        <h2 style={s.h2}>10. Modifications</h2>
        <p style={s.p}>We reserve the right to modify these Terms at any time. Changes become effective upon posting to this page. Continued use of HarvestFile after changes constitutes acceptance.</p>

        <h2 style={s.h2}>11. Governing Law</h2>
        <p style={s.p}>These Terms are governed by the laws of the State of Ohio, United States.</p>

        <h2 style={s.h2}>12. Contact</h2>
        <p style={s.p}>Questions about these Terms? Contact us at <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", textDecoration: "none", fontWeight: 600 }}>hello@harvestfile.com</a>.</p>
      </div>
    </PageShell>
  );
}
