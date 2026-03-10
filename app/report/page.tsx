// =============================================================================
// HarvestFile - Report Display Page
// /app/report/page.tsx
// 
// This page displays the generated report.
// It reads report data from sessionStorage (transferred from calculator page)
// and renders the full report with preview/paid tier gating.
// =============================================================================

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportContent from '@/components/report/ReportContent';
import { ReportData, ReportTier } from '@/lib/types/report';

function ReportPageInner() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [tier, setTier] = useState<ReportTier>('preview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reportId) {
      setError('No report ID provided');
      setLoading(false);
      return;
    }

    // Try to load report from sessionStorage
    try {
      const stored = sessionStorage.getItem(`report-${reportId}`);
      if (stored) {
        const reportData = JSON.parse(stored) as ReportData;
        setReport(reportData);
        
        // Check if this report has been paid for
        const paymentStatus = sessionStorage.getItem(`report-paid-${reportId}`);
        if (paymentStatus === 'true') {
          setTier('full');
        }
      } else {
        setError('Report not found. It may have expired. Please generate a new report from the calculator.');
      }
    } catch (err) {
      setError('Failed to load report data');
    }
    
    setLoading(false);
  }, [reportId]);

  const handleUpgradeClick = () => {
    // TODO: Replace with Stripe checkout in Phase 3B
    // For now, show a "coming soon" modal or redirect to a waitlist

    // TEMPORARY: For testing, unlock the full report
    // Remove this block when Stripe is integrated
    if (process.env.NODE_ENV === 'development') {
      setTier('full');
      if (reportId) {
        sessionStorage.setItem(`report-paid-${reportId}`, 'true');
      }
      return;
    }

    // Production behavior: open Stripe checkout
    // This will be replaced in Phase 3B
    alert(
      'Full report purchases launching soon! \n\n' +
      'Join our waitlist to be notified when the full report is available.\n\n' +
      'In the meantime, your free preview shows your ARC vs PLC recommendation.'
    );
  };

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white rounded-xl shadow-lg px-8 py-5">
            <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-700 font-medium">Loading your report...</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-4">🌾</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'We couldn\'t find this report. Please try generating a new one.'}
          </p>
          <a
            href="/calculator"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Back to Calculator
          </a>
        </div>
      </div>
    );
  }

  // ---- Report View ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-emerald-700 font-bold">
            <span className="text-xl">🌾</span>
            HarvestFile
          </a>
          <div className="flex items-center gap-3">
            {tier === 'full' && (
              <button
                onClick={() => window.print()}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save PDF
              </button>
            )}
            <a
              href="/calculator"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ← Back to Calculator
            </a>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="px-4 py-8 pb-32">
        <ReportContent
          report={report}
          tier={tier}
          onUpgradeClick={handleUpgradeClick}
        />
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:bg-emerald-800 { background: #065f46 !important; -webkit-print-color-adjust: exact; }
          .print\\:mb-6 { margin-bottom: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <ReportPageInner />
    </Suspense>
  );
}
