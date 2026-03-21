// ─── Payment Hunter Engine ───────────────────────────────────────────────────
// Core matching logic that cross-references a farmer's profile against all
// active USDA programs and returns ranked results with payment estimates.
//
// Architecture: Pure functions, no side effects, no database calls.
// All program data comes from lib/data/usda-programs.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  type USDAProgram,
  type FarmProfile,
  type UrgencyLevel,
  getActivePrograms,
  getDaysUntilDeadline,
  getUrgencyLevel,
  formatCurrencyFull,
} from '@/lib/data/usda-programs';

export interface ScanResult {
  program: USDAProgram;
  estimatedPayment: number;
  estimatedPaymentFormatted: string;
  isEligible: boolean;
  eligibilityScore: number; // 0-100
  eligibilityNotes: string[];
  daysUntilDeadline: number | null;
  urgency: UrgencyLevel;
  actionRequired: string;
}

export interface ScanSummary {
  totalEstimatedPayments: number;
  totalEstimatedPaymentsFormatted: string;
  eligibleProgramCount: number;
  criticalDeadlineCount: number;
  results: ScanResult[];
  scanDate: string;
  profileSummary: string;
}

// ─── Main scan function ─────────────────────────────────────────────────────

export function scanForPayments(profile: FarmProfile): ScanSummary {
  const activePrograms = getActivePrograms();
  const results: ScanResult[] = [];

  for (const program of activePrograms) {
    const result = evaluateProgram(program, profile);
    results.push(result);
  }

  // Sort: eligible first, then by urgency (critical > high > medium > low),
  // then by estimated payment descending
  const urgencyOrder: Record<UrgencyLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  results.sort((a, b) => {
    // Eligible programs first
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;

    // Then by urgency
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    // Then by payment amount
    return b.estimatedPayment - a.estimatedPayment;
  });

  const eligibleResults = results.filter((r) => r.isEligible);
  const totalEstimated = eligibleResults.reduce(
    (sum, r) => sum + r.estimatedPayment,
    0
  );
  const criticalCount = eligibleResults.filter(
    (r) => r.urgency === 'critical'
  ).length;

  const cropList = profile.crops.map((c) => `${c.acres}ac ${c.commodity}`).join(', ');
  const livestockList = profile.livestock
    .map((l) => `${l.headCount} ${l.type}`)
    .join(', ');

  return {
    totalEstimatedPayments: totalEstimated,
    totalEstimatedPaymentsFormatted: formatCurrencyFull(totalEstimated),
    eligibleProgramCount: eligibleResults.length,
    criticalDeadlineCount: criticalCount,
    results,
    scanDate: new Date().toISOString(),
    profileSummary: [
      `${profile.totalAcres} total acres in ${profile.county}, ${profile.state}`,
      cropList ? `Crops: ${cropList}` : null,
      livestockList ? `Livestock: ${livestockList}` : null,
      profile.hasCropInsurance ? 'Has crop insurance' : 'No crop insurance',
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

// ─── Evaluate a single program against a profile ────────────────────────────

function evaluateProgram(
  program: USDAProgram,
  profile: FarmProfile
): ScanResult {
  const notes: string[] = [];
  let score = 0;
  let isEligible = true;

  // ── Check farm type match ──────────────────────────────────────────────
  const hasCrops = profile.crops.length > 0;
  const hasLivestock = profile.livestock.length > 0;
  const isDairy = profile.isDairyOperation;

  const farmTypeMatch = program.farmTypes.some((ft) => {
    if (ft === 'all') return true;
    if (ft === 'crop' && hasCrops) return true;
    if (ft === 'livestock' && hasLivestock) return true;
    if (ft === 'dairy' && isDairy) return true;
    if (ft === 'specialty' && hasCrops) return true; // simplified
    return false;
  });

  if (!farmTypeMatch) {
    isEligible = false;
    notes.push('Your operation type does not match this program');
  } else {
    score += 20;
  }

  // ── Check AGI cap ─────────────────────────────────────────────────────
  if (program.agiCap > 0 && profile.agi > program.agiCap) {
    isEligible = false;
    notes.push(
      `Your AGI ($${(profile.agi / 1000).toFixed(0)}K) exceeds the $${(program.agiCap / 1000).toFixed(0)}K cap`
    );
  } else if (program.agiCap > 0) {
    score += 15;
    notes.push('Income eligibility: ✓ Meets AGI requirement');
  }

  // ── Check crop insurance requirement ──────────────────────────────────
  if (program.requiresCropInsurance && !profile.hasCropInsurance) {
    isEligible = false;
    notes.push('This program requires active crop insurance coverage');
  }

  // ── Program-specific eligibility checks ───────────────────────────────
  switch (program.id) {
    case 'fba-2026': {
      if (!hasCrops) {
        isEligible = false;
        notes.push('FBA requires planted covered commodities');
      } else {
        score += 30;
        const matchedCrops = profile.crops.filter((c) =>
          program.paymentRates.some(
            (r) => r.commodity.toLowerCase() === c.commodity.toLowerCase()
          )
        );
        if (matchedCrops.length > 0) {
          notes.push(
            `${matchedCrops.length} of your crops qualify for per-acre FBA payments`
          );
          score += 20;
        } else {
          notes.push('Your crops may qualify — check FBA covered commodity list');
          score += 5;
        }
        if (program.requiresLoginGov) {
          notes.push('⚠ Requires Login.gov account to apply online');
        }
      }
      break;
    }

    case 'sdrp-2026': {
      if (profile.hasExperiencedDisaster) {
        score += 35;
        notes.push('You indicated disaster losses — you may qualify for SDRP');
        if (profile.hasCropInsurance) {
          notes.push('Stage 1 may use pre-filled data from your crop insurance');
          score += 15;
        } else {
          notes.push('Stage 2 covers uninsured crop losses');
          score += 10;
        }
      } else {
        score += 5;
        notes.push(
          'SDRP covers 2023-2024 losses — review if you had any crop loss'
        );
      }
      break;
    }

    case 'arc-plc-2025-auto': {
      if (profile.baseAcres > 0) {
        score += 40;
        notes.push(
          'You have base acres — you automatically qualify for the 2025 higher-of payment'
        );
        notes.push(
          'No election needed for 2025 — OBBBA guarantees the better of ARC-CO or PLC'
        );
      } else {
        score += 10;
        notes.push(
          'Check with FSA if you have base acres — new allocations under OBBBA'
        );
      }
      break;
    }

    case 'arc-plc-2026-election': {
      if (profile.baseAcres > 0 || hasCrops) {
        score += 30;
        notes.push(
          'New election required for 2026 — reference prices and guarantees increased significantly'
        );
        notes.push(
          'Up to 30M new base acres being allocated from 2019-2023 planting history'
        );
      }
      break;
    }

    case 'crp-general-2026': {
      if (profile.totalAcres > 100) {
        score += 20;
        notes.push(
          'Operations with marginal cropland may benefit from CRP rental payments'
        );
      }
      break;
    }

    case 'lfp-ongoing': {
      if (hasLivestock) {
        score += 25;
        const cattle = profile.livestock.find(
          (l) => l.type.toLowerCase() === 'cattle'
        );
        if (cattle) {
          notes.push(
            `Your ${cattle.headCount} head may qualify if county experienced qualifying drought`
          );
          notes.push('OBBBA reduced trigger: 4 consecutive weeks at D2+ (was 8)');
          score += 15;
        }
      } else {
        isEligible = false;
        notes.push('LFP is for livestock operations only');
      }
      break;
    }

    case 'lip-ongoing': {
      if (hasLivestock) {
        score += 15;
        notes.push(
          'LIP covers livestock death losses from disasters and predation'
        );
        notes.push(
          'OBBBA: Predation now paid at 100% market value; covers unborn livestock'
        );
      } else {
        isEligible = false;
        notes.push('LIP is for livestock operations only');
      }
      break;
    }

    case 'elap-ongoing': {
      if (hasLivestock) {
        score += 10;
        notes.push(
          'ELAP covers feed/water costs during drought and other emergency losses'
        );
      } else {
        isEligible = false;
      }
      break;
    }

    case 'nap-ongoing': {
      if (!profile.hasCropInsurance && hasCrops) {
        score += 25;
        notes.push(
          'Your uninsured crops may be eligible for NAP disaster coverage'
        );
        notes.push('Must apply BEFORE planting — check deadlines by crop');
      } else if (profile.hasCropInsurance) {
        isEligible = false;
        notes.push('NAP is for crops without federal crop insurance');
      }
      break;
    }

    case 'dmc-2026': {
      if (isDairy) {
        score += 30;
        notes.push(
          'OBBBA expanded Tier 1 to 6 million lbs with lower premiums'
        );
      } else {
        isEligible = false;
        notes.push('DMC is for dairy operations only');
      }
      break;
    }

    case 'elrp-2026': {
      if (hasLivestock && profile.hasExperiencedDisaster) {
        score += 25;
        notes.push(
          'You may qualify for ELRP if you had 2023-2024 grazing losses from drought/wildfire'
        );
      } else if (!hasLivestock) {
        isEligible = false;
        notes.push('ELRP is for livestock operations with grazing losses');
      }
      break;
    }

    default:
      break;
  }

  // ── Beginning/veteran/underserved farmer bonuses ──────────────────────
  if (isEligible) {
    if (profile.isBeginningFarmer) {
      score += 5;
      notes.push('Beginning farmer: may qualify for enhanced benefits');
    }
    if (profile.isVeteran) {
      score += 5;
      notes.push('Veteran farmer: may qualify for fee waivers and enhanced benefits');
    }
    if (profile.isSociallyDisadvantaged) {
      score += 5;
      notes.push(
        'Socially disadvantaged producer: priority access to some programs'
      );
    }
  }

  // ── Calculate estimated payment ───────────────────────────────────────
  const estimatedPayment = isEligible ? program.estimatePayment(profile) : 0;

  // ── Determine action required ─────────────────────────────────────────
  const days = getDaysUntilDeadline(program);
  let actionRequired = 'Review eligibility and contact FSA office';
  if (days !== null) {
    if (days <= 7) {
      actionRequired = `⚡ URGENT: Only ${days} days left to apply!`;
    } else if (days <= 14) {
      actionRequired = `Apply within ${days} days — deadline approaching fast`;
    } else if (days <= 30) {
      actionRequired = `Apply soon — ${days} days until enrollment closes`;
    } else {
      actionRequired = `Enrollment open for ${days} more days`;
    }
  } else {
    actionRequired = 'Ongoing program — apply anytime through your local FSA office';
  }

  return {
    program,
    estimatedPayment,
    estimatedPaymentFormatted: formatCurrencyFull(estimatedPayment),
    isEligible,
    eligibilityScore: Math.min(score, 100),
    eligibilityNotes: notes,
    daysUntilDeadline: days,
    urgency: getUrgencyLevel(program),
    actionRequired,
  };
}

// ─── Quick scan for public /payments tool (no auth required) ────────────────

export interface QuickScanInput {
  state: string;
  county: string;
  crops: { commodity: string; acres: number }[];
  hasLivestock: boolean;
  livestockType?: string;
  livestockCount?: number;
  hasCropInsurance: boolean;
  hasExperiencedDisaster: boolean;
}

export function quickScan(input: QuickScanInput): ScanSummary {
  const profile: FarmProfile = {
    state: input.state,
    county: input.county,
    crops: input.crops.map((c) => ({
      commodity: c.commodity,
      acres: c.acres,
      baseAcres: c.acres * 0.85, // rough estimate
      isIrrigated: false,
    })),
    livestock: input.hasLivestock && input.livestockType
      ? [{ type: input.livestockType, headCount: input.livestockCount || 0 }]
      : [],
    totalAcres: input.crops.reduce((sum, c) => sum + c.acres, 0),
    baseAcres: input.crops.reduce((sum, c) => sum + c.acres, 0) * 0.85,
    hasCropInsurance: input.hasCropInsurance,
    hasNAP: false,
    agi: 500000, // assume under cap
    isBeginningFarmer: false,
    isVeteran: false,
    isSociallyDisadvantaged: false,
    isDairyOperation: false,
    dairyProductionLbs: 0,
    hasExperiencedDisaster: input.hasExperiencedDisaster,
    disasterYear: 2024,
  };

  return scanForPayments(profile);
}
