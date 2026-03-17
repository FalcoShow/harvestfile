// =============================================================================
// HarvestFile — Auth Testimonial Rotator
// Premium rotating testimonial carousel for the auth left panel.
// Pure CSS crossfade with JS timer for reliability across all browsers.
// =============================================================================

'use client';

import { useState, useEffect } from 'react';

const testimonials = [
  {
    quote:
      "HarvestFile showed me I was leaving $4,200 on the table by choosing ARC when PLC was the better option for my corn acres. Paid for itself instantly.",
    name: 'Mark T.',
    detail: '1,200 acres · Central Iowa',
    feature: 'ARC vs PLC Optimizer',
  },
  {
    quote:
      "I used to spend hours with spreadsheets before every FSA deadline. Now I pull up my dashboard and everything is already calculated. It's like having a consultant on call 24/7.",
    name: 'Sarah K.',
    detail: 'Farm Credit Loan Officer · Indiana',
    feature: 'Professional Dashboard',
  },
  {
    quote:
      "The price alerts caught a soybean spike I would have missed completely. Adjusted my marketing plan the same day and locked in $0.40/bu more than I expected.",
    name: 'James R.',
    detail: '2,800 acres · Western Ohio',
    feature: 'Commodity Price Alerts',
  },
  {
    quote:
      "My crop insurance clients ask me which program to elect every single year. Now I just send them a HarvestFile report — professional, accurate, done in 30 seconds.",
    name: 'Linda M.',
    detail: 'Crop Insurance Agent · Nebraska',
    feature: 'AI-Powered Reports',
  },
];

export function TestimonialRotator() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-[220px]">
      {testimonials.map((t, i) => (
        <div
          key={i}
          className="absolute inset-0 flex flex-col gap-5 transition-all duration-700 ease-out"
          style={{
            opacity: i === activeIndex ? 1 : 0,
            transform:
              i === activeIndex ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: i === activeIndex ? 'auto' : 'none',
          }}
        >
          {/* Feature badge */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9A84C]/70 w-fit">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {t.feature}
          </span>

          {/* Quote */}
          <blockquote className="text-[17px] xl:text-[18px] leading-[1.65] text-white/80 font-normal">
            &ldquo;{t.quote}&rdquo;
          </blockquote>

          {/* Attribution */}
          <div className="flex items-center gap-3">
            {/* Avatar circle with initials */}
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-[#C9A84C]/80">
                {t.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white/90">
                {t.name}
              </div>
              <div className="text-xs text-white/40">{t.detail}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-0 left-0 flex items-center gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className="transition-all duration-500"
            aria-label={`Show testimonial ${i + 1}`}
            style={{
              width: i === activeIndex ? 24 : 6,
              height: 6,
              borderRadius: 3,
              background:
                i === activeIndex
                  ? '#C9A84C'
                  : 'rgba(255, 255, 255, 0.15)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
