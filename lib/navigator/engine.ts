// =============================================================================
// HarvestFile USDA Program Navigator — Matching Engine
// Phase 33 Build 1
//
// Evaluates a farmer's profile against all 43+ USDA programs and returns
// scored matches with confidence tiers (likely/possible/unlikely).
// =============================================================================

import {
  FarmerProfile,
  USDAProgram,
  ProgramMatch,
  NavigatorResults,
  ConfidenceTier,
} from './types';
import { USDA_PROGRAMS } from './programs';

// ─── Score Thresholds ───────────────────────────────────────────────────────

const LIKELY_THRESHOLD = 70;    // 70+ = Likely Eligible (green)
const POSSIBLE_THRESHOLD = 40;  // 40-69 = Might Be Eligible (amber)
                                 // <40 = Unlikely (gray, collapsed)

// ─── Core Matching Function ─────────────────────────────────────────────────

export function matchPrograms(profile: FarmerProfile): NavigatorResults {
  const matches: ProgramMatch[] = [];

  for (const program of USDA_PROGRAMS) {
    const result = evaluateProgram(program, profile);
    matches.push(result);
  }

  // Sort: likely first, then possible, then unlikely — within each tier, by score descending
  matches.sort((a, b) => {
    const tierOrder = { likely: 0, possible: 1, unlikely: 2 };
    const tierDiff = tierOrder[a.confidence] - tierOrder[b.confidence];
    if (tierDiff !== 0) return tierDiff;
    return b.score - a.score;
  });

  const likelyCount = matches.filter(m => m.confidence === 'likely').length;
  const possibleCount = matches.filter(m => m.confidence === 'possible').length;

  // Estimate total potential value from likely matches
  const estimatedTotalValue = estimateTotalValue(
    matches.filter(m => m.confidence === 'likely' || m.confidence === 'possible')
  );

  return {
    profile,
    matches,
    totalProgramsEvaluated: USDA_PROGRAMS.length,
    likelyCount,
    possibleCount,
    estimatedTotalValue,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Program Evaluation ─────────────────────────────────────────────────────

function evaluateProgram(program: USDAProgram, profile: FarmerProfile): ProgramMatch {
  let score = 0;
  const matchReasons: string[] = [];
  const missedCriteria: string[] = [];
  const conditions = program.conditions;

  // ── Operation Type Matching (30 points max) ────────────────────────────
  if (conditions.requiredOperationTypes && conditions.requiredOperationTypes.length > 0) {
    const hasMatchingType = conditions.requiredOperationTypes.some(
      type => profile.operationTypes.includes(type)
    );
    if (hasMatchingType) {
      score += 30;
      const matchedTypes = conditions.requiredOperationTypes.filter(
        type => profile.operationTypes.includes(type)
      );
      matchReasons.push(`Your ${matchedTypes.join(', ').replace(/_/g, ' ')} operation qualifies`);
    } else {
      missedCriteria.push(
        `Requires ${conditions.requiredOperationTypes.join(' or ').replace(/_/g, ' ')} operation`
      );
    }
  } else {
    // No operation type restriction — universal program
    score += 20;
    matchReasons.push('Available to all farm types');
  }

  // ── Excluded Operation Types (disqualifier) ────────────────────────────
  if (conditions.excludedOperationTypes) {
    const isExcluded = conditions.excludedOperationTypes.some(
      type => profile.operationTypes.includes(type)
    );
    if (isExcluded) {
      return {
        program,
        confidence: 'unlikely',
        score: 0,
        matchReasons: [],
        missedCriteria: ['Your operation type is not eligible for this program'],
      };
    }
  }

  // ── Need Matching (20 points max) ──────────────────────────────────────
  if (conditions.relevantNeeds && conditions.relevantNeeds.length > 0) {
    const matchingNeeds = conditions.relevantNeeds.filter(
      need => profile.needs.includes(need)
    );
    if (matchingNeeds.length > 0) {
      score += 15 + Math.min(matchingNeeds.length * 5, 15);
      matchReasons.push(`Addresses your ${matchingNeeds[0].replace(/_/g, ' ')} needs`);
    } else {
      // Needs don't match but program might still be relevant
      score += 5;
    }
  } else {
    score += 10;
  }

  // ── Producer Status Matching (15 points max) ───────────────────────────
  if (conditions.requiredProducerStatuses && conditions.requiredProducerStatuses.length > 0) {
    const hasMatchingStatus = conditions.requiredProducerStatuses.some(
      status => profile.producerStatuses.includes(status)
    );
    if (hasMatchingStatus) {
      score += 15;
      matchReasons.push('Your producer status qualifies for enhanced benefits');
    } else {
      // Hard requirement — disqualify
      return {
        program,
        confidence: 'unlikely',
        score: Math.max(score - 20, 0),
        matchReasons,
        missedCriteria: [
          `Limited to ${conditions.requiredProducerStatuses.join(', ').replace(/_/g, ' ')} producers`,
        ],
      };
    }
  } else if (profile.producerStatuses.length > 0) {
    // No requirement but farmer has a status — often means enhanced rates
    score += 5;
  }

  // ── Binary Requirements ────────────────────────────────────────────────

  // Base acres
  if (conditions.requiresBaseAcres === true) {
    if (profile.hasBaseAcres === true) {
      score += 10;
      matchReasons.push('You have base acres on file');
    } else if (profile.hasBaseAcres === false) {
      missedCriteria.push('Requires base acres on file with FSA');
      score -= 15;
    } else {
      // Unknown — don't penalize, flag as possible
      missedCriteria.push('Verify you have base acres on file with FSA');
    }
  }

  // Dairy requirement
  if (conditions.requiresDairy === true) {
    const isDairy = profile.operationTypes.includes('dairy') || profile.isDairy === true;
    if (isDairy) {
      score += 15;
      matchReasons.push('Your dairy operation qualifies');
    } else {
      return {
        program,
        confidence: 'unlikely',
        score: 0,
        matchReasons: [],
        missedCriteria: ['This program is exclusively for dairy producers'],
      };
    }
  }

  // Crop insurance
  if (conditions.requiresCropInsurance === true) {
    if (profile.hasCropInsurance === true) {
      score += 5;
      matchReasons.push('Your crop insurance coverage meets requirements');
    } else if (profile.hasCropInsurance === false) {
      missedCriteria.push('Requires active crop insurance coverage');
      score -= 10;
    }
  }

  // Disaster loss
  if (conditions.requiresDisasterLoss === true) {
    if (profile.recentDisasterLoss === true) {
      score += 15;
      matchReasons.push('Your reported disaster loss qualifies you for assistance');
    } else if (profile.recentDisasterLoss === false) {
      missedCriteria.push('Requires documented disaster loss');
      score -= 20;
    } else {
      // Unknown — still show it but lower confidence
      score -= 5;
      missedCriteria.push('Verify disaster loss eligibility with your local FSA office');
    }
  }

  // Organic
  if (conditions.requiresOrganic === true) {
    if (profile.isOrganic === true) {
      score += 15;
      matchReasons.push('Your organic certification qualifies');
    } else if (profile.isOrganic === false) {
      return {
        program,
        confidence: 'unlikely',
        score: 0,
        matchReasons: [],
        missedCriteria: ['Requires organic certification'],
      };
    }
  }

  // Land ownership
  if (conditions.requiresLandOwnership === true) {
    if (profile.landTenure === 'own' || profile.landTenure === 'both') {
      score += 5;
      matchReasons.push('You own eligible land');
    } else if (profile.landTenure === 'rent') {
      missedCriteria.push('Requires land ownership (not just rental)');
      score -= 10;
    }
  }

  // Conservation plan
  if (conditions.hasExistingConservationPlan === true) {
    if (profile.hasExistingConservationPlan === true) {
      score += 10;
      matchReasons.push('Your existing conservation practices strengthen eligibility');
    } else if (profile.hasExistingConservationPlan === false) {
      missedCriteria.push('Requires existing conservation practices meeting minimum thresholds');
      score -= 5;
    }
  }

  // ── Numeric Thresholds ─────────────────────────────────────────────────

  if (conditions.maxYearsExperience !== undefined && profile.yearsExperience !== undefined) {
    if (profile.yearsExperience <= conditions.maxYearsExperience) {
      score += 5;
    } else {
      missedCriteria.push(`Limited to producers with ${conditions.maxYearsExperience} or fewer years of experience`);
      score -= 10;
    }
  }

  if (conditions.maxAnnualRevenue !== undefined && profile.annualRevenue !== undefined) {
    if (profile.annualRevenue <= conditions.maxAnnualRevenue) {
      score += 5;
    } else {
      missedCriteria.push('Your annual revenue exceeds program limits');
      score -= 15;
    }
  }

  // ── Bonus Factors ──────────────────────────────────────────────────────
  if (program.bonusFactors) {
    for (const bonus of program.bonusFactors) {
      const fieldValue = profile[bonus.field];
      if (Array.isArray(fieldValue)) {
        if (fieldValue.includes(bonus.value as never)) {
          score += bonus.bonus;
          matchReasons.push(bonus.reason);
        }
      } else if (fieldValue === bonus.value) {
        score += bonus.bonus;
        matchReasons.push(bonus.reason);
      }
    }
  }

  // ── Clamp and classify ─────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  let confidence: ConfidenceTier;
  if (score >= LIKELY_THRESHOLD) {
    confidence = 'likely';
  } else if (score >= POSSIBLE_THRESHOLD) {
    confidence = 'possible';
  } else {
    confidence = 'unlikely';
  }

  return {
    program,
    confidence,
    score,
    matchReasons: Array.from(new Set(matchReasons)), // Deduplicate
    missedCriteria: Array.from(new Set(missedCriteria)),
  };
}

// ─── Value Estimation ───────────────────────────────────────────────────────

function estimateTotalValue(matches: ProgramMatch[]): string {
  // Conservative estimate based on program categories
  let lowEstimate = 0;
  let highEstimate = 0;

  for (const match of matches) {
    const { category } = match.program;

    switch (category) {
      case 'commodity':
        lowEstimate += 2000;
        highEstimate += 50000;
        break;
      case 'conservation':
        lowEstimate += 3000;
        highEstimate += 40000;
        break;
      case 'disaster':
        lowEstimate += 1000;
        highEstimate += 100000;
        break;
      case 'loan':
        lowEstimate += 5000;
        highEstimate += 400000;
        break;
      case 'specialty':
        lowEstimate += 750;
        highEstimate += 250000;
        break;
    }
  }

  if (highEstimate === 0) return '$0';

  const formatValue = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${Math.round(v / 1000)}K`;
    return `$${v}`;
  };

  return `${formatValue(lowEstimate)}–${formatValue(highEstimate)}`;
}

// ─── Quick Summary for Cross-Tool Use ───────────────────────────────────────

export function getQuickProgramCount(profile: Partial<FarmerProfile>): number {
  // Lightweight version for real-time counter during wizard
  const fullProfile: FarmerProfile = {
    operationTypes: profile.operationTypes || [],
    needs: profile.needs || [],
    producerStatuses: profile.producerStatuses || [],
    state: profile.state || '',
    ...profile,
  };

  const results = matchPrograms(fullProfile);
  return results.likelyCount + results.possibleCount;
}

// ─── Category Summary ───────────────────────────────────────────────────────

export function getCategorySummary(results: NavigatorResults) {
  const categories = ['commodity', 'conservation', 'disaster', 'loan', 'specialty'] as const;

  return categories.map(cat => {
    const catMatches = results.matches.filter(
      m => m.program.category === cat && m.confidence !== 'unlikely'
    );
    return {
      category: cat,
      label: {
        commodity: 'Commodity & Safety Net',
        conservation: 'Conservation',
        disaster: 'Disaster Assistance',
        loan: 'Farm Loans',
        specialty: 'Specialty & Grants',
      }[cat],
      count: catMatches.length,
      topProgram: catMatches[0]?.program.name || null,
    };
  }).filter(c => c.count > 0);
}
