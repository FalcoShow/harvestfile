import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateReportStatus(reportId: string, status: string, errorMessage?: string) {
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
        "- " + c.crop_type + ": " + c.base_acres + " base acres, " + c.planted_acres + " planted acres, " + c.payment_yield + " bu/ac, Program: " + (c.arc_county_elected ? "ARC-CO" : c.plc_elected ? "PLC" : "None") + ", Year: " + c.program_year
    )
    .join("\n");

  const totalBaseAcres = crops.reduce(function(sum: number, c: any) { return sum + (c.base_acres || 0); }, 0);

  return "You are an expert USDA farm program analyst. Generate a comprehensive ARC/PLC optimization report for the following farmer. Respond ONLY with a JSON object (no markdown, no backticks, no extra text).\n\nFARMER DETAILS:\n- Name: " + farmer.full_name + "\n- Farm Operation: " + (farmer.business_name || "N/A") + "\n- County: " + farmer.county + ", " + farmer.state + "\n- FSA Farm #: " + (farmer.fsa_farm_number || "N/A") + "\n- FSA Tract #: " + (farmer.fsa_tract_number || "N/A") + "\n- Total Base Acres: " + totalBaseAcres + "\n\nCROPS & ELECTIONS:\n" + cropDetails + '\n\nGenerate a JSON report with this exact structure:\n{\n  "report_title": "ARC/PLC Optimization Report",\n  "generated_date": "' + new Date().toISOString().split("T")[0] + '",\n  "farmer_summary": {\n    "name": "' + farmer.full_name + '",\n    "operation": "' + (farmer.business_name || "N/A") + '",\n    "county": "' + farmer.county + '",\n    "state": "' + farmer.state + '",\n    "total_base_acres": ' + totalBaseAcres + '\n  },\n  "executive_summary": "A 2-3 paragraph executive summary of findings and key recommendations",\n  "crop_analyses": [\n    {\n      "commodity": "Corn",\n      "base_acres": 200,\n      "planted_acres": 200,\n      "current_election": "ARC-CO or PLC",\n      "arc_co_analysis": {\n        "benchmark_revenue": 0,\n        "estimated_actual_revenue": 0,\n        "guarantee_level": 0,\n        "estimated_payment_per_acre": 0,\n        "estimated_total_payment": 0,\n        "explanation": "Detailed explanation of ARC-CO calculation and factors"\n      },\n      "plc_analysis": {\n        "reference_price": 0,\n        "effective_reference_price": 0,\n        "estimated_market_price": 0,\n        "payment_rate": 0,\n        "payment_yield": 0,\n        "estimated_payment_per_acre": 0,\n        "estimated_total_payment": 0,\n        "explanation": "Detailed explanation of PLC calculation and factors"\n      },\n      "recommendation": "ARC-CO or PLC",\n      "recommendation_reasoning": "Why this program is better for this crop",\n      "potential_savings": 0\n    }\n  ],\n  "total_estimated_payments": {\n    "current_elections": 0,\n    "optimized_elections": 0,\n    "additional_revenue_opportunity": 0\n  },\n  "market_outlook": "Brief market outlook for the relevant commodities",\n  "important_dates": [\n    {"date": "...", "description": "..."}\n  ],\n  "disclaimers": "Standard disclaimers about estimates vs actual payments"\n}\n\nUse current USDA reference prices: Corn $3.70/bu, Soybeans $8.40/bu, Wheat $5.50/bu, Sorghum $3.95/bu.\nUse realistic county yield estimates for ' + farmer.county + " County, " + farmer.state + ".\nProvide realistic, well-reasoned payment estimates. When in doubt, be conservative.\nAll dollar amounts should be numbers (not strings).";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { report_id, farmer_id, org_id } = await req.json();

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
      return NextResponse.json({ error: "Failed to fetch crops" }, { status: 500 });
    }

    const prompt = buildReportPrompt(farmer, crops);

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", errText);
      await updateReportStatus(report_id, "failed", "AI generation failed");
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const claudeData = await claudeResponse.json();
    const aiContent = claudeData.content && claudeData.content[0] ? claudeData.content[0].text : "Report generation failed";

    var reportContent;
    try {
      var jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/);
      var jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      reportContent = JSON.parse(jsonStr);
    } catch (e) {
      reportContent = { raw_analysis: aiContent, parse_error: true };
    }

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
      return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
    }

    return NextResponse.json({ success: true, report_id: report_id });
  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: error.message || "Generation failed" }, { status: 500 });
  }
}
