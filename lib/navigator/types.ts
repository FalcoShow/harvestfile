// =============================================================================
// HarvestFile USDA Program Navigator — Type Definitions
// Phase 33 Build 1
// =============================================================================

// ─── Wizard Input Types ─────────────────────────────────────────────────────

export type OperationType =
  | 'row_crops'
  | 'livestock'
  | 'dairy'
  | 'specialty_crops'
  | 'forestry'
  | 'aquaculture'
  | 'honeybees'
  | 'organic';

export type ProducerStatus =
  | 'beginning'
  | 'veteran'
  | 'socially_disadvantaged'
  | 'limited_resource';

export type NeedType =
  | 'price_support'
  | 'disaster_recovery'
  | 'conservation'
  | 'financing'
  | 'expansion'
  | 'organic_transition'
  | 'risk_management';

export type LandTenure = 'own' | 'rent' | 'both';

export type ConfidenceTier = 'likely' | 'possible' | 'unlikely';

export type ProgramAgency = 'FSA' | 'NRCS' | 'RMA' | 'RD';

export type ProgramCategory =
  | 'commodity'
  | 'conservation'
  | 'disaster'
  | 'loan'
  | 'specialty';

// ─── Farmer Profile (Wizard Output) ─────────────────────────────────────────

export interface FarmerProfile {
  // Phase 1 — High-discrimination filters
  operationTypes: OperationType[];
  needs: NeedType[];
  producerStatuses: ProducerStatus[];
  state: string;
  county?: string;

  // Phase 2 — Targeted details (conditional)
  crops?: string[];
  livestock?: string[];
  farmSizeAcres?: number;
  annualRevenue?: number;
  landTenure?: LandTenure;
  yearsExperience?: number;

  // Phase 3 — Precision matching (conditional)
  hasCropInsurance?: boolean;
  hasBaseAcres?: boolean;
  hasExistingConservationPlan?: boolean;
  recentDisasterLoss?: boolean;
  isOrganic?: boolean;
  isDairy?: boolean;
  dairyProductionLbs?: number;
}

// ─── Program Definition ─────────────────────────────────────────────────────

export interface ProgramConditions {
  // Operation type matching — at least one must match (OR logic)
  requiredOperationTypes?: OperationType[];
  // If set, program is excluded when farmer has these types
  excludedOperationTypes?: OperationType[];
  // Need matching — at least one must match (OR logic)
  relevantNeeds?: NeedType[];
  // Producer status — if set, ONLY these statuses qualify
  requiredProducerStatuses?: ProducerStatus[];
  // Binary requirements
  requiresBaseAcres?: boolean;
  requiresCropInsurance?: boolean;
  requiresDisasterLoss?: boolean;
  requiresOrganic?: boolean;
  requiresDairy?: boolean;
  requiresLandOwnership?: boolean;
  hasExistingConservationPlan?: boolean;
  // Numeric thresholds
  minFarmSizeAcres?: number;
  maxFarmSizeAcres?: number;
  maxAnnualRevenue?: number;
  maxYearsExperience?: number;
  // Specific commodity matching
  specificCrops?: string[];
  specificLivestock?: string[];
}

export interface USDAProgram {
  id: string;
  slug: string;
  name: string;
  acronym: string;
  agency: ProgramAgency;
  category: ProgramCategory;
  description: string;
  eligibilitySummary: string;
  estimatedValue: string;
  paymentType: string;
  deadlineInfo: string;
  deadlineDate?: string;
  formsRequired: string[];
  applyUrl: string;
  learnMoreUrl: string;
  conditions: ProgramConditions;
  // Bonus score factors for enhanced matching
  bonusFactors?: {
    field: keyof FarmerProfile;
    value: unknown;
    bonus: number;
    reason: string;
  }[];
}

// ─── Match Results ──────────────────────────────────────────────────────────

export interface ProgramMatch {
  program: USDAProgram;
  confidence: ConfidenceTier;
  score: number; // 0-100
  matchReasons: string[];
  missedCriteria?: string[];
}

export interface NavigatorResults {
  profile: FarmerProfile;
  matches: ProgramMatch[];
  totalProgramsEvaluated: number;
  likelyCount: number;
  possibleCount: number;
  estimatedTotalValue: string;
  generatedAt: string;
}

// ─── Wizard Step Types ──────────────────────────────────────────────────────

export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  field: keyof FarmerProfile;
  type: 'multi_select' | 'single_select' | 'number' | 'location' | 'boolean';
  options?: WizardOption[];
  condition?: (profile: Partial<FarmerProfile>) => boolean;
  required: boolean;
}

export interface WizardOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}
