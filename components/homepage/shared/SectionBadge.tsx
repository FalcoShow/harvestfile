// =============================================================================
// HarvestFile — SectionBadge (Server Component)
// Phase 9 Build 1: Homepage Revolution
//
// The "Live USDA Data · Updated Daily" style badge used at the top
// of homepage sections. Supports optional pulsing dot and custom colors.
//
// Usage:
//   <SectionBadge>Live USDA Data · Updated Daily</SectionBadge>
//   <SectionBadge pulse={false} variant="gold">New Feature</SectionBadge>
// =============================================================================

import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  pulse?: boolean;
  variant?: 'emerald' | 'gold' | 'default';
  className?: string;
}

export function SectionBadge({
  children,
  pulse = true,
  variant = 'default',
  className = '',
}: Props) {
  const dotColors: Record<string, string> = {
    emerald: 'bg-emerald-400',
    gold: 'bg-harvest-gold',
    default: 'bg-emerald-400',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
        bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColors[variant]}`}
          />
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
          />
        </span>
      )}
      <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
        {children}
      </span>
    </div>
  );
}

// Light variant for use on light backgrounds
export function SectionBadgeLight({
  children,
  variant = 'default',
  className = '',
}: Omit<Props, 'pulse'>) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/60',
    },
    gold: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200/60',
    },
    default: {
      bg: 'bg-harvest-forest-800/[0.06]',
      text: 'text-harvest-forest-700',
      border: 'border-harvest-forest-800/10',
    },
  };

  const c = colors[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]
        font-bold uppercase tracking-[0.12em] ${c.bg} ${c.text} border ${c.border} ${className}`}
    >
      {children}
    </span>
  );
}
