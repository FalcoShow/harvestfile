// types/database.ts
// Core database types for HarvestFile — matched to actual Supabase schema

export interface Farmer {
  id: string;
  org_id: string;
  added_by: string | null;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  state: string;
  county: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  fsa_farm_number: string | null;
  fsa_tract_number: string | null;
  current_program: string | null;
  tags: string[] | null;
  notes: string | null;
  priority: string | null;
  is_active: boolean;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Crop {
  id: string;
  farmer_id: string;
  crop_type: string;
  base_acres: number;
  planted_acres: number;
  payment_yield: number;
  arc_county_elected: boolean;
  plc_elected: boolean;
  program_year: number;
  created_at: string;
  updated_at: string;
}

export interface FarmerWithCrops extends Farmer {
  crops: Crop[];
}

// Form input types
export interface FarmerInput {
  full_name: string;
  business_name?: string;
  email?: string;
  phone?: string;
  county: string;
  state: string;
  address?: string;
  city?: string;
  zip?: string;
  fsa_farm_number?: string;
  fsa_tract_number?: string;
  current_program?: string;
  notes?: string;
  priority?: string;
  is_active?: boolean;
}

export interface CropInput {
  farmer_id: string;
  crop_type: string;
  base_acres: number;
  planted_acres: number;
  payment_yield?: number;
  arc_county_elected: boolean;
  plc_elected: boolean;
  program_year?: number;
}

// US States for dropdowns
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
] as const;

// Common crop types for USDA programs
export const CROP_TYPES = [
  "Corn",
  "Soybeans",
  "Wheat (Winter)",
  "Wheat (Spring)",
  "Wheat (Durum)",
  "Sorghum",
  "Barley",
  "Oats",
  "Rice (Long Grain)",
  "Rice (Medium/Short Grain)",
  "Upland Cotton",
  "Peanuts",
  "Sunflower Seed",
  "Canola",
  "Crambe",
  "Flaxseed",
  "Mustard Seed",
  "Rapeseed",
  "Safflower",
  "Sesame",
  "Dry Peas",
  "Lentils",
  "Small Chickpeas",
  "Large Chickpeas",
] as const;
