// =============================================================================
// HarvestFile - Report CTA Component
// Add this to your existing ARC/PLC calculator results page
// This is the conversion point: free calculator → paid report
// =============================================================================

'use client';

import React, { useState } from 'react';
import { FarmInputData } from '@/lib/types/report';

interface ReportCTAProps {
  farmData: FarmInputData;
  className?: string;
}

export default function ReportCTA({ farmData, className = '' }: ReportCTAProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(farmData.email || '');
  const [error, setError] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(!farmData.email);

  const handleGenerateReport = async () => {
    if (!email) {
      setShowEmailInput(true);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmData: {
            ...farmData,
            email,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate report');
      }

      // Store the report data and redirect to report page
      // Using sessionStorage for the report data transfer
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`report-${data.reportId}`, JSON.stringify(data.report));
        window.location.href = `/report?id=${data.reportId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 rounded-2xl p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
          <span>🌾</span> AI-Powered Analysis
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Get Your Personalized Farm Program Report
        </h3>
        <p className="text-gray-600 max-w-lg mx-auto">
          Our AI analyzes your specific farm data to generate a comprehensive 
          ARC vs PLC recommendation with dollar projections, risk scenarios, 
          and an FSA visit prep guide.
        </p>
      </div>

      {/* What's included */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: '📊', label: 'ARC vs PLC\nBreakdown' },
          { icon: '🎯', label: '5 Price\nScenarios' },
          { icon: '📝', label: 'Forms\nChecklist' },
          { icon: '📅', label: 'Deadline\nCalendar' },
        ].map((item, i) => (
          <div key={i} className="text-center bg-white rounded-xl p-3 shadow-sm">
            <span className="text-2xl block mb-1">{item.icon}</span>
            <span className="text-xs text-gray-600 whitespace-pre-line">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Email input (if needed) */}
      {showEmailInput && (
        <div className="mb-4">
          <input
            type="email"
            placeholder="Enter your email to receive your report"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-gray-800 text-center"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
          {error}
        </div>
      )}

      {/* CTA Button */}
      <div className="text-center">
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className={`
            w-full md:w-auto inline-flex items-center justify-center gap-2
            bg-emerald-600 hover:bg-emerald-700 text-white font-bold 
            px-10 py-4 rounded-xl text-lg transition-all 
            shadow-lg hover:shadow-xl
            disabled:opacity-60 disabled:cursor-not-allowed
            ${isLoading ? 'animate-pulse' : ''}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Your Report...
            </>
          ) : (
            <>
              Generate My Free Preview
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-3">
          Free preview includes executive summary. Full report: $39 one-time.
        </p>
      </div>

      {/* Social proof (add real numbers as you get them) */}
      <div className="mt-6 pt-4 border-t border-emerald-100 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          AI-powered analysis
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          County-specific data
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Take to your FSA office
        </span>
      </div>
    </div>
  );
}
