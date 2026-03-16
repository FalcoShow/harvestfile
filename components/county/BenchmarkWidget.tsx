// =============================================================================
// HarvestFile — Phase 7A: County Election Benchmark Widget
// "The Facebook Moment" — Share your election, see what your neighbors chose
//
// Client Component — handles voting flow, locked/unlocked states, SWR polling.
// Embedded in county ARC/PLC pages as a dynamic import.
//
// Design: Uses theme-aware CSS variables (foreground, muted-foreground, surface,
//         border) to match the light marketing theme on county pages.
//         Emerald = ARC-CO, Blue = PLC. Gold = CTAs.
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BenchmarkData {
  commodity_code: string;
  arc_co_pct: number | null;
  plc_pct: number | null;
  total_count: number;
  is_visible: boolean;
  last_updated?: string;
}

interface SocialProof {
  state_this_week: number;
  state_counties_this_week: number;
  state_total: number;
}

interface Props {
  countyFips: string;
  countyName: string;
  stateName: string;
  stateAbbr: string;
  availableCrops: { code: string; name: string }[];
  initialBenchmarks?: BenchmarkData[];
  initialSocialProof?: SocialProof;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const UNLOCK_THRESHOLD = 5;
const POLL_INTERVAL = 30000; // 30 seconds
const PROGRAM_YEAR = 2026;

const CROP_EMOJI: Record<string, string> = {
  CORN: '🌽', SOYBEANS: '🫘', WHEAT: '🌾', SORGHUM: '🌿',
  BARLEY: '🪴', OATS: '🌱', COTTON: '☁️', PEANUTS: '🥜',
  RICE: '🍚', SUNFLOWER: '🌻', CANOLA: '🪻', FLAXSEED: '🌰',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function BenchmarkWidget({
  countyFips,
  countyName,
  stateName,
  stateAbbr,
  availableCrops,
  initialBenchmarks,
  initialSocialProof,
}: Props) {
  // State
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>(initialBenchmarks || []);
  const [socialProof, setSocialProof] = useState<SocialProof>(
    initialSocialProof || { state_this_week: 0, state_counties_this_week: 0, state_total: 0 }
  );
  const [hasContributed, setHasContributed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [justUnlocked, setJustUnlocked] = useState(false);

  // Form state
  const [selectedCrop, setSelectedCrop] = useState(availableCrops[0]?.code || '');
  const [selectedElection, setSelectedElection] = useState<'ARC-CO' | 'PLC' | ''>('');
  const [email, setEmail] = useState('');

  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Check localStorage for prior contribution
  useEffect(() => {
    try {
      const contributed = localStorage.getItem(`hf_benchmark_${countyFips}_${PROGRAM_YEAR}`);
      if (contributed) setHasContributed(true);
    } catch {}
  }, [countyFips]);

  // ── SWR-like polling for benchmark data ─────────────────────────────────
  const fetchBenchmarks = useCallback(async () => {
    try {
      const res = await fetch(`/api/benchmarks/${countyFips}?year=${PROGRAM_YEAR}`);
      if (!res.ok) return;
      const data = await res.json();
      setBenchmarks(data.benchmarks || []);
      setSocialProof(data.social_proof || socialProof);
    } catch {}
  }, [countyFips]);

  useEffect(() => {
    if (!initialBenchmarks) fetchBenchmarks();
    const interval = setInterval(fetchBenchmarks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchBenchmarks, initialBenchmarks]);

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCrop || !selectedElection || !email) {
      setSubmitError('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubmitError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/benchmarks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          county_fips: countyFips,
          commodity_code: selectedCrop,
          election_choice: selectedElection,
          email,
          program_year: PROGRAM_YEAR,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong');
        return;
      }

      setBenchmarks(data.benchmarks || []);
      setHasContributed(true);
      setShowForm(false);
      setJustUnlocked(true);

      try {
        localStorage.setItem(`hf_benchmark_${countyFips}_${PROGRAM_YEAR}`, 'true');
      } catch {}

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);

      setTimeout(() => setJustUnlocked(false), 3000);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────
  const totalSubmissions = benchmarks.reduce((sum, b) => sum + b.total_count, 0);
  const anyVisible = benchmarks.some(b => b.is_visible);
  const canSeeResults = hasContributed || anyVisible;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-harvest-forest-800/20 bg-gradient-to-b from-harvest-forest-950 to-harvest-forest-900">
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 p-6 sm:p-8">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.12] border border-emerald-500/[0.2] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-[0.1em]">
                Live · {PROGRAM_YEAR} Election Data
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              What is {countyName} choosing?
            </h3>
            <p className="mt-1.5 text-sm text-white/50 leading-relaxed max-w-md">
              See how your neighbors are deciding between ARC-CO and PLC for {PROGRAM_YEAR}. 
              Anonymous and aggregated — only county totals are shown.
            </p>
          </div>

          {/* Social proof badge */}
          {socialProof.state_total > 0 && (
            <div className="hidden sm:flex flex-col items-end text-right shrink-0">
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {socialProof.state_total.toLocaleString()}
              </div>
              <div className="text-[11px] text-white/40 font-medium">
                {stateAbbr} farmers shared
              </div>
            </div>
          )}
        </div>

        {/* ═══ BENCHMARK RESULTS (locked or unlocked) ═══ */}
        <div ref={resultsRef}>
          {benchmarks.length > 0 ? (
            <div className="space-y-3 mb-6">
              {benchmarks.map((b) => {
                const crop = availableCrops.find(c => c.code === b.commodity_code);
                if (!crop) return null;

                const isLocked = !b.is_visible && !hasContributed;
                const showData = b.is_visible || hasContributed;

                return (
                  <div
                    key={b.commodity_code}
                    className={`relative rounded-xl border transition-all duration-500 ${
                      justUnlocked
                        ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                        : 'border-white/[0.08] bg-white/[0.04]'
                    } ${isLocked ? 'overflow-hidden' : ''}`}
                  >
                    {/* Blur overlay for locked state */}
                    {isLocked && (
                      <div className="absolute inset-0 z-10 backdrop-blur-md bg-black/30 rounded-xl flex items-center justify-center">
                        <div className="text-center px-4">
                          <div className="text-sm font-semibold text-white/70 mb-1">
                            {b.total_count} of {UNLOCK_THRESHOLD} needed to unlock
                          </div>
                          <div className="w-32 h-1.5 rounded-full bg-white/10 mx-auto overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                              style={{ width: `${Math.min(100, (b.total_count / UNLOCK_THRESHOLD) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Crop header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{CROP_EMOJI[b.commodity_code] || '🌾'}</span>
                          <span className="font-bold text-white text-sm">{crop.name}</span>
                        </div>
                        <div className="text-xs text-white/30 tabular-nums">
                          {b.total_count} farmer{b.total_count !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* ARC/PLC bar */}
                      <div className="relative h-10 rounded-lg overflow-hidden bg-white/[0.06] border border-white/[0.06]">
                        {showData && b.arc_co_pct != null && b.plc_pct != null ? (
                          <>
                            {/* ARC-CO segment */}
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-1000 ease-out flex items-center"
                              style={{
                                width: `${b.arc_co_pct}%`,
                                minWidth: b.arc_co_pct > 0 ? '60px' : '0',
                              }}
                            >
                              <span className="pl-3 text-xs font-bold text-white whitespace-nowrap">
                                ARC-CO {b.arc_co_pct}%
                              </span>
                            </div>
                            {/* PLC segment */}
                            <div
                              className="absolute inset-y-0 right-0 bg-gradient-to-l from-blue-600 to-blue-500 transition-all duration-1000 ease-out flex items-center justify-end"
                              style={{
                                width: `${b.plc_pct}%`,
                                minWidth: b.plc_pct > 0 ? '50px' : '0',
                              }}
                            >
                              <span className="pr-3 text-xs font-bold text-white whitespace-nowrap">
                                {b.plc_pct}% PLC
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-xs text-white/25">
                              {b.total_count > 0
                                ? `${UNLOCK_THRESHOLD - b.total_count} more needed to reveal`
                                : 'Be the first to share'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty state — no benchmarks yet */
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center mb-6">
              <div className="text-3xl mb-3">🗳️</div>
              <div className="text-sm font-semibold text-white/60 mb-1">
                No {PROGRAM_YEAR} election data yet for {countyName}
              </div>
              <div className="text-xs text-white/30">
                Be the first farmer in your county to share — it only takes 30 seconds.
              </div>
            </div>
          )}
        </div>

        {/* ═══ CONTRIBUTION CTA / FORM ═══ */}
        {!hasContributed && !showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }}
            className="group relative w-full rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] to-amber-400/[0.03] hover:from-amber-500/[0.15] hover:to-amber-400/[0.08] transition-all duration-300 p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                🗳️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-amber-200">
                  Share your {PROGRAM_YEAR} election — unlock your county&apos;s data
                </div>
                <div className="text-xs text-white/35 mt-0.5">
                  Anonymous · 30 seconds · Helps your neighbors decide too
                </div>
              </div>
              <svg className="w-5 h-5 text-amber-400/60 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        )}

        {/* ═══ CONTRIBUTION FORM ═══ */}
        {showForm && !hasContributed && (
          <div
            ref={formRef}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm">🗳️</div>
              <div>
                <div className="text-sm font-bold text-white">Share your planned election</div>
                <div className="text-[11px] text-white/35">Anonymous — only county totals are ever shown</div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Crop selector */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Crop
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableCrops.slice(0, 6).map((crop) => (
                    <button
                      key={crop.code}
                      onClick={() => setSelectedCrop(crop.code)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        selectedCrop === crop.code
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/15 hover:text-white/70'
                      }`}
                    >
                      <span className="mr-1.5">{CROP_EMOJI[crop.code] || '🌾'}</span>
                      {crop.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Election choice */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Your {PROGRAM_YEAR} election for {availableCrops.find(c => c.code === selectedCrop)?.name || 'this crop'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedElection('ARC-CO')}
                    className={`relative px-4 py-4 rounded-xl border text-left transition-all ${
                      selectedElection === 'ARC-CO'
                        ? 'border-emerald-500/40 bg-emerald-500/15 ring-1 ring-emerald-500/20'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-emerald-500/20'
                    }`}
                  >
                    <div className={`text-base font-extrabold tracking-tight ${
                      selectedElection === 'ARC-CO' ? 'text-emerald-400' : 'text-white/60'
                    }`}>
                      ARC-CO
                    </div>
                    <div className="text-[11px] text-white/30 mt-0.5">
                      Agriculture Risk Coverage
                    </div>
                    {selectedElection === 'ARC-CO' && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedElection('PLC')}
                    className={`relative px-4 py-4 rounded-xl border text-left transition-all ${
                      selectedElection === 'PLC'
                        ? 'border-blue-500/40 bg-blue-500/15 ring-1 ring-blue-500/20'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-blue-500/20'
                    }`}
                  >
                    <div className={`text-base font-extrabold tracking-tight ${
                      selectedElection === 'PLC' ? 'text-blue-400' : 'text-white/60'
                    }`}>
                      PLC
                    </div>
                    <div className="text-[11px] text-white/30 mt-0.5">
                      Price Loss Coverage
                    </div>
                    {selectedElection === 'PLC' && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Email <span className="text-white/25 normal-case tracking-normal">(for verification — never shared)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@farm.com"
                  className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/15 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {/* Error */}
              {submitError && (
                <div className="text-sm text-red-300 bg-red-500/[0.1] border border-red-500/20 rounded-lg px-3 py-2">
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedCrop || !selectedElection || !email}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Share My Election & See Results →'
                )}
              </button>

              {/* Privacy note */}
              <div className="flex items-start gap-2 text-[11px] text-white/25 leading-relaxed">
                <svg className="w-3.5 h-3.5 text-white/20 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>
                  Your election stays anonymous. We store only a hashed identifier — never your name or farm details. 
                  Only county-level percentages are shown. Minimum 5 farms per county before any data is revealed.
                </span>
              </div>

              {/* Cancel */}
              <button
                onClick={() => setShowForm(false)}
                className="w-full text-center text-xs text-white/25 hover:text-white/50 transition-colors py-1"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* ═══ POST-CONTRIBUTION SUCCESS STATE ═══ */}
        {hasContributed && (
          <div className="mt-2">
            {/* Thank you bar */}
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 px-4 py-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-xs text-emerald-300">
                <span className="font-semibold">You&apos;re in.</span> Your election is counted in the {countyName} benchmark.
              </div>
            </div>

            {/* Share CTA */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  const primaryVis = benchmarks.find(b => b.is_visible);
                  const text = primaryVis
                    ? `${countyName}, ${stateAbbr} is ${primaryVis.arc_co_pct}% ARC-CO for ${primaryVis.commodity_code.toLowerCase()} — check yours:`
                    : `I just shared my ARC/PLC election for ${countyName} — check yours:`;
                  const url = `https://harvestfile.com/${stateName.toLowerCase().replace(/\s+/g, '-')}/${countyName.toLowerCase().replace(/\s+/g, '-').replace(/county/i, 'county')}/arc-plc`;

                  if (navigator.share) {
                    navigator.share({ title: 'HarvestFile County Benchmark', text, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(`${text} ${url}`);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/80 text-xs font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share with neighbors
              </button>
              <button
                onClick={() => {
                  const lines = benchmarks
                    .filter(b => b.is_visible)
                    .map(b => `${b.commodity_code}: ${b.arc_co_pct}% ARC-CO / ${b.plc_pct}% PLC (${b.total_count} farmers)`);
                  const summary = `${countyName}, ${stateAbbr} — ${PROGRAM_YEAR} ARC/PLC Elections\n${lines.join('\n')}\n\nCheck yours: harvestfile.com`;
                  navigator.clipboard.writeText(summary);
                  alert('Benchmark data copied!');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/80 text-xs font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy data
              </button>
            </div>
          </div>
        )}

        {/* ═══ FOOTER — LIVE TICKER / SOCIAL PROOF ═══ */}
        {(socialProof.state_this_week > 0 || totalSubmissions > 0) && (
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-4 text-[11px] text-white/25">
              {socialProof.state_this_week > 0 && (
                <span>
                  <span className="text-white/40 font-semibold">{socialProof.state_this_week}</span> {stateAbbr} farmers this week
                </span>
              )}
              {socialProof.state_counties_this_week > 0 && (
                <span>
                  <span className="text-white/40 font-semibold">{socialProof.state_counties_this_week}</span> counties active
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/15">
              Updated every 30s
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
