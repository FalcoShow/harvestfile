"use client";

// =============================================================================
// HarvestFile — ARC/PLC Calculator Wizard
// Build 18 Deploy 4: County Elections Tab — Decision Hub
//
// Changes from Build 18 Deploy 4:
// - Elections tab skeleton replaced with real ElectionsPanel component
// - ElectionsPanel fetches from /api/county-elections?county_fips=XXXXX
// - Donut chart, trend chart, narrative insights, BenchmarkWidget bridge
// - Cache invalidation on new calculation via invalidateElections()
// - Multi-Crop and Base Acres tabs still show skeleton placeholders (Deploy 5)
//
// Changes from Build 18 Deploy 3:
// - Historical tab skeleton replaced with real HistoricalPanel component
// - HistoricalPanel fetches from /api/historical-payments/[fips]/[crop]
// - Cache invalidation on new calculation via invalidateHistorical()
// - All other tabs still show skeleton placeholders (Deploys 4-5)
//
// Changes from Build 18 Deploy 2:
// - Step 3 results now include a 5-tab navigation bar below the hero card
// - "Comparison" tab shows existing content (hero card + chart + CTAs)
// - 4 skeleton placeholders for: Historical, Elections, Multi-Crop, Base Acres
// - Tab state managed via Zustand store (activeTab / setActiveTab)
// - URL updates with &tab= parameter for deep-linkable results
// - Hero card stays ALWAYS visible above tabs (the answer to "which pays more")
// - Tabs appear below hero for deeper analysis exploration
// - Zero visual regression on Comparison tab — every pixel identical
//
// Previous changes preserved:
// - Build 15: CTA consolidation 7→2, winner card elevation
// - Build 18 Deploy 1: Zustand sync bridge, URL state management
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DarkSelect } from "./DarkSelect";
import BenchmarkWidget from "@/components/county/BenchmarkWidget";
import { useFarmStoreSync, useFarmUrlSync } from "@/lib/stores/use-farm-sync";
import { useFarmStore, type ResultTab } from "@/lib/stores/farm-store";
import TabBar from "./components/TabBar";
import SkeletonPanel from "./components/SkeletonPanel";
import HistoricalPanel from "./components/historical/HistoricalPanel";
import ElectionsPanel from "./components/elections/ElectionsPanel";
import MultiCropPanel from "./components/multi-crop/MultiCropPanel";
import BaseAcresPanel from "./components/base-acres/BaseAcresPanel";
import EmailCapture from "./components/EmailCapture";

// Lazy-load Recharts to keep initial bundle small
const LazyChart = dynamic(() => import("./ResultChart"), { ssr: false, loading: () => null });

// ─── State & Crop Data ──────────────────────────────────────────────────────

const STATES = [
  { abbr: "AL", name: "Alabama", fips: "01" }, { abbr: "AR", name: "Arkansas", fips: "05" },
  { abbr: "AZ", name: "Arizona", fips: "04" }, { abbr: "CA", name: "California", fips: "06" },
  { abbr: "CO", name: "Colorado", fips: "08" }, { abbr: "CT", name: "Connecticut", fips: "09" },
  { abbr: "DE", name: "Delaware", fips: "10" }, { abbr: "FL", name: "Florida", fips: "12" },
  { abbr: "GA", name: "Georgia", fips: "13" }, { abbr: "ID", name: "Idaho", fips: "16" },
  { abbr: "IL", name: "Illinois", fips: "17" }, { abbr: "IN", name: "Indiana", fips: "18" },
  { abbr: "IA", name: "Iowa", fips: "19" }, { abbr: "KS", name: "Kansas", fips: "20" },
  { abbr: "KY", name: "Kentucky", fips: "21" }, { abbr: "LA", name: "Louisiana", fips: "22" },
  { abbr: "ME", name: "Maine", fips: "23" }, { abbr: "MD", name: "Maryland", fips: "24" },
  { abbr: "MI", name: "Michigan", fips: "26" }, { abbr: "MN", name: "Minnesota", fips: "27" },
  { abbr: "MS", name: "Mississippi", fips: "28" }, { abbr: "MO", name: "Missouri", fips: "29" },
  { abbr: "MT", name: "Montana", fips: "30" }, { abbr: "NE", name: "Nebraska", fips: "31" },
  { abbr: "NV", name: "Nevada", fips: "32" }, { abbr: "NH", name: "New Hampshire", fips: "33" },
  { abbr: "NJ", name: "New Jersey", fips: "34" }, { abbr: "NM", name: "New Mexico", fips: "35" },
  { abbr: "NY", name: "New York", fips: "36" }, { abbr: "NC", name: "North Carolina", fips: "37" },
  { abbr: "ND", name: "North Dakota", fips: "38" }, { abbr: "OH", name: "Ohio", fips: "39" },
  { abbr: "OK", name: "Oklahoma", fips: "40" }, { abbr: "OR", name: "Oregon", fips: "41" },
  { abbr: "PA", name: "Pennsylvania", fips: "42" }, { abbr: "SC", name: "South Carolina", fips: "45" },
  { abbr: "SD", name: "South Dakota", fips: "46" }, { abbr: "TN", name: "Tennessee", fips: "47" },
  { abbr: "TX", name: "Texas", fips: "48" }, { abbr: "UT", name: "Utah", fips: "49" },
  { abbr: "VA", name: "Virginia", fips: "51" }, { abbr: "VT", name: "Vermont", fips: "50" },
  { abbr: "WA", name: "Washington", fips: "53" }, { abbr: "WV", name: "West Virginia", fips: "54" },
  { abbr: "WI", name: "Wisconsin", fips: "55" }, { abbr: "WY", name: "Wyoming", fips: "56" },
];

const CROPS = [
  { code: "CORN", name: "Corn" },
  { code: "SOYBEANS", name: "Soybeans" },
  { code: "WHEAT", name: "Wheat" },
  { code: "SORGHUM", name: "Sorghum" },
  { code: "BARLEY", name: "Barley" },
  { code: "OATS", name: "Oats" },
  { code: "RICE", name: "Rice" },
  { code: "PEANUTS", name: "Peanuts" },
  { code: "COTTON", name: "Cotton" },
];

// Premium filled/duotone crop icons — botanical illustration style for dark UI
function CropIcon({ crop, size = 28 }: { crop: string; size?: number }) {
  const s = size;
  const props = { width: s, height: s, viewBox: "0 0 32 32", fill: "none", xmlns: "http://www.w3.org/2000/svg" };

  switch (crop) {
    case "CORN": return (
      <svg {...props}>
        <path d="M16 4v24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 6c-1 0-4 1-4.5 6s-.5 8-.5 8h10s0-3-.5-8S17 6 16 6z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M11.5 12h9M11.5 15h9M12 18h8" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" strokeLinecap="round" />
        <path d="M12 8c-2-.5-4 0-5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M20 8c2-.5 4 0 5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
    case "SOYBEANS": return (
      <svg {...props}>
        <path d="M16 6v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="12" cy="14" rx="4" ry="5.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="20" cy="14" rx="4" ry="5.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12" cy="12.5" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <circle cx="20" cy="12.5" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <circle cx="20" cy="16" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <path d="M13 7c-1-2-3-3-5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M19 7c1-2 3-3 5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
    case "WHEAT": return (
      <svg {...props}>
        <path d="M16 8v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 4l-3 4h6l-3-4z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
        <path d="M13 8l-2.5 3.5h11L19 8" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1" />
        <path d="M10.5 11.5l-2 3h15l-2-3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
        <path d="M8.5 14.5l-1 2h17l-1-2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1" />
        <path d="M12 20c-3-1-5-.5-6 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
        <path d="M20 20c3-1 5-.5 6 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
    );
    case "SORGHUM": return (
      <svg {...props}>
        <path d="M16 12v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="16" cy="9" rx="5" ry="6" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="7" r="1.2" fill="currentColor" fillOpacity="0.35" />
        <circle cx="18" cy="7" r="1.2" fill="currentColor" fillOpacity="0.35" />
        <circle cx="16" cy="5" r="1.2" fill="currentColor" fillOpacity="0.35" />
        <circle cx="16" cy="9.5" r="1.2" fill="currentColor" fillOpacity="0.35" />
        <circle cx="13" cy="10" r="1" fill="currentColor" fillOpacity="0.25" />
        <circle cx="19" cy="10" r="1" fill="currentColor" fillOpacity="0.25" />
        <path d="M12 15c-2.5-1-4.5 0-5.5 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M20 15c2.5-1 4.5 0 5.5 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
    case "BARLEY": return (
      <svg {...props}>
        <path d="M16 10v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 3l-2.5 3 2.5 1 2.5-1L16 3z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
        <path d="M13.5 6l-2 2.5 5 1.5 5-1.5-2-2.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1" />
        <path d="M11.5 8.5l-1.5 2.5 6 1.5 6-1.5-1.5-2.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
        <path d="M16 3v-1M14 4l-1-1.5M18 4l1-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
        <path d="M12 16c-3-.5-5 .5-6 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M20 16c3-.5 5 .5 6 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
    case "OATS": return (
      <svg {...props}>
        <path d="M16 10v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 8c-3-5-7-6-8-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M16 8c3-5 7-6 8-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="9" cy="4.5" rx="2.5" ry="3" transform="rotate(-15 9 4.5)" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="23" cy="4.5" rx="2.5" ry="3" transform="rotate(15 23 4.5)" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
        <path d="M16 12c-2.5-3-5.5-4-7-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
        <path d="M16 12c2.5-3 5.5-4 7-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
    );
    case "RICE": return (
      <svg {...props}>
        <path d="M16 6v22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 4c-2 2-6 4-7 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M16 4c2 2 6 4 7 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M16 8c-2 2-5 3.5-6 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        <path d="M16 8c2 2 5 3.5 6 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        <ellipse cx="10" cy="11" rx="1.5" ry="2.5" transform="rotate(-20 10 11)" fill="currentColor" fillOpacity="0.2" />
        <ellipse cx="22" cy="11" rx="1.5" ry="2.5" transform="rotate(20 22 11)" fill="currentColor" fillOpacity="0.2" />
        <ellipse cx="11" cy="14.5" rx="1.3" ry="2" transform="rotate(-15 11 14.5)" fill="currentColor" fillOpacity="0.15" />
        <ellipse cx="21" cy="14.5" rx="1.3" ry="2" transform="rotate(15 21 14.5)" fill="currentColor" fillOpacity="0.15" />
      </svg>
    );
    case "PEANUTS": return (
      <svg {...props}>
        <path d="M16 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M10 14c0-4 2-7 6-7s6 3 6 7c0 3-2 5.5-3 6.5-.8.8-1.5 1-3 1s-2.2-.2-3-1c-1-1-3-3.5-3-6.5z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
        <path d="M16 8v12" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 2" />
        <path d="M10.5 14h11" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
        <circle cx="13" cy="11.5" r="1.8" fill="currentColor" fillOpacity="0.2" />
        <circle cx="19" cy="11.5" r="1.8" fill="currentColor" fillOpacity="0.2" />
        <circle cx="13" cy="16" r="1.8" fill="currentColor" fillOpacity="0.2" />
        <circle cx="19" cy="16" r="1.8" fill="currentColor" fillOpacity="0.2" />
      </svg>
    );
    case "COTTON": return (
      <svg {...props}>
        <path d="M16 18v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="12" r="6" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="10" r="2.5" fill="currentColor" fillOpacity="0.2" />
        <circle cx="18.5" cy="10" r="2.5" fill="currentColor" fillOpacity="0.2" />
        <circle cx="16" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
        <circle cx="13" cy="13.5" r="2" fill="currentColor" fillOpacity="0.15" />
        <circle cx="19" cy="13.5" r="2" fill="currentColor" fillOpacity="0.15" />
        <path d="M12.5 17.5c-1.5.5-2 2-1.5 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
        <path d="M19.5 17.5c1.5.5 2 2 1.5 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
        <path d="M16 6c0-1.5 1-3 2.5-3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
      </svg>
    );
    default: return (<svg {...props}><circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" /><path d="M16 12v8M12 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>);
  }
}

// National benchmark data — OBBBA updated reference prices & typical values
const BENCH: Record<string, { by: number; bp: number; mya: number; lr: number; ref: number; pyf: number; unit: string }> = {
  CORN:     { by: 178,  bp: 5.03,  mya: 3.90,  lr: 2.20,  ref: 4.10,  pyf: 0.91, unit: "bu" },
  SOYBEANS: { by: 52,   bp: 12.1,  mya: 10.2,  lr: 6.20,  ref: 10.0,  pyf: 0.90, unit: "bu" },
  WHEAT:    { by: 48,   bp: 6.80,  mya: 5.40,  lr: 3.38,  ref: 6.35,  pyf: 0.89, unit: "bu" },
  SORGHUM:  { by: 72,   bp: 4.35,  mya: 3.75,  lr: 2.20,  ref: 3.95,  pyf: 0.89, unit: "bu" },
  BARLEY:   { by: 75,   bp: 5.25,  mya: 4.60,  lr: 2.50,  ref: 4.95,  pyf: 0.87, unit: "bu" },
  OATS:     { by: 68,   bp: 3.70,  mya: 3.20,  lr: 1.93,  ref: 2.40,  pyf: 0.85, unit: "bu" },
  RICE:     { by: 75,   bp: 14.50, mya: 12.50, lr: 7.00,  ref: 14.00, pyf: 0.89, unit: "cwt" },
  PEANUTS:  { by: 4100, bp: 0.23,  mya: 0.21,  lr: 0.1775,ref: 0.2675,pyf: 0.88, unit: "lb" },
  COTTON:   { by: 2400, bp: 0.32,  mya: 0.28,  lr: 0.25,  ref: 0.367, pyf: 0.88, unit: "lb" },
};

interface EstimateResult {
  arc: number;
  plc: number;
  arcPerAcre: number;
  plcPerAcre: number;
  best: "ARC-CO" | "PLC";
  diff: number;
  diffPerAcre: number;
}

function quickEstimate(crop: string, acres: number): EstimateResult {
  const d = BENCH[crop];
  if (!d || !acres) return { arc: 0, plc: 0, arcPerAcre: 0, plcPerAcre: 0, best: "ARC-CO", diff: 0, diffPerAcre: 0 };

  const yA = Math.round(d.by * 0.88);
  const bR = d.by * d.bp;
  const gu = bR * 0.9;
  const aR = yA * Math.max(d.mya, d.lr);
  const arcR = Math.min(Math.max(0, gu - aR), bR * 0.12);
  const arcPerAcre = Math.round(arcR * 0.85 * 0.943 * 100) / 100;
  const arcT = Math.round(arcPerAcre * acres);

  const erp = Math.max(d.ref, Math.min(0.88 * d.bp, 1.15 * d.ref));
  const plcR = Math.max(0, erp - Math.max(d.mya, d.lr));
  const plcY = Math.round(d.by * d.pyf * 10) / 10;
  const plcPerAcre = Math.round(plcR * plcY * 0.85 * 0.943 * 100) / 100;
  const plcT = Math.round(plcPerAcre * acres);

  const best = arcT >= plcT ? "ARC-CO" as const : "PLC" as const;
  const diff = Math.abs(arcT - plcT);
  const diffPerAcre = Math.round(Math.abs(arcPerAcre - plcPerAcre) * 100) / 100;

  return { arc: arcT, plc: plcT, arcPerAcre, plcPerAcre, best, diff, diffPerAcre };
}

// ─── County Type ────────────────────────────────────────────────────────────

interface CountyOption {
  county_fips: string;
  display_name: string;
  slug: string;
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 2000, prefix = "$" }: { value: number; duration?: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // EaseOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }

    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);

  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{prefix}{display.toLocaleString()}</span>;
}

// ─── Scroll Reveal (CSS-only, Intersection Observer) ────────────────────────

function ScrollReveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Stagger Item (for results reveal) ──────────────────────────────────────

function StaggerItem({ children, index, className = "" }: { children: React.ReactNode; index: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        opacity: 0,
        animation: `qc-enter 0.4s cubic-bezier(0.16,1,0.3,1) ${200 + index * 80}ms forwards`,
      }}
    >
      {children}
    </div>
  );
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 22V18a2 2 0 0 1 4 0v4" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Valid tab values (for URL param validation) ─────────────────────────────
const VALID_TABS: ResultTab[] = ['comparison', 'historical', 'elections', 'optimization', 'base-acres'];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function CheckCalculator() {
  // Wizard state
  const [step, setStep] = useState(1); // 1=location, 2=farm, 3=results
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward");
  const [isAnimating, setIsAnimating] = useState(false);

  // Form state
  const [stateAbbr, setStateAbbr] = useState("");
  const [countyFips, setCountyFips] = useState("");
  const [countyName, setCountyName] = useState("");
  const [countySlug, setCountySlug] = useState("");
  const [cropCode, setCropCode] = useState("");
  const [acres, setAcres] = useState("");

  // Data state
  const [counties, setCounties] = useState<CountyOption[]>([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [results, setResults] = useState<EstimateResult | null>(null);
  const [isCountySpecific, setIsCountySpecific] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [dataYears, setDataYears] = useState(0);

  // Email capture (optional, after results)
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  // Mount animation
  const [mounted, setMounted] = useState(false);
  const [shared, setShared] = useState(false);
  const pendingUrlCalc = useRef<{ county: string; crop: string; acres: string; countyName: string } | null>(null);

  // ── Tab State (Build 18 Deploy 2) ───────────────────────────────────────
  // Read from Zustand store — this is what TabBar reads/writes
  const activeTab = useFarmStore((s) => s.activeTab);
  const setActiveTab = useFarmStore((s) => s.setActiveTab);
  const invalidateHistorical = useFarmStore((s) => s.invalidateHistorical);
  const invalidateElections = useFarmStore((s) => s.invalidateElections);
  const invalidateOptimization = useFarmStore((s) => s.invalidateOptimization);
  const invalidateBaseAcres = useFarmStore((s) => s.invalidateBaseAcres);

  // ── Farm Store Sync (Build 18 Deploy 1) ─────────────────────────────────
  // Bridges local useState to the Zustand store for cross-tool data sharing.
  // Zero visual changes — new tab components in Deploy 2+ read from the store.
  const { syncInputs, syncResults, syncStep, syncCounties } = useFarmStoreSync();
  useFarmUrlSync();

  useEffect(() => {
    setMounted(true);
    // Read URL params for shared links
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const urlState = p.get("state");
      const urlCounty = p.get("county");
      const urlCrop = p.get("crop");
      const urlAcres = p.get("acres");
      const urlName = p.get("name");

      // ── Read tab param from URL (Build 18 Deploy 2) ────────────────
      const urlTab = p.get("tab") as ResultTab | null;
      if (urlTab && VALID_TABS.includes(urlTab)) {
        setActiveTab(urlTab);
      }

      if (urlState && urlCounty && urlCrop && urlAcres) {
        setStateAbbr(urlState);
        pendingUrlCalc.current = { county: urlCounty, crop: urlCrop, acres: urlAcres, countyName: urlName || "" };
      }
    }
  }, [setActiveTab]);

  // ── Sync inputs to farm store whenever they change ────────────────────────
  useEffect(() => {
    syncInputs({ stateAbbr, countyFips, countyName, countySlug, cropCode, acres });
  }, [stateAbbr, countyFips, countyName, countySlug, cropCode, acres, syncInputs]);

  // ── Sync step to farm store ───────────────────────────────────────────────
  useEffect(() => {
    syncStep(step, calculating);
  }, [step, calculating, syncStep]);

  // ── Sync results to farm store when they arrive ───────────────────────────
  useEffect(() => {
    if (results) {
      syncResults({ result: results, isCountySpecific, dataYears });
    }
  }, [results, isCountySpecific, dataYears, syncResults]);

  // ── Step transitions ──────────────────────────────────────────────────────

  const goTo = useCallback((nextStep: number) => {
    const dir = nextStep > step ? "forward" : "back";
    setAnimDir(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 200);
  }, [step]);

  // ── Fetch counties when state changes ─────────────────────────────────────

  useEffect(() => {
    if (!stateAbbr) { setCounties([]); syncCounties([], false); return; }
    setLoadingCounties(true);
    syncCounties([], true);
    setCountyFips("");
    setCountyName("");
    setCountySlug("");

    fetch(`/api/calculator/counties?state=${stateAbbr}`)
      .then(r => r.json())
      .then(data => {
        const list = data.counties || [];
        setCounties(list);
        setLoadingCounties(false);
        syncCounties(list, false);
        // Auto-populate from shared URL params
        if (pendingUrlCalc.current) {
          const p = pendingUrlCalc.current;
          const match = list.find((c: CountyOption) => c.county_fips === p.county);
          if (match) {
            setCountyFips(match.county_fips);
            setCountyName(match.display_name);
            setCountySlug(match.slug);
            setCropCode(p.crop);
            setAcres(p.acres);
            pendingUrlCalc.current = null;
            // Auto-calculate after a tick
            setTimeout(() => {
              const btn = document.getElementById("hf-calc-btn");
              if (btn) btn.click();
            }, 100);
          } else {
            pendingUrlCalc.current = null;
          }
        }
      })
      .catch(() => { setLoadingCounties(false); syncCounties([], false); });
  }, [stateAbbr]);

  // ── Handle tab change — update URL (Build 18 Deploy 2) ─────────────────

  const handleTabChange = useCallback((tab: ResultTab) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (tab === "comparison") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const search = params.toString();
    const newUrl = search ? `/check?${search}` : "/check";
    window.history.replaceState(null, "", newUrl);
  }, []);

  // ── Calculate results ─────────────────────────────────────────────────────

  const calculate = async () => {
    const acresNum = parseInt(acres) || 0;
    setCalculating(true);
    setShared(false);

    // Reset to Comparison tab on new calculation
    setActiveTab("comparison");
    invalidateHistorical(); // Deploy 3: clear cached historical data for new county/crop
    invalidateElections(); // Deploy 4: clear cached election data for new county

    goTo(3);

    // Update URL for shareability (doesn't trigger navigation)
    const params = new URLSearchParams({
      state: stateAbbr, county: countyFips, crop: cropCode, acres: String(acresNum), name: countyName,
    });
    window.history.replaceState(null, "", `/check?${params.toString()}`);

    // Try county-specific estimate first
    try {
      const res = await fetch(`/api/calculator/estimate?county_fips=${countyFips}&crop=${cropCode}&acres=${acresNum}`);
      const data = await res.json();

      if (data.hasCountyData && data.arcPerAcre !== undefined) {
        setResults({
          arc: data.arc,
          plc: data.plc,
          arcPerAcre: data.arcPerAcre,
          plcPerAcre: data.plcPerAcre,
          best: data.best,
          diff: data.diff,
          diffPerAcre: data.diffPerAcre,
        });
        setIsCountySpecific(true);
        setDataYears(data.dataYears || 0);
        setCalculating(false);
        return;
      }
    } catch {
      // Fall through to national benchmark
    }

    // Fall back to national benchmark estimate
    const est = quickEstimate(cropCode, acresNum);
    setResults(est);
    setIsCountySpecific(false);
    setDataYears(0);
    setCalculating(false);
  };

  // ── Save email ────────────────────────────────────────────────────────────

  const saveEmail = async () => {
    if (!email || !email.includes("@")) return;
    try {
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (SB_URL && SB_KEY) {
        await fetch(`${SB_URL}/rest/v1/email_captures`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            email,
            source: "calculator_results",
            metadata: JSON.stringify({
              state: stateAbbr, county: countyName, crop: cropCode,
              acres: parseInt(acres) || 0,
              recommendation: results?.best,
            }),
          }),
        });
      }
    } catch { /* Don't block on save failure */ }
    setEmailSaved(true);
  };

  // ── Save results to localStorage for dashboard bridge (Phase 13 Build 1) ──

  const BRIDGE_KEY = "hf_calculator_bridge";

  const saveToBridge = useCallback(() => {
    if (!results || !stateAbbr || !countyName) return;
    const cropMatch = CROPS.find(c => c.code === cropCode);
    const stateMatch = STATES.find(s => s.abbr === stateAbbr);

    const bridgeData = {
      stateAbbr,
      stateName: stateMatch?.name || stateAbbr,
      countyFips,
      countyName,
      cropCode,
      cropName: cropMatch?.name || cropCode,
      acres: parseInt(acres) || 100,
      results: {
        arc: results.arc,
        plc: results.plc,
        arcPerAcre: results.arcPerAcre,
        plcPerAcre: results.plcPerAcre,
        best: results.best,
        diff: results.diff,
        diffPerAcre: results.diffPerAcre,
      },
      isCountySpecific,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(BRIDGE_KEY, JSON.stringify(bridgeData));
    } catch {
      // localStorage might be full or disabled — don't block
    }
  }, [results, stateAbbr, countyFips, countyName, cropCode, acres, isCountySpecific]);

  // Auto-save to bridge whenever results change
  useEffect(() => {
    if (results && step === 3) {
      saveToBridge();
    }
  }, [results, step, saveToBridge]);

  // ── Helper: state slug for county link ────────────────────────────────────
  const stateObj = STATES.find(s => s.abbr === stateAbbr);
  const stateSlug = stateObj ? stateObj.name.toLowerCase().replace(/\s+/g, "-") : "";
  const cropObj = CROPS.find(c => c.code === cropCode);

  // ── Progress ──────────────────────────────────────────────────────────────
  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;
  const stepLabels = ["Your Location", "Farm Details", "Your Results"];

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "#0C1F17",
        fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
      }}
    >
      {/* Ambient aura glows — matching homepage depth (hero green + gold warmth) */}
      <div className="absolute top-[0%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 20%, rgba(15,42,30,0.8) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div className="absolute top-[3%] right-[5%] w-[500px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 50%)", filter: "blur(100px)" }} />
      <div className="absolute top-[25%] left-[0%] w-[400px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(5,150,105,0.03) 0%, transparent 50%)", filter: "blur(80px)" }} />

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-[580px] px-5 sm:px-6 pt-28 sm:pt-32 pb-10">

        {/* ── Header (steps 1-2 only) ──────────────────────────────────── */}
        {step < 3 && (
          <div
            className="text-center mb-8 sm:mb-10"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
              style={{
                background: "rgba(201,168,76,0.06)",
                border: "1px solid rgba(201,168,76,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: "hf-pulse 2s ease-in-out infinite" }} />
              <span className="text-[11px] font-bold text-[#C9A84C]/80 uppercase tracking-wider">Free — No Signup Required</span>
            </div>

            {/* Headline — weight contrast + gold gradient (matching homepage pattern) */}
            <h1 className="text-[clamp(28px,5vw,44px)] leading-[1.1] tracking-[-0.035em] mb-4">
              <span className="font-medium text-white/70">See which program</span>
              <br />
              <span className="font-extrabold text-white">
                pays you{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)" }}
                >
                  more
                </span>
              </span>
            </h1>
            <p className="text-[14px] sm:text-[15px] text-white/35 leading-relaxed max-w-[400px] mx-auto">
              Compare ARC-CO vs PLC for your county. Real USDA data. 60 seconds.
            </p>
          </div>
        )}

        {/* ── Segmented Progress Stepper (steps 1-2 only) ────────────── */}
        {step < 3 && (
          <div className="mb-7 sm:mb-9">
            {/* Step labels + progress */}
            <div className="flex items-center justify-between mb-3">
              {stepLabels.map((label, i) => {
                const stepNum = i + 1;
                const isActive = step === stepNum;
                const isComplete = step > stepNum;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                      style={{
                        background: isComplete ? "rgba(201,168,76,0.2)" : isActive ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
                        border: isComplete ? "1.5px solid rgba(201,168,76,0.4)" : isActive ? "1.5px solid rgba(201,168,76,0.25)" : "1.5px solid rgba(255,255,255,0.06)",
                        color: isComplete ? "#C9A84C" : isActive ? "#C9A84C" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {isComplete ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : stepNum}
                    </div>
                    <span
                      className="text-[11px] sm:text-[12px] font-semibold transition-colors duration-300 hidden sm:inline"
                      style={{ color: isActive ? "rgba(201,168,76,0.7)" : isComplete ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.15)" }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Continuous progress bar */}
            <div className="h-[3px] rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366)",
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Glass Card ───────────────────────────────────────────────── */}
        <div
          className="rounded-[24px] transition-all duration-500"
          style={{
            background: step < 3 ? "rgba(255,255,255,0.025)" : "transparent",
            backdropFilter: step < 3 ? "blur(40px)" : "none",
            WebkitBackdropFilter: step < 3 ? "blur(40px)" : "none",
            padding: step < 3 ? "32px 28px 36px" : "0",
            border: step < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
            boxShadow: step < 3
              ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.03)"
              : "none",
          }}
        >
          <div
            className="transition-all duration-250"
            style={{
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating
                ? animDir === "forward" ? "translateX(-16px)" : "translateX(16px)"
                : "translateX(0)",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >

            {/* ════════════════════════════════════════════════════════════
                 STEP 1: LOCATION
                 ════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div>
                <h2 className="text-[20px] sm:text-[24px] font-extrabold text-white tracking-[-0.02em] mb-1.5">
                  Where is your farm?
                </h2>
                <p className="text-[13px] text-white/30 mb-7">
                  We&apos;ll pull real USDA data for your county.
                </p>

                {/* State select */}
                <DarkSelect
                  label="State"
                  options={STATES.map(s => ({ value: s.abbr, label: s.name }))}
                  value={stateAbbr}
                  onChange={(val) => setStateAbbr(val)}
                  placeholder="Select your state..."
                />

                {/* County select */}
                {stateAbbr && (
                  <div className="mt-5" style={{ animation: "qc-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    <DarkSelect
                      label="County"
                      options={counties.map(c => ({ value: c.county_fips, label: c.display_name }))}
                      value={countyFips}
                      onChange={(val, opt) => {
                        setCountyFips(val);
                        const c = counties.find(c => c.county_fips === val);
                        if (c) { setCountyName(c.display_name); setCountySlug(c.slug); }
                      }}
                      placeholder="Select your county..."
                      searchable={true}
                      loading={loadingCounties}
                    />
                  </div>
                )}

                {/* Continue button */}
                {countyFips && (
                  <button
                    onClick={() => goTo(2)}
                    className="w-full mt-7 p-4 rounded-[14px] text-[15px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] active:duration-75"
                    style={{
                      background: "linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)",
                      color: "#0C1F17",
                      boxShadow: "0 4px 24px rgba(201,168,76,0.25), 0 0 0 0.5px rgba(201,168,76,0.3)",
                      animation: "qc-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    Continue <IconArrow />
                  </button>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                 STEP 2: FARM DETAILS
                 ════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div>
                <h2 className="text-[20px] sm:text-[24px] font-extrabold text-white tracking-[-0.02em] mb-1.5">
                  What are you growing?
                </h2>
                <p className="text-[13px] text-white/30 mb-7">
                  {countyName}, {stateAbbr} — Pick your primary crop and enter base acres.
                </p>

                {/* Crop grid */}
                <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-3">Crop</label>
                <div className="grid grid-cols-3 gap-2.5 mb-7">
                  {CROPS.map((c) => {
                    const isSelected = cropCode === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => setCropCode(c.code)}
                        className="p-3.5 sm:p-4 rounded-[16px] text-center cursor-pointer transition-all duration-300 border-2 hover:-translate-y-0.5 active:scale-[0.97] active:duration-75"
                        style={{
                          borderColor: isSelected ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.06)",
                          background: isSelected ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)",
                          boxShadow: isSelected ? "0 4px 20px rgba(201,168,76,0.1)" : "none",
                        }}
                      >
                        <div className="mb-1.5 flex justify-center transition-colors duration-300" style={{ color: isSelected ? "#C9A84C" : "rgba(255,255,255,0.3)" }}>
                          <CropIcon crop={c.code} size={32} />
                        </div>
                        <div className="text-[12px] sm:text-[13px] font-bold transition-colors duration-300" style={{ color: isSelected ? "#C9A84C" : "rgba(255,255,255,0.45)" }}>
                          {c.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Base acres — with auto-comma formatting */}
                <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-2">Base Acres</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={acres ? parseInt(acres.replace(/,/g, "")).toLocaleString() : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setAcres(raw);
                  }}
                  placeholder="e.g. 500"
                  autoFocus={!!cropCode}
                  className="w-full p-4 rounded-[14px] text-[16px] font-semibold text-white placeholder-white/20 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#C9A84C]/30"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />

                {/* Quick presets */}
                <div className="flex gap-2 justify-center mt-3">
                  {[100, 250, 500, 1000].map((v) => {
                    const rawAcres = acres.replace(/,/g, "");
                    const isActive = rawAcres === String(v);
                    return (
                      <button
                        key={v}
                        onClick={() => setAcres(String(v))}
                        className="px-3.5 py-2 rounded-xl text-[13px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                        style={{
                          background: isActive ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                          border: isActive ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          color: isActive ? "#C9A84C" : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {v.toLocaleString()} ac
                      </button>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-7">
                  <button
                    onClick={() => goTo(1)}
                    className="px-5 py-3.5 rounded-[14px] text-[14px] font-semibold border border-white/[0.08] bg-transparent text-white/35 cursor-pointer hover:text-white/55 hover:border-white/15 transition-all duration-200"
                  >
                    ← Back
                  </button>
                  <button
                    id="hf-calc-btn"
                    disabled={!cropCode || !acres || parseInt(acres.replace(/,/g, "")) <= 0}
                    onClick={calculate}
                    className="flex-1 p-3.5 rounded-[14px] text-[15px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{
                      background: cropCode && acres && parseInt(acres.replace(/,/g, "")) > 0
                        ? "linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)"
                        : "rgba(255,255,255,0.04)",
                      color: cropCode && acres && parseInt(acres.replace(/,/g, "")) > 0 ? "#0C1F17" : "rgba(255,255,255,0.15)",
                      boxShadow: cropCode && acres && parseInt(acres.replace(/,/g, "")) > 0
                        ? "0 4px 24px rgba(201,168,76,0.25), 0 0 0 0.5px rgba(201,168,76,0.3)"
                        : "none",
                    }}
                  >
                    Calculate My Payment <IconArrow />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                 STEP 3: RESULTS — Build 18 Deploy 2: Tabbed Decision Hub
                 Hero card always visible, tabs below for deeper analysis
                 ════════════════════════════════════════════════════════ */}
            {step === 3 && (results || calculating) && (
              <div>
                {/* Loading overlay — contextual, trust-building */}
                {calculating && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative mb-5">
                      <div className="w-12 h-12 border-2 border-[#C9A84C]/20 border-t-[#C9A84C] rounded-full animate-spin" />
                      <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-emerald-500/30 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                    </div>
                    <span className="text-[14px] text-white/40 font-medium mb-1">Analyzing your county data...</span>
                    <span className="text-[11px] text-white/20">Comparing ARC-CO vs PLC for {countyName || "your county"}</span>
                  </div>
                )}

                {!calculating && (
                <>
                {/* ── Results Hero Card (ALWAYS VISIBLE — above tabs) ──── */}
                <div
                  className="rounded-[24px] p-7 sm:p-10 text-center mb-6"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(40px)",
                    WebkitBackdropFilter: "blur(40px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.25)",
                    animation: "qc-scale-in 0.5s cubic-bezier(0.25,0.1,0.25,1)",
                  }}
                >
                  {/* Data source badge */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
                      background: isCountySpecific ? "rgba(5,150,105,0.1)" : "rgba(255,255,255,0.05)",
                      border: isCountySpecific ? "1px solid rgba(5,150,105,0.2)" : "1px solid rgba(255,255,255,0.06)",
                      color: isCountySpecific ? "#34D399" : "rgba(255,255,255,0.3)",
                    }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: isCountySpecific ? "#34D399" : "rgba(255,255,255,0.3)" }} />
                      {isCountySpecific ? `County data · ${dataYears} years` : "National estimate"}
                    </div>
                  </div>

                  {/* Winner badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <IconTrophy />
                    <span className="text-[13px] font-bold text-[#C9A84C] uppercase tracking-wider">
                      {results.best} Wins
                    </span>
                  </div>

                  {/* Context line */}
                  <div className="text-[13px] text-white/35 mb-2">
                    {cropObj?.name} · {parseInt(acres).toLocaleString()} base acres · {countyName || stateAbbr}
                  </div>

                  {/* Main number */}
                  <div className="text-[13px] text-white/45 font-medium mt-5 mb-2">
                    Choosing <span className="text-[#C9A84C] font-bold">{results.best}</span> could earn you
                  </div>

                  <div
                    className="text-[clamp(44px,8vw,64px)] font-extrabold text-white leading-none tracking-[-0.04em] mb-1"
                    style={{ animation: "qc-counter 0.6s cubic-bezier(0.25,0.1,0.25,1) 0.2s both" }}
                  >
                    <AnimatedNumber value={results.diff} duration={2000} />
                  </div>
                  <div className="text-[14px] text-[#C9A84C] font-semibold mb-1">
                    more per year
                  </div>
                  <div className="text-[12px] text-white/25 mb-8">
                    ${results.diffPerAcre}/acre advantage
                  </div>

                  {/* ── Comparison Cards — Winner Elevated ──────────────── */}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { name: "ARC-CO", total: results.arc, perAcre: results.arcPerAcre, isBest: results.best === "ARC-CO" },
                      { name: "PLC", total: results.plc, perAcre: results.plcPerAcre, isBest: results.best === "PLC" },
                    ]).map((p) => (
                      <div
                        key={p.name}
                        className="relative rounded-[16px] p-4 sm:p-5 text-left transition-all duration-300"
                        style={{
                          background: p.isBest ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                          border: p.isBest ? "1.5px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.04)",
                          boxShadow: p.isBest ? "0 8px 32px rgba(201,168,76,0.08)" : "none",
                          transform: p.isBest ? "translateY(-2px)" : "none",
                        }}
                      >
                        {/* Recommended badge — only on winner */}
                        {p.isBest && (
                          <div
                            className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                            style={{
                              background: "linear-gradient(135deg, #C9A84C, #E2C366)",
                              color: "#0C1F17",
                              boxShadow: "0 2px 8px rgba(201,168,76,0.25)",
                            }}
                          >
                            Recommended
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: p.isBest ? "#C9A84C" : "rgba(255,255,255,0.25)" }}
                          >
                            {p.name}
                          </span>
                          {p.isBest && (
                            <span className="text-[#C9A84C]"><IconCheck /></span>
                          )}
                        </div>
                        <div
                          className="text-[24px] sm:text-[28px] font-extrabold tracking-[-0.03em] mb-1"
                          style={{ color: p.isBest ? "#fff" : "rgba(255,255,255,0.35)" }}
                        >
                          <AnimatedNumber value={p.total} duration={1800} />
                        </div>
                        <div className="text-[11px]" style={{ color: p.isBest ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>
                          ${p.perAcre.toFixed(2)}/acre
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ════════════════════════════════════════════════════════
                     BUILD 18 DEPLOY 2: TAB NAVIGATION
                     Hero card above, tabs below for deeper analysis.
                     Default tab is "comparison" — shows existing content.
                     Other tabs show skeleton placeholders.
                     ════════════════════════════════════════════════════ */}
                <TabBar onTabChange={handleTabChange} />

                {/* ── Tab Content Area ──────────────────────────────────── */}
                <div
                  role="tabpanel"
                  id={`panel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                  className="min-h-[400px]"
                >

                {/* ── COMPARISON TAB: Original Step 3 content ──────────── */}
                {activeTab === "comparison" && (
                  <div style={{ animation: "qc-enter 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

                {/* ── Visual Bar Chart ──────────────────────────────────── */}
                <StaggerItem index={1}>
                  <div className="mb-6 rounded-[16px] p-4 sm:p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <LazyChart arcPerAcre={results.arcPerAcre} plcPerAcre={results.plcPerAcre} winner={results.best} />
                  </div>
                </StaggerItem>

                {/* ── "What this means" Explainer ──────────────────────── */}
                <StaggerItem index={2}>
                  <div className="mb-6 rounded-[16px] p-5 sm:p-6" style={{ background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C9A84C]/15 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"><path d="M12 16v-4M12 8h.01" /></svg>
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-white/70 mb-1.5">What this means for your farm</div>
                        <p className="text-[13px] text-white/40 leading-relaxed">
                          {results.best === "ARC-CO"
                            ? `Based on current estimates, ARC-CO\u2019s county revenue guarantee would trigger a payment because actual revenue is projected below 90% of the benchmark. Over ${parseInt(acres).toLocaleString()} base acres, that\u2019s $${results.diff.toLocaleString()} more than PLC would pay. This is an estimate \u2014 actual payments depend on final MYA prices and official county yields.`
                            : `Based on current estimates, PLC\u2019s price-based guarantee triggers a larger payment because the effective reference price exceeds the projected marketing year average price. Over ${parseInt(acres).toLocaleString()} base acres, PLC pays $${results.diff.toLocaleString()} more than ARC-CO. This is an estimate \u2014 actual payments depend on final MYA prices.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>

                {/* ── Expandable Breakdown ──────────────────────────────── */}
                <StaggerItem index={3}>
                  <details className="mb-6 rounded-[16px] border border-white/[0.06] bg-white/[0.02] overflow-hidden group">
                    <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer text-[13px] font-semibold text-white/50 hover:text-white/70 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      How we calculated this
                      <svg className="w-4 h-4 text-white/20 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </summary>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">
                      <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        {/* Header */}
                        <div className="p-3 text-[11px] font-bold text-white/30 uppercase tracking-wider" style={{ background: "#0C1F17" }}>&nbsp;</div>
                        <div className="p-3 text-[11px] font-bold text-[#C9A84C]/60 uppercase tracking-wider text-center" style={{ background: "#0C1F17" }}>ARC-CO</div>
                        <div className="p-3 text-[11px] font-bold text-white/30 uppercase tracking-wider text-center" style={{ background: "#0C1F17" }}>PLC</div>
                        {/* Rows */}
                        {[
                          { label: "Per acre", arc: `$${results.arcPerAcre.toFixed(2)}`, plc: `$${results.plcPerAcre.toFixed(2)}` },
                          { label: "Total payment", arc: `$${results.arc.toLocaleString()}`, plc: `$${results.plc.toLocaleString()}` },
                          { label: "Payment acres", arc: "85%", plc: "85%" },
                          { label: "Sequestration", arc: "5.7%", plc: "5.7%" },
                        ].map((row) => (
                          <div key={row.label} className="contents">
                            <div className="p-3 text-[12px] text-white/40" style={{ background: "rgba(12,31,23,0.8)" }}>{row.label}</div>
                            <div className="p-3 text-[12px] text-white/60 text-center font-medium tabular-nums" style={{ background: "rgba(12,31,23,0.8)" }}>{row.arc}</div>
                            <div className="p-3 text-[12px] text-white/40 text-center tabular-nums" style={{ background: "rgba(12,31,23,0.8)" }}>{row.plc}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-[11px] text-white/20 leading-relaxed">
                        Calculations use OBBBA (2025 Farm Bill) program rules. ARC-CO guarantee = 90% of benchmark revenue. PLC uses effective reference price with 88% escalator. Both programs apply 85% payment acres and 5.7% sequestration.
                      </div>
                    </div>
                  </details>
                </StaggerItem>

                {/* ── County Benchmark Widget — The Network Effect Engine ── */}
                <StaggerItem index={4}>
                  <div className="mb-6">
                    <BenchmarkWidget
                      countyFips={countyFips}
                      countyName={countyName}
                      stateAbbr={stateAbbr}
                      cropCode={cropCode}
                      cropName={cropObj?.name || cropCode}
                      recommendedChoice={results.best}
                    />
                  </div>
                </StaggerItem>

                {/* ── Trust Signals — positioned before CTA for conversion ── */}
                <StaggerItem index={5}>
                  <div className="mb-6 flex items-center justify-center gap-4 sm:gap-5 flex-wrap text-[10px] sm:text-[11px] text-white/20 font-medium">
                    <span className="flex items-center gap-1.5"><span className="text-emerald-500/60"><IconCheck /></span> USDA NASS data</span>
                    <span className="flex items-center gap-1.5"><span className="text-emerald-500/60"><IconCheck /></span> OBBBA 2025 rules</span>
                    <span className="flex items-center gap-1.5"><span className="text-emerald-500/60"><IconCheck /></span> 256-bit encryption</span>
                    <span className="flex items-center gap-1.5"><span className="text-emerald-500/60"><IconCheck /></span> We never sell your data</span>
                  </div>
                </StaggerItem>

                {/* ══════════════════════════════════════════════════════════
                     CONVERSION ZONE — Build 18 Deploy 6: Email Capture
                     Replaces Link-to-/signup with inline email form.
                     EmailCapture handles its own state + API call.
                     ══════════════════════════════════════════════════════ */}
                <StaggerItem index={6}>
                  <EmailCapture
                    countyFips={countyFips}
                    countyName={countyName}
                    stateAbbr={stateAbbr}
                    cropCode={cropCode}
                    acres={acres}
                    activeTab={activeTab}
                    recommendation={results?.best}
                    arcPerAcre={results?.arcPerAcre}
                    plcPerAcre={results?.plcPerAcre}
                    countySlug={countySlug}
                    stateSlug={stateSlug}
                  />
                </StaggerItem>

                {/* ── Utility Actions (share + recalculate) ─────────────── */}
                <div className="flex items-center justify-center gap-4 mt-2" style={{ opacity: 0, animation: "qc-enter 0.4s cubic-bezier(0.16,1,0.3,1) 0.7s forwards" }}>
                  {/* Share — inline utility, not a CTA */}
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url).then(() => {
                        setShared(true);
                        setTimeout(() => setShared(false), 3000);
                      }).catch(() => {
                        const input = document.createElement("input");
                        input.value = url;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand("copy");
                        document.body.removeChild(input);
                        setShared(true);
                        setTimeout(() => setShared(false), 3000);
                      });
                    }}
                    className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer bg-transparent border-none transition-colors duration-200"
                    style={{ color: shared ? "#34D399" : "rgba(255,255,255,0.25)" }}
                  >
                    {shared ? (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                    ) : (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> Share</>
                    )}
                  </button>

                  <span className="text-white/10">·</span>

                  {/* Recalculate — simple text link */}
                  <button
                    onClick={() => { setStep(1); setResults(null); setCropCode(""); setAcres(""); setShowEmailCapture(false); setEmailSaved(false); setIsCountySpecific(false); setDataYears(0); setActiveTab("comparison"); invalidateOptimization(); invalidateBaseAcres(); window.history.replaceState(null, "", "/check"); }}
                    className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer bg-transparent border-none transition-colors duration-200 text-white/25 hover:text-white/40"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                    New calculation
                  </button>
                </div>

                  </div>
                )}
                {/* ── END COMPARISON TAB ────────────────────────────────── */}

                {/* ── SKELETON TABS: Historical, Elections, Optimization, Base Acres ── */}
                {activeTab === "historical" && (
                  <div style={{ animation: "qc-enter 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
                    <HistoricalPanel
                      countyFips={countyFips}
                      commodityCode={cropCode}
                      countyName={countyName}
                      isActive={activeTab === "historical"}
                    />
                  </div>
                )}
                {activeTab === "elections" && (
                  <div style={{ animation: "qc-enter 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
                    <ElectionsPanel
                      countyFips={countyFips}
                      countyName={countyName}
                      stateAbbr={stateAbbr}
                      isActive={activeTab === "elections"}
                    />
                  </div>
                )}
                {activeTab === "optimization" && (
                  <div style={{ animation: "qc-enter 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
                    <MultiCropPanel
                      countyFips={countyFips}
                      countyName={countyName}
                      stateAbbr={stateAbbr}
                      isActive={activeTab === "optimization"}
                    />
                  </div>
                )}
                {activeTab === "base-acres" && (
                  <div style={{ animation: "qc-enter 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
                    <BaseAcresPanel
                      countyFips={countyFips}
                      countyName={countyName}
                      stateAbbr={stateAbbr}
                      isActive={activeTab === "base-acres"}
                    />
                  </div>
                )}

                </div>
                {/* ── END TAB CONTENT AREA ──────────────────────────────── */}

                </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Social proof (steps 1-2) ─────────────────────────────────── */}
        {step < 3 && (
          <div className="mt-9 flex justify-center gap-6 sm:gap-8 flex-wrap" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s" }}>
            {[
              { icon: "chart", text: "3,100+ farms analyzed" },
              { icon: "map", text: "All 50 states" },
              { icon: "data", text: "Real USDA data" },
            ].map((t) => (
              <span key={t.text} className="flex items-center gap-1.5 text-[11px] text-white/20 font-medium">
                <span className="text-emerald-500/60"><IconCheck /></span>
                {t.text}
              </span>
            ))}
          </div>
        )}

        {/* ── Data attribution below results ───────────────────────────── */}
        {step === 3 && (
          <div className="mt-8 text-center" style={{ animation: "qc-enter 0.5s ease 0.8s both" }}>
            <div className="text-[11px] text-white/15 leading-relaxed max-w-[420px] mx-auto">
              {isCountySpecific
                ? `Based on ${dataYears} years of real USDA county data and OBBBA program rules.`
                : "Estimates based on national benchmark data and OBBBA program rules."
              }
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           BELOW-THE-FOLD: Educational Content + FAQ + Trust
           Redesigned to match homepage bento quality
           ═══════════════════════════════════════════════════════════════ */}
      <div className="relative z-10" style={{ background: "#0C1F17" }}>

        {/* Ambient aura glows for depth — matching homepage "Know your numbers" section */}
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(201,168,76,0.04) 0%, transparent 60%)", filter: "blur(60px)" }} />
        <div className="absolute top-[30%] left-[5%] w-[500px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(15,42,30,0.6) 0%, transparent 50%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(5,150,105,0.03) 0%, transparent 50%)", filter: "blur(80px)" }} />

        {/* Thin gold separator — minimal, elegant */}
        <div className="mx-auto max-w-[300px]">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 50%, transparent 100%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-[780px] px-5 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">

          {/* ── Section Header (matching homepage style) ───────────── */}
          <ScrollReveal>
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-5" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.1)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/50" />
                <span className="text-[10px] font-bold text-[#C9A84C]/60 uppercase tracking-wider">How It Works</span>
              </div>
              <h2 className="text-[26px] sm:text-[36px] font-extrabold text-white tracking-[-0.03em] mb-4 leading-[1.15]">
                <span className="font-medium text-white/50">Two programs.</span>
                <br />
                <span className="text-white">One right answer for your farm.</span>
              </h2>
              <p className="text-[15px] sm:text-[16px] text-white/35 leading-relaxed max-w-[500px] mx-auto">
                Every year, farmers with base acres choose between ARC-CO and PLC. The right choice can mean thousands of dollars in difference.
              </p>
            </div>
          </ScrollReveal>

          {/* ── ARC vs PLC Comparison — Bento Cards ────────────────── */}
          <div className="grid sm:grid-cols-2 gap-4 mb-16 sm:mb-24">
            {[
              {
                label: "ARC-CO",
                title: "County Revenue Protection",
                desc: "Pays when your county\u2019s actual crop revenue falls below 90% of its benchmark. Covers both price drops and yield losses. Capped at 12% of benchmark revenue.",
                accent: "#C9A84C",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 5-8" />
                  </svg>
                ),
              },
              {
                label: "PLC",
                title: "Price Loss Coverage",
                desc: "Pays when the national average price drops below the statutory reference price. Based on your farm\u2019s PLC yield, not county yields. No per-acre payment cap.",
                accent: "#34D399",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
              },
            ].map((card, i) => (
              <ScrollReveal key={card.label} delay={i * 100}>
                <div
                  className="p-7 sm:p-8 rounded-[20px] hover:border-white/[0.12] transition-all duration-300 h-full"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${card.accent}12`, border: `1px solid ${card.accent}25` }}>
                      {card.icon}
                    </div>
                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: card.accent }}>{card.label}</span>
                  </div>
                  <h3 className="text-[18px] sm:text-[19px] font-bold text-white/90 mb-3">{card.title}</h3>
                  <p className="text-[14px] sm:text-[15px] text-white/40 leading-relaxed">{card.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* ── OBBBA Changes — Bento Card (single wide card) ────────── */}
          <ScrollReveal>
            <div
              className="rounded-[20px] p-7 sm:p-9 mb-16 sm:mb-24"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <span className="text-[12px] font-bold text-[#C9A84C]/60 uppercase tracking-wider">2025 Farm Bill</span>
              </div>
              <h3 className="text-[20px] sm:text-[24px] font-extrabold text-white/90 tracking-[-0.02em] mb-6">
                What changed under OBBBA?
              </h3>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  "ARC guarantee raised to 90% of benchmark",
                  "Payment cap raised to 12% of benchmark",
                  "Corn reference price: $3.70 → $4.10/bu",
                  "Soybeans reference price: $8.40 → $10.00/bu",
                  "ERP escalator improved to 88% of MYA",
                  "Payment limit raised to $155,000/person",
                  "30M new base acres now eligible",
                  "Programs extended through 2031",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-white/40 leading-relaxed">
                    <span className="text-[#C9A84C] mt-0.5 shrink-0"><IconCheck /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* ── FAQ — Clean Card Style ────────────────────────────── */}
          <ScrollReveal>
            <div className="mb-16 sm:mb-24">
              <div className="flex items-center gap-2.5 mb-7">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-extrabold text-white/90 tracking-[-0.02em]">
                  Frequently asked questions
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    q: "Is this calculator really free?",
                    a: "Yes. The ARC/PLC comparison calculator is 100% free, no registration required. We also offer a paid Pro dashboard ($29/mo) with multi-year projections, scenario modeling, and portfolio management for ag professionals.",
                  },
                  {
                    q: "Where does the data come from?",
                    a: "All county yield data comes from the USDA National Agricultural Statistics Service (NASS) Quick Stats API. Program rules follow OBBBA (Pub. L. 119-21) and FSA published parameters. We are not affiliated with USDA or FSA.",
                  },
                  {
                    q: "How accurate are these estimates?",
                    a: "Our calculations use the same formulas as FSA, but actual payments depend on final Marketing Year Average prices, official county yields, and your farm-specific PLC yield. Use these estimates for planning — always confirm with your local FSA office before making enrollment decisions.",
                  },
                  {
                    q: "When is the 2026 ARC/PLC election deadline?",
                    a: "FSA has not yet announced the 2026 enrollment period. Current estimates from extension economists suggest enrollment may open in summer or fall 2026. The 2025 crop year uses automatic higher-of payments (no election needed).",
                  },
                  {
                    q: "Do you store my farm data?",
                    a: "The free calculator processes everything in your browser — no farm data is stored on our servers unless you create an account. We never sell your data to third parties. See our privacy policy for full details.",
                  },
                ].map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-[16px] overflow-hidden hover:border-white/[0.12] transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <summary className="flex items-center justify-between p-5 sm:p-6 cursor-pointer text-[15px] sm:text-[16px] font-semibold text-white/70 hover:text-white/90 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <svg className="w-4 h-4 text-white/25 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-[14px] sm:text-[15px] text-white/35 leading-relaxed -mt-1">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* ── Data Sources — Horizontal Trust Bar ────────────────── */}
          <ScrollReveal>
            <div
              className="rounded-[20px] p-6 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3 className="text-[12px] font-bold text-white/40 uppercase tracking-wider mb-5">Built on official data sources</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {[
                  { abbr: "NASS", name: "County yields via Quick Stats API" },
                  { abbr: "FSA", name: "ARC/PLC program rules" },
                  { abbr: "OBBBA", name: "2025 farm bill parameters" },
                  { abbr: "ERS", name: "Price forecasts & baselines" },
                ].map((src) => (
                  <div key={src.abbr} className="text-center">
                    <div className="text-[16px] font-extrabold text-[#C9A84C]/50 mb-1">{src.abbr}</div>
                    <div className="text-[12px] text-white/25 leading-snug">{src.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </div>
  );
}
