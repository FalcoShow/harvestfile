"use client";

// =============================================================================
// HarvestFile — ResultChart (Lazy-loaded)
// Phase 10 Build 3: Visual comparison bar for ARC-CO vs PLC
//
// CSS-only horizontal bar chart — zero external dependencies.
// Dynamically imported to keep the initial calculator bundle small.
// =============================================================================

interface ResultChartProps {
  arcPerAcre: number;
  plcPerAcre: number;
  winner: "ARC-CO" | "PLC";
}

export default function ResultChart({ arcPerAcre, plcPerAcre, winner }: ResultChartProps) {
  const max = Math.max(arcPerAcre, plcPerAcre, 1); // prevent divide by zero
  const arcPct = (arcPerAcre / max) * 100;
  const plcPct = (plcPerAcre / max) * 100;

  return (
    <div>
      <div className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3">
        Payment per base acre
      </div>

      {/* ARC-CO bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold" style={{ color: winner === "ARC-CO" ? "#C9A84C" : "rgba(255,255,255,0.45)" }}>
            ARC-CO
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: winner === "ARC-CO" ? "#C9A84C" : "rgba(255,255,255,0.45)" }}>
            ${arcPerAcre.toFixed(2)}/ac
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${arcPct}%`,
              background: winner === "ARC-CO"
                ? "linear-gradient(90deg, #9E7E30, #C9A84C)"
                : "rgba(255,255,255,0.12)",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "200ms",
            }}
          />
        </div>
      </div>

      {/* PLC bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold" style={{ color: winner === "PLC" ? "#C9A84C" : "rgba(255,255,255,0.45)" }}>
            PLC
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: winner === "PLC" ? "#C9A84C" : "rgba(255,255,255,0.45)" }}>
            ${plcPerAcre.toFixed(2)}/ac
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${plcPct}%`,
              background: winner === "PLC"
                ? "linear-gradient(90deg, #9E7E30, #C9A84C)"
                : "rgba(255,255,255,0.12)",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "400ms",
            }}
          />
        </div>
      </div>
    </div>
  );
}
