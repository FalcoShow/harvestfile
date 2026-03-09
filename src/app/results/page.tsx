'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { evaluateEligibility } from '@/lib/eligibility-engine';
import type { ScreenerData, ProgramRecommendation } from '@/lib/eligibility-engine';
import { formatCurrency } from '@/lib/calculations';
import ProgramCard from '@/components/ProgramCard';

function ResultsLoading() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4 mx-auto" />
        <div className="h-5 bg-gray-200 rounded animate-pulse w-full" />
        <div className="h-16 bg-gray-200 rounded animate-pulse w-2/3 mx-auto" />
        <div className="h-40 bg-gray-200 rounded-xl animate-pulse w-full" />
      </div>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawData = searchParams.get('d');
  const [copied, setCopied] = useState(false);

  let screenerData: ScreenerData | null = null;
  try {
    if (rawData) {
      screenerData = JSON.parse(atob(decodeURIComponent(rawData)));
    }
  } catch {
    screenerData = null;
  }

  const recommendations: ProgramRecommendation[] = useMemo(() => {
    if (!screenerData) return [];
    return evaluateEligibility(screenerData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData]);

  if (!screenerData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-foreground mb-4">
            No screening data found
          </h2>
          <p className="text-muted mb-6">
            Please complete the eligibility screener first.
          </p>
          <Link
            href="/screener"
            className="inline-block bg-primary text-white hover:bg-primary-light rounded-lg px-6 py-3 font-semibold transition"
          >
            Start Screener
          </Link>
        </div>
      </div>
    );
  }

  const totalMin = recommendations.reduce((sum, r) => sum + r.estimatedAnnualValue.min, 0);
  const totalMax = recommendations.reduce((sum, r) => sum + r.estimatedAnnualValue.max, 0);
  const qualifiedCount = recommendations.filter(
    (r) => r.status !== 'may_qualify' || r.estimatedAnnualValue.max > 0
  ).length;

  const firstName = screenerData.firstName?.trim() || 'farmer';
  const totalAcres = screenerData.totalAcres || 0;
  const stateCode = screenerData.state || '';

  const valuedRecommendations = recommendations.filter(
    (r) => r.estimatedAnnualValue.max > 0
  );

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Results Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Great news, {firstName}!
          </h1>
          <p className="text-muted text-lg mt-2">
            Based on your {totalAcres.toLocaleString()}-acre {stateCode} operation, you may
            qualify for:
          </p>
          <p className="text-4xl md:text-5xl font-bold text-accent mt-4">
            Up to {formatCurrency(totalMax)} per year
          </p>
          {totalMin !== totalMax && (
            <p className="text-muted mt-1">
              {formatCurrency(totalMin)} &ndash; {formatCurrency(totalMax)}
            </p>
          )}
          <p className="text-muted mt-2">
            across {qualifiedCount} USDA program{qualifiedCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Value Breakdown */}
      {valuedRecommendations.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <h2 className="font-bold text-lg mb-4">Estimated Value Breakdown</h2>
          <div className="space-y-3">
            {valuedRecommendations.map((rec) => {
              const barWidth =
                totalMax > 0
                  ? Math.max((rec.estimatedAnnualValue.max / totalMax) * 100, 4)
                  : 0;
              return (
                <div key={rec.programId} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-32 md:w-44 shrink-0 truncate">
                    {rec.programName}
                  </span>
                  <div className="flex-1 bg-primary/20 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-accent font-semibold text-sm w-24 text-right shrink-0">
                    {formatCurrency(rec.estimatedAnnualValue.max)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Program Cards Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Your Program Recommendations</h2>
        <div className="space-y-6">
          {recommendations.map((rec) => (
            <ProgramCard key={rec.programId} recommendation={rec} />
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">Want help enrolling?</h2>
          <p className="text-muted mt-2">
            We&apos;re building automated filing tools. Join the waitlist.
          </p>

          {screenerData.email && (
            <p className="text-success text-sm mt-4">
              We&apos;ll keep you updated at {screenerData.email}
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleShare}
              className="border border-primary text-primary rounded-lg px-6 py-2 hover:bg-primary/5 transition"
            >
              {copied ? 'Link copied!' : 'Share with a fellow farmer'}
            </button>

            <Link
              href="/screener"
              className="text-primary-light underline text-sm"
            >
              Start Over
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent />
    </Suspense>
  );
}
