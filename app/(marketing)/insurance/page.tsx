// =============================================================================
// HarvestFile — Phase 24A: Free Public Insurance Calculator
// app/(marketing)/insurance/page.tsx
//
// Server component wrapper with dynamic import for the client tool.
// Matches the pattern used by /optimize and /check.
// =============================================================================

import dynamic from 'next/dynamic';

const InsuranceTool = dynamic(() => import('./InsuranceTool'), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0C1F17' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
        <span className="text-sm text-white/30 font-medium">
          Loading insurance calculator...
        </span>
      </div>
    </div>
  ),
});

export default function InsurancePage() {
  return <InsuranceTool />;
}
