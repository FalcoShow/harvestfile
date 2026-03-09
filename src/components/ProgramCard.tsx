'use client';

import { useState } from 'react';
import type { ProgramRecommendation } from '@/lib/eligibility-engine';
import { formatCurrency } from '@/lib/calculations';

interface ProgramCardProps {
  recommendation: ProgramRecommendation;
}

export default function ProgramCard({ recommendation }: ProgramCardProps) {
  const {
    programName,
    agency,
    status,
    estimatedAnnualValue,
    description,
    nextDeadline,
    actionSteps,
    requiredForms,
    officialLink,
    obbbaChanges,
    isMissedProgram,
    highlights,
  } = recommendation;

  const [expanded, setExpanded] = useState(
    isMissedProgram || status === 'deadline_approaching'
  );

  const statusConfig = {
    likely_eligible: {
      bg: 'bg-success/10',
      text: 'text-success',
      label: '\u2713 Likely Eligible',
    },
    may_qualify: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      label: 'May Qualify \u2014 Check with FSA',
    },
    deadline_approaching: {
      bg: 'bg-red-50',
      text: 'text-alert',
      label: 'Deadline Approaching',
    },
  };

  const deadlineColor =
    nextDeadline.urgency === 'urgent'
      ? 'text-alert'
      : nextDeadline.urgency === 'soon'
        ? 'text-amber-600'
        : 'text-muted';

  const currentStatus = statusConfig[status];

  const formattedValue =
    estimatedAnnualValue.min === 0 && estimatedAnnualValue.max === 0
      ? 'Event-dependent'
      : `${formatCurrency(estimatedAnnualValue.min)} \u2013 ${formatCurrency(estimatedAnnualValue.max)}/year`;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Missed program banner */}
      {isMissedProgram && (
        <div className="bg-accent/10 border-b border-accent text-primary font-semibold text-sm px-6 py-2">
          MISSED PROGRAM &mdash; You may be leaving money on the table
        </div>
      )}

      {/* Card header */}
      <div className="px-6 py-5">
        {/* Program name and agency */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-lg text-foreground">{programName}</h3>
          <span className="text-xs bg-gray-100 text-muted px-2 py-1 rounded-full whitespace-nowrap">
            {agency}
          </span>
        </div>

        {/* Status badge */}
        <span
          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${currentStatus.bg} ${currentStatus.text} mb-3`}
        >
          {currentStatus.label}
        </span>

        {/* Estimated value */}
        <p className="text-accent font-bold text-2xl mb-2">{formattedValue}</p>

        {/* Next deadline */}
        <p className={`text-sm ${deadlineColor} mb-2`}>
          {nextDeadline.description} &mdash; {nextDeadline.date}
        </p>

        {/* OBBBA changes badge */}
        {obbbaChanges && (
          <span className="inline-block bg-accent/10 text-accent text-xs font-semibold rounded px-2 py-0.5 mb-2">
            NEW under OBBBA
          </span>
        )}

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="block text-sm text-primary-light hover:text-primary transition-colors mt-2"
        >
          {expanded ? 'Hide details \u25B4' : 'Show details \u25BE'}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          {/* Description */}
          <p className="text-muted text-sm">{description}</p>

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="mt-3">
              {highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="bg-amber-50 border-l-4 border-accent px-4 py-2 text-sm my-2"
                >
                  {highlight}
                </div>
              ))}
            </div>
          )}

          {/* Action steps */}
          {actionSteps.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">What you need to do</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
                {actionSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Required forms */}
          {requiredForms.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">Required forms</h4>
              <ul className="space-y-1 text-sm text-muted">
                {requiredForms.map((form, index) => (
                  <li key={index}>
                    {form.number} &mdash; {form.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Official link */}
          <a
            href={officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-primary-light hover:text-primary text-sm underline"
          >
            Learn more
          </a>
        </div>
      )}
    </div>
  );
}
