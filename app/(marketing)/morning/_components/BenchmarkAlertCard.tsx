// =============================================================================
// HarvestFile — Phase 31 Build 3: Benchmark Alert Card
// app/(marketing)/morning/_components/BenchmarkAlertCard.tsx
//
// Self-contained client component for the Morning Dashboard.
// Reads the user's calculator results from localStorage (hf_calculator_bridge),
// fetches county benchmark context from /api/benchmark-alert, and renders
// a personalized election intelligence alert.
//
// Three alert states:
//   1. ALIGNED — user matches county majority (green, reassuring)
//   2. CONTRARIAN — user differs from 60%+ of county (amber, thought-provoking)
//   3. NEW_DATA — no user choice stored, shows general county intelligence
//   4. NO_DATA — no bridge data in localStorage (hidden, renders nothing)
//
// Designed to match the morning dashboard's inline-style aesthetic:
//   - White cards with #E8E8E4 borders
//   - Forest green (#1B4332) accents
//   - Gold (#C9A84C) for CTAs
//   - Compact, glanceable, truck-cab-at-6AM friendly
// =============================================================================

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BridgeData {
  stateAbbr: string;
  countyFips: string;
  countyName: string;
  cropCode: string;
  cropName: string;
  results: {
    best: "ARC-CO" | "PLC";
    arc: number;
    plc: number;
    arcPerAcre: number;
    plcPerAcre: number;
    diff: number;
    diffPerAcre: number;
  };
  timestamp: number;
}

interface AlertData {
  type: "aligned" | "contrarian" | "new_data" | "no_data";
  title: string;
  description: string;
  countyName: string;
  stateAbbr: string;
  countyMajority: "ARC-CO" | "PLC" | null;
  countyMajorityPct: number | null;
  historicalAvgArc: number;
  trendDirection: string;
  mostRecentYear: number;
  mostRecentArcPct: number;
  liveTotal: number;
  liveVisible: boolean;
  livePcts: { arc: number | null; plc: number | null };
  recentYears: { year: number; arcPct: number }[];
  socialProof: {
    stateThisWeek: number;
    countyTotal: number;
    stateTotal: number;
  };
}

// ─── Alert Config ────────────────────────────────────────────────────────────

const ALERT_STYLES = {
  aligned: {
    border: "rgba(5,150,105,0.2)",
    bg: "rgba(5,150,105,0.04)",
    accent: "#059669",
    icon: "✅",
    badge: "ALIGNED",
    badgeBg: "rgba(5,150,105,0.1)",
  },
  contrarian: {
    border: "rgba(217,119,6,0.2)",
    bg: "rgba(217,119,6,0.04)",
    accent: "#D97706",
    icon: "⚡",
    badge: "REVIEW",
    badgeBg: "rgba(217,119,6,0.1)",
  },
  new_data: {
    border: "rgba(59,130,246,0.2)",
    bg: "rgba(59,130,246,0.04)",
    accent: "#3B82F6",
    icon: "📊",
    badge: "INTEL",
    badgeBg: "rgba(59,130,246,0.1)",
  },
  no_data: {
    border: "#E8E8E4",
    bg: "#FFFFFF",
    accent: "#9B9B9B",
    icon: "📋",
    badge: "",
    badgeBg: "transparent",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function BenchmarkAlertCard() {
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [bridge, setBridge] = useState<BridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this alert this session
    const dismissedKey = "hf_benchmark_alert_dismissed";
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Read bridge data from localStorage
    const BRIDGE_KEY = "hf_calculator_bridge";
    let bridgeData: BridgeData | null = null;

    try {
      const raw = localStorage.getItem(BRIDGE_KEY);
      if (raw) {
        bridgeData = JSON.parse(raw);
        // Validate it has required fields
        if (!bridgeData?.countyFips || !bridgeData?.results) {
          bridgeData = null;
        }
        // Check staleness — bridge data older than 30 days should still work
        // but we'll note it in the UI
      }
    } catch {
      bridgeData = null;
    }

    if (!bridgeData) {
      setLoading(false);
      return; // No bridge data — component renders nothing
    }

    setBridge(bridgeData);

    // Fetch benchmark alert from API
    const fetchAlert = async () => {
      try {
        const params = new URLSearchParams({
          county_fips: bridgeData!.countyFips,
          commodity: bridgeData!.cropCode || "ALL",
          choice: bridgeData!.results.best,
        });

        const res = await fetch(`/api/benchmark-alert?${params}`);
        const json = await res.json();

        if (json.success && json.alert) {
          setAlert(json.alert);
        }
      } catch (err) {
        console.error("[BenchmarkAlert] Fetch error:", err);
      }
      setLoading(false);
    };

    fetchAlert();
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("hf_benchmark_alert_dismissed", "true");
    setDismissed(true);
  };

  // ── Don't render if no data or dismissed ──
  if (dismissed || loading || (!alert && !bridge)) return null;
  if (alert?.type === "no_data" && !bridge) return null;

  const style = alert ? ALERT_STYLES[alert.type] : ALERT_STYLES.new_data;

  return (
    <div
      style={{
        background: style.bg,
        borderRadius: 16,
        border: `1px solid ${style.border}`,
        padding: 20,
        marginBottom: 20,
        position: "relative",
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "none",
          background: "rgba(0,0,0,0.04)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#9B9B9B",
        }}
        aria-label="Dismiss alert"
      >
        ✕
      </button>

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 22 }}>{style.icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              {alert?.title || "Election Intelligence"}
            </span>
            {style.badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: style.badgeBg,
                  color: style.accent,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {style.badge}
              </span>
            )}
          </div>
          {alert?.countyName && (
            <div
              style={{
                fontSize: 12,
                color: "#9B9B9B",
                marginTop: 2,
              }}
            >
              {alert.countyName} County, {alert.stateAbbr}
              {bridge?.cropName ? ` · ${bridge.cropName}` : ""}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {alert?.description && (
        <div
          style={{
            fontSize: 13,
            color: "#6B7280",
            lineHeight: 1.6,
            marginBottom: 14,
            paddingRight: 20,
          }}
        >
          {alert.description}
        </div>
      )}

      {/* Trend Bars — last 3 years of historical ARC-CO % */}
      {alert?.recentYears && alert.recentYears.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {alert.recentYears.map((yr) => (
            <div key={yr.year} style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#9B9B9B",
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                {yr.year}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "#E8E8E4",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(yr.arcPct, 100)}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: "#059669",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#6B7280",
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                {Math.round(yr.arcPct)}% ARC
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live 2026 Data + Trend Indicator */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {/* Live 2026 submissions */}
        {alert && alert.liveTotal > 0 && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "#FFFFFF",
              border: "1px solid #E8E8E4",
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>
              {alert.liveTotal}
            </span>{" "}
            <span style={{ color: "#9B9B9B" }}>
              farmer{alert.liveTotal !== 1 ? "s" : ""} reported for 2026
            </span>
            {alert.liveVisible && alert.livePcts.arc !== null && (
              <span style={{ color: "#059669", fontWeight: 600, marginLeft: 6 }}>
                ({alert.livePcts.arc}% ARC-CO)
              </span>
            )}
          </div>
        )}

        {/* Trend direction */}
        {alert && alert.trendDirection !== "STABLE" && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "#FFFFFF",
              border: "1px solid #E8E8E4",
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            {alert.trendDirection === "TOWARD_ARC" ? "↑" : "↓"}{" "}
            <span style={{ fontWeight: 600 }}>
              Trending toward{" "}
              {alert.trendDirection === "TOWARD_ARC" ? "ARC-CO" : "PLC"}
            </span>
            {" · "}Avg: {alert.historicalAvgArc}% ARC-CO
          </div>
        )}

        {/* Social proof */}
        {alert && alert.socialProof.stateThisWeek > 0 && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "#FFFFFF",
              border: "1px solid #E8E8E4",
              fontSize: 12,
              color: "#9B9B9B",
            }}
          >
            {alert.socialProof.stateThisWeek} farmer
            {alert.socialProof.stateThisWeek !== 1 ? "s" : ""} in{" "}
            {alert.stateAbbr} reported this week
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {alert?.type === "contrarian" && (
          <Link
            href="/check"
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              background: "#1B4332",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Re-Run Calculator →
          </Link>
        )}

        {bridge?.countyFips && (
          <Link
            href={`/check`}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              background: alert?.type === "contrarian" ? "rgba(27,67,50,0.06)" : "#1B4332",
              color: alert?.type === "contrarian" ? "#1B4332" : "#FFFFFF",
              border: alert?.type === "contrarian" ? "1px solid rgba(27,67,50,0.15)" : "none",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {alert?.type === "contrarian" ? "View County Page" : "Compare Your Election →"}
          </Link>
        )}

        <Link
          href="/advisor"
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            background: "rgba(201,168,76,0.08)",
            border: "1px solid rgba(201,168,76,0.2)",
            color: "#9E7E30",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Ask AI Advisor 💬
        </Link>
      </div>
    </div>
  );
}
