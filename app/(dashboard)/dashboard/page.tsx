// =============================================================================
// HarvestFile — Dashboard Overview
// Phase 13 Build 1: Calculator → Dashboard Bridge
//
// Server Component that shows portfolio stats, recent activity, and quick
// actions. Now includes the BridgeDetector client component that checks
// localStorage for calculator results and auto-imports them.
//
// The BridgeDetector renders at the top of the page — if bridge data exists,
// it shows a success card with the imported analysis. If no bridge data,
// it renders nothing.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BridgeDetector } from "./_components/BridgeDetector";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get the professional's org_id — handle both column names
  let professional = null;
  const { data: proById } = await supabase
    .from("professionals")
    .select("org_id, full_name")
    .eq("auth_id", user!.id)
    .single();

  if (proById) {
    professional = proById;
  } else {
    const { data: proByUserId } = await supabase
      .from("professionals")
      .select("org_id, full_name")
      .eq("auth_user_id", user!.id)
      .single();
    professional = proByUserId;
  }

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

  // Get the latest bridged calculation for the welcome card
  let latestCalc = null;
  if (orgId) {
    const { data: calc } = await supabase
      .from("calculations")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_latest", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    latestCalc = calc;
  }

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
    calculator_bridge: "🔗",
  };

  const firstName = professional?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      {/* ── Bridge Detector (checks localStorage, renders only if data exists) ── */}
      <BridgeDetector />

      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Welcome back, {firstName}
        </h2>
        <p className="text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your farm portfolio.
        </p>
      </div>

      {/* ── Latest Analysis Card (shows if a calculation exists) ──────────── */}
      {latestCalc && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.04) 0%, rgba(5,150,105,0.03) 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Latest Analysis
              </span>
            </div>
            {latestCalc.farmer_id && (
              <Link
                href={`/dashboard/farmers/${latestCalc.farmer_id}`}
                className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
              >
                View Details →
              </Link>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
                  Crop
                </div>
                <div className="text-sm font-semibold text-white capitalize">
                  {latestCalc.crop_type}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
                  Base Acres
                </div>
                <div className="text-sm font-semibold text-white">
                  {(latestCalc.base_acres || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
                  Recommendation
                </div>
                <div className="text-sm font-bold text-[#C9A84C]">
                  {latestCalc.recommendation || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
                  Advantage
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  +${(latestCalc.difference_per_acre || 0).toFixed(2)}/ac
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  {action.label}
                </span>
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
              {recentActivity.data.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0"
                >
                  <span className="text-lg mt-0.5">
                    {actionIcons[event.action] || "📌"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {timeAgo(event.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">
              No recent activity. Start by adding a farmer or running a
              calculation.
            </p>
          )}
        </div>
      </div>

      {/* Empty state — only shows when truly no farmers */}
      {totalFarmers === 0 && !latestCalc && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-10 text-center">
          <div className="text-4xl mb-4">🌾</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Get started with your first farm
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            Add your farm operations to track ARC/PLC elections, run
            calculations, and generate AI-powered reports.
            Each farmer can have multiple crops
            with county-level yield data from USDA NASS.
          </p>
          <Link
            href="/dashboard/farmers/new"
            className="inline-flex items-center gap-2 mt-1 px-5 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-[0.98]"
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
      )}
    </div>
  );
}
