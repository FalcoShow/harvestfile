"use client";

// =============================================================================
// HarvestFile — NumberInput (Shared Comma-Formatted Number Input)
// Build 9 Deploy 1: Universal number input for ALL pages
//
// Auto-formats numbers with commas as you type (1000 → 1,000).
// Returns the raw numeric value (no commas) via onChange.
// Theme-aware: works on both dark calculator and light marketing pages.
//
// Features:
//   - Auto comma formatting on every keystroke
//   - Optional prefix ($) and suffix (/acre, bu, etc.)
//   - Quick-pick preset buttons (e.g. 100ac, 250ac, 500ac, 1000ac)
//   - Decimal support (up to 2 decimal places)
//   - Prevents non-numeric input
//   - "e.g." hint text support
//   - Theme variants: "dark" and "light"
//   - Error state with message
//
// Usage:
//   import { NumberInput } from "@/components/shared/NumberInput";
//
//   <NumberInput
//     value={acres}
//     onChange={setAcres}
//     label="Total Acres"
//     placeholder="e.g. 1,000"
//     suffix="acres"
//     presets={[
//       { label: "100 ac", value: 100 },
//       { label: "250 ac", value: 250 },
//       { label: "500 ac", value: 500 },
//       { label: "1,000 ac", value: 1000 },
//     ]}
//     variant="dark"
//   />
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  value: number;
}

interface NumberInputProps {
  value: number | string;
  onChange: (value: number | string) => void;
  label?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  presets?: Preset[];
  min?: number;
  max?: number;
  decimals?: number;
  variant?: "dark" | "light";
  error?: string;
  disabled?: boolean;
  /** Help text shown below the input */
  hint?: string;
}

// ─── Theme Colors ─────────────────────────────────────────────────────────────

const themes = {
  dark: {
    inputBg: "rgba(255,255,255,0.04)",
    inputBorder: "rgba(255,255,255,0.08)",
    inputBorderFocus: "rgba(201,168,76,0.4)",
    inputText: "rgba(255,255,255,0.9)",
    inputPlaceholder: "rgba(255,255,255,0.25)",
    focusShadow: "0 0 0 3px rgba(201,168,76,0.1)",
    labelColor: "rgba(255,255,255,0.4)",
    affixColor: "rgba(255,255,255,0.3)",
    presetBg: "rgba(255,255,255,0.04)",
    presetBorder: "rgba(255,255,255,0.08)",
    presetText: "rgba(255,255,255,0.5)",
    presetActiveBg: "rgba(201,168,76,0.12)",
    presetActiveBorder: "rgba(201,168,76,0.3)",
    presetActiveText: "#C9A84C",
    hintColor: "rgba(255,255,255,0.25)",
    errorColor: "#EF4444",
    errorBorder: "rgba(239,68,68,0.5)",
  },
  light: {
    inputBg: "#FFFFFF",
    inputBorder: "#E2DDD3",
    inputBorderFocus: "#1B4332",
    inputText: "#1A1A1A",
    inputPlaceholder: "#9CA3AF",
    focusShadow: "0 0 0 3px rgba(27,67,50,0.08)",
    labelColor: "#6B7264",
    affixColor: "#9CA3AF",
    presetBg: "#FFFFFF",
    presetBorder: "#E2DDD3",
    presetText: "#6B7264",
    presetActiveBg: "rgba(27,67,50,0.06)",
    presetActiveBorder: "#1B4332",
    presetActiveText: "#1B4332",
    hintColor: "#9CA3AF",
    errorColor: "#DC2626",
    errorBorder: "rgba(220,38,38,0.5)",
  },
} as const;

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function formatWithCommas(val: string, decimals: number): string {
  if (!val && val !== "0") return "";

  // Split into integer and decimal parts
  const parts = val.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (parts.length > 1 && decimals > 0) {
    return `${intPart}.${parts[1].slice(0, decimals)}`;
  }

  return intPart;
}

function stripNonNumeric(val: string, allowDecimal: boolean): string {
  if (allowDecimal) {
    // Allow digits and first decimal point only
    let hasDecimal = false;
    return val
      .split("")
      .filter((ch) => {
        if (ch === "." && !hasDecimal) {
          hasDecimal = true;
          return true;
        }
        return ch >= "0" && ch <= "9";
      })
      .join("");
  }
  return val.replace(/[^0-9]/g, "");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function NumberInput({
  value,
  onChange,
  label,
  placeholder = "0",
  prefix,
  suffix,
  presets,
  min,
  max,
  decimals = 0,
  variant = "dark",
  error,
  disabled = false,
  hint,
}: NumberInputProps) {
  const t = themes[variant];
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Convert value to display string
  const displayValue = value !== "" && value !== undefined
    ? formatWithCommas(String(value), decimals)
    : "";

  // ── Handle input change ─────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = stripNonNumeric(e.target.value, decimals > 0);

      if (raw === "") {
        onChange("");
        return;
      }

      const num = decimals > 0 ? parseFloat(raw) : parseInt(raw, 10);

      if (isNaN(num)) {
        onChange("");
        return;
      }

      // Clamp to min/max if set
      if (max !== undefined && num > max) {
        onChange(max);
        return;
      }

      // For decimal inputs, preserve the raw string so "1." works during typing
      if (decimals > 0 && raw.endsWith(".")) {
        onChange(raw as unknown as number);
        return;
      }

      onChange(num);
    },
    [onChange, decimals, max]
  );

  // ── Handle blur (apply min constraint) ──────────────────────────────────

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (value === "" || value === undefined) return;
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return;
    if (min !== undefined && num < min) {
      onChange(min);
    }
  }, [value, min, onChange]);

  // ── Handle preset click ─────────────────────────────────────────────────

  const handlePreset = useCallback(
    (presetValue: number) => {
      onChange(presetValue);
      // Brief flash focus on input for visual feedback
      inputRef.current?.focus();
    },
    [onChange]
  );

  // ── Determine if a preset is active ─────────────────────────────────────

  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  return (
    <div>
      {label && (
        <label
          className="block text-[11px] font-bold uppercase tracking-wider mb-2"
          style={{ color: t.labelColor }}
        >
          {label}
        </label>
      )}

      {/* Input container */}
      <div
        className="relative flex items-center rounded-[14px] border transition-all duration-200"
        style={{
          background: t.inputBg,
          borderColor: error
            ? t.errorBorder
            : isFocused
            ? t.inputBorderFocus
            : t.inputBorder,
          boxShadow: isFocused ? t.focusShadow : "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Prefix */}
        {prefix && (
          <span
            className="pl-4 text-base font-medium select-none"
            style={{ color: t.affixColor }}
          >
            {prefix}
          </span>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent p-4 text-base font-medium outline-none"
          style={{
            color: t.inputText,
            paddingLeft: prefix ? "8px" : undefined,
            paddingRight: suffix ? "8px" : undefined,
          }}
          autoComplete="off"
        />

        {/* Suffix */}
        {suffix && (
          <span
            className="pr-4 text-sm font-medium select-none"
            style={{ color: t.affixColor }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Presets */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {presets.map((p) => {
            const isActive = numericValue === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePreset(p.value)}
                disabled={disabled}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150"
                style={{
                  background: isActive ? t.presetActiveBg : t.presetBg,
                  borderColor: isActive ? t.presetActiveBorder : t.presetBorder,
                  color: isActive ? t.presetActiveText : t.presetText,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Hint text */}
      {hint && !error && (
        <p className="mt-1.5 text-xs" style={{ color: t.hintColor }}>{hint}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs font-medium" style={{ color: t.errorColor }}>{error}</p>
      )}
    </div>
  );
}

export default NumberInput;
