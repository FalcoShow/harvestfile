"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReportSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const farmerId = searchParams.get("farmer_id");

  const [status, setStatus] = useState<
    "processing" | "complete" | "failed" | "checking"
  >("checking");
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    let pollInterval: NodeJS.Timeout;

    async function checkReport() {
      const { data: payment } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .single();

      if (!payment) {
        setStatus("processing");
        return;
      }

      const { data: report } = await supabase
        .from("reports")
        .select("id, status")
        .eq("payment_id", payment.id)
        .single();

      if (!report) {
        setStatus("processing");
        return;
      }

      setReportId(report.id);

      if (report.status === "complete") {
        setStatus("complete");
        clearInterval(pollInterval);
      } else if (report.status === "failed") {
        setStatus("failed");
        clearInterval(pollInterval);
      } else {
        setStatus("processing");
      }
    }

    checkReport();
    pollInterval = setInterval(checkReport, 3000);

    return () => clearInterval(pollInterval);
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      {status === "checking" || status === "processing" ? (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/30 mb-6">
            <svg
              className="animate-spin h-8 w-8 text-emerald-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-2">Generating your AI-powered ARC/PLC optimization report...</p>
          <p className="text-sm text-gray-500">This usually takes 15-30 seconds. Please don&apos;t close this page.</p>
        </div>
      ) : status === "complete" ? (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/30 mb-6">
            <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Your Report is Ready!</h1>
          <p className="text-gray-400 mb-6">Your ARC/PLC optimization report has been generated.</p>
          <div className="flex gap-4 justify-center">
            <a
              href={`/api/reports/${reportId}/download`}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Download PDF Report
            </a>
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="inline-flex items-center gap-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 font-semibold py-3 px-6 rounded-lg transition"
            >
              View All Reports
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/30 mb-6">
            <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Report Generation Failed</h1>
          <p className="text-gray-400 mb-6">
            Something went wrong generating your report. Your payment has been recorded and we&apos;ll retry automatically, or you can contact support.
          </p>
          <button
            onClick={() => router.push(`/dashboard/farmers/${farmerId}`)}
            className="text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            &larr; Back to Farmer
          </button>
        </div>
      )}
    </div>
  );
}
