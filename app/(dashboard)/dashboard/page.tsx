import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get the professional's org_id
  const { data: professional } = await supabase
    .from("professionals")
    .select("org_id, full_name")
    .eq("auth_user_id", user!.id)
    .single();

  const orgId = professional?.org_id;

  // Fetch dashboard stats in parallel
  const [farmersResult, cropsResult, calcsResult, recentActivity] =
    await Promise.all([
      supabase
        .from("farmers")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("farmer_crops")
        .select("id, acres", { count: "exact" })
        .eq("org_id", orgId),
      supabase
        .from("calculations")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_latest", true),
      supabase
        .from("activity_log")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const totalFarmers = farmersResult.count || 0;
  const totalCrops = cropsResult.count || 0;
  const totalAcres =
    cropsResult.data?.reduce((sum, c) => sum + (c.acres || 0), 0) || 0;
  const totalCalcs = calcsResult.count || 0;

  // Format time ago
  function timeAgo(date: string) {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const actionIcons: Record<string, string> = {
    user_signup: "👤",
    farmer_added: "🌾",
    crop_added: "🌿",
    calculation_run: "📊",
    report_generated: "📄",
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Welcome back, {professional?.full_name?.split(" ")[0] || "there"}
        </h2>
        <p className="text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your farmer portfolio.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Farmers",
            value: totalFarmers,
            icon: "👥",
            href: "/dashboard/farmers",
            color: "emerald",
          },
          {
            label: "Active Crops",
            value: totalCrops,
            icon: "🌾",
            href: "/dashboard/farmers",
            color: "blue",
          },
          {
            label: "Total Acres",
            value: totalAcres.toLocaleString(),
            icon: "📐",
            href: "/dashboard/farmers",
            color: "amber",
          },
          {
            label: "Calculations",
            value: totalCalcs,
            icon: "📊",
            href: "/dashboard/calculator",
            color: "purple",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stat.value}
                </p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {[
              {
                label: "Add a farmer",
                href: "/dashboard/farmers/new",
                icon: "➕",
              },
              {
                label: "Run ARC/PLC calculation",
                href: "/dashboard/calculator",
                icon: "🧮",
              },
              {
                label: "Generate report",
                href: "/dashboard/intelligence",
                icon: "📝",
              },
              {
                label: "View analytics",
                href: "/dashboard/analytics",
                icon: "📈",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <span>{action.icon}</span>
                {action.label}
                <svg
                  className="ml-auto w-4 h-4 text-gray-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Recent Activity
          </h3>
          {recentActivity.data && recentActivity.data.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.data.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02]"
                >
                  <span className="text-lg mt-0.5">
                    {actionIcons[activity.action] || "📌"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {timeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No activity yet.</p>
              <p className="text-gray-600 text-xs mt-1">
                Add your first farmer to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Getting started card (shown when no farmers) */}
      {totalFarmers === 0 && (
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-8">
          <div className="max-w-2xl">
            <h3 className="text-xl font-bold text-white">
              Get started with HarvestFile
            </h3>
            <p className="text-gray-400 mt-2 leading-relaxed">
              Add your first farmer to begin running ARC/PLC calculations and
              generating compliance reports. Each farmer can have multiple crops
              with county-level yield data from USDA NASS.
            </p>
            <Link
              href="/dashboard/farmers/new"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-[0.98]"
            >
              Add your first farmer
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
