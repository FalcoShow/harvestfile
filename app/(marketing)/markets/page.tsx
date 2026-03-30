// =============================================================================
// HarvestFile — Build 16 Deploy 1: Premium Commodity Markets Dashboard
// app/(marketing)/markets/page.tsx
//
// COMPLETE REWRITE — inline styles → Tailwind + shadcn/ui
// The only commodity price dashboard that connects futures prices to
// ARC/PLC payment projections. No competitor offers this.
//
// Data: Yahoo Finance v8 via /api/prices/futures (cents→dollars converted)
// Reference prices: OBBBA parameters (Pub. L. 119-21)
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
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Professional SVG Crop Icons ─────────────────────────────────────────────
// Replace all emoji with clean, consistent inline SVGs

function CornIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#FEF3C7" />
      <path d="M16 6c-1.5 0-3 2-3.5 5-.3 1.8-.3 3.8 0 5.5.5 3 2 5.5 3.5 5.5s3-2.5 3.5-5.5c.3-1.7.3-3.7 0-5.5C19 8 17.5 6 16 6z" fill="#F59E0B" />
      <path d="M14 10.5c.3-.2.8-.3 1.2-.2m-1.2 2.7c.3-.2.8-.3 1.2-.2m-1 2.7c.3-.2.7-.3 1.1-.2" stroke="#D97706" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M18 10.5c-.3-.2-.8-.3-1.2-.2m1.2 2.7c-.3-.2-.8-.3-1.2-.2m1 2.7c-.3-.2-.7-.3-1.1-.2" stroke="#D97706" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M14.5 22c.5 1.5 1 3 1.5 4m1.5-4c-.5 1.5-1 3-1.5 4" stroke="#65A30D" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function SoybeanIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#D1FAE5" />
      <ellipse cx="12.5" cy="16" rx="3.5" ry="4.5" fill="#059669" />
      <ellipse cx="19.5" cy="16" rx="3.5" ry="4.5" fill="#059669" />
      <ellipse cx="16" cy="13" rx="3" ry="3.5" fill="#10B981" />
      <path d="M16 8c0 0-1.5-2-3-2s-2 1-2 1" stroke="#065F46" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function WheatIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#FEF9C3" />
      <path d="M16 26V12" stroke="#A16207" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16 12c-2-1.5-4-1-4 1s2 3 4 2" fill="#D97706" />
      <path d="M16 12c2-1.5 4-1 4 1s-2 3-4 2" fill="#D97706" />
      <path d="M16 16c-2-1.5-4-1-4 1s2 3 4 2" fill="#EAB308" />
      <path d="M16 16c2-1.5 4-1 4 1s-2 3-4 2" fill="#EAB308" />
      <path d="M16 8c-1.5-1.2-3-.8-3 .8s1.5 2.2 3 1.5" fill="#CA8A04" />
      <path d="M16 8c1.5-1.2 3-.8 3 .8s-1.5 2.2-3 1.5" fill="#CA8A04" />
    </svg>
  );
}

function OatsIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#F3F4F6" />
      <path d="M16 26V14" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" />
      <path d="M13 10c0 1.5 1.3 3 3 3s3-1.5 3-3-1.3-3-3-3-3 1.5-3 3z" fill="#9CA3AF" />
      <path d="M12 14c0 1.2 1.8 2.5 4 2.5s4-1.3 4-2.5" stroke="#6B7280" strokeWidth="0.8" />
      <path d="M13 17.5c0 1 1.3 2 3 2s3-1 3-2" stroke="#6B7280" strokeWidth="0.8" />
    </svg>
  );
}

function RiceIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#EDE9FE" />
      <ellipse cx="12" cy="15" rx="2" ry="3.5" fill="#8B5CF6" transform="rotate(-15 12 15)" />
      <ellipse cx="16" cy="14" rx="2" ry="3.5" fill="#A78BFA" />
      <ellipse cx="20" cy="15" rx="2" ry="3.5" fill="#8B5CF6" transform="rotate(15 20 15)" />
      <path d="M16 19v5" stroke="#6D28D9" strokeWidth="1" strokeLinecap="round" />
      <path d="M12 18v4m8-4v4" stroke="#6D28D9" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

const CROP_ICONS: Record<string, React.FC<{ className?: string }>> = {
  CORN: CornIcon,
  SOYBEANS: SoybeanIcon,
  WHEAT: WheatIcon,
  OATS: OatsIcon,
  RICE: RiceIcon,
};

// ─── Commodity Configuration ─────────────────────────────────────────────────

interface CommodityConfig {
  code: string;
  name: string;
  unit: string;
  unitLabel: string;
  statutoryRefPrice: number;
  effectiveRefPrice: number;
  loanRate: number;
  color: string;
  marketingYear: string;
  nationalAvgYield: number;
}

const COMMODITIES: Record<string, CommodityConfig> = {
  CORN: {
    code: "CORN",
    name: "Corn",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 4.10,
    effectiveRefPrice: 4.42,
    loanRate: 2.20,
    color: "#F59E0B",
    marketingYear: "Sep–Aug",
    nationalAvgYield: 177,
  },
  SOYBEANS: {
    code: "SOYBEANS",
    name: "Soybeans",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 10.0,
    effectiveRefPrice: 10.71,
    loanRate: 6.2,
    color: "#059669",
    marketingYear: "Sep–Aug",
    nationalAvgYield: 51,
  },
  WHEAT: {
    code: "WHEAT",
    name: "Wheat",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 6.35,
    effectiveRefPrice: 6.35,
    loanRate: 3.38,
    color: "#D97706",
    marketingYear: "Jun–May",
    nationalAvgYield: 52,
  },
  OATS: {
    code: "OATS",
    name: "Oats",
    unit: "$/bu",
    unitLabel: "bu",
    statutoryRefPrice: 2.65,
    effectiveRefPrice: 3.05,
    loanRate: 1.43,
    color: "#6B7280",
    marketingYear: "Jun–May",
    nationalAvgYield: 64,
  },
  RICE: {
    code: "RICE",
    name: "Rice",
    unit: "$/cwt",
    unitLabel: "cwt",
    statutoryRefPrice: 15.0,
    effectiveRefPrice: 15.0,
    loanRate: 7.0,
    color: "#8B5CF6",
    marketingYear: "Aug–Jul",
    nationalAvgYield: 75,
  },
};

const COMMODITY_ORDER = ["CORN", "SOYBEANS", "WHEAT", "OATS", "RICE"];

// ─── USDA Report Calendar (auto-computed) ────────────────────────────────────

interface USDAReport {
  name: string;
  date: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

function getUpcomingUSDAReports(): USDAReport[] {
  const now = new Date();
  const year = now.getFullYear();

  // Known fixed-date reports for the current and next year
  const fixedReports: USDAReport[] = [
    // WASDE — monthly, typically 2nd week
    { name: "WASDE Report", date: `${year}-01-12`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-02-10`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-03-10`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-04-09`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-05-12`, impact: "HIGH", description: "First new-crop estimates — highest impact" },
    { name: "WASDE Report", date: `${year}-06-11`, impact: "HIGH", description: "Updated supply/demand balance sheets" },
    { name: "WASDE Report", date: `${year}-07-10`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-08-12`, impact: "HIGH", description: "First field-survey production estimates" },
    { name: "WASDE Report", date: `${year}-09-12`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-10-09`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-11-10`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    { name: "WASDE Report", date: `${year}-12-10`, impact: "HIGH", description: "World Agricultural Supply & Demand Estimates" },
    // Prospective Plantings — last business day of March
    { name: "Prospective Plantings", date: `${year}-03-31`, impact: "HIGH", description: "First planted acre intentions — major market mover" },
    // Grain Stocks — quarterly
    { name: "Grain Stocks", date: `${year}-03-31`, impact: "HIGH", description: "Quarterly stocks — combined with Plantings" },
    { name: "Grain Stocks", date: `${year}-06-30`, impact: "HIGH", description: "Quarterly stocks — combined with Acreage" },
    { name: "Grain Stocks", date: `${year}-09-30`, impact: "HIGH", description: "Quarterly grain stocks report" },
    // Acreage — last business day of June
    { name: "Acreage Report", date: `${year}-06-30`, impact: "HIGH", description: "Actual planted acres vs. March intentions" },
  ];

  // Crop Progress — weekly Mondays, April through November
  const cropProgressReports: USDAReport[] = [];
  for (let month = 3; month <= 10; month++) {
    for (let day = 1; day <= 31; day++) {
      try {
        const d = new Date(year, month, day);
        if (d.getMonth() !== month) break;
        if (d.getDay() === 1) {
          cropProgressReports.push({
            name: "Crop Progress",
            date: d.toISOString().split("T")[0],
            impact: "MEDIUM",
            description: "Weekly planting progress & crop condition ratings",
          });
        }
      } catch { break; }
    }
  }

  // Export Sales — weekly Thursdays
  const exportSalesReports: USDAReport[] = [];
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - startDate.getDay() + 4);
  for (let i = 0; i < 8; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * 7);
    exportSalesReports.push({
      name: "Export Sales",
      date: d.toISOString().split("T")[0],
      impact: "MEDIUM",
      description: "Weekly new & outstanding export commitments",
    });
  }

  const allReports = [...fixedReports, ...cropProgressReports, ...exportSalesReports];

  return allReports
    .filter((r) => new Date(r.date + "T23:59:59") >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);
}

// ─── Market Status Logic ─────────────────────────────────────────────────────

interface MarketStatus {
  status: "day_session" | "overnight" | "pre_market" | "closed" | "weekend";
  label: string;
  nextEvent: string;
  isLive: boolean;
}

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const ct = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const day = ct.getDay();
  const hour = ct.getHours();
  const min = ct.getMinutes();
  const t = hour + min / 60;

  if (day === 6 || (day === 0 && t < 19)) {
    return { status: "weekend", label: "Markets Closed", nextEvent: day === 6 ? "Opens Sunday 7:00 PM CT" : "Opens tonight 7:00 PM CT", isLive: false };
  }
  if (day === 5 && t >= 13.333) {
    return { status: "weekend", label: "Markets Closed", nextEvent: "Opens Sunday 7:00 PM CT", isLive: false };
  }
  if (t >= 19 || t < 7.75) {
    return { status: "overnight", label: "Overnight Session", nextEvent: "Day session 8:30 AM CT", isLive: true };
  }
  if (t >= 7.75 && t < 8.5) {
    return { status: "pre_market", label: "Pre-Market Break", nextEvent: "Day session 8:30 AM CT", isLive: false };
  }
  if (t >= 8.5 && t < 13.333) {
    return { status: "day_session", label: "Day Session — Live", nextEvent: "Settlement ~1:15 PM CT", isLive: true };
  }
  return { status: "closed", label: "Markets Closed", nextEvent: "Overnight opens 7:00 PM CT", isLive: false };
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
  const target = new Date(dateStr + "T12:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function calcPLCPayment(
  futuresPrice: number,
  config: CommodityConfig
): { rate: number; perAcre: number; likelihood: string; status: "none" | "possible" | "likely" } {
  const plcRate = Math.max(0, config.effectiveRefPrice - Math.max(futuresPrice, config.loanRate));
  const perAcre = plcRate * config.nationalAvgYield * 0.85;

  if (futuresPrice >= config.effectiveRefPrice) {
    return { rate: plcRate, perAcre, likelihood: "No PLC Payment", status: "none" };
  } else if (futuresPrice >= config.effectiveRefPrice * 0.95) {
    return { rate: plcRate, perAcre, likelihood: "PLC Possible", status: "possible" };
  }
  return { rate: plcRate, perAcre, likelihood: `PLC: $${plcRate.toFixed(2)}/${config.unitLabel}`, status: "likely" };
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

// ─── Skeleton Components ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="w-24 h-8 bg-muted animate-pulse rounded hidden sm:block" />
        <div className="text-right space-y-2">
          <div className="h-6 w-16 bg-muted animate-pulse rounded ml-auto" />
          <div className="h-3 w-20 bg-muted animate-pulse rounded ml-auto" />
        </div>
        <div className="h-7 w-28 bg-muted animate-pulse rounded hidden md:block" />
      </div>
    </Card>
  );
}

function SkeletonSummary() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="p-4 text-center">
          <div className="h-8 w-8 bg-muted animate-pulse rounded mx-auto mb-2" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto mb-1" />
          <div className="h-3 w-28 bg-muted animate-pulse rounded mx-auto" />
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [data, setData] = useState<Record<string, CommodityData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"30d" | "90d">("30d");
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const marketStatus = useMemo(() => getMarketStatus(), []);
  const usdaReports = useMemo(() => getUpcomingUSDAReports(), []);

  // Fetch futures data
  const fetchData = useCallback(async () => {
    try {
      const codes = COMMODITY_ORDER.join(",");
      const days = timeRange === "90d" ? 90 : 30;
      const res = await fetch(`/api/prices/futures?commodities=${codes}&days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch market data");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastFetched(json.timestamp || new Date().toISOString());
      } else {
        throw new Error(json.error || "No data returned");
      }
    } catch (err: any) {
      setError(err.message || "Unable to load market data");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Market-aware polling
  useEffect(() => {
    const interval = marketStatus.isLive ? 5 * 60 * 1000 : 60 * 60 * 1000;
    const timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [marketStatus.isLive, fetchData]);

  // Summary stats
  const summary = useMemo(() => {
    let above = 0, near = 0, below = 0;
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

  // Market status colors
  const statusDotClass = marketStatus.isLive
    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
    : marketStatus.status === "pre_market"
    ? "bg-amber-400"
    : "bg-gray-400";

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-harvest-forest-950 via-harvest-forest-800 to-[#0f2b1e] pt-28 sm:pt-32 pb-12 px-5">
        <div className="hf-noise" />

        <div className="relative z-10 max-w-[1200px] mx-auto">
          {/* Status Badge */}
          <div className="flex items-center gap-3 mb-5">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15 px-3 py-1 text-xs font-semibold tracking-wide"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
              Free Tool — No Account Required
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-[clamp(28px,5vw,48px)] font-extrabold text-white leading-[1.08] tracking-tight mb-4">
            Agricultural Commodity
            <br />
            <span className="text-harvest-gold">Markets & Payment Impact</span>
          </h1>

          <p className="text-[clamp(15px,2vw,18px)] text-white/60 max-w-xl leading-relaxed mb-8">
            The only free tool that connects commodity futures prices to your
            ARC/PLC payment projections. See what today&apos;s prices mean for
            your farm program payments — updated daily.
          </p>

          {/* Market Status Bar */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDotClass} ${marketStatus.isLive ? "animate-pulse" : ""}`} />
            <span className="text-sm font-semibold text-white">
              {marketStatus.label}
            </span>
            <Separator orientation="vertical" className="h-4 bg-white/10" />
            <span className="text-xs text-white/40">
              {marketStatus.nextEvent}
            </span>
          </div>
        </div>
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="max-w-[1200px] mx-auto px-5 py-8 pb-16">

        {/* Last Updated */}
        {lastFetched && !loading && (
          <div className="flex items-center justify-end gap-2 mb-4 text-xs text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.isLive ? "bg-emerald-400" : "bg-gray-400"}`} />
            <span>Prices updated {timeAgo(lastFetched)}</span>
            {!marketStatus.isLive && (
              <span className="text-muted-foreground/60">· Settlement prices</span>
            )}
          </div>
        )}

        {/* ── Summary Bar ─────────────────────────────────────────────── */}
        {loading ? (
          <SkeletonSummary />
        ) : !error && summary.total > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <SummaryCard
              value={summary.above}
              label="Above Reference"
              sublabel="No PLC payment expected"
              variant="green"
            />
            <SummaryCard
              value={summary.near}
              label="Near Reference"
              sublabel="PLC payment possible"
              variant="amber"
            />
            <SummaryCard
              value={summary.below}
              label="Below Reference"
              sublabel="PLC payment likely"
              variant="red"
            />
            <SummaryCard
              value={summary.total}
              label="Commodities Tracked"
              sublabel="CME settlement prices"
              variant="blue"
            />
          </div>
        ) : null}

        {/* Section Header + Time Range Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-xl font-bold text-foreground">
            Commodity Futures
          </h2>
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            {(["30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => { setTimeRange(range); setLoading(true); }}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 ${
                  timeRange === range
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range === "30d" ? "30 Day" : "90 Day"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading Skeleton ─────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error State ──────────────────────────────────────────── */}
        {error && !loading && (
          <Card className="p-8 text-center border-destructive/20 bg-destructive/[0.03]">
            <p className="text-sm font-semibold text-destructive mb-1">
              Unable to load market data
            </p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(""); fetchData(); }}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </Card>
        )}

        {/* ── Commodity Cards ──────────────────────────────────────── */}
        {!loading && !error && (
          <div className="flex flex-col gap-3">
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
              const IconComponent = CROP_ICONS[code];

              return (
                <Card
                  key={code}
                  className={`overflow-hidden transition-all duration-200 ${
                    isExpanded
                      ? "ring-1 ring-offset-0 shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  style={{
                    borderColor: isExpanded ? cfg.color + "40" : undefined,
                    ...(isExpanded ? { "--tw-ring-color": cfg.color + "30" } as any : {}),
                  }}
                >
                  {/* Card Header — always visible */}
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : code)}
                    className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
                  >
                    {/* Icon + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {IconComponent && <IconComponent className="w-10 h-10 shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-bold text-foreground">
                          {cfg.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          CME Front Month · {cfg.marketingYear}
                        </div>
                      </div>
                    </div>

                    {/* Mini Sparkline */}
                    <div className="hidden sm:block flex-1 h-10 max-w-[200px]">
                      {priceHistory.length > 2 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={priceHistory.filter((p) => p.settle !== null)}>
                            <defs>
                              <linearGradient id={`spark-${code}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
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
                              strokeOpacity={0.4}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Price + Change */}
                    <div className="text-right ml-auto sm:ml-0 min-w-[80px]">
                      <div className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatPrice(price)}
                      </div>
                      {change !== null && (
                        <div className={`text-xs font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {isUp ? "▲" : "▼"} {formatChange(change)}{" "}
                          <span className="opacity-60">{formatChangePct(changePct)}</span>
                        </div>
                      )}
                    </div>

                    {/* PLC Badge */}
                    <div className="hidden md:block min-w-[130px] text-right">
                      {plc && (
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold px-3 py-1 ${
                            plc.status === "none"
                              ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-600"
                              : plc.status === "possible"
                              ? "bg-amber-500/8 border-amber-500/15 text-amber-600"
                              : "bg-red-500/8 border-red-500/15 text-red-600"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            plc.status === "none" ? "bg-emerald-500" : plc.status === "possible" ? "bg-amber-500" : "bg-red-500"
                          }`} />
                          {plc.likelihood}
                        </Badge>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mobile PLC Badge — visible below sm */}
                  {plc && !isExpanded && (
                    <div className="flex md:hidden px-4 pb-3 -mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold px-3 py-1 ${
                          plc.status === "none"
                            ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-600"
                            : plc.status === "possible"
                            ? "bg-amber-500/8 border-amber-500/15 text-amber-600"
                            : "bg-red-500/8 border-red-500/15 text-red-600"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          plc.status === "none" ? "bg-emerald-500" : plc.status === "possible" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {plc.likelihood}
                      </Badge>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 sm:px-5 py-5">
                      {/* Price Chart */}
                      {priceHistory.length > 2 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {timeRange === "30d" ? "30" : "90"}-Day Price History
                            </span>
                            <span className="text-xs text-muted-foreground/60">
                              Dashed line = Reference Price (${cfg.effectiveRefPrice.toFixed(2)})
                            </span>
                          </div>
                          <div className="h-56 bg-muted/30 rounded-xl p-3 pr-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={priceHistory.filter((p) => p.settle !== null)}>
                                <defs>
                                  <linearGradient id={`chart-${code}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={cfg.color} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={cfg.color} stopOpacity={0.02} />
                                  </linearGradient>
                                </defs>
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
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
                                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                  axisLine={false}
                                  tickLine={false}
                                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                                  width={55}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: "hsl(var(--foreground))",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                  }}
                                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Settlement"]}
                                  labelFormatter={(label: string) =>
                                    new Date(label).toLocaleDateString("en-US", {
                                      weekday: "short", month: "short", day: "numeric", year: "numeric",
                                    })
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
                                  activeDot={{ r: 4, fill: cfg.color, strokeWidth: 2, stroke: "#fff" }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Payment Analysis Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                        {/* Reference Price */}
                        <Card className="p-4 bg-muted/30 border-border">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                            Effective Reference Price
                          </div>
                          <div className="text-2xl font-extrabold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                            ${cfg.effectiveRefPrice.toFixed(2)}
                            <span className="text-sm font-medium text-muted-foreground">/{cfg.unitLabel}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Statutory: ${cfg.statutoryRefPrice.toFixed(2)} (OBBBA)
                          </div>
                          {price && (
                            <div className="mt-3">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, (price / cfg.effectiveRefPrice) * 100)}%`,
                                    background: price >= cfg.effectiveRefPrice ? "#22C55E" : price >= cfg.effectiveRefPrice * 0.95 ? "#F59E0B" : "#EF4444",
                                  }}
                                />
                              </div>
                              <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                                <span>{((price / cfg.effectiveRefPrice) * 100).toFixed(1)}% of ref</span>
                                <span>{price >= cfg.effectiveRefPrice ? "+" : ""}${(price - cfg.effectiveRefPrice).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </Card>

                        {/* PLC Payment Projection */}
                        {plc && (
                          <Card className={`p-4 border ${plc.rate > 0 ? "bg-red-500/[0.03] border-red-500/10" : "bg-emerald-500/[0.03] border-emerald-500/10"}`}>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                              PLC Payment Projection
                            </div>
                            <div className={`text-2xl font-extrabold ${plc.rate > 0 ? "text-red-500" : "text-emerald-500"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                              {plc.rate > 0 ? `$${plc.rate.toFixed(2)}/${cfg.unitLabel}` : "None"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {plc.rate > 0 ? "Payment Expected" : "No PLC Payment Expected"}
                            </div>
                            {plc.rate > 0 && (
                              <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/[0.06] text-sm font-semibold text-red-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                                ≈ ${plc.perAcre.toFixed(0)}/acre at {cfg.nationalAvgYield} {cfg.unitLabel}/acre
                              </div>
                            )}
                          </Card>
                        )}

                        {/* Market Details */}
                        <Card className="p-4 bg-muted/30 border-border">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                            Market Details
                          </div>
                          <div className="space-y-2.5">
                            <DetailRow label="Settlement" value={formatPrice(price)} />
                            <DetailRow label="Previous" value={formatPrice(d?.previousSettle)} />
                            <DetailRow label="Loan Rate" value={`$${cfg.loanRate.toFixed(2)}/${cfg.unitLabel}`} />
                            <DetailRow label="Marketing Year" value={cfg.marketingYear} />
                            <DetailRow label="Data Points" value={`${priceHistory.length} days`} />
                          </div>
                        </Card>
                      </div>

                      {/* Cross-link CTAs */}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/check"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          Calculate Your ARC/PLC →
                        </Link>
                        <Link
                          href="/payments"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors"
                        >
                          Estimate Your Payment →
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ═══ REFERENCE PRICE EXPLAINER ═══ */}
        {!loading && !error && (
          <Card className="mt-8 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">
              How Futures Prices Affect Your ARC/PLC Payments
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Under the OBBBA farm bill, PLC payments trigger when the Marketing Year Average
              (MYA) price falls below the Effective Reference Price (ERP). Futures settlement
              prices indicate the market&apos;s expectation of where cash prices are heading —
              when futures trade below the ERP, it signals potential PLC payments ahead.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600">Above Reference</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Futures above the ERP suggest the MYA may stay high enough that no PLC
                  payment triggers. ARC-CO may still pay if county revenue drops.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">Near Reference</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Within 5% of the ERP — the MYA could go either way depending on remaining
                  marketing months. Monitor closely.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-red-600">Below Reference</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Futures below the ERP strongly suggest PLC payments will trigger. The
                  further below, the larger the payment per base acre.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ═══ USDA REPORT CALENDAR ═══ */}
        {usdaReports.length > 0 && (
          <Card className="mt-6 p-6">
            <h3 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-harvest-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              Upcoming USDA Reports That Move Markets
            </h3>
            <div className="flex flex-col gap-2">
              {usdaReports.map((report, i) => {
                const days = daysUntil(report.date);
                const isUrgent = days <= 3;
                const isSoon = days <= 7;

                return (
                  <div
                    key={`${report.name}-${report.date}-${i}`}
                    className={`grid grid-cols-[56px_1fr_auto] gap-3 items-center px-4 py-3 rounded-xl transition-colors ${
                      isUrgent
                        ? "bg-amber-500/[0.05] border border-amber-500/10"
                        : "bg-muted/30 border border-transparent hover:border-border"
                    }`}
                  >
                    <div className="text-center">
                      <div
                        className={`text-base font-extrabold ${
                          isUrgent ? "text-amber-500" : isSoon ? "text-blue-500" : "text-foreground"
                        }`}
                      >
                        {formatDate(report.date)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="truncate">{report.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-bold tracking-wide shrink-0 ${
                            report.impact === "HIGH"
                              ? "bg-red-500/8 border-red-500/15 text-red-500"
                              : report.impact === "MEDIUM"
                              ? "bg-amber-500/8 border-amber-500/15 text-amber-500"
                              : "bg-gray-500/8 border-gray-500/15 text-gray-500"
                          }`}
                        >
                          {report.impact}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {report.description}
                      </div>
                    </div>
                    <div className={`text-xs font-semibold whitespace-nowrap ${
                      isUrgent ? "text-amber-500" : "text-muted-foreground"
                    }`}>
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ═══ DATA SOURCE NOTE ═══ */}
        <div className="mt-6 px-5 py-4 rounded-xl bg-muted/40 border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-muted-foreground/80">Data Sources & Methodology:</span>{" "}
            Futures settlement prices from CME continuous front-month contracts.
            Reference prices per OBBBA (Pub. L. 119-21). PLC payment projections are
            estimates based on futures prices as a directional indicator — actual
            payments depend on the Marketing Year Average calculated from NASS monthly
            prices received. Prices update after daily settlement (~1:15 PM CT on trading days).
          </p>
        </div>

        {/* ═══ CTA SECTION ═══ */}
        <div className="mt-8 p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-harvest-forest-950 via-harvest-forest-800 to-[#0f2b1e] text-center relative overflow-hidden">
          <div className="hf-noise" />
          <div className="relative z-10">
            <h3 className="text-[clamp(22px,4vw,30px)] font-extrabold text-white mb-3 tracking-tight">
              Get Personalized Payment Projections
            </h3>
            <p className="text-sm text-white/50 max-w-md mx-auto mb-7 leading-relaxed">
              Enter your county, crops, and base acres to see exactly how today&apos;s
              prices translate to your specific ARC/PLC payment.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link
                href="/check"
                className="px-7 py-3 rounded-xl bg-harvest-gold text-harvest-forest-950 text-sm font-bold hover:brightness-110 transition-all shadow-[0_4px_16px_rgba(201,168,76,0.25)]"
              >
                Calculate My Payment →
              </Link>
              <Link
                href="/signup"
                className="px-7 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sublabel,
  variant,
}: {
  label: string;
  value: number;
  sublabel: string;
  variant: "green" | "amber" | "red" | "blue";
}) {
  const colors = {
    green: { text: "text-emerald-500", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/15" },
    amber: { text: "text-amber-500", bg: "bg-amber-500/[0.06]", border: "border-amber-500/15" },
    red: { text: "text-red-500", bg: "bg-red-500/[0.06]", border: "border-red-500/15" },
    blue: { text: "text-blue-500", bg: "bg-blue-500/[0.06]", border: "border-blue-500/15" },
  };
  const c = colors[variant];

  return (
    <Card className={`p-4 text-center ${c.bg} ${c.border}`}>
      <div className={`text-2xl font-extrabold ${c.text}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div className="text-xs font-semibold text-foreground mt-1">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}
