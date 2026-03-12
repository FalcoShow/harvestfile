import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Verify internal API call
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { report_id, farmer_id, org_id } = await req.json();

    // 1. Fetch farmer data with crops
    const { data: farmer, error: farmerError } = await supabaseAdmin
      .from("farmers")
      .select("*")
      .eq("id", farmer_id)
      .eq("org_id", org_id)
      .single();

    if (farmerError || !farmer) {
      await updateReportStatus(report_id, "failed", "Farmer not found");
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const { data: crops, error: cropsError } = await supabaseAdmin
      .from("crops")
      .select("*")
      .eq("farmer_id", farmer_id);

    if (cropsError) {
      await updateReportStatus(report_id, "failed", "Failed to fetch crops");
      return NextResponse.json(
        { error: "Failed to fetch crops" },
        { status: 500 }
      );
    }

    // 2. Build the prompt for Claude
    const prompt = buildReportPrompt(farmer, crops);

    // 3. Call Claude API
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", errText);
      await updateReportStatus(
        report_id,
        "failed",
        "AI generation failed"
      );
      return NextResponse.json(
        { error: "AI generation failed" },
        { status: 500 }
      );
    }

    const claudeData = await claudeResponse.json();
    const aiContent =
      claudeData.content?.[0]?.text || "Report generation failed";

    // 4. Parse the structured response
    let reportContent;
    try {
      // Extract JSON from Claude's response (it may be wrapped in markdown code blocks)
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      reportContent = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, store as raw text
      reportContent = {
        raw_analysis: aiContent,
        parse_error: true,
      };
    }

    // 5. Save completed report
    const { error: updateError } = await supabaseAdmin
      .from("reports")
      .update({
        status: "complete",
        content: reportContent,
        completed_at: new Date().toISOString(),
      })
      .eq("id", report_id);

    if (updateError) {
      console.error("Report update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, report_id });
  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    );
  }
}

async function updateReportStatus(
  reportId: string,
  status: string,
  errorMessage?: string
) {
  await supabaseAdmin
    .from("reports")
    .update({
      status,
      content: errorMessage ? { error: errorMessage } : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
}

function buildReportPrompt(farmer: any, crops: any[]): string {
  const cropDetails = crops
    .map(
      (c) =>
        `- ${c.commodity || c.crop_name}: ${c.base_acres} base acres, ${c.planted_acres} planted acres, ${c.yield_per_acre || c.expected_yield} bu/ac, Program: ${c.program_election || c.election}, Year: ${c.crop_year || c.year}`
    )
    .join("\n");

  return `You are an expert USDA farm program analyst. Generate a comprehensive ARC/PLC optimization report for the following farmer. Respond ONLY with a JSON object (no markdown, no backticks, no extra text).

FARMER DETAILS:
- Name: ${farmer.name}
- Farm Operation: ${farmer.farm_name || farmer.operation_name || "N/A"}
- County: ${farmer.county}, ${farmer.state}
- FSA Farm #: ${farmer.fsa_farm_number || "N/A"}
- FSA Tract #: ${farmer.fsa_tract_number || "N/A"}
- Total Base Acres: ${farmer.total_base_acres || crops.reduce((sum: number, c: any) => sum + (c.base_acres || 0), 0)}

CROPS & ELECTIONS:
${cropDetails}

Generate a JSON report with this exact structure:
{
  "report_title": "ARC/PLC Optimization Report",
  "generated_date": "${new Date().toISOString().split("T")[0]}",
  "farmer_summary": {
    "name": "...",
    "operation": "...",
    "county": "...",
    "state": "...",
    "total_base_acres": number
  },
  "executive_summary": "A 2-3 paragraph executive summary of findings and key recommendations",
  "crop_analyses": [
    {
      "commodity": "Corn",
      "base_acres": number,
      "planted_acres": number,
      "current_election": "ARC-CO or PLC",
      "arc_co_analysis": {
        "benchmark_revenue": number,
        "estimated_actual_revenue": number,
        "guarantee_level": number,
        "estimated_payment_per_acre": number,
        "estimated_total_payment": number,
        "explanation": "Detailed explanation of ARC-CO calculation and factors"
      },
      "plc_analysis": {
        "reference_price": number,
        "effective_reference_price": number,
        "estimated_market_price": number,
        "payment_rate": number,
        "payment_yield": number,
        "estimated_payment_per_acre": number,
        "estimated_total_payment": number,
        "explanation": "Detailed explanation of PLC calculation and factors"
      },
      "recommendation": "ARC-CO or PLC",
      "recommendation_reasoning": "Why this program is better for this crop",
      "potential_savings": number
    }
  ],
  "total_estimated_payments": {
    "current_elections": number,
    "optimized_elections": number,
    "additional_revenue_opportunity": number
  },
  "market_outlook": "Brief market outlook for the relevant commodities",
  "important_dates": [
    {"date": "...", "description": "..."}
  ],
  "disclaimers": "Standard disclaimers about estimates vs actual payments"
}

Use current USDA reference prices: Corn $3.70/bu, Soybeans $8.40/bu, Wheat $5.50/bu, Sorghum $3.95/bu.
Use realistic county yield estimates for ${farmer.county} County, ${farmer.state}.
Provide realistic, well-reasoned payment estimates. When in doubt, be conservative.
All dollar amounts should be numbers (not strings).`;
}
