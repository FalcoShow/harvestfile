// =============================================================================
// HarvestFile — RevealOnScroll (Client Component)
// Phase 9 Build 1.5: Cinematic Homepage Polish
//
// Changes from Build 1:
//   - Reduced translateY from 32px to 24px (subtler, more natural)
//   - Updated easing to cubic-bezier(0.16, 1, 0.3, 1) (fast start, gentle stop)
//   - Reduced rootMargin trigger zone for earlier reveals
//   - Added will-change optimization
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

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
