// =============================================================================
// HarvestFile — Phase 7B: Historical Enrollment Context
// Server Component — Shows USDA FSA historical ARC/PLC enrollment data.
//
// Renders a premium section on each county page showing how farmers in that
// county have historically chosen between ARC-CO and PLC. This is the
// cold-start content that makes pages valuable before live 2026 data exists.
//
// Design: Light theme (marketing pages), emerald for ARC-CO, blue for PLC,
// gold accents for CTAs. Matches the county page's existing aesthetic.
// =============================================================================

import {
  getCountyEnrollmentHistory,
  type HistoricalEnrollment,
} from '@/lib/data/historical-enrollment';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  countyFips: string;
  countyName: string;
  stateAbbr: string;
}

interface CropSummary {
  crop_name: string;
  commodity_code: string;
  latest_arcco_pct: number;
  latest_plc_pct: number;
  latest_total_acres: number;
  trend: 'more-arc' | 'more-plc' | 'stable';
  years: {
    year: number;
    arcco_pct: number;
    plc_pct: number;
    total_acres: number;
  }[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export async function HistoricalEnrollmentSection({
  countyFips,
  countyName,
  stateAbbr,
}: Props) {
  const history = await getCountyEnrollmentHistory(countyFips);
  if (!history || history.length === 0) return null;

  // Group by crop, get latest year per crop, calculate trends
  const cropMap = new Map<string, HistoricalEnrollment[]>();
  for (const row of history) {
    const key = row.crop_name;
    if (!cropMap.has(key)) cropMap.set(key, []);
    cropMap.get(key)!.push(row);
  }

  const latestYear = Math.max(...history.map(r => r.program_year));
  
  const cropSummaries: CropSummary[] = [];
  for (const [cropName, rows] of Array.from(cropMap.entries())) {
    const sorted = rows.sort((a, b) => a.program_year - b.program_year);
    const latest = sorted[sorted.length - 1];
    
    // Calculate trend: compare latest year to 3 years ago
    const threeYearsAgo = sorted.find(
      r => r.program_year === latestYear - 3
    );
    let trend: 'more-arc' | 'more-plc' | 'stable' = 'stable';
    if (threeYearsAgo) {
      const diff = Number(latest.arcco_pct) - Number(threeYearsAgo.arcco_pct);
      if (diff > 5) trend = 'more-arc';
      else if (diff < -5) trend = 'more-plc';
    }

    cropSummaries.push({
      crop_name: cropName,
      commodity_code: latest.commodity_code,
      latest_arcco_pct: Number(latest.arcco_pct),
      latest_plc_pct: Number(latest.plc_pct),
      latest_total_acres: Number(latest.total_acres),
      trend,
      years: sorted.map(r => ({
        year: r.program_year,
        arcco_pct: Number(r.arcco_pct),
        plc_pct: Number(r.plc_pct),
        total_acres: Number(r.total_acres),
      })),
    });
  }

  // Sort by total acres (most important crops first)
  cropSummaries.sort((a, b) => b.latest_total_acres - a.latest_total_acres);

  // Only show crops with meaningful acres (>100)
  const displayCrops = cropSummaries.filter(c => c.latest_total_acres > 100);
  if (displayCrops.length === 0) return null;

  // Calculate total acres across all crops
  const totalAllCrops = displayCrops.reduce(
    (sum, c) => sum + c.latest_total_acres, 0
  );

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="rounded-2xl border border-border/50 overflow-hidden bg-white/50">
        {/* ── Section Header ── */}
        <div className="px-8 py-6 border-b border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-harvest-gold uppercase tracking-widest">
              USDA FSA Data
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {latestYear} enrollment
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            How {countyName} County, {stateAbbr} has chosen
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical ARC-CO vs PLC enrollment based on{' '}
            {Math.round(totalAllCrops).toLocaleString()} enrolled base acres
          </p>
        </div>

        {/* ── Crop Breakdown ── */}
        <div className="divide-y divide-border/30">
          {displayCrops.slice(0, 6).map((crop) => {
            const arcPct = Math.round(crop.latest_arcco_pct);
            const plcPct = Math.round(crop.latest_plc_pct);
            const dominant = arcPct >= plcPct ? 'ARC-CO' : 'PLC';
            const dominantPct = Math.max(arcPct, plcPct);

            return (
              <div key={crop.crop_name} className="px-8 py-5">
                {/* Crop name + trend */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">
                      {crop.crop_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(crop.latest_total_acres).toLocaleString()} acres
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {crop.trend !== 'stable' && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          crop.trend === 'more-arc'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {crop.trend === 'more-arc'
                          ? '↑ Shifting to ARC'
                          : '↑ Shifting to PLC'}
                      </span>
                    )}
                    <span
                      className={`text-sm font-bold ${
                        dominant === 'ARC-CO'
                          ? 'text-emerald-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {dominantPct}% {dominant}
                    </span>
                  </div>
                </div>

                {/* Split bar */}
                <div className="flex w-full h-7 rounded-lg overflow-hidden">
                  {arcPct > 0 && (
                    <div
                      className="h-full flex items-center transition-all duration-500"
                      style={{
                        width: `${arcPct}%`,
                        backgroundColor: '#10B981',
                        paddingLeft: arcPct > 18 ? '10px' : '2px',
                      }}
                    >
                      {arcPct > 15 && (
                        <span className="text-[11px] font-bold text-white whitespace-nowrap">
                          ARC-CO {arcPct}%
                        </span>
                      )}
                    </div>
                  )}
                  {plcPct > 0 && (
                    <div
                      className="h-full flex items-center justify-end transition-all duration-500"
                      style={{
                        width: `${plcPct}%`,
                        backgroundColor: '#3B82F6',
                        paddingRight: plcPct > 18 ? '10px' : '2px',
                      }}
                    >
                      {plcPct > 15 && (
                        <span className="text-[11px] font-bold text-white whitespace-nowrap">
                          PLC {plcPct}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Mini sparkline: 7-year trend as tiny dots */}
                {crop.years.length > 1 && (
                  <div className="flex items-center gap-1 mt-2.5">
                    <span className="text-[10px] text-muted-foreground/60 mr-1">
                      {crop.years[0].year}
                    </span>
                    {crop.years.map((y) => (
                      <div
                        key={y.year}
                        className="flex-1 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            y.arcco_pct >= 50
                              ? `rgba(16,185,129,${0.3 + (y.arcco_pct / 100) * 0.7})`
                              : `rgba(59,130,246,${0.3 + (y.plc_pct / 100) * 0.7})`,
                        }}
                        title={`${y.year}: ${Math.round(y.arcco_pct)}% ARC-CO`}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground/60 ml-1">
                      {crop.years[crop.years.length - 1].year}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-8 py-4 bg-surface/30 border-t border-border/30">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
            <span>
              Source: USDA Farm Service Agency — Enrolled Base Acres by County
              (2019–{latestYear})
            </span>
            <span>Updated for OBBBA (2025 Farm Bill)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
