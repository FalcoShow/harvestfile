"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   HARVESTFILE — Main Client Component
   ═══════════════════════════════════════════════════════════ */

const SB_URL = "https://fzduyjxjdcxbdwjlwrpu.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZHV5anhqZGN4YmR3amx3cnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzIwNzksImV4cCI6MjA4ODY0ODA3OX0.yVn6AN7ueY2cvVKIKcbR-pSNOT3aTyz5oGHfdQCN_0M";
const NASS_KEY = "E3837A13-9EC3-3BF9-84EB-B475A476D4A7";

const C = {
  dark: "#0C1F17",
  forest: "#1B4332",
  sage: "#40624D",
  muted: "#6B8F71",
  gold: "#C9A84C",
  goldBright: "#E2C366",
  goldDim: "#9E7E30",
  cream: "#FAFAF6",
  warm: "#F4F3ED",
  white: "#FFFFFF",
  text: "#111827",
  textSoft: "#6B7280",
  textMuted: "#9CA3AF",
  emerald: "#059669",
  emeraldBg: "#ECFDF5",
};

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY",
];

const SN = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming",
};

const BENCH = {
  CORN: { by: 178, bp: 5.03, mya: 3.90, lr: 2.20, ref: 4.10, pyf: 0.91 },
  SOYBEANS: { by: 52, bp: 12.1, mya: 10.2, lr: 6.2, ref: 10.0, pyf: 0.9 },
  WHEAT: { by: 48, bp: 6.8, mya: 5.4, lr: 3.38, ref: 6.35, pyf: 0.89 },
};

// ─── HOOKS ───────────────────────────────────────────────
function useInView(opts = {}) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setV(true);
          if (opts.once !== false) obs.disconnect();
        }
      },
      { threshold: opts.threshold || 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, v];
}

// ─── SUB-COMPONENTS ──────────────────────────────────────
function Reveal({ children, delay = 0, y = 20 }) {
  const [ref, vis] = useInView({ once: true });
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.65s cubic-bezier(0.25,0.1,0.25,1) ${delay}ms, transform 0.65s cubic-bezier(0.25,0.1,0.25,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function AnimNum({ value, prefix = "$", duration = 1600 }) {
  const [d, setD] = useState(0);
  const r = useRef(null);
  useEffect(() => {
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setD(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) r.current = requestAnimationFrame(tick);
    };
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [value, duration]);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {d.toLocaleString()}
    </span>
  );
}

function StatCounter({ value, label, prefix = "", suffix = "" }) {
  const [ref, vis] = useInView({ once: true });
  const [d, setD] = useState(0);
  const [popped, setPopped] = useState(false);
  useEffect(() => {
    if (!vis) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 1800, 1);
      setD(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick);
      else setPopped(true);
    };
    requestAnimationFrame(tick);
  }, [vis, value]);
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "clamp(30px, 4vw, 46px)",
          fontWeight: 800,
          color: C.forest,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          animation: popped ? "hf-counter-pop 0.4s ease" : "none",
        }}
      >
        {prefix}
        {vis ? d.toLocaleString() : "0"}
        {suffix}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.textMuted,
          marginTop: 8,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PulseDot({ color = C.emerald, size = 6 }) {
  return (
    <div
      className="hf-pulse-dot"
      style={{
        width: size,
        height: size,
        borderRadius: 100,
        background: color,
        color,
        flexShrink: 0,
      }}
    />
  );
}

function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill={C.forest} />
      <path d="M12 28L20 12L28 20" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2.5" fill={C.gold} opacity="0.5" />
      <circle cx="20" cy="12" r="2.5" fill={C.gold} />
      <circle cx="28" cy="20" r="2.5" fill={C.gold} opacity="0.7" />
      <path d="M20 24V32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M17 27L20 24L23 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

// Noise texture overlay
const noiseStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: "none",
  opacity: 0.22,
  mixBlendMode: "soft-light",
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
};

// Shared input styles
const inputStyle = {
  width: "100%",
  padding: "15px 18px",
  fontSize: 15,
  borderRadius: 14,
  border: "1.5px solid rgba(0,0,0,0.08)",
  background: C.cream,
  color: C.text,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: C.text,
  marginBottom: 8,
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // Fetch counties from NASS
  const fetchC = useCallback(async (s) => {
    if (!s) return setCtys([]);
    setLoadC(true);
    try {
      const r = await fetch(
        `https://quickstats.nass.usda.gov/api/get_param_values/?key=${NASS_KEY}&param=county_name&state_alpha=${s}&agg_level_desc=COUNTY&commodity_desc=CORN&statisticcat_desc=YIELD`
      );
      const d = await r.json();
      if (d?.county_name)
        setCtys(
          d.county_name
            .map((c) => c.trim())
            .filter(Boolean)
            .sort()
        );
    } catch {
      setCtys([]);
    }
    setLoadC(false);
  }, []);

  useEffect(() => {
    if (st) fetchC(st);
  }, [st, fetchC]);

  const filt = ctys.filter((c) =>
    c.toLowerCase().includes(cS.toLowerCase())
  );

  // Live estimate
  useEffect(() => {
    if (view !== "calculator") return;
    const d = BENCH[crop];
    const y = yIn ? parseFloat(yIn) : d.by * 0.88;
    const bR = d.by * d.bp;
    const aR = Math.min(
      Math.max(0, bR * 0.9 - y * Math.max(d.mya, d.lr)),
      bR * 0.12
    );
    setLiveEst(Math.round(aR * (acres || 0) * 0.85 * 0.943));
  }, [crop, acres, yIn, view]);

  function oAvg(v) {
    if (v.length < 3) return v.reduce((a, b) => a + b, 0) / v.length;
    const s = [...v].sort((a, b) => a - b);
    return s.slice(1, -1).reduce((a, b) => a + b, 0) / (s.length - 2);
  }

  async function calc() {
    setLoading(true);
    const d = { ...BENCH[crop] };
    let by = d.by;
    try {
      const r = await fetch(
        `https://quickstats.nass.usda.gov/api/api_GET/?key=${NASS_KEY}&source_desc=SURVEY&commodity_desc=${crop}&statisticcat_desc=YIELD&unit_desc=BU%20/%20ACRE&agg_level_desc=COUNTY&state_alpha=${st}&county_name=${encodeURIComponent(county.toUpperCase())}&year__GE=2019&year__LE=2024&format=JSON`
      );
      const j = await r.json();
      if (j?.data?.length > 0) {
        const ys = j.data
          .filter((x) => !["(D)", "(Z)", "(NA)", "(S)"].includes(x.Value))
          .map((x) => ({
            year: +x.year,
            y: parseFloat(x.Value.replace(",", "")),
          }))
          .sort((a, b) => a.year - b.year);
        if (ys.length >= 3) {
          by = Math.round(oAvg(ys.map((x) => x.y)) * 10) / 10;
          setNassD(ys);
        } else setNassD(null);
      } else setNassD(null);
    } catch {
      setNassD(null);
    }

    const yA = yIn ? parseFloat(yIn) : Math.round(by * 0.88);
    const bR = by * d.bp;
    const gu = bR * 0.9;
    const aR = yA * Math.max(d.mya, d.lr);
    const arcR = Math.min(Math.max(0, gu - aR), bR * 0.12);
    const arcT = Math.round(arcR * acres * 0.85 * 0.943);
    const erp = Math.max(d.ref, Math.min(0.88 * d.bp, 1.15 * d.ref));
    const plcR = Math.max(0, erp - Math.max(d.mya, d.lr));
    const plcY = Math.round(by * d.pyf * 10) / 10;
    const plcT = Math.round(plcR * plcY * acres * 0.85 * 0.943);

    setResults({
      arcT, plcT, rec: arcT >= plcT ? "ARC-CO" : "PLC",
      diff: Math.abs(arcT - plcT), by,
      bR: +(bR.toFixed(2)), gu: +(gu.toFixed(2)), aR: +(aR.toFixed(2)),
      arcR: +(arcR.toFixed(2)), erp: +(erp.toFixed(2)),
      plcR: +(plcR.toFixed(2)), plcY, yA,
      county, st, crop, acres, real: !!nassD,
    });
    setLoading(false);
    setView("results");
  }

  async function subEmail() {
    if (!email?.includes("@")) return;
    setESt("saving");
    try {
      const r = await fetch(`${SB_URL}/rest/v1/email_captures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          email,
          source: "arc_plc_calculator",
          metadata: JSON.stringify(results),
        }),
      });
      setESt(r.ok ? "saved" : "error");
    } catch {
      setESt("error");
    }
  }

  const goCalc = () => {
    setView("calculator");
    setStep(1);
    setResults(null);
    setESt("idle");
    setEmail("");
    setNassD(null);
  };

  const isDark = view === "home";

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
      {/* ═══ NAV ═══ */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "0 24px" }}>
        <div style={{ maxWidth: 1120, margin: "12px auto 0", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 20px", background: isDark ? "rgba(12,31,23,0.55)" : "rgba(250,250,246,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 16, border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)", transition: "background 0.4s ease, border-color 0.4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => { setView("home"); setResults(null); }}>
            <Logo size={28} />
            <span style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#fff" : C.forest, letterSpacing: "-0.04em", transition: "color 0.3s" }}>
              Harvest<span style={{ color: C.gold }}>File</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <button onClick={() => setView("home")} className="hf-link-hover" style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.45)" : C.textSoft, cursor: "pointer" }}>Programs</button>
            <button onClick={() => setView("home")} className="hf-link-hover" style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.45)" : C.textSoft, cursor: "pointer" }}>Resources</button>
            <button onClick={goCalc} style={{ background: isDark ? "rgba(255,255,255,0.08)" : C.forest, color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "8px 18px", borderRadius: 10, border: isDark ? "1px solid rgba(255,255,255,0.1)" : "none", cursor: "pointer", transition: "all 0.25s" }}>Get Started →</button>
          </div>
        </div>
      </nav>

      {/* ═══ HOME ═══ */}
      {view === "home" && (
        <>
          {/* HERO */}
          <section style={{ position: "relative", background: `linear-gradient(170deg, ${C.dark} 0%, #0A2E1C 40%, ${C.forest} 100%)`, padding: "140px 24px 150px", overflow: "hidden", minHeight: "92vh", display: "flex", alignItems: "center" }}>
            <div style={noiseStyle} />
            <div style={{ position: "absolute", top: "5%", left: "8%", width: 520, height: 520, background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "8%", right: "3%", width: 600, height: 600, background: "radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 55%)", filter: "blur(100px)", pointerEvents: "none" }} />

            <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", gap: 64, alignItems: "center", position: "relative", zIndex: 2, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 480px", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(.25,.1,.25,1)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 100, padding: "5px 14px 5px 6px", marginBottom: 32, animation: mounted ? "hf-fade-up 0.6s ease 0.1s both" : "none" }}>
                  <PulseDot color={C.emerald} size={7} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>Updated for the 2025 One Big Beautiful Bill Act</span>
                </div>
                <h1 style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.035em", marginBottom: 24, animation: mounted ? "hf-fade-up 0.7s ease 0.2s both" : "none" }}>
                  Know exactly what<br />your farm
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}> is owed</span>
                </h1>
                <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 40, maxWidth: 440, fontWeight: 400, animation: mounted ? "hf-fade-up 0.7s ease 0.35s both" : "none" }}>
                  Compare ARC-CO and PLC payments for your exact county using live USDA data. See which program puts more money in your pocket.
                </p>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", animation: mounted ? "hf-fade-up 0.7s ease 0.5s both" : "none" }}>
                  <button onClick={goCalc} className="hf-btn-hover hf-shimmer-btn" style={{ background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`, backgroundSize: "200% auto", color: C.dark, fontSize: 15, fontWeight: 700, padding: "16px 32px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 6px 28px rgba(201,168,76,0.2)", letterSpacing: "-0.01em" }}>
                    Calculate My Payment
                  </button>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>Free · No signup · All 50 states</span>
                </div>
                <div style={{ marginTop: 52, display: "flex", gap: 36, flexWrap: "wrap", animation: mounted ? "hf-fade-up 0.7s ease 0.65s both" : "none" }}>
                  {[["3,100+", "Calculations run"], ["50", "States covered"], ["$8,200", "Avg. savings found"]].map(([v, l]) => (
                    <div key={l}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{v}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginTop: 3, letterSpacing: "0.03em", textTransform: "uppercase" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating hero card */}
              <div className="hf-float" style={{ flex: "1 1 380px", maxWidth: 420, position: "relative", opacity: mounted ? 1 : 0, transition: "opacity 1s ease 0.6s" }}>
                <div className="hf-glow-ring" style={{ position: "absolute", top: "50%", left: "50%", width: "110%", height: "110%", background: "conic-gradient(from 0deg, rgba(201,168,76,0.15), rgba(5,150,105,0.1), rgba(201,168,76,0.05), rgba(5,150,105,0.15), rgba(201,168,76,0.15))", borderRadius: 28, filter: "blur(32px)", opacity: 0.5 }} />
                <div style={{ position: "relative", background: "rgba(12,31,23,0.65)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32, boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Delaware Co., OH · Corn</div>
                    <div style={{ background: C.emerald, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6 }}>RECOMMENDED</div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 500, marginBottom: 4 }}>ARC-CO Estimated Payment</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>$43,059</div>
                  <div style={{ fontSize: 14, color: C.gold, fontWeight: 600, marginBottom: 28 }}>+$8,632 more than PLC</div>
                  {[{ n: "ARC-CO", v: "$43,059", p: 100, c: C.gold }, { n: "PLC", v: "$34,427", p: 80, c: "rgba(255,255,255,0.1)" }].map((b, i) => (
                    <div key={b.n} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{b.n}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>{b.v}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.04)" }}>
                        <div className="hf-bar-animate" style={{ "--target-width": `${b.p}%`, height: "100%", borderRadius: 100, background: b.c, animationDelay: `${1 + i * 0.3}s` }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, padding: "9px 12px", background: "rgba(255,255,255,0.025)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
                    <PulseDot color={C.emerald} size={5} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Live USDA NASS data · Updated March 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* STATS */}
          <section style={{ background: C.white, padding: "56px 24px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
              <StatCounter value={3147} label="Calculations" />
              <StatCounter value={50} label="States" />
              <StatCounter value={8200} prefix="$" label="Avg Savings" />
              <StatCounter value={88} label="OH Counties" suffix="+" />
            </div>
          </section>

          {/* BENTO FEATURES */}
          <section style={{ padding: "108px 24px 100px", background: C.cream }}>
            <div style={{ maxWidth: 1120, margin: "0 auto" }}>
              <Reveal>
                <div style={{ marginBottom: 56 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12 }}>What We Do</div>
                  <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 500 }}>
                    Government data,<br />
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic" }}>finally useful</span>
                  </h2>
                </div>
              </Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: 220, gap: 16 }}>
                {[
                  { span: "span 2", row: "span 2", icon: "📊", title: "ARC/PLC Decision Calculator", desc: "Side-by-side payment comparison using your county's real yield history. 2025 OBBBA rules: 90% ARC-CO guarantee, 12% cap, higher reference prices.", bg: C.forest, fg: "#fff", acc: C.gold },
                  { icon: "🗺️", title: "Nationwide", desc: "Every state and county. Real-time NASS data for corn, soybeans, and wheat.", bg: C.white, fg: C.text, acc: C.emerald },
                  { icon: "🔔", title: "Price Alerts", desc: "Get notified when MYA prices finalize and your estimates change.", bg: C.white, fg: C.text, acc: C.gold },
                  { icon: "📋", title: "Eligibility Screener", desc: "7 questions to find which USDA programs you qualify for.", bg: C.warm, fg: C.text, acc: C.sage },
                  { icon: "🔒", title: "Private & Secure", desc: "Your data stays in your browser. We never sell information.", bg: C.white, fg: C.text, acc: C.forest },
                ].map((f, i) => (
                  <Reveal key={i} delay={i * 70}>
                    <div className="hf-card-hover" style={{ gridColumn: f.span, gridRow: f.row, background: f.bg, color: f.fg, borderRadius: 20, padding: "32px 28px", height: "100%", boxSizing: "border-box", border: f.bg === C.white ? "1px solid rgba(0,0,0,0.05)" : f.bg === C.warm ? "1px solid rgba(0,0,0,0.04)" : "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: f.bg === C.white ? "0 2px 8px rgba(0,0,0,0.02)" : "none", cursor: "default" }}>
                      <div>
                        <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                        <div style={{ fontSize: f.span ? 22 : 16, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>{f.title}</div>
                        <div style={{ fontSize: f.span ? 15 : 13.5, opacity: 0.65, lineHeight: 1.6, maxWidth: f.span ? 380 : 280 }}>{f.desc}</div>
                      </div>
                      <div style={{ width: 32, height: 3, borderRadius: 100, background: f.acc, marginTop: 20, opacity: 0.5 }} />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section style={{ padding: "92px 24px 100px", background: C.white }}>
            <div style={{ maxWidth: 1120, margin: "0 auto" }}>
              <Reveal>
                <div style={{ textAlign: "center", marginBottom: 64 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12 }}>How It Works</div>
                  <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em" }}>
                    Three inputs. <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic" }}>Real numbers.</span>
                  </h2>
                </div>
              </Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative" }}>
                <div style={{ position: "absolute", top: 40, left: "16.66%", right: "16.66%", height: 2, background: `linear-gradient(90deg, ${C.gold}22, ${C.gold}88, ${C.gold}22)`, zIndex: 0 }} />
                {[
                  { n: "01", t: "Pick your location", d: "Select any state and county. We pull real yield data from the USDA NASS database." },
                  { n: "02", t: "Enter farm details", d: "Choose your crop, enter base acres. We handle the complex math behind both programs." },
                  { n: "03", t: "Get your answer", d: "See both programs side-by-side with dollar amounts, breakdowns, and a clear recommendation." },
                ].map((s, i) => (
                  <Reveal key={i} delay={i * 120}>
                    <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 24px" }}>
                      <div style={{ width: 80, height: 80, borderRadius: 20, background: i === 1 ? C.forest : C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: `3px solid ${C.white}`, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: i === 1 ? C.gold : C.forest, letterSpacing: "-0.04em" }}>{s.n}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.forest, letterSpacing: "-0.02em", marginBottom: 8 }}>{s.t}</div>
                      <div style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>{s.d}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* TRUST */}
          <section style={{ padding: "80px 24px", background: C.cream, borderTop: "1px solid rgba(0,0,0,0.03)" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
              <Reveal>
                <div style={{ background: C.white, borderRadius: 24, padding: "52px 44px", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 4px 24px rgba(0,0,0,0.02)", textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: C.forest, letterSpacing: "-0.02em", marginBottom: 12 }}>Built on data you can trust</h3>
                  <p style={{ fontSize: 15, color: C.textSoft, lineHeight: 1.7, maxWidth: 540, margin: "0 auto 32px" }}>
                    Every calculation uses real county yield data from the USDA National Agricultural Statistics Service and current program rules from the Farm Service Agency.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                    {["USDA NASS Data", "FSA Program Rules", "2025 OBBBA", "No Login Required", "100% Free"].map((b) => (
                      <div key={b} style={{ padding: "8px 16px", borderRadius: 10, background: C.cream, fontSize: 12, fontWeight: 700, color: C.sage, border: "1px solid rgba(0,0,0,0.04)" }}>{b}</div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* CTA */}
          <section style={{ position: "relative", padding: "120px 24px", background: C.dark, overflow: "hidden" }}>
            <div style={noiseStyle} />
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 500, height: 500, background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 60%)", transform: "translate(-50%,-50%)", filter: "blur(80px)", pointerEvents: "none" }} />
            <Reveal>
              <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 2 }}>
                <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
                  Stop guessing.<br />
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}>Start knowing.</span>
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: 40 }}>The right choice can mean $3,000–$15,000 more per year.</p>
                <button onClick={goCalc} className="hf-btn-hover hf-shimmer-btn" style={{ background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`, backgroundSize: "200% auto", color: C.dark, fontSize: 16, fontWeight: 700, padding: "18px 40px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(201,168,76,0.2)" }}>
                  Calculate My Payment — Free →
                </button>
              </div>
            </Reveal>
          </section>
        </>
      )}

      {/* ═══ CALCULATOR ═══ */}
      {view === "calculator" && (
        <section style={{ paddingTop: 100, paddingBottom: 96, background: `linear-gradient(180deg, ${C.cream}, ${C.warm})`, minHeight: "100vh" }}>
          {acres > 0 && step > 1 && (
            <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: C.forest, color: "#fff", borderRadius: 14, padding: "10px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.06)", animation: "hf-slide-in-bottom 0.4s ease" }}>
              <PulseDot color={C.gold} size={7} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Estimated:</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.gold, fontVariantNumeric: "tabular-nums" }}>${liveEst.toLocaleString()}</span>
            </div>
          )}
          <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 24px" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 6 }}>ARC/PLC Calculator</div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: C.forest, letterSpacing: "-0.03em" }}>Find your best program</h2>
              </div>
            </Reveal>
            <div style={{ background: C.white, borderRadius: 24, padding: "36px 36px 40px", boxShadow: "0 4px 32px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ flex: 1, height: 3, borderRadius: 100, background: n <= step ? C.forest : "rgba(0,0,0,0.06)", transition: "background 0.4s ease" }} />
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Step {step} of 3</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.forest, marginBottom: 28, letterSpacing: "-0.03em" }}>
                {["Where is your farm?", "Tell us about your operation", "Review & calculate"][step - 1]}
              </div>

              {step === 1 && (
                <div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={labelStyle}>State</label>
                    <select value={st} onChange={(e) => { setSt(e.target.value); setCounty(""); setCS(""); }} className="hf-input-focus" style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
                      <option value="">Select your state...</option>
                      {STATES.map((s) => (<option key={s} value={s}>{SN[s]}</option>))}
                    </select>
                  </div>
                  {st && (
                    <div style={{ marginBottom: 22 }}>
                      <label style={labelStyle}>County</label>
                      <div style={{ position: "relative" }}>
                        <input placeholder={loadC ? "Loading..." : "Type to search..."} value={county || cS} onChange={(e) => { setCS(e.target.value); setCounty(""); setShowD(true); }} onFocus={() => setShowD(true)} onBlur={() => setTimeout(() => setShowD(false), 200)} className="hf-input-focus" style={inputStyle} />
                        {showD && (cS || (!county && ctys.length > 0)) && (
                          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, maxHeight: 200, overflowY: "auto", background: C.white, borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 12px 40px rgba(0,0,0,0.08)", zIndex: 50 }}>
                            {(cS ? filt : ctys).slice(0, 10).map((c) => (
                              <div key={c} onMouseDown={() => { setCounty(c); setCS(""); setShowD(false); }} style={{ padding: "11px 16px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.03)", fontWeight: 500, transition: "background 0.15s" }} onMouseEnter={(e) => (e.target.style.background = C.cream)} onMouseLeave={(e) => (e.target.style.background = "transparent")}>
                                {c} County
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 22 }}>
                    <label style={labelStyle}>Primary Crop</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {[{ k: "CORN", e: "🌽", n: "Corn" }, { k: "SOYBEANS", e: "🫘", n: "Soybeans" }, { k: "WHEAT", e: "🌾", n: "Wheat" }].map((c) => (
                        <div key={c.k} onClick={() => setCrop(c.k)} style={{ padding: "18px 10px", borderRadius: 14, textAlign: "center", cursor: "pointer", border: crop === c.k ? `2px solid ${C.forest}` : "2px solid rgba(0,0,0,0.05)", background: crop === c.k ? "rgba(27,67,50,0.03)" : C.cream, transition: "all 0.2s ease", transform: crop === c.k ? "scale(1.02)" : "scale(1)" }}>
                          <div style={{ fontSize: 30, marginBottom: 4 }}>{c.e}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: crop === c.k ? C.forest : C.textSoft }}>{c.n}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button disabled={!county || !st} onClick={() => setStep(2)} style={{ width: "100%", padding: "16px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none", background: C.forest, color: "#fff", cursor: county && st ? "pointer" : "not-allowed", opacity: county && st ? 1 : 0.35, transition: "all 0.25s" }}>Continue →</button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={labelStyle}>Base Acres</label>
                    <input type="number" value={acres} onChange={(e) => setAcres(parseInt(e.target.value) || 0)} className="hf-input-focus" style={inputStyle} />
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Your FSA base acres (FSA-156EZ form)</div>
                  </div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={labelStyle}>Actual County Yield <span style={{ fontWeight: 400, color: C.textMuted }}>(bu/ac) — optional</span></label>
                    <input type="number" value={yIn} onChange={(e) => setYIn(e.target.value)} placeholder="Leave blank — we'll pull from USDA" className="hf-input-focus" style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setStep(1)} style={{ padding: "16px 22px", fontSize: 14, fontWeight: 600, borderRadius: 14, border: "1.5px solid rgba(0,0,0,0.07)", background: "transparent", color: C.textSoft, cursor: "pointer", transition: "all 0.2s" }}>← Back</button>
                    <button onClick={() => setStep(3)} style={{ flex: 1, padding: "16px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none", background: C.forest, color: "#fff", cursor: "pointer", transition: "all 0.2s" }}>Review →</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div style={{ background: C.cream, borderRadius: 16, padding: 22, marginBottom: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {[["Location", `${county} Co., ${st}`], ["Crop", crop.charAt(0) + crop.slice(1).toLowerCase()], ["Base Acres", `${acres.toLocaleString()}`], ["Program Year", "2025 (OBBBA)"]].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.forest }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setStep(2)} style={{ padding: "16px 22px", fontSize: 14, fontWeight: 600, borderRadius: 14, border: "1.5px solid rgba(0,0,0,0.07)", background: "transparent", color: C.textSoft, cursor: "pointer" }}>← Back</button>
                    <button onClick={calc} disabled={loading} className="hf-btn-hover" style={{ flex: 1, padding: "16px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: C.dark, cursor: "pointer", boxShadow: "0 4px 20px rgba(201,168,76,0.25)", opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
                      {loading ? "⏳ Pulling USDA data..." : "Calculate My Payment"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ RESULTS ═══ */}
      {view === "results" && results && (
        <section style={{ paddingTop: 100, paddingBottom: 96, background: C.cream }}>
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 6 }}>Your Results</div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", marginBottom: 4 }}>{results.county} County, {results.st}</h2>
                <p style={{ fontSize: 13, color: C.textMuted }}>
                  {results.crop.charAt(0) + results.crop.slice(1).toLowerCase()} · {results.acres.toLocaleString()} acres · 2025 OBBBA
                  {nassD && <span style={{ color: C.emerald, fontWeight: 700 }}> · Live data ✓</span>}
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[{ n: "ARC-CO", f: "Agriculture Risk Coverage", v: results.arcT, r: results.rec === "ARC-CO" }, { n: "PLC", f: "Price Loss Coverage", v: results.plcT, r: results.rec === "PLC" }].map((p) => (
                  <div key={p.n} style={{ background: C.white, borderRadius: 20, padding: 28, position: "relative", overflow: "hidden", border: p.r ? `2px solid ${C.emerald}` : "1px solid rgba(0,0,0,0.05)", boxShadow: p.r ? "0 8px 32px rgba(5,150,105,0.08)" : "0 1px 4px rgba(0,0,0,0.02)" }}>
                    {p.r && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: C.emerald }} />}
                    {p.r && <div style={{ display: "inline-block", background: C.emeraldBg, color: C.emerald, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6, marginBottom: 10 }}>✓ BEST CHOICE</div>}
                    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>{p.f}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.forest, marginBottom: 14 }}>{p.n}</div>
                    <div style={{ fontSize: 38, fontWeight: 800, color: p.r ? C.emerald : C.text, letterSpacing: "-0.04em" }}><AnimNum value={p.v} /></div>
                    <div style={{ marginTop: 14, height: 4, borderRadius: 100, background: "rgba(0,0,0,0.04)" }}>
                      <div className="hf-bar-animate" style={{ "--target-width": `${(p.v / Math.max(results.arcT, results.plcT)) * 100}%`, height: "100%", borderRadius: 100, background: p.r ? C.emerald : C.textMuted }} />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div style={{ background: C.forest, borderRadius: 16, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{results.rec} saves you</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: C.gold, letterSpacing: "-0.03em" }}><AnimNum value={results.diff} /> more</span>
              </div>
            </Reveal>

            <Reveal delay={260}>
              {[
                { t: "ARC-CO Breakdown", rows: [["Benchmark Yield", `${results.by} bu/ac`], ["Benchmark Revenue", `$${results.bR.toFixed(2)}/ac`], ["Guarantee (90%)", `$${results.gu.toFixed(2)}/ac`], ["Actual Revenue", `$${results.aR.toFixed(2)}/ac`], ["Payment Rate (12% cap)", `$${results.arcR.toFixed(2)}/ac`]], total: `$${results.arcT.toLocaleString()}` },
                { t: "PLC Breakdown", rows: [["Effective Ref Price", `$${results.erp.toFixed(2)}/bu`], ["MYA Price (2025)", `$${BENCH[results.crop].mya.toFixed(2)}/bu`], ["PLC Rate", `$${results.plcR.toFixed(2)}/bu`], ["Payment Yield", `${results.plcY} bu/ac`]], total: `$${results.plcT.toLocaleString()}` },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 18, padding: "24px 28px", border: "1px solid rgba(0,0,0,0.04)", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.forest, marginBottom: 14 }}>{s.t}</div>
                  {s.rows.map(([k, v], j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.03)", fontSize: 13.5 }}>
                      <span style={{ color: C.textSoft }}>{k}</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontSize: 15, fontWeight: 800 }}>
                    <span style={{ color: C.forest }}>Total</span>
                    <span style={{ color: i === 0 ? C.emerald : C.text }}>{s.total}</span>
                  </div>
                </div>
              ))}
            </Reveal>

            {nassD && (
              <Reveal delay={320}>
                <div style={{ background: C.emeraldBg, borderRadius: 14, padding: "14px 20px", border: "1px solid rgba(5,150,105,0.1)", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <PulseDot color={C.emerald} size={5} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.emerald }}>Live NASS Data</span>
                  </div>
                  {nassD.map((d) => (<span key={d.year} style={{ fontSize: 12, color: C.sage }}><b>{d.year}:</b> {d.y} bu/ac</span>))}
                </div>
              </Reveal>
            )}

            <Reveal delay={380}>
              <div style={{ background: C.dark, borderRadius: 20, padding: 36, textAlign: "center", marginBottom: 24, position: "relative", overflow: "hidden" }}>
                <div style={{ ...noiseStyle, opacity: 0.12 }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Save results & get price alerts</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>We&apos;ll notify you when final MYA prices update your estimates.</div>
                  {eSt === "saved" ? (
                    <div style={{ fontSize: 14, color: C.gold, fontWeight: 700 }}>✓ Saved! Updates → {email}</div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, maxWidth: 380, margin: "0 auto" }}>
                      <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, padding: "13px 16px", fontSize: 14, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "inherit", outline: "none" }} />
                      <button onClick={subEmail} disabled={eSt === "saving"} className="hf-btn-hover" style={{ padding: "13px 22px", fontSize: 13, fontWeight: 700, borderRadius: 12, border: "none", background: C.gold, color: C.dark, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {eSt === "saving" ? "..." : "Save"}
                      </button>
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
              <button onClick={goCalc} style={{ padding: "14px 28px", fontSize: 13, fontWeight: 700, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.07)", background: "transparent", color: C.sage, cursor: "pointer", transition: "all 0.2s" }}>← Calculate Another</button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: C.dark, padding: "56px 24px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ ...noiseStyle, opacity: 0.1 }} />
        <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40, marginBottom: 48 }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Logo size={26} />
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>Harvest<span style={{ color: C.gold }}>File</span></span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", lineHeight: 1.65, maxWidth: 240 }}>
                Making USDA farm program data work for American farmers.
              </p>
            </div>
            {[
              { t: "Tools", l: ["ARC/PLC Calculator", "Eligibility Screener", "County Data"] },
              { t: "Learn", l: ["How ARC-CO Works", "How PLC Works", "2025 Bill Guide"] },
              { t: "Company", l: ["About", "Contact", "Privacy Policy"] },
            ].map((c) => (
              <div key={c.t}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>{c.t}</div>
                {c.l.map((l) => (
                  <div key={l} className="hf-link-hover" style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 10, cursor: "pointer" }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)" }}>© 2026 HarvestFile LLC. All rights reserved.</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.08)", maxWidth: 420 }}>Uses NASS API. Not endorsed by NASS or affiliated with USDA/FSA.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
