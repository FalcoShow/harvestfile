// components/sellscore/QuickLinksRow.tsx
// =============================================================================
// HarvestFile Sell Score — Quick Links Row (A7, spec §4.1)
//
// Cross-links to the free surfaces: /check, /advisor, /planner. Static.
// 58+ rules: 18px labels, 56px touch targets.
// =============================================================================

import Link from 'next/link';
import { colors, fonts } from './_tokens';

const LINKS = [
  { href: '/check', label: 'ARC/PLC Calculator', sub: 'Your program floor' },
  { href: '/advisor', label: 'AI Farm Advisor', sub: 'Ask anything, anytime' },
  { href: '/planner', label: 'Farm Planner', sub: 'What ships next' },
];

export default function QuickLinksRow() {
  return (
    <section
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
    >
      <div
        className="text-[14px] uppercase mb-6"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        More from HarvestFile
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between gap-3 px-5 rounded-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            style={{
              minHeight: '72px',
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.borderSubtle}`,
              transition: 'border-color 180ms ease-out',
            }}
          >
            <span className="flex flex-col py-3">
              <span
                className="text-[18px]"
                style={{
                  color: colors.textPrimary,
                  fontFamily: fonts.body,
                  fontWeight: 600,
                  letterSpacing: '-0.005em',
                }}
              >
                {link.label}
              </span>
              <span
                className="text-[16px] mt-0.5"
                style={{
                  color: colors.textTertiary,
                  fontFamily: fonts.body,
                  fontWeight: 400,
                }}
              >
                {link.sub}
              </span>
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
