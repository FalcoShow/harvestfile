// =============================================================================
// HarvestFile - Claude Report Prompt Engine (V2 - FULL DATA)
// Phase 3A: Generates complete, data-rich reports in every section
// =============================================================================

export function buildSystemPrompt() {
  return `You are an expert USDA farm program analyst. Generate a comprehensive, personalized farm program report as a single JSON object.

CRITICAL RULES:
1. Respond with ONLY valid JSON. No markdown, no code fences, no text outside the JSON.
2. Every section must have real, substantive content. No empty arrays. No empty strings.
3. All dollar amounts must be numbers, not strings.
4. Use the farmer's actual data in all calculations.
5. The countyContext must include the farmer's real county and state name.
6. estimatedBenefit must be the dollar difference between the recommended program and the alternative.

JSON SCHEMA (follow EXACTLY):
{
  "reportId": "uuid-string",
  "generatedAt": "ISO-date-string",
  "executiveSummary": {
    "headline": "string with dollar amounts",
    "recommendation": "ARC-CO" or "PLC",
    "confidenceLevel": "high" or "medium" or "low",
    "estimatedBenefit": number (MUST be the dollar difference, NOT zero),
    "keyInsight": "2-3 sentence plain English explanation"
  },
  "programAnalysis": {
    "arcProjection": {
      "programName": "ARC-CO",
      "totalProjectedPayment": number,
      "yearlyBreakdown": [{"year": number, "projectedPayment": number, "explanation": "string"}],
      "pros": ["string", "string", "string"],
      "cons": ["string", "string"]
    },
    "plcProjection": {
      "programName": "PLC",
      "totalProjectedPayment": number,
      "yearlyBreakdown": [{"year": number, "projectedPayment": number, "explanation": "string"}],
      "pros": ["string", "string", "string"],
      "cons": ["string", "string"]
    },
    "comparisonTable": [
      {"year": 2025, "arcPayment": number, "plcPayment": number, "difference": number, "winner": "ARC-CO" or "PLC"},
      {"year": 2026, "arcPayment": number, "plcPayment": number, "difference": number, "winner": "ARC-CO" or "PLC"}
    ],
    "analysisNarrative": "string explaining why one program beats the other"
  },
  "scenarioAnalysis": {
    "scenarios": [
      {"scenarioName": "string", "priceChange": number, "arcPayment": number, "plcPayment": number, "winner": "ARC-CO" or "PLC", "explanation": "string"},
      ... (MUST have exactly 5 scenarios)
    ],
    "narrative": "string overview",
    "riskAssessment": "string"
  },
  "formsGuide": {
    "requiredForms": [
      {"formNumber": "string", "formName": "string", "purpose": "string", "whereToGet": "string", "tips": "string"},
      ... (MUST have at least 3 forms)
    ],
    "optionalForms": [{"formNumber": "string", "formName": "string", "purpose": "string", "whereToGet": "string", "tips": "string"}],
    "narrative": "string"
  },
  "fsaVisitPrep": {
    "whatToBring": ["string", "string", "string", "string", "string"],
    "questionsToAsk": ["string", "string", "string", "string"],
    "commonMistakes": ["string", "string", "string"],
    "narrative": "string"
  },
  "cropInsurance": {
    "interactionSummary": "string",
    "keyConsiderations": ["string", "string", "string"],
    "recommendations": ["string", "string", "string"],
    "narrative": "string explaining how ARC/PLC interacts with crop insurance"
  },
  "deadlineCalendar": {
    "deadlines": [
      {"date": "string", "event": "string", "importance": "critical" or "important" or "optional", "action": "string", "notes": "string"},
      ... (MUST have at least 5 deadlines)
    ],
    "narrative": "string"
  },
  "countyContext": {
    "countyName": "ACTUAL county name from farmer data",
    "state": "ACTUAL full state name from farmer data",
    "historicalData": "2-3 sentences about this county's agricultural history and typical yields",
    "localConsiderations": "2-3 sentences about local factors affecting program choice",
    "fsaOfficeInfo": "string with county FSA office details or how to find them"
  }
}

MANDATORY: Every array must have at least the minimum items shown. No empty arrays. No empty strings. estimatedBenefit MUST be a positive number showing the dollar advantage of your recommendation.`;
}

export function buildUserPrompt(farmData) {
  const cropsList = farmData.crops.map(c =>
    `- ${c.cropName}: ${c.plantedAcres} planted acres` +
    (c.baseAcres ? `, ${c.baseAcres} base acres` : '') +
    (c.plcYield ? `, PLC yield: ${c.plcYield} bu/acre` : '') +
    (c.effectiveRefPrice ? `, ref price: $${c.effectiveRefPrice}/bu` : '') +
    (c.expectedPrice ? `, expected MYA price: $${c.expectedPrice}/bu` : '')
  ).join('\n');

  const calcResults = farmData.calculatorResults
    ? `\nCALCULATOR RESULTS (use these as your baseline):
- ARC-CO Estimated Payment: $${farmData.calculatorResults.arcEstimate.toLocaleString()}
- PLC Estimated Payment: $${farmData.calculatorResults.plcEstimate.toLocaleString()}
- Difference: $${Math.abs(farmData.calculatorResults.arcEstimate - farmData.calculatorResults.plcEstimate).toLocaleString()}
- Initial Recommendation: ${farmData.calculatorResults.recommendation}`
    : '';

  return `Generate a COMPLETE farm program report for this farmer. EVERY section must have real content.

FARMER DATA:
- State: ${farmData.state}
- County: ${farmData.county}
- Current Program: ${farmData.currentProgram || 'Unknown'}
- Total Base Acres: ${farmData.baseCropAcres || 'Not specified'}

CROPS:
${cropsList}
${calcResults}

REQUIREMENTS:
1. executiveSummary.estimatedBenefit MUST equal the dollar difference between ARC-CO and PLC (use calculator results)
2. countyContext.countyName MUST be "${farmData.county}"
3. countyContext.state MUST be "${farmData.state}"
4. programAnalysis.comparisonTable MUST have 2 rows (2025 and 2026)
5. programAnalysis.arcProjection.pros MUST have at least 3 items
6. programAnalysis.plcProjection.pros MUST have at least 3 items
7. scenarioAnalysis.scenarios MUST have exactly 5 scenarios: flat, -10%, -20%, +10%, +20%
8. formsGuide.requiredForms MUST have at least 3 forms
9. fsaVisitPrep.whatToBring MUST have at least 5 items
10. deadlineCalendar.deadlines MUST have at least 5 deadlines with real dates
11. cropInsurance.keyConsiderations MUST have at least 3 items
12. cropInsurance.narrative MUST explain SCO/ECO interaction with ARC/PLC

Respond with ONLY the JSON object. No other text.`;
}

export function parseReportResponse(responseText) {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const report = JSON.parse(cleaned);

    if (!report.reportId) {
      report.reportId = 'rpt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }
    if (!report.generatedAt) {
      report.generatedAt = new Date().toISOString();
    }

    return report;
  } catch (error) {
    console.error('Failed to parse report response:', error);
    console.error('Raw response (first 500 chars):', cleaned.substring(0, 500));
    throw new Error('Failed to parse AI report: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export function getPreviewSections() {
  return ['executiveSummary'];
}

export function getLockedSections() {
  return ['programAnalysis', 'scenarioAnalysis', 'formsGuide', 'fsaVisitPrep', 'cropInsurance', 'deadlineCalendar', 'countyContext'];
}
