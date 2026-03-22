// =============================================================================
// HarvestFile — Header County Search (Client Component)
// Phase 25 Build 2: Cmd+K command palette for finding any county
//
// Premium command palette pattern (Linear, Vercel, Raycast style).
// Portal-based modal with fuzzy search across 3,000+ counties.
// Keyboard navigable (↑/↓/Enter/Esc), recent searches, grouped by state.
// Fetches county list on first open, caches client-side.
// =============================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface CountyItem {
  n: string;   // display_name
  s: string;   // county slug
  sn: string;  // state name
  ss: string;  // state slug
  sa: string;  // state abbreviation
}

interface GroupedResult {
  state: string;
  stateSlug: string;
  counties: CountyItem[];
}

// ── Recent searches (localStorage) ──────────────────────────────────────
const RECENT_KEY = 'hf-recent-counties';
const MAX_RECENT = 6;

function getRecentSearches(): CountyItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(county: CountyItem) {
  try {
    const existing = getRecentSearches().filter(
      (c) => !(c.s === county.s && c.ss === county.ss)
    );
    const updated = [county, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — silent fail
  }
}

// ── Singleton county cache ──────────────────────────────────────────────
let countyCache: CountyItem[] | null = null;
let fetchPromise: Promise<CountyItem[]> | null = null;

async function loadCounties(): Promise<CountyItem[]> {
  if (countyCache) return countyCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/counties/list')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch counties');
      return res.json();
    })
    .then((data: CountyItem[]) => {
      countyCache = data;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return [];
    });

  return fetchPromise;
}

// ── Fuzzy match scoring ─────────────────────────────────────────────────
function scoreMatch(item: CountyItem, query: string): number {
  const q = query.toLowerCase();
  const name = item.n.toLowerCase();
  const stateName = item.sn.toLowerCase();
  const stateAbbr = item.sa.toLowerCase();

  // Exact starts-with on county name = highest score
  if (name.startsWith(q)) return 100;
  // County name contains query
  if (name.includes(q)) return 80;
  // State abbreviation match (e.g., "OH", "IL")
  if (stateAbbr === q) return 70;
  // State name starts with query
  if (stateName.startsWith(q)) return 60;
  // Combined "county, state" search (e.g., "darke oh" or "darke, ohio")
  const combined = `${name} ${stateAbbr} ${stateName}`.toLowerCase();
  if (combined.includes(q)) return 50;
  // Word boundary match
  const words = name.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 40;
  }
  return 0;
}

// ── Group results by state ──────────────────────────────────────────────
function groupByState(items: CountyItem[]): GroupedResult[] {
  const map = new Map<string, CountyItem[]>();
  for (const item of items) {
    const key = item.sa;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .map(([, counties]) => ({
      state: counties[0].sn,
      stateSlug: counties[0].ss,
      counties,
    }))
    .sort((a, b) => a.state.localeCompare(b.state));
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════

export function HeaderCountySearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [counties, setCounties] = useState<CountyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<CountyItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Portal mount check ────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Cmd+K global shortcut ─────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // ── Load counties on first open ───────────────────────────────────────
  useEffect(() => {
    if (open && counties.length === 0) {
      setLoading(true);
      loadCounties().then((data) => {
        setCounties(data);
        setLoading(false);
      });
    }
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery('');
      setActiveIndex(0);
      // Focus input after portal renders
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // ── Lock body scroll ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // ── Filter + score results ────────────────────────────────────────────
  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const scored = counties
      .map((c) => ({ county: c, score: scoreMatch(c, query.trim()) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.county);
    return scored;
  }, [query, counties]);

  const grouped = useMemo(() => groupByState(results), [results]);

  // ── Flat list of all visible items for keyboard nav ───────────────────
  const flatItems = useMemo(() => {
    if (query.length < 2 && recentSearches.length > 0) {
      return recentSearches;
    }
    return results;
  }, [query, results, recentSearches]);

  // ── Reset active index on results change ──────────────────────────────
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ── Scroll active item into view ──────────────────────────────────────
  useEffect(() => {
    const items = listRef.current?.querySelectorAll('[data-county-item]');
    if (items && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // ── Navigate to county ────────────────────────────────────────────────
  const navigateTo = useCallback(
    (county: CountyItem) => {
      addRecentSearch(county);
      setOpen(false);
      router.push(`/${county.ss}/${county.s}/arc-plc`);
    },
    [router]
  );

  // ── Keyboard handler ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatItems[activeIndex]) {
        e.preventDefault();
        navigateTo(flatItems[activeIndex]);
      }
    },
    [flatItems, activeIndex, navigateTo]
  );

  // ── Clear single recent ───────────────────────────────────────────────
  const clearRecent = useCallback((county: CountyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = getRecentSearches().filter(
      (c) => !(c.s === county.s && c.ss === county.ss)
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecentSearches(updated);
  }, []);

  // ── Show recent vs results ────────────────────────────────────────────
  const showRecent = query.length < 2 && recentSearches.length > 0;
  const showResults = query.length >= 2 && results.length > 0;
  const showEmpty = query.length >= 2 && results.length === 0 && !loading;

  // ════════════════════════════════════════════════════════════════════════
  // RENDER: Search trigger button (sits in the header nav)
  // ════════════════════════════════════════════════════════════════════════

  const overlay = open ? (
    <div
      className="fixed inset-0 z-[1200] flex items-start justify-center pt-[15vh] sm:pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[580px] mx-4 rounded-2xl border border-white/[0.1] bg-[#0C1F17]/98 shadow-[0_25px_80px_-12px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'hf-search-in 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.08]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-harvest-gold shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any county..."
            className="flex-1 bg-transparent text-white text-[15px] font-medium placeholder:text-white/25 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-mono text-white/25 border border-white/[0.06]">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
        >
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="w-5 h-5 border-2 border-harvest-gold/30 border-t-harvest-gold rounded-full animate-spin" />
              <span className="text-sm text-white/30">Loading counties...</span>
            </div>
          )}

          {/* Recent searches */}
          {showRecent && !loading && (
            <>
              <div className="px-4 pt-3 pb-1.5">
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.14em]">
                  Recent Searches
                </span>
              </div>
              {recentSearches.map((county, i) => (
                <button
                  key={`${county.ss}-${county.s}`}
                  data-county-item
                  onClick={() => navigateTo(county)}
                  className={`
                    w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors
                    ${activeIndex === i ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="text-[14px] font-medium text-white/80 truncate">
                      {county.n}
                    </span>
                    <span className="text-[12px] text-white/25 shrink-0">{county.sa}</span>
                  </div>
                  <button
                    onClick={(e) => clearRecent(county, e)}
                    className="p-1 rounded text-white/15 hover:text-white/40 transition-colors shrink-0"
                    aria-label="Remove from recent"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </button>
              ))}
            </>
          )}

          {/* Search results grouped by state */}
          {showResults && !loading && (
            <>
              {grouped.map((group) => (
                <div key={group.stateSlug}>
                  <div className="px-4 pt-3 pb-1.5 sticky top-0 bg-[#0C1F17]/98 backdrop-blur-sm z-10">
                    <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.14em]">
                      {group.state}
                    </span>
                  </div>
                  {group.counties.map((county) => {
                    const flatIdx = flatItems.indexOf(county);
                    return (
                      <button
                        key={`${county.ss}-${county.s}`}
                        data-county-item
                        onClick={() => navigateTo(county)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                          ${flatIdx === activeIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}
                        `}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="text-[14px] font-medium text-white/80 truncate">
                          {county.n}
                        </span>
                        <span className="text-[12px] text-white/25 shrink-0">{county.sa}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {/* Empty prompt (no query yet, no recent) */}
          {!showRecent && !showResults && !showEmpty && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/15">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-[13px] text-white/25">
                Type a county name or state abbreviation
              </p>
              <p className="text-[11px] text-white/15">
                3,000+ farming counties with real USDA data
              </p>
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/15">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-[13px] text-white/30">
                No counties found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-white/15">
                Try a different county name or state
              </p>
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/[0.06]">
          <span className="text-[10px] text-white/15 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono border border-white/[0.04]">↑↓</kbd>
            navigate
          </span>
          <span className="text-[10px] text-white/15 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono border border-white/[0.04]">↵</kbd>
            open
          </span>
          <span className="text-[10px] text-white/15 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono border border-white/[0.04]">esc</kbd>
            close
          </span>
          <span className="ml-auto text-[10px] text-white/10">
            {counties.length > 0 ? `${counties.length.toLocaleString()} counties` : ''}
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Search trigger — icon button in the header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-300 hover:bg-white/[0.06] group"
        aria-label="Search counties"
        style={{ color: 'var(--nav-text-muted)' }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors group-hover:text-harvest-gold"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden lg:inline text-[13px] font-medium">Find County</span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono border border-white/[0.04]"
          style={{ color: 'var(--nav-text-muted)' }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Portal: renders search modal on document.body */}
      {mounted && overlay && createPortal(overlay, document.body)}

      {/* Animation keyframe (injected once) */}
      {mounted && createPortal(
        <style>{`
          @keyframes hf-search-in {
            from { opacity: 0; transform: scale(0.98) translateY(-8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>,
        document.head
      )}
    </>
  );
}
