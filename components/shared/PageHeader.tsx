"use client";

// =============================================================================
// HarvestFile — PageHeader (Shared Page Header Component)
// Build 9 Deploy 1: Universal page header for ALL tool pages
//
// Fixes two issues identified on 20+ pages:
//   1. Page header text cut off behind the sticky NAV bar
//   2. "FREE TOOL #X" badges that need removal/replacement
//
// Provides a consistent, premium page header with:
//   - Proper top padding to clear the nav bar (pt-28 / pt-32)
//   - Dark gradient background with noise texture
//   - Optional badge chips (e.g. "LIVE DATA", "AI-POWERED")
//   - Title + subtitle with proper typography scale
//   - Animated entrance on load
//   - Responsive design
//
// Usage:
//   import { PageHeader } from "@/components/shared/PageHeader";
//
//   <PageHeader
//     title="Cash Flow Forecaster"
//     subtitle="12-month projection based on your farm's real numbers"
//     badges={["Live Data", "FFSC Standards"]}
//   />
// =============================================================================

import { type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Badge {
  label: string;
  /** Optional: "gold" (default), "green", "blue" */
  color?: "gold" | "green" | "blue";
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: (string | Badge)[];
  /** Optional icon SVG element to display next to title */
  icon?: ReactNode;
  /** Whether to show the gradient background. Default: true */
  gradient?: boolean;
  /** Additional content below the subtitle (e.g. a search/county input) */
  children?: ReactNode;
}

// ─── Badge Colors ─────────────────────────────────────────────────────────────

const badgeColors = {
  gold: {
    bg: "rgba(201,168,76,0.12)",
    border: "rgba(201,168,76,0.25)",
    text: "#E2C366",
  },
  green: {
    bg: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.25)",
    text: "#34D399",
  },
  blue: {
    bg: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.25)",
    text: "#60A5FA",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PageHeader({
  title,
  subtitle,
  badges,
  icon,
  gradient = true,
  children,
}: PageHeaderProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: gradient
          ? "linear-gradient(135deg, #0C1F17 0%, #1B4332 50%, #0f2b1e 100%)"
          : undefined,
        paddingTop: "7rem",      // 112px — clears the 64-72px nav bar with breathing room
        paddingBottom: "2.5rem", // 40px
      }}
    >
      {/* Noise texture overlay */}
      {gradient && <div className="hf-noise-subtle" />}

      {/* Ambient glow */}
      {gradient && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 600,
            height: 400,
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-6">
        {/* Badges */}
        {badges && badges.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 mb-4"
            style={{
              animation: "hf-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
              animationDelay: "0.1s",
            }}
          >
            {badges.map((badge, i) => {
              const b = typeof badge === "string" ? { label: badge, color: "gold" as const } : badge;
              const colors = badgeColors[b.color || "gold"];
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  style={{
                    background: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  {b.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Title */}
        <div
          className="flex items-center gap-3"
          style={{
            animation: "hf-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
            animationDelay: "0.2s",
          }}
        >
          {icon && <div className="shrink-0">{icon}</div>}
          <h1
            className="text-white font-extrabold tracking-[-0.03em]"
            style={{
              fontSize: "clamp(1.75rem, 4vw + 0.25rem, 2.75rem)",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="mt-3 max-w-xl"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "clamp(0.875rem, 1.2vw + 0.125rem, 1.0625rem)",
              lineHeight: 1.6,
              animation: "hf-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
              animationDelay: "0.3s",
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Optional children (search inputs, CTAs, etc.) */}
        {children && (
          <div
            className="mt-5"
            style={{
              animation: "hf-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
              animationDelay: "0.4s",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export default PageHeader;
