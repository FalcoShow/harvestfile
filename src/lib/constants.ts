export const STATES: { value: string; label: string }[] = [
  // Featured states first
  { value: 'IA', label: 'Iowa' },
  { value: 'OH', label: 'Ohio' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  // All other states alphabetically
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

export const CROP_OPTIONS: { value: string; label: string }[] = [
  { value: 'corn', label: 'Corn' },
  { value: 'soybeans', label: 'Soybeans' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'other_row', label: 'Other row crops' },
  { value: 'specialty', label: 'Specialty crops' },
  { value: 'hay_forage', label: 'Hay/Forage' },
  { value: 'livestock', label: 'Livestock (not crops)' },
  { value: 'idle', label: 'None/Idle land' },
];

export const USDA_PROGRAM_OPTIONS: { value: string; label: string }[] = [
  { value: 'arc_co', label: 'ARC-CO' },
  { value: 'arc_ic', label: 'ARC-IC' },
  { value: 'plc', label: 'PLC' },
  { value: 'eqip', label: 'EQIP' },
  { value: 'crp', label: 'CRP' },
  { value: 'csp', label: 'CSP' },
  { value: 'crop_insurance', label: 'Federal Crop Insurance' },
  { value: 'none', label: 'None of these' },
  { value: 'not_sure', label: "I'm not sure" },
];

export const CONSERVATION_PRACTICES: { value: string; label: string }[] = [
  { value: 'cover_crops', label: 'Cover crops' },
  { value: 'no_till', label: 'No-till or strip-till' },
  { value: 'nutrient_management', label: 'Nutrient management plan' },
  { value: 'filter_strips', label: 'Filter strips or buffer strips' },
  { value: 'waterways', label: 'Grassed waterways' },
  { value: 'crop_rotation', label: 'Conservation crop rotation' },
  { value: 'none', label: 'None of these' },
];

export const FARMER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'beginning', label: 'Beginning farmer (farming less than 10 years)' },
  { value: 'veteran', label: 'Veteran farmer or rancher' },
  { value: 'limited_resource', label: 'Limited resource farmer' },
  { value: 'none', label: 'None of these apply' },
];

export const COVERAGE_LEVELS: string[] = [
  '50', '55', '60', '65', '70', '75', '80', '85',
];

export const CRP_RENTAL_RATES: Record<string, { general: number; continuous: number }> = {
  IA: { general: 229, continuous: 254 },
  IL: { general: 202, continuous: 225 },
  IN: { general: 192, continuous: 215 },
  OH: { general: 180, continuous: 200 },
};

export const CRP_RENTAL_RATES_DEFAULT: { general: number; continuous: number } = {
  general: 175,
  continuous: 195,
};

export const CROP_INSURANCE_PRICES: { corn: number; soybeans: number; wheat: number } = {
  corn: 4.62,
  soybeans: 11.09,
  wheat: 6.40,
};
