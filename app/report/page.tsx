// =============================================================================
// HarvestFile - Report Display Page (FIXED)
// /app/report/page.tsx
// Fixed: Better error handling, null safety, no Suspense issues
// =============================================================================

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReportContent to avoid SSR issues
const ReportContent = dynamic(
  () => import('@/components/report/ReportContent'),
  { ssr: false, loading: () => <LoadingState /> }
);

function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '20px 32px' }}>
          <svg style={{ animation: 'hf-spin 1s linear infinite', width: 24, height: 24 }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(5,150,105,0.2)" strokeWidth="3" />
            <path d="M12 2a10 10 0 019.5 6.8" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span style={{ color: '#111827', fontWeight: 600, fontSize: 15 }}>Loading your report...</span>
        </div>
        <style>{`@keyframes hf-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [report, setReport] = useState(null);
  const [tier, setTier] = useState('preview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      // Try multiple storage keys for resilience
      let reportData = null;
      let reportId = null;

      // Check URL for report ID
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        reportId = params.get('id');
      }

      // Try to load from sessionStorage
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        // Try report-specific key first
        if (reportId) {
          const stored = sessionStorage.getItem(`report-${reportId}`);
          if (stored) {
            reportData = JSON.parse(stored);
          }
        }

        // Fallback: try the generic latest report key
        if (!reportData) {
          const latestStored = sessionStorage.getItem('harvestfile-latest-report');
          if (latestStored) {
            reportData = JSON.parse(latestStored);
          }
        }
      }

      if (reportData) {
        // Ensure required fields exist with safe defaults
        const safeReport = {
          reportId: reportData.reportId || 'DRAFT',
          generatedAt: reportData.generatedAt || new Date().toISOString(),
          executiveSummary: reportData.executiveSummary || {
            headline: 'Your personalized farm program analysis',
            recommendation: 'PLC',
            confidenceLevel: 'medium',
            estimatedBenefit: 0,
            keyInsight: 'Report data is loading...',
          },
          programAnalysis: reportData.programAnalysis || {
            arcProjection: { programName: 'ARC-CO', totalProjectedPayment: 0, yearlyBreakdown: [], pros: [], cons: [] },
            plcProjection: { programName: 'PLC', totalProjectedPayment: 0, yearlyBreakdown: [], pros: [], cons: [] },
            comparisonTable: [],
            analysisNarrative: '',
          },
          scenarioAnalysis: reportData.scenarioAnalysis || {
            scenarios: [],
            narrative: '',
            riskAssessment: '',
          },
          formsGuide: reportData.formsGuide || {
            requiredForms: [],
            optionalForms: [],
            narrative: '',
          },
          fsaVisitPrep: reportData.fsaVisitPrep || {
            whatToBring: [],
            questionsToAsk: [],
            commonMistakes: [],
            narrative: '',
          },
          cropInsurance: reportData.cropInsurance || {
            interactionSummary: '',
            keyConsiderations: [],
            recommendations: [],
            narrative: '',
          },
          deadlineCalendar: reportData.deadlineCalendar || {
            deadlines: [],
            narrative: '',
          },
          countyContext: reportData.countyContext || {
            countyName: 'Your County',
            state: 'Your State',
            historicalData: '',
            localConsiderations: '',
          },
        };

        setReport(safeReport);

        // Check payment status
        if (reportId) {
          const paymentStatus = sessionStorage.getItem(`report-paid-${reportId}`);
          if (paymentStatus === 'true') {
            setTier('full');
          }
        }
      } else {
        setError('Report not found. It may have expired — please generate a new one from the calculator.');
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Failed to load report data. Please try generating a new report.');
    }

    setLoading(false);
  }, []);

  const handleUpgradeClick = () => {
    // For founding farmers / testing: unlock immediately
    // Replace with Stripe in Phase 3B
    setTier('full');
    if (typeof window !== 'undefined' && report?.reportId) {
      sessionStorage.setItem(`report-paid-${report.reportId}`, 'true');
    }
  };

  // Loading
  if (loading) {
    return <LoadingState />;
  }

  // Error
  if (error || !report) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: 440, width: '100%', padding: '48px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌾</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1B4332', marginBottom: 8 }}>Report Not Found</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 28 }}>
            {error || 'We couldn\'t find this report. Please try generating a new one.'}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: '#1B4332',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              padding: '14px 28px',
              borderRadius: 14,
              textDecoration: 'none',
            }}
          >
            Back to Calculator
          </a>
        </div>
      </div>
    );
  }

  // Report view
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6' }}>
      {/* Top Bar */}
      <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1B4332', fontWeight: 800, fontSize: 17, textDecoration: 'none', letterSpacing: '-0.04em' }}>
            <span style={{ fontSize: 20 }}>🌾</span>
            Harvest<span style={{ color: '#C9A84C' }}>File</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {tier === 'full' && (
              <button
                onClick={() => window.print()}
                style={{ fontSize: 13, color: '#6B7280', background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
              >
                🖨️ Print / Save PDF
              </button>
            )}
            <a href="/" style={{ fontSize: 13, color: '#059669', fontWeight: 600, textDecoration: 'none' }}>
              ← Back to Calculator
            </a>
          </div>
        </div>
      </div>

      {/* Report */}
      <div style={{ padding: '32px 24px 120px' }}>
        <ReportContent
          report={report}
          tier={tier}
          onUpgradeClick={handleUpgradeClick}
        />
      </div>
    </div>
  );
}
