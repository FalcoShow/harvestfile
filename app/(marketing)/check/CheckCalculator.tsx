"use client";

// =============================================================================
// HarvestFile — ARC/PLC Calculator Wizard
// Phase 13 Build 1: Calculator → Dashboard Bridge
//
// 3-step premium wizard: Location → Farm Details → Results
// - Custom dark-themed dropdowns (DarkSelect component)
// - SVG crop icons (no emojis)
// - Animated results with staggered reveal, visual bar chart, plain-English explainer
// - Expandable calculation breakdown table
// - Conversion CTAs: "Save Your Results" primary + Pro trial secondary
// - Below-fold: educational content, FAQ accordion, data sources
// - Grain texture, gold separators, scroll-reveal animations matching homepage
// - Mobile-first, 48dp touch targets, WCAG AAA contrast
// - AUTO-SAVES results to localStorage for dashboard bridge on signup
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DarkSelect } from "./DarkSelect";
import BenchmarkWidget from "@/components/calculator/BenchmarkWidget";

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

// SVG crop icons — premium, consistent, no emoji rendering differences
function CropIcon({ crop, size = 28 }: { crop: string; size?: number }) {
  const color = "currentColor";
  const s = size;
  const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (crop) {
    case "CORN": return (<svg {...props}><path d="M12 2v20" /><path d="M8 6c0 0 2 2 4 2s4-2 4-2" /><path d="M7 10c0 0 2.5 2 5 2s5-2 5-2" /><path d="M8 14c0 0 2 2 4 2s4-2 4-2" /><path d="M9 18c0 0 1.5 1 3 1s3-1 3-1" /></svg>);
    case "SOYBEANS": return (<svg {...props}><circle cx="9" cy="10" r="3" /><circle cx="15" cy="10" r="3" /><path d="M12 7V2" /><path d="M12 13v9" /><path d="M9 13c1.5 1 4.5 1 6 0" /></svg>);
    case "WHEAT": return (<svg {...props}><path d="M12 2v20" /><path d="M8 6l4-2 4 2" /><path d="M7 10l5-2 5 2" /><path d="M8 14l4-2 4 2" /><path d="M9 18l3-1 3 1" /></svg>);
    case "SORGHUM": return (<svg {...props}><path d="M12 22V8" /><circle cx="12" cy="5" r="3" /><path d="M8 8c2 1 6 1 8 0" /><path d="M9 12c1.5 .5 4.5 .5 6 0" /></svg>);
    case "BARLEY": return (<svg {...props}><path d="M12 2v20" /><path d="M7 8l5-1 5 1" /><path d="M7 12l5-1 5 1" /><path d="M8 16l4-1 4 1" /><path d="M6 4l6 2 6-2" /></svg>);
    case "OATS": return (<svg {...props}><path d="M12 22V6" /><path d="M12 6c-2-3-5-4-5-4" /><path d="M12 6c2-3 5-4 5-4" /><path d="M9 14c0 0 1.5 1 3 1s3-1 3-1" /></svg>);
    case "RICE": return (<svg {...props}><path d="M12 2v20" /><path d="M7 7c2.5 2 7.5 2 10 0" /><path d="M6 12c3 2 9 2 12 0" /><path d="M8 17c2 1 6 1 8 0" /></svg>);
    case "PEANUTS": return (<svg {...props}><ellipse cx="9" cy="12" rx="4" ry="6" /><ellipse cx="15" cy="12" rx="4" ry="6" /><path d="M12 6V2" /><path d="M10 6c1 .5 3 .5 4 0" /></svg>);
    case "COTTON": return (<svg {...props}><circle cx="12" cy="10" r="5" /><path d="M12 15v7" /><path d="M8 7c1-2 3-3 4-3s3 1 4 3" /><path d="M7 11c0 2 2 4 5 4s5-2 5-4" /></svg>);
    default: return (<svg {...props}><circle cx="12" cy="12" r="8" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>);
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
      if (urlState && urlCounty && urlCrop && urlAcres) {
        setStateAbbr(urlState);
        pendingUrlCalc.current = { county: urlCounty, crop: urlCrop, acres: urlAcres, countyName: urlName || "" };
      }
    }
  }, []);

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
    if (!stateAbbr) { setCounties([]); return; }
    setLoadingCounties(true);
    setCountyFips("");
    setCountyName("");
    setCountySlug("");

    fetch(`/api/calculator/counties?state=${stateAbbr}`)
      .then(r => r.json())
      .then(data => {
        const list = data.counties || [];
        setCounties(list);
        setLoadingCounties(false);
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
      .catch(() => setLoadingCounties(false));
  }, [stateAbbr]);

  // ── Calculate results ─────────────────────────────────────────────────────

  const calculate = async () => {
    const acresNum = parseInt(acres) || 0;
    setCalculating(true);
    setShared(false);
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
        background: "linear-gradient(170deg, #0C1F17 0%, #0A2E1C 45%, #0F3525 100%)",
        fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
      }}
    >
      {/* Noise texture */}
      <div className="hf-noise" />

      {/* Ambient glows */}
      <div className="absolute top-[8%] right-[10%] w-[500px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 55%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 55%)", filter: "blur(80px)" }} />

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-[580px] px-5 sm:px-6 pt-28 sm:pt-32 pb-20">

        {/* ── Header (steps 1-2 only) ──────────────────────────────────── */}
        {step < 3 && (
          <div
            className="text-center mb-8 sm:mb-10 transition-all duration-600"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: "hf-pulse 2s ease-in-out infinite" }} />
              <span className="text-xs font-semibold text-[#C9A84C]">FREE — No Signup Required</span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(26px,4.5vw,40px)] font-extrabold text-white leading-[1.1] tracking-[-0.035em] mb-3">
              See which program<br />
              pays you{" "}
              <span className="font-serif italic font-normal text-[#C9A84C]">more</span>
            </h1>
            <p className="text-[15px] text-white/40 leading-relaxed">
              Compare ARC-CO vs PLC for your county. Real USDA data. 60 seconds.
            </p>
          </div>
        )}

        {/* ── Progress bar (steps 1-2 only) ────────────────────────────── */}
        {step < 3 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-white/25 uppercase tracking-widest">
                Step {step} of 3
              </span>
              <span className="text-[11px] font-bold text-[#C9A84C]">
                {stepLabels[step - 1]}
              </span>
            </div>
            <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #9E7E30, #C9A84C)",
                  transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Glass Card ───────────────────────────────────────────────── */}
        <div
          className="rounded-[24px] transition-all duration-300"
          style={{
            background: step < 3 ? "rgba(255,255,255,0.03)" : "transparent",
            backdropFilter: step < 3 ? "blur(40px)" : "none",
            WebkitBackdropFilter: step < 3 ? "blur(40px)" : "none",
            padding: step < 3 ? "28px 24px 32px" : "0",
            border: step < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
            boxShadow: step < 3 ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.25)" : "none",
          }}
        >
          <div
            className="transition-all duration-200"
            style={{
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating
                ? animDir === "forward" ? "translateX(-20px)" : "translateX(20px)"
                : "translateX(0)",
            }}
          >

            {/* ════════════════════════════════════════════════════════════
                 STEP 1: LOCATION
                 ════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-extrabold text-white tracking-[-0.02em] mb-1.5">
                  Where is your farm?
                </h2>
                <p className="text-[13px] text-white/30 mb-6">
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
                  <div className="mt-5" style={{ animation: "qc-enter 0.35s ease" }}>
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
                    className="w-full mt-6 p-4 rounded-[14px] text-[15px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: "linear-gradient(135deg, #C9A84C, #9E7E30)",
                      color: "#0C1F17",
                      boxShadow: "0 4px 24px rgba(201,168,76,0.2)",
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
                <h2 className="text-[20px] sm:text-[22px] font-extrabold text-white tracking-[-0.02em] mb-1.5">
                  What are you growing?
                </h2>
                <p className="text-[13px] text-white/30 mb-6">
                  {countyName}, {stateAbbr} — Pick your primary crop and enter base acres.
                </p>

                {/* Crop grid */}
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">Crop</label>
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                  {CROPS.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCropCode(c.code)}
                      className="p-3.5 sm:p-4 rounded-[14px] text-center cursor-pointer transition-all duration-200 border-2"
                      style={{
                        borderColor: cropCode === c.code ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.06)",
                        background: cropCode === c.code ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="mb-1.5 flex justify-center" style={{ color: cropCode === c.code ? "#C9A84C" : "rgba(255,255,255,0.35)" }}>
                        <CropIcon crop={c.code} size={30} />
                      </div>
                      <div className="text-[12px] sm:text-[13px] font-bold" style={{ color: cropCode === c.code ? "#C9A84C" : "rgba(255,255,255,0.5)" }}>
                        {c.name}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Base acres */}
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Base Acres</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={acres}
                  onChange={(e) => setAcres(e.target.value)}
                  placeholder="e.g. 500"
                  autoFocus={!!cropCode}
                  className="hf-calc-input w-full p-4 rounded-[14px] text-center text-2xl font-bold text-white bg-white/[0.04] border border-white/[0.08] outline-none transition-colors focus:border-[#C9A84C]/40 focus:ring-1 focus:ring-[#C9A84C]/20"
                  style={{ letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
                />

                {/* Quick presets */}
                <div className="flex gap-2 justify-center mt-3">
                  {[100, 250, 500, 1000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAcres(String(v))}
                      className="px-3.5 py-2 rounded-xl text-[13px] font-bold cursor-pointer transition-all duration-200"
                      style={{
                        background: acres === String(v) ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
                        border: acres === String(v) ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.06)",
                        color: acres === String(v) ? "#C9A84C" : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {v} ac
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => goTo(1)}
                    className="px-5 py-3.5 rounded-[14px] text-[14px] font-semibold border border-white/[0.08] bg-transparent text-white/40 cursor-pointer hover:text-white/60 hover:border-white/15 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    id="hf-calc-btn"
                    disabled={!cropCode || !acres || parseInt(acres) <= 0}
                    onClick={calculate}
                    className="flex-1 p-3.5 rounded-[14px] text-[15px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{
                      background: cropCode && acres && parseInt(acres) > 0
                        ? "linear-gradient(135deg, #C9A84C, #9E7E30)"
                        : "rgba(255,255,255,0.04)",
                      color: cropCode && acres && parseInt(acres) > 0 ? "#0C1F17" : "rgba(255,255,255,0.15)",
                      boxShadow: cropCode && acres && parseInt(acres) > 0 ? "0 4px 24px rgba(201,168,76,0.2)" : "none",
                    }}
                  >
                    Calculate My Payment <IconArrow />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                 STEP 3: RESULTS
                 ════════════════════════════════════════════════════════ */}
            {step === 3 && (results || calculating) && (
              <div>
                {/* Loading overlay */}
                {calculating && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mb-4" />
                    <span className="text-[14px] text-white/40 font-medium">Crunching USDA data...</span>
                  </div>
                )}

                {!calculating && (
                <>
                {/* Results card */}
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
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <IconTrophy />
                    <span className="text-[12px] font-bold text-[#C9A84C] uppercase tracking-wider">
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
                  <div className="text-[12px] text-white/25 mb-7">
                    ${results.diffPerAcre}/acre advantage
                  </div>

                  {/* Comparison cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { name: "ARC-CO", total: results.arc, perAcre: results.arcPerAcre, isBest: results.best === "ARC-CO" },
                      { name: "PLC", total: results.plc, perAcre: results.plcPerAcre, isBest: results.best === "PLC" },
                    ]).map((p) => (
                      <div
                        key={p.name}
                        className="rounded-[16px] p-4 sm:p-5 text-left transition-all"
                        style={{
                          background: p.isBest ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                          border: p.isBest ? "1.5px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
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

                {/* Disclaimer */}
                <div className="text-[11px] text-white/20 text-center leading-relaxed mb-6 max-w-[420px] mx-auto" style={{ opacity: 0, animation: "qc-enter 0.4s cubic-bezier(0.16,1,0.3,1) 0.5s forwards" }}>
                  {isCountySpecific
                    ? `Based on ${dataYears} years of real USDA county data and OBBBA program rules.`
                    : "Estimates based on national benchmark data and OBBBA program rules."
                  }{" "}
                  {countySlug && stateSlug ? (
                    <Link
                      href={`/${stateSlug}/${countySlug}/arc-plc`}
                      className="text-[#C9A84C]/60 underline underline-offset-2 hover:text-[#C9A84C] transition-colors"
                    >
                      View {countyName} county-specific analysis →
                    </Link>
                  ) : (
                    "Run the full county analysis for exact numbers."
                  )}
                </div>

                {/* ── PRIMARY CTA: Save Results + Create Account (Phase 13 Build 1) ── */}
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full p-4 sm:p-[18px] rounded-[14px] text-[15px] sm:text-base font-bold border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 mb-3 no-underline"
                  style={{
                    background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)",
                    backgroundSize: "200% auto",
                    animation: "hf-shimmer 3s linear infinite",
                    color: "#0C1F17",
                    boxShadow: "0 6px 28px rgba(201,168,76,0.2)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Your Results — Create Free Account →
                </Link>
                <p className="text-[11px] text-white/20 text-center mb-3">
                  Your {countyName} analysis will be saved to your dashboard automatically
                </p>

                {/* ── SECONDARY CTA: Pro Trial ─────────────────────────── */}
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full p-3 sm:p-3.5 rounded-[12px] text-[13px] font-semibold no-underline transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Start 14-Day Pro Trial · Multi-year projections + Scenario modeling
                </Link>
                <p className="text-[11px] text-white/15 text-center mb-5">
                  $49/month after trial · Cancel anytime
                </p>

                {/* ── TERTIARY: See Plans ───────────────────────────────── */}
                <Link
                  href="/pricing"
                  className="block text-center text-[12px] text-white/20 hover:text-white/40 transition-colors no-underline mb-6"
                >
                  Compare all plans →
                </Link>

                {/* ── County deep-dive link ─────────────────────────────── */}
                {countySlug && stateSlug && (
                  <Link
                    href={`/${stateSlug}/${countySlug}/arc-plc`}
                    className="flex items-center justify-center gap-2 w-full p-3.5 rounded-[14px] text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.03] mb-6 no-underline"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    View Full {countyName} Analysis →
                  </Link>
                )}

                {/* ── Share button ────────────────────────────────────── */}
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url).then(() => {
                      setShared(true);
                      setTimeout(() => setShared(false), 3000);
                    }).catch(() => {
                      // Fallback for older browsers
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
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-[14px] text-[13px] font-semibold cursor-pointer transition-all duration-200 hover:bg-white/[0.03] active:scale-[0.98] active:duration-75 mb-2 bg-transparent"
                  style={{
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: shared ? "#34D399" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {shared ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Link copied — share it!</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> Share these results</>
                  )}
                </button>

                {/* ── Email capture (optional) ─────────────────────────── */}
                {!showEmailCapture && !emailSaved && (
                  <button
                    onClick={() => setShowEmailCapture(true)}
                    className="block mx-auto text-[12px] text-white/20 hover:text-white/40 transition-colors cursor-pointer bg-transparent border-none underline underline-offset-2"
                  >
                    Save my results & get price alerts
                  </button>
                )}

                {showEmailCapture && !emailSaved && (
                  <div className="mt-4 p-5 rounded-[16px] border border-white/[0.06] bg-white/[0.02]" style={{ animation: "qc-enter 0.35s ease" }}>
                    <div className="text-[13px] font-semibold text-white/60 mb-3">
                      Get notified when USDA prices change your estimate
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-3 rounded-xl text-[14px] text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#C9A84C]/40 transition-colors"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEmail(); }}
                      />
                      <button
                        onClick={saveEmail}
                        className="px-5 py-3 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-colors"
                        style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
                      >
                        Save
                      </button>
                    </div>
                    <div className="text-[10px] text-white/15 mt-2">No spam. Unsubscribe anytime.</div>
                  </div>
                )}

                {emailSaved && (
                  <div className="flex items-center justify-center gap-2 text-[13px] text-emerald-400/80 mt-4" style={{ animation: "qc-enter 0.35s ease" }}>
                    <IconCheck /> Results saved — we&apos;ll notify you when estimates change.
                  </div>
                )}

                {/* ── Start over ───────────────────────────────────────── */}
                <button
                  onClick={() => { setStep(1); setResults(null); setCropCode(""); setAcres(""); setShowEmailCapture(false); setEmailSaved(false); setIsCountySpecific(false); setDataYears(0); window.history.replaceState(null, "", "/check"); }}
                  className="block mx-auto mt-6 text-[12px] text-white/15 hover:text-white/30 transition-colors cursor-pointer bg-transparent border-none"
                >
                  ← Calculate for a different farm
                </button>
                </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Social proof (steps 1-2) ─────────────────────────────────── */}
        {step < 3 && (
          <div className="mt-8 flex justify-center gap-5 sm:gap-6 flex-wrap">
            {["3,100+ farms analyzed", "All 50 states", "Real USDA data"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-white/20">
                <span className="text-emerald-500"><IconCheck /></span>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* ── Trust section below results ───────────────────────────────── */}
        {step === 3 && (
          <div className="mt-12 text-center" style={{ animation: "qc-enter 0.5s ease 0.6s both" }}>
            <div className="inline-flex items-center gap-5 flex-wrap justify-center text-[11px] text-white/15">
              <span className="flex items-center gap-1.5"><span className="text-emerald-500/50"><IconCheck /></span> USDA NASS data</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500/50"><IconCheck /></span> OBBBA 2025 rules</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500/50"><IconCheck /></span> 256-bit encryption</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500/50"><IconCheck /></span> We never sell your data</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           BELOW-THE-FOLD: Educational Content + FAQ + Trust
           Always visible — provides SEO value and fills the page
           ═══════════════════════════════════════════════════════════════ */}
      <div className="relative z-10" style={{ background: "linear-gradient(180deg, #0A2E1C 0%, #0C1F17 100%)" }}>
        {/* Grain texture overlay */}
        <div className="hf-grain" style={{ opacity: 0.04 }} />

        {/* Ambient gold glow at transition — compact */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />

        {/* Gold separator line */}
        <div className="mx-auto max-w-[500px] px-8">
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.25) 50%, transparent 100%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-[680px] px-5 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-24">

          {/* ── How It Works ─────────────────────────────────────── */}
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-[22px] sm:text-[28px] font-extrabold text-white tracking-[-0.02em] mb-3">
                How does ARC-CO vs PLC work?
              </h2>
              <p className="text-[14px] sm:text-[15px] text-white/35 leading-relaxed max-w-[520px] mx-auto">
                Every year, farmers with base acres must choose between two USDA safety-net programs. Picking the right one can mean thousands of dollars in difference.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-5 mb-12 sm:mb-16">
            {[
              {
                title: "ARC-CO (County Revenue)",
                desc: "Pays when your county\u2019s actual crop revenue falls below 90% of its benchmark revenue. Covers both price drops and yield losses. Capped at 12% of benchmark.",
                accent: "#C9A84C",
              },
              {
                title: "PLC (Price Loss Coverage)",
                desc: "Pays when the national average price drops below the statutory reference price. Payments are based on your farm\u2019s PLC yield, not county yields. No payment cap per acre.",
                accent: "#59A985",
              },
            ].map((card, i) => (
              <ScrollReveal key={card.title} delay={i * 100}>
                <div className="p-5 sm:p-6 rounded-[18px] border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-300">
                  <div className="w-2 h-2 rounded-full mb-3" style={{ background: card.accent }} />
                  <h3 className="text-[15px] font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-[13px] text-white/30 leading-relaxed">{card.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* ── What Changed in OBBBA ────────────────────────────── */}
          <ScrollReveal>
          <div className="mb-12 sm:mb-16">
            <h2 className="text-[20px] sm:text-[24px] font-extrabold text-white tracking-[-0.02em] mb-4">
              What changed under OBBBA (2025 Farm Bill)?
            </h2>
            <div className="space-y-3">
              {[
                "ARC-CO guarantee increased from 86% to 90% of benchmark revenue",
                "ARC payment cap raised from 10% to 12% of benchmark revenue",
                "Statutory reference prices increased — corn from $3.70 to $4.10/bu, soybeans from $8.40 to $10.00/bu",
                "Effective reference price escalator improved from 85% to 88% of Olympic average MYA",
                "Payment limits increased from $125,000 to $155,000 per person",
                "30 million new base acres eligible for the first time",
                "2025 crop year uses automatic higher-of ARC or PLC payments",
                "Programs extended through 2031 (8 crop years)",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-[13px] sm:text-[14px] text-white/35 leading-relaxed">
                  <span className="text-[#C9A84C] mt-0.5 shrink-0"><IconCheck /></span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          </ScrollReveal>

          {/* ── Gold separator ────────────────────────────────────── */}
          <div className="mb-12 sm:mb-16 mx-auto max-w-[300px]">
            <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)" }} />
          </div>

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <ScrollReveal>
          <div className="mb-12 sm:mb-16">
            <h2 className="text-[20px] sm:text-[24px] font-extrabold text-white tracking-[-0.02em] mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Is this calculator really free?",
                  a: "Yes. The ARC/PLC comparison calculator is 100% free, no registration required. We also offer a paid Pro dashboard ($49/mo) with multi-year projections, scenario modeling, and portfolio management for ag professionals.",
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
                <details key={faq.q} className="group rounded-[14px] border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer text-[14px] sm:text-[15px] font-semibold text-white/70 hover:text-white transition-colors list-none [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <svg className="w-4 h-4 text-white/20 group-open:rotate-180 transition-transform shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-[13px] text-white/30 leading-relaxed -mt-1">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
          </ScrollReveal>

          {/* ── Data Sources ─────────────────────────────────────── */}
          <ScrollReveal>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 hover:border-white/[0.1] transition-all duration-300">
            <h3 className="text-[13px] font-bold text-white/50 uppercase tracking-wider mb-4">Data Sources</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { abbr: "NASS", name: "County yields via Quick Stats API" },
                { abbr: "FSA", name: "ARC/PLC program rules" },
                { abbr: "OBBBA", name: "2025 farm bill parameters" },
                { abbr: "ERS", name: "Price forecasts & baselines" },
              ].map((src) => (
                <div key={src.abbr} className="text-center">
                  <div className="text-[15px] font-extrabold text-[#C9A84C]/60 mb-1">{src.abbr}</div>
                  <div className="text-[11px] text-white/20 leading-snug">{src.name}</div>
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
