export interface ProgramDeadline {
  date: string;
  description: string;
  urgency: 'normal' | 'soon' | 'urgent';
}

export interface ProgramForm {
  number: string;
  name: string;
}

export interface Program {
  id: string;
  name: string;
  agency: string;
  description: string;
  eligibilityRequirements: string[];
  estimatedValueRange: { min: number; max: number };
  deadlines: ProgramDeadline[];
  requiredForms: ProgramForm[];
  officialLink: string;
  obbbaChanges?: string;
}

export const PROGRAMS: Program[] = [
  {
    id: 'arc_plc',
    name: 'ARC/PLC (Agriculture Risk Coverage / Price Loss Coverage)',
    agency: 'FSA',
    description:
      'Provides revenue loss and price decline safety net payments on eligible base acres. Farmers elect ARC or PLC coverage on a commodity-by-commodity basis for each program year.',
    eligibilityRequirements: [
      'FSA base acres on farm',
      'AGI under $900,000 (3-year average)',
      'AD-1026 conservation compliance on file',
      'Annual election required',
    ],
    estimatedValueRange: { min: 5000, max: 164000 },
    deadlines: [
      {
        date: '2026-06-01',
        description: '2026 election opens late spring — MANDATORY election required',
        urgency: 'soon',
      },
    ],
    requiredForms: [
      { number: 'CCC-866', name: 'ARC/PLC Election Form' },
      { number: 'CCC-941', name: 'Average AGI Certification' },
      { number: 'AD-1026', name: 'Conservation Compliance' },
    ],
    officialLink: 'https://www.fsa.usda.gov/programs-and-services/arcplc_program',
    obbbaChanges: 'OBBBA extended ARC/PLC through 2030 with updated reference prices',
  },
  {
    id: 'eqip',
    name: 'EQIP (Environmental Quality Incentives Program)',
    agency: 'NRCS',
    description:
      'Provides financial and technical assistance to implement conservation practices on agricultural land. Covers practices like cover crops, no-till, nutrient management, and more.',
    eligibilityRequirements: [
      'Agricultural land',
      'Conservation plan with NRCS',
      'AGI under $900,000',
    ],
    estimatedValueRange: { min: 7800, max: 30000 },
    deadlines: [
      {
        date: '2027-01-15',
        description: 'Next national batching: January 15, 2027',
        urgency: 'normal',
      },
      {
        date: '2026-12-31',
        description: 'Applications accepted year-round — late FY2026 applications may be funded',
        urgency: 'normal',
      },
    ],
    requiredForms: [
      { number: 'NRCS-CPA-1200', name: 'Conservation Program Application' },
      { number: 'AD-1026', name: 'Conservation Compliance' },
      { number: 'CCC-941', name: 'Average AGI Certification' },
    ],
    officialLink:
      'https://www.nrcs.usda.gov/programs-initiatives/environmental-quality-incentives-program',
    obbbaChanges: 'OBBBA increased EQIP funding by $4B annually with higher payment rates',
  },
  {
    id: 'crp',
    name: 'CRP (Conservation Reserve Program)',
    agency: 'FSA',
    description:
      'Pays annual rental payments to farmers who retire environmentally sensitive cropland from production. Contracts run 10–15 years. Both General and Continuous signup options available.',
    eligibilityRequirements: [
      'Cropland that has been planted 4 of 6 previous years OR marginal pastureland',
      'Land must meet environmental sensitivity criteria',
      'AGI under $900,000',
    ],
    estimatedValueRange: { min: 5000, max: 50000 },
    deadlines: [
      {
        date: '2026-04-17',
        description: 'General CRP Signup #66: March 9 – April 17, 2026',
        urgency: 'urgent',
      },
    ],
    requiredForms: [
      { number: 'CRP-1', name: 'CRP Contract' },
      { number: 'AD-1026', name: 'Conservation Compliance' },
    ],
    officialLink: 'https://www.fsa.usda.gov/resources/programs/general-crp',
    obbbaChanges: 'OBBBA raised CRP acreage cap to 27 million acres',
  },
  {
    id: 'csp',
    name: 'CSP (Conservation Stewardship Program)',
    agency: 'NRCS',
    description:
      'Rewards farmers who already practice conservation by paying for maintaining and enhancing existing stewardship activities. 5-year contracts with potential renewal.',
    eligibilityRequirements: [
      'Active conservation practices on operation',
      'Meet stewardship threshold on at least one resource concern',
      'AGI under $900,000',
    ],
    estimatedValueRange: { min: 4000, max: 50000 },
    deadlines: [
      {
        date: '2027-01-15',
        description: 'Applications year-round. Next batching: January 15, 2027',
        urgency: 'normal',
      },
    ],
    requiredForms: [
      { number: 'NRCS-CPA-1200', name: 'Conservation Program Application' },
      { number: 'AD-1026', name: 'Conservation Compliance' },
      { number: 'CCC-941', name: 'Average AGI Certification' },
    ],
    officialLink:
      'https://www.nrcs.usda.gov/programs-initiatives/conservation-stewardship-program',
    obbbaChanges: 'OBBBA expanded CSP with $2B additional funding',
  },
  {
    id: 'crop_insurance',
    name: 'Federal Crop Insurance',
    agency: 'RMA',
    description:
      'Subsidized crop insurance provides a financial safety net against crop losses from natural disasters, price declines, or revenue shortfalls. Multiple policy types and coverage levels available.',
    eligibilityRequirements: [
      'Agricultural commodity must be insurable',
      'Must purchase through approved insurance agent',
      'Must comply with conservation provisions',
    ],
    estimatedValueRange: { min: 1000, max: 25000 },
    deadlines: [
      {
        date: '2026-03-15',
        description: 'Sales closing: Corn & soybeans (most states)',
        urgency: 'urgent',
      },
    ],
    requiredForms: [],
    officialLink: 'https://www.rma.usda.gov',
    obbbaChanges:
      'OBBBA raised premium subsidies 3-5%, expanded SCO/ECO endorsement subsidies to 80%',
  },
  {
    id: 'farmer_bridge',
    name: 'Farmer Bridge Assistance (FBA)',
    agency: 'FSA',
    description:
      'One-time assistance program for producers of eligible commodities who planted crops in 2025. Payments based on planted acres with per-acre rates set by commodity.',
    eligibilityRequirements: [
      'Planted eligible commodity in 2025',
      'FSA-578 acreage report filed for 2025',
      'AGI under $900,000',
      'Compliance with conservation provisions',
    ],
    estimatedValueRange: { min: 2000, max: 155000 },
    deadlines: [
      {
        date: '2026-04-17',
        description: 'Enrollment: February 23 – April 17, 2026',
        urgency: 'urgent',
      },
    ],
    requiredForms: [
      { number: 'CCC-555', name: 'Application for FBA' },
      { number: 'CCC-941', name: 'Average AGI Certification' },
      { number: 'AD-1026', name: 'Conservation Compliance' },
      { number: 'SF-3881', name: 'Direct Deposit' },
    ],
    officialLink:
      'https://www.fsa.usda.gov/resources/programs/farmer-bridge-assistance-fba-program',
    obbbaChanges: 'NEW program created by the One Big Beautiful Bill Act',
  },
  {
    id: 'disaster',
    name: 'Emergency Safety Net Programs',
    agency: 'FSA',
    description:
      'Suite of permanently authorized disaster assistance programs that activate after qualifying losses. Includes ELAP, LFP, LIP, TAP, ECP, and NAP.',
    eligibilityRequirements: [
      'Must have qualifying loss event',
      'File Notice of Loss within 30 days',
      'NAP requires pre-disaster purchase',
    ],
    estimatedValueRange: { min: 0, max: 50000 },
    deadlines: [
      {
        date: '2026-12-31',
        description: 'File Notice of Loss within 30 days of any qualifying event',
        urgency: 'normal',
      },
    ],
    requiredForms: [],
    officialLink: 'https://www.fsa.usda.gov/resources/programs',
  },
];
