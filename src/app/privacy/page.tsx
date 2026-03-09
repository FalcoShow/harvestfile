import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — HarvestFile",
  description:
    "HarvestFile privacy policy — how we collect, use, and protect your farm operation data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted mb-8">Last updated: March 2026</p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Information We Collect
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        We collect information you voluntarily provide through our eligibility
        screener, including: your name, email address, farm location (state and
        county), farm operation details (acreage, crops, conservation
        practices), and current program participation. We also collect standard
        analytics data through PostHog, including page views, device type, and
        interaction patterns.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        How We Use Your Information
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        We use your information to: provide personalized USDA program
        recommendations, send deadline reminders and program updates (if you opt
        in), improve our eligibility matching engine, and communicate with you
        about HarvestFile services.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Data Sharing</h2>
      <p className="text-muted leading-relaxed mb-4">
        We do NOT sell, rent, or share your personal information with third
        parties. Your farm operation data is used solely to generate program
        recommendations. We may share anonymized, aggregated statistics for
        research purposes.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Data Security</h2>
      <p className="text-muted leading-relaxed mb-4">
        We implement industry-standard security measures to protect your data.
        However, no method of electronic transmission or storage is 100% secure.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Your Rights</h2>
      <p className="text-muted leading-relaxed mb-4">
        You may request access to, correction of, or deletion of your personal
        data at any time by emailing hello@harvestfile.com. You may unsubscribe
        from communications at any time using the link in any email.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Analytics</h2>
      <p className="text-muted leading-relaxed mb-4">
        We use PostHog for product analytics to understand how farmers use our
        tool and improve the experience. PostHog may collect cookies and usage
        data. You can opt out through your browser settings.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Changes to This Policy
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        We may update this policy from time to time. We will notify you of
        significant changes via email or a notice on our website.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Contact Us</h2>
      <p className="text-muted leading-relaxed mb-4">
        If you have questions about this privacy policy, contact us at
        hello@harvestfile.com or write to: HarvestFile LLC, Tallmadge, Ohio.
      </p>
    </div>
  );
}
