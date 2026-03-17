// =============================================================================
// HarvestFile — Dynamic OG Image Generator
// Phase 10 Build 5: Branded social cards for shared calculator results
//
// GET /api/og?county=Darke+County&state=OH&crop=CORN&arc=25.64&plc=71.98&winner=PLC
//
// Generates a 1200x630 branded image for Facebook/Twitter/iMessage previews.
// Uses Next.js ImageResponse (Edge Runtime, no external dependencies).
// =============================================================================

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const county = p.get("county") || "Your County";
  const state = p.get("state") || "";
  const crop = p.get("crop") || "CORN";
  const arcPayment = p.get("arc") || "0";
  const plcPayment = p.get("plc") || "0";
  const winner = p.get("winner") || "ARC-CO";
  const diff = p.get("diff") || "0";

  // Format crop name
  const cropName = crop.charAt(0) + crop.slice(1).toLowerCase();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0C1F17",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "48px 64px",
            position: "relative",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#C9A84C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "800",
                color: "#0C1F17",
              }}
            >
              H
            </div>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "#E8E2D6" }}>
              Harvest<span style={{ color: "#C9A84C" }}>File</span>
            </span>
          </div>

          {/* County + crop */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                color: "rgba(255,255,255,0.5)",
                fontWeight: "500",
              }}
            >
              {county}{state ? `, ${state}` : ""} — {cropName}
            </span>
          </div>

          {/* Winner badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 16px",
              borderRadius: "999px",
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.25)",
              marginBottom: "24px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "800", color: "#C9A84C", letterSpacing: "0.05em" }}>
              🏆 {winner} WINS
            </span>
          </div>

          {/* Main comparison */}
          <div
            style={{
              display: "flex",
              gap: "48px",
              alignItems: "flex-end",
              marginBottom: "16px",
            }}
          >
            {/* ARC-CO */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: winner === "ARC-CO" ? "#C9A84C" : "rgba(255,255,255,0.35)",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}
              >
                ARC-CO
              </span>
              <span
                style={{
                  fontSize: winner === "ARC-CO" ? "64px" : "48px",
                  fontWeight: "800",
                  color: winner === "ARC-CO" ? "#ffffff" : "rgba(255,255,255,0.4)",
                  letterSpacing: "-0.03em",
                  lineHeight: "1",
                }}
              >
                ${arcPayment}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.3)",
                  marginTop: "4px",
                }}
              >
                per acre
              </span>
            </div>

            {/* VS */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingBottom: "16px",
              }}
            >
              <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.15)", fontWeight: "700" }}>
                vs
              </span>
            </div>

            {/* PLC */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: winner === "PLC" ? "#C9A84C" : "rgba(255,255,255,0.35)",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}
              >
                PLC
              </span>
              <span
                style={{
                  fontSize: winner === "PLC" ? "64px" : "48px",
                  fontWeight: "800",
                  color: winner === "PLC" ? "#ffffff" : "rgba(255,255,255,0.4)",
                  letterSpacing: "-0.03em",
                  lineHeight: "1",
                }}
              >
                ${plcPayment}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.3)",
                  marginTop: "4px",
                }}
              >
                per acre
              </span>
            </div>
          </div>

          {/* Difference callout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "12px",
            }}
          >
            <span style={{ fontSize: "16px", color: "#C9A84C", fontWeight: "600" }}>
              +${diff}/acre advantage for {winner}
            </span>
          </div>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "32px",
              padding: "10px 24px",
              borderRadius: "10px",
              background: "rgba(201,168,76,0.15)",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <span style={{ fontSize: "15px", color: "#C9A84C", fontWeight: "600" }}>
              Check your county → harvestfile.com/check
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
