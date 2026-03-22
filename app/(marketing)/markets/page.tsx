// =============================================================================
// HarvestFile — Phase 26 Build 3: Public Commodity Markets Dashboard
// app/(marketing)/markets/page.tsx
//
// FREE TOOL #10 — The only commodity price dashboard that connects futures
// prices to ARC/PLC payment projections in real-time.
//
// Every other tool shows: "Corn closed at $4.71"
// HarvestFile shows: "Corn closed at $4.71 → PLC payment of $0.29/bu likely"
//
// Data source: Nasdaq Data Link CHRIS database (free, 50K calls/day)
// Existing API: /api/prices/futures
// Reference prices: lib/mya/constants.ts (OBBBA parameters)
// =============================================================================

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Cell,
} from "recharts";

// ─── Commodity Configuration (mirrors lib/mya/constants.ts) ─────────────────
// Inline here so this page works as a standalone public tool with zero imports
// from authenticated modules.

interface CommodityConfig {
  code: string;
  name: string;
  emoji: string;
  unit: string;
  unitLabel: string;
  statutoryRefPrice: number;
  effectiveRefPrice: number;
  loanRate: number;
  futuresCode: string;
  color: string;
  accentColor: string;
  bgColor: string;
  marketingYear: string;
  nationalAvgYield: number; // bu/acre for payment calc
}

const COMMODITIES: Record<string, CommodityConfig> = {
  CORN: {
    code: "CORN",
    name: "Corn",
    emoji: "🌽",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 4.10,
    effectiveRefPrice: 4.42,
    loanRate: 2.20,
    futuresCode: "CHRIS/CME_C1",
    color: "#F59E0B",
    accentColor: "rgba(245,158,11,0.15)",
    bgColor: "rgba(245,158,11,0.06)",
    marketingYear: "Sep–Aug",
    nationalAvgYield: 177,
  },
  SOYBEANS: {
    code: "SOYBEANS",
    name: "Soybeans",
    emoji: "🫘",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 10.0,
    effectiveRefPrice: 10.71,
    loanRate: 6.2,
    futuresCode: "CHRIS/CME_S1",
    color: "#059669",
    accentColor: "rgba(5,150,105,0.15)",
    bgColor: "rgba(5,150,105,0.06)",
    marketingYear: "Sep–Aug",
    nationalAvgYield: 51,
  },
  WHEAT: {
    code: "WHEAT",
    name: "Wheat",
    emoji: "🌾",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 6.35,
    effectiveRefPrice: 6.35,
    loanRate: 3.38,
    futuresCode: "CHRIS/CME_W1",
    color: "#D97706",
    accentColor: "rgba(217,119,6,0.15)",
    bgColor: "rgba(217,119,6,0.06)",
    marketingYear: "Jun–May",
    nationalAvgYield: 52,
  },
  OATS: {
    code: "OATS",
    name: "Oats",
    emoji: "🌱",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 2.65,
    effectiveRefPrice: 3.05,
    loanRate: 1.43,
    futuresCode: "CHRIS/CME_O1",
    color: "#6B7280",
    accentColor: "rgba(107,114,128,0.15)",
    bgColor: "rgba(107,114,128,0.06)",
    marketingYear: "Jun–May",
    nationalAvgYield: 64,
  },
  RICE: {
    code: "RICE",
    name: "Rice",
    emoji: "🍚",
    unit: "$/cwt",
    unitLabel: "cwt",
    statutoryRefPrice: 15.0,
    effectiveRefPrice: 15.0,
    loanRate: 7.0,
    futuresCode: "CHRIS/CME_RR1",
    color: "#8B5CF6",
    accentColor: "rgba(139,92,246,0.15)",
    bgColor: "rgba(139,92,246,0.06)",
    marketingYear: "Aug–Jul",
    nationalAvgYield: 75,
  },
};

const COMMODITY_ORDER = ["CORN", "SOYBEANS", "WHEAT", "OATS", "RICE"];

// ─── USDA Report Calendar ────────────────────────────────────────────────────

interface USDAReport {
  name: string;
  date: string; // YYYY-MM-DD
  time: string;
  impact: "high" | "medium" | "low";
  description: string;
}

function getUpcomingUSDAReports(): USDAReport[] {
  const now = new Date();
  const reports: USDAReport[] = [
    // 2026 WASDE dates
    { name: "WASDE Report", date: "2026-04-09", time: "12:00 PM ET", impact: "high", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: "2026-05-12", time: "12:00 PM ET", impact: "high", description: "First new-crop estimates — highest impact month" },
    { name: "WASDE Report", date: "2026-06-11", time: "12:00 PM ET", impact: "high", description: "Updated supply/demand balance sheets" },
    { name: "WASDE Report", date: "2026-07-10", time: "12:00 PM ET", impact: "high", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: "2026-08-12", time: "12:00 PM ET", impact: "high", description: "First field-survey production estimates" },
    // Prospective Plantings
    { name: "Prospective Plantings", date: "2026-03-31", time: "12:00 PM ET", impact: "high", description: "First 2026 planted acre intentions — major market mover" },
    // Grain Stocks
    { name: "Grain Stocks", date: "2026-03-31", time: "12:00 PM ET", impact: "high", description: "Quarterly stocks — combined with Plantings for max impact" },
    { name: "Grain Stocks", date: "2026-06-30", time: "12:00 PM ET", impact: "high", description: "Quarterly stocks — combined with Acreage report" },
    // Acreage
    { name: "Acreage Report", date: "2026-06-30", time: "12:00 PM ET", impact: "high", description: "Actual planted acres — confirms or surprises vs. March intentions" },
    // Crop Progress (weekly, Mondays Apr–Nov)
    { name: "Crop Progress", date: "2026-04-06", time: "4:00 PM ET", impact: "medium", description: "Weekly planting progress & crop condition ratings" },
    { name: "Crop Progress", date: "2026-04-13", time: "4:00 PM ET", impact: "medium", description: "Weekly planting progress & crop condition ratings" },
    { name: "Crop Progress", date: "2026-04-20", time: "4:00 PM ET", impact: "medium", description: "Weekly planting progress & crop condition ratings" },
    { name: "Crop Progress", date: "2026-04-27", time: "4:00 PM ET", impact: "medium", description: "Weekly planting progress & crop condition ratings" },
    // Export Inspections (weekly)
    { name: "Export Inspections", date: "2026-03-23", time: "11:00 AM ET", impact: "low", description: "Weekly grain export volumes by destination" },
    { name: "Export Inspections", date: "2026-03-30", time: "11:00 AM ET", impact: "low", description: "Weekly grain export volumes by destination" },
    { name: "Export Sales", date: "2026-03-26", time: "8:30 AM ET", impact: "medium", description: "Weekly new & outstanding export commitments" },
    { name: "Export Sales", date: "2026-04-02", time: "8:30 AM ET", impact: "medium", description: "Weekly new & outstanding export commitments" },
  ];

  return reports
    .filter((r) => new Date(r.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);
}

// ─── Market Status Logic ─────────────────────────────────────────────────────

interface MarketStatus {
  status: "day_session" | "overnight" | "pre_market" | "closed" | "weekend";
  label: string;
  color: string;
  pulseColor: string;
  nextEvent: string;
}

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const ct = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const day = ct.getDay(); // 0=Sun, 6=Sat
  const hour = ct.getHours();
  const min = ct.getMinutes();
  const timeDecimal = hour + min / 60;

  // Weekend: Sat all day, Sun before 7 PM
  if (day === 6 || (day === 0 && timeDecimal < 19)) {
    return {
      status: "weekend",
      label: "Markets Closed — Weekend",
      color: "#6B7280",
      pulseColor: "rgba(107,114,128,0.4)",
      nextEvent: day === 6 ? "Opens Sunday 7:00 PM CT" : `Opens tonight 7:00 PM CT`,
    };
  }

  // Friday after 1:20 PM CT
  if (day === 5 && timeDecimal >= 13.333) {
    return {
      status: "weekend",
      label: "Markets Closed — Weekend",
      color: "#6B7280",
      pulseColor: "rgba(107,114,128,0.4)",
      nextEvent: "Opens Sunday 7:00 PM CT",
    };
  }

  // Overnight session: 7:00 PM – 7:45 AM CT
  if (timeDecimal >= 19 || timeDecimal < 7.75) {
    return {
      status: "overnight",
      label: "Overnight Session — CME Globex",
      color: "#3B82F6",
      pulseColor: "rgba(59,130,246,0.4)",
      nextEvent: "Day session opens 8:30 AM CT",
    };
  }

  // Pre-market break: 7:45 AM – 8:30 AM CT
  if (timeDecimal >= 7.75 && timeDecimal < 8.5) {
    return {
      status: "pre_market",
      label: "Pre-Market — Session Break",
      color: "#F59E0B",
      pulseColor: "rgba(245,158,11,0.4)",
      nextEvent: "Day session opens 8:30 AM CT",
    };
  }

  // Day session: 8:30 AM – 1:20 PM CT
  if (timeDecimal >= 8.5 && timeDecimal < 13.333) {
    return {
      status: "day_session",
      label: "Day Session — Markets Open",
      color: "#22C55E",
      pulseColor: "rgba(34,197,94,0.4)",
      nextEvent: "Settlement at 1:15 PM CT",
    };
  }

  // After close: 1:20 PM – 7:00 PM CT
  return {
    status: "closed",
    label: "Markets Closed — After Hours",
    color: "#6B7280",
    pulseColor: "rgba(107,114,128,0.4)",
    nextEvent: "Overnight session opens 7:00 PM CT",
  };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function formatPrice(price: number | null | undefined, decimals = 2): string {
  if (price === null || price === undefined) return "—";
  return `$${price.toFixed(decimals)}`;
}

function formatChange(change: number | null | undefined): string {
  if (change === null || change === undefined) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}`;
}

function formatChangePct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "";
  const sign = pct >= 0 ? "+" : "";
  return `(${sign}${pct.toFixed(2)}%)`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Calculate PLC payment rate: ERP - max(MYA, loanRate), floored at 0
// For futures approximation: use settlement as proxy for MYA direction
function calcPLCPayment(
  futuresPrice: number,
  config: CommodityConfig
): { rate: number; perAcre: number; likelihood: string; color: string } {
  const gap = config.effectiveRefPrice - futuresPrice;
  const plcRate = Math.max(0, config.effectiveRefPrice - Math.max(futuresPrice, config.loanRate));
  const perAcre = plcRate * config.nationalAvgYield * 0.85;
  
  let likelihood: string;
  let color: string;
  if (futuresPrice >= config.effectiveRefPrice) {
    likelihood = "No PLC Payment Expected";
    color = "#22C55E";
  } else if (futuresPrice >= config.effectiveRefPrice * 0.95) {
    likelihood = "PLC Payment Possible";
    color = "#F59E0B";
  } else {
    likelihood = "PLC Payment Likely";
    color = "#EF4444";
  }

  return { rate: plcRate, perAcre, likelihood, color };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PricePoint {
  date: string;
  settle: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

interface CommodityData {
  commodity: string;
  latestSettle: number | null;
  latestDate: string | null;
  previousSettle: number | null;
  change: number | null;
  changePct: number | null;
  referencePrice: number | null;
  unit: string | null;
  prices: PricePoint[];
  count: number;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [data, setData] = useState<Record<string, CommodityData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"30d" | "90d">("30d");
  const marketStatus = useMemo(() => getMarketStatus(), []);
  const usdaReports = useMemo(() => getUpcomingUSDAReports(), []);

  // Fetch futures data
  const fetchData = useCallback(async () => {
    try {
      const codes = COMMODITY_ORDER.join(",");
      const days = timeRange === "90d" ? 90 : 30;
      const res = await fetch(
        `/api/prices/futures?commodities=${codes}&days=${days}`
      );
      if (!res.ok) throw new Error("Failed to fetch market data");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || "No data returned");
      }
    } catch (err: any) {
      setError(err.message || "Unable to load market data");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Market-aware polling
  useEffect(() => {
    const ms = marketStatus.status;
    const interval =
      ms === "day_session"
        ? 5 * 60 * 1000
        : ms === "overnight"
        ? 15 * 60 * 1000
        : 60 * 60 * 1000;
    const timer = setInterval(() => {
      fetchData();
    }, interval);
    return () => clearInterval(timer);
  }, [marketStatus.status, fetchData]);

  // Summary stats
  const summary = useMemo(() => {
    let above = 0;
    let near = 0;
    let below = 0;
    COMMODITY_ORDER.forEach((code) => {
      const d = data[code];
      const cfg = COMMODITIES[code];
      if (!d?.latestSettle || !cfg) return;
      const ratio = d.latestSettle / cfg.effectiveRefPrice;
      if (ratio >= 1) above++;
      else if (ratio >= 0.95) near++;
      else below++;
    });
    return { above, near, below, total: above + near + below };
  }, [data]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF8",
        color: "#1a1a1a",
      }}
    >
      {/* ═══ HERO SECTION ═══ */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #0C1F17 0%, #1B4332 50%, #0f2b1e 100%)",
          padding: "48px 20px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Noise texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "#4ADE80",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4ADE80",
                }}
              />
              Free Tool — No Account Required
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.1,
              margin: "0 0 12px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Agricultural Commodity
            <br />
            <span style={{ color: "#C9A84C" }}>Markets & Payment Impact</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(15px, 2vw, 18px)",
              color: "rgba(255,255,255,0.65)",
              maxWidth: 640,
              lineHeight: 1.6,
              margin: "0 0 24px 0",
            }}
          >
            The only free tool that connects commodity futures prices to your
            ARC/PLC payment projections. See what today&apos;s prices mean for your
            farm program payments — updated daily.
          </p>

          {/* Market Status Bar */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: marketStatus.color,
                boxShadow: `0 0 8px ${marketStatus.pulseColor}`,
                animation:
                  marketStatus.status === "day_session" ||
                  marketStatus.status === "overnight"
                    ? "pulse 2s ease-in-out infinite"
                    : "none",
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
              }}
            >
              {marketStatus.label}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                marginLeft: 4,
              }}
            >
              {marketStatus.nextEvent}
            </span>
          </div>
        </div>
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* ── Summary Bar ─────────────────────────────────────────────── */}
        {!loading && !error && summary.total > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <SummaryCard
              label="Above Reference"
              value={summary.above}
              sublabel="No PLC payment expected"
              color="#22C55E"
              bgColor="rgba(34,197,94,0.06)"
              borderColor="rgba(34,197,94,0.15)"
            />
            <SummaryCard
              label="Near Reference"
              value={summary.near}
              sublabel="PLC payment possible"
              color="#F59E0B"
              bgColor="rgba(245,158,11,0.06)"
              borderColor="rgba(245,158,11,0.15)"
            />
            <SummaryCard
              label="Below Reference"
              value={summary.below}
              sublabel="PLC payment likely"
              color="#EF4444"
              bgColor="rgba(239,68,68,0.06)"
              borderColor="rgba(239,68,68,0.15)"
            />
            <SummaryCard
              label="Commodities Tracked"
              value={summary.total}
              sublabel="CME settlement prices"
              color="#3B82F6"
              bgColor="rgba(59,130,246,0.06)"
              borderColor="rgba(59,130,246,0.15)"
            />
          </div>
        )}

        {/* Section header + time range toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Commodity Futures
          </h2>
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 3,
              borderRadius: 10,
              background: "#F0F0EC",
            }}
          >
            {(["30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setLoading(true);
                }}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background:
                    timeRange === range ? "#FFFFFF" : "transparent",
                  color:
                    timeRange === range ? "#1a1a1a" : "#6B7280",
                  boxShadow:
                    timeRange === range
                      ? "0 1px 3px rgba(0,0,0,0.08)"
                      : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {range === "30d" ? "30 Day" : "90 Day"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading State ────────────────────────────────────────── */}
        {loading && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E8E8E4",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                margin: "0 auto 16px",
                borderRadius: "50%",
                border: "3px solid #E8E8E4",
                borderTopColor: "#1B4332",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
              Loading market data...
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
              Fetching CME settlement prices
            </div>
          </div>
        )}

        {/* ── Error State ──────────────────────────────────────────── */}
        {error && !loading && (
          <div
            style={{
              padding: "28px 24px",
              borderRadius: 16,
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "#EF4444", marginBottom: 6 }}>
              Unable to load market data
            </div>
            <div style={{ fontSize: 13, color: "#9B9B9B" }}>{error}</div>
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                fetchData();
              }}
              style={{
                marginTop: 14,
                padding: "8px 24px",
                borderRadius: 10,
                background: "#1B4332",
                border: "none",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Commodity Cards ──────────────────────────────────────── */}
        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {COMMODITY_ORDER.map((code) => {
              const d = data[code];
              const cfg = COMMODITIES[code];
              if (!cfg) return null;

              const price = d?.latestSettle ?? null;
              const change = d?.change ?? null;
              const changePct = d?.changePct ?? null;
              const isUp = change !== null && change >= 0;
              const plc = price ? calcPLCPayment(price, cfg) : null;
              const isExpanded = expandedCard === code;
              const priceHistory = d?.prices || [];

              return (
                <div
                  key={code}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 16,
                    border: `1px solid ${isExpanded ? cfg.accentColor : "#E8E8E4"}`,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    boxShadow: isExpanded
                      ? `0 4px 20px ${cfg.accentColor}`
                      : "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Card Header — always visible */}
                  <button
                    onClick={() =>
                      setExpandedCard(isExpanded ? null : code)
                    }
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      alignItems: "center",
                      gap: "12px 16px",
                      padding: "18px 20px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* Emoji + Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{cfg.emoji}</span>
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1a1a1a",
                          }}
                        >
                          {cfg.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9B9B9B",
                            fontWeight: 500,
                          }}
                        >
                          CME Front Month • {cfg.marketingYear}
                        </div>
                      </div>
                    </div>

                    {/* Mini Sparkline */}
                    <div style={{ height: 40, minWidth: 100, maxWidth: 200 }}>
                      {priceHistory.length > 2 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={priceHistory.filter((p) => p.settle !== null)}
                          >
                            <defs>
                              <linearGradient
                                id={`spark-${code}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={cfg.color}
                                  stopOpacity={0.2}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={cfg.color}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="settle"
                              stroke={cfg.color}
                              strokeWidth={1.5}
                              fill={`url(#spark-${code})`}
                              isAnimationActive={false}
                            />
                            <ReferenceLine
                              y={cfg.effectiveRefPrice}
                              stroke="#EF4444"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                              strokeOpacity={0.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Price + Change */}
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#1a1a1a",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {formatPrice(price)}
                      </div>
                      {change !== null && (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: isUp ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {isUp ? "▲" : "▼"} {formatChange(change)}{" "}
                          <span style={{ opacity: 0.7 }}>
                            {formatChangePct(changePct)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ARC/PLC Badge */}
                    <div style={{ minWidth: 140, textAlign: "right" }}>
                      {plc && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 8,
                            background:
                              plc.color === "#22C55E"
                                ? "rgba(34,197,94,0.08)"
                                : plc.color === "#F59E0B"
                                ? "rgba(245,158,11,0.08)"
                                : "rgba(239,68,68,0.08)",
                            border: `1px solid ${
                              plc.color === "#22C55E"
                                ? "rgba(34,197,94,0.15)"
                                : plc.color === "#F59E0B"
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(239,68,68,0.15)"
                            }`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: plc.color,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: plc.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {plc.rate > 0
                              ? `PLC: $${plc.rate.toFixed(2)}/${cfg.unitLabel}`
                              : "No PLC Payment"}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid #F0F0EC",
                        padding: "20px",
                      }}
                    >
                      {/* Price Chart */}
                      {priceHistory.length > 2 && (
                        <div style={{ marginBottom: 24 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#6B7280",
                              marginBottom: 8,
                            }}
                          >
                            {timeRange === "30d" ? "30" : "90"}-Day Price
                            History
                            <span style={{ fontWeight: 400, marginLeft: 8, color: "#9B9B9B" }}>
                              Dashed line = Effective Reference Price (${cfg.effectiveRefPrice.toFixed(2)})
                            </span>
                          </div>
                          <div
                            style={{
                              height: 220,
                              background: "#FAFAF8",
                              borderRadius: 12,
                              padding: "12px 8px 4px 0",
                            }}
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={priceHistory.filter(
                                  (p) => p.settle !== null
                                )}
                              >
                                <defs>
                                  <linearGradient
                                    id={`chart-${code}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor={cfg.color}
                                      stopOpacity={0.2}
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor={cfg.color}
                                      stopOpacity={0.02}
                                    />
                                  </linearGradient>
                                </defs>
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 10, fill: "#9B9B9B" }}
                                  tickFormatter={(v: string) => {
                                    const d = new Date(v);
                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                  }}
                                  axisLine={false}
                                  tickLine={false}
                                  interval="preserveStartEnd"
                                  minTickGap={40}
                                />
                                <YAxis
                                  domain={["auto", "auto"]}
                                  tick={{ fontSize: 10, fill: "#9B9B9B" }}
                                  axisLine={false}
                                  tickLine={false}
                                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                                  width={55}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: "#1a1a1a",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: "#fff",
                                  }}
                                  formatter={(value: number) => [
                                    `$${value.toFixed(2)}`,
                                    "Settlement",
                                  ]}
                                  labelFormatter={(label: string) =>
                                    formatDateFull(label)
                                  }
                                />
                                <ReferenceLine
                                  y={cfg.effectiveRefPrice}
                                  stroke="#EF4444"
                                  strokeDasharray="6 3"
                                  strokeWidth={1.5}
                                  label={{
                                    value: `ERP $${cfg.effectiveRefPrice.toFixed(2)}`,
                                    position: "right",
                                    fill: "#EF4444",
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="settle"
                                  stroke={cfg.color}
                                  strokeWidth={2}
                                  fill={`url(#chart-${code})`}
                                  isAnimationActive={false}
                                  dot={false}
                                  activeDot={{
                                    r: 4,
                                    fill: cfg.color,
                                    strokeWidth: 2,
                                    stroke: "#fff",
                                  }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Payment Analysis Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: 12,
                          marginBottom: 20,
                        }}
                      >
                        {/* Reference Price Comparison */}
                        <div
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            background: "#FAFAF8",
                            border: "1px solid #E8E8E4",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#9B9B9B", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Effective Reference Price
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a" }}>
                            ${cfg.effectiveRefPrice.toFixed(2)}
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#9B9B9B" }}>
                              /{cfg.unitLabel}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                            Statutory: ${cfg.statutoryRefPrice.toFixed(2)} (OBBBA)
                          </div>

                          {/* Reference Price Progress Bar */}
                          {price && (
                            <div style={{ marginTop: 12 }}>
                              <div
                                style={{
                                  height: 8,
                                  borderRadius: 4,
                                  background: "#E8E8E4",
                                  position: "relative",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: 4,
                                    width: `${Math.min(100, (price / cfg.effectiveRefPrice) * 100)}%`,
                                    background:
                                      price >= cfg.effectiveRefPrice
                                        ? "#22C55E"
                                        : price >= cfg.effectiveRefPrice * 0.95
                                        ? "#F59E0B"
                                        : "#EF4444",
                                    transition: "width 0.5s ease",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: 4,
                                  fontSize: 11,
                                  color: "#9B9B9B",
                                }}
                              >
                                <span>
                                  {((price / cfg.effectiveRefPrice) * 100).toFixed(1)}%
                                  of ref price
                                </span>
                                <span>
                                  {price >= cfg.effectiveRefPrice ? "+" : ""}
                                  ${(price - cfg.effectiveRefPrice).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* PLC Payment Projection */}
                        {plc && (
                          <div
                            style={{
                              padding: 16,
                              borderRadius: 12,
                              background:
                                plc.rate > 0
                                  ? "rgba(239,68,68,0.03)"
                                  : "rgba(34,197,94,0.03)",
                              border: `1px solid ${
                                plc.rate > 0
                                  ? "rgba(239,68,68,0.1)"
                                  : "rgba(34,197,94,0.1)"
                              }`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#9B9B9B",
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              PLC Payment Projection
                            </div>
                            <div
                              style={{
                                fontSize: 24,
                                fontWeight: 800,
                                color: plc.rate > 0 ? "#EF4444" : "#22C55E",
                              }}
                            >
                              {plc.rate > 0
                                ? `$${plc.rate.toFixed(2)}/${cfg.unitLabel}`
                                : "None"}
                            </div>
                            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                              {plc.likelihood}
                            </div>
                            {plc.rate > 0 && (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  background: "rgba(239,68,68,0.06)",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#DC2626",
                                }}
                              >
                                ≈ ${plc.perAcre.toFixed(0)}/acre on national avg
                                yield ({cfg.nationalAvgYield} {cfg.unitLabel}/acre)
                              </div>
                            )}
                          </div>
                        )}

                        {/* Market Data */}
                        <div
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            background: "#FAFAF8",
                            border: "1px solid #E8E8E4",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#9B9B9B",
                              marginBottom: 8,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Market Details
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <DetailRow label="Settlement" value={formatPrice(price)} />
                            <DetailRow
                              label="Previous"
                              value={formatPrice(d?.previousSettle)}
                            />
                            <DetailRow
                              label="Loan Rate"
                              value={`$${cfg.loanRate.toFixed(2)}/${cfg.unitLabel}`}
                            />
                            <DetailRow
                              label="Marketing Year"
                              value={cfg.marketingYear}
                            />
                            <DetailRow
                              label="Data Points"
                              value={`${priceHistory.length} days`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cross-link CTAs */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <Link
                          href="/check"
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: "#1B4332",
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          📊 Calculate Your ARC/PLC →
                        </Link>
                        <Link
                          href="/payments"
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: "#F0F0EC",
                            color: "#1a1a1a",
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          💰 Estimate Your Payment →
                        </Link>
                        <Link
                          href="/weather"
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: "#F0F0EC",
                            color: "#1a1a1a",
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          🌤️ Ag Weather Dashboard →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ REFERENCE PRICE EXPLAINER ═══ */}
        {!loading && !error && (
          <div
            style={{
              marginTop: 32,
              padding: 24,
              borderRadius: 16,
              background: "#FFFFFF",
              border: "1px solid #E8E8E4",
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1a1a1a",
                margin: "0 0 8px 0",
              }}
            >
              How Futures Prices Affect Your ARC/PLC Payments
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#6B7280",
                lineHeight: 1.65,
                margin: "0 0 16px 0",
              }}
            >
              Under the OBBBA farm bill, PLC payments trigger when the Marketing Year Average (MYA) price
              falls below the Effective Reference Price (ERP). The MYA is calculated from monthly national
              average prices received by farmers, weighted by marketing percentages. Futures settlement prices
              shown here indicate the market&apos;s expectation of where cash prices are heading — when futures
              trade below the ERP, it signals potential PLC payments ahead.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.12)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#22C55E" }}>
                  ✅ Above Reference
                </span>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                  Futures above the ERP suggest the MYA may stay high enough that no PLC payment triggers. ARC-CO may still pay if county revenue drops.
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.12)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B" }}>
                  ⚠️ Near Reference
                </span>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                  Within 5% of the ERP — the MYA could go either way depending on remaining marketing months. Monitor closely.
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.12)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#EF4444" }}>
                  🔴 Below Reference
                </span>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                  Futures below the ERP strongly suggest PLC payments will trigger. The further below, the larger the payment per base acre.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ USDA REPORT CALENDAR ═══ */}
        {usdaReports.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: 24,
              borderRadius: 16,
              background: "#FFFFFF",
              border: "1px solid #E8E8E4",
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1a1a1a",
                margin: "0 0 16px 0",
              }}
            >
              📅 Upcoming USDA Reports That Move Markets
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {usdaReports.map((report, i) => {
                const days = daysUntil(report.date);
                return (
                  <div
                    key={`${report.name}-${report.date}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 14,
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: 10,
                      background:
                        days <= 3
                          ? "rgba(245,158,11,0.05)"
                          : "#FAFAF8",
                      border: `1px solid ${
                        days <= 3
                          ? "rgba(245,158,11,0.12)"
                          : "#F0F0EC"
                      }`,
                    }}
                  >
                    <div style={{ textAlign: "center", minWidth: 50 }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color:
                            days <= 3
                              ? "#F59E0B"
                              : days <= 7
                              ? "#3B82F6"
                              : "#1a1a1a",
                        }}
                      >
                        {formatDate(report.date)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#1a1a1a",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {report.name}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              report.impact === "high"
                                ? "rgba(239,68,68,0.1)"
                                : report.impact === "medium"
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(107,114,128,0.1)",
                            color:
                              report.impact === "high"
                                ? "#EF4444"
                                : report.impact === "medium"
                                ? "#F59E0B"
                                : "#6B7280",
                            textTransform: "uppercase",
                          }}
                        >
                          {report.impact}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 2 }}>
                        {report.description}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: days <= 3 ? "#F59E0B" : "#6B7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {days === 0
                        ? "Today"
                        : days === 1
                        ? "Tomorrow"
                        : `${days} days`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ DATA SOURCE & METHODOLOGY NOTE ═══ */}
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            borderRadius: 12,
            background: "#F5F5F1",
            border: "1px solid #E8E8E4",
          }}
        >
          <div style={{ fontSize: 12, color: "#9B9B9B", lineHeight: 1.6 }}>
            <strong style={{ color: "#6B7280" }}>Data Sources & Methodology:</strong>{" "}
            Futures settlement prices from Nasdaq Data Link (CME continuous front-month contracts).
            Reference prices per OBBBA (Pub. L. 119-21). PLC payment projections are estimates
            based on futures prices as a directional indicator — actual payments depend on the
            Marketing Year Average calculated from NASS monthly prices received. Prices update
            after daily settlement (~1:15 PM CT on trading days).
          </div>
        </div>

        {/* ═══ CTA SECTION ═══ */}
        <div
          style={{
            marginTop: 32,
            padding: "40px 24px",
            borderRadius: 20,
            background:
              "linear-gradient(135deg, #0C1F17 0%, #1B4332 50%, #0f2b1e 100%)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.03,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3
              style={{
                fontSize: "clamp(22px, 4vw, 30px)",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "0 0 10px 0",
                letterSpacing: "-0.01em",
              }}
            >
              Get Personalized Payment Projections
            </h3>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.6)",
                maxWidth: 480,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              Enter your county, crops, and base acres to see exactly how today&apos;s
              prices translate to your specific ARC/PLC payment.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/check"
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: "#C9A84C",
                  color: "#0C1F17",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Calculate My Payment →
              </Link>
              <Link
                href="/signup"
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sublabel,
  color,
  bgColor,
  borderColor,
}: {
  label: string;
  value: number;
  sublabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginTop: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: "#9B9B9B", marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 12, color: "#9B9B9B" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
        {value}
      </span>
    </div>
  );
}
