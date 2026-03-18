// =============================================================================
// HarvestFile — Bridge Detector
// Phase 13 Build 1: Calculator → Dashboard Bridge
//
// Client Component that runs on dashboard load. Checks localStorage for
// calculator bridge data. If found, calls POST /api/bridge to auto-create
// the farmer + crop + calculation, then clears storage and shows a success
// toast with link to the newly created farmer.
//
// Renders nothing when no bridge data exists. Shows a brief loading state
// during the bridge process, then a success card that auto-dismisses.
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BRIDGE_KEY = "hf_calculator_bridge";

interface BridgeData {
  stateAbbr: string;
  stateName: string;
  countyFips: string;
  countyName: string;
  cropCode: string;
  cropName: string;
  acres: number;
  results: {
    arc: number;
    plc: number;
    arcPerAcre: number;
    plcPerAcre: number;
    best: "ARC-CO" | "PLC";
    diff: number;
    diffPerAcre: number;
  };
  isCountySpecific: boolean;
  timestamp: number;
}

type BridgeState = "idle" | "bridging" | "success" | "error";

export function BridgeDetector() {
  const router = useRouter();
  const [state, setState] = useState<BridgeState>("idle");
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [bridgeData, setBridgeData] = useState<BridgeData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(BRIDGE_KEY);
    if (!raw) return;

    let data: BridgeData;
    try {
      data = JSON.parse(raw);
    } catch {
      localStorage.removeItem(BRIDGE_KEY);
      return;
    }

    // Validate it's not stale (> 24 hours old)
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(BRIDGE_KEY);
      return;
    }

    // Validate required fields
    if (!data.stateAbbr || !data.countyName || !data.cropCode || !data.results) {
      localStorage.removeItem(BRIDGE_KEY);
      return;
    }

    setBridgeData(data);
    setState("bridging");

    // Execute the bridge
    fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Bridge failed");

        setFarmerId(json.farmerId);
        setState("success");
        localStorage.removeItem(BRIDGE_KEY);

        // Refresh the page data after a short delay so dashboard stats update
        setTimeout(() => {
          router.refresh();
        }, 500);
      })
      .catch((err) => {
        console.error("[BridgeDetector] Error:", err);
        setErrorMsg(err.message);
        setState("error");
        // Don't remove from localStorage on error — let them retry
      });
  }, [router]);

  // ── Render nothing when idle ────────────────────────────────────────────
  if (state === "idle") return null;

  // ── Bridging in progress ────────────────────────────────────────────────
  if (state === "bridging") {
    return (
      <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Setting up your farm profile...
            </p>
            <p className="text-xs text-emerald-300/50 mt-0.5">
              Importing your {bridgeData?.cropName} analysis from {bridgeData?.countyName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Bridge error ────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-300">
              Couldn&apos;t import your calculator results
            </p>
            <p className="text-xs text-red-300/50 mt-1">
              {errorMsg || "Something went wrong. You can still add your farm manually."}
            </p>
          </div>
          <button
            onClick={() => {
              setState("idle");
              localStorage.removeItem(BRIDGE_KEY);
            }}
            className="text-xs text-red-300/40 hover:text-red-300/60 transition-colors flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // ── Bridge success ──────────────────────────────────────────────────────
  if (state === "success" && bridgeData) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(5,150,105,0.06) 100%)",
          border: "1px solid rgba(201,168,76,0.15)",
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-white">
                  Your farm profile is ready
                </p>
              </div>

              {/* Analysis card */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">County</div>
                    <div className="text-sm font-semibold text-white truncate">
                      {bridgeData.countyName}, {bridgeData.stateAbbr}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Crop</div>
                    <div className="text-sm font-semibold text-white">
                      {bridgeData.cropName} · {bridgeData.acres.toLocaleString()} ac
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation highlight */}
              <div
                className="rounded-lg p-3 mb-4"
                style={{
                  background: "rgba(201,168,76,0.06)",
                  border: "1px solid rgba(201,168,76,0.12)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#C9A84C]/50 mb-0.5">
                      Recommended Program
                    </div>
                    <div className="text-lg font-bold text-[#C9A84C]">
                      {bridgeData.results.best}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400/50 mb-0.5">
                      Additional Earnings
                    </div>
                    <div className="text-lg font-bold text-emerald-400">
                      +${bridgeData.results.diffPerAcre.toFixed(2)}/ac
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {farmerId && (
                  <a
                    href={`/dashboard/farmers/${farmerId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                  >
                    View Farm Details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </a>
                )}
                <button
                  onClick={() => setState("idle")}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
