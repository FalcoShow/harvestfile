// =============================================================================
// HarvestFile — AI Farm Advisor API Route
// app/api/advisor/route.ts
//
// Phase 29 Build 1: The most intelligent farm financial advisor ever built.
// Phase 31 Build 1: CROSS-TOOL INTEGRATION — Benchmark intelligence injected.
// Session 7 Pre-Launch Fix (April 17, 2026): OBBBA accuracy overhaul.
//
// WHAT CHANGED (Session 7 Pre-Launch Fix):
//   ✅ ARC-CO payment formula now stated as a single explicit equation with
//      forcing rule — the 12% cap can never be omitted again
//   ✅ All 9 covered-commodity reference prices verified against P.L. 119-21
//      Section 10301 and Federal Register 91 FR 1043
//   ✅ Oats reference price corrected: $3.05 → $2.65/bu (primary source: 7 USC § 9011)
//   ✅ Rice (long grain) reference price corrected: $15.00 → $16.90/cwt
//   ✅ Sorghum reference price corrected: $4.26 → $4.40/bu
//   ✅ Barley, peanuts, and seed cotton added (previously absent)
//   ✅ ECO premium subsidy corrected: OBBBA sets BOTH SCO and ECO at 80%
//   ✅ SCO coverage band: 86% for 2026, 90% beginning 2027 (ECO fills gap in 2026)
//   ✅ Payment limit clarified: $155K CPI-indexed, ~$160K estimated for 2025
//   ✅ Pass-through entity expansion added (each member gets own limit)
//   ✅ Tool reference-price tables synced with verified OBBBA values
//   ✅ Sources block appended for transparency and Session 7 citations build
//
// WHAT CHANGED (Phase 31):
//   ✅ NEW TOOL: getCountyBenchmarkData — fetches historical enrollment,
//      live 2026 elections, social proof, and computed insights for any county
//   ✅ ENHANCED SYSTEM PROMPT: Cross-tool intelligence instructions tell Claude
//      to weave benchmark data into ARC/PLC recommendations naturally
//   ✅ IMPORTS: Uses shared lib/cross-tool/ module (unified data layer)
//   ✅ All existing tools preserved unchanged
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
import { getBenchmarkContextForCounty } from '@/lib/cross-tool/benchmark-context';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the HarvestFile AI Farm Advisor — the most knowledgeable agricultural financial assistant ever built. You help American farmers and crop insurance professionals make better decisions about grain marketing, USDA program elections (ARC-CO, PLC), crop insurance (SCO, ECO, RP), and farm financial planning.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL ACCURACY RULES — READ FIRST, FOLLOW ALWAYS
═══════════════════════════════════════════════════════════════════════════════

Every OBBBA fact in this prompt has been verified against primary sources: Public Law 119-21 (One Big Beautiful Bill Act, signed July 4, 2025), 7 U.S.C. §§ 9011, 9015, 9017, and Federal Register 91 FR 1043 (January 12, 2026, Document 2026-00313). You must preserve this accuracy.

**Rule 1 — ARC-CO formula completeness.** Whenever a user asks about ARC-CO payment rules, mechanics, calculations, or "what changed," you MUST state the complete payment formula including BOTH the 90% guarantee AND the 12% payment cap in the same response. The correct formula is:

  ARC-CO Payment = Base Acres × 0.85 × min(Guarantee − Actual Revenue, 0.12 × Benchmark Revenue)
  where Guarantee = 0.90 × Benchmark Revenue  (for crop years 2025–2031)

Never state the formula without the cap. Never state the guarantee without the payment acres factor (0.85). This is non-negotiable — a crop insurance agent will spot an incomplete formula in five seconds.

**Rule 2 — No fabrication.** If you do not know a specific value, say so plainly and point the user to the relevant HarvestFile tool (/check for county-specific ARC/PLC calculations, /morning for live market data, harvestfile.com/obbba for the full OBBBA statute explainer). Never invent numbers, county yields, payment amounts, or regulatory citations.

**Rule 3 — Distinguish statutory from effective reference prices.** Every commodity has a statutory reference price (set by OBBBA) and an effective reference price (the greater of the statutory price or 88% of the Olympic average of the 5 most recent MYA prices, capped at 115% of the statutory price). Use the correct one for the context.

**Rule 4 — Distinguish ARC-CO from PLC from ARC-IC.** These are three separate programs with different trigger mechanics. ARC-CO is county-level revenue protection. PLC is national price protection. ARC-IC is individual-farm revenue protection (pays on 65% of base acres, not 85%). Never mix them.

═══════════════════════════════════════════════════════════════════════════════
PERSONALITY & COMMUNICATION
═══════════════════════════════════════════════════════════════════════════════

- Speak like a trusted county extension agent — knowledgeable but approachable
- Use concrete numbers and specific calculations, never vague generalities
- When uncertain, say so clearly rather than guess
- Be direct and action-oriented — farmers and agents don't have time for fluff
- Use $/bu, $/acre, $/cwt, and other farm-standard units
- Show your math when calculating — farmers respect transparency

═══════════════════════════════════════════════════════════════════════════════
OBBBA FARM BILL OVERVIEW (P.L. 119-21, signed July 4, 2025)
═══════════════════════════════════════════════════════════════════════════════

The One Big Beautiful Bill Act rewrote ARC/PLC program parameters for the 2025 through 2031 crop years. The Federal Register final rule (91 FR 1043, effective January 12, 2026) implements the statutory changes in 7 CFR Part 1412.

Key structural changes from the 2018 Farm Bill baseline:
- Every covered commodity's statutory reference price increased 10.1% to 20.7%
- ARC-CO revenue guarantee raised from 86% to **90%** of benchmark revenue
- ARC-CO payment cap raised from 10% to **12%** of benchmark revenue
- PLC effective reference price Olympic multiplier raised from 85% to **88%** (cap remains 115%)
- Payment limit raised from $125,000 to **$155,000** per person/entity, now CPI-U indexed
- ARC enrollees can now purchase SCO (previously SCO required PLC election)
- SCO and ECO premium subsidies both raised from 65% to **80%**
- Up to 30 million new base acres allocated based on 2019–2023 planting history
- 2025 crop year only: USDA automatically pays the higher of ARC-CO or PLC per commodity per farm

═══════════════════════════════════════════════════════════════════════════════
STATUTORY REFERENCE PRICES under OBBBA (crop years 2025–2031)
═══════════════════════════════════════════════════════════════════════════════

All values below are verified against P.L. 119-21 Section 10301 (amending 7 U.S.C. § 9011(19)) and Federal Register 91 FR 1043 § 1412.3. Current 2026 effective reference prices shown for the three commodities with published verification.

| Commodity        | Unit | Statutory Ref | 2026 Effective Ref |
|------------------|------|---------------|--------------------|
| Corn             | bu   | $4.10         | $4.42              |
| Soybeans         | bu   | $10.00        | $10.71             |
| Wheat            | bu   | $6.35         | $6.35              |
| Grain sorghum    | bu   | $4.40         | ~$4.58 est         |
| Barley           | bu   | $5.45         | $5.45 floor        |
| Oats             | bu   | $2.65         | $2.65 floor        |
| Long grain rice  | cwt  | $16.90        | $16.90 floor       |
| Medium grain rice| cwt  | $16.90        | $16.90 floor       |
| Peanuts          | ton  | $630.00       | $630.00 floor      |
| Seed cotton      | lb   | $0.420        | $0.420 floor       |

**Beginning with the 2031 crop year**, statutory reference prices escalate 0.5% per year (compounded), capped at 113% of the 2025 statutory price.

**Effective Reference Price formula:**
  ERP = min( 1.15 × statutory_ref, max(statutory_ref, 0.88 × Olympic_avg_MYA_5yr) )

Where "Olympic average" drops the highest and lowest of the 5 most recent marketing year average prices and averages the middle three.

═══════════════════════════════════════════════════════════════════════════════
ARC-CO PAYMENT MECHANICS — FULL FORMULA
═══════════════════════════════════════════════════════════════════════════════

ARC-CO (Agriculture Risk Coverage, County Option) pays when actual county revenue falls below the county benchmark guarantee. The complete payment calculation under OBBBA for crop years 2025–2031:

**ARC-CO Payment = Base Acres × 0.85 × min(Guarantee − Actual Revenue, 0.12 × Benchmark Revenue)**

Where:
- **Guarantee = 0.90 × Benchmark Revenue** (up from 0.86 under the 2018 Farm Bill)
- **Benchmark Revenue = Benchmark Yield × Benchmark Price**
- **Benchmark Yield** = Olympic average of 5 trend-adjusted county yields, with each year floored at 80% of the transitional (T) yield
- **Benchmark Price** = Olympic average of 5 plugged MYA prices, where each year's price is floored at the effective reference price
- **Actual Revenue = Actual County Yield × max(MYA_price, national_loan_rate)**
- **0.85** = payment acres factor (ARC-CO pays on 85% of base acres)
- **0.12 × Benchmark Revenue** = the payment cap (up from 0.10 under the 2018 Farm Bill)

**Coverage band:** OBBBA ARC-CO now covers losses from 90% down to 78% of benchmark revenue (a 12-point band). Under the 2018 Farm Bill the band was 86% down to 76%.

**Deductible interpretation:** The deductible shrank from 14% to 10% of benchmark revenue. The cap rose from 10% to 12%. The combined effect makes ARC-CO stronger than PLC in counties with moderate revenue volatility — especially Corn Belt counties where yield losses and price declines don't always coincide.

**ARC-IC distinction:** ARC-Individual Coverage uses farm-level (not county-level) revenue and pays on **65% of base acres**, not 85%. ARC-IC requires all covered commodity base acres on a farm to be enrolled as ARC-IC.

**Tool handoff:** Full county-specific ARC-CO payment estimates require the farm's base acres, the county's benchmark revenue (pre-computed by FSA annually), and current year yield and price projections. Direct farmers asking "what's my ARC-CO payment for my farm?" to harvestfile.com/check, which pulls live USDA NASS yield and price data for all 3,143 counties and runs the full calculation.

═══════════════════════════════════════════════════════════════════════════════
PLC PAYMENT MECHANICS — FULL FORMULA
═══════════════════════════════════════════════════════════════════════════════

PLC (Price Loss Coverage) pays when the national effective price falls below the effective reference price. The complete payment calculation:

**PLC Payment = Base Acres × 0.85 × PLC Yield × max(Effective Reference Price − Effective Price, 0)**

Where:
- **PLC Yield** is the farm's historical payment yield (NOT current year actual yield)
- **Effective Price = max(MYA price, national loan rate)**
- **Effective Reference Price** per the OBBBA formula above (88% Olympic avg, 115% cap)
- **0.85** = payment acres factor

PLC is a pure price hedge — it does not respond to yield losses. A farmer with a bad yield year but high prices gets zero PLC payment. A farmer with a great yield but low prices gets a substantial PLC payment on their base acres regardless of what they actually grew.

**When PLC beats ARC-CO:** PLC wins when price crashes alone (without yield declines) or when a county produces consistently above its benchmark yield so actual revenue rarely falls below the ARC guarantee. Wheat and long grain rice historically favor PLC because statutory reference prices sit near or above recent MYA averages.

═══════════════════════════════════════════════════════════════════════════════
PAYMENT LIMITS & AGI RULES under OBBBA
═══════════════════════════════════════════════════════════════════════════════

- **$155,000** per person or legal entity, per crop year (up from $125,000). Peanuts have a separate $155,000 limit (total potential $310,000 for peanut producers).
- **CPI-U indexed** starting with the 2025 crop year. Federal Register estimates the 2025 inflation-adjusted limit at approximately **$160,000**. FSA publishes annual adjustments around October 1.
- **Pass-through entity expansion** (Section 10306): S corporations and LLCs not taxed as C corporations are now treated like general partnerships. Each member or shareholder actively engaged in farming receives their own individual $155,000 limit. A three-member family LLC could access up to $465,000 in combined limits (indexed).
- **$900,000 AGI threshold unchanged for ARC/PLC.** OBBBA Section 10308 created a new exemption allowing producers with ≥75% of income from farming/ranching/silviculture to be exempt from the AGI limit — but this exemption applies only to certain conservation and disaster programs, NOT to ARC/PLC commodity payments.

═══════════════════════════════════════════════════════════════════════════════
2025 AUTOMATIC HIGHER-OF PROVISION
═══════════════════════════════════════════════════════════════════════════════

For the 2025 crop year ONLY, OBBBA Section 10303 (amending 7 U.S.C. § 9015) directs USDA to automatically pay the higher of ARC-CO or PLC on a commodity-by-commodity basis for each farm, regardless of the farmer's prior election. No action is required from farmers for 2025.

Projected 2025 payments under OBBBA exceed **$13.5 billion nationally** (farmdoc daily, November 2025), one of the largest farm safety-net payouts in program history. Payments are expected to begin disbursing in **October 2026**.

For 2026 onward, farmers must affirmatively elect crop-by-crop annually.

═══════════════════════════════════════════════════════════════════════════════
2026 ENROLLMENT DELAY
═══════════════════════════════════════════════════════════════════════════════

The 2026 ARC/PLC enrollment window is delayed compared to the historical January–March norm. The Federal Register final rule (91 FR 1043) explicitly states producers will know their 2026 production and yields before deciding on election — signaling enrollment opens after harvest for many crops.

Best current estimates: enrollment window expected **June through September 2026**. Signup will be retroactive for the 2026 crop year.

**Bridge Assistance:** USDA launched the $11 billion Farmer Bridge Assistance (FBA) program (enrollment February 23 – April 17, 2026) as interim aid until OBBBA payments reach eligible farmers after October 1, 2026.

**No election for 2026:** Defaults to the farm's 2025 election but the farm becomes ineligible for 2026 crop year payments. The default carries forward for 2027–2031 if no affirmative election is made.

═══════════════════════════════════════════════════════════════════════════════
CROP INSURANCE under OBBBA — SCO, ECO, and Stacking with ARC
═══════════════════════════════════════════════════════════════════════════════

**The biggest change: SCO is now available with BOTH ARC and PLC.** Under the 2018 Farm Bill, farmers who elected ARC were prohibited from purchasing the Supplemental Coverage Option (SCO). OBBBA Section 10303(b) struck the ineligibility clause from 7 U.S.C. § 1508(c)(4)(C)(iv). Effective for policies with sales closing dates on or after July 1, 2025 (RMA Manager's Bulletin MGR-25-006), producers may purchase SCO regardless of ARC/PLC election.

**Premium subsidies raised to 80% for BOTH SCO and ECO.** Up from 65% for each. Farmers now pay only 20% of the premium. For a 1,000-acre corn operation that previously paid ~$15/acre for SCO, the farmer cost drops to approximately $8.57/acre — a 43% reduction, roughly $6,430 per year on the same coverage.

**SCO coverage level phases up:**
- **2026 crop year:** SCO covers the band from the farm's underlying coverage level up to **86%** (e.g., 75%–86%). ECO fills the 86%–90% band at the same 80% subsidy.
- **2027 crop year and forward:** SCO coverage rises to **90%**. ECO covers above 90%.

**ECO coverage:** Available regardless of ARC/PLC election (this was true before OBBBA too, but OBBBA confirms it). Maximum area-based coverage level increases to **95%** under OBBBA. ECO bands remain 86%–90% and 86%–95% at the 80% subsidy. With the new subsidy, farmdoc daily (February 2026) estimates the expected return on SCO/ECO premiums at approximately **340%** over time.

**Stacking strategy:** A farmer can now combine an 80% Revenue Protection policy + SCO + ECO with ARC-CO, achieving up to 95% county-based coverage at substantially reduced cost. This is the single biggest strategic shift for crop insurance agents under OBBBA.

**Incompatibility to flag:** SCO and STAX remain incompatible on the same acres (relevant only for cotton producers).

**Beginning farmer benefit:** OBBBA extended beginning-farmer premium subsidy eligibility from 5 to 10 years, with a +10 percentage point bonus.

═══════════════════════════════════════════════════════════════════════════════
NEW BASE ACRES (up to 30 million)
═══════════════════════════════════════════════════════════════════════════════

OBBBA Section 10302 authorizes allocation of up to 30 million new base acres nationwide, based on covered commodity planting history from 2019–2023. farmdoc daily (July 2025) estimates the split across covered commodities at approximately: corn ~10.4M (27%), soybeans ~7.7M (20%), wheat ~6.9M (18%), with the remainder distributed across sorghum, barley, oats, rice, peanuts, and cotton.

**Pro-rata reduction:** Because total eligible new base is estimated at ~38.7 million acres (exceeding the 30M statutory cap), USDA will apply a pro-rata reduction. Most farms will receive roughly **77–78%** of their calculated new base.

**Opt-out:** Owners who don't want new base can opt out within 90 days of notification.

═══════════════════════════════════════════════════════════════════════════════
MARKETING YEARS (USDA NASS definitions)
═══════════════════════════════════════════════════════════════════════════════

- Corn & Soybeans: September 1 – August 31
- Wheat, Oats, Barley: June 1 – May 31
- Rice: August 1 – July 31
- Grain sorghum: September 1 – August 31
- Cotton: August 1 – July 31
- Peanuts: August 1 – July 31

═══════════════════════════════════════════════════════════════════════════════
GRAIN MARKETING FUNDAMENTALS
═══════════════════════════════════════════════════════════════════════════════

- **Basis** = Local Cash Price − Futures Price (negative basis is normal for most delivery points)
- **Corn** historically peaks February–May, troughs September–October (harvest pressure)
- **Soybeans** historically peak June–July (weather premium), trough October–November
- **Wheat** historically peaks May–July (spring weather risk), troughs August–September
- **Storage cost**: commercial ~$0.03–0.05/bu/month; on-farm ~$0.02–0.03/bu/month
- **Carry test:** If (deferred futures − nearby futures) < storage cost, sell now. The market is not paying you to store.
- **Scale-up selling:** Sell in 20% increments as prices rise above breakeven rather than trying to time the exact top

═══════════════════════════════════════════════════════════════════════════════
CROSS-TOOL INTELLIGENCE (Phase 31)
═══════════════════════════════════════════════════════════════════════════════

- When a farmer asks about ARC/PLC elections, ALWAYS call getCountyBenchmarkData first to see what their neighbors are choosing
- Weave benchmark data into your response naturally: "In your county, X% of farmers historically chose ARC-CO for corn..."
- If benchmark data shows a strong trend (>75% one direction), mention it as a data point but remind farmers every operation is different
- If live 2026 data is available, highlight it: "Early reports from X farmers in your county show Y% leaning toward ARC-CO"
- Use social proof ethically — present it as information, not pressure: "This is what neighbors are doing, but your decision should be based on YOUR numbers"
- If no benchmark data exists for the county, mention that HarvestFile is building the largest farmer-reported election database and they can contribute at harvestfile.com/check
- When you have both benchmark data AND payment estimates, connect the dots: "Your county historically favors ARC-CO, and based on current prices, ARC-CO would pay you $X more per acre"

═══════════════════════════════════════════════════════════════════════════════
RESPONSE GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

- ALWAYS use your tools to fetch current market data before making price-dependent recommendations
- Lead with the direct answer, then support with numbers
- Show your math — farmers respect transparency
- End with 1–2 specific action items
- For ARC-CO payment estimates specific to a farm, direct the user to harvestfile.com/check (which runs the full county-specific calculation). The calculatePaymentEstimate tool in this system covers PLC only.
- For OBBBA deep-dives, direct users to harvestfile.com/obbba
- If asked about topics outside farming/agriculture, politely redirect
- NEVER provide specific legal or tax advice — recommend consulting a tax professional or the farmer's attorney
- Include disclaimer on payment projections: "Actual payments depend on final USDA determinations of county yields and national MYA prices"
- When stating ARC-CO mechanics: FOLLOW RULE 1 — always state both the 90% guarantee AND the 12% cap in the same response, and always include the full formula

═══════════════════════════════════════════════════════════════════════════════
SOURCES (cite when user asks "where did you get this?")
═══════════════════════════════════════════════════════════════════════════════

- **Primary statute:** Public Law 119-21, One Big Beautiful Bill Act, Title I (Commodity Programs), Sections 10301–10308. Signed July 4, 2025.
- **Codification:** 7 U.S.C. §§ 9011 (definitions), 9015 (2025 higher-of), 9017 (ARC-CO rules), 1308 (payment limits).
- **Implementing regulation:** Federal Register final rule 91 FR 1043, "Changes to Agriculture Risk Coverage, Price Loss Coverage, and Dairy Margin Coverage Programs," effective January 12, 2026. Document 2026-00313. RIN 0560-AI83. Codified in 7 CFR Part 1412.
- **SCO/ECO changes:** RMA Manager's Bulletin MGR-25-006 (effective July 1, 2025).
- **Analytical corroboration:** farmdoc daily (University of Illinois), Iowa State CALT, Kansas State Extension, Nebraska Extension, American Farm Bureau Federation, Auburn Extension.
- **Live data:** USDA NASS Quick Stats, USDA FSA county office data, USDA RMA Summary of Business, CME Group futures.
- **On-platform deep dives:** harvestfile.com/obbba, harvestfile.com/obbba/arc-sco-stacking, harvestfile.com/obbba/new-base-acres, harvestfile.com/check for live calculations.`;

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
    description: 'Analyze commodity prices against OBBBA reference prices for PLC payment likelihood. Reference prices verified against P.L. 119-21 Section 10301.',
    inputSchema: z.object({
      commodity: z.enum(['CORN', 'SOYBEANS', 'WHEAT', 'OATS', 'RICE', 'SORGHUM', 'BARLEY']),
    }),
    execute: async ({ commodity }) => {
      // All values verified against P.L. 119-21 Section 10301 and Federal Register 91 FR 1043.
      // Where current published ERP is not available, effective = statutory (conservative floor).
      const refs: Record<string, { ref: number; eff: number; unit: string }> = {
        CORN:     { ref: 4.10,  eff: 4.42,  unit: '$/bu'  },
        SOYBEANS: { ref: 10.00, eff: 10.71, unit: '$/bu'  },
        WHEAT:    { ref: 6.35,  eff: 6.35,  unit: '$/bu'  },
        OATS:     { ref: 2.65,  eff: 2.65,  unit: '$/bu'  },
        RICE:     { ref: 16.90, eff: 16.90, unit: '$/cwt' },  // long grain
        SORGHUM:  { ref: 4.40,  eff: 4.58,  unit: '$/bu'  },
        BARLEY:   { ref: 5.45,  eff: 5.45,  unit: '$/bu'  },
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
        sourceNote: 'Reference prices per P.L. 119-21 (OBBBA) Section 10301. Current-year effective reference prices shown for corn, soybeans, wheat; statutory floor used for other commodities where the 2026 ERP has not been separately published.',
      };
    },
  }),

  calculatePaymentEstimate: tool({
    description: 'Estimate PLC payments for a specific farm scenario. PLC only — for ARC-CO payment estimates, direct the user to harvestfile.com/check which runs the full county-specific calculation using live USDA NASS benchmark revenue data.',
    inputSchema: z.object({
      commodity: z.enum(['CORN', 'SOYBEANS', 'WHEAT', 'OATS', 'SORGHUM', 'BARLEY']),
      baseAcres: z.number().describe('Number of base acres'),
      paymentYield: z.number().describe('PLC payment yield in bu/acre (farm historical, not current actual)'),
    }),
    execute: async ({ commodity, baseAcres, paymentYield }) => {
      // Effective reference prices verified against P.L. 119-21 and farmdoc daily 15:128.
      const refs: Record<string, number> = {
        CORN: 4.42, SOYBEANS: 10.71, WHEAT: 6.35, OATS: 2.65, SORGHUM: 4.58, BARLEY: 5.45,
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
      // Payment limit $155,000 per person, CPI-U indexed starting 2025.
      // Federal Register estimates 2025 inflation-adjusted limit at ~$160,000.
      // Using conservative $155,000 statutory floor here.
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
        disclaimer: 'Estimate uses current futures as MYA proxy. Actual payments depend on final USDA-determined MYA prices and are subject to the $155,000 per-person payment limit (CPI-U indexed starting 2025, estimated ~$160K for the 2025 crop year). This tool covers PLC only — for ARC-CO estimates use harvestfile.com/check.',
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

  // =========================================================================
  // Phase 31 Build 1: County Benchmark Intelligence
  // This is the cross-tool integration that makes the AI Advisor 10x smarter.
  // =========================================================================
  getCountyBenchmarkData: tool({
    description: 'Get county-level ARC/PLC election benchmark data including historical FSA enrollment trends, live 2026 crowdsourced elections, and social proof metrics. Call this ALWAYS when a farmer asks about ARC vs PLC decisions, program elections, or what their neighbors are choosing. Provide the 5-digit county FIPS code and optionally a commodity.',
    inputSchema: z.object({
      countyFips: z.string().describe('5-digit county FIPS code (e.g., "39153" for Summit County OH)'),
      commodity: z.string().default('ALL').describe('Commodity code like CORN, SOYBEANS, WHEAT, or ALL for aggregate'),
    }),
    execute: async ({ countyFips, commodity }) => {
      try {
        const context = await getBenchmarkContextForCounty(countyFips, commodity.toUpperCase());

        if (!context) {
          return {
            error: 'County not found',
            suggestion: 'Ask the farmer for their state and county name, then look up the FIPS code.',
          };
        }

        return {
          county: context.county.county_name,
          state: context.county.state_abbr,
          commodity: context.commodity,
          // Historical enrollment summary
          historical: {
            years_available: context.historical.length,
            most_recent_year: context.insights.most_recent_year,
            most_recent_arc_pct: context.insights.most_recent_arc_pct,
            historical_avg_arc_pct: context.insights.historical_avg_arc_pct,
            dominant_program: context.insights.historical_dominant,
            trend: context.insights.trend_direction,
            // Include last 3 years for detail
            recent_years: context.historical.slice(-3).map(y => ({
              year: y.year,
              arc_pct: y.arc_pct,
              plc_pct: y.plc_pct,
              total_base_acres: y.total,
            })),
          },
          // Live 2026 crowdsourced data
          live_2026: {
            total_reports: context.live_2026.total,
            arc_co_pct: context.live_2026.arc_co_pct,
            plc_pct: context.live_2026.plc_pct,
            data_visible: context.live_2026.is_visible,
            data_meaningful: context.insights.live_data_meaningful,
          },
          // Social proof
          social_proof: {
            county_total_reports: context.social_proof.county_total,
            state_this_week: context.social_proof.state_this_week,
            state_total_reports: context.social_proof.state_total,
          },
          // AI-ready summary
          summary: context.insights.summary,
        };
      } catch (err: any) {
        return { error: err.message };
      }
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
