export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="text-gray-400 mt-1">
          Portfolio-wide insights and program performance metrics.
        </p>
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-16 text-center">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-lg font-semibold text-white">Analytics coming in Phase D</h3>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">
          Track ARC vs PLC performance across your entire portfolio, county-level trends, and historical payment analysis.
        </p>
      </div>
    </div>
  );
}
