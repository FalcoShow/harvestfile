// =============================================================================
// HarvestFile — RevealOnScroll (Client Component)
// Phase 9 Build 1: Homepage Revolution
//
// Intersection Observer wrapper that reveals children with a smooth
// fade-up animation when they enter the viewport. Respects
// prefers-reduced-motion for accessibility.
//
// Usage:
//   <RevealOnScroll>
//     <h2>This fades in on scroll</h2>
//   </RevealOnScroll>
//
//   <RevealOnScroll delay={200} threshold={0.2}>
//     <Card />
//   </RevealOnScroll>
// =============================================================================

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: number;       // ms delay before animation starts
  threshold?: number;   // 0-1, how much of the element must be visible
  className?: string;   // additional classes on the wrapper
  once?: boolean;       // only animate once (default: true)
}

export function RevealOnScroll({
  children,
  delay = 0,
  threshold = 0.15,
  className = '',
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
