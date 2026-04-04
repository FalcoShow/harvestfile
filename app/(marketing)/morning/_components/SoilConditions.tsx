// =============================================================================
// app/(marketing)/morning/_components/SoilConditions.tsx
// HarvestFile — Surface 2 Deploy 2: Soil Intelligence Card
//
// Shows soil temperature at 2" and 6" depth with planting-readiness
// color coding, plus soil moisture levels. The 50°F threshold line
// for corn/soybean planting is THE critical indicator in spring.
// =============================================================================

'use client';

// ─── Types ───────────────────────────────────────────────────────────────────

// Accept any shape — the hook type (SoilData) and the raw API response
// have different property names. We normalize internally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SoilConditionsProps {
  soil: any;
}

// Normalize soil data from either naming convention
function normalizeSoil(raw: any): { temp2: number; temp6: number; moist0: number; moist4: number } | null {
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item) return null;

  return {
    temp2: item.soil_temp_2in_f ?? item.temp_2in_f ?? 0,
    temp6: item.soil_temp_6in_f ?? item.temp_6in_f ?? 0,
    moist0: item.soil_moisture_0_4in ?? item.moisture_pct ?? 0,
    moist4: item.soil_moisture_4_16in ?? item.moisture_pct ?? 0,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tempStatus(f: number): { color: string; label: string; bg: string; border: string } {
  if (f >= 55) return { color: 'text-emerald-300', label: 'Ideal', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/15' };
  if (f >= 50) return { color: 'text-emerald-400', label: 'Plantable', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/10' };
  if (f >= 40) return { color: 'text-amber-400', label: 'Warming', bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/10' };
  return { color: 'text-blue-400', label: 'Cold', bg: 'bg-blue-500/[0.06]', border: 'border-blue-500/10' };
}

function moistureStatus(val: number): { color: string; label: string; pct: number } {
  // val is volumetric water content (0-1 range typically 0.1-0.5)
  const pct = Math.round(val * 100);
  if (val > 0.4) return { color: 'text-blue-400', label: 'Saturated', pct };
  if (val > 0.25) return { color: 'text-emerald-400', label: 'Good', pct };
  if (val > 0.15) return { color: 'text-amber-400', label: 'Drying', pct };
  return { color: 'text-red-400', label: 'Dry', pct };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SoilConditions({ soil }: SoilConditionsProps) {
  const data = normalizeSoil(soil);
  if (!data) return null;

  const temp2 = tempStatus(data.temp2);
  const temp6 = tempStatus(data.temp6);
  const moist0 = moistureStatus(data.moist0);
  const moist4 = moistureStatus(data.moist4);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 sm:p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
        </svg>
        <h2 className="text-sm font-semibold text-white/90 tracking-tight">Soil Conditions</h2>
      </div>

      {/* Temperature Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 2-inch depth */}
        <div className={`rounded-xl ${temp2.bg} border ${temp2.border} p-3`}>
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">2&quot; Depth</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tabular-nums ${temp2.color}`}>
              {data.temp2.toFixed(1)}
            </span>
            <span className="text-xs text-white/25">°F</span>
          </div>
          <div className={`text-[10px] font-semibold mt-1 ${temp2.color}`}>{temp2.label}</div>
          {/* 50°F threshold indicator */}
          <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (data.temp2 / 65) * 100)}%`,
                background: data.temp2 >= 50
                  ? 'linear-gradient(90deg, #34D399, #22C55E)'
                  : data.temp2 >= 40
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                  : 'linear-gradient(90deg, #60A5FA, #3B82F6)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/15">32°</span>
            <span className="text-[9px] text-white/25 font-semibold">50° plant</span>
            <span className="text-[9px] text-white/15">65°</span>
          </div>
        </div>

        {/* 6-inch depth */}
        <div className={`rounded-xl ${temp6.bg} border ${temp6.border} p-3`}>
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">6&quot; Depth</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tabular-nums ${temp6.color}`}>
              {data.temp6.toFixed(1)}
            </span>
            <span className="text-xs text-white/25">°F</span>
          </div>
          <div className={`text-[10px] font-semibold mt-1 ${temp6.color}`}>{temp6.label}</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (data.temp6 / 65) * 100)}%`,
                background: data.temp6 >= 50
                  ? 'linear-gradient(90deg, #34D399, #22C55E)'
                  : data.temp6 >= 40
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                  : 'linear-gradient(90deg, #60A5FA, #3B82F6)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/15">32°</span>
            <span className="text-[9px] text-white/25 font-semibold">50° plant</span>
            <span className="text-[9px] text-white/15">65°</span>
          </div>
        </div>
      </div>

      {/* Moisture */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-500/[0.04] border border-blue-500/10 p-3">
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Moisture 0–4&quot;</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold tabular-nums ${moist0.color}`}>{moist0.pct}%</span>
            <span className={`text-[10px] font-semibold ${moist0.color}`}>{moist0.label}</span>
          </div>
        </div>
        <div className="rounded-xl bg-blue-500/[0.04] border border-blue-500/10 p-3">
          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Moisture 4–16&quot;</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold tabular-nums ${moist4.color}`}>{moist4.pct}%</span>
            <span className={`text-[10px] font-semibold ${moist4.color}`}>{moist4.label}</span>
          </div>
        </div>
      </div>

      {/* Context note */}
      <p className="text-[10px] text-white/15 mt-3">
        Corn/soybeans: 50°F+ at 2&quot; depth for 3 consecutive days. Wheat: 40°F+.
      </p>
    </div>
  );
}
