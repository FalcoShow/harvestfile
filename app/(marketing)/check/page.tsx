// =============================================================================
// HarvestFile — /check Page (Server Component Wrapper)
// Phase 10 Build 1: The Calculator Revolution
//
// This is a thin server wrapper. The layout.tsx handles all SEO metadata.
// The actual calculator is a client component loaded below.
// =============================================================================

import dynamic from 'next/dynamic';

const CheckCalculator = dynamic(
  () => import('./CheckCalculator'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0C1F17' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-harvest-gold/30 border-t-harvest-gold rounded-full animate-spin" />
          <span className="text-sm text-white/30 font-medium">Loading calculator...</span>
        </div>
      </div>
    ),
  }
);

export default function CheckPage() {
  return <CheckCalculator />;
}
