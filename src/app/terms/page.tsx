import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — HarvestFile",
  description:
    "HarvestFile terms of service — important disclaimers about USDA program estimates and eligibility.",
};

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted mb-8">Last updated: March 2026</p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Acceptance of Terms
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        By accessing and using HarvestFile (&ldquo;the Service&rdquo;), you
        agree to be bound by these Terms of Service. If you do not agree, please
        do not use the Service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Service Description
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        HarvestFile provides estimated USDA program eligibility information and
        approximate payment calculations based on information you provide. The
        Service is designed to help farmers identify programs they may qualify
        for, but it is not a substitute for official USDA determinations.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Disclaimer of Accuracy
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        IMPORTANT: HarvestFile provides ESTIMATES ONLY. We are not affiliated
        with the United States Department of Agriculture (USDA), Farm Service
        Agency (FSA), Natural Resources Conservation Service (NRCS), or Risk
        Management Agency (RMA). All eligibility determinations are made solely
        by USDA and its agencies. Program rules, payment rates, and deadlines
        may change without notice. You must verify all information with your
        local FSA or NRCS office before making any decisions based on our
        estimates.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Not Professional Advice
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        HarvestFile does not provide legal, financial, tax, or accounting
        advice. We are not attorneys, certified public accountants, or licensed
        financial advisors. Our program estimates should not be relied upon as
        the sole basis for any farm business decision.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Limitation of Liability
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        To the maximum extent permitted by law, HarvestFile LLC&rsquo;s
        liability is limited to the fees you have paid for the Service. For the
        free eligibility screener, this amount is $0. We shall not be liable for
        any indirect, incidental, special, or consequential damages arising from
        your use of the Service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        User Responsibilities
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        You agree to provide accurate information when using the screener. You
        understand that inaccurate input will produce inaccurate results. You
        are responsible for verifying all program eligibility with official USDA
        offices.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        Intellectual Property
      </h2>
      <p className="text-muted leading-relaxed mb-4">
        All content, design, and software of HarvestFile are the property of
        HarvestFile LLC. You may not reproduce, distribute, or create derivative
        works without our written permission.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Governing Law</h2>
      <p className="text-muted leading-relaxed mb-4">
        These Terms are governed by the laws of the State of Ohio. Any disputes
        shall be resolved in the courts of Summit County, Ohio.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
      <p className="text-muted leading-relaxed mb-4">
        Questions about these terms? Contact us at hello@harvestfile.com or
        write to: HarvestFile LLC, Tallmadge, Ohio.
      </p>
    </div>
  );
}
