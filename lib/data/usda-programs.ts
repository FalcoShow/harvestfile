// ─── USDA Programs Database ──────────────────────────────────────────────────
// Complete typed catalog of every active USDA program with open or upcoming
// enrollment. Used by the Payment Hunter engine to match farmer profiles
// against eligible programs and estimate potential payments.
//
// Data sources: FSA.usda.gov, Farmers.gov, Federal Register, AFBF Market Intel
// Last updated: 2026-03-21
// ─────────────────────────────────────────────────────────────────────────────

export type ProgramCategory =
  | 'commodity'
  | 'disaster'
  | 'conservation'
  | 'livestock'
  | 'insurance'
  | 'bridge';

export type FarmType = 'crop' | 'livestock' | 'dairy' | 'specialty' | 'all';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface PaymentRate {
  commodity: string;
  rate: number;
  unit: string; // e.g., '$/acre', '$/head', '$/cwt'
}

export interface USDAProgram {
  id: string;
  name: string;
  abbreviation: string;
  category: ProgramCategory;
  farmTypes: FarmType[];
  description: string;
  totalFunding: string; // e.g., '$12 billion'
  totalFundingNumeric: number; // in dollars for sorting
  enrollmentOpen: string; // ISO date
  enrollmentClose: string; // ISO date or 'ongoing'
  paymentLimit: number; // per person
  agiCap: number; // adjusted gross income cap, 0 = no cap
  requiresCropInsurance: boolean;
  requiresLoginGov: boolean;
  enrollmentUrl: string;
  factSheetUrl: string;
  paymentRates: PaymentRate[];
  eligibilityCriteria: string[];
  coveredCropYears: string; // e.g., '2024-2025'
  estimatePayment: (profile: FarmProfile) => number; // returns estimated $/year
}

export interface FarmProfile {
  state: string;
  county: string;
  crops: CropEntry[];
  livestock: LivestockEntry[];
  totalAcres: number;
  baseAcres: number;
  hasCropInsurance: boolean;
  hasNAP: boolean;
  agi: number; // adjusted gross income
  isBeginningFarmer: boolean;
  isVeteran: boolean;
  isSociallyDisadvantaged: boolean;
  isDairyOperation: boolean;
  dairyProductionLbs: number;
  hasExperiencedDisaster: boolean;
  disasterYear: number;
}

export interface CropEntry {
  commodity: string;
  acres: number;
  baseAcres: number;
  isIrrigated: boolean;
}

export interface LivestockEntry {
  type: string; // cattle, hogs, poultry, sheep, honeybees, fish
  headCount: number;
}

// ─── FBA Per-Acre Payment Rates (Published by FSA, February 2026) ────────────

const FBA_RATES: PaymentRate[] = [
  { commodity: 'corn', rate: 44.36, unit: '$/acre' },
  { commodity: 'soybeans', rate: 30.88, unit: '$/acre' },
  { commodity: 'wheat', rate: 39.35, unit: '$/acre' },
  { commodity: 'cotton', rate: 117.35, unit: '$/acre' },
  { commodity: 'rice', rate: 132.89, unit: '$/acre' },
  { commodity: 'sorghum', rate: 33.21, unit: '$/acre' },
  { commodity: 'barley', rate: 36.42, unit: '$/acre' },
  { commodity: 'oats', rate: 28.15, unit: '$/acre' },
  { commodity: 'peanuts', rate: 89.67, unit: '$/acre' },
  { commodity: 'sunflowers', rate: 31.50, unit: '$/acre' },
  { commodity: 'canola', rate: 29.80, unit: '$/acre' },
  { commodity: 'dry peas', rate: 24.60, unit: '$/acre' },
  { commodity: 'lentils', rate: 26.75, unit: '$/acre' },
  { commodity: 'chickpeas', rate: 27.90, unit: '$/acre' },
  { commodity: 'safflower', rate: 25.40, unit: '$/acre' },
  { commodity: 'mustard seed', rate: 23.80, unit: '$/acre' },
  { commodity: 'crambe', rate: 22.50, unit: '$/acre' },
  { commodity: 'sesame', rate: 35.20, unit: '$/acre' },
  { commodity: 'flaxseed', rate: 27.10, unit: '$/acre' },
  { commodity: 'rapeseed', rate: 28.90, unit: '$/acre' },
];

// ─── Helper: Calculate FBA payment estimate ──────────────────────────────────

function estimateFBAPayment(profile: FarmProfile): number {
  let total = 0;
  for (const crop of profile.crops) {
    const rate = FBA_RATES.find(
      (r) => r.commodity.toLowerCase() === crop.commodity.toLowerCase()
    );
    if (rate) {
      total += rate.rate * crop.acres;
    }
  }
  // Cap at payment limit
  return Math.min(total, 155000);
}

// ─── Helper: Estimate SDRP payment (rough — based on 2023-2024 loss data) ────

function estimateSDRPPayment(profile: FarmProfile): number {
  if (!profile.hasExperiencedDisaster) return 0;
  if (!profile.hasCropInsurance) return 0;
  // Rough estimate: Stage 1 paid ~$15,000 average per producer
  // Stage 2 covers shallow losses averaging ~$8,000
  // This is a rough guide — actual payments depend on verified losses
  const estimatedPerAcre = 18; // conservative avg across commodities
  const total = profile.totalAcres * estimatedPerAcre;
  return Math.min(total, 125000);
}

// ─── Helper: Estimate ARC/PLC payment ────────────────────────────────────────

function estimateARCPLCPayment(profile: FarmProfile): number {
  // For 2025 crop year auto-payment (higher of ARC or PLC)
  // Rough estimate based on projected prices below reference prices
  let total = 0;
  const arcPlcRates: Record<string, number> = {
    corn: 32,
    soybeans: 18,
    wheat: 42,
    sorghum: 28,
    barley: 35,
    oats: 15,
    rice: 55,
    peanuts: 40,
    cotton: 65,
  };
  for (const crop of profile.crops) {
    const rate = arcPlcRates[crop.commodity.toLowerCase()];
    if (rate && crop.baseAcres > 0) {
      total += rate * crop.baseAcres * 0.85; // 85% of base acres
    }
  }
  return Math.min(total, 155000);
}

// ─── Helper: Estimate LFP payment ───────────────────────────────────────────

function estimateLFPPayment(profile: FarmProfile): number {
  const cattle = profile.livestock.find(
    (l) => l.type.toLowerCase() === 'cattle'
  );
  if (!cattle) return 0;
  // LFP pays per head based on drought severity
  // Average ~$50-80/head for moderate drought
  return Math.min(cattle.headCount * 65, 125000);
}

// ─── Helper: Estimate DMC payment ───────────────────────────────────────────

function estimateDMCPayment(profile: FarmProfile): number {
  if (!profile.isDairyOperation) return 0;
  // DMC Tier 1 covers up to 6M lbs at higher subsidy
  const coveredProduction = Math.min(profile.dairyProductionLbs, 6000000);
  // Estimated margin shortfall ~$2.50/cwt average
  const payment = (coveredProduction / 100) * 2.5;
  return Math.min(payment, 155000);
}

// ─── Helper: Estimate NAP payment ───────────────────────────────────────────

function estimateNAPPayment(profile: FarmProfile): number {
  if (profile.hasCropInsurance) return 0;
  if (!profile.hasExperiencedDisaster) return 0;
  // NAP covers uninsured crops — estimate based on acreage
  const estimatedPerAcre = 25;
  return Math.min(profile.totalAcres * estimatedPerAcre, 125000);
}

// ─── CRP estimate ───────────────────────────────────────────────────────────

function estimateCRPPayment(profile: FarmProfile): number {
  // Average CRP rental rate ~$95/acre nationally
  // Most new enrollments target marginal cropland
  const eligibleAcres = Math.min(profile.totalAcres * 0.1, 200); // assume 10% eligible
  return eligibleAcres * 95;
}

// ─── The Master Programs Database ────────────────────────────────────────────

export const USDA_PROGRAMS: USDAProgram[] = [
  {
    id: 'fba-2026',
    name: 'Farmer Bridge Assistance Program',
    abbreviation: 'FBA',
    category: 'bridge',
    farmTypes: ['crop', 'specialty'],
    description:
      'Direct per-acre payments to producers of covered commodities and specialty crops. $12 billion total — $11B for row crops, $1B for specialty crops. Payment based on 2024 or 2025 planted acres.',
    totalFunding: '$12 billion',
    totalFundingNumeric: 12_000_000_000,
    enrollmentOpen: '2026-02-23',
    enrollmentClose: '2026-04-17',
    paymentLimit: 155000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: true,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/income-support/farmer-bridge-assistance-fba-program',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/farmer-bridge-assistance-fba-program',
    paymentRates: FBA_RATES,
    eligibilityCriteria: [
      'Planted covered commodity or specialty crop in 2024 or 2025',
      'AGI under $900,000 (3-year average)',
      'Must have Login.gov account',
      'Payment limit: $155,000 per person',
      'Requires compliance with conservation and wetland provisions',
    ],
    coveredCropYears: '2024-2025',
    estimatePayment: estimateFBAPayment,
  },
  {
    id: 'sdrp-2026',
    name: 'Supplemental Disaster Relief Program',
    abbreviation: 'SDRP',
    category: 'disaster',
    farmTypes: ['crop', 'all'],
    description:
      'Disaster payments for 2023-2024 crop losses. Stage 1 uses pre-filled crop insurance data. Stage 2 covers shallow losses, uninsured losses, and quality losses. $16.09 billion total.',
    totalFunding: '$16.09 billion',
    totalFundingNumeric: 16_090_000_000,
    enrollmentOpen: '2025-07-21',
    enrollmentClose: '2026-04-30',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/programs/supplemental-disaster-relief-program-sdrp',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/supplemental-disaster-relief-program-sdrp',
    paymentRates: [],
    eligibilityCriteria: [
      'Experienced crop loss in 2023 or 2024',
      'Stage 1: Must have had crop insurance or NAP coverage',
      'Stage 2: Covers uninsured crops and shallow losses',
      'AGI under $900,000 (3-year average)',
      'Contact local FSA office to apply',
    ],
    coveredCropYears: '2023-2024',
    estimatePayment: estimateSDRPPayment,
  },
  {
    id: 'arc-plc-2025-auto',
    name: 'ARC/PLC 2025 Automatic Payment',
    abbreviation: 'ARC/PLC',
    category: 'commodity',
    farmTypes: ['crop'],
    description:
      'Under the OBBBA, all enrolled producers automatically receive the HIGHER of ARC-CO or PLC for the 2025 crop year — no election required. Payments expected October 2026. Estimated $13.5 billion total.',
    totalFunding: '$13.5 billion (est.)',
    totalFundingNumeric: 13_500_000_000,
    enrollmentOpen: '2026-01-01',
    enrollmentClose: '2026-09-30',
    paymentLimit: 155000,
    agiCap: 0, // eliminated for 75%+ farm income
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/programs/arc-plc',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/arc-plc',
    paymentRates: [],
    eligibilityCriteria: [
      'Must have base acres enrolled in ARC or PLC',
      'OBBBA provides automatic higher-of payment for 2025 only',
      'No annual election needed for 2025 crop year',
      'Payment limit: $155,000/person ($310,000/farm)',
      'Contact FSA to ensure enrollment is current',
    ],
    coveredCropYears: '2025',
    estimatePayment: estimateARCPLCPayment,
  },
  {
    id: 'arc-plc-2026-election',
    name: 'ARC/PLC 2026-2031 Election',
    abbreviation: 'ARC/PLC Election',
    category: 'commodity',
    farmTypes: ['crop'],
    description:
      'New annual election required under OBBBA for 2026-2031. Reference prices increased 10-21%. ARC guarantee raised to 90%. Up to 30 million new base acres being allocated. Must make a new election.',
    totalFunding: 'Annual (~$8-15B/year)',
    totalFundingNumeric: 10_000_000_000,
    enrollmentOpen: '2026-06-01',
    enrollmentClose: '2026-10-31',
    paymentLimit: 155000,
    agiCap: 0,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/programs/arc-plc',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/arc-plc',
    paymentRates: [],
    eligibilityCriteria: [
      'Must have base acres (existing or newly allocated under OBBBA)',
      'Annual election: ARC-CO or PLC for each covered commodity',
      'New base acres from 2019-2023 planting history',
      'Increased reference prices and payment limits apply',
      'Election window expected summer 2026',
    ],
    coveredCropYears: '2026-2031',
    estimatePayment: estimateARCPLCPayment,
  },
  {
    id: 'crp-general-2026',
    name: 'Conservation Reserve Program (General Signup)',
    abbreviation: 'CRP',
    category: 'conservation',
    farmTypes: ['crop', 'all'],
    description:
      'Annual rental payments for converting environmentally sensitive cropland to long-term conservation cover. 10-15 year contracts. Average payment ~$95/acre nationally.',
    totalFunding: '~$2 billion/year',
    totalFundingNumeric: 2_000_000_000,
    enrollmentOpen: '2026-03-09',
    enrollmentClose: '2026-04-17',
    paymentLimit: 50000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/programs/conservation-reserve-program',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/conservation-reserve-program',
    paymentRates: [],
    eligibilityCriteria: [
      'Cropland must have been planted 4 of 6 previous crop years',
      'Must be physically and legally capable of being planted',
      'Offers evaluated by Environmental Benefits Index (EBI)',
      'Contract length: 10-15 years',
      'Average rental rate: ~$95/acre (varies by county)',
    ],
    coveredCropYears: '2026+',
    estimatePayment: estimateCRPPayment,
  },
  {
    id: 'lfp-ongoing',
    name: 'Livestock Forage Disaster Program',
    abbreviation: 'LFP',
    category: 'livestock',
    farmTypes: ['livestock'],
    description:
      'Payments to eligible livestock producers who suffered grazing losses due to drought or wildfire. OBBBA reduced trigger from 8 to 4 consecutive weeks of drought. $1.24B in FY2022.',
    totalFunding: '~$1-2 billion/year',
    totalFundingNumeric: 1_500_000_000,
    enrollmentOpen: '2026-01-01',
    enrollmentClose: 'ongoing',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    paymentRates: [
      { commodity: 'cattle', rate: 65, unit: '$/head' },
      { commodity: 'sheep', rate: 12, unit: '$/head' },
      { commodity: 'goats', rate: 12, unit: '$/head' },
    ],
    eligibilityCriteria: [
      'County must have qualifying drought (D2+) for 4+ consecutive weeks (OBBBA)',
      'Or county adjacent to county with qualifying wildfire on federal land',
      'Must own or lease eligible livestock',
      'Must apply within 30 days of end of calendar year',
      'Reduced drought trigger under OBBBA: 4 weeks (was 8)',
    ],
    coveredCropYears: 'Ongoing',
    estimatePayment: estimateLFPPayment,
  },
  {
    id: 'lip-ongoing',
    name: 'Livestock Indemnity Program',
    abbreviation: 'LIP',
    category: 'livestock',
    farmTypes: ['livestock'],
    description:
      'Payments for livestock deaths caused by eligible disaster conditions, disease, or predation. OBBBA raised predation payments to 100% of market value and added unborn livestock coverage.',
    totalFunding: '~$500M/year',
    totalFundingNumeric: 500_000_000,
    enrollmentOpen: '2026-01-01',
    enrollmentClose: 'ongoing',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    paymentRates: [
      { commodity: 'cattle (adult)', rate: 1800, unit: '$/head' },
      { commodity: 'cattle (calf)', rate: 600, unit: '$/head' },
      { commodity: 'hogs', rate: 180, unit: '$/head' },
      { commodity: 'sheep', rate: 200, unit: '$/head' },
    ],
    eligibilityCriteria: [
      'Livestock deaths due to eligible weather event, disease, or predation',
      'Must file notice of loss within 30 days of event',
      'Predation losses paid at 100% of market value (OBBBA)',
      'Now covers unborn livestock losses (OBBBA)',
      '75% of market value for weather/disease deaths',
    ],
    coveredCropYears: 'Ongoing',
    estimatePayment: () => 0, // Requires specific loss data
  },
  {
    id: 'elap-ongoing',
    name: 'Emergency Assistance for Livestock, Honeybees, and Farm-Raised Fish',
    abbreviation: 'ELAP',
    category: 'livestock',
    farmTypes: ['livestock'],
    description:
      'Covers losses not addressed by LFP or LIP, including feed losses, water transportation costs, honeybee losses, and farm-raised fish losses. $248.8M in FY2022.',
    totalFunding: '~$250M/year',
    totalFundingNumeric: 250_000_000,
    enrollmentOpen: '2026-01-01',
    enrollmentClose: 'ongoing',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    paymentRates: [],
    eligibilityCriteria: [
      'Losses not covered by LFP or LIP',
      'Notice of loss: 30 days for livestock, 15 days for honeybees',
      'Fish losses from bird depredation at $600/acre minimum (OBBBA)',
      'Covers hauling water, feed transportation during drought',
      'Must apply by January 30 following the year of loss',
    ],
    coveredCropYears: 'Ongoing',
    estimatePayment: () => 0,
  },
  {
    id: 'tap-ongoing',
    name: 'Tree Assistance Program',
    abbreviation: 'TAP',
    category: 'disaster',
    farmTypes: ['specialty'],
    description:
      'Cost-share for replanting or rehabilitating trees, bushes, and vines damaged by natural disasters. OBBBA increased cost-share from 50% to 65% of replanting costs.',
    totalFunding: '~$100M/year',
    totalFundingNumeric: 100_000_000,
    enrollmentOpen: '2026-01-01',
    enrollmentClose: 'ongoing',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery',
    paymentRates: [],
    eligibilityCriteria: [
      'Trees, bushes, or vines lost to natural disaster',
      'Must exceed 15% mortality (normal mortality threshold)',
      'Cost-share: 65% of replanting costs (OBBBA, was 50%)',
      'Must apply within 90 days of disaster event',
      'Replanting must occur within 12 months',
    ],
    coveredCropYears: 'Ongoing',
    estimatePayment: () => 0,
  },
  {
    id: 'nap-ongoing',
    name: 'Noninsured Crop Disaster Assistance Program',
    abbreviation: 'NAP',
    category: 'disaster',
    farmTypes: ['crop', 'specialty'],
    description:
      'Disaster protection for crops not eligible for federal crop insurance. Basic coverage: 50% production loss trigger at 55% of average market price. Buy-up options available.',
    totalFunding: '~$200M/year',
    totalFundingNumeric: 200_000_000,
    enrollmentOpen: '2026-01-01',
    enrollmentClose: 'ongoing',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/programs/noninsured-crop-disaster-assistance-program',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/noninsured-crop-disaster-assistance-program',
    paymentRates: [],
    eligibilityCriteria: [
      'Crops without federal crop insurance coverage available',
      'Must apply BEFORE planting (deadlines vary by crop)',
      'Service fee: $325/crop/county, max $1,950 total',
      'Basic: 50% loss trigger at 55% market price',
      'Buy-up: up to 65% coverage at higher market price %',
    ],
    coveredCropYears: 'Ongoing',
    estimatePayment: estimateNAPPayment,
  },
  {
    id: 'dmc-2026',
    name: 'Dairy Margin Coverage',
    abbreviation: 'DMC',
    category: 'commodity',
    farmTypes: ['dairy'],
    description:
      'Margin protection for dairy operations when the difference between milk price and feed costs falls below a selected coverage level. OBBBA expanded Tier 1 to 6 million pounds.',
    totalFunding: '~$1 billion/year',
    totalFundingNumeric: 1_000_000_000,
    enrollmentOpen: '2026-01-12',
    enrollmentClose: '2026-02-26',
    paymentLimit: 155000,
    agiCap: 0,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/programs/dairy-margin-coverage',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/programs/dairy-margin-coverage',
    paymentRates: [],
    eligibilityCriteria: [
      'Active dairy operation with established production history',
      'Tier 1 expanded to 6 million lbs (OBBBA)',
      'Coverage levels: $4.00 to $9.50/cwt',
      'Premium rates lower for Tier 1 production',
      '2026 enrollment closed February 26',
    ],
    coveredCropYears: '2026',
    estimatePayment: estimateDMCPayment,
  },
  {
    id: 'elrp-2026',
    name: 'Emergency Livestock Relief Program',
    abbreviation: 'ELRP',
    category: 'livestock',
    farmTypes: ['livestock'],
    description:
      'Payments for 2023-2024 drought and wildfire grazing losses. $1B+ distributed to 220,000+ ranchers. Enrollment remains open for qualifying producers.',
    totalFunding: '$1+ billion',
    totalFundingNumeric: 1_000_000_000,
    enrollmentOpen: '2025-01-01',
    enrollmentClose: '2026-06-30',
    paymentLimit: 125000,
    agiCap: 900000,
    requiresCropInsurance: false,
    requiresLoginGov: false,
    enrollmentUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery/emergency-livestock-relief-program-elrp',
    factSheetUrl: 'https://www.fsa.usda.gov/resources/disaster-recovery/emergency-livestock-relief-program-elrp',
    paymentRates: [],
    eligibilityCriteria: [
      'Grazing losses due to 2023-2024 drought or wildfire',
      'County must have qualifying drought designation',
      'Must have owned or leased eligible livestock',
      'Based on percentage of forage loss',
      'Contact local FSA office for application',
    ],
    coveredCropYears: '2023-2024',
    estimatePayment: () => 0,
  },
];

// ─── Utility functions ──────────────────────────────────────────────────────

export function getProgramById(id: string): USDAProgram | undefined {
  return USDA_PROGRAMS.find((p) => p.id === id);
}

export function getActivePrograms(): USDAProgram[] {
  const now = new Date();
  return USDA_PROGRAMS.filter((p) => {
    if (p.enrollmentClose === 'ongoing') return true;
    return new Date(p.enrollmentClose) >= now;
  });
}

export function getProgramsByCategory(category: ProgramCategory): USDAProgram[] {
  return USDA_PROGRAMS.filter((p) => p.category === category);
}

export function getDaysUntilDeadline(program: USDAProgram): number | null {
  if (program.enrollmentClose === 'ongoing') return null;
  const now = new Date();
  const deadline = new Date(program.enrollmentClose);
  const diffTime = deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getUrgencyLevel(program: USDAProgram): UrgencyLevel {
  const days = getDaysUntilDeadline(program);
  if (days === null) return 'low';
  if (days <= 14) return 'critical';
  if (days <= 30) return 'high';
  if (days <= 60) return 'medium';
  return 'low';
}

export function getFBARateForCrop(commodity: string): number {
  const rate = FBA_RATES.find(
    (r) => r.commodity.toLowerCase() === commodity.toLowerCase()
  );
  return rate?.rate ?? 0;
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
