// =============================================================================
// HarvestFile - Report Types
// Phase 3A: AI-Powered Personalized Farm Program Report
// =============================================================================

export interface FarmInputData {
  // Farm basics
  farmerName?: string;
  email: string;
  state: string;
  county: string;
  
  // Crop data
  crops: CropInput[];
  
  // Farm program history
  currentProgram?: 'ARC-CO' | 'PLC' | 'ARC-IC' | 'none' | 'unsure';
  baseCropAcres?: number;
  
  // Calculator results (passed from the free calculator)
  calculatorResults?: {
    arcEstimate: number;
    plcEstimate: number;
    recommendation: 'ARC-CO' | 'PLC' | 'ARC-IC';
    projectedPayments: {
      year: number;
      arc: number;
      plc: number;
    }[];
  };
}

export interface CropInput {
  cropName: string;
  plantedAcres: number;
  baseAcres?: number;
  plcYield?: number;         // PLC payment yield (per acre)
  arcBenchmarkYield?: number; // ARC benchmark yield
  effectiveRefPrice?: number; // Effective reference price
  expectedPrice?: number;     // Expected market price
}

export interface ReportData {
  // Meta
  reportId: string;
  generatedAt: string;
  farmerId?: string;
  
  // Section 1: Executive Summary
  executiveSummary: {
    headline: string;           // e.g., "PLC is projected to pay $4,200 more than ARC-CO over the next 2 years"
    recommendation: 'ARC-CO' | 'PLC' | 'ARC-IC';
    confidenceLevel: 'high' | 'medium' | 'low';
    estimatedBenefit: number;   // Dollar amount of recommended vs alternative
    keyInsight: string;         // One-paragraph plain-English explanation
  };

  // Section 2: Detailed ARC vs PLC Analysis
  programAnalysis: {
    arcProjection: ProgramProjection;
    plcProjection: ProgramProjection;
    comparisonTable: {
      year: number;
      arcPayment: number;
      plcPayment: number;
      difference: number;
      winner: 'ARC-CO' | 'PLC';
    }[];
    analysisNarrative: string;  // Detailed explanation of why one beats the other
  };

  // Section 3: Price Scenario Analysis
  scenarioAnalysis: {
    scenarios: PriceScenario[];
    narrative: string;
    riskAssessment: string;
  };

  // Section 4: Forms & Paperwork Guide
  formsGuide: {
    requiredForms: FormInfo[];
    optionalForms: FormInfo[];
    narrative: string;
  };

  // Section 5: FSA Office Visit Prep
  fsaVisitPrep: {
    whatToBring: string[];
    questionsToAsk: string[];
    commonMistakes: string[];
    narrative: string;
  };

  // Section 6: Crop Insurance Interaction
  cropInsurance: {
    interactionSummary: string;
    keyConsiderations: string[];
    recommendations: string[];
    narrative: string;
  };

  // Section 7: Deadline Calendar
  deadlineCalendar: {
    deadlines: DeadlineItem[];
    narrative: string;
  };

  // Section 8: County-Specific Context
  countyContext: {
    countyName: string;
    state: string;
    historicalData: string;
    localConsiderations: string;
    fsaOfficeInfo?: string;
  };
}

export interface ProgramProjection {
  programName: string;
  totalProjectedPayment: number;
  yearlyBreakdown: {
    year: number;
    projectedPayment: number;
    explanation: string;
  }[];
  pros: string[];
  cons: string[];
}

export interface PriceScenario {
  scenarioName: string;       // e.g., "Prices Drop 15%"
  priceChange: number;        // percentage, e.g., -15
  arcPayment: number;
  plcPayment: number;
  winner: 'ARC-CO' | 'PLC';
  explanation: string;
}

export interface FormInfo {
  formNumber: string;         // e.g., "CCC-861"
  formName: string;
  purpose: string;
  whereToGet: string;
  tips: string;
}

export interface DeadlineItem {
  date: string;
  event: string;
  importance: 'critical' | 'important' | 'optional';
  action: string;
  notes?: string;
}

// API request/response types
export interface GenerateReportRequest {
  farmData: FarmInputData;
}

export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  report?: ReportData;
  previewSections?: string[];  // Which sections are free preview
  error?: string;
}

// Report access tiers
export type ReportTier = 'preview' | 'full';

export interface ReportAccess {
  reportId: string;
  tier: ReportTier;
  email: string;
  createdAt: string;
  paidAt?: string;
  stripePaymentId?: string;
}
