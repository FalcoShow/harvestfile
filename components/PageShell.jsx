"use client";

import { useRouter } from "next/navigation";

const C = {
  dark: "#0C1F17", forest: "#1B4332", sage: "#40624D",
  gold: "#C9A84C", cream: "#FAFAF6", white: "#FFFFFF",
  text: "#111827", textSoft: "#6B7280", textMuted: "#9CA3AF",
};

export default function PageShell({ children, title, subtitle }) {
  return (
    <div style={{ color: C.text, background: C.cream, minHeight: "100vh" }}>
      {/* Header */}
      {title && (
        <section style={{ padding: "100px 24px 48px", textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
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
    </div>
  );
}
