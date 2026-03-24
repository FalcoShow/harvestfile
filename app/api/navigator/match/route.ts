// =============================================================================
// HarvestFile USDA Program Navigator — Match API
// POST /api/navigator/match
// Phase 33 Build 1
//
// Accepts a farmer profile from the wizard and returns all matched USDA
// programs with confidence tiers and estimated values.
// =============================================================================

import { NextResponse } from 'next/server';
import { matchPrograms, getQuickProgramCount } from '@/lib/navigator/engine';
import { FarmerProfile } from '@/lib/navigator/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profile, mode } = body as {
      profile: Partial<FarmerProfile>;
      mode?: 'full' | 'count';
    };

    // Validate minimum required fields
    if (!profile || !profile.operationTypes || profile.operationTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one operation type is required' },
        { status: 400 }
      );
    }

    // Quick count mode — for live counter during wizard
    if (mode === 'count') {
      const count = getQuickProgramCount(profile);
      return NextResponse.json({ count });
    }

    // Full matching mode
    const fullProfile: FarmerProfile = {
      operationTypes: profile.operationTypes || [],
      needs: profile.needs || [],
      producerStatuses: profile.producerStatuses || [],
      state: profile.state || '',
      county: profile.county,
      crops: profile.crops,
      livestock: profile.livestock,
      farmSizeAcres: profile.farmSizeAcres,
      annualRevenue: profile.annualRevenue,
      landTenure: profile.landTenure,
      yearsExperience: profile.yearsExperience,
      hasCropInsurance: profile.hasCropInsurance,
      hasBaseAcres: profile.hasBaseAcres,
      hasExistingConservationPlan: profile.hasExistingConservationPlan,
      recentDisasterLoss: profile.recentDisasterLoss,
      isOrganic: profile.isOrganic,
      isDairy: profile.isDairy,
      dairyProductionLbs: profile.dairyProductionLbs,
    };

    const results = matchPrograms(fullProfile);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Navigator match error:', error);
    return NextResponse.json(
      { error: 'Failed to process eligibility matching' },
      { status: 500 }
    );
  }
}

// GET — return program catalog metadata (no profile needed)
export async function GET() {
  const { USDA_PROGRAMS, PROGRAM_CATEGORIES, TOTAL_PROGRAM_COUNT } = await import(
    '@/lib/navigator/programs'
  );

  return NextResponse.json({
    totalPrograms: TOTAL_PROGRAM_COUNT,
    categories: PROGRAM_CATEGORIES,
    upcomingDeadlines: USDA_PROGRAMS
      .filter(p => p.deadlineDate && new Date(p.deadlineDate) > new Date())
      .sort((a, b) => new Date(a.deadlineDate!).getTime() - new Date(b.deadlineDate!).getTime())
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        acronym: p.acronym,
        deadline: p.deadlineDate,
        deadlineInfo: p.deadlineInfo,
      })),
  });
}
