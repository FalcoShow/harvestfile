// =============================================================================
// HarvestFile — HeroSection (Client Component)
// Build 3 Phase A: The Credit Karma Moment
//
// The #1 most important component on the entire platform.
// A farmer lands → types their county → sees data. No friction. No buttons.
// The search IS the product. Everything else exists to convince farmers
// who didn't type immediately.
//
// Architecture:
//   - County search bar is the PRIMARY CTA (replaces "Calculate My Payment")
//   - Headline is action-oriented: drives toward the search
//   - Trust signals sit directly beneath search to answer "can I trust this?"
//   - Stats row provides data credibility
//   - Secondary CTAs (Calculator, Election Map) are below-fold safety nets
//   - All search logic ported from CountySearchSection.tsx
// =============================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatedCounter } from './shared/AnimatedCounter';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface CountyItem {
  n: string;   // display_name (e.g., "Darke County")
  s: string;   // county slug (e.g., "darke-county")
  sn: string;  // state name (e.g., "Ohio")
  ss: string;  // state slug (e.g., "ohio")
  sa: string;  // state abbreviation (e.g., "OH")
}

// ─── Popular Counties (shown on focus, no query) ────────────────────────────────
const POPULAR_COUNTIES = [
  { label: 'Darke County, OH',      state: 'ohio',       county: 'darke-county' },
  { label: 'Champaign County, IL',  state: 'illinois',   county: 'champaign-county' },
  { label: 'Story County, IA',      state: 'iowa',       county: 'story-county' },
  { label: 'Lancaster County, NE',  state: 'nebraska',   county: 'lancaster-county' },
  { label: 'Sedgwick County, KS',   state: 'kansas',     county: 'sedgwick-county' },
  { label: 'Whitman County, WA',    state: 'washington',  county: 'whitman-county' },
];

// ─── Component ──────────────────────────────────────────────────────────────────
export function HeroSection() {
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState('');
  const [counties, setCounties] = useState<CountyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch all counties on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/counties/list');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) {
          setCounties(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Filter results ────────────────────────────────────────────────────────
  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    const matches = counties.filter((c) => {
      const full = `${c.n} ${c.sa} ${c.sn}`.toLowerCase();
      return full.includes(q);
    });
    return matches.slice(0, 8);
  }, [query, counties]);

  // ── Click outside to close ────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Navigate to county page ───────────────────────────────────────────────
  const navigateTo = useCallback((stateSlug: string, countySlug: string) => {
    setFocused(false);
    setQuery('');
    router.push(`/${stateSlug}/${countySlug}/arc-plc`);
  }, [router]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = results.length > 0 ? results : (query.length < 2 ? POPULAR_COUNTIES : []);
    const count = items.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + count) % count);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      if (results.length > 0) {
        const item = results[activeIndex];
        if (item) navigateTo(item.ss, item.s);
      } else if (query.length < 2) {
        const pop = POPULAR_COUNTIES[activeIndex];
        if (pop) navigateTo(pop.state, pop.county);
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  }, [results, activeIndex, query, navigateTo]);

  // Reset active index on query change
  useEffect(() => { setActiveIndex(-1); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-search-item]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const showDropdown = focused && (results.length > 0 || (query.length < 2));
  const showPopular = focused && query.length < 2;

  return (
    <section className="relative min-h-[94dvh] flex flex-col items-center justify-center overflow-hidden bg-harvest-forest-950 pt-24 pb-16">
      {/* ── Gradient Mesh Background ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 60% 50% at 20% 30%, hsla(152, 68%, 28%, 0.25) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 60% at 75% 60%, hsla(38, 85%, 55%, 0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse 80% 40% at 50% 100%, hsla(152, 50%, 20%, 0.2) 0%, transparent 50%)',
            'radial-gradient(ellipse 30% 30% at 90% 10%, hsla(38, 80%, 50%, 0.06) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* ── Noise Texture ────────────────────────────────────────────────── */}
      <div className="hf-noise-subtle" />

      {/* ── Subtle Top Border Glow ───────────────────────────────────────── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)',
        }}
      />

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[900px] px-6 text-center">

        {/* Badge */}
        <div
          className="flex justify-center mb-8"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out both' }}
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[12px] font-semibold text-white/50 tracking-wide">
              Updated for 2025 OBBBA Farm Bill · Live USDA Data
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="text-[clamp(34px,5.5vw,66px)] font-extrabold text-white tracking-[-0.04em] leading-[1.05] mb-5"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.1s both' }}
        >
          Know{' '}
          <span
            className="font-serif italic font-normal"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #E2C366, #C9A84C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            exactly
          </span>
          {' '}what your
          <br className="hidden sm:block" />
          {' '}farm is owed
        </h1>

        {/* Subheadline — shorter, drives toward search */}
        <p
          className="text-[clamp(15px,1.8vw,19px)] text-white/50 leading-relaxed max-w-[560px] mx-auto mb-10"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.2s both' }}
        >
          Free ARC-CO vs PLC payment estimates for every farming county in America. Powered by real USDA data.
        </p>

        {/* ═══════════════════════════════════════════════════════════════════
            THE COUNTY SEARCH — Primary CTA
            This IS the conversion action. Not a button. Not a signup form.
            The farmer types, sees their county, clicks, gets data.
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="max-w-[560px] mx-auto mb-8"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.3s both' }}
        >
          <div ref={containerRef} className="relative">
            {/* Search input container */}
            <div
              className={`
                relative rounded-2xl border transition-all duration-300
                ${focused
                  ? 'border-harvest-gold/40 shadow-[0_0_50px_-10px_rgba(201,168,76,0.25)]'
                  : 'border-white/[0.12] hover:border-white/[0.2] shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
                }
                bg-white/[0.06] backdrop-blur-md
              `}
            >
              {/* Search icon */}
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-colors duration-200 ${focused ? 'text-harvest-gold' : 'text-white/35'}`}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder={loading ? 'Loading counties...' : 'Enter your county or state...'}
                disabled={loading}
                className="
                  w-full bg-transparent text-white text-[16px] font-medium
                  placeholder:text-white/30 pl-14 pr-5 py-[18px]
                  outline-none disabled:opacity-50 disabled:cursor-wait
                "
                autoComplete="off"
                spellCheck={false}
              />

              {/* Clear button */}
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* ── Dropdown ──────────────────────────────────────────────────── */}
            {showDropdown && (
              <div
                ref={listRef}
                className="
                  absolute top-full left-0 right-0 mt-2 z-50
                  rounded-xl border border-white/[0.1]
                  bg-[#0f1f18]/95 backdrop-blur-xl
                  shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]
                  max-h-[340px] overflow-y-auto
                  [animation:hf-fade-up_0.2s_ease-out_both]
                "
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                }}
              >
                {/* Popular counties (no query) */}
                {showPopular && (
                  <>
                    <div className="px-4 pt-3 pb-2">
                      <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.14em]">
                        Popular Counties
                      </span>
                    </div>
                    {POPULAR_COUNTIES.map((pop, i) => (
                      <button
                        key={pop.county}
                        data-search-item
                        onClick={() => navigateTo(pop.state, pop.county)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${activeIndex === i ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}
                        `}
                      >
                        <div className="w-8 h-8 rounded-lg bg-harvest-gold/10 flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-white/90 truncate">
                            {pop.label}
                          </div>
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" className="ml-auto text-white/15 flex-shrink-0"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </>
                )}

                {/* Search results */}
                {results.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-2">
                      <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.14em]">
                        {results.length} {results.length === 1 ? 'county' : 'counties'} found
                      </span>
                    </div>
                    {results.map((item, i) => (
                      <button
                        key={`${item.ss}-${item.s}`}
                        data-search-item
                        onClick={() => navigateTo(item.ss, item.s)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${activeIndex === i ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}
                        `}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-extrabold text-emerald-400">
                            {item.sa}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-white/90 truncate">
                            {highlightMatch(item.n, query)}
                            <span className="text-white/30">, {item.sa}</span>
                          </div>
                          <div className="text-[11px] text-white/25 truncate">
                            {item.sn}
                          </div>
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" className="ml-auto text-white/15 flex-shrink-0"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </>
                )}

                {/* No results */}
                {query.length >= 2 && results.length === 0 && !loading && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[13px] text-white/30">
                      No counties found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-[11px] text-white/15 mt-1">
                      Try a different county name or state abbreviation
                    </p>
                  </div>
                )}

                {/* Keyboard hint */}
                <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-4">
                  <span className="text-[10px] text-white/15 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono">↑↓</kbd>
                    navigate
                  </span>
                  <span className="text-[10px] text-white/15 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono">↵</kbd>
                    select
                  </span>
                  <span className="text-[10px] text-white/15 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono">esc</kbd>
                    close
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Hint text below search */}
          <p
            className="text-[12px] text-white/25 mt-3 text-center"
            style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.35s both' }}
          >
            No signup required · Free forever · All 3,000+ farming counties
          </p>
        </div>

        {/* ── Secondary CTAs ─────────────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.4s both' }}
        >
          {/* Primary fallback — for farmers who prefer a button */}
          <Link
            href="/check"
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl
              text-[15px] font-bold text-harvest-forest-950 overflow-hidden
              transition-all duration-300 hover:-translate-y-0.5
              hover:shadow-[0_12px_40px_rgba(201,168,76,0.3)]
              active:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #9E7E30, #C9A84C, #E2C366, #C9A84C, #9E7E30)',
              backgroundSize: '200% auto',
            }}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)',
                backgroundSize: '200% auto',
                animation: 'hf-shimmer 2s ease-in-out infinite',
              }}
            />
            <span className="relative">Calculate My Payment</span>
            <svg className="relative w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Ghost CTA — Election Map */}
          <Link
            href="/elections"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl
              text-[14px] font-semibold text-white/55 border border-white/10
              hover:text-white/90 hover:border-white/20 hover:bg-white/[0.04]
              transition-all duration-300"
          >
            Explore Election Map
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* ── Trust Strip ────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap mb-12"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.45s both' }}
        >
          {[
            'All 50 states',
            '16 covered crops',
            'OBBBA updated',
            'Real USDA data',
          ].map((text) => (
            <span key={text} className="flex items-center gap-1.5 text-[12px] text-white/30 font-medium">
              <svg className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {text}
            </span>
          ))}
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-[660px] mx-auto"
          style={{ animation: 'hf-hero-fade-in 0.8s ease-out 0.5s both' }}
        >
          {[
            { value: 50, suffix: '', label: 'States Covered' },
            { value: 3000, suffix: '+', label: 'Counties' },
            { value: 16, suffix: '', label: 'Crop Programs' },
            { value: 2025, suffix: '', label: 'OBBBA Updated' },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-[clamp(22px,3vw,34px)] font-extrabold text-white tracking-[-0.03em]">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={1400 + i * 200}
                  formatter={(n: number) =>
                    stat.label === 'OBBBA Updated'
                      ? n.toString()
                      : n.toLocaleString()
                  }
                />
              </div>
              <div className="text-[11px] font-semibold text-white/30 tracking-wide uppercase mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subtle gradient that content continues below ──────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-harvest-forest-950/50 to-transparent" />
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-harvest-gold-bright font-bold">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
