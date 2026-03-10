// =============================================================================
// HarvestFile - Claude Report Prompt Engine
// Phase 3A: The AI brain that generates $39 personalized farm reports
// =============================================================================
// This is the most important file in your business. The quality of this prompt
// is what makes farmers feel the report was worth every penny.
// =============================================================================

import { FarmInputData, ReportData } from './types/report';

/**
 * Builds the system prompt for Claude to act as a USDA farm program expert.
 * This prompt is carefully engineered to produce actionable, personalized advice.
 */
export function buildSystemPrompt(): string {
  return `You are an expert USDA farm program analyst with 20+ years of experience advising farmers on ARC (Agriculture Risk Coverage) and PLC (Price Loss Coverage) program elections. You have deep expertise in:

- ARC-CO (County Option) and PLC program mechanics
- USDA Farm Service Agency (FSA) procedures and forms
- Crop insurance interactions with safety net programs
- County-level agricultural economics
- The 2018 Farm Bill safety net provisions and any subsequent updates

Your job is to generate a comprehensive, personalized farm program report for an individual farmer. This report must be:

1. ACTIONABLE: Every section should tell the farmer exactly what to do
2. PERSONALIZED: Reference their specific crops, county, and acreage numbers
3. PLAIN ENGLISH: Avoid jargon. When you must use a technical term, explain it immediately
4. HONEST: If the recommendation is close or uncertain, say so. Farmers respect honesty over false confidence
5. DOLLAR-SPECIFIC: Always show actual dollar projections, not just percentages

CRITICAL RULES:
- Always use the farmer's actual data in calculations. Never use placeholder numbers.
- When projecting payments, show your math clearly so the farmer can verify.
- If data is missing or uncertain, acknowledge it and explain your assumptions.
- The ARC-CO guarantee = benchmark revenue × 86%. Payment = max(0, guarantee - actual county revenue) × coverage factor (85% of base acres)
- PLC payment = max(0, effective reference price - higher of MYA price or national loan rate) × payment yield × 85% of base acres
- For scenario analysis, use realistic price ranges based on current market conditions.

FORMAT: You must respond with ONLY valid JSON matching the ReportData schema. No markdown, no code fences, no explanation outside the JSON.`;
}

/**
 * Builds the user prompt with the farmer's specific data.
 * This is where personalization happens.
 */
export function buildUserPrompt(farmData: FarmInputData): string {
  const cropsList = farmData.crops.map(c => 
    `- ${c.cropName}: ${c.plantedAcres} planted acres` +
    (c.baseAcres ? `, ${c.baseAcres} base acres` : '') +
    (c.plcYield ? `, PLC yield: ${c.plcYield} bu/acre` : '') +
    (c.effectiveRefPrice ? `, ref price: $${c.effectiveRefPrice}/bu` : '') +
    (c.expectedPrice ? `, expected MYA price: $${c.expectedPrice}/bu` : '')
  ).join('\n');

  const calcResults = farmData.calculatorResults 
    ? `\nCALCULATOR RESULTS (from free calculator - use as baseline):
- ARC-CO Estimated Payment: $${farmData.calculatorResults.arcEstimate.toLocaleString()}
- PLC Estimated Payment: $${farmData.calculatorResults.plcEstimate.toLocaleString()}  
- Initial Recommendation: ${farmData.calculatorResults.recommendation}
- Yearly Projections: ${JSON.stringify(farmData.calculatorResults.projectedPayments)}`
    : '';

  return `Generate a complete personalized farm program report for this farmer.

FARMER INFORMATION:
- Name: ${farmData.farmerName || 'Farmer'}
- State: ${farmData.state}
- County: ${farmData.county}
- Current Program Election: ${farmData.currentProgram || 'Unknown'}
- Total Base Acres: ${farmData.baseCropAcres || 'Not specified'}

CROPS:
${cropsList}
${calcResults}

Generate the complete ReportData JSON object with ALL sections filled out:

1. executiveSummary - Clear headline with dollar amounts, recommendation, confidence level, and plain-English key insight
2. programAnalysis - Detailed ARC vs PLC projections with yearly breakdowns, pros/cons, and comparison table for the next 2 crop years
3. scenarioAnalysis - At minimum 5 price scenarios: prices stay flat, drop 10%, drop 20%, rise 10%, rise 20%. Show how each scenario affects ARC vs PLC payments
4. formsGuide - Exact USDA forms needed (CCC-861, CCC-862, etc.) with tips for filling them out
5. fsaVisitPrep - What to bring, questions to ask, common mistakes to avoid
6. cropInsurance - How ARC/PLC interacts with crop insurance, what to consider
7. deadlineCalendar - Key USDA program deadlines for the current and next crop year
8. countyContext - County-specific agricultural context, historical patterns, local FSA info

IMPORTANT: 
- Use realistic numbers based on current USDA data and market conditions
- The reportId should be a UUID format string
- generatedAt should be the current ISO date string
- All dollar amounts should be numbers (not strings)
- Make the executiveSummary.headline punchy and specific with dollar amounts
- The scenarioAnalysis should help the farmer understand their risk exposure
- Include the farmer's name where appropriate to personalize the report

Respond with ONLY the JSON object. No markdown formatting, no code fences.`;
}

/**
 * Parses and validates the Claude API response into a ReportData object.
 * Includes error handling for malformed responses.
 */
export function parseReportResponse(responseText: string): ReportData {
  // Strip any markdown code fences if Claude added them despite instructions
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    const report = JSON.parse(cleaned) as ReportData;
    
    // Validate required fields
    if (!report.executiveSummary) throw new Error('Missing executiveSummary');
    if (!report.programAnalysis) throw new Error('Missing programAnalysis');
    if (!report.scenarioAnalysis) throw new Error('Missing scenarioAnalysis');
    if (!report.formsGuide) throw new Error('Missing formsGuide');
    if (!report.fsaVisitPrep) throw new Error('Missing fsaVisitPrep');
    if (!report.cropInsurance) throw new Error('Missing cropInsurance');
    if (!report.deadlineCalendar) throw new Error('Missing deadlineCalendar');
    if (!report.countyContext) throw new Error('Missing countyContext');

    // Ensure reportId exists
    if (!report.reportId) {
      report.reportId = crypto.randomUUID();
    }
    if (!report.generatedAt) {
      report.generatedAt = new Date().toISOString();
    }

    return report;
  } catch (error) {
    console.error('Failed to parse report response:', error);
    console.error('Raw response (first 500 chars):', cleaned.substring(0, 500));
    throw new Error(`Failed to parse AI report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Determines which sections are available in the free preview.
 * This is key to the conversion funnel — show enough to prove value,
 * hold back enough to justify $39.
 */
export function getPreviewSections(): string[] {
  return [
    'executiveSummary',    // FREE - The hook. Shows them the recommendation.
    // Everything below is PAID:
    // 'programAnalysis',  - The detailed numbers they need
    // 'scenarioAnalysis', - What-if scenarios
    // 'formsGuide',       - The paperwork guide
    // 'fsaVisitPrep',     - FSA visit prep
    // 'cropInsurance',    - Insurance interaction
    // 'deadlineCalendar', - Deadlines
    // 'countyContext',    - County data
  ];
}

/**
 * Returns the sections that are blurred/locked in the preview.
 * These are shown with a blurred overlay + "Unlock Full Report" CTA.
 */
export function getLockedSections(): string[] {
  return [
    'programAnalysis',
    'scenarioAnalysis',
    'formsGuide',
    'fsaVisitPrep',
    'cropInsurance',
    'deadlineCalendar',
    'countyContext',
  ];
}
