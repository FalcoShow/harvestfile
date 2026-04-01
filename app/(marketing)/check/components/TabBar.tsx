// =============================================================================
// HarvestFile — Build 18 Deploy 2: Decision Hub Tab Bar
// app/(marketing)/check/components/TabBar.tsx
//
// Scrollable gold pill tabs for the 5-tool Decision Hub. Reads from Zustand
// store, updates URL with &tab= parameter. Follows Credit Karma's pattern:
// hero card always visible, tabs let users explore deeper analysis below.
//
// Design:
//   - Gold pills on glassmorphism bar (backdrop-blur, forest-green tint)
//   - Active tab: solid gold bg, dark text, bold weight
//   - Inactive tab: transparent, gold text, medium weight, gold/30 border
//   - 48px min height touch targets, 18px text — farmer demographic
//   - Horizontally scrollable on mobile with right-edge fade indicator
//   - CSS scroll-snap for natural touch feel
//
// Accessibility:
//   - role="tablist" / role="tab" / aria-selected
//   - Keyboard arrow navigation between tabs
//   - Respects prefers-reduced-motion
//   - Focus-visible outline for keyboard users
// =============================================================================

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useFarmStore, type ResultTab } from '@/lib/stores/farm-store';

// ─── Tab Configuration ───────────────────────────────────────────────────────

interface TabConfig {
  id: ResultTab;
  label: string;
  shortLabel: string; // for very narrow screens
}

const TABS: TabConfig[] = [
  { id: 'comparison',   label: 'Comparison',      shortLabel: 'Compare' },
  { id: 'historical',   label: 'Historical',      shortLabel: 'History' },
  { id: 'elections',    label: 'County Elections', shortLabel: 'Elections' },
  { id: 'optimization', label: 'Multi-Crop',      shortLabel: 'Multi-Crop' },
  { id: 'base-acres',   label: 'Base Acres',      shortLabel: 'Base Acres' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface TabBarProps {
  /** Called when user switches tabs — parent updates URL */
  onTabChange?: (tab: ResultTab) => void;
}

export default function TabBar({ onTabChange }: TabBarProps) {
  const activeTab = useFarmStore((s) => s.activeTab);
  const setActiveTab = useFarmStore((s) => s.setActiveTab);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Handle tab click ────────────────────────────────────────────────────
  const handleTabClick = useCallback(
    (tab: ResultTab) => {
      setActiveTab(tab);
      onTabChange?.(tab);
    },
    [setActiveTab, onTabChange]
  );

  // ── Keyboard navigation (arrow keys between tabs) ───────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = TABS.length - 1;
      }

      if (nextIndex !== currentIndex) {
        const nextTab = TABS[nextIndex];
        handleTabClick(nextTab.id);
        // Focus the new tab button
        const tabEl = scrollRef.current?.querySelector(
          `[data-tab="${nextTab.id}"]`
        ) as HTMLElement | null;
        tabEl?.focus();
      }
    },
    [activeTab, handleTabClick]
  );

  // ── Auto-scroll active tab into view ────────────────────────────────────
  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector(
      `[data-tab="${activeTab}"]`
    ) as HTMLElement | null;

    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeTab]);

  return (
    <nav className="relative mb-6" aria-label="Analysis sections">
      {/* Tab bar container — glassmorphism */}
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="ARC/PLC analysis views"
        onKeyDown={handleKeyDown}
        className="flex gap-2 overflow-x-auto px-3 py-2.5
                   snap-x snap-proximity scroll-smooth
                   [-webkit-overflow-scrolling:touch]
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                   rounded-2xl motion-reduce:scroll-auto"
        style={{
          background: 'rgba(12, 31, 23, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              data-tab={tab.id}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabClick(tab.id)}
              className="snap-start shrink-0 min-h-[48px] px-5 py-3
                         rounded-full whitespace-nowrap
                         transition-all duration-150
                         focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[#C9A84C]
                         active:scale-[0.97] active:duration-75
                         motion-reduce:transition-none"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #E2C366, #C9A84C, #9E7E30)'
                  : 'transparent',
                color: isActive ? '#0C1F17' : '#C9A84C',
                fontWeight: isActive ? 700 : 600,
                fontSize: '14px',
                border: isActive
                  ? '2px solid transparent'
                  : '2px solid rgba(201, 168, 76, 0.25)',
                boxShadow: isActive
                  ? '0 4px 16px rgba(201, 168, 76, 0.2)'
                  : 'none',
                touchAction: 'manipulation',
              }}
            >
              {/* Full label on wider screens, short label on narrow */}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Right fade — scroll affordance */}
      <div
        className="absolute right-0 top-0 bottom-0 w-10
                   bg-gradient-to-l from-[#0C1F17] to-transparent
                   pointer-events-none z-10 rounded-r-2xl"
        aria-hidden="true"
      />
    </nav>
  );
}
