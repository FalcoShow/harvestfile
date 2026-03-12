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

  useEffect(() => {
    async function fetchReports() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: professional } = await supabase
        .from("professionals")
        .select("org_id")
        .eq("auth_id", user.id)
        .single();

      if (!professional) return;

      const { data, error } = await supabase
        .from("reports")
        .select("*, farmers(full_name, county, state), payments(amount_cents)")
        .eq("org_id", professional.org_id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReports(data);
      }
      setLoading(false);
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
      ) : reports.length === 0 ? (
        <div className="text-center py-20 border border-gray-800 rounded-xl bg-gray-900/50">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No reports yet</h3>
          <p className="text-gray-500 mb-4">Generate your first report from a farmer&apos;s profile page.</p>
          <Link href="/dashboard/farmers" className="text-emerald-400 hover:text-emerald-300 font-semibold">Go to Farmers &rarr;</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="border border-gray-800 rounded-xl bg-gray-900/50 p-5 hover:border-gray-700 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white">{report.farmers?.full_name || "Unknown Farmer"}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusStyles[report.status] || statusStyles.pending}`}>{report.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{report.farmers?.county}, {report.farmers?.state} &bull; {formatDate(report.created_at)}</p>
                  {report.content?.total_estimated_payments && (
                    <p className="text-sm text-emerald-400 mt-2 font-medium">
                      Optimized Est. Payment: ${Number(report.content.total_estimated_payments.optimized_elections).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {report.status === "complete" && (
                    <a href={`/api/reports/${report.id}/download`} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF
                    </a>
                  )}
                  {report.status === "processing" && (
                    <span className="text-sm text-yellow-400 animate-pulse">Generating...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
