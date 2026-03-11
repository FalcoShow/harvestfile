import Link from "next/link";

export default function FarmersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Farmers</h2>
          <p className="text-gray-400 mt-1">
            Manage your farmer portfolio and crop allocations.
          </p>
        </div>
        <Link
          href="/dashboard/farmers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-all active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Farmer
        </Link>
      </div>

      {/* Empty state */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-16 text-center">
        <div className="text-4xl mb-4">🌾</div>
        <h3 className="text-lg font-semibold text-white">No farmers yet</h3>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">
          Add your first farmer to start building their crop portfolio and running ARC/PLC calculations.
        </p>
        <Link
          href="/dashboard/farmers/new"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-all"
        >
          Add your first farmer
        </Link>
      </div>
    </div>
  );
}
