"use client";

import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/intelligence": "Intelligence Hub",
  "/dashboard/farmers": "Farmers",
  "/dashboard/calculator": "ARC/PLC Calculator",
  "/dashboard/reports": "Reports",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

export default function DashboardHeader() {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const pageTitle =
    routeLabels[pathname] ||
    segments[segments.length - 1]?.replace(/-/g, " ") ||
    "Dashboard";

  return (
    <header className="sticky top-0 z-30 bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between h-16 px-6 lg:px-8">
        {/* Left — Title + breadcrumb */}
        <div className="flex items-center gap-4 pl-12 lg:pl-0">
          <h1 className="text-lg font-semibold text-white capitalize">
            {pageTitle}
          </h1>
        </div>

        {/* Right — Search + actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-500 hover:border-white/[0.1] transition-colors cursor-pointer">
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-sm">Search farmers...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-white/[0.06] rounded border border-white/[0.08]">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-[#0a0f0d]" />
          </button>
        </div>
      </div>
    </header>
  );
}
