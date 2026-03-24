// =============================================================================
// HarvestFile — Phase 31 Build 3: Benchmark Alert API
// app/api/benchmark-alert/route.ts
//
// Client-consumable endpoint wrapping the server-side cross-tool data layer.
// Returns county benchmark context + alert classification for the Morning
// Dashboard's BenchmarkAlertCard component.
//
// Query params:
//   - county_fips (required): 5-digit FIPS code
//   - commodity (optional): crop code, defaults to "ALL"
//   - choice (optional): user's ARC-CO or PLC choice for alert comparison
//
// Response:
//   {
//     success: boolean,
//     alert: {
//       type: "aligned" | "contrarian" | "new_data" | "no_data",
//       title: string,
//       description: string,
//       countyName: string,
//       stateAbbr: string,
//       countyMajority: "ARC-CO" | "PLC" | null,
//       countyMajorityPct: number | null,
//       historicalAvgArc: number,
//       trendDirection: string,
//       liveTotal: number,
//       liveVisible: boolean,
//       livePcts: { arc: number | null, plc: number | null },
//       socialProof: { stateThisWeek: number, countyTotal: number },
//     }
//   }
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getBenchmarkContextForCounty } from "@/lib/cross-tool/benchmark-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countyFips = searchParams.get("county_fips");
    const commodity = searchParams.get("commodity") || "ALL";
    const userChoice = searchParams.get("choice"); // "ARC-CO" or "PLC"

    if (!countyFips || !/^\d{5}$/.test(countyFips)) {
      return NextResponse.json(
        { success: false, error: "Valid 5-digit county_fips required" },
        { status: 400 }
      );
    }

    const context = await getBenchmarkContextForCounty(countyFips, commodity);

    if (!context) {
      return NextResponse.json({
        success: true,
        alert: {
          type: "no_data",
          title: "No Benchmark Data",
          description: "We don't have benchmark data for this county yet.",
          countyName: "",
          stateAbbr: "",
          countyMajority: null,
          countyMajorityPct: null,
          historicalAvgArc: 0,
          trendDirection: "STABLE",
          liveTotal: 0,
          liveVisible: false,
          livePcts: { arc: null, plc: null },
          socialProof: { stateThisWeek: 0, countyTotal: 0 },
        },
      });
    }

    // Determine county majority from historical data
    const { insights, historical, live_2026, social_proof, county } = context;
    const countyMajority = insights.historical_dominant === "SPLIT"
      ? (insights.most_recent_arc_pct >= 50 ? "ARC-CO" : "PLC")
      : insights.historical_dominant;
    const countyMajorityPct = countyMajority === "ARC-CO"
      ? insights.most_recent_arc_pct
      : 100 - insights.most_recent_arc_pct;

    // Determine alert type
    let alertType: "aligned" | "contrarian" | "new_data" | "no_data" = "new_data";
    let title = "";
    let description = "";

    if (!userChoice) {
      // No user choice provided — show general county intelligence
      alertType = "new_data";
      title = `${county.county_name} County Election Intelligence`;
      description = insights.summary;
    } else if (
      (userChoice === "ARC-CO" && countyMajority === "ARC-CO") ||
      (userChoice === "PLC" && countyMajority === "PLC")
    ) {
      // User matches county majority
      alertType = "aligned";
      title = "You're Aligned with Your County";
      description = `Your ${userChoice} choice matches ${Math.round(countyMajorityPct)}% of ${county.county_name} County farmers. ${
        insights.trend_direction === "TOWARD_ARC"
          ? "The trend is shifting toward ARC-CO."
          : insights.trend_direction === "TOWARD_PLC"
          ? "The trend is shifting toward PLC."
          : "Election patterns have been stable."
      }`;
    } else {
      // User is contrarian
      alertType = "contrarian";
      title = "You're Going Against the Grain";
      description = `${Math.round(countyMajorityPct)}% of ${county.county_name} County chose ${countyMajority}, but your calculator recommended ${userChoice}. This could mean a higher payment — or you may want to double-check your analysis.`;
    }

    // Build recent trend bars for the last 3 years
    const recentYears = historical.slice(-3).map((y) => ({
      year: y.year,
      arcPct: y.arc_pct,
    }));

    return NextResponse.json({
      success: true,
      alert: {
        type: alertType,
        title,
        description,
        countyName: county.county_name,
        stateAbbr: county.state_abbr,
        countyMajority,
        countyMajorityPct: Math.round(countyMajorityPct * 10) / 10,
        historicalAvgArc: Math.round(insights.historical_avg_arc_pct * 10) / 10,
        trendDirection: insights.trend_direction,
        mostRecentYear: insights.most_recent_year,
        mostRecentArcPct: Math.round(insights.most_recent_arc_pct * 10) / 10,
        liveTotal: live_2026.total,
        liveVisible: live_2026.is_visible,
        livePcts: {
          arc: live_2026.arc_co_pct,
          plc: live_2026.plc_pct,
        },
        recentYears,
        socialProof: {
          stateThisWeek: social_proof.state_this_week,
          countyTotal: social_proof.county_total,
          stateTotal: social_proof.state_total,
        },
      },
    });
  } catch (err) {
    console.error("[API] benchmark-alert error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
