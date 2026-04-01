// =============================================================================
// HarvestFile — Build 18 Deploy 2: Premium Skeleton Placeholders
// app/(marketing)/check/components/SkeletonPanel.tsx
//
// Renders premium "Coming Soon" content for tabs being built in Deploys 3-5.
// Each skeleton includes:
//   - A gold "Coming Soon" badge
//   - Feature-specific title and benefit description
//   - Structured shimmer skeleton that mirrors the expected content layout
//   - Icon appropriate to the analysis type
//
// The copy is a PRODUCT PROMISE — it tells farmers exactly what they'll get,
// creating anticipation and return-visit motivation. Each description answers
// "why should I come back for this?" with a specific value proposition.
//
// Shimmer uses brand-appropriate gold tints (#C9A84C at 5-12% opacity)
// instead of generic gray. Respects prefers-reduced-motion.
// =============================================================================

'use client';

import type { ResultTab } from '@/lib/stores/farm-store';

// ─── Skeleton Configuration ──────────────────────────────────────────────────

interface SkeletonConfig {
  badge: string;
  title: string;
  description: string;
  ariaLabel: string;
  icon: React.ReactNode;
  /** Array of rows, each row is array of width strings */
  skeletonRows: string[][];
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconBarChart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <rect x="7" y="10" width="3" height="8" rx="1" fill="#C9A84C" fillOpacity="0.2" />
      <rect x="13" y="6" width="3" height="12" rx="1" fill="#C9A84C" fillOpacity="0.2" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" fill="#C9A84C" fillOpacity="0.15" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#C9A84C" fillOpacity="0.1" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#C9A84C" fillOpacity="0.12" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#C9A84C" fillOpacity="0.12" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#C9A84C" fillOpacity="0.12" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#C9A84C" fillOpacity="0.08" />
    </svg>
  );
}

// ─── Skeleton Configs ────────────────────────────────────────────────────────

const SKELETON_CONFIG: Record<Exclude<ResultTab, 'comparison'>, SkeletonConfig> = {
  historical: {
    badge: 'Coming Soon',
    title: 'Historical ARC & PLC Payments',
    description: 'See actual program payments for your county over the past 5-7 crop years. Know which program has paid more historically before making your election.',
    ariaLabel: 'Historical payments section — coming soon',
    icon: <IconBarChart />,
    skeletonRows: [
      ['100%'],
      ['65%', '35%'],
      ['20%', '20%', '20%', '20%', '20%'],
      ['20%', '20%', '20%', '20%', '20%'],
      ['100%'],
    ],
  },
  elections: {
    badge: 'Coming Soon',
    title: 'County Election Trends',
    description: 'Discover what percentage of your neighbors chose ARC-CO vs PLC. See how your county\'s election pattern has shifted over the last 7 years.',
    ariaLabel: 'County election trends — coming soon',
    icon: <IconMapPin />,
    skeletonRows: [
      ['50%', '50%'],
      ['100%'],
      ['33%', '33%', '34%'],
      ['100%'],
    ],
  },
  optimization: {
    badge: 'Coming Soon',
    title: 'Multi-Crop Optimization',
    description: 'Growing corn AND soybeans? Get the optimal ARC vs PLC election for each crop simultaneously. One analysis, every crop covered.',
    ariaLabel: 'Multi-crop optimization — coming soon',
    icon: <IconLayers />,
    skeletonRows: [
      ['40%', '60%'],
      ['100%'],
      ['25%', '25%', '25%', '25%'],
      ['25%', '25%', '25%', '25%'],
      ['100%'],
    ],
  },
  'base-acres': {
    badge: 'Coming Soon',
    title: 'Base Acre Analysis',
    description: 'Understand how your base acres, PLC yield, and the new OBBBA base acre provisions affect your program payment calculations.',
    ariaLabel: 'Base acre analysis — coming soon',
    icon: <IconGrid />,
    skeletonRows: [
      ['100%'],
      ['70%', '30%'],
      ['50%', '50%'],
      ['100%'],
    ],
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface SkeletonPanelProps {
  variant: Exclude<ResultTab, 'comparison'>;
}

export default function SkeletonPanel({ variant }: SkeletonPanelProps) {
  const config = SKELETON_CONFIG[variant];

  return (
    <div
      className="rounded-[20px] p-6 sm:p-8"
      role="status"
      aria-label={config.ariaLabel}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* ── Badge + Icon + Title + Description ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center py-6 sm:py-10 space-y-5">
        {/* Coming Soon badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            background: 'rgba(201, 168, 76, 0.08)',
            border: '1px solid rgba(201, 168, 76, 0.2)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/60"
            style={{ animation: 'hf-pulse 2s ease-in-out infinite' }}
          />
          <span className="text-[11px] sm:text-[12px] font-bold text-[#C9A84C]/80 uppercase tracking-wider">
            {config.badge}
          </span>
        </div>

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(201, 168, 76, 0.06)',
            border: '1px solid rgba(201, 168, 76, 0.12)',
          }}
        >
          {config.icon}
        </div>

        {/* Title */}
        <h3 className="text-[18px] sm:text-[22px] font-extrabold text-white/90 tracking-[-0.02em] text-center">
          {config.title}
        </h3>

        {/* Description */}
        <p className="text-[14px] sm:text-[15px] text-white/45 leading-relaxed text-center max-w-[460px]">
          {config.description}
        </p>
      </div>

      {/* ── Structured Skeleton Preview ────────────────────────────────── */}
      <div className="space-y-3 opacity-30 mt-2 mb-4">
        {config.skeletonRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-3">
            {row.map((width, colIndex) => (
              <div
                key={colIndex}
                className="h-10 rounded-xl hf-skeleton-shimmer"
                style={{ width, flexShrink: 0 }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ── Subtle CTA hint ────────────────────────────────────────────── */}
      <div className="text-center mt-6">
        <p className="text-[12px] text-white/20 font-medium">
          This analysis will use the same farm data you entered above.
        </p>
      </div>
    </div>
  );
}
