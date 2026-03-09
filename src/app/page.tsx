import Link from "next/link";
import DeadlineBanner from "@/components/DeadlineBanner";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-tight">
            Stop Leaving Money on the Table
          </h1>
          <p className="text-lg md:text-xl text-muted mt-6 max-w-2xl mx-auto">
            The average Midwest farm qualifies for $10,000–$40,000/year in USDA
            programs. Most never apply. HarvestFile finds every dollar you're
            owed in under 5 minutes.
          </p>
          <Link
            href="/screener"
            className="inline-block bg-primary text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-primary-light transition mt-8"
          >
            Find My Programs — It's Free
          </Link>
          <p className="text-sm text-muted mt-4">
            No login required. No credit card. Just answers.
          </p>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-primary/5">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-12 text-center">
            <span className="text-sm md:text-base text-primary font-medium">
              ✓ Covering 15+ USDA programs across all 50 states
            </span>
            <span className="text-sm md:text-base text-primary font-medium">
              ✓ Updated for the One Big Beautiful Bill Act (2025)
            </span>
            <span className="text-sm md:text-base text-primary font-medium">
              ✓ Built by farmers, for farmers
            </span>
          </div>
        </div>
      </section>

      {/* Program Overview Cards */}
      <section id="programs" className="bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            Programs You Might Be Missing
          </h2>
          <p className="text-muted text-center mb-12">
            These are the biggest USDA programs available to row crop farmers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ARC/PLC */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">ARC/PLC</h3>
                <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                  FSA
                </span>
              </div>
              <p className="text-accent font-bold text-xl mt-2">
                Up to $164,000/year
              </p>
              <p className="text-muted text-sm mt-2">
                Revenue loss and price decline safety net payments on eligible
                base acres
              </p>
            </div>

            {/* EQIP */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">EQIP</h3>
                <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                  NRCS
                </span>
              </div>
              <p className="text-accent font-bold text-xl mt-2">
                Up to 90% cost-share
              </p>
              <p className="text-muted text-sm mt-2">
                Financial assistance for conservation projects — cover crops,
                no-till, waterways, and more
              </p>
            </div>

            {/* CRP */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">CRP</h3>
                <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                  FSA
                </span>
              </div>
              <p className="text-accent font-bold text-xl mt-2">
                Up to $254/acre per year
              </p>
              <p className="text-muted text-sm mt-2">
                Annual rental payments for retiring environmentally sensitive
                cropland from production
              </p>
            </div>

            {/* Crop Insurance */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">Crop Insurance</h3>
                <div className="flex items-center gap-1.5">
                  <span className="bg-accent/20 text-accent text-xs font-bold px-1.5 py-0.5 rounded">
                    NEW
                  </span>
                  <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                    RMA
                  </span>
                </div>
              </div>
              <p className="text-accent font-bold text-xl mt-2">
                Save 3–5% on premiums
              </p>
              <p className="text-muted text-sm mt-2">
                New OBBBA subsidies and expanded SCO/ECO endorsement coverage at
                80% subsidy
              </p>
            </div>

            {/* Farmer Bridge Assistance */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">Farmer Bridge Assistance</h3>
                <div className="flex items-center gap-1.5">
                  <span className="bg-accent/20 text-accent text-xs font-bold px-1.5 py-0.5 rounded">
                    NEW
                  </span>
                  <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                    FSA
                  </span>
                </div>
              </div>
              <p className="text-accent font-bold text-xl mt-2">
                $44.36/acre corn, $30.88/acre soy
              </p>
              <p className="text-muted text-sm mt-2">
                One-time assistance for 2025 commodity producers — enrollment
                closes April 17
              </p>
            </div>

            {/* CSP */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">CSP</h3>
                <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                  NRCS
                </span>
              </div>
              <p className="text-accent font-bold text-xl mt-2">
                $4,000–$50,000/year
              </p>
              <p className="text-muted text-sm mt-2">
                Rewards for conservation stewardship — get paid for practices
                you're already doing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mt-4">
                Answer 10 Simple Questions
              </h3>
              <p className="text-muted text-sm mt-2">
                Tell us about your operation — crops, acreage, and current
                programs. Takes under 5 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mt-4">
                We Match You to Programs
              </h3>
              <p className="text-muted text-sm mt-2">
                Our engine compares your farm profile against every major USDA
                program's eligibility rules.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mt-4">
                See Your Estimated Value
              </h3>
              <p className="text-muted text-sm mt-2">
                Get your personalized report with estimated annual value and
                upcoming deadlines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency/Deadline Banner */}
      <DeadlineBanner />

      {/* Final CTA Section */}
      <section className="bg-primary">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">
            Don't Leave Money on the Table
          </h2>
          <p className="text-white/80 mt-4">
            Join thousands of farmers who discovered programs they didn't know
            they qualified for.
          </p>
          <Link
            href="/screener"
            className="inline-block bg-accent text-primary text-lg font-bold px-8 py-4 rounded-xl hover:bg-accent/90 transition mt-8"
          >
            Check My Eligibility — Free
          </Link>
        </div>
      </section>
    </>
  );
}
