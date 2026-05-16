import Link from 'next/link';

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">ARC/PLC Calculator</h2>
        <p className="text-gray-400 mt-1">
          Run program payment calculations with real USDA county yield data.
        </p>
      </div>

      {/* Hero card linking to the full calculator */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-8">
        <div className="max-w-2xl">
          <h3 className="text-xl font-semibold text-white mb-3">
            Compare ARC-CO vs PLC for Your County
          </h3>
          <p className="text-gray-300 mb-6 leading-relaxed">
            See which program pays you more using real USDA data and live commodity
            prices. Personalize with your county, crops, and base acres — no signup
            required.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/check"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Open ARC/PLC Calculator
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-lg border border-white/[0.08] transition-colors"
            >
              View Live Markets
            </Link>
          </div>
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="text-sm text-emerald-400 font-medium mb-1">Free Tool</div>
          <div className="text-white font-semibold">No Account Required</div>
          <p className="text-gray-500 text-sm mt-1">
            Run unlimited calculations for any county
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="text-sm text-emerald-400 font-medium mb-1">OBBBA Updated</div>
          <div className="text-white font-semibold">2025 Farm Bill Rules</div>
          <p className="text-gray-500 text-sm mt-1">
            90% ARC guarantee, 12% payment cap, new reference prices
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="text-sm text-emerald-400 font-medium mb-1">Live Data</div>
          <div className="text-white font-semibold">Real-Time Estimates</div>
          <p className="text-gray-500 text-sm mt-1">
            Payment projections update with CME futures prices
          </p>
        </div>
      </div>
    </div>
  );
}
