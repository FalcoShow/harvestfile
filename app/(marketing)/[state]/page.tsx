// =============================================================================
// HarvestFile — Phase 25: State Redirect
// /{state} → /{state}/arc-plc
// =============================================================================

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ state: string }>;
}

export default async function StatePage({ params }: PageProps) {
  const { state } = await params;
  redirect(`/${state}/arc-plc`);
}
