// =============================================================================
// app/dashboard/intelligence/page.tsx
// HarvestFile Intelligence Hub — The Revolutionary Dashboard
// This is the core product differentiator. Make it unforgettable.
// =============================================================================

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────────────

interface ReportSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  priority: number;
}

interface DataSource {
  source: string;
  endpoint: string;
  fetched_at: string;
  records: number;
}

interface Report {
  id: string;
  type: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  data_sources: DataSource[];
  generated_at: string;
  generation_time_ms: number;
}

interface SavedReport {
  id: string;
  report_type: string;
  title: string;
  summary: string;
  status: string;
  created_at: string;
  generation_time_ms: number;
  parameters: any;
}

// ── US States for dropdown ──────────────────────────────────────────────────
const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

const COMMON_CROPS = [
  "CORN", "SOYBEANS", "WHEAT", "COTTON", "RICE", "SORGHUM",
  "OATS", "BARLEY", "SUNFLOWER", "HAY", "ALFALFA",
];

const REPORT_TYPES = [
  {
    id: "market_intelligence",
    name: "Market Intelligence",
    icon: "📈",
    description: "Price trends, breakeven analysis, marketing strategy",
    color: "emerald",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    borderColor: "border-emerald-500/30",
    features: ["Price history & trends", "Breakeven calculator", "Revenue projections", "Marketing timing"],
  },
  {
    id: "crop_planner",
    name: "Crop Planner",
    icon: "🌱",
    description: "Planting windows, crop mix optimization, yield forecasts",
    color: "blue",
    gradient: "from-blue-500/20 to-blue-600/5",
    borderColor: "border-blue-500/30",
    features: ["Planting window analysis", "Soil temp monitoring", "Crop rotation", "Acreage optimization"],
  },
  {
    id: "weather_risk",
    name: "Weather Risk",
    icon: "⛈️",
    description: "16-day forecast, frost alerts, drought risk, GDD tracking",
    color: "amber",
    gradient: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/30",
    features: ["16-day ag forecast", "Frost/freeze alerts", "Soil moisture", "GDD accumulation"],
  },
  {
    id: "full_analysis",
    name: "Complete Analysis",
    icon: "🧠",
    description: "Everything combined — the ultimate farm intelligence brief",
    color: "purple",
    gradient: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/30",
    features: ["All reports combined", "30/60/90-day plan", "Risk matrix", "Financial projections"],
    isPremium: true,
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function IntelligenceHub() {
  // ── State ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<"hub" | "generate" | "report">("hub");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Form state
  const [state, setState] = useState("OH");
  const [county, setCounty] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>(["CORN", "SOYBEANS"]);
  const [acres, setAcres] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // Report state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── Load report history ───────────────────────────────────────────────
  useEffect(() => {
    async function loadReports() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pro } = await supabase
        .from("professionals")
        .select("org_id")
        .eq("auth_id", user.id)
        .single();

      if (!pro) return;

      const { data } = await supabase
        .from("intelligence_reports")
        .select("id, report_type, title, summary, status, created_at, generation_time_ms, parameters")
        .eq("org_id", pro.org_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setSavedReports(data);
      setLoadingHistory(false);
    }

    loadReports();
  }, [currentReport]); // Refresh after generating

  // ── Generate report ───────────────────────────────────────────────────
  async function handleGenerate() {
    if (!county || !selectedType) return;

    setIsGenerating(true);
    setError(null);
    setGenerationStage("Connecting to USDA databases...");

    const stages = [
      "Connecting to USDA databases...",
      "Fetching crop prices & yields...",
      "Pulling 16-day weather forecast...",
      "Analyzing 10-year climate history...",
      "Running AI analysis engine...",
      "Building your intelligence report...",
    ];

    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length) {
        setGenerationStage(stages[stageIdx]);
      }
    }, 3000);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/intelligence/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          report_type: selectedType,
          state,
          county,
          crops: selectedCrops,
          acres: acres ? parseInt(acres) : undefined,
          additional_context: additionalContext || undefined,
        }),
      });

      clearInterval(stageInterval);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Report generation failed");
      }

      setCurrentReport(data.report);
      setView("report");
      setGenerationStage("");
    } catch (err) {
      clearInterval(stageInterval);
      setError(err instanceof Error ? err.message : "Failed to generate report");
      setGenerationStage("");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Toggle crop selection ─────────────────────────────────────────────
  function toggleCrop(crop: string) {
    setSelectedCrops(prev =>
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Hub View (main landing)
  // ═══════════════════════════════════════════════════════════════════════
  if (view === "hub") {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-transparent border border-emerald-500/20 p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🧠</span>
              <h1 className="text-3xl font-bold text-white">Intelligence Hub</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                AI-POWERED
              </span>
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mt-2">
              Real-time market intelligence, crop planning, and weather risk analysis — 
              powered by USDA data and advanced AI. Every report tells you exactly what to do.
            </p>
            <button
              onClick={() => setView("generate")}
              className="mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
            >
              Generate New Report →
            </button>
          </div>
        </div>

        {/* Report type cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setView("generate");
              }}
              className={`group relative text-left rounded-xl bg-gradient-to-br ${type.gradient} border ${type.borderColor} p-6 hover:border-opacity-60 transition-all hover:shadow-lg`}
            >
              {type.isPremium && (
                <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30 uppercase">
                  Pro
                </span>
              )}
              <div className="flex items-start gap-4">
                <span className="text-3xl">{type.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {type.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {type.features.map((f) => (
                      <span key={f} className="text-xs px-2 py-1 rounded-md bg-white/[0.05] text-gray-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Recent reports */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Reports</h2>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
            </div>
          ) : savedReports.length === 0 ? (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
              <span className="text-4xl mb-4 block">📊</span>
              <p className="text-gray-400">No reports yet. Generate your first intelligence report above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedReports.map((r) => {
                const typeInfo = REPORT_TYPES.find(t => t.id === r.report_type);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <span className="text-2xl">{typeInfo?.icon || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">
                        {r.title || `${typeInfo?.name} Report`}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {r.summary || `${r.parameters?.county} County, ${r.parameters?.state}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-medium ${
                        r.status === "complete" ? "text-emerald-400" : 
                        r.status === "failed" ? "text-red-400" : "text-yellow-400"
                      }`}>
                        {r.status === "complete" ? "✓ Complete" : r.status}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {new Date(r.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Generate View (form)
  // ═══════════════════════════════════════════════════════════════════════
  if (view === "generate") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => { setView("hub"); setError(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Back to Intelligence Hub
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Generate Intelligence Report</h1>
          <p className="text-gray-400 mt-1">
            Select your report type, location, and crops — our AI will pull real-time USDA data and weather
            forecasts to build your personalized analysis.
          </p>
        </div>

        {/* Report type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Report Type</label>
          <div className="grid grid-cols-2 gap-3">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedType === type.id
                    ? `bg-${type.color}-500/10 border-${type.color}-500/40 ring-1 ring-${type.color}-500/20`
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{type.icon}</span>
                  <span className={`text-sm font-medium ${
                    selectedType === type.id ? "text-white" : "text-gray-300"
                  }`}>
                    {type.name}
                  </span>
                  {type.isPremium && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-bold">
                      PRO
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            >
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value} className="bg-[#1a1f1c]">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">County</label>
            <input
              type="text"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g. Summit, Wayne, Champaign"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Crops */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Crops <span className="text-gray-500">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_CROPS.map((crop) => (
              <button
                key={crop}
                onClick={() => toggleCrop(crop)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCrops.includes(crop)
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {crop.charAt(0) + crop.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Acres */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total Acres <span className="text-gray-500">(optional — enables revenue projections)</span>
          </label>
          <input
            type="number"
            value={acres}
            onChange={(e) => setAcres(e.target.value)}
            placeholder="e.g. 500"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Additional context */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Specific Questions <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={3}
            placeholder="e.g. Should I switch 100 acres from corn to soybeans? When should I market my grain?"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !county || !selectedType || selectedCrops.length === 0}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            isGenerating
              ? "bg-emerald-500/20 text-emerald-400 cursor-wait"
              : "bg-emerald-500 hover:bg-emerald-400 text-black hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.99]"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {generationStage}
            </span>
          ) : (
            "🧠 Generate Intelligence Report"
          )}
        </button>

        {/* Data sources notice */}
        <p className="text-xs text-gray-600 text-center">
          Powered by USDA NASS QuickStats, Open-Meteo Weather, National Weather Service, and Claude AI.
          All data is sourced from official government databases.
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Report View (the generated report)
  // ═══════════════════════════════════════════════════════════════════════
  if (view === "report" && currentReport) {
    const typeInfo = REPORT_TYPES.find(t => t.id === currentReport.type);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => { setView("hub"); setCurrentReport(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Back to Intelligence Hub
        </button>

        {/* Report header */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 via-transparent to-transparent border border-emerald-500/15 p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{typeInfo?.icon || "📊"}</span>
                <div>
                  <h1 className="text-2xl font-bold text-white">{currentReport.title}</h1>
                  <p className="text-sm text-gray-400 mt-1">
                    Generated {new Date(currentReport.generated_at).toLocaleString("en-US", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {/* Executive summary */}
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-emerald-300 text-sm leading-relaxed">{currentReport.summary}</p>
              </div>
            </div>
          </div>

          {/* Metadata bar */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>⚡</span>
              <span>{(currentReport.generation_time_ms / 1000).toFixed(1)}s generation time</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>📡</span>
              <span>{currentReport.data_sources.length} data sources</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>📊</span>
              <span>{currentReport.sections.length} sections</span>
            </div>
          </div>
        </div>

        {/* Report sections */}
        <div className="space-y-4">
          {currentReport.sections.map((section) => (
            <ReportSectionCard key={section.id} section={section} />
          ))}
        </div>

        {/* Data sources */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Data Sources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentReport.data_sources.map((ds, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
                <span className="text-gray-400 font-medium">{ds.source}</span>
                <span>·</span>
                <span>{ds.records} records</span>
                <span>·</span>
                <span>{new Date(ds.fetched_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setView("generate"); setCurrentReport(null); }}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all text-sm"
          >
            Generate Another Report
          </button>
          <button
            onClick={() => { setView("hub"); setCurrentReport(null); }}
            className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 font-medium rounded-xl transition-all text-sm border border-white/[0.06]"
          >
            Back to Hub
          </button>
        </div>
      </div>
    );
  }

  return null;
}


// ── Report Section Card ─────────────────────────────────────────────────────

function ReportSectionCard({ section }: { section: ReportSection }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-xl">{section.icon}</span>
        <h3 className="flex-1 text-base font-semibold text-white">{section.title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="px-5 pb-5 -mt-1">
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownRenderer content={section.content} />
          </div>
        </div>
      )}
    </div>
  );
}


// ── Simple Markdown Renderer ────────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown-to-html conversion for report content
  const html = content
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-emerald-400 font-semibold mt-4 mb-2">$1</h4>')
    .replace(/^#### (.+)$/gm, '<h5 class="text-gray-300 font-medium mt-3 mb-1">$1</h5>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li class="text-gray-300 ml-4 mb-1 list-disc">$1</li>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => c.match(/^[-:]+$/))) return ''; // Skip separator rows
      const tag = cells.every(c => c === c.toUpperCase() || c.match(/^[-:]+$/)) ? 'th' : 'td';
      return `<tr>${cells.map(c => `<${tag} class="px-3 py-1.5 text-sm border border-white/[0.06]">${c}</${tag}>`).join('')}</tr>`;
    })
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-gray-300 text-sm leading-relaxed mb-3">')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="text-gray-300 text-sm leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:rounded-lg [&_table]:overflow-hidden [&_th]:bg-white/[0.05] [&_th]:text-gray-400 [&_th]:font-medium [&_th]:text-xs [&_td]:text-gray-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
