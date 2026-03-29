"use client";

// =============================================================================
// HarvestFile — ScrollReveal (Shared Scroll Animation Wrapper)
// Build 9 Deploy 1: Universal scroll animation for ALL pages
//
// Wraps any content in a fade-up animation that triggers when the element
// enters the viewport. Uses Intersection Observer (no framer-motion needed).
//
// Features:
//   - Lightweight: ~1KB, no external dependencies
//   - Respects prefers-reduced-motion
//   - Configurable delay for staggered reveals
//   - Multiple animation directions: up, down, left, right, scale
//   - Intersection Observer with configurable threshold
//   - Only animates once (no re-triggering on scroll back)
//   - SSR safe: renders children immediately on server
//
// Usage:
//   import { ScrollReveal } from "@/components/shared/ScrollReveal";
//
//   <ScrollReveal>
//     <h2>This fades up when scrolled into view</h2>
//   </ScrollReveal>
//
//   {/* Staggered group */}
//   <ScrollReveal delay={0}><Card1 /></ScrollReveal>
//   <ScrollReveal delay={100}><Card2 /></ScrollReveal>
//   <ScrollReveal delay={200}><Card3 /></ScrollReveal>
// =============================================================================

import { useRef, useEffect, useState, type ReactNode, type CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Direction = "up" | "down" | "left" | "right" | "scale" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  /** Animation direction. Default: "up" */
  direction?: Direction;
  /** Delay in milliseconds before animation starts. Default: 0 */
  delay?: number;
  /** Animation duration in milliseconds. Default: 600 */
  duration?: number;
  /** How much of the element must be visible to trigger (0-1). Default: 0.15 */
  threshold?: number;
  /** Additional CSS class to apply to wrapper */
  className?: string;
  /** Additional inline styles for the wrapper */
  style?: CSSProperties;
}

// ─── Initial Transform by Direction ───────────────────────────────────────────

function getInitialTransform(direction: Direction): string {
  switch (direction) {
    case "up":
      return "translateY(24px)";
    case "down":
      return "translateY(-24px)";
    case "left":
      return "translateX(24px)";
    case "right":
      return "translateX(-24px)";
    case "scale":
      return "scale(0.95)";
    case "none":
      return "none";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 600,
  threshold = 0.15,
  className = "",
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Intersection Observer
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el); // Only animate once
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, prefersReducedMotion]);

  // If reduced motion, render children immediately without animation
  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }

  const animationStyle: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0) translateX(0) scale(1)" : getInitialTransform(direction),
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: isVisible ? "auto" : "opacity, transform",
    ...style,
  };

  return (
    <div ref={ref} className={className} style={animationStyle}>
      {children}
    </div>
  );
}

export default ScrollReveal;
