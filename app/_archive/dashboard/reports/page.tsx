"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Report {
  id: string;
  status: string;
  report_type: string;
  created_at: string;
  completed_at: string | null;
  content: any;
  farmers: {
    full_name: string;
    county: string;
    state: string;
  } | null;
  payments: {
    amount_cents: number;
  } | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // FIXED: column is auth_id (not auth_user_id)
        const { data: professional } = await supabase
          .from("professionals")
          .select("org_id")
          .eq("auth_id", user.id)
          .single();

        if (!professional) {
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from("reports")
          .select("*, farmers(full_name, county, state), payments(amount_cents)")
          .eq("org_id", professional.org_id)
          .order("created_at", { ascending: false });

        if (queryError) {
          console.error("Reports query error:", queryError);
          setError("Failed to load reports");
        } else if (data) {
          setReports(data);
        }
      } catch (err) {
        console.error("Reports fetch error:", err);
        setError("Something went wrong loading reports");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const statusStyles: Record<string, string> = {
    complete: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    processing: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    failed: "bg-red-900/40 text-red-400 border-red-800",
    pending: "bg-gray-800/40 text-gray-400 border-gray-700",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Reports</h1>
          <p className="text-gray-400 mt-1">AI-generated ARC/PLC optimization reports</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-900/20 border border-red-800 p-8 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
          >
            Try again
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-white mb-2">No reports yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Generate your first AI-powered report from the Intelligence Hub or from a farmer&apos;s detail page.
          </p>
          <Link
            href="/dashboard/intelligence"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Open Intelligence Hub
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {report.report_type
                        ? report.report_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : "Report"}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${
                        statusStyles[report.status] || statusStyles.pending
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                  {report.farmers && (
                    <p className="text-xs text-gray-500">
                      {report.farmers.full_name} — {report.farmers.county},{" "}
                      {report.farmers.state}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDate(report.created_at)}
                  </p>
                </div>
                {report.status === "complete" && (
                  <Link
                    href={`/api/reports/${report.id}/download`}
                    className="flex-shrink-0 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-600/30 transition-colors"
                  >
                    Download PDF
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
