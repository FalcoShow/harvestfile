"use client";

// =============================================================================
// HarvestFile — DarkSelect (Reusable Custom Dropdown)
// Phase 10 Build 2: Premium dark-themed select component
//
// HYBRID ARCHITECTURE:
//   Desktop (pointer: fine) → Custom dropdown with search, keyboard nav, dark theme
//   Mobile (pointer: coarse) → Native <select> with styled trigger overlay
//
// Features:
//   - Dark forest green theme matching HarvestFile design system
//   - Searchable/filterable for long lists (80+ county options)
//   - Full keyboard navigation (arrows, enter, escape, type-ahead)
//   - Click-outside dismissal via mousedown
//   - Smooth open/close animation (opacity + translateY + scale)
//   - Portal rendering to escape backdrop-filter stacking contexts
//   - Gold accent on selected item
//   - ARIA combobox pattern for screen readers
// =============================================================================

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

interface DarkSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string, option: SelectOption | undefined) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

// ─── Device Detection ───────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    // SSR safety
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// ─── Chevron Icon ───────────────────────────────────────────────────────────

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-transform duration-200"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "rgba(255,255,255,0.3)" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Search Icon ────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Check Icon ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function DarkSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  searchable = false,
  loading = false,
  disabled = false,
}: DarkSelectProps) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <NativeMobileSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        loading={loading}
        disabled={disabled}
      />
    );
  }

  return (
    <CustomDesktopSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      label={label}
      searchable={searchable}
      loading={loading}
      disabled={disabled}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MOBILE: Native <select> with styled trigger overlay
// ═════════════════════════════════════════════════════════════════════════════

function NativeMobileSelect({
  options, value, onChange, placeholder, label, loading, disabled,
}: Omit<DarkSelectProps, "searchable">) {
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <div>
      {label && (
        <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Visible styled trigger */}
        <div
          className="w-full p-4 rounded-[14px] text-base font-medium border outline-none flex items-center justify-between gap-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
            color: value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          }}
        >
          <span className="truncate">{loading ? "Loading..." : selectedLabel || placeholder}</span>
          <ChevronDown open={false} />
        </div>

        {/* Invisible native select on top */}
        <select
          value={value}
          onChange={(e) => {
            const opt = options.find(o => o.value === e.target.value);
            onChange(e.target.value, opt);
          }}
          disabled={disabled || loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ fontSize: "16px" }} // Prevents iOS zoom
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DESKTOP: Full custom dropdown with search + keyboard
// ═════════════════════════════════════════════════════════════════════════════

function CustomDesktopSelect({
  options, value, onChange, placeholder, label, searchable, loading, disabled,
}: DarkSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [search, setSearch] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedOption = options.find(o => o.value === value);

  // Portal readiness (wait for document.body)
  useEffect(() => { setPortalReady(true); }, []);

  // Filtered options
  const filtered = useMemo(() => {
    if (!searchable || !search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search, searchable]);

  // Reset active index when filtered list changes
  useEffect(() => { setActiveIndex(filtered.length > 0 ? 0 : -1); }, [filtered]);

  // ── Open / Close ────────────────────────────────────────────────────────

  const open = useCallback(() => {
    if (disabled || loading) return;
    // Calculate position from trigger
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(true);
    setSearch("");
    // Set active to current value
    const idx = filtered.findIndex(o => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    // Focus search input after open
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [disabled, loading, filtered, value]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  }, []);

  const select = useCallback((opt: SelectOption) => {
    onChange(opt.value, opt);
    close();
  }, [onChange, close]);

  // ── Click outside ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [isOpen, close]);

  // ── Reposition on scroll/resize ─────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  // ── Keyboard ────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => {
          const next = Math.min(prev + 1, filtered.length - 1);
          optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(prev => {
          const next = Math.max(prev - 1, 0);
          optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          select(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        optionRefs.current[0]?.scrollIntoView({ block: "nearest" });
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
        optionRefs.current[filtered.length - 1]?.scrollIntoView({ block: "nearest" });
        break;
      case "Tab":
        close();
        break;
    }
  }, [isOpen, open, close, select, filtered, activeIndex]);

  // ── Scroll selected into view on open ───────────────────────────────────

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      requestAnimationFrame(() => {
        optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
      });
    }
  }, [isOpen, activeIndex]);

  // ── Render ──────────────────────────────────────────────────────────────

  const listboxId = `hf-select-${label?.replace(/\s+/g, "-").toLowerCase() || "list"}`;

  const panel = (
    <div
      ref={panelRef}
      role="listbox"
      id={listboxId}
      onKeyDown={handleKeyDown}
      className="transition-all duration-150 ease-out"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 99999,
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateY(0) scale(1)" : "translateY(-4px) scale(0.98)",
        pointerEvents: isOpen ? "auto" : "none",
        // Theme
        background: "#14342A",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
    >
      {/* Search input */}
      {searchable && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <SearchIcon />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="flex-1 bg-transparent text-[14px] text-white/80 outline-none placeholder:text-white/20"
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); searchRef.current?.focus(); }}
              className="text-white/20 hover:text-white/40 transition-colors p-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>
      )}

      {/* Options list */}
      <div
        style={{ maxHeight: 280, overflowY: "auto", overscrollBehavior: "contain", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-white/25">
            {search ? "No results found" : "No options available"}
          </div>
        ) : (
          filtered.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;

            return (
              <div
                key={opt.value}
                ref={(el) => { optionRefs.current[i] = el; }}
                role="option"
                aria-selected={isSelected}
                data-active={isActive}
                onClick={() => select(opt)}
                onMouseEnter={() => setActiveIndex(i)}
                className="flex items-center justify-between gap-2 cursor-pointer transition-colors duration-75"
                style={{
                  padding: "10px 14px",
                  minHeight: 42,
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  color: isSelected ? "#C9A84C" : "rgba(255,255,255,0.8)",
                  fontSize: 14,
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <CheckIcon />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div>
      {label && (
        <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled || loading}
        onClick={() => isOpen ? close() : open()}
        onKeyDown={handleKeyDown}
        className="w-full p-4 rounded-[14px] text-base font-medium text-left border outline-none cursor-pointer flex items-center justify-between gap-2 transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: isOpen ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)",
          color: value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          boxShadow: isOpen ? "0 0 0 3px rgba(201,168,76,0.1)" : "none",
        }}
      >
        <span className="truncate">
          {loading ? "Loading..." : selectedOption?.label || placeholder}
        </span>
        <ChevronDown open={isOpen} />
      </button>

      {/* Portal-rendered dropdown panel */}
      {portalReady && createPortal(panel, document.body)}
    </div>
  );
}
