import {
  calculateArcPlcValue,
  calculateEqipValue,
  calculateCrpValue,
  calculateCspValue,
  calculateFarmerBridgeValue,
  calculateCropInsuranceSavings,
} from '@/lib/calculations';
import { PROGRAMS } from '@/lib/program-data';

export interface ScreenerData {
  state: string;
  county: string;
  totalAcres: number;
  crops: string[];
  cropAcres: Record<string, number>;
  hasBaseAcres: string; // 'yes' | 'no' | 'not_sure'
  baseAcresAmount: number;
  currentPrograms: string[];
  conservationPractices: string[];
  farmerStatus: string[];
  hasCropInsurance: string;
  coverageLevel: string;
  hasScoEco: string;
  agiUnder900k: string;
  income75Farming: string;
  email: string;
  firstName: string;
  wantsUpdates: boolean;
}

export interface ProgramRecommendation {
  programId: string;
  programName: string;
  agency: string;
  status: 'likely_eligible' | 'may_qualify' | 'deadline_approaching';
  estimatedAnnualValue: { min: number; max: number };
  description: string;
  nextDeadline: { date: string; description: string; urgency: 'normal' | 'soon' | 'urgent' };
  actionSteps: string[];
  requiredForms: { number: string; name: string }[];
  officialLink: string;
  obbbaChanges?: string;
  isMissedProgram?: boolean;
  highlights?: string[];
}

function getProgramData(id: string) {
  return PROGRAMS.find((p) => p.id === id);
}

function statusOrder(status: ProgramRecommendation['status']): number {
  switch (status) {
    case 'deadline_approaching':
      return 0;
    case 'likely_eligible':
      return 1;
    case 'may_qualify':
      return 2;
    default:
      return 3;
  }
}

export function evaluateEligibility(data: ScreenerData): ProgramRecommendation[] {
  const recommendations: ProgramRecommendation[] = [];
  const isBeginning = data.farmerStatus.includes('beginning');
  const hasCrops = data.crops.some(
    (c) => c !== 'idle' && c !== 'livestock'
  );
  const hasLivestock = data.crops.includes('livestock');
  const practicesExcludingNone = data.conservationPractices.filter((p) => p !== 'none');
  const hasAnyConservation = practicesExcludingNone.length > 0;
  const inArcPlc = data.currentPrograms.some((p) =>
    ['arc_co', 'arc_ic', 'plc'].includes(p)
  );

  // ── ARC/PLC ──
  if (
    (data.hasBaseAcres === 'yes' || data.hasBaseAcres === 'not_sure') &&
    (data.agiUnder900k === 'yes' || data.agiUnder900k === 'not_sure')
  ) {
    const program = getProgramData('arc_plc')!;
    const value = calculateArcPlcValue(data);
    const highlights: string[] = [];
    const isMissedProgram = !inArcPlc;

    if (isMissedProgram) {
      highlights.push(
        'You may be leaving significant money on the table by not participating in ARC/PLC'
      );
    }
    if (isBeginning) {
      highlights.push(
        'As a beginning farmer, you may qualify for enhanced ARC/PLC benefits'
      );
    }

    recommendations.push({
      programId: 'arc_plc',
      programName: program.name,
      agency: program.agency,
      status: data.hasBaseAcres === 'yes' ? 'likely_eligible' : 'may_qualify',
      estimatedAnnualValue: value,
      description: program.description,
      nextDeadline: program.deadlines[0],
      actionSteps: [
        'Contact your local FSA office to verify base acres',
        'Complete the ARC/PLC election before the deadline',
        'File AD-1026 conservation compliance form',
      ],
      requiredForms: program.requiredForms,
      officialLink: program.officialLink,
      obbbaChanges: program.obbbaChanges,
      isMissedProgram,
      highlights,
    });
  }

  // ── EQIP ──
  {
    const program = getProgramData('eqip')!;
    const value = calculateEqipValue(data);
    const highlights: string[] = [];

    if (hasAnyConservation) {
      highlights.push(
        'STRONG CANDIDATE — your existing practices align well with EQIP'
      );
    }
    if (isBeginning) {
      highlights.push(
        'As a beginning farmer, you qualify for 90% cost-share and 50% advance payment'
      );
    }

    recommendations.push({
      programId: 'eqip',
      programName: program.name,
      agency: program.agency,
      status: hasAnyConservation ? 'likely_eligible' : 'may_qualify',
      estimatedAnnualValue: value,
      description: program.description,
      nextDeadline: program.deadlines[0],
      actionSteps: [
        'Contact your local NRCS office to discuss conservation planning',
        'Develop a conservation plan with NRCS technical staff',
        'Submit NRCS-CPA-1200 application before next batching date',
      ],
      requiredForms: program.requiredForms,
      officialLink: program.officialLink,
      obbbaChanges: program.obbbaChanges,
      highlights,
    });
  }

  // ── CRP ──
  {
    const hasIdleOrHay =
      data.crops.includes('idle') || data.crops.includes('hay_forage');
    const hasFilterOrWaterways =
      data.conservationPractices.includes('filter_strips') ||
      data.conservationPractices.includes('waterways');
    const qualifiesByCrops = hasIdleOrHay || hasFilterOrWaterways || hasAnyConservation;
    const qualifiesBySize = data.totalAcres > 100;

    if (qualifiesByCrops || qualifiesBySize) {
      const program = getProgramData('crp')!;
      const value = calculateCrpValue(data);

      recommendations.push({
        programId: 'crp',
        programName: program.name,
        agency: program.agency,
        status: 'deadline_approaching',
        estimatedAnnualValue: value,
        description: program.description,
        nextDeadline: program.deadlines[0],
        actionSteps: [
          'Contact your local FSA office about CRP eligibility',
          'General CRP Signup #66 is OPEN through April 17, 2026',
          'Evaluate which acres could benefit from CRP enrollment',
        ],
        requiredForms: program.requiredForms,
        officialLink: program.officialLink,
        obbbaChanges: program.obbbaChanges,
        highlights: [],
      });
    }
  }

  // ── CSP ──
  if (practicesExcludingNone.length >= 2) {
    const program = getProgramData('csp')!;
    const value = calculateCspValue(data);

    recommendations.push({
      programId: 'csp',
      programName: program.name,
      agency: program.agency,
      status: 'likely_eligible',
      estimatedAnnualValue: value,
      description: program.description,
      nextDeadline: program.deadlines[0],
      actionSteps: [
        'Contact your local NRCS office to discuss CSP eligibility',
        'Document your current conservation activities',
        'Submit NRCS-CPA-1200 application',
      ],
      requiredForms: program.requiredForms,
      officialLink: program.officialLink,
      obbbaChanges: program.obbbaChanges,
      highlights: [
        "CSP rewards what you're ALREADY doing — no new practices required initially",
      ],
    });
  }

  // ── Federal Crop Insurance ──
  if (hasCrops) {
    const program = getProgramData('crop_insurance')!;
    const value = calculateCropInsuranceSavings(data);
    const highlights: string[] = [];
    const hasCropInsurance = data.hasCropInsurance.startsWith('yes');
    const coverageNum = parseInt(data.coverageLevel, 10) || 0;
    const hasScoEco = data.hasScoEco === 'yes';

    let status: ProgramRecommendation['status'];

    if (!hasCropInsurance) {
      status = 'deadline_approaching';
      highlights.push('CRITICAL GAP — You have no safety net for crop losses');
    } else if (hasCropInsurance && !hasScoEco) {
      status = 'may_qualify';
      highlights.push(
        'NEW: SCO and ECO endorsements now subsidized at 80% under OBBBA'
      );
    } else {
      status = 'may_qualify';
    }

    if (hasCropInsurance && coverageNum < 80) {
      highlights.push(
        'Consider increasing coverage — OBBBA raised subsidies significantly'
      );
    }

    if (isBeginning) {
      highlights.push(
        'As a beginning farmer, you receive +10-15 percentage points additional premium subsidy'
      );
    }

    recommendations.push({
      programId: 'crop_insurance',
      programName: program.name,
      agency: program.agency,
      status,
      estimatedAnnualValue: value,
      description: program.description,
      nextDeadline: program.deadlines[0],
      actionSteps: [
        'Contact a crop insurance agent before the March 15 deadline',
        '2026 projected prices: Corn $4.62/bu, Soybeans $11.09/bu',
        'Compare RP, YP, and RPHPE policy options',
        'Ask about SCO and ECO endorsement options',
      ],
      requiredForms: program.requiredForms,
      officialLink: program.officialLink,
      obbbaChanges: program.obbbaChanges,
      highlights,
    });
  }

  // ── Farmer Bridge Assistance ──
  if (
    (data.crops.includes('corn') ||
      data.crops.includes('soybeans') ||
      data.crops.includes('wheat')) &&
    (data.agiUnder900k === 'yes' || data.agiUnder900k === 'not_sure')
  ) {
    const program = getProgramData('farmer_bridge')!;
    const value = calculateFarmerBridgeValue(data);

    recommendations.push({
      programId: 'farmer_bridge',
      programName: program.name,
      agency: program.agency,
      status: 'deadline_approaching',
      estimatedAnnualValue: value,
      description: program.description,
      nextDeadline: program.deadlines[0],
      actionSteps: [
        'File FSA-578 acreage report for 2025 if not already done',
        'Apply at your local FSA office before April 17, 2026',
        'Set up direct deposit with SF-3881',
      ],
      requiredForms: program.requiredForms,
      officialLink: program.officialLink,
      obbbaChanges: program.obbbaChanges,
      highlights: ["This is a ONE-TIME program. Don't miss it."],
    });
  }

  // ── Disaster Programs ──
  {
    const program = getProgramData('disaster')!;
    const highlights: string[] = [];

    if (hasLivestock) {
      highlights.push(
        'As a livestock producer, you should be aware of LFP (Livestock Forage Disaster) and LIP (Livestock Indemnity Program)'
      );
    }

    recommendations.push({
      programId: 'disaster',
      programName: program.name,
      agency: program.agency,
      status: 'may_qualify',
      estimatedAnnualValue: { min: 0, max: 0 },
      description:
        'Suite of permanently authorized disaster assistance programs. These activate after qualifying losses — no pre-enrollment needed for most programs.',
      nextDeadline: program.deadlines[0],
      actionSteps: [
        'File Notice of Loss within 30 days of any livestock death, feed loss, or crop damage',
        'Contact your FSA office immediately after any qualifying loss event',
        'Consider NAP coverage for crops not covered by Federal crop insurance',
      ],
      requiredForms: program.requiredForms,
      officialLink: program.officialLink,
      obbbaChanges: program.obbbaChanges,
      highlights,
    });
  }

  // ── Beginning Farmer Bonus Card ──
  if (isBeginning) {
    recommendations.push({
      programId: 'beginning_farmer_bonus',
      programName: 'Beginning Farmer Enhanced Benefits',
      agency: 'FSA / NRCS / RMA',
      status: 'likely_eligible',
      estimatedAnnualValue: { min: 0, max: 0 },
      description:
        'As a beginning farmer (farming less than 10 years), you qualify for significantly enhanced benefits across multiple USDA programs.',
      nextDeadline: { date: '2026-12-31', description: 'Benefits available year-round', urgency: 'normal' },
      actionSteps: [
        'Inform your local FSA and NRCS offices of your beginning farmer status',
        'Ask your crop insurance agent about the beginning farmer premium subsidy',
        'Apply for FSA microloans or direct farm ownership loans',
      ],
      requiredForms: [],
      officialLink: 'https://www.fsa.usda.gov/programs-and-services/farm-loan-programs',
      highlights: [
        'EQIP: 90% cost-share rate (vs. 75% standard) and 50% advance payment',
        'Crop Insurance: +10-15 percentage points additional premium subsidy for up to 10 years, CAT fee waived',
        'CRP: Transition Incentives Program (TIP) eligibility, ownership requirement waived',
        'CSP: 5% funding set-aside for beginning farmers',
        'FSA Loans: Favorable terms up to $600,000 for direct farm ownership',
      ],
    });
  }

  // ── Sort results ──
  // isMissedProgram first, then deadline_approaching, then likely_eligible, then may_qualify
  // Within each group, sort by estimated max value descending
  recommendations.sort((a, b) => {
    // Missed programs always come first
    if (a.isMissedProgram && !b.isMissedProgram) return -1;
    if (!a.isMissedProgram && b.isMissedProgram) return 1;

    // Then sort by status priority
    const statusDiff = statusOrder(a.status) - statusOrder(b.status);
    if (statusDiff !== 0) return statusDiff;

    // Within same group, sort by max value descending
    return b.estimatedAnnualValue.max - a.estimatedAnnualValue.max;
  });

  return recommendations;
}
