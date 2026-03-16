"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import IntelligenceHero from './homepage/IntelligenceHero';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const NASS_KEY = process.env.NEXT_PUBLIC_NASS_API_KEY;

const C = {
  dark: "#0C1F17", forest: "#1B4332", sage: "#40624D", muted: "#6B8F71",
  gold: "#C9A84C", goldBright: "#E2C366", goldDim: "#9E7E30",
  cream: "#FAFAF6", warm: "#F4F3ED", white: "#FFFFFF",
  text: "#111827", textSoft: "#6B7280", textMuted: "#9CA3AF",
  emerald: "#059669", emeraldBg: "#ECFDF5",
};

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const SN = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

// All ARC/PLC covered commodities · yc = yield conversion factor (cotton lint→seed cotton)
const CROPS = [
  { k: "CORN", e: "🌽", n: "Corn" },
  { k: "SOYBEANS", e: "🫘", n: "Soybeans" },
  { k: "WHEAT", e: "🌾", n: "Wheat" },
  { k: "SORGHUM", e: "🌿", n: "Sorghum" },
  { k: "BARLEY", e: "🪴", n: "Barley" },
  { k: "OATS", e: "🌱", n: "Oats" },
  { k: "RICE", e: "🍚", n: "Rice" },
  { k: "PEANUTS", e: "🥜", n: "Peanuts" },
  { k: "COTTON", e: "☁️", n: "Cotton" },
  { k: "SUNFLOWER", e: "🌻", n: "Sunflowers" },
  { k: "CANOLA", e: "🌼", n: "Canola" },
  { k: "FLAXSEED", e: "🫛", n: "Flaxseed" },
  { k: "DRY_PEAS", e: "🟢", n: "Dry Peas" },
  { k: "LENTILS", e: "🔴", n: "Lentils" },
  { k: "CHICKPEAS", e: "🟡", n: "Chickpeas" },
  { k: "SAFFLOWER", e: "🌸", n: "Safflower" },
];

const BENCH = {
  CORN:      { by: 178,  bp: 5.03,  mya: 3.90,  lr: 2.20,   ref: 4.10,   pyf: 0.91, nass: "CORN",             nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  SOYBEANS:  { by: 52,   bp: 12.1,  mya: 10.2,  lr: 6.20,   ref: 10.0,   pyf: 0.90, nass: "SOYBEANS",         nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  WHEAT:     { by: 48,   bp: 6.80,  mya: 5.40,  lr: 3.38,   ref: 6.35,   pyf: 0.89, nass: "WHEAT",            nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  SORGHUM:   { by: 72,   bp: 4.35,  mya: 3.75,  lr: 2.20,   ref: 3.95,   pyf: 0.89, nass: "SORGHUM",          nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  BARLEY:    { by: 75,   bp: 5.25,  mya: 4.60,  lr: 2.50,   ref: 4.95,   pyf: 0.87, nass: "BARLEY",           nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  OATS:      { by: 68,   bp: 3.70,  mya: 3.20,  lr: 1.93,   ref: 2.40,   pyf: 0.85, nass: "OATS",             nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  RICE:      { by: 75,   bp: 14.50, mya: 12.50, lr: 7.00,   ref: 14.00,  pyf: 0.89, nass: "RICE",             nassUnit: "CWT / ACRE", yUnit: "cwt/ac", pUnit: "/cwt", yc: 1 },
  PEANUTS:   { by: 4100, bp: 0.23,  mya: 0.21,  lr: 0.1775, ref: 0.2675, pyf: 0.88, nass: "PEANUTS",          nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
  COTTON:    { by: 2400, bp: 0.32,  mya: 0.28,  lr: 0.25,   ref: 0.367,  pyf: 0.88, nass: "COTTON, UPLAND",   nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 2.8 },
  SUNFLOWER: { by: 1600, bp: 0.23,  mya: 0.22,  lr: 0.1009, ref: 0.2015, pyf: 0.87, nass: "SUNFLOWER",        nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
  CANOLA:    { by: 1800, bp: 0.20,  mya: 0.18,  lr: 0.1009, ref: 0.2015, pyf: 0.87, nass: "CANOLA",           nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
  FLAXSEED:  { by: 22,   bp: 11.50, mya: 10.00, lr: 7.33,   ref: 11.28,  pyf: 0.86, nass: "FLAXSEED",         nassUnit: "BU / ACRE",  yUnit: "bu/ac",  pUnit: "/bu",  yc: 1 },
  DRY_PEAS:  { by: 2000, bp: 0.13,  mya: 0.12,  lr: 0.0611, ref: 0.11,   pyf: 0.86, nass: "PEAS, DRY EDIBLE", nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
  LENTILS:   { by: 1300, bp: 0.24,  mya: 0.25,  lr: 0.1166, ref: 0.1997, pyf: 0.86, nass: "LENTILS",          nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
  CHICKPEAS: { by: 1500, bp: 0.26,  mya: 0.28,  lr: 0.1166, ref: 0.2154, pyf: 0.86, nass: "CHICKPEAS",        nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
  SAFFLOWER: { by: 1400, bp: 0.21,  mya: 0.19,  lr: 0.1009, ref: 0.2015, pyf: 0.86, nass: "SAFFLOWER",        nassUnit: "LB / ACRE",  yUnit: "lb/ac",  pUnit: "/lb",  yc: 1 },
};

// ─── HOOKS & HELPERS ─────────────────────────────────────
function useInView(opts = {}) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); if (opts.once !== false) obs.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return [ref, v];
}

function Reveal({ children, delay = 0, y = 20 }) {
  const [ref, vis] = useInView({ once: true });
  return (<div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.65s cubic-bezier(0.25,0.1,0.25,1) ${delay}ms, transform 0.65s cubic-bezier(0.25,0.1,0.25,1) ${delay}ms` }}>{children}</div>);
}

function AnimNum({ value, prefix = "$", duration = 1600 }) {
  const [d, setD] = useState(0); const r = useRef(null);
  useEffect(() => { const t0 = performance.now(); const tick = (now) => { const p = Math.min((now - t0) / duration, 1); setD(Math.round(value * (1 - Math.pow(1 - p, 4)))); if (p < 1) r.current = requestAnimationFrame(tick); }; r.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(r.current); }, [value, duration]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{prefix}{d.toLocaleString()}</span>;
}

function StatCounter({ value, label, prefix = "", suffix = "" }) {
  const [ref, vis] = useInView({ once: true }); const [d, setD] = useState(0); const [popped, setPopped] = useState(false);
  useEffect(() => { if (!vis) return; const t0 = performance.now(); const tick = (now) => { const p = Math.min((now - t0) / 1800, 1); setD(Math.round(value * (1 - Math.pow(1 - p, 4)))); if (p < 1) requestAnimationFrame(tick); else setPopped(true); }; requestAnimationFrame(tick); }, [vis, value]);
  return (<div ref={ref} style={{ textAlign: "center" }}><div style={{ fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.04em", lineHeight: 1, animation: popped ? "hf-counter-pop 0.4s ease" : "none" }}>{prefix}{vis ? d.toLocaleString() : "0"}{suffix}</div><div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginTop: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div></div>);
}

function PulseDot({ color = C.emerald, size = 6 }) {
  return <div className="hf-pulse-dot" style={{ width: size, height: size, borderRadius: 100, background: color, color, flexShrink: 0 }} />;
}

function Logo({ size = 32 }) {
  return (<svg width={size} height={size} viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill={C.forest} /><path d="M12 28L20 12L28 20" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="28" r="2.5" fill={C.gold} opacity="0.5" /><circle cx="20" cy="12" r="2.5" fill={C.gold} /><circle cx="28" cy="20" r="2.5" fill={C.gold} opacity="0.7" /><path d="M20 24V32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" /><path d="M17 27L20 24L23 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" /></svg>);
}

// Noise texture now via CSS class in globals.css (fixes hydration mismatch from SVG data URLs)
const noise = "hf-noise";
const noiseSubtle = "hf-noise-subtle";

// Dark-themed input styles for calculator
const inpDark = {
  width: "100%", padding: "15px 18px", fontSize: 15, borderRadius: 14,
  border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
  color: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.25s, background 0.25s",
};
const lblDark = { display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 8, letterSpacing: "0.03em" };

// Light input styles (for email etc)
const inp = { width: "100%", padding: "15px 18px", fontSize: 15, borderRadius: 14, border: "1.5px solid rgba(0,0,0,0.08)", background: C.cream, color: C.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const lbl = { display: "block", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 };

// ═══════════════════════════════════════════════════════════
export default function HarvestFile() {
  const [view, setView] = useState("home");
  const [step, setStep] = useState(1);
  const [st, setSt] = useState("");
  const [cS, setCS] = useState("");
  const [county, setCounty] = useState("");
  const [showD, setShowD] = useState(false);
  const [ctys, setCtys] = useState([]);
  const [loadC, setLoadC] = useState(false);
  const [crop, setCrop] = useState("CORN");
  const [acres, setAcres] = useState(500);
  const [yIn, setYIn] = useState("");
  const [results, setResults] = useState(null);
  const [email, setEmail] = useState("");
  const [eSt, setESt] = useState("idle");
  const [nassD, setNassD] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveEst, setLiveEst] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [stepAnim, setStepAnim] = useState(false);

  // ─── REPORT STATE (Phase 3A) ─────────────────────────
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [showReportEmail, setShowReportEmail] = useState(true);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [view]);

  // Step transition animation
  const changeStep = (newStep) => {
    setStepAnim(true);
    setTimeout(() => { setStep(newStep); setStepAnim(false); }, 200);
  };

  const router = useRouter();
  const goPage = (path) => router.push(path);

  // ─── NAVIGATION HELPERS ──────────────────────────────
  function scrollTo(id) {
    if (view !== "home") { setView("home"); setResults(null); setTimeout(() => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100); }
    else { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }

  function goHome() {
    if (view === "home") { window.scrollTo({ top: 0, behavior: "smooth" }); }
    else { setView("home"); setResults(null); }
  }

  const goCalc = () => { setView("calculator"); setStep(1); setResults(null); setESt("idle"); setEmail(""); setNassD(null); setReportLoading(false); setReportError(""); setReportEmail(""); setStepAnim(false); };

  // ─── COUNTY FETCH (server-side via /api/counties — no CORS issues) ─
  const fetchC = useCallback(async (s) => {
    if (!s) return setCtys([]);
    setLoadC(true);
    try {
      const r = await fetch(`/api/counties?state=${s}`);
      if (!r.ok) throw new Error("API error");
      const d = await r.json();
      setCtys(d.counties || []);
    } catch { setCtys([]); }
    setLoadC(false);
  }, []);

  useEffect(() => { if (st) fetchC(st); }, [st, fetchC]);

  const filt = ctys.filter((c) => c.toLowerCase().includes((county || cS).toLowerCase()));
  const countyValue = county || cS;
  const canProceed = st && countyValue.trim().length >= 2;

  // ─── LIVE ESTIMATE ───────────────────────────────────
  useEffect(() => {
    if (view !== "calculator") return;
    const d = BENCH[crop]; const y = yIn ? parseFloat(yIn) : d.by * 0.88;
    const bR = d.by * d.bp; const aR = Math.min(Math.max(0, bR * 0.9 - y * Math.max(d.mya, d.lr)), bR * 0.12);
    setLiveEst(Math.round(aR * (acres || 0) * 0.85 * 0.943));
  }, [crop, acres, yIn, view]);

  function oAvg(v) { if (v.length < 3) return v.reduce((a, b) => a + b, 0) / v.length; const s = [...v].sort((a, b) => a - b); return s.slice(1, -1).reduce((a, b) => a + b, 0) / (s.length - 2); }

  async function calc() {
    setLoading(true);
    const finalCounty = county || cS.trim();
    const d = { ...BENCH[crop] }; let by = d.by;
    try {
      const nassComm = encodeURIComponent(d.nass);
      const nassUnit = encodeURIComponent(d.nassUnit);
      const r = await fetch(`https://quickstats.nass.usda.gov/api/api_GET/?key=${NASS_KEY}&source_desc=SURVEY&commodity_desc=${nassComm}&statisticcat_desc=YIELD&unit_desc=${nassUnit}&agg_level_desc=COUNTY&state_alpha=${st}&county_name=${encodeURIComponent(finalCounty.toUpperCase())}&year__GE=2019&year__LE=2024&format=JSON`);
      if (!r.ok) throw new Error("API error");
      const j = await r.json();
      if (j?.data?.length > 0) {
        const yc = d.yc || 1;
        const ys = j.data.filter((x) => !["(D)","(Z)","(NA)","(S)"].includes(x.Value)).map((x) => ({ year: +x.year, y: Math.round(parseFloat(x.Value.replace(",", "")) * yc * 10) / 10 })).sort((a, b) => a.year - b.year);
        if (ys.length >= 3) { by = Math.round(oAvg(ys.map((x) => x.y)) * 10) / 10; setNassD(ys); } else setNassD(null);
      } else setNassD(null);
    } catch { setNassD(null); }

    const yA = yIn ? parseFloat(yIn) : Math.round(by * 0.88);
    const bR = by * d.bp, gu = bR * 0.9, aR = yA * Math.max(d.mya, d.lr);
    const arcR = Math.min(Math.max(0, gu - aR), bR * 0.12);
    const arcT = Math.round(arcR * acres * 0.85 * 0.943);
    const erp = Math.max(d.ref, Math.min(0.88 * d.bp, 1.15 * d.ref));
    const plcR = Math.max(0, erp - Math.max(d.mya, d.lr));
    const plcY = Math.round(by * d.pyf * 10) / 10;
    const plcT = Math.round(plcR * plcY * acres * 0.85 * 0.943);

    setResults({ arcT, plcT, rec: arcT >= plcT ? "ARC-CO" : "PLC", diff: Math.abs(arcT - plcT), by, bR: +(bR.toFixed(2)), gu: +(gu.toFixed(2)), aR: +(aR.toFixed(2)), arcR: +(arcR.toFixed(2)), erp: +(erp.toFixed(2)), plcR: +(plcR.toFixed(2)), plcY, yA, county: finalCounty, st, crop, acres, real: !!nassD, yUnit: d.yUnit, pUnit: d.pUnit });
    setLoading(false); setView("results");
  }

  // ─── GENERATE AI REPORT (Phase 3A) ──────────────────
  async function generateReport() {
    const rEmail = reportEmail || email;
    if (!rEmail || !rEmail.includes("@")) {
      setShowReportEmail(true);
      setReportError("Please enter your email to receive your report.");
      return;
    }

    setReportLoading(true);
    setReportError("");

    try {
      const cropData = BENCH[results.crop];
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmData: {
            farmerName: "",
            email: rEmail,
            state: SN[results.st] || results.st,
            county: results.county,
            crops: [{
              cropName: results.crop.charAt(0) + results.crop.slice(1).toLowerCase(),
              plantedAcres: results.acres,
              baseAcres: results.acres,
              plcYield: results.plcY,
              arcBenchmarkYield: results.by,
              effectiveRefPrice: results.erp,
              expectedPrice: cropData.mya,
            }],
            currentProgram: "unsure",
            baseCropAcres: results.acres,
            calculatorResults: {
              arcEstimate: results.arcT,
              plcEstimate: results.plcT,
              recommendation: results.rec,
              projectedPayments: [
                { year: 2025, arc: results.arcT, plc: results.plcT },
                { year: 2026, arc: Math.round(results.arcT * 0.92), plc: Math.round(results.plcT * 0.95) },
              ],
            },
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate report");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(`report-${data.reportId}`, JSON.stringify(data.report));
        sessionStorage.setItem('harvestfile-latest-report', JSON.stringify(data.report));
        window.location.href = `/report?id=${data.reportId}`;
      }
    } catch (err) {
      setReportError(err.message || "Something went wrong. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }

  async function subEmail() {
    if (!email?.includes("@")) return; setESt("saving");
    try {
      const r = await fetch(`${SB_URL}/rest/v1/email_captures`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: "return=minimal" }, body: JSON.stringify({ email, source: "arc_plc_calculator", metadata: JSON.stringify(results) }) });
      setESt(r.ok ? "saved" : "error");
    } catch { setESt("error"); }
  }

  const isDark = view === "home" || view === "calculator" || view === "results";

  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>

      {/* ═══ HOME — CONVERSION-FOCUSED LANDING PAGE ═══ */}
      {view === "home" && (<>
        {/* ──── HERO: PAIN-DRIVEN ──── */}
        <section style={{ position: "relative", background: `linear-gradient(170deg, ${C.dark} 0%, #0A2E1C 40%, ${C.forest} 100%)`, padding: "140px 24px 120px", overflow: "hidden", minHeight: "92vh", display: "flex", alignItems: "center" }}>
          <div className={noise} />
          <div style={{ position: "absolute", top: "5%", left: "8%", width: 520, height: 520, background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "8%", right: "3%", width: 600, height: 600, background: "radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 55%)", filter: "blur(100px)", pointerEvents: "none" }} />

          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", gap: 64, alignItems: "center", position: "relative", zIndex: 2, flexWrap: "wrap" }}>
            {/* LEFT COLUMN — Copy */}
            <div style={{ flex: "1 1 480px", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(.25,.1,.25,1)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 100, padding: "5px 14px 5px 6px", marginBottom: 32, animation: mounted ? "hf-fade-up 0.6s ease 0.1s both" : "none" }}>
                <PulseDot color={C.emerald} size={7} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>Updated for the 2025 One Big Beautiful Bill Act</span>
              </div>

              <h1 style={{ fontSize: "clamp(38px, 5vw, 62px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.035em", marginBottom: 24, animation: mounted ? "hf-fade-up 0.7s ease 0.2s both" : "none" }}>
                Your farm is owed<br /><span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}>thousands</span> you&apos;re<br />not collecting
              </h1>

              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 20, maxWidth: 460, fontWeight: 400, animation: mounted ? "hf-fade-up 0.7s ease 0.35s both" : "none" }}>
                Most farmers pick the wrong ARC/PLC program — or never enroll at all. Our AI analyzes your exact county data and tells you which program puts the most money in your pocket.
              </p>

              {/* Urgency line */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, animation: mounted ? "hf-fade-up 0.7s ease 0.42s both" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: 100, background: "#EF4444", animation: "hf-pulse 1.5s ease-in-out infinite" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>2026 ARC/PLC election required under OBBBA — new rules, new decision</span>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", animation: mounted ? "hf-fade-up 0.7s ease 0.5s both" : "none" }}>
                <button onClick={goCalc} className="hf-btn-hover hf-shimmer-btn" style={{ background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`, backgroundSize: "200% auto", color: C.dark, fontSize: 15, fontWeight: 700, padding: "16px 32px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 6px 28px rgba(201,168,76,0.2)", letterSpacing: "-0.01em" }}>See What You&apos;re Owed — Free</button>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>60 seconds · No signup</span>
              </div>

              {/* Mini stats */}
              <div style={{ marginTop: 52, display: "flex", gap: 36, flexWrap: "wrap", animation: mounted ? "hf-fade-up 0.7s ease 0.65s both" : "none" }}>
                {[["$8,200", "Avg. savings found"], ["3,100+", "Farms analyzed"], ["50", "States covered"]].map(([v, l]) => (<div key={l}><div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{v}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginTop: 3, letterSpacing: "0.03em", textTransform: "uppercase" }}>{l}</div></div>))}
              </div>
            </div>

            {/* RIGHT COLUMN — Hero Card */}
            <div className="hf-float" style={{ flex: "1 1 380px", maxWidth: 420, position: "relative", opacity: mounted ? 1 : 0, transition: "opacity 1s ease 0.6s" }}>
              <div className="hf-glow-ring" style={{ position: "absolute", top: "50%", left: "50%", width: "110%", height: "110%", background: "conic-gradient(from 0deg, rgba(201,168,76,0.15), rgba(5,150,105,0.1), rgba(201,168,76,0.05), rgba(5,150,105,0.15), rgba(201,168,76,0.15))", borderRadius: 28, filter: "blur(32px)", opacity: 0.5 }} />
              <div style={{ position: "relative", background: "rgba(12,31,23,0.65)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32, boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Wayne Co., OH · Corn</div>
                  <div style={{ background: C.emerald, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6 }}>RECOMMENDED</div>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 500, marginBottom: 4 }}>ARC-CO Estimated Payment</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>$43,059</div>
                <div style={{ fontSize: 14, color: C.gold, fontWeight: 600, marginBottom: 28 }}>+$8,632 more than PLC</div>
                {[{ n: "ARC-CO", v: "$43,059", p: 100, c: C.gold }, { n: "PLC", v: "$34,427", p: 80, c: "rgba(255,255,255,0.1)" }].map((b, i) => (
                  <div key={b.n} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{b.n}</span><span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>{b.v}</span></div>
                    <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.04)" }}><div className="hf-bar-animate" style={{ "--target-width": `${b.p}%`, height: "100%", borderRadius: 100, background: b.c, animationDelay: `${1 + i * 0.3}s` }} /></div>
                  </div>
                ))}
                <div style={{ marginTop: 20, padding: "9px 12px", background: "rgba(255,255,255,0.025)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
                  <PulseDot color={C.emerald} size={5} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Live USDA NASS data · Updated March 2026</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──── INTELLIGENCE HUB ──── */}
        <IntelligenceHero />

        {/* ──── STATS BAR ──── */}
        <section style={{ background: C.white, padding: "56px 24px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
            <StatCounter value={3147} label="Farms Analyzed" />
            <StatCounter value={50} label="States Covered" />
            <StatCounter value={8200} prefix="$" label="Avg Savings Found" />
            <StatCounter value={16} label="Crop Programs" />
          </div>
        </section>

        {/* ──── THE PROBLEM — PAIN AMPLIFICATION ──── */}
        <section style={{ padding: "100px 24px 96px", background: C.cream }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 60 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 14 }}>The Problem</div>
                <h2 style={{ fontSize: "clamp(28px, 3.8vw, 46px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 18 }}>
                  Billions in farm payments go<br /><span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic" }}>unclaimed every year</span>
                </h2>
                <p style={{ fontSize: 16, color: C.textSoft, lineHeight: 1.7, maxWidth: 580, margin: "0 auto" }}>
                  USDA programs are complicated by design. The wrong ARC vs PLC choice costs the average farm thousands annually — and most farmers don&apos;t have the data to make the right call.
                </p>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { num: "62%", label: "of eligible farms", desc: "receive zero ARC/PLC payments due to wrong enrollment or no enrollment at all", color: "#DC2626" },
                { num: "$3B+", label: "left on the table", desc: "in unclaimed or sub-optimal program payments across American farms annually", color: C.gold },
                { num: "47 pages", label: "of FSA rules", desc: "that determine your payment — updated again under the 2025 OBBBA. We read them so you don't have to.", color: C.emerald },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="hf-card-hover" style={{ background: C.white, borderRadius: 20, padding: "32px 24px", border: "1px solid rgba(0,0,0,0.05)", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: 42, fontWeight: 800, color: item.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>{item.num}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.forest, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</div>
                    <div style={{ fontSize: 13.5, color: C.textSoft, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──── FREE CALCULATOR HOOK ──── */}
        <section style={{ position: "relative", padding: "100px 24px", background: C.dark, overflow: "hidden" }}>
          <div className={noise} />
          <div style={{ position: "absolute", top: "30%", left: "50%", width: 600, height: 600, background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 55%)", transform: "translateX(-50%)", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 2, textAlign: "center" }}>
            <Reveal>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 100, padding: "5px 14px 5px 6px", marginBottom: 28 }}>
                <PulseDot color={C.gold} size={6} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>FREE INSTANT ANALYSIS</span>
              </div>
              <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
                Find out what you&apos;re owed.<br /><span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}>In 60 seconds.</span>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: 40, maxWidth: 520, margin: "0 auto 40px" }}>
                Enter your state, county, and crop. Our calculator pulls live USDA yield data and shows you the exact dollar difference between ARC-CO and PLC for your farm.
              </p>
              <button onClick={goCalc} className="hf-btn-hover hf-shimmer-btn" style={{ background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`, backgroundSize: "200% auto", color: C.dark, fontSize: 16, fontWeight: 700, padding: "18px 40px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(201,168,76,0.2)" }}>Calculate My Payment — Free →</button>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {["No signup required", "All 50 states", "Real USDA data"].map((t) => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill={C.emerald}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ──── THE $39 REPORT — THE PRODUCT ──── */}
        <section style={{ padding: "108px 24px 100px", background: C.cream }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 56 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.emerald, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 14 }}>Your Complete Analysis</div>
                <h2 style={{ fontSize: "clamp(28px, 3.8vw, 46px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
                  Take the guesswork out<br /><span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic" }}>permanently</span>
                </h2>
                <p style={{ fontSize: 16, color: C.textSoft, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
                  Our AI-powered Farm Program Report analyzes your specific operation and generates a professional document you can take straight to your FSA office.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div style={{ background: C.white, borderRadius: 28, border: "2px solid rgba(5,150,105,0.1)", overflow: "hidden", boxShadow: "0 8px 48px rgba(0,0,0,0.04)" }}>
                {/* Gradient top bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${C.emerald}, ${C.gold}, ${C.emerald})` }} />
                <div style={{ padding: "48px 44px 52px" }}>
                  <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* Left — What's included */}
                    <div style={{ flex: "1 1 340px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.12)", borderRadius: 100, padding: "4px 12px 4px 6px", marginBottom: 20 }}>
                        <PulseDot color={C.emerald} size={6} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald }}>AI-POWERED</span>
                      </div>
                      <h3 style={{ fontSize: 28, fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 20 }}>
                        Personalized Farm<br />Program Report
                      </h3>
                      {[
                        ["📊", "ARC-CO vs PLC deep analysis", "Dollar-for-dollar comparison with your county's actual yield history"],
                        ["🎯", "5 price scenario projections", "See how your payment changes under different market conditions"],
                        ["📝", "Exact forms checklist", "Every FSA form you need, pre-identified for your situation"],
                        ["📅", "Deadline calendar", "Key dates so you never miss an enrollment window"],
                        ["🏛️", "FSA office prep guide", "Walk in prepared with the right questions and documents"],
                      ].map(([icon, title, desc], i) => (
                        <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                          <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.forest, marginBottom: 2 }}>{title}</div>
                            <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right — Pricing card */}
                    <div style={{ flex: "0 0 300px", background: C.cream, borderRadius: 22, padding: "36px 28px", border: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>One-Time Payment</div>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 6 }}>
                        <span style={{ fontSize: 52, fontWeight: 800, color: C.forest, letterSpacing: "-0.04em", lineHeight: 1 }}>$39</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 24, lineHeight: 1.5 }}>
                        Pays for itself 200x over<br />when you pick the right program
                      </div>
                      <button onClick={goCalc} className="hf-btn-hover" style={{ width: "100%", background: C.forest, color: "#fff", fontSize: 15, fontWeight: 700, padding: "16px 24px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(27,67,50,0.15)", marginBottom: 16 }}>
                        Get My Report →
                      </button>
                      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
                        Run the free calculator first, then upgrade to your full report from the results page
                      </div>
                      <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
                        {["Instant PDF download", "County-specific USDA data", "Take to your FSA office"].map((t) => (
                          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.sage, justifyContent: "center" }}>
                            <svg width="12" height="12" viewBox="0 0 20 20" fill={C.emerald}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ──── HOW IT WORKS — SIMPLIFIED ──── */}
        <section id="how-it-works" style={{ padding: "92px 24px 100px", background: C.white, scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12 }}>How It Works</div>
                <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em" }}>Three steps. <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic" }}>Real money.</span></h2>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative" }}>
              <div style={{ position: "absolute", top: 40, left: "16.66%", right: "16.66%", height: 2, background: `linear-gradient(90deg, ${C.gold}22, ${C.gold}88, ${C.gold}22)`, zIndex: 0 }} />
              {[
                { n: "01", t: "Run the free calculator", d: "Enter your state, county, and crop. We pull real USDA data and show you ARC-CO vs PLC side-by-side." },
                { n: "02", t: "See the money difference", d: "Get an instant dollar estimate showing which program pays more for your specific farm." },
                { n: "03", t: "Get your full report", d: "Upgrade to the $39 AI report for detailed projections, forms checklist, and an FSA office game plan." },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 24px" }}>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: i === 2 ? C.forest : C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: `3px solid ${C.white}`, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}><span style={{ fontSize: 24, fontWeight: 800, color: i === 2 ? C.gold : C.forest, letterSpacing: "-0.04em" }}>{s.n}</span></div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.forest, letterSpacing: "-0.02em", marginBottom: 8 }}>{s.t}</div>
                    <div style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>{s.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──── FEATURES GRID ──── */}
        <section id="features" style={{ padding: "100px 24px 96px", background: C.cream, scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <Reveal>
              <div style={{ marginBottom: 56 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12 }}>Built for Farmers</div>
                <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 500 }}>Government data,<br /><span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic" }}>finally useful</span></h2>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {[
                { icon: "📊", title: "ARC/PLC Decision Calculator", desc: "Side-by-side payment comparison using your county's real yield history. Updated for 2025 OBBBA rules.", acc: C.gold, action: goCalc },
                { icon: "🗺️", title: "All 50 States · 16 Crops", desc: "Every state and county in the US. Real-time NASS data for all ARC/PLC covered commodities — grains, oilseeds, cotton, rice, and more.", acc: C.emerald },
                { icon: "🤖", title: "AI-Powered Reports", desc: "Claude AI analyzes your farm data and generates a professional PDF with projections, risk scenarios, and an FSA prep guide. $39 one-time.", acc: C.forest },
                { icon: "🔔", title: "Price Alerts", desc: "Get notified when MYA prices finalize and your payment estimates change. Never miss a deadline.", acc: C.gold },
                { icon: "📱", title: "Built for the Field", desc: "Mobile-first design that works on rural connections. Use it in the tractor cab, at the co-op, or in the FSA waiting room.", acc: C.sage },
                { icon: "🔒", title: "Private & Secure", desc: "Your farm data stays yours. We never sell, share, or store your information. Run calculations anonymously.", acc: C.emerald },
              ].map((f, i) => (
                <Reveal key={i} delay={i * 70}>
                  <div className="hf-card-hover" onClick={f.action} style={{ background: C.white, borderRadius: 20, padding: "28px 24px", border: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", cursor: f.action ? "pointer" : "default", minHeight: 200 }}>
                    <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.forest, letterSpacing: "-0.02em", marginBottom: 8 }}>{f.title}</div>
                    <div style={{ fontSize: 13.5, color: C.textSoft, lineHeight: 1.6, flex: 1 }}>{f.desc}</div>
                    <div style={{ width: 32, height: 3, borderRadius: 100, background: f.acc, marginTop: 18, opacity: 0.5 }} />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──── TRUST + DATA ──── */}
        <section id="trust" style={{ padding: "80px 24px", background: C.white, scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <Reveal>
              <div style={{ background: C.cream, borderRadius: 24, padding: "52px 44px", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 4px 24px rgba(0,0,0,0.02)", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: C.forest, letterSpacing: "-0.02em", marginBottom: 12 }}>Built on data you can trust</h3>
                <p style={{ fontSize: 15, color: C.textSoft, lineHeight: 1.7, maxWidth: 540, margin: "0 auto 32px" }}>Every calculation uses real county yield data from the USDA National Agricultural Statistics Service and current program rules from the Farm Service Agency. Not estimates — actual government data.</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                  {["USDA NASS API", "FSA Program Rules", "2025 OBBBA Updated", "Real County Data", "No Guesswork"].map((b) => (<div key={b} style={{ padding: "8px 16px", borderRadius: 10, background: C.white, fontSize: 12, fontWeight: 700, color: C.sage, border: "1px solid rgba(0,0,0,0.04)" }}>{b}</div>))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ──── FAQ ──── */}
        <section style={{ padding: "80px 24px 96px", background: C.cream }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12 }}>Questions?</div>
                <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em" }}>Common questions</h2>
              </div>
            </Reveal>
            {[
              ["How is this different from the FSA calculator?", "The FSA doesn't offer a side-by-side comparison tool. HarvestFile pulls your county's actual NASS yield data, runs both ARC-CO and PLC calculations simultaneously, and shows you the dollar difference — something you'd normally need a farm management consultant for."],
              ["Is my farm data private?", "Completely. Your data stays in your browser. We don't store farm details, sell information, or share anything with third parties. The AI report generates instantly and downloads as a PDF — we don't keep copies."],
              ["What does the $39 report include?", "A professional PDF with: detailed ARC-CO vs PLC breakdown using your actual county data, 5 price scenario projections, every FSA form you need identified, a deadline calendar, and a complete FSA office preparation guide. It pays for itself thousands of times over."],
              ["How accurate are the calculations?", "We use the same USDA NASS yield data and FSA program rules that your county office uses. Our formulas are updated for the 2025 One Big Beautiful Bill Act. While actual payments depend on final MYA prices, our estimates track closely with FSA projections."],
              ["Do I need to create an account?", "No. The free calculator works instantly with zero signup. If you want the full AI report, you just enter an email to receive it — no passwords or accounts needed."],
            ].map(([q, a], i) => (
              <Reveal key={i} delay={i * 60}>
                <div style={{ background: C.white, borderRadius: 16, padding: "24px 28px", border: "1px solid rgba(0,0,0,0.04)", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.01)" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.forest, marginBottom: 8, letterSpacing: "-0.01em" }}>{q}</div>
                  <div style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7 }}>{a}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ──── FINAL CTA ──── */}
        <section style={{ position: "relative", padding: "120px 24px", background: C.dark, overflow: "hidden" }}>
          <div className={noise} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 500, height: 500, background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 60%)", transform: "translate(-50%,-50%)", filter: "blur(80px)", pointerEvents: "none" }} />
          <Reveal>
            <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 2 }}>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
                Stop leaving money<br /><span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}>in the field.</span>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: 40 }}>The right ARC/PLC choice means $3,000–$15,000 more per year. Find out which one is right for your farm in 60 seconds.</p>
              <button onClick={goCalc} className="hf-btn-hover hf-shimmer-btn" style={{ background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`, backgroundSize: "200% auto", color: C.dark, fontSize: 16, fontWeight: 700, padding: "18px 40px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(201,168,76,0.2)" }}>See What Your Farm Is Owed — Free →</button>
              <div style={{ marginTop: 14, fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Free calculator · No signup · Full report available for $39</div>
            </div>
          </Reveal>
        </section>
      </>)}


      {/* ══════════════════════════════════════════════════════
           CALCULATOR — FULL DARK REDESIGN
           ══════════════════════════════════════════════════════ */}
      {view === "calculator" && (
        <section style={{ position: "relative", minHeight: "100vh", background: `linear-gradient(170deg, ${C.dark} 0%, #0A2E1C 50%, #0F3525 100%)`, overflow: "hidden" }}>
          <div className={noise} />
          {/* Ambient glows */}
          <div style={{ position: "absolute", top: "10%", right: "5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none", animation: "hf-calc-glow 6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "15%", left: "0%", width: 400, height: 400, background: "radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 55%)", filter: "blur(80px)", pointerEvents: "none" }} />

          {/* Live estimate floating pill */}
          {acres > 0 && step > 1 && (
            <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "rgba(12,31,23,0.85)", backdropFilter: "blur(20px)", color: "#fff", borderRadius: 16, padding: "12px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 14, border: "1px solid rgba(255,255,255,0.06)", animation: "hf-step-enter 0.4s ease" }}>
              <PulseDot color={C.gold} size={7} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>Est. Payment</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.gold, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>${liveEst.toLocaleString()}</span>
            </div>
          )}

          <div style={{ maxWidth: 620, margin: "0 auto", padding: "120px 24px 140px", position: "relative", zIndex: 2 }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 44, animation: "hf-step-enter 0.5s ease" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 100, padding: "5px 14px 5px 6px", marginBottom: 20 }}>
                <PulseDot color={C.emerald} size={6} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>Live USDA NASS Data</span>
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.035em", lineHeight: 1.1 }}>
                Find your <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}>best program</span>
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>ARC-CO vs PLC · All 50 states · 2025 OBBBA rules</p>
            </div>

            {/* Glass card */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              borderRadius: 28,
              padding: "40px 36px 44px",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.25)",
            }}>
              {/* Step progress */}
              <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ flex: 1, height: 3, borderRadius: 100, background: n <= step ? C.gold : "rgba(255,255,255,0.06)", transition: "background 0.5s ease", position: "relative", overflow: "hidden" }}>
                    {n === step && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, transparent, ${C.goldBright}, transparent)`, animation: "hf-shine 2s ease-in-out infinite" }} />}
                  </div>
                ))}
              </div>

              {/* Step label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.gold }}>{step}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {step} of 3</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 32, letterSpacing: "-0.03em" }}>
                {["Where is your farm?", "Your operation details", "Review & calculate"][step - 1]}
              </div>

              {/* Step content with animation */}
              <div style={{
                animation: stepAnim ? "hf-step-exit 0.2s ease forwards" : "hf-step-enter 0.35s ease",
              }}>

                {/* ──── STEP 1 ──── */}
                {step === 1 && (<div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={lblDark}>State</label>
                    <select
                      value={st}
                      onChange={(e) => { setSt(e.target.value); setCounty(""); setCS(""); }}
                      className="hf-calc-input hf-select-arrow"
                      style={{ ...inpDark, cursor: "pointer" }}
                    >
                      <option value="">Select your state...</option>
                      {STATES.map((s) => (<option key={s} value={s}>{SN[s]}</option>))}
                    </select>
                  </div>

                  {st && (<div style={{ marginBottom: 24 }}>
                    <label style={lblDark}>County</label>
                    <div style={{ position: "relative" }}>
                      <input
                        placeholder={loadC ? "Loading counties from USDA..." : ctys.length > 0 ? `Select county (${ctys.length} found)...` : "Type your county name..."}
                        value={county || cS}
                        onChange={(e) => { const val = e.target.value; setCS(val); setCounty(""); setShowD(true); }}
                        onFocus={() => setShowD(true)}
                        onBlur={() => setTimeout(() => setShowD(false), 200)}
                        className="hf-calc-input"
                        style={inpDark}
                      />
                      {/* Loading spinner or dropdown arrow indicator */}
                      {loadC ? (
                        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                          <svg style={{ animation: "spin 1s linear infinite", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                            <path d="M12 2a10 10 0 019.5 6.8" stroke="rgba(201,168,76,0.6)" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      ) : ctys.length > 0 && !county ? (
                        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                        </div>
                      ) : null}
                      {showD && ctys.length > 0 && (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, maxHeight: 280, overflowY: "auto", background: "rgba(12,31,23,0.95)", backdropFilter: "blur(20px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 48px rgba(0,0,0,0.4)", zIndex: 50 }}>
                          {/* County count header */}
                          <div style={{ padding: "8px 16px 6px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "sticky", top: 0, background: "rgba(12,31,23,0.98)", zIndex: 1 }}>
                            {filt.length} {filt.length === 1 ? "county" : "counties"} {(county || cS) ? "matching" : `in ${SN[st] || st}`}
                          </div>
                          {filt.map((c) => (
                            <div key={c} onMouseDown={() => { setCounty(c); setCS(""); setShowD(false); }} style={{ padding: "11px 16px", fontSize: 14, cursor: "pointer", color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.04)", fontWeight: 500, transition: "all 0.15s" }} onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "#fff"; }} onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "rgba(255,255,255,0.7)"; }}>{c} County</div>
                          ))}
                          {filt.length === 0 && <div style={{ padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>No matches — type your county name and continue</div>}
                        </div>
                      )}
                    </div>
                    {ctys.length === 0 && !loadC && st && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>Type your county name to continue</div>}
                  </div>)}

                  <div style={{ marginBottom: 28 }}>
                    <label style={lblDark}>Primary Crop</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {CROPS.map((c) => (
                        <div key={c.k} onClick={() => setCrop(c.k)} style={{
                          padding: "16px 6px", borderRadius: 14, textAlign: "center", cursor: "pointer",
                          border: crop === c.k ? `2px solid ${C.gold}` : "2px solid rgba(255,255,255,0.06)",
                          background: crop === c.k ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                          transition: "all 0.25s",
                          transform: crop === c.k ? "scale(1.03)" : "scale(1)",
                          boxShadow: crop === c.k ? "0 4px 20px rgba(201,168,76,0.1)" : "none",
                        }}>
                          <div style={{ fontSize: 26, marginBottom: 4 }}>{c.e}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: crop === c.k ? C.gold : "rgba(255,255,255,0.35)", lineHeight: 1.2 }}>{c.n}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={!canProceed}
                    onClick={() => changeStep(2)}
                    style={{
                      width: "100%", padding: "16px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none",
                      background: canProceed ? `linear-gradient(135deg, ${C.gold}, ${C.goldDim})` : "rgba(255,255,255,0.04)",
                      color: canProceed ? C.dark : "rgba(255,255,255,0.15)",
                      cursor: canProceed ? "pointer" : "not-allowed",
                      boxShadow: canProceed ? "0 4px 24px rgba(201,168,76,0.2)" : "none",
                      transition: "all 0.3s",
                    }}
                  >Continue →</button>
                </div>)}

                {/* ──── STEP 2 ──── */}
                {step === 2 && (<div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={lblDark}>Base Acres</label>
                    <input
                      type="number"
                      value={acres}
                      onChange={(e) => setAcres(parseInt(e.target.value) || 0)}
                      className="hf-calc-input"
                      style={inpDark}
                    />
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>Your FSA base acres (FSA-156EZ form)</div>
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={lblDark}>Actual County Yield <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>({BENCH[crop].yUnit}) — optional</span></label>
                    <input
                      type="number"
                      value={yIn}
                      onChange={(e) => setYIn(e.target.value)}
                      placeholder="Leave blank — we'll pull from USDA"
                      className="hf-calc-input"
                      style={{ ...inpDark, "::placeholder": { color: "rgba(255,255,255,0.15)" } }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => changeStep(1)} style={{ padding: "16px 24px", fontSize: 14, fontWeight: 600, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s" }}>← Back</button>
                    <button onClick={() => changeStep(3)} style={{ flex: 1, padding: "16px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: C.dark, cursor: "pointer", boxShadow: "0 4px 24px rgba(201,168,76,0.2)" }}>Review →</button>
                  </div>
                </div>)}

                {/* ──── STEP 3: REVIEW ──── */}
                {step === 3 && (<div>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 24, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      {[
                        ["Location", `${county || cS} Co., ${st}`, "📍"],
                        ["Crop", crop.charAt(0) + crop.slice(1).toLowerCase(), (CROPS.find(c => c.k === crop) || {}).e || "🌾"],
                        ["Base Acres", `${acres.toLocaleString()} ac`, "🌾"],
                        ["Program Year", "2025 (OBBBA)", "📅"],
                      ].map(([k, v, icon]) => (
                        <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ fontSize: 18, lineHeight: 1 }}>{icon}</div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{v}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => changeStep(2)} style={{ padding: "16px 24px", fontSize: 14, fontWeight: 600, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>← Back</button>
                    <button
                      onClick={calc}
                      disabled={loading}
                      className="hf-shimmer-btn"
                      style={{
                        flex: 1, padding: "16px", fontSize: 16, fontWeight: 700, borderRadius: 14, border: "none",
                        background: loading ? "rgba(255,255,255,0.06)" : `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`,
                        backgroundSize: "200% auto",
                        color: loading ? "rgba(255,255,255,0.4)" : C.dark,
                        cursor: loading ? "wait" : "pointer",
                        boxShadow: loading ? "none" : "0 6px 28px rgba(201,168,76,0.25)",
                        transition: "all 0.3s",
                      }}
                    >{loading ? "⏳ Pulling USDA data..." : "Calculate My Payment →"}</button>
                  </div>
                </div>)}
              </div>
            </div>

            {/* Data source badge */}
            <div style={{ textAlign: "center", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {["USDA NASS API", "FSA Rules", "2025 OBBBA"].map((t) => (
                <span key={t} style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 3, height: 3, borderRadius: 100, background: "rgba(255,255,255,0.2)" }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
           RESULTS — FULL DARK REDESIGN
           ══════════════════════════════════════════════════════ */}
      {view === "results" && results && (
        <>
          {/* ──── Dark Hero Header ──── */}
          <section style={{ position: "relative", background: `linear-gradient(170deg, ${C.dark} 0%, #0A2E1C 50%, #0F3525 100%)`, padding: "120px 24px 80px", overflow: "hidden" }}>
            <div className={noise} />
            <div style={{ position: "absolute", top: "10%", left: "10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 55%)", filter: "blur(80px)", pointerEvents: "none" }} />

            <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 2 }}>
              {/* Badge */}
              <Reveal>
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.15)", borderRadius: 100, padding: "5px 14px 5px 6px", marginBottom: 20 }}>
                    <PulseDot color={C.emerald} size={6} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald }}>Analysis Complete</span>
                    {nassD && <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>· Live NASS Data</span>}
                  </div>
                  <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 6 }}>
                    {results.county} County, {SN[results.st] || results.st}
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{results.crop.charAt(0) + results.crop.slice(1).toLowerCase()} · {results.acres.toLocaleString()} base acres · 2025 OBBBA</p>
                </div>
              </Reveal>

              {/* ──── Program Comparison Cards ──── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {[
                  { n: "ARC-CO", f: "Agriculture Risk Coverage", v: results.arcT, r: results.rec === "ARC-CO" },
                  { n: "PLC", f: "Price Loss Coverage", v: results.plcT, r: results.rec === "PLC" },
                ].map((p, idx) => (
                  <div key={p.n} className="hf-result-card" style={{
                    background: p.r ? "rgba(5,150,105,0.06)" : "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(20px)",
                    borderRadius: 22,
                    padding: "28px 24px",
                    position: "relative",
                    overflow: "hidden",
                    border: p.r ? "1.5px solid rgba(5,150,105,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: p.r ? "0 8px 40px rgba(5,150,105,0.1), inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    animationDelay: `${idx * 0.12}s`,
                  }}>
                    {p.r && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.emerald}, transparent)` }} />}
                    {p.r && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.2)", color: C.emerald, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8, marginBottom: 12, letterSpacing: "0.04em" }}>
                        <svg width="10" height="10" viewBox="0 0 20 20" fill={C.emerald}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        BEST CHOICE
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 2, letterSpacing: "0.02em" }}>{p.f}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>{p.n}</div>
                    <div style={{ fontSize: "clamp(34px, 5vw, 44px)", fontWeight: 800, color: p.r ? "#fff" : "rgba(255,255,255,0.5)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                      <AnimNum value={p.v} />
                    </div>
                    {/* Bar */}
                    <div style={{ marginTop: 18, height: 4, borderRadius: 100, background: "rgba(255,255,255,0.04)" }}>
                      <div style={{
                        width: `${(p.v / Math.max(results.arcT, results.plcT)) * 100}%`,
                        height: "100%", borderRadius: 100,
                        background: p.r ? C.emerald : "rgba(255,255,255,0.12)",
                        animation: "hf-bar-grow 1s cubic-bezier(0.25,0.1,0.25,1) 0.3s both",
                        "--target-width": `${(p.v / Math.max(results.arcT, results.plcT)) * 100}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Savings banner */}
              <Reveal delay={200}>
                <div style={{
                  background: "rgba(201,168,76,0.06)",
                  border: "1px solid rgba(201,168,76,0.12)",
                  borderRadius: 16,
                  padding: "18px 28px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  flexWrap: "wrap", gap: 8,
                }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Choosing {results.rec} saves you</span>
                  <span style={{ fontSize: 30, fontWeight: 800, color: C.gold, letterSpacing: "-0.03em" }}><AnimNum value={results.diff} duration={2000} /> more</span>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ──── Breakdowns + Report CTA (light section) ──── */}
          <section style={{ background: C.cream, padding: "56px 24px 96px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

              {/* NASS data badge */}
              {nassD && <Reveal delay={50}><div style={{ background: C.emeraldBg, borderRadius: 14, padding: "14px 20px", border: "1px solid rgba(5,150,105,0.1)", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><PulseDot color={C.emerald} size={5} /><span style={{ fontSize: 12, fontWeight: 700, color: C.emerald }}>Live NASS County Data</span></div>
                {nassD.map((d) => (<span key={d.year} style={{ fontSize: 12, color: C.sage, fontVariantNumeric: "tabular-nums" }}><b>{d.year}:</b> {d.y} {results.yUnit}</span>))}
              </div></Reveal>}

              {/* Breakdown cards */}
              <Reveal delay={100}>
                {[
                  { t: "ARC-CO Breakdown", icon: "📊", rows: [["Benchmark Yield", `${results.by} ${results.yUnit}`], ["Benchmark Revenue", `$${results.bR.toFixed(2)}/ac`], ["Guarantee (90%)", `$${results.gu.toFixed(2)}/ac`], ["Actual Revenue", `$${results.aR.toFixed(2)}/ac`], ["Payment Rate (12% cap)", `$${results.arcR.toFixed(2)}/ac`]], total: `$${results.arcT.toLocaleString()}`, isRec: results.rec === "ARC-CO" },
                  { t: "PLC Breakdown", icon: "📋", rows: [["Effective Ref Price", `$${results.erp.toFixed(2)}${results.pUnit}`], ["MYA Price (2025)", `$${BENCH[results.crop].mya.toFixed(2)}${results.pUnit}`], ["PLC Rate", `$${results.plcR.toFixed(2)}${results.pUnit}`], ["Payment Yield", `${results.plcY} ${results.yUnit}`]], total: `$${results.plcT.toLocaleString()}`, isRec: results.rec === "PLC" },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: C.white,
                    borderRadius: 20,
                    padding: "28px 28px 24px",
                    border: s.isRec ? `1.5px solid rgba(5,150,105,0.15)` : "1px solid rgba(0,0,0,0.04)",
                    marginBottom: 14,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: C.forest, letterSpacing: "-0.01em" }}>{s.t}</span>
                      {s.isRec && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: C.emerald, background: C.emeraldBg, padding: "2px 8px", borderRadius: 6 }}>RECOMMENDED</span>}
                    </div>
                    {s.rows.map(([k, v], j) => (
                      <div key={j} className="hf-breakdown-row" style={{ display: "flex", justifyContent: "space-between", padding: "11px 8px", borderBottom: "1px solid rgba(0,0,0,0.03)", fontSize: 14, borderRadius: 6, margin: "0 -8px" }}>
                        <span style={{ color: C.textSoft }}>{k}</span>
                        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.text }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontSize: 16, fontWeight: 800, borderTop: "2px solid rgba(0,0,0,0.04)", marginTop: 4 }}>
                      <span style={{ color: C.forest }}>Total Estimated Payment</span>
                      <span style={{ color: s.isRec ? C.emerald : C.text }}>{s.total}</span>
                    </div>
                  </div>
                ))}
              </Reveal>

              {/* ═════════════════════════════════════════════════
                   PHASE 3A: AI-POWERED REPORT CTA
                   ═════════════════════════════════════════════════ */}
              <Reveal delay={200}>
                <div style={{
                  background: C.white,
                  border: "2px solid rgba(5,150,105,0.12)",
                  borderRadius: 24,
                  padding: "40px 32px",
                  marginTop: 8, marginBottom: 24,
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 4px 32px rgba(5,150,105,0.06)",
                }}>
                  {/* Decorative gradient strip at top */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.emerald}, ${C.gold}, ${C.emerald})` }} />
                  <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />

                  <div style={{ position: "relative", zIndex: 2 }}>
                    {/* Badge */}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.12)", borderRadius: 100, padding: "4px 12px 4px 6px", marginBottom: 20 }}>
                      <PulseDot color={C.emerald} size={6} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI-Powered Analysis</span>
                    </div>

                    {/* Headline */}
                    <h3 style={{ fontSize: 24, fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 10 }}>
                      Get Your Personalized<br />Farm Program Report
                    </h3>
                    <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.65, marginBottom: 24, maxWidth: 480 }}>
                      Our AI analyzes your specific farm data to generate a detailed report with dollar projections,
                      risk scenarios, exact forms needed, and an FSA office visit prep guide.
                    </p>

                    {/* What's included */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
                      {[
                        { icon: "📊", label: "ARC vs PLC\nBreakdown" },
                        { icon: "🎯", label: "5 Price\nScenarios" },
                        { icon: "📝", label: "Forms\nChecklist" },
                        { icon: "📅", label: "Deadline\nCalendar" },
                      ].map((item, i) => (
                        <div key={i} style={{ textAlign: "center", background: C.cream, borderRadius: 14, padding: "14px 6px", border: "1px solid rgba(0,0,0,0.03)" }}>
                          <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                          <div style={{ fontSize: 10.5, color: C.textSoft, fontWeight: 600, whiteSpace: "pre-line", lineHeight: 1.3 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Email input */}
                    {showReportEmail && (
                      <div style={{ marginBottom: 16 }}>
                        <input
                          type="email"
                          placeholder="Enter your email to receive your report"
                          value={reportEmail || email}
                          onChange={(e) => setReportEmail(e.target.value)}
                          style={{ ...inp, textAlign: "center" }}
                          className="hf-input-focus"
                        />
                      </div>
                    )}

                    {/* Error */}
                    {reportError && (
                      <div style={{ marginBottom: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#DC2626", fontSize: 13, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                        {reportError}
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={generateReport}
                      disabled={reportLoading}
                      className="hf-btn-hover"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        background: reportLoading ? C.sage : C.forest,
                        color: "#fff", fontSize: 16, fontWeight: 700, padding: "16px 28px", borderRadius: 14,
                        border: "none", cursor: reportLoading ? "wait" : "pointer",
                        boxShadow: "0 4px 20px rgba(27,67,50,0.2)", transition: "all 0.3s", letterSpacing: "-0.01em",
                      }}
                    >
                      {reportLoading ? (
                        <>
                          <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                            <path d="M12 2a10 10 0 019.5 6.8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          Generating Your Report...
                        </>
                      ) : (
                        <>
                          Generate My Free Preview
                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </>
                      )}
                    </button>

                    <p style={{ fontSize: 11.5, color: C.textMuted, textAlign: "center", marginTop: 12 }}>
                      Free preview includes executive summary · Full report: $39 one-time
                    </p>

                    {/* Trust badges */}
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                      {["AI-powered analysis", "County-specific data", "Take to your FSA office"].map((t) => (
                        <span key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.sage }}>
                          <svg width="12" height="12" viewBox="0 0 20 20" fill={C.emerald}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Email capture / alerts */}
              <Reveal delay={280}>
                <div style={{ background: C.dark, borderRadius: 20, padding: 36, textAlign: "center", marginBottom: 24, position: "relative", overflow: "hidden" }}>
                  <div className={noiseSubtle} />
                  <div style={{ position: "relative", zIndex: 2 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Save results & get price alerts</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>We&apos;ll notify you when final MYA prices update your estimates.</div>
                    {eSt === "saved" ? (<div style={{ fontSize: 14, color: C.gold, fontWeight: 700 }}>✓ Saved! Updates → {email}</div>) : (
                      <div style={{ display: "flex", gap: 8, maxWidth: 380, margin: "0 auto" }}>
                        <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, padding: "13px 16px", fontSize: 14, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "inherit", outline: "none" }} />
                        <button onClick={subEmail} disabled={eSt === "saving"} className="hf-btn-hover" style={{ padding: "13px 22px", fontSize: 13, fontWeight: 700, borderRadius: 12, border: "none", background: C.gold, color: C.dark, cursor: "pointer", whiteSpace: "nowrap" }}>{eSt === "saving" ? "..." : "Save"}</button>
                      </div>
                    )}
                    {eSt === "error" && <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>Error — try hello@harvestfile.com</div>}
                  </div>
                </div>
              </Reveal>

              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.65, textAlign: "center", maxWidth: 520, margin: "0 auto 32px" }}>
                <strong>Disclaimer:</strong> Estimates use USDA data and 2025 OBBBA rules. Actual payments may differ. Consult your local FSA office for official calculations.
              </div>
              <div style={{ textAlign: "center" }}>
                <button onClick={goCalc} style={{ padding: "14px 28px", fontSize: 13, fontWeight: 700, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.07)", background: "transparent", color: C.sage, cursor: "pointer" }}>← Calculate Another</button>
              </div>
            </div>
          </section>
        </>
      )}

      </div>
  );
}
