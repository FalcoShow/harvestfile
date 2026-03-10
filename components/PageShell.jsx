"use client";

import { useRouter } from "next/navigation";

const C = {
  dark: "#0C1F17", forest: "#1B4332", sage: "#40624D",
  gold: "#C9A84C", cream: "#FAFAF6", white: "#FFFFFF",
  text: "#111827", textSoft: "#6B7280", textMuted: "#9CA3AF",
};

function Logo({ size = 28 }) {
  return (<svg width={size} height={size} viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill={C.forest} /><path d="M12 28L20 12L28 20" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="28" r="2.5" fill={C.gold} opacity="0.5" /><circle cx="20" cy="12" r="2.5" fill={C.gold} /><circle cx="28" cy="20" r="2.5" fill={C.gold} opacity="0.7" /><path d="M20 24V32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" /><path d="M17 27L20 24L23 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" /></svg>);
}

const noise = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", opacity: 0.1, mixBlendMode: "soft-light", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` };

export default function PageShell({ children, title, subtitle }) {
  const router = useRouter();
  const go = (path) => router.push(path);

  return (
    <div style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", color: C.text, background: C.cream, minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 1000, padding: "0 24px", background: "rgba(250,250,246,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => go("/")}>
            <Logo /><span style={{ fontSize: 18, fontWeight: 800, color: C.forest, letterSpacing: "-0.04em" }}>Harvest<span style={{ color: C.gold }}>File</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <button onClick={() => go("/programs/arc-co")} className="hf-nav-link" style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: C.textSoft, cursor: "pointer" }}>Programs</button>
            <button onClick={() => go("/about")} className="hf-nav-link" style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: C.textSoft, cursor: "pointer" }}>About</button>
            <button onClick={() => go("/")} style={{ background: C.forest, color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer" }}>Get Started →</button>
          </div>
        </div>
      </nav>

      {/* Header */}
      {title && (
        <section style={{ padding: "64px 24px 48px", textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: C.forest, letterSpacing: "-0.03em", marginBottom: subtitle ? 12 : 0 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 16, color: C.textSoft, lineHeight: 1.6 }}>{subtitle}</p>}
          </div>
        </section>
      )}

      {/* Content */}
      <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 80px" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ background: C.dark, padding: "48px 24px 28px", position: "relative", overflow: "hidden" }}>
        <div style={noise} />
        <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 36, marginBottom: 40 }}>
            <div style={{ minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer" }} onClick={() => go("/")}>
                <Logo size={24} /><span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>Harvest<span style={{ color: C.gold }}>File</span></span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", lineHeight: 1.6, maxWidth: 220 }}>Making USDA farm program data work for American farmers.</p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tools</div>
              {[["ARC/PLC Calculator", "/"], ["Eligibility Screener", "/"], ["County Data", "/"]].map(([l, h]) => (<div key={l} onClick={() => go(h)} style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 9, cursor: "pointer" }}>{l}</div>))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Programs</div>
              {[["How ARC-CO Works", "/programs/arc-co"], ["How PLC Works", "/programs/plc"], ["EQIP Guide", "/programs/eqip"]].map(([l, h]) => (<div key={l} onClick={() => go(h)} style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 9, cursor: "pointer" }}>{l}</div>))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Company</div>
              {[["About", "/about"], ["Contact", "mailto:hello@harvestfile.com"], ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]].map(([l, h]) => (
                h.startsWith("mailto") ? <a key={l} href={h} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 9, textDecoration: "none" }}>{l}</a>
                : <div key={l} onClick={() => go(h)} style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 9, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)" }}>© 2026 HarvestFile LLC. All rights reserved.</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.08)" }}>Uses NASS API. Not endorsed by NASS or affiliated with USDA/FSA.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
