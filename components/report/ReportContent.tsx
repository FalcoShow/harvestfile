// =============================================================================
// HarvestFile - Report Content Renderer
// The visual presentation that makes the report worth $39
// =============================================================================

'use client';

import React, { useState, useRef } from 'react';
import { ReportData, ReportTier } from '@/lib/types/report';

interface ReportContentProps {
  report: ReportData;
  tier: ReportTier;
  onUpgradeClick?: () => void;
}

export default function ReportContent({ report, tier, onUpgradeClick }: ReportContentProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const isPaid = tier === 'full';

  // ---- Locked Section Overlay ----
  const LockedOverlay = ({ sectionName }: { sectionName: string }) => (
    <div className="relative">
      <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/60 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300">
        <div className="text-center px-8 py-6">
          <svg className="w-10 h-10 text-emerald-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {sectionName}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Unlock your complete personalized report
          </p>
          <button
            onClick={onUpgradeClick}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Get Full Report — $39
          </button>
        </div>
      </div>
      {/* Blurred preview content behind the overlay */}
      <div className="filter blur-sm select-none pointer-events-none opacity-50 py-8 px-6">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      </div>
    </div>
  );

  // ---- Section Wrapper ----
  const Section = ({ 
    id, 
    title, 
    icon, 
    lockedTitle,
    children 
  }: { 
    id: string; 
    title: string; 
    icon: string;
    lockedTitle?: string;
    children: React.ReactNode;
  }) => {
    const isLocked = !isPaid && id !== 'executiveSummary';
    
    return (
      <section id={id} className="mb-8 print:mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100 print:bg-white">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              {title}
            </h2>
          </div>
          <div className="px-6 py-5">
            {isLocked ? <LockedOverlay sectionName={lockedTitle || title} /> : children}
          </div>
        </div>
      </section>
    );
  };

  // ---- Dollar Format Helper ----
  const fmt = (n: number) => {
    if (n >= 0) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return `-$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const fmtDetailed = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div ref={reportRef} className="max-w-4xl mx-auto">
      
      {/* ============ REPORT HEADER ============ */}
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 rounded-2xl p-8 mb-8 text-white shadow-xl print:bg-emerald-800 print:rounded-none">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">🌾</span>
              <span className="text-sm font-medium tracking-wider uppercase opacity-80">HarvestFile</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">
              Personalized Farm Program Report
            </h1>
            <p className="text-emerald-200 text-lg">
              {report.countyContext.countyName}, {report.countyContext.state}
            </p>
          </div>
          <div className="text-right text-sm text-emerald-200">
            <p>Report #{report.reportId.slice(0, 8).toUpperCase()}</p>
            <p>{new Date(report.generatedAt).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}</p>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-emerald-600/50">
          <div className="text-center">
            <p className="text-emerald-300 text-xs uppercase tracking-wider mb-1">Recommendation</p>
            <p className="text-2xl font-bold">{report.executiveSummary.recommendation}</p>
          </div>
          <div className="text-center">
            <p className="text-emerald-300 text-xs uppercase tracking-wider mb-1">Estimated Benefit</p>
            <p className="text-2xl font-bold">{fmt(report.executiveSummary.estimatedBenefit)}</p>
          </div>
          <div className="text-center">
            <p className="text-emerald-300 text-xs uppercase tracking-wider mb-1">Confidence</p>
            <p className="text-2xl font-bold capitalize">{report.executiveSummary.confidenceLevel}</p>
          </div>
        </div>
      </div>

      {/* ============ TABLE OF CONTENTS ============ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 print:hidden">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">What&apos;s In Your Report</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { icon: '📋', label: 'Executive Summary', free: true },
            { icon: '📊', label: 'ARC vs PLC Analysis', free: false },
            { icon: '🎯', label: 'Price Scenario Analysis', free: false },
            { icon: '📝', label: 'Forms & Paperwork Guide', free: false },
            { icon: '🏛️', label: 'FSA Office Visit Prep', free: false },
            { icon: '🛡️', label: 'Crop Insurance Interaction', free: false },
            { icon: '📅', label: 'Deadline Calendar', free: false },
            { icon: '🗺️', label: 'County-Specific Context', free: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <span>{item.icon}</span>
              <span className={item.free || isPaid ? 'text-gray-800' : 'text-gray-400'}>
                {item.label}
              </span>
              {item.free && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">FREE</span>
              )}
              {!item.free && !isPaid && (
                <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ SECTION 1: EXECUTIVE SUMMARY (FREE) ============ */}
      <Section id="executiveSummary" title="Executive Summary" icon="📋">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5">
          <p className="text-xl font-bold text-emerald-900 leading-relaxed">
            {report.executiveSummary.headline}
          </p>
        </div>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed text-base">
            {report.executiveSummary.keyInsight}
          </p>
        </div>
        
        {/* Confidence indicator */}
        <div className="mt-5 flex items-center gap-3 text-sm">
          <span className="text-gray-500">Confidence Level:</span>
          <div className="flex gap-1">
            {['high', 'medium', 'low'].map((level) => (
              <div
                key={level}
                className={`h-2.5 w-8 rounded-full ${
                  report.executiveSummary.confidenceLevel === 'high' 
                    ? 'bg-emerald-500' 
                    : report.executiveSummary.confidenceLevel === 'medium' && level !== 'low'
                    ? 'bg-yellow-500'
                    : report.executiveSummary.confidenceLevel === level
                    ? 'bg-red-500'
                    : 'bg-gray-200'
                }`}
              ></div>
            ))}
          </div>
          <span className="text-gray-600 font-medium capitalize">
            {report.executiveSummary.confidenceLevel}
          </span>
        </div>

        {/* Upgrade CTA after free section */}
        {!isPaid && (
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">
              Want the full analysis with dollar projections?
            </p>
            <p className="text-gray-600 mb-4 text-sm">
              Your complete report includes detailed ARC vs PLC breakdowns, 5 price scenarios, 
              exact forms needed, FSA visit prep guide, and your county deadline calendar.
            </p>
            <button
              onClick={onUpgradeClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg text-lg"
            >
              Unlock Full Report — $39
            </button>
            <p className="text-xs text-gray-500 mt-2">One-time purchase. Instant access. Take it to your FSA office.</p>
          </div>
        )}
      </Section>

      {/* ============ SECTION 2: PROGRAM ANALYSIS ============ */}
      <Section id="programAnalysis" title="Detailed ARC vs PLC Analysis" icon="📊" lockedTitle="Detailed ARC vs PLC Breakdown">
        <p className="text-gray-700 mb-6 leading-relaxed">{report.programAnalysis.analysisNarrative}</p>
        
        {/* Comparison Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-emerald-200">
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">Year</th>
                <th className="text-right py-3 px-4 text-gray-600 font-semibold">ARC-CO Payment</th>
                <th className="text-right py-3 px-4 text-gray-600 font-semibold">PLC Payment</th>
                <th className="text-right py-3 px-4 text-gray-600 font-semibold">Difference</th>
                <th className="text-center py-3 px-4 text-gray-600 font-semibold">Winner</th>
              </tr>
            </thead>
            <tbody>
              {report.programAnalysis.comparisonTable.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{row.year}</td>
                  <td className="py-3 px-4 text-right font-mono">{fmt(row.arcPayment)}</td>
                  <td className="py-3 px-4 text-right font-mono">{fmt(row.plcPayment)}</td>
                  <td className={`py-3 px-4 text-right font-mono font-semibold ${
                    row.difference > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {fmt(row.difference)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      row.winner === 'ARC-CO' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {row.winner}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ARC Pros/Cons */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-lg">📈</span> ARC-CO
            </h4>
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Pros</p>
              {report.programAnalysis.arcProjection.pros.map((pro, i) => (
                <p key={i} className="text-sm text-gray-700 flex items-start gap-2 mb-1">
                  <span className="text-green-500 mt-0.5">✓</span> {pro}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Cons</p>
              {report.programAnalysis.arcProjection.cons.map((con, i) => (
                <p key={i} className="text-sm text-gray-700 flex items-start gap-2 mb-1">
                  <span className="text-red-500 mt-0.5">✗</span> {con}
                </p>
              ))}
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🛡️</span> PLC
            </h4>
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Pros</p>
              {report.programAnalysis.plcProjection.pros.map((pro, i) => (
                <p key={i} className="text-sm text-gray-700 flex items-start gap-2 mb-1">
                  <span className="text-green-500 mt-0.5">✓</span> {pro}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Cons</p>
              {report.programAnalysis.plcProjection.cons.map((con, i) => (
                <p key={i} className="text-sm text-gray-700 flex items-start gap-2 mb-1">
                  <span className="text-red-500 mt-0.5">✗</span> {con}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ============ SECTION 3: SCENARIO ANALYSIS ============ */}
      <Section id="scenarioAnalysis" title="Price Scenario Analysis" icon="🎯" lockedTitle="5 Price Scenarios & Risk Analysis">
        <p className="text-gray-700 mb-5 leading-relaxed">{report.scenarioAnalysis.narrative}</p>
        
        <div className="space-y-3 mb-6">
          {report.scenarioAnalysis.scenarios.map((scenario, i) => (
            <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
              <div className="flex-shrink-0 w-32">
                <p className="font-semibold text-sm text-gray-800">{scenario.scenarioName}</p>
                <p className={`text-xs font-mono ${
                  scenario.priceChange > 0 ? 'text-green-600' : scenario.priceChange < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {scenario.priceChange > 0 ? '+' : ''}{scenario.priceChange}%
                </p>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">ARC-CO</p>
                  <p className="font-mono font-semibold">{fmt(scenario.arcPayment)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">PLC</p>
                  <p className="font-mono font-semibold">{fmt(scenario.plcPayment)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Winner</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    scenario.winner === 'ARC-CO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {scenario.winner}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ Risk Assessment</p>
          <p className="text-sm text-amber-800">{report.scenarioAnalysis.riskAssessment}</p>
        </div>
      </Section>

      {/* ============ SECTION 4: FORMS GUIDE ============ */}
      <Section id="formsGuide" title="Forms & Paperwork Guide" icon="📝" lockedTitle="Required Forms & Filing Guide">
        <p className="text-gray-700 mb-5 leading-relaxed">{report.formsGuide.narrative}</p>
        
        <div className="mb-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Required Forms
          </h4>
          <div className="space-y-3">
            {report.formsGuide.requiredForms.map((form, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono font-bold text-emerald-700 text-sm">{form.formNumber}</span>
                    <span className="text-gray-400 mx-2">—</span>
                    <span className="font-medium text-gray-900">{form.formName}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{form.purpose}</p>
                <p className="text-sm text-gray-500"><strong>Where to get it:</strong> {form.whereToGet}</p>
                <p className="text-sm text-emerald-700 mt-1"><strong>💡 Tip:</strong> {form.tips}</p>
              </div>
            ))}
          </div>
        </div>

        {report.formsGuide.optionalForms.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Optional Forms
            </h4>
            <div className="space-y-3">
              {report.formsGuide.optionalForms.map((form, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <span className="font-mono font-bold text-gray-600 text-sm">{form.formNumber}</span>
                  <span className="text-gray-400 mx-2">—</span>
                  <span className="font-medium text-gray-900">{form.formName}</span>
                  <p className="text-sm text-gray-600 mt-1">{form.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ============ SECTION 5: FSA VISIT PREP ============ */}
      <Section id="fsaVisitPrep" title="FSA Office Visit Prep" icon="🏛️" lockedTitle="FSA Visit Checklist & Insider Tips">
        <p className="text-gray-700 mb-5 leading-relaxed">{report.fsaVisitPrep.narrative}</p>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <h4 className="font-semibold text-emerald-900 mb-3 text-sm uppercase tracking-wider">📎 What to Bring</h4>
            {report.fsaVisitPrep.whatToBring.map((item, i) => (
              <p key={i} className="text-sm text-gray-700 mb-1.5 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">☐</span> {item}
              </p>
            ))}
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wider">❓ Questions to Ask</h4>
            {report.fsaVisitPrep.questionsToAsk.map((q, i) => (
              <p key={i} className="text-sm text-gray-700 mb-1.5 flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span> {q}
              </p>
            ))}
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <h4 className="font-semibold text-red-900 mb-3 text-sm uppercase tracking-wider">⚠️ Common Mistakes</h4>
            {report.fsaVisitPrep.commonMistakes.map((mistake, i) => (
              <p key={i} className="text-sm text-gray-700 mb-1.5 flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span> {mistake}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ SECTION 6: CROP INSURANCE ============ */}
      <Section id="cropInsurance" title="Crop Insurance Interaction" icon="🛡️" lockedTitle="How ARC/PLC Affects Your Crop Insurance">
        <p className="text-gray-700 mb-5 leading-relaxed">{report.cropInsurance.narrative}</p>
        
        <div className="bg-gray-50 rounded-xl p-5 mb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Key Considerations</h4>
          {report.cropInsurance.keyConsiderations.map((item, i) => (
            <p key={i} className="text-sm text-gray-700 mb-2 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">▸</span> {item}
            </p>
          ))}
        </div>

        <div className="bg-emerald-50 rounded-xl p-5">
          <h4 className="font-semibold text-emerald-900 mb-3">Our Recommendations</h4>
          {report.cropInsurance.recommendations.map((rec, i) => (
            <p key={i} className="text-sm text-gray-700 mb-2 flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span> {rec}
            </p>
          ))}
        </div>
      </Section>

      {/* ============ SECTION 7: DEADLINE CALENDAR ============ */}
      <Section id="deadlineCalendar" title="Key Deadlines" icon="📅" lockedTitle="Your Program Deadline Calendar">
        <p className="text-gray-700 mb-5 leading-relaxed">{report.deadlineCalendar.narrative}</p>
        
        <div className="space-y-2">
          {report.deadlineCalendar.deadlines.map((deadline, i) => (
            <div key={i} className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${
              deadline.importance === 'critical' 
                ? 'border-red-500 bg-red-50' 
                : deadline.importance === 'important'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex-shrink-0 text-center min-w-[60px]">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  {deadline.date}
                </p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{deadline.event}</p>
                <p className="text-sm text-gray-600 mt-0.5">{deadline.action}</p>
                {deadline.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">{deadline.notes}</p>
                )}
              </div>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                deadline.importance === 'critical' ? 'bg-red-200 text-red-800' :
                deadline.importance === 'important' ? 'bg-amber-200 text-amber-800' :
                'bg-gray-200 text-gray-600'
              }`}>
                {deadline.importance}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ============ SECTION 8: COUNTY CONTEXT ============ */}
      <Section id="countyContext" title="County Agricultural Context" icon="🗺️" lockedTitle="Local County Data & FSA Info">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed mb-4">{report.countyContext.historicalData}</p>
          <p className="text-gray-700 leading-relaxed mb-4">{report.countyContext.localConsiderations}</p>
          {report.countyContext.fsaOfficeInfo && (
            <div className="bg-blue-50 rounded-xl p-4 mt-4 not-prose">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">🏢 Your Local FSA Office</h4>
              <p className="text-sm text-gray-700">{report.countyContext.fsaOfficeInfo}</p>
            </div>
          )}
        </div>
      </Section>

      {/* ============ FOOTER ============ */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center text-sm text-gray-500 mt-8">
        <p className="mb-2">
          <strong className="text-gray-700">Disclaimer:</strong> This report is for informational purposes only and does not constitute financial or legal advice. 
          Program payment projections are estimates based on available data and assumptions about future market conditions. 
          Actual payments will depend on final market year average prices and county yields determined by USDA.
        </p>
        <p className="text-xs text-gray-400">
          Generated by HarvestFile — Intelligent tools for American farmers — harvestfile.com
        </p>
      </div>

      {/* ============ FLOATING CTA (for preview tier) ============ */}
      {!isPaid && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 z-50 print:hidden">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Unlock your complete farm program report</p>
              <p className="text-sm text-gray-500">7 additional sections with personalized analysis</p>
            </div>
            <button
              onClick={onUpgradeClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Get Full Report — $39
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
