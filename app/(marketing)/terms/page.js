import PageShell from "@/components/PageShell";

export const metadata = {
  title: "Terms of Service — HarvestFile",
  description: "Terms of Service for HarvestFile's ARC/PLC calculator, election map, and farm program decision tools.",
};

const s = {
  h2: { fontSize: 20, fontWeight: 800, color: "#1B4332", letterSpacing: "-0.02em", marginBottom: 10, marginTop: 36 },
  p: { fontSize: 14.5, color: "#6B7280", lineHeight: 1.75, marginBottom: 14 },
  strong: { color: "#1B4332", fontWeight: 600 },
  li: { fontSize: 14.5, color: "#6B7280", lineHeight: 1.75, marginBottom: 6, paddingLeft: 4 },
  caps: { fontSize: 14.5, color: "#1B4332", lineHeight: 1.75, marginBottom: 14, fontWeight: 600 },
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: March 16, 2026">
      <div style={{ fontSize: 14.5, color: "#6B7280", lineHeight: 1.75 }}>

        <p style={s.p}>These Terms of Service (&quot;Terms&quot;) govern your use of harvestfile.com and all tools, calculators, data visualizations, and services provided by HarvestFile LLC (&quot;HarvestFile,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By using our website, you agree to these Terms.</p>

        {/* ── 1 ── */}
        <h2 style={s.h2}>1. Service Description</h2>
        <p style={s.p}>HarvestFile provides web-based farm program decision tools including: a free ARC/PLC Decision Calculator, an interactive county-level Election Map, county-specific ARC/PLC data pages, a multi-year scenario modeler, and a Pro subscription dashboard for agricultural professionals. Our tools estimate potential payments under USDA&apos;s Agriculture Risk Coverage (ARC-CO, ARC-IC) and Price Loss Coverage (PLC) programs as updated by the One Big Beautiful Bill Act (OBBBA, Pub. L. 119-21, signed July 4, 2025).</p>
        <p style={s.p}>Our calculator uses publicly available data from the USDA National Agricultural Statistics Service (NASS) Quick Stats API and applies program formulas based on current Farm Service Agency (FSA) rules for the 2025–2031 program years.</p>

        {/* ── 2 ── */}
        <h2 style={s.h2}>2. Estimates, Not Guarantees</h2>
        <p style={s.p}><span style={s.strong}>All calculations, projections, and payment estimates provided by HarvestFile are estimates only and should be viewed as guides to potential payments, not predictions of actual payments.</span></p>
        <p style={s.p}>Actual ARC-CO and PLC payments are determined solely by the USDA Farm Service Agency based on final data and may differ significantly from our estimates due to:</p>
        <div style={{ paddingLeft: 16, marginBottom: 14 }}>
          <p style={s.li}>• Final Marketing Year Average (MYA) prices (not known until after marketing year ends)</p>
          <p style={s.li}>• Official FSA county yields (which may differ from NASS survey estimates)</p>
          <p style={s.li}>• Trend-adjustment factors applied by FSA</p>
          <p style={s.li}>• Farm-specific PLC payment yields and base acre allocations</p>
          <p style={s.li}>• Sequestration adjustments set by the Office of Management and Budget</p>
          <p style={s.li}>• Payment limitation calculations based on your specific entity structure</p>
          <p style={s.li}>• New base acre allocations under OBBBA (up to 30 million additional acres)</p>
          <p style={s.li}>• The 2025 &quot;automatic higher-of&quot; ARC/PLC provision (one-year special rule)</p>
          <p style={s.li}>• Other factors we cannot fully account for</p>
        </div>
        <p style={s.p}>HarvestFile does not guarantee the accuracy of any calculation and is not responsible for financial decisions made based on our estimates. <span style={s.strong}>Always consult your local FSA office for official payment calculations and enrollment decisions.</span></p>

        {/* ── 3 ── */}
        <h2 style={s.h2}>3. Not Financial, Legal, or Agricultural Advice</h2>
        <p style={s.p}>HarvestFile is an educational decision-support tool. Nothing on this website constitutes financial advice, legal advice, tax advice, crop insurance guidance, or a recommendation to enroll in any specific USDA program. We are not a licensed financial advisor, attorney, certified crop advisor, crop insurance agent, or government agency.</p>
        <p style={s.p}>Your ARC/PLC election is a complex decision that may interact with crop insurance (SCO, ECO), marketing contracts, entity structure, and tax planning. Consult your local FSA office, crop insurance agent, farm management advisor, and/or tax professional for decisions specific to your operation.</p>

        {/* ── 4 ── */}
        <h2 style={s.h2}>4. Data Sources &amp; Accuracy</h2>
        <p style={s.p}>Our data comes from publicly available USDA sources including the NASS Quick Stats API, FSA program data publications, and USDA Economic Research Service (ERS) baseline projections. While we strive for accuracy and update our data regularly, we cannot guarantee that:</p>
        <div style={{ paddingLeft: 16, marginBottom: 14 }}>
          <p style={s.li}>• USDA data sources are error-free or current</p>
          <p style={s.li}>• Our formulas perfectly replicate FSA&apos;s internal calculation methods</p>
          <p style={s.li}>• Price projections from WASDE or ERS baselines will match actual market prices</p>
          <p style={s.li}>• County yield data has been fully updated for the most recent crop year</p>
          <p style={s.li}>• OBBBA rule interpretations match final FSA implementation guidance</p>
        </div>
        <p style={s.p}>Data displayed on HarvestFile may be delayed, incomplete, or subject to revision by USDA at any time. We display &quot;data as of&quot; dates where applicable and update our underlying data when USDA publishes new information.</p>

        {/* ── 5 ── */}
        <h2 style={s.h2}>5. Subscription &amp; Billing Terms</h2>
        <p style={s.p}>HarvestFile Pro is available as a monthly ($29/month) or annual ($278/year) subscription. All new subscriptions include a 14-day free trial. You will not be charged during the trial period. If you do not cancel before the trial ends, your payment method will be charged automatically.</p>
        <p style={s.p}>Subscriptions renew automatically until cancelled. You may cancel at any time through the account settings page or by contacting us. Cancellation takes effect at the end of the current billing period — you retain access until then. We do not provide refunds for partial billing periods.</p>

        {/* ── 6 ── */}
        <h2 style={s.h2}>6. Your Farm Data</h2>
        <p style={s.p}><span style={s.strong}>You own your farm data.</span> Any farm operation information, farmer records, crop data, acreage, and program elections you enter into the HarvestFile dashboard remain your property. We do not claim ownership of your farm data and will not use it for purposes unrelated to providing HarvestFile&apos;s services to you.</p>
        <p style={s.p}>You may request an export of your farm data or deletion of your account at any time. See our Privacy Policy for details on data handling, retention, and deletion.</p>

        {/* ── 7 ── */}
        <h2 style={s.h2}>7. Anonymous Benchmarking</h2>
        <p style={s.p}>HarvestFile&apos;s election benchmarking feature allows users to anonymously share their ARC/PLC election choices. By submitting an election benchmark, you agree that your anonymized election choice (county, commodity, and ARC-CO or PLC selection) may be aggregated with other submissions and displayed as county-level totals. Individual submissions are never displayed or identifiable. A minimum threshold of submissions is required before any county data becomes visible.</p>

        {/* ── 8 ── */}
        <h2 style={s.h2}>8. Acceptable Use</h2>
        <p style={s.p}>You agree to use HarvestFile for lawful purposes only. You may not: attempt to access our systems without authorization, reverse-engineer our calculator algorithms, use automated tools to scrape data at scale, misrepresent HarvestFile&apos;s estimates as official USDA or FSA calculations, or submit false election benchmark data.</p>

        {/* ── 9 ── */}
        <h2 style={s.h2}>9. Intellectual Property</h2>
        <p style={s.p}>The HarvestFile name, logo, website design, calculator code, visualization tools, and election map are the property of HarvestFile LLC. USDA data used in our calculations is public domain. You may share calculator results, county page links, and election map screenshots freely, but may not reproduce or redistribute our website code, tools, or proprietary algorithms.</p>

        {/* ── 10 ── */}
        <h2 style={s.h2}>10. Limitation of Liability</h2>
        <p style={s.caps}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, HARVESTFILE LLC, ITS FOUNDER, EMPLOYEES, CONTRACTORS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OUR TOOLS OR RELIANCE ON OUR ESTIMATES.</p>
        <p style={s.caps}>THIS INCLUDES, WITHOUT LIMITATION: (A) ANY FINANCIAL LOSSES RESULTING FROM ARC/PLC PROGRAM ENROLLMENT DECISIONS MADE BASED ON OUR CALCULATOR RESULTS OR DATA; (B) LOST FARM PROGRAM PAYMENTS DUE TO MISSED DEADLINES, INCORRECT ELECTIONS, OR INACCURATE ESTIMATES; (C) ANY LOSSES ARISING FROM USDA DATA ERRORS, DELAYS, OR REVISIONS; AND (D) ANY DAMAGES RESULTING FROM SERVICE INTERRUPTIONS OR DATA LOSS.</p>
        <p style={s.p}>In no event shall HarvestFile&apos;s total aggregate liability to you exceed the total amount you have paid to HarvestFile in subscription fees during the twelve (12) months immediately preceding the event giving rise to the claim, or one hundred dollars ($100), whichever is greater.</p>

        {/* ── 11 ── */}
        <h2 style={s.h2}>11. Disclaimer of Warranties</h2>
        <p style={s.caps}>HARVESTFILE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT OUR PAYMENT ESTIMATES WILL MATCH ACTUAL FSA PAYMENTS, THAT OUR DATA IS ERROR-FREE, OR THAT THE SERVICE WILL BE UNINTERRUPTED.</p>

        {/* ── 12 ── */}
        <h2 style={s.h2}>12. Government Affiliation Disclaimer</h2>
        <p style={s.p}><span style={s.strong}>HarvestFile is not affiliated with, endorsed by, or connected to the United States Department of Agriculture (USDA), Farm Service Agency (FSA), National Agricultural Statistics Service (NASS), Risk Management Agency (RMA), or any other federal, state, or local government agency.</span></p>
        <p style={s.p}>Our use of publicly available USDA data is pursuant to the NASS Quick Stats API terms of service and federal open data policies. The presence of USDA-sourced data on our platform does not imply government endorsement, certification, or approval of HarvestFile or its services.</p>

        {/* ── 13 ── */}
        <h2 style={s.h2}>13. Indemnification</h2>
        <p style={s.p}>You agree to indemnify and hold harmless HarvestFile LLC from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your use of our services, violation of these Terms, or your reliance on our estimates for farm program enrollment decisions.</p>

        {/* ── 14 ── */}
        <h2 style={s.h2}>14. Modifications</h2>
        <p style={s.p}>We reserve the right to modify these Terms at any time. Material changes will be communicated via email to registered users. Changes become effective upon posting to this page. Continued use of HarvestFile after changes constitutes acceptance.</p>

        {/* ── 15 ── */}
        <h2 style={s.h2}>15. Governing Law &amp; Disputes</h2>
        <p style={s.p}>These Terms are governed by the laws of the State of Ohio, United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of HarvestFile shall be resolved in the state or federal courts located in Ohio.</p>

        {/* ── 16 ── */}
        <h2 style={s.h2}>16. Contact</h2>
        <p style={s.p}>Questions about these Terms? Contact us at:</p>
        <p style={s.p}>
          <a href="mailto:hello@harvestfile.com" style={{ color: "#C9A84C", textDecoration: "none", fontWeight: 600 }}>hello@harvestfile.com</a>
          <br />HarvestFile LLC
          <br />Ohio, United States
        </p>
      </div>
    </PageShell>
  );
}
