"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── SUPABASE (same instance as main app) ──────────────────
const SB_URL = "https://fzduyjxjdcxbdwjlwrpu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZHV5anhqZGN4YmR3amx3cnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzIwNzksImV4cCI6MjA4ODY0ODA3OX0.yVn6AN7ueY2cvVKIKcbR-pSNOT3aTyz5oGHfdQCN_0M";

// ─── DESIGN TOKENS ─────────────────────────────────────────
const C = {
  dark: "#0C1F17", forest: "#1B4332", sage: "#40624D",
  gold: "#C9A84C", goldBright: "#E2C366", goldDim: "#9E7E30",
  cream: "#FAFAF6", white: "#FFFFFF",
  text: "#111827", textSoft: "#6B7280", textMuted: "#9CA3AF",
  emerald: "#059669", emeraldBg: "#ECFDF5",
};

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const SN = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

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
];

// Benchmark data for quick estimates (no API call needed)
const BENCH = {
  CORN:     { by: 178,  bp: 5.03,  mya: 3.90,  lr: 2.20,  ref: 4.10,  pyf: 0.91 },
  SOYBEANS: { by: 52,   bp: 12.1,  mya: 10.2,  lr: 6.20,  ref: 10.0,  pyf: 0.90 },
  WHEAT:    { by: 48,   bp: 6.80,  mya: 5.40,  lr: 3.38,  ref: 6.35,  pyf: 0.89 },
  SORGHUM:  { by: 72,   bp: 4.35,  mya: 3.75,  lr: 2.20,  ref: 3.95,  pyf: 0.89 },
  BARLEY:   { by: 75,   bp: 5.25,  mya: 4.60,  lr: 2.50,  ref: 4.95,  pyf: 0.87 },
  OATS:     { by: 68,   bp: 3.70,  mya: 3.20,  lr: 1.93,  ref: 2.40,  pyf: 0.85 },
  RICE:     { by: 75,   bp: 14.50, mya: 12.50, lr: 7.00,  ref: 14.00, pyf: 0.89 },
  PEANUTS:  { by: 4100, bp: 0.23,  mya: 0.21,  lr: 0.1775,ref: 0.2675,pyf: 0.88 },
  COTTON:   { by: 2400, bp: 0.32,  mya: 0.28,  lr: 0.25,  ref: 0.367, pyf: 0.88 },
};

function quickEstimate(crop, acres) {
  const d = BENCH[crop];
  if (!d || !acres) return { arc: 0, plc: 0, best: "ARC-CO", diff: 0 };

  const yA = Math.round(d.by * 0.88);
  const bR = d.by * d.bp;
  const gu = bR * 0.9;
  const aR = yA * Math.max(d.mya, d.lr);
  const arcR = Math.min(Math.max(0, gu - aR), bR * 0.12);
  const arcT = Math.round(arcR * acres * 0.85 * 0.943);

  const erp = Math.max(d.ref, Math.min(0.88 * d.bp, 1.15 * d.ref));
  const plcR = Math.max(0, erp - Math.max(d.mya, d.lr));
  const plcY = Math.round(d.by * d.pyf * 10) / 10;
  const plcT = Math.round(plcR * plcY * acres * 0.85 * 0.943);

  const best = arcT >= plcT ? "ARC-CO" : "PLC";
  const bestVal = Math.max(arcT, plcT);
  const diff = Math.abs(arcT - plcT);

  return { arc: arcT, plc: plcT, best, bestVal, diff };
}

const noise = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", opacity: 0.18, mixBlendMode: "soft-light", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` };

function Logo({ size = 28 }) {
  return (<svg width={size} height={size} viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill={C.forest} /><path d="M12 28L20 12L28 20" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="28" r="2.5" fill={C.gold} opacity="0.5" /><circle cx="20" cy="12" r="2.5" fill={C.gold} /><circle cx="28" cy="20" r="2.5" fill={C.gold} opacity="0.7" /><path d="M20 24V32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" /><path d="M17 27L20 24L23 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" /></svg>);
}

// ═══════════════════════════════════════════════════════════════
export default function QuickCheck() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=state, 2=crop, 3=acres, 4=email, 5=results
  const [st, setSt] = useState("");
  const [crop, setCrop] = useState("");
  const [acres, setAcres] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const advance = (nextStep) => {
    setAnimOut(true);
    setTimeout(() => { setStep(nextStep); setAnimOut(false); }, 180);
  };

  async function submitEmail() {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    setError("");

    const est = quickEstimate(crop, parseInt(acres) || 0);

    // Save to Supabase
    try {
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
          source: "quick_check",
          metadata: JSON.stringify({
            state: st,
            crop,
            acres: parseInt(acres) || 0,
            estimate_arc: est.arc,
            estimate_plc: est.plc,
            recommendation: est.best,
          }),
        }),
      });
    } catch {
      // Don't block on save failure
    }

    setResults(est);
    setSaving(false);
    advance(5);
  }

  const stepLabels = ["Your State", "Your Crop", "Your Acres", "Get Results", "Your Estimate"];
  const progress = step / 5;

  const inputStyle = {
    width: "100%", padding: "16px 20px", fontSize: 16, borderRadius: 14,
    border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.25s",
  };

  return (
    <div style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", minHeight: "100vh", background: `linear-gradient(170deg, ${C.dark} 0%, #0A2E1C 45%, #0F3525 100%)`, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes qc-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes qc-exit { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
        @keyframes qc-pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; } 50% { opacity: 0.5; box-shadow: 0 0 2px currentColor; } }
        @keyframes qc-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes qc-scale-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes qc-counter { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .qc-input:focus { border-color: rgba(201,168,76,0.4) !important; background: rgba(255,255,255,0.07) !important; }
        .qc-select { -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
        .qc-select option { background: #0C1F17; color: #fff; }
      `}</style>

      <div style={noise} />
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: "8%", right: "10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 55%)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 55%)", filter: "blur(80px)", pointerEvents: "none" }} />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "0 24px" }}>
        <div style={{ maxWidth: 1120, margin: "12px auto 0", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 20px", background: "rgba(12,31,23,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => router.push("/")}>
            <Logo size={26} />
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>Harvest<span style={{ color: C.gold }}>File</span></span>
          </div>
          <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>Full Calculator →</button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "120px 24px 80px", position: "relative", zIndex: 2 }}>

        {/* Header — only show on steps 1-4 */}
        {step < 5 && (
          <div style={{ textAlign: "center", marginBottom: 40, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 100, padding: "5px 14px 5px 6px", marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, borderRadius: 100, background: C.emerald, animation: "qc-pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>FREE — 30 Second Check</span>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.035em", marginBottom: 12 }}>
              How much USDA money is<br />your farm <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", color: C.gold }}>missing?</span>
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              Answer 3 questions. Get an instant estimate.
            </p>
          </div>
        )}

        {/* Progress bar */}
        {step < 5 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Step {Math.min(step, 4)} of 4</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{stepLabels[step - 1]}</span>
            </div>
            <div style={{ height: 3, borderRadius: 100, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`, transition: "width 0.5s cubic-bezier(0.25,0.1,0.25,1)" }} />
            </div>
          </div>
        )}

        {/* Glass card */}
        <div style={{
          background: step < 5 ? "rgba(255,255,255,0.03)" : "transparent",
          backdropFilter: step < 5 ? "blur(40px)" : "none",
          WebkitBackdropFilter: step < 5 ? "blur(40px)" : "none",
          borderRadius: 28,
          padding: step < 5 ? "36px 32px 40px" : "0",
          border: step < 5 ? "1px solid rgba(255,255,255,0.06)" : "none",
          boxShadow: step < 5 ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.25)" : "none",
        }}>
          <div style={{ animation: animOut ? "qc-exit 0.18s ease forwards" : "qc-enter 0.35s ease" }}>

            {/* ──── STEP 1: STATE ──── */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>Where is your farm?</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Select your state to get started.</div>
                <select
                  value={st}
                  onChange={(e) => { setSt(e.target.value); if (e.target.value) advance(2); }}
                  className="qc-input qc-select"
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">Select your state...</option>
                  {STATES.map((s) => (<option key={s} value={s}>{SN[s]}</option>))}
                </select>
              </div>
            )}

            {/* ──── STEP 2: CROP ──── */}
            {step === 2 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>What&apos;s your primary crop?</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Pick the one that covers the most acres.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {CROPS.map((c) => (
                    <div key={c.k} onClick={() => { setCrop(c.k); advance(3); }} style={{
                      padding: "20px 8px", borderRadius: 16, textAlign: "center", cursor: "pointer",
                      border: "2px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.02)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; e.currentTarget.style.background = "rgba(201,168,76,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 6 }}>{c.e}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{c.n}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => advance(1)} style={{ marginTop: 16, background: "none", border: "none", fontSize: 13, color: "rgba(255,255,255,0.25)", cursor: "pointer", fontWeight: 600 }}>← Back</button>
              </div>
            )}

            {/* ──── STEP 3: ACRES ──── */}
            {step === 3 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>How many base acres?</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Your FSA base acres. A rough estimate is fine.</div>
                <input
                  type="number"
                  value={acres}
                  onChange={(e) => setAcres(e.target.value)}
                  placeholder="e.g. 500"
                  className="qc-input"
                  style={{ ...inputStyle, fontSize: 24, fontWeight: 700, textAlign: "center", letterSpacing: "-0.02em" }}
                  autoFocus
                />
                {/* Quick presets */}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                  {[100, 250, 500, 1000].map((v) => (
                    <button key={v} onClick={() => setAcres(String(v))} style={{
                      padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: acres === String(v) ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
                      border: acres === String(v) ? `1px solid rgba(201,168,76,0.3)` : "1px solid rgba(255,255,255,0.06)",
                      color: acres === String(v) ? C.gold : "rgba(255,255,255,0.35)",
                      transition: "all 0.2s",
                    }}>{v} ac</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button onClick={() => advance(2)} style={{ padding: "14px 22px", fontSize: 14, fontWeight: 600, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>← Back</button>
                  <button
                    disabled={!acres || parseInt(acres) <= 0}
                    onClick={() => advance(4)}
                    style={{
                      flex: 1, padding: "14px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none",
                      background: acres && parseInt(acres) > 0 ? `linear-gradient(135deg, ${C.gold}, ${C.goldDim})` : "rgba(255,255,255,0.04)",
                      color: acres && parseInt(acres) > 0 ? C.dark : "rgba(255,255,255,0.15)",
                      cursor: acres && parseInt(acres) > 0 ? "pointer" : "not-allowed",
                      boxShadow: acres && parseInt(acres) > 0 ? "0 4px 24px rgba(201,168,76,0.2)" : "none",
                      transition: "all 0.3s",
                    }}
                  >See My Estimate →</button>
                </div>
              </div>
            )}

            {/* ──── STEP 4: EMAIL GATE ──── */}
            {step === 4 && (
              <div>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>Your estimate is ready</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    Enter your email to see how much your<br />{parseInt(acres).toLocaleString()} acres of {(CROPS.find(c => c.k === crop) || {}).n || crop} in {SN[st] || st} could be earning.
                  </div>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="your@email.com"
                  className="qc-input"
                  style={{ ...inputStyle, textAlign: "center", fontSize: 16 }}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") submitEmail(); }}
                />
                {error && <div style={{ fontSize: 12, color: "#FCA5A5", textAlign: "center", marginTop: 8 }}>{error}</div>}
                <button
                  onClick={submitEmail}
                  disabled={saving}
                  style={{
                    width: "100%", marginTop: 14, padding: "16px", fontSize: 16, fontWeight: 700, borderRadius: 14, border: "none",
                    background: saving ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                    color: saving ? "rgba(255,255,255,0.4)" : C.dark,
                    cursor: saving ? "wait" : "pointer",
                    boxShadow: saving ? "none" : "0 4px 24px rgba(201,168,76,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {saving ? (
                    <><svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.15)" strokeWidth="3" /><path d="M12 2a10 10 0 019.5 6.8" stroke={C.dark} strokeWidth="3" strokeLinecap="round" /></svg> Calculating...</>
                  ) : "Show My Estimate →"}
                </button>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                  We&apos;ll also send you alerts when USDA prices update your estimate.<br />No spam. Unsubscribe anytime.
                </div>
                <button onClick={() => advance(3)} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", fontSize: 13, color: "rgba(255,255,255,0.2)", cursor: "pointer" }}>← Back</button>
              </div>
            )}

            {/* ──── STEP 5: RESULTS ──── */}
            {step === 5 && results && (
              <div style={{ textAlign: "center" }}>
                {/* Results card */}
                <div style={{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(40px)",
                  borderRadius: 28,
                  padding: "44px 32px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.25)",
                  marginBottom: 24,
                  animation: "qc-scale-in 0.5s cubic-bezier(0.25,0.1,0.25,1)",
                }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.15)", borderRadius: 100, padding: "4px 12px 4px 6px", marginBottom: 20 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 100, background: C.emerald, animation: "qc-pulse 2s ease-in-out infinite" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald }}>Estimate Ready</span>
                  </div>

                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
                    {(CROPS.find(c => c.k === crop) || {}).n} · {parseInt(acres).toLocaleString()} acres · {SN[st]}
                  </div>

                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 8, marginTop: 20 }}>
                    Choosing <span style={{ color: C.gold, fontWeight: 700 }}>{results.best}</span> over {results.best === "ARC-CO" ? "PLC" : "ARC-CO"} could earn you
                  </div>

                  <div style={{ fontSize: "clamp(48px, 8vw, 64px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4, animation: "qc-counter 0.6s cubic-bezier(0.25,0.1,0.25,1) 0.2s both" }}>
                    ${results.diff.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 14, color: C.gold, fontWeight: 600, marginBottom: 28 }}>more per year</div>

                  {/* Both program estimates */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
                    {[
                      { n: "ARC-CO", v: results.arc, best: results.best === "ARC-CO" },
                      { n: "PLC", v: results.plc, best: results.best === "PLC" },
                    ].map((p) => (
                      <div key={p.n} style={{
                        background: p.best ? "rgba(5,150,105,0.06)" : "rgba(255,255,255,0.02)",
                        borderRadius: 16, padding: "18px 14px",
                        border: p.best ? "1px solid rgba(5,150,105,0.2)" : "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: p.best ? C.emerald : "rgba(255,255,255,0.25)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {p.n} {p.best && "✓"}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: p.best ? "#fff" : "rgba(255,255,255,0.4)", letterSpacing: "-0.03em" }}>
                          ${p.v.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginBottom: 28, lineHeight: 1.5, maxWidth: 400, margin: "0 auto 28px" }}>
                  This is a national benchmark estimate. Your county-specific number may be higher or lower. Run the full calculator for exact results.
                </div>

                {/* CTAs */}
                <button
                  onClick={() => router.push("/")}
                  style={{
                    width: "100%", padding: "18px", fontSize: 16, fontWeight: 700, borderRadius: 14, border: "none",
                    background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`,
                    backgroundSize: "200% auto",
                    animation: "qc-shimmer 3s linear infinite",
                    color: C.dark, cursor: "pointer",
                    boxShadow: "0 6px 28px rgba(201,168,76,0.2)",
                    marginBottom: 12,
                  }}
                >Get My Exact Number — Free Calculator →</button>

                <button
                  onClick={() => router.push("/")}
                  style={{
                    width: "100%", padding: "16px", fontSize: 14, fontWeight: 700, borderRadius: 14,
                    border: "1.5px solid rgba(5,150,105,0.2)",
                    background: "rgba(5,150,105,0.04)",
                    color: C.emerald, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >Get Full AI Report — $39 →</button>

                <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                  We&apos;ll send price alerts to <span style={{ color: "rgba(255,255,255,0.4)" }}>{email}</span> when estimates change.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social proof at bottom */}
        {step < 5 && (
          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", opacity: 0.6 }}>
            {["3,100+ farms analyzed", "All 50 states", "Real USDA data"].map((t) => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                <svg width="10" height="10" viewBox="0 0 20 20" fill={C.emerald}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Minimal footer */}
      <footer style={{ position: "relative", zIndex: 2, padding: "40px 24px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.08)" }}>© 2026 HarvestFile LLC · <a href="/privacy" style={{ color: "rgba(255,255,255,0.1)", textDecoration: "none" }}>Privacy</a> · <a href="/terms" style={{ color: "rgba(255,255,255,0.1)", textDecoration: "none" }}>Terms</a></div>
      </footer>
    </div>
  );
}
