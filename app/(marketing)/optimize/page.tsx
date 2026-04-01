// =============================================================================
// HarvestFile — /optimize Page (Server Component Wrapper)
// Phase 22: OBBBA Election Optimizer
// =============================================================================

import dynamic from 'next/dynamic';

const OptimizerTool = dynamic(() => import('./OptimizerTool'), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0C1F17' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
        <span className="text-sm text-white/30 font-medium">
          Loading optimizer...
        </span>
      </div>
    </div>
  ),
});

export default function OptimizePage() {
  return <OptimizerTool />;
}
