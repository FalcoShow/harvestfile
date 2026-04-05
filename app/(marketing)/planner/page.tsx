// =============================================================================
// app/(marketing)/planner/page.tsx
// HarvestFile — Surface 3: Farm Financial Planner (Coming Soon)
//
// Placeholder page for the /planner route until Surface 3 is built.
// Shows a premium "Coming Soon" state that builds anticipation.
// Will eventually merge: Cash Flow, Breakeven, Farm Score, Crop Insurance.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Farm Financial Planner — Coming Soon | HarvestFile',
  description:
    'Cash flow forecasting, breakeven analysis, farm scoring, and crop insurance tools — ' +
    'all in one financial planning dashboard. Coming soon to HarvestFile.',
  alternates: { canonical: 'https://harvestfile.com/planner' },
};

export default function PlannerPage() {
  return (
    <div className="min-h-screen bg-[#050f09] relative overflow-hidden">
      {/* Aurora mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: [
          'radial-gradient(at 40% 20%, rgba(16,185,129,0.06) 0px, transparent 50%)',
          'radial-gradient(at 80% 0%, rgba(6,95,70,0.05) 0px, transparent 50%)',
          'radial-gradient(at 0% 80%, rgba(5,150,105,0.04) 0px, transparent 50%)',
          'radial-gradient(at 60% 60%, rgba(201,168,76,0.03) 0px, transparent 50%)',
        ].join(','),
      }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-lg">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#1B4332] border border-white/[0.08] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4B85C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4B85C]/10 border border-[#D4B85C]/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4B85C] animate-pulse" />
            <span className="text-xs font-semibold text-[#D4B85C] uppercase tracking-wider">Coming Soon</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-[-0.03em] mb-3">
            Farm Financial Planner
          </h1>

          {/* Description */}
          <p className="text-[#F0E6D0]/50 text-base leading-relaxed mb-8">
            Cash flow forecasting, breakeven analysis, farm scoring, and crop insurance tools — all in one financial planning dashboard. We&apos;re building something incredible.
          </p>

          {/* Tools that will be merged */}
          <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm mx-auto">
            {[
              { label: 'Cash Flow', href: '/cashflow' },
              { label: 'Breakeven', href: '/breakeven' },
              { label: 'Farm Score', href: '/farm-score' },
              { label: 'Crop Insurance', href: '/insurance' },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
              >
                {tool.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Link
              href="/morning"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-[#0C1F17] text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E2C366, #D4B55A)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
              </svg>
              Go to My Farm
            </Link>
            <p className="text-[11px] text-white/20">
              Use the individual tools above while we build the unified planner.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
