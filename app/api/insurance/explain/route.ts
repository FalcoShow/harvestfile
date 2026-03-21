// =============================================================================
// HarvestFile — Phase 20 Build 4B-3: AI Strategy Explanation API
// app/api/insurance/explain/route.ts
//
// Calls Claude Haiku 4.5 to generate plain-English explanations of Monte Carlo
// simulation results. Returns 2-3 sentences a farmer would text to their
// neighbor — not statistician-speak.
//
// Cost: ~$0.0016 per explanation (~0.2 cents). With caching, effectively free
// for repeated queries.
//
// Template fallback: if Claude API errors or times out, returns a generated
// string from the percentile data so the user never sees a blank.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface ExplainRequest {
  scenario: string;           // e.g. 'arc_sco_eco95'
  scenarioLabel: string;      // e.g. 'Full Stack (ARC)'
  commodity: string;          // e.g. 'CORN'
  county?: string;
  state?: string;
  coverageLevel: number;
  expectedNetBenefitPerAcre: number;
  paymentProbability: number;
  p5PerAcre: number;
  p50PerAcre: number;
  p95PerAcre: number;
  rpProbability?: number;
  arcProbability?: number;
  plcProbability?: number;
  scoProbability?: number;
  ecoProbability?: number;
  totalPremiumPerAcre: number;
  isBest: boolean;
  iterations: number;
}

// In-memory cache (survives within a single Vercel function instance)
const explanationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function buildCacheKey(req: ExplainRequest): string {
  // Cache by the values that affect the explanation
  return [
    req.scenario,
    req.commodity,
    req.coverageLevel,
    Math.round(req.expectedNetBenefitPerAcre * 10),
    Math.round(req.paymentProbability),
    Math.round(req.p5PerAcre * 10),
    Math.round(req.p95PerAcre * 10),
  ].join(':');
}

function buildTemplateFallback(req: ExplainRequest): string {
  const prob = Math.round(req.paymentProbability);
  const benefit = req.expectedNetBenefitPerAcre;
  const p5 = req.p5PerAcre;
  const p95 = req.p95PerAcre;
  const label = req.scenarioLabel;
  
  const benefitStr = benefit >= 0 ? `+$${benefit.toFixed(2)}` : `-$${Math.abs(benefit).toFixed(2)}`;
  const p5Str = p5 >= 0 ? `+$${p5.toFixed(2)}` : `-$${Math.abs(p5).toFixed(2)}`;
  
  let text = `${label} triggers a payment in about ${prob} out of 100 simulated market scenarios, with an average net benefit of ${benefitStr} per acre after premiums.`;
  
  if (p5 < 0) {
    text += ` In the worst 5% of outcomes, you'd see a net loss of $${Math.abs(p5).toFixed(2)} per acre from premiums exceeding payments.`;
  } else {
    text += ` Even in the worst 5% of outcomes, you'd still net ${p5Str} per acre.`;
  }
  
  text += ` In the best scenarios, this strategy could return up to +$${p95.toFixed(2)} per acre.`;
  
  if (req.isBest) {
    text += ` This is the top-ranked strategy across all ${req.iterations.toLocaleString()} simulations.`;
  }
  
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExplainRequest = await request.json();
    
    if (!body.scenario || !body.commodity) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = buildCacheKey(body);
    const cached = explanationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, explanation: cached.text, source: 'cache' });
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not set — using template fallback');
      const fallback = buildTemplateFallback(body);
      return NextResponse.json({ success: true, explanation: fallback, source: 'template' });
    }

    // Build prompt
    const systemPrompt = `You are a plain-English agricultural advisor for American farmers. You translate Monte Carlo simulation results for USDA farm safety-net programs (ARC-CO and PLC) into simple, actionable explanations.

Rules:
- Write exactly 2-3 sentences
- Use farming language, not financial or statistical jargon
- Say "X out of 100 simulations" instead of percentages or percentiles
- Always include a specific dollar-per-acre figure
- Frame worst-case as a "floor" and best-case as an "upside"
- End with one brief actionable insight
- Never use words like "percentile," "standard deviation," "probability distribution," "stochastic"
- Refer to the farmer as "you" and speak directly to them
- Be confident and specific, like a trusted county Extension agent

Example 1:
Input: ARC-CO + SCO + ECO strategy, corn, 78% payment probability, +$23.47/ac expected, P5 -$8.20/ac, P95 +$142.00/ac
Output: In 78 out of 100 market scenarios we tested, this ARC-CO stack produces a net return averaging $23.47 per acre after you pay your premiums. Even in a rough year, your floor is about $8 per acre in net premium cost — and in a good year with low prices and decent yields, you could see upwards of $142 per acre. This is the strongest safety-net combination for your operation this year.

Example 2:
Input: PLC + RP Only strategy, soybeans, 35% payment probability, +$11.20/ac expected, P5 -$4.50/ac, P95 +$85.00/ac
Output: PLC plus basic Revenue Protection triggers a payment in about 35 out of 100 scenarios, netting you around $11 per acre on average. Your downside is capped at roughly $4.50 per acre in premium cost. This is the simplest and cheapest option — consider it if you want minimal paperwork and a straightforward safety net.`;

    const userPrompt = `Strategy: ${body.scenarioLabel} (${body.scenario})
Commodity: ${body.commodity}
Coverage: ${body.coverageLevel}% RP
${body.county && body.state ? `Location: ${body.county} County, ${body.state}` : 'Location: National estimates'}
Payment Probability: ${Math.round(body.paymentProbability)}%
Expected Net Benefit: $${body.expectedNetBenefitPerAcre.toFixed(2)}/ac
Worst Case (P5): $${body.p5PerAcre.toFixed(2)}/ac
Median (P50): $${body.p50PerAcre.toFixed(2)}/ac
Best Case (P95): $${body.p95PerAcre.toFixed(2)}/ac
Total Premium: $${body.totalPremiumPerAcre.toFixed(2)}/ac
${body.rpProbability !== undefined ? `RP Indemnity Probability: ${Math.round(body.rpProbability)}%` : ''}
${body.arcProbability !== undefined ? `ARC-CO Payment Probability: ${Math.round(body.arcProbability)}%` : ''}
${body.plcProbability !== undefined ? `PLC Payment Probability: ${Math.round(body.plcProbability)}%` : ''}
${body.scoProbability !== undefined ? `SCO Payment Probability: ${Math.round(body.scoProbability)}%` : ''}
${body.ecoProbability !== undefined ? `ECO Payment Probability: ${Math.round(body.ecoProbability)}%` : ''}
Is Best Strategy: ${body.isBest ? 'Yes' : 'No'}
Simulations: ${body.iterations.toLocaleString()}

Write your 2-3 sentence explanation now.`;

    // Call Claude Haiku 4.5 (fast + cheap)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!aiResponse.ok) {
        console.error('Claude API error:', aiResponse.status, await aiResponse.text());
        const fallback = buildTemplateFallback(body);
        return NextResponse.json({ success: true, explanation: fallback, source: 'template' });
      }

      const aiData = await aiResponse.json();
      const explanation = aiData.content?.[0]?.text?.trim() || buildTemplateFallback(body);

      // Cache the result
      explanationCache.set(cacheKey, { text: explanation, timestamp: Date.now() });

      return NextResponse.json({ success: true, explanation, source: 'ai' });

    } catch (fetchError) {
      clearTimeout(timeout);
      console.error('Claude API fetch error:', fetchError);
      const fallback = buildTemplateFallback(body);
      return NextResponse.json({ success: true, explanation: fallback, source: 'template' });
    }

  } catch (error) {
    console.error('Explain route error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate explanation' }, { status: 500 });
  }
}
