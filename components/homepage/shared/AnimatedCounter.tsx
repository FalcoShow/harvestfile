// =============================================================================
// HarvestFile — AnimatedCounter (Client Component)
// Phase 9 Build 1: Homepage Revolution
//
// Smoothly animates a number from 0 to target value when it enters
// the viewport. Uses easeOutCubic for a premium deceleration feel.
// Respects prefers-reduced-motion.
//
// Usage:
//   <AnimatedCounter value={3000} suffix="+" />
//   <AnimatedCounter value={50} prefix="" suffix=" states" />
//   <AnimatedCounter value={12847} formatter={(n) => `$${n.toLocaleString()}`} />
// =============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;       // animation duration in ms
  prefix?: string;
  suffix?: string;
  formatter?: (n: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1800,
  prefix = '',
  suffix = '',
  formatter,
  className = '',
}: Props) {
  const [display, setDisplay] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setDisplay(value);
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutCubic — fast start, smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * value);

            setDisplay(current);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  const formatted = formatter
    ? formatter(display)
    : display.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
