// =============================================================================
// HarvestFile — County Search Section
// Phase 6A: "Find Your County" — the bridge to 2,000+ county SEO pages
//
// Premium autocomplete search widget for the homepage.
// Fetches all counties on mount, filters client-side for instant results.
// Keyboard navigable (↑/↓/Enter/Esc), mobile optimized.
// =============================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface CountyItem {
  n: string;   // display_name (e.g., "Darke County")
  s: string;   // county slug (e.g., "darke-county")
  sn: string;  // state name (e.g., "Ohio")
  ss: string;  // state slug (e.g., "ohio")
  sa: string;  // state abbreviation (e.g., "OH")
}

// ─── Popular Counties (shown when input is empty/focused) ────────────────────
const POPULAR_COUNTIES = [
  { label: 'Darke County, OH', state: 'ohio', county: 'darke-county' },
  { label: 'Champaign County, IL', state: 'illinois', county: 'champaign-county' },
  { label: 'Story County, IA', state: 'iowa', county: 'story-county' },
  { label: 'Lancaster County, NE', state: 'nebraska', county: 'lancaster-county' },
  { label: 'Sedgwick County, KS', state: 'kansas', county: 'sedgwick-county' },
  { label: 'Whitman County, WA', state: 'washington', county: 'whitman-county' },
];

// ─── Stat figures for the section ────────────────────────────────────────────
const STATS = [
  { value: '2,000+', label: 'Counties' },
  { value: '8', label: 'Commodities' },
  { value: '10yr', label: 'History' },
  { value: 'Free', label: 'Always' },
];

export function CountySearchSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [counties, setCounties] = useState<CountyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch all counties on mount ───────────────────────────────────────
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

  // ── Filter results ────────────────────────────────────────────────────
  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    const matches = counties.filter((c) => {
      const full = `${c.n} ${c.sa} ${c.sn}`.toLowerCase();
      return full.includes(q);
    });
    return matches.slice(0, 8);
  }, [query, counties]);

  // ── Click outside to close ────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Navigate to county page ───────────────────────────────────────────
  const navigateTo = useCallback((stateSlug: string, countySlug: string) => {
    setFocused(false);
    setQuery('');
    router.push(`/${stateSlug}/${countySlug}/arc-plc`);
  }, [router]);

  // ── Keyboard navigation ───────────────────────────────────────────────
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

  // ── Scroll active item into view ──────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-search-item]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const showDropdown = focused && (results.length > 0 || (query.length < 2));
  const showPopular = focused && query.length < 2;

  return (
    <section className="relative overflow-hidden bg-harvest-forest-950 py-20 sm:py-28">
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-600/[0.06] blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-harvest-gold/[0.04] blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-[720px] px-6">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
              Live USDA Data · Updated Daily
            </span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-center text-[clamp(26px,4vw,42px)] font-extrabold text-white tracking-[-0.03em] leading-[1.1] mb-4">
          Find your county&apos;s{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(135deg, #C9A84C, #E2C366, #C9A84C)',
            }}
          >
            ARC/PLC data
          </span>
        </h2>

        <p className="text-center text-[15px] text-white/40 leading-relaxed max-w-[500px] mx-auto mb-10">
          Real USDA county yield data, benchmark revenues, and payment
          estimates for every farming county in America.
        </p>

        {/* ── Search Input ────────────────────────────────────────────── */}
        <div ref={containerRef} className="relative max-w-[520px] mx-auto mb-12">
          <div
            className={`
              relative rounded-2xl border transition-all duration-300
              ${focused
                ? 'border-harvest-gold/40 shadow-[0_0_40px_-10px_rgba(201,168,76,0.2)]'
                : 'border-white/[0.1] hover:border-white/[0.18]'
              }
              bg-white/[0.04] backdrop-blur-md
            `}
          >
            {/* Search icon */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-colors duration-200 ${focused ? 'text-harvest-gold' : 'text-white/30'}`}
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
              placeholder={loading ? 'Loading counties...' : 'Search by county name or state...'}
              disabled={loading}
              className="
                w-full bg-transparent text-white text-[15px] font-medium
                placeholder:text-white/25 pl-12 pr-4 py-4
                outline-none disabled:opacity-50 disabled:cursor-wait
              "
              autoComplete="off"
              spellCheck={false}
            />

            {/* Clear button */}
            {query.length > 0 && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Dropdown ────────────────────────────────────────────── */}
          {showDropdown && (
            <div
              ref={listRef}
              className="
                absolute top-full left-0 right-0 mt-2 z-50
                rounded-xl border border-white/[0.1]
                bg-[#0f1f18]/95 backdrop-blur-xl
                shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
                max-h-[340px] overflow-y-auto
                [animation:hf-fade-up_0.2s_ease-out_both]
              "
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.1) transparent',
              }}
            >
              {/* Popular counties (shown when no query) */}
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
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="ml-auto text-white/15 flex-shrink-0"
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
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="ml-auto text-white/15 flex-shrink-0"
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

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 max-w-[440px] mx-auto mb-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.03em]">
                {stat.value}
              </div>
              <div className="text-[10px] font-bold text-white/25 uppercase tracking-[0.1em] mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Browse by State CTA ─────────────────────────────────────── */}
        <div className="text-center">
          <p className="text-[13px] text-white/25 mb-3">
            Or browse all counties by state
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TOP_FARMING_STATES.map((s) => (
              <a
                key={s.slug}
                href={`/${s.slug}/arc-plc`}
                className="
                  px-3 py-1.5 rounded-lg text-[12px] font-semibold
                  bg-white/[0.04] border border-white/[0.06]
                  text-white/40 hover:text-white/80 hover:bg-white/[0.08]
                  hover:border-white/[0.12] transition-all duration-200
                "
              >
                {s.abbr}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const TOP_FARMING_STATES = [
  { slug: 'iowa', abbr: 'IA' },
  { slug: 'illinois', abbr: 'IL' },
  { slug: 'indiana', abbr: 'IN' },
  { slug: 'ohio', abbr: 'OH' },
  { slug: 'nebraska', abbr: 'NE' },
  { slug: 'kansas', abbr: 'KS' },
  { slug: 'minnesota', abbr: 'MN' },
  { slug: 'south-dakota', abbr: 'SD' },
  { slug: 'north-dakota', abbr: 'ND' },
  { slug: 'missouri', abbr: 'MO' },
  { slug: 'texas', abbr: 'TX' },
  { slug: 'wisconsin', abbr: 'WI' },
  { slug: 'michigan', abbr: 'MI' },
  { slug: 'arkansas', abbr: 'AR' },
  { slug: 'georgia', abbr: 'GA' },
  { slug: 'kentucky', abbr: 'KY' },
  { slug: 'north-carolina', abbr: 'NC' },
  { slug: 'california', abbr: 'CA' },
  { slug: 'washington', abbr: 'WA' },
  { slug: 'montana', abbr: 'MT' },
];
