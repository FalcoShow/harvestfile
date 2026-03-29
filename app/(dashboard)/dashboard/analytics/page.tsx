import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="text-gray-400 mt-1">
          Portfolio-wide insights and program performance metrics.
        </p>
      </div>

      {/* Overview cards with real value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/markets"
          className="group rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 p-6 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
              Market Trends
            </h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Track commodity prices against OBBBA reference prices. See MYA
            projections and PLC payment estimates updated with live futures data.
          </p>
          <div className="mt-4 text-sm text-emerald-400 font-medium">
            View Markets →
          </div>
        </Link>

        <Link
          href="/dashboard/insurance"
          className="group rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 p-6 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
              Coverage Optimizer
            </h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Compare RP + SCO + ECO stacking strategies with ARC-CO and PLC. Run
            Monte Carlo simulations across 10,000 price and yield scenarios.
          </p>
          <div className="mt-4 text-sm text-amber-400 font-medium">
            Optimize Coverage →
          </div>
        </Link>

        <Link
          href="/dashboard/intelligence"
          className="group rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 p-6 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
              AI Intelligence Reports
            </h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Generate AI-powered market intelligence, weather impact analysis,
            program optimization reports, and seasonal advisory briefings.
          </p>
          <div className="mt-4 text-sm text-purple-400 font-medium">
            Generate Report →
          </div>
        </Link>

        <Link
          href="/dashboard/payments"
          className="group rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 p-6 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
              Payment Hunter
            </h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Scan every active USDA program to find payments you may be eligible for.
            Over $44 billion flows to American farmers annually.
          </p>
          <div className="mt-4 text-sm text-green-400 font-medium">
            Find Payments →
          </div>
        </Link>
      </div>

      {/* Portfolio analytics teaser */}
      <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">
              Portfolio Analytics Coming Soon
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Cross-farm ARC vs PLC performance tracking, county-level trend analysis,
              and historical payment comparisons are being built. Add your farmers and
              run calculations now — your data will power these insights when they launch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
