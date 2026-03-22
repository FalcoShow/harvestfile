// =============================================================================
// HarvestFile — Phase 25: County Redirect
// /{state}/{county} → /{state}/{county}/arc-plc
// =============================================================================

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ state: string; county: string }>;
}

export default async function CountyPage({ params }: PageProps) {
  const { state, county } = await params;
  redirect(`/${state}/${county}/arc-plc`);
}
