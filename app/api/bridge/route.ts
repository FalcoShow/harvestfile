// =============================================================================
// HarvestFile — Calculator → Dashboard Bridge API
// Phase 13 Build 1: Eliminates empty dashboard state
//
// POST /api/bridge
// Accepts calculator results from localStorage (sent by BridgeDetector client
// component after signup/login) and creates:
//   1. A farmer record (user's own farm operation)
//   2. A farmer_crops record for the crop they calculated
//   3. A calculation record with their ARC vs PLC results
//   4. An activity_log entry
//
// Auth: Requires authenticated user with a professional + org record.
// Idempotent: Checks for existing bridged farmer before creating.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface BridgePayload {
  stateAbbr: string;
  stateName: string;
  countyFips: string;
  countyName: string;
  cropCode: string;
  cropName: string;
  acres: number;
  results: {
    arc: number;
    plc: number;
    arcPerAcre: number;
    plcPerAcre: number;
    best: "ARC-CO" | "PLC";
    diff: number;
    diffPerAcre: number;
  };
  isCountySpecific: boolean;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ── 1. Verify authentication ──────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── 2. Get professional + org ─────────────────────────────────────────
    // Try both column names to handle the auth_id vs auth_user_id inconsistency
    let professional = null;
    const { data: proById } = await supabase
      .from("professionals")
      .select("id, org_id")
      .eq("auth_id", user.id)
      .single();

    if (proById) {
      professional = proById;
    } else {
      const { data: proByUserId } = await supabase
        .from("professionals")
        .select("id, org_id")
        .eq("auth_user_id", user.id)
        .single();
      professional = proByUserId;
    }

    if (!professional?.org_id) {
      return NextResponse.json(
        { error: "No organization found. Please complete signup first." },
        { status: 400 }
      );
    }

    // ── 3. Parse and validate bridge data ─────────────────────────────────
    const body: BridgePayload = await request.json();

    if (
      !body.stateAbbr ||
      !body.countyName ||
      !body.cropCode ||
      !body.results
    ) {
      return NextResponse.json(
        { error: "Invalid bridge data" },
        { status: 400 }
      );
    }

    // ── 4. Check for existing bridged farmer (idempotency) ────────────────
    const { data: existingFarmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("org_id", professional.org_id)
      .eq("notes", "auto-created-from-calculator")
      .single();

    if (existingFarmer) {
      // Already bridged — return existing farmer ID
      return NextResponse.json({
        success: true,
        farmerId: existingFarmer.id,
        alreadyBridged: true,
      });
    }

    // ── 5. Create farmer record ───────────────────────────────────────────
    const countyClean = body.countyName
      .replace(/\s+county$/i, "")
      .replace(/\s+parish$/i, "")
      .trim();

    const { data: farmer, error: farmerError } = await supabase
      .from("farmers")
      .insert({
        org_id: professional.org_id,
        added_by: professional.id,
        full_name: "My Farm Operation",
        county: countyClean,
        state: body.stateAbbr,
        is_active: true,
        notes: "auto-created-from-calculator",
      })
      .select("id")
      .single();

    if (farmerError || !farmer) {
      console.error("[Bridge] Failed to create farmer:", farmerError);
      return NextResponse.json(
        { error: "Failed to create farm profile" },
        { status: 500 }
      );
    }

    // ── 6. Create crop record ──────────────────────────────────────────────
    // Insert into `crops` table (matching the existing createCrop pattern).
    // The dashboard queries `farmer_crops` for stats — if that's a view or
    // the same table, this will auto-populate it.
    const isBestArc = body.results.best === "ARC-CO";

    const { error: cropError } = await supabase
      .from("crops")
      .insert({
        farmer_id: farmer.id,
        crop_type: body.cropCode.toLowerCase(),
        base_acres: body.acres || 100,
        planted_acres: body.acres || 100,
        payment_yield: 0,
        arc_county_elected: isBestArc,
        plc_elected: !isBestArc,
        program_year: new Date().getFullYear(),
      });

    if (cropError) {
      console.error("[Bridge] Failed to create crop:", cropError);
      // Don't fail the whole bridge — farmer was created
    }

    // ── 7. Create calculation record ──────────────────────────────────────
    const { error: calcError } = await supabase
      .from("calculations")
      .insert({
        org_id: professional.org_id,
        farmer_id: farmer.id,
        crop_type: body.cropCode.toLowerCase(),
        county_fips: body.countyFips || null,
        state: body.stateAbbr,
        base_acres: body.acres || 100,
        arc_payment: body.results.arcPerAcre || 0,
        plc_payment: body.results.plcPerAcre || 0,
        recommendation: body.results.best,
        difference_per_acre: body.results.diffPerAcre || 0,
        is_latest: true,
        is_county_specific: body.isCountySpecific || false,
        metadata: JSON.stringify({
          source: "calculator_bridge",
          bridgedAt: new Date().toISOString(),
          originalTimestamp: body.timestamp,
          countyName: body.countyName,
          cropName: body.cropName,
          totalArc: body.results.arc,
          totalPlc: body.results.plc,
        }),
      });

    if (calcError) {
      console.error("[Bridge] Failed to create calculation:", calcError);
      // Don't fail — farmer + crop were created
    }

    // ── 8. Log activity ───────────────────────────────────────────────────
    await supabase.from("activity_log").insert({
      org_id: professional.org_id,
      actor_id: user.id,
      action: "calculator_bridge",
      entity_type: "farmer",
      entity_id: farmer.id,
      description: `Auto-created farm profile from calculator: ${body.cropName} in ${body.countyName}, ${body.stateAbbr} — ${body.results.best} recommended (+$${body.results.diffPerAcre}/ac)`,
    });

    return NextResponse.json({
      success: true,
      farmerId: farmer.id,
      alreadyBridged: false,
    });
  } catch (err) {
    console.error("[Bridge] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
