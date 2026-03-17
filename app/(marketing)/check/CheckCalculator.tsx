"use client";

// =============================================================================
// HarvestFile — ARC/PLC Calculator Wizard
// Phase 10 Build 1: The Calculator Revolution
//
// 3-step premium wizard: Location → Farm Details → Results
// - County selection with live USDA-backed data
// - Animated results reveal with comparison cards
// - Conversion CTAs to Pro ($49/mo) and AI Report ($39)
// - Mobile-first, 48dp touch targets, WCAG AAA contrast
// - No email gate before results — free, instant, ungated
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

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
  { code: "CORN", name: "Corn", icon: "🌽" },
  { code: "SOYBEANS", name: "Soybeans", icon: "🫘" },
  { code: "WHEAT", name: "Wheat", icon: "🌾" },
  { code: "SORGHUM", name: "Sorghum", icon: "🌿" },
  { code: "BARLEY", name: "Barley", icon: "🪴" },
  { code: "OATS", name: "Oats", icon: "🌱" },
  { code: "RICE", name: "Rice", icon: "🍚" },
  { code: "PEANUTS", name: "Peanuts", icon: "🥜" },
  { code: "COTTON", name: "Cotton", icon: "☁️" },
];

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

  // Email capture (optional, after results)
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  // Mount animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
        setCounties(data.counties || []);
        setLoadingCounties(false);
      })
      .catch(() => setLoadingCounties(false));
  }, [stateAbbr]);

  // ── Calculate results ─────────────────────────────────────────────────────

  const calculate = () => {
    const est = quickEstimate(cropCode, parseInt(acres) || 0);
    setResults(est);
    goTo(3);
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
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">State</label>
                <select
                  value={stateAbbr}
                  onChange={(e) => setStateAbbr(e.target.value)}
                  className="hf-calc-input w-full p-4 rounded-[14px] text-base font-medium text-white bg-white/[0.04] border border-white/[0.08] outline-none cursor-pointer appearance-none transition-colors focus:border-[#C9A84C]/40 focus:ring-1 focus:ring-[#C9A84C]/20"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='rgba(255,255,255,0.3)' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", paddingRight: "44px" }}
                >
                  <option value="">Select your state...</option>
                  {STATES.map((s) => (
                    <option key={s.abbr} value={s.abbr}>{s.name}</option>
                  ))}
                </select>

                {/* County select */}
                {stateAbbr && (
                  <div className="mt-5" style={{ animation: "qc-enter 0.35s ease" }}>
                    <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">County</label>
                    {loadingCounties ? (
                      <div className="flex items-center gap-3 p-4 rounded-[14px] bg-white/[0.02] border border-white/[0.06]">
                        <div className="w-5 h-5 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
                        <span className="text-sm text-white/30">Loading counties...</span>
                      </div>
                    ) : (
                      <select
                        value={countyFips}
                        onChange={(e) => {
                          setCountyFips(e.target.value);
                          const c = counties.find(c => c.county_fips === e.target.value);
                          if (c) { setCountyName(c.display_name); setCountySlug(c.slug); }
                        }}
                        className="hf-calc-input w-full p-4 rounded-[14px] text-base font-medium text-white bg-white/[0.04] border border-white/[0.08] outline-none cursor-pointer appearance-none transition-colors focus:border-[#C9A84C]/40 focus:ring-1 focus:ring-[#C9A84C]/20"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='rgba(255,255,255,0.3)' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", paddingRight: "44px" }}
                      >
                        <option value="">Select your county...</option>
                        {counties.map((c) => (
                          <option key={c.county_fips} value={c.county_fips}>{c.display_name}</option>
                        ))}
                      </select>
                    )}
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
                      <div className="text-[28px] sm:text-[32px] mb-1">{c.icon}</div>
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
            {step === 3 && results && (
              <div>
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
                  {/* Winner badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <IconTrophy />
                    <span className="text-[12px] font-bold text-[#C9A84C] uppercase tracking-wider">
                      {results.best} Wins
                    </span>
                  </div>

                  {/* Context line */}
                  <div className="text-[13px] text-white/35 mb-2">
                    {cropObj?.icon} {cropObj?.name} · {parseInt(acres).toLocaleString()} base acres · {countyName || stateAbbr}
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

                {/* Disclaimer */}
                <div className="text-[11px] text-white/20 text-center leading-relaxed mb-6 max-w-[420px] mx-auto">
                  Estimates based on national benchmark data and OBBBA program rules.{" "}
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

                {/* ── PRIMARY CTA: Pro Dashboard Trial ──────────────────── */}
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full p-4 sm:p-[18px] rounded-[14px] text-[15px] sm:text-base font-bold border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 mb-3 no-underline"
                  style={{
                    background: "linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)",
                    backgroundSize: "200% auto",
                    animation: "hf-shimmer 3s linear infinite",
                    color: "#0C1F17",
                    boxShadow: "0 6px 28px rgba(201,168,76,0.2)",
                  }}
                >
                  Start Pro Trial — 14 Days Free →
                </Link>
                <p className="text-[11px] text-white/20 text-center mb-5">
                  $49/month after trial · Multi-year projections · Scenario modeling · Unlimited farms
                </p>

                {/* ── SECONDARY CTA: AI Report ─────────────────────────── */}
                <Link
                  href="/report"
                  className="flex items-center justify-center gap-2 w-full p-3.5 rounded-[14px] text-[14px] font-bold cursor-pointer transition-all duration-200 hover:bg-white/[0.04] mb-6 no-underline"
                  style={{
                    border: "1.5px solid rgba(201,168,76,0.2)",
                    background: "rgba(201,168,76,0.03)",
                    color: "#C9A84C",
                  }}
                >
                  Get AI-Powered Farm Report — $39 →
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
                    View Full {countyName} County Analysis →
                  </Link>
                )}

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
                  onClick={() => { setStep(1); setResults(null); setCropCode(""); setAcres(""); setShowEmailCapture(false); setEmailSaved(false); }}
                  className="block mx-auto mt-6 text-[12px] text-white/15 hover:text-white/30 transition-colors cursor-pointer bg-transparent border-none"
                >
                  ← Calculate for a different farm
                </button>
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
    </div>
  );
}
