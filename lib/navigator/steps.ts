// =============================================================================
// HarvestFile USDA Program Navigator — Wizard Steps Configuration
// Phase 33 Build 1
//
// Defines the multi-step wizard flow with conditional branching.
// Each step shows one question per screen (TurboTax pattern).
// Steps with conditions only appear when relevant.
// =============================================================================

import { WizardStep, FarmerProfile } from './types';

export const WIZARD_STEPS: WizardStep[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — High-discrimination filters (always shown)
  // These 4 screens eliminate ~60% of irrelevant programs
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'operation-type',
    title: 'What type of farming operation do you run?',
    subtitle: 'Select all that apply to your operation',
    field: 'operationTypes',
    type: 'multi_select',
    required: true,
    options: [
      { value: 'row_crops', label: 'Row Crops', description: 'Corn, soybeans, wheat, cotton, rice, sorghum, barley, oats' },
      { value: 'livestock', label: 'Livestock', description: 'Cattle, hogs, sheep, goats, poultry' },
      { value: 'dairy', label: 'Dairy', description: 'Milk production and dairy cattle' },
      { value: 'specialty_crops', label: 'Specialty Crops', description: 'Fruits, vegetables, tree nuts, nursery, horticulture' },
      { value: 'forestry', label: 'Forestry', description: 'Timber, non-industrial private forest' },
      { value: 'aquaculture', label: 'Aquaculture', description: 'Farm-raised fish and shellfish' },
      { value: 'honeybees', label: 'Honeybees', description: 'Beekeeping and pollination services' },
      { value: 'organic', label: 'Organic', description: 'Certified organic or transitioning' },
    ],
  },

  {
    id: 'needs',
    title: 'What do you need help with right now?',
    subtitle: 'Select all that apply — this helps us find the best programs for you',
    field: 'needs',
    type: 'multi_select',
    required: true,
    options: [
      { value: 'price_support', label: 'Price & Revenue Protection', description: 'Safety net when commodity prices drop' },
      { value: 'risk_management', label: 'Risk Management', description: 'Crop insurance, coverage gaps, weather protection' },
      { value: 'disaster_recovery', label: 'Disaster Recovery', description: 'Lost crops, livestock, or land to drought, flood, or storms' },
      { value: 'conservation', label: 'Conservation & Stewardship', description: 'Cost-share for fencing, cover crops, water quality, wildlife' },
      { value: 'financing', label: 'Financing & Loans', description: 'Operating capital, land purchase, equipment financing' },
      { value: 'expansion', label: 'Growing My Operation', description: 'New markets, value-added products, infrastructure' },
      { value: 'organic_transition', label: 'Organic Transition', description: 'Certification costs, transition support' },
    ],
  },

  {
    id: 'producer-status',
    title: 'Do any of these describe you?',
    subtitle: 'Many USDA programs offer enhanced benefits and priority access for these groups',
    field: 'producerStatuses',
    type: 'multi_select',
    required: false,
    options: [
      { value: 'beginning', label: 'Beginning Farmer', description: 'Farming for 10 years or less (expanded from 5 under OBBBA)' },
      { value: 'veteran', label: 'Veteran', description: 'Military veteran transitioning to or involved in agriculture' },
      { value: 'socially_disadvantaged', label: 'Socially Disadvantaged', description: 'Member of a group subjected to racial/ethnic prejudice (as defined by USDA)' },
      { value: 'limited_resource', label: 'Limited Resource', description: 'Below-median household income for your area' },
    ],
  },

  {
    id: 'location',
    title: 'Where is your farm located?',
    subtitle: 'Program availability and payment rates vary by county',
    field: 'state',
    type: 'location',
    required: true,
    options: [], // Populated dynamically with state/county dropdowns
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Targeted details (conditional on Phase 1 answers)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'farm-size',
    title: 'How many acres do you farm?',
    subtitle: 'Include all land — owned, rented, and leased',
    field: 'farmSizeAcres',
    type: 'number',
    required: false,
  },

  {
    id: 'land-tenure',
    title: 'Do you own or rent your farmland?',
    field: 'landTenure',
    type: 'single_select',
    required: false,
    options: [
      { value: 'own', label: 'I own my land' },
      { value: 'rent', label: 'I rent / lease all my land' },
      { value: 'both', label: 'I own some and rent some' },
    ],
  },

  {
    id: 'years-experience',
    title: 'How many years have you been farming?',
    subtitle: 'Beginning farmers (10 years or less) qualify for enhanced benefits across many programs',
    field: 'yearsExperience',
    type: 'number',
    required: false,
    condition: (profile) => {
      // Show if they didn't already select "beginning" in producer status
      return !profile.producerStatuses?.includes('beginning');
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — Precision matching (conditional)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'base-acres',
    title: 'Do you have base acres on file with FSA?',
    subtitle: 'Base acres determine eligibility for ARC and PLC commodity programs. If unsure, select "Not sure."',
    field: 'hasBaseAcres',
    type: 'single_select',
    required: false,
    condition: (profile) => profile.operationTypes?.includes('row_crops') === true,
    options: [
      { value: 'true', label: 'Yes, I have base acres' },
      { value: 'false', label: 'No base acres on file' },
      { value: 'unsure', label: 'Not sure' },
    ],
  },

  {
    id: 'crop-insurance',
    title: 'Do you have federal crop insurance?',
    subtitle: 'Some programs require crop insurance, others specifically cover gaps in insurance',
    field: 'hasCropInsurance',
    type: 'single_select',
    required: false,
    condition: (profile) =>
      profile.operationTypes?.includes('row_crops') === true ||
      profile.operationTypes?.includes('specialty_crops') === true,
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
      { value: 'unsure', label: 'Not sure' },
    ],
  },

  {
    id: 'disaster-loss',
    title: 'Have you experienced crop or livestock losses from a disaster in the past 2 years?',
    subtitle: 'Drought, flood, tornado, wildfire, extreme cold, disease outbreak, or other natural disaster',
    field: 'recentDisasterLoss',
    type: 'single_select',
    required: false,
    condition: (profile) => profile.needs?.includes('disaster_recovery') === true,
    options: [
      { value: 'true', label: 'Yes, I had disaster losses' },
      { value: 'false', label: 'No recent disaster losses' },
    ],
  },

  {
    id: 'conservation-plan',
    title: 'Do you currently have conservation practices in place?',
    subtitle: 'Cover crops, no-till, buffer strips, nutrient management plans, etc.',
    field: 'hasExistingConservationPlan',
    type: 'single_select',
    required: false,
    condition: (profile) => profile.needs?.includes('conservation') === true,
    options: [
      { value: 'true', label: 'Yes, I have existing practices' },
      { value: 'false', label: 'No, but I\'m interested in starting' },
    ],
  },

  {
    id: 'organic-status',
    title: 'Are you certified organic or transitioning to organic?',
    field: 'isOrganic',
    type: 'single_select',
    required: false,
    condition: (profile) =>
      profile.operationTypes?.includes('organic') === true ||
      profile.needs?.includes('organic_transition') === true,
    options: [
      { value: 'true', label: 'Yes, certified or in transition' },
      { value: 'false', label: 'No' },
    ],
  },
];

// ─── Helper: Get visible steps based on current profile ─────────────────────

export function getVisibleSteps(profile: Partial<FarmerProfile>): WizardStep[] {
  return WIZARD_STEPS.filter(step => {
    if (!step.condition) return true;
    return step.condition(profile);
  });
}

// ─── Helper: Get step by ID ─────────────────────────────────────────────────

export function getStepById(id: string): WizardStep | undefined {
  return WIZARD_STEPS.find(step => step.id === id);
}

// ─── Helper: Calculate progress percentage ──────────────────────────────────

export function getProgress(currentStepIndex: number, profile: Partial<FarmerProfile>): number {
  const visibleSteps = getVisibleSteps(profile);
  if (visibleSteps.length <= 1) return 0;
  return Math.round((currentStepIndex / (visibleSteps.length - 1)) * 100);
}
