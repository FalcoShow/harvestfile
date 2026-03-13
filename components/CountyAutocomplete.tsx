// =============================================================================
// HarvestFile - County Autocomplete (Phase 3C)
// Smooth typeahead search powered by /api/counties endpoint
// =============================================================================

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const C = {
  dark: '#0C1F17', forest: '#1B4332', sage: '#40624D',
  gold: '#C9A84C', emerald: '#059669', emeraldLight: '#34D399',
  text: '#111827', textSoft: '#6B7280', textMuted: '#9CA3AF',
};

interface CountyAutocompleteProps {
  state: string;
  value: string;
  onChange: (county: string) => void;
  placeholder?: string;
  darkMode?: boolean;
  className?: string;
}

export default function CountyAutocomplete({
  state,
  value,
  onChange,
  placeholder = 'Start typing county name...',
  darkMode = true,
  className = '',
}: CountyAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [counties, setCounties] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch counties when state changes
  useEffect(() => {
    if (!state || state.length !== 2) {
      setCounties([]);
      return;
    }

    setLoading(true);
    fetch(`/api/counties?state=${state.toUpperCase()}`)
      .then(res => res.json())
      .then(data => {
        setCounties(data.counties || []);
        setLoading(false);
      })
      .catch(() => {
        setCounties([]);
        setLoading(false);
      });
  }, [state]);

  // Filter counties based on input
  const filterCounties = useCallback((search: string) => {
    if (!search.trim()) {
      setFiltered(counties.slice(0, 8));
      return;
    }
    const lower = search.toLowerCase();
    const matches = counties.filter(c => c.toLowerCase().includes(lower));
    // Sort: starts-with first, then contains
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.localeCompare(b);
    });
    setFiltered(matches.slice(0, 8));
  }, [counties]);

  // Debounced filter
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => filterCounties(query), 100);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filterCounties]);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const selectCounty = (county: string) => {
    setQuery(county);
    onChange(county);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          selectCounty(filtered[highlightIndex]);
        } else if (filtered.length === 1) {
          selectCounty(filtered[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const isDark = darkMode;

  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Label */}
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6,
        color: isDark ? 'rgba(255,255,255,0.5)' : C.textSoft,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        County
      </label>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
            // Don't call onChange until selection
          }}
          onFocus={() => {
            setIsOpen(true);
            filterCounties(query);
          }}
          onBlur={() => {
            // Delay to allow click on dropdown item
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={!state ? 'Select state first' : loading ? 'Loading counties...' : placeholder}
          disabled={!state || state.length !== 2}
          style={{
            width: '100%', padding: '12px 40px 12px 14px',
            fontSize: 14, fontWeight: 500, borderRadius: 12,
            border: `1.5px solid ${isOpen ? (isDark ? 'rgba(5,150,105,0.4)' : C.emerald) : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            color: isDark ? '#fff' : C.text,
            outline: 'none', transition: 'all 0.2s',
            boxSizing: 'border-box',
          }}
          autoComplete="off"
        />

        {/* Search icon / loading spinner */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center',
        }}>
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth="3" />
              <path d="M12 2a10 10 0 019.5 6.8" stroke={C.emerald} strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'rgba(255,255,255,0.2)' : C.textMuted} strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div ref={listRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 4, maxHeight: 240, overflowY: 'auto',
          background: isDark ? C.dark : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          padding: 4,
        }}>
          {filtered.map((county, i) => {
            const isHighlighted = i === highlightIndex;
            const isExact = county.toLowerCase() === query.toLowerCase();

            return (
              <div
                key={county}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCounty(county);
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: isExact ? 700 : 500,
                  transition: 'all 0.1s',
                  background: isHighlighted
                    ? (isDark ? 'rgba(5,150,105,0.1)' : 'rgba(5,150,105,0.06)')
                    : 'transparent',
                  color: isHighlighted
                    ? (isDark ? C.emeraldLight : C.emerald)
                    : (isDark ? 'rgba(255,255,255,0.7)' : C.text),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={isHighlighted ? C.emerald : (isDark ? 'rgba(255,255,255,0.2)' : C.textMuted)}
                    strokeWidth="2" strokeLinecap="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{highlightMatch(county, query)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results */}
      {isOpen && query.length > 0 && filtered.length === 0 && !loading && counties.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 4, padding: '16px 20px',
          background: isDark ? C.dark : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.35)' : C.textMuted }}>
            No counties matching &ldquo;{query}&rdquo; in {state}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Highlight matching text ─────────────────────────────────────────────────
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: '#059669' }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}
