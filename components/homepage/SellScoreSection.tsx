// =============================================================================
// HarvestFile — Homepage Sell Score Section (B2, July 23, 2026)
//
// The paid product, named by name, immediately after the hero. Before this
// sprint the words "Sell Score" appeared nowhere on the homepage — /pricing
// was the only surface that sold the product ("site doesn't promote the
// Sell Score", Dussel + Lee feedback).
//
// Copy is reused from the /pricing Sell Score hero band (already written,
// already on-brand): headline, subhead, and the three-feature list. Single
// CTA to /pricing — the conversion page. Emerald (#34D399) is the Sell
// Score accent inside the gold-on-forest homepage, matching the pricing
// band so the product reads as one brand across surfaces.
//
// Server component — static copy, plain links, no client JS.
// =============================================================================

import Link from 'next/link';

export function SellScoreSection() {
  return (
    <section className="mx-auto max-w-[1000px] px-6 py-16 sm:py-20">
      <div
        className="relative rounded-[24px] overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 38, 28, 0.4) 100%)',
          border: '1.5px solid rgba(52, 211, 153, 0.22)',
          boxShadow: '0 0 100px -20px rgba(52, 211, 153, 0.18)',
        }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 70% 30%, rgba(52, 211, 153, 0.10) 0%, transparent 60%)',
          }}
          aria-hidden="true"
        />

        <div className="relative p-8 sm:p-10 lg:p-12">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
            style={{
              background: 'rgba(52, 211, 153, 0.10)',
              border: '1px solid rgba(52, 211, 153, 0.20)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[11px] font-bold text-[#34D399] uppercase tracking-wider">
              HarvestFile Sell Score · Live today
            </span>
          </div>

          {/* Headline — reused from /pricing hero band */}
          <h2
            className="text-[clamp(28px,4.5vw,42px)] font-extrabold text-white tracking-[-0.035em] leading-[1.08] mb-4"
            style={{
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
            }}
          >
            One number every morning.{' '}
            <span
              className="text-[#34D399]"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              Sell, hold, or wait.
            </span>
          </h2>

          {/* Subhead */}
          <p className="text-[15px] sm:text-[16px] text-white/55 leading-relaxed mb-7 max-w-[540px]">
            Sell Score reads your unsold position, breakeven, local elevator
            basis, and ARC/PLC floor every morning at 5 AM — and tells you
            exactly how many bushels of which crop to price today.
          </p>

          {/* Three-feature row */}
          <ul className="space-y-2.5 mb-8">
            {[
              'Daily personalized recommendation for your farm',
              'Live cash bids from your nearest elevator',
              'Three-minute setup. Ready tomorrow morning.',
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-white/70 leading-relaxed"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {line}
              </li>
            ))}
          </ul>

          {/* CTA → /pricing (the conversion page) */}
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-7 text-[16px] font-bold transition-transform duration-200 hover:scale-[1.02]"
            style={{
              minHeight: '52px',
              backgroundColor: '#34D399',
              color: '#0C1F17',
            }}
          >
            Get the Sell Score
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          <p className="text-[12px] text-white/30 mt-4">
            $149/year · Cancel anytime · Money-back if it doesn&apos;t pay for
            itself in 30 days
          </p>
        </div>

        {/* Bottom border accent */}
        <div
          className="h-[1px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.30), transparent)',
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
