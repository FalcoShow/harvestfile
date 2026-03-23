// =============================================================================
// HarvestFile — AI Farm Advisor API Route
// app/api/advisor/route.ts
//
// Phase 29 Build 1: The most intelligent farm financial advisor ever built.
//
// Architecture:
//   - Claude Sonnet via Vercel AI SDK + @ai-sdk/anthropic (server only)
//   - Multi-step tool calling for real-time data
//   - Returns plain text stream (no client SDK dependency)
//   - System prompt with OBBBA rules, ARC/PLC knowledge, marketing strategy
//
// The tools execute server-side, Claude synthesizes the results, and the
// final response streams as plain text to the client. Simple, reliable.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the HarvestFile AI Farm Advisor — the most knowledgeable agricultural financial assistant ever built. You help American farmers make better decisions about grain marketing, USDA program elections (ARC-CO, PLC), crop insurance, and farm financial planning.

PERSONALITY:
- You speak like a trusted county extension agent — knowledgeable but approachable
- Use concrete numbers and specific calculations, never vague generalities
- When uncertain, say so clearly rather than guess
- Be direct and action-oriented — farmers don't have time for fluff
- Use $/bu, $/acre, and other farm-standard units

OBBBA FARM BILL (One Big Beautiful Bill Act — signed July 4, 2025):
- Corn reference price: $4.10/bu, effective reference: $4.42/bu
- Soybeans reference price: $10.00/bu, effective reference: $10.71/bu
- Wheat reference price: $6.35/bu, effective reference: $6.35/bu
- Oats reference price: $3.05/bu, effective reference: $3.05/bu
- Rice reference price: $15.00/cwt, effective reference: $15.00/cwt
- Sorghum reference price: $4.26/bu, effective reference: $4.58/bu
- ARC-CO guarantee raised from 86% to 90% of benchmark revenue
- ARC maximum payment increased from 10% to 12% of benchmark revenue
- ARC pays on 85% of base acres; ARC-IC pays on 65%
- PLC pays when Marketing Year Average (MYA) price < Effective Reference Price
- PLC payment = (ERP - MYA) × payment yield × 85% of base acres
- Payment limit: $155,000 per person per crop year (up from $125,000)
- Up to 30 million new base acres allocated based on 2019-2023 planting history
- 100% bonus depreciation restored permanently; Section 179 raised to $2.5M
- For 2025 ONLY: farmers automatically receive the HIGHER of ARC-CO or PLC
- For 2026-2031: annual elections required, crop by crop
- 2026 enrollment DELAYED — expected summer/fall 2026

CROP INSURANCE (under OBBBA):
- SCO now available with BOTH ARC and PLC (previously SCO required PLC)
- ECO available regardless of ARC/PLC election
- SCO premium subsidy: 80%
- ECO premium subsidy: 80% for ECO-90%, 65% for ECO-95%

MARKETING YEAR:
- Corn & Soybeans: September 1 - August 31
- Wheat & Oats: June 1 - May 31
- Rice: August 1 - July 31

GRAIN MARKETING:
- Basis = Local Cash Price - Futures Price (negative basis is normal)
- Corn prices historically peak Feb-May, trough Sep-Oct
- Soybeans peak Jun-Jul, trough Oct-Nov
- Storage cost commercial: $0.03-0.05/bu/month; on-farm: ~$0.02-0.03/bu/month
- If carry (deferred - nearby futures) < storage cost, sell now
- Scale-up selling: sell in 20% increments as prices rise above breakeven

RESPONSE GUIDELINES:
- ALWAYS use your tools to fetch current market data before making price-dependent recommendations
- Lead with the direct answer, then support with numbers
- Show your math — farmers respect transparency
- End with 1-2 specific action items
- If asked about topics outside farming/agriculture, politely redirect
- NEVER provide specific legal or tax advice — recommend consulting professionals
- Include disclaimer on payment projections: "Actual payments depend on final USDA determinations"`;

// ─── Tools ───────────────────────────────────────────────────────────────────

const advisorTools = {
  getCurrentPrices: tool({
    description: 'Get current commodity futures prices and daily change. Call this FIRST for any price-related question.',
    inputSchema: z.object({
      commodities: z.array(z.enum(['CORN', 'SOYBEANS', 'WHEAT', 'OATS', 'RICE', 'COTTON']))
        .describe('Which commodities to fetch prices for'),
    }),
    execute: async ({ commodities }) => {
      try {
        const results: Record<string, any> = {};
        for (const commodity of commodities) {
          const { data: prices, error } = await supabase
            .from('futures_prices')
            .select('settle, price_date, high, low')
            .eq('commodity', commodity)
            .order('price_date', { ascending: false })
            .limit(5);

          if (error || !prices || prices.length === 0) {
            results[commodity] = { error: 'No data available' };
            continue;
          }
          const latest = prices[0];
          const previous = prices.length > 1 ? prices[1] : null;
          results[commodity] = {
            currentPrice: latest.settle,
            date: latest.price_date,
            dailyHigh: latest.high,
            dailyLow: latest.low,
            previousClose: previous?.settle || null,
            dailyChange: previous ? Math.round((latest.settle - previous.settle) * 10000) / 10000 : null,
          };
        }
        return results;
      } catch (err: any) {
        return { error: err.message };
      }
    },
  }),

  getMarketAnalysis: tool({
    description: 'Analyze commodity prices against OBBBA reference prices for PLC payment likelihood.',
    inputSchema: z.object({
      commodity: z.enum(['CORN', 'SOYBEANS', 'WHEAT', 'OATS', 'RICE', 'SORGHUM']),
    }),
    execute: async ({ commodity }) => {
      const refs: Record<string, { ref: number; eff: number; unit: string }> = {
        CORN: { ref: 4.10, eff: 4.42, unit: '$/bu' },
        SOYBEANS: { ref: 10.00, eff: 10.71, unit: '$/bu' },
        WHEAT: { ref: 6.35, eff: 6.35, unit: '$/bu' },
        OATS: { ref: 3.05, eff: 3.05, unit: '$/bu' },
        RICE: { ref: 15.00, eff: 15.00, unit: '$/cwt' },
        SORGHUM: { ref: 4.26, eff: 4.58, unit: '$/bu' },
      };
      const r = refs[commodity];
      if (!r) return { error: 'Unknown commodity' };

      const { data } = await supabase
        .from('futures_prices')
        .select('settle, price_date')
        .eq('commodity', commodity)
        .order('price_date', { ascending: false })
        .limit(1);

      const price = data?.[0]?.settle || null;
      const gap = price ? Math.round((r.eff - price) * 100) / 100 : null;
      const plcLikely = gap !== null && gap > 0;

      return {
        commodity,
        currentPrice: price,
        date: data?.[0]?.price_date,
        referencePrice: r.ref,
        effectiveReference: r.eff,
        unit: r.unit,
        gapToReference: gap,
        plcPaymentLikely: plcLikely,
        estimatedPlcPerUnit: plcLikely ? gap : 0,
        summary: plcLikely
          ? `At $${price}/${r.unit.split('/')[1]}, futures are $${gap} below the $${r.eff} effective reference. PLC payments likely.`
          : `At $${price}/${r.unit.split('/')[1]}, futures are above the $${r.eff} effective reference. No PLC payment expected.`,
      };
    },
  }),

  calculatePaymentEstimate: tool({
    description: 'Estimate PLC payments for a specific farm scenario.',
    inputSchema: z.object({
      commodity: z.enum(['CORN', 'SOYBEANS', 'WHEAT', 'OATS', 'SORGHUM']),
      baseAcres: z.number().describe('Number of base acres'),
      paymentYield: z.number().describe('PLC payment yield in bu/acre'),
    }),
    execute: async ({ commodity, baseAcres, paymentYield }) => {
      const refs: Record<string, number> = {
        CORN: 4.42, SOYBEANS: 10.71, WHEAT: 6.35, OATS: 3.05, SORGHUM: 4.58,
      };
      const eff = refs[commodity] || 0;

      const { data } = await supabase
        .from('futures_prices')
        .select('settle')
        .eq('commodity', commodity)
        .order('price_date', { ascending: false })
        .limit(1);

      const price = data?.[0]?.settle || 0;
      const paymentRate = Math.max(0, eff - price);
      const perAcre = paymentRate * paymentYield * 0.85;
      const total = Math.min(perAcre * baseAcres, 155000);

      return {
        program: 'PLC',
        commodity,
        baseAcres,
        paymentYield,
        effectiveReference: eff,
        projectedMYA: price,
        paymentRate: Math.round(paymentRate * 100) / 100,
        paymentPerAcre: Math.round(perAcre * 100) / 100,
        totalPayment: Math.round(total),
        limitApplied: perAcre * baseAcres > 155000,
        calculation: `($${eff.toFixed(2)} - $${price.toFixed(2)}) × ${paymentYield} bu/ac × 85% × ${baseAcres} ac = $${Math.round(total).toLocaleString()}`,
        disclaimer: 'Estimate based on current futures as MYA proxy. Actual payments depend on final USDA-determined MYA prices.',
      };
    },
  }),

  getSeasonalPattern: tool({
    description: 'Get historical seasonal price patterns and marketing timing advice.',
    inputSchema: z.object({
      commodity: z.enum(['CORN', 'SOYBEANS', 'WHEAT']),
    }),
    execute: async ({ commodity }) => {
      const month = new Date().getMonth();
      const patterns: Record<string, any> = {
        CORN: {
          peakMonths: 'February-May',
          troughMonths: 'September-October',
          currentBias: month >= 1 && month <= 4 ? 'PEAK — historically strongest'
            : month >= 8 && month <= 9 ? 'TROUGH — harvest pressure'
            : month >= 5 && month <= 7 ? 'DECLINING — transitioning to harvest'
            : 'RECOVERING — building toward spring highs',
          typicalRange: '$0.80-$1.20/bu annual swing',
          strategy: 'Scale-up: 20% in Feb-Mar, 20% in Apr-May, evaluate rest at harvest.',
          keyReports: 'Prospective Plantings (late Mar), WASDE (monthly ~10th), Crop Progress (weekly Apr-Nov)',
        },
        SOYBEANS: {
          peakMonths: 'June-July',
          troughMonths: 'October-November',
          currentBias: month >= 5 && month <= 6 ? 'PEAK — weather premium'
            : month >= 9 && month <= 10 ? 'TROUGH — harvest pressure'
            : month >= 0 && month <= 4 ? 'BUILDING — South American weather'
            : 'DECLINING — harvest approaching',
          typicalRange: '$1.50-$2.50/bu annual swing',
          strategy: 'Lock 30-40% pre-harvest via forward contracts. Basis strengthens Jan-Mar.',
          keyReports: 'Brazilian crop estimates (Jan-Mar), WASDE, Weekly Export Sales (Thu)',
        },
        WHEAT: {
          peakMonths: 'May-July',
          troughMonths: 'August-September',
          currentBias: month >= 4 && month <= 6 ? 'PEAK — spring uncertainty'
            : month >= 7 && month <= 8 ? 'TROUGH — new crop supply'
            : 'MIXED — depends on global supply and Black Sea dynamics',
          typicalRange: '$1.00-$1.50/bu annual swing',
          strategy: 'Most geopolitically sensitive grain. Monitor Black Sea exports closely.',
          keyReports: 'Winter Wheat Condition (weekly Nov-Jun), WASDE, Global trade flows',
        },
      };
      return patterns[commodity] || { error: 'No data' };
    },
  }),
};

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Convert simple {role, content} messages to the format streamText expects
    const formattedMessages = messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: SYSTEM_PROMPT,
      messages: formattedMessages,
      tools: advisorTools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: 2048,
      temperature: 0.3,
    });

    // Return as plain text stream — no client SDK needed to parse
    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error('[Farm Advisor] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
