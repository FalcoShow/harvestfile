// =============================================================================
// HarvestFile — RevealOnScroll (Client Component)
// Build 12 Deploy 4: Fixed height propagation for grid layouts
//
// FIX: The wrapper div now includes height:'100%' in its inline styles
// whenever the className prop contains a height utility (h-full, h-auto, etc.)
// or any grid span class. This ensures CSS Grid row-spanning works correctly
// because inline styles override Tailwind's specificity for the h-full class
// which was being blocked by the opacity/transform inline styles.
//
// Previous behavior: className="md:col-span-2 md:row-span-2 h-full" would
// set h-full via Tailwind BUT the inline style={{ opacity, transform }}
// object had no height property, so the browser's computed height defaulted
// to auto, breaking the flex chain for children.
// =============================================================================

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
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
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  // Detect if this wrapper needs to fill its grid cell height
  const needsFullHeight =
    className.includes('h-full') ||
    className.includes('row-span');

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ...(needsFullHeight ? { height: '100%' } : {}),
      }}
    >
      {children}
    </div>
  );
}
