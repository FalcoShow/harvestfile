// components/sellscore/_tokens.ts
// =============================================================================
// HarvestFile Sell Score — Design Tokens
//
// Centralized design tokens, applied via inline styles so components are
// self-contained and don't require globals.css edits tonight. When ready
// to migrate to Tailwind v4 @theme custom utilities, this file is the
// source-of-truth for that migration.
// =============================================================================

export const colors = {
  // Surfaces
  pageBg: '#0a0f0d',
  cardBg: '#131918',
  cardBgHover: '#181F1D',

  // Borders (translucent over page bg for natural elevation feel)
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.10)',
  borderEmphasis: 'rgba(255, 255, 255, 0.18)',

  // Text hierarchy (off-white, never pure white — easier on aging eyes)
  textPrimary: '#E8F0EB',
  textSecondary: 'rgba(232, 240, 235, 0.70)',
  textTertiary: 'rgba(232, 240, 235, 0.50)',
  textMuted: 'rgba(232, 240, 235, 0.30)',

  // Brand accents
  emerald: '#34D399',
  emeraldDeep: '#10B981',
  emeraldGlow: 'rgba(52, 211, 153, 0.12)',

  // Caution (warm gold, brand-aligned)
  amber: '#FBBF24',
  amberGlow: 'rgba(251, 191, 36, 0.12)',

  // Negative (warm orange, NOT pure red — per design system)
  warmRed: '#F97316',
  warmRedGlow: 'rgba(249, 115, 22, 0.12)',

  // Editorial gold accent
  gold: '#E2C366',
} as const;

export const fonts = {
  display: '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  serif: '"Instrument Serif", "Times New Roman", Georgia, serif',
  body: '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

export const tabularNums = {
  fontVariantNumeric: 'tabular-nums' as const,
};

export const signalColors = {
  green: { fg: colors.emerald, bg: colors.emeraldGlow },
  yellow: { fg: colors.amber, bg: colors.amberGlow },
  red: { fg: colors.warmRed, bg: colors.warmRedGlow },
} as const;

export const formatters = {
  bushels: (n: number) => n.toLocaleString('en-US'),
  currency: (n: number) => `$${n.toFixed(2)}`,
  cents: (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}¢`,
  percent: (n: number) => `${Math.round(n)}%`,
  perAcre: (n: number) => `$${Math.round(n)}/ac`,
  // Percentile copy fix (July 23, 2026): always round to an integer before
  // attaching the ordinal suffix. "14.3th percentile" read as broken
  // software in the live screenshots; "14th percentile" is the spec voice.
  ordinal: (n: number) => {
    const r = Math.round(n);
    const j = r % 10;
    const k = r % 100;
    const suffix =
      j === 1 && k !== 11 ? 'st' :
      j === 2 && k !== 12 ? 'nd' :
      j === 3 && k !== 13 ? 'rd' : 'th';
    return `${r}${suffix}`;
  },
};
