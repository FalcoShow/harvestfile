// =============================================================================
// app/(marketing)/morning/_components/MarketingScoreCard.tsx
// HarvestFile — Surface 2 Deploy 3C: Marketing Score Gauge
//
// A Bloomberg-quality semicircular gauge that synthesizes five market signals
// into a single 0–100 Marketing Score. Built on the research brief:
//   • SVG arc with pathLength="100" for percentage-based zone segmentation
//   • CSS-only needle animation (compositor thread, 60fps on rural 4G)
//   • RAF counter hook for score number count-up
//   • WCAG AA corrected palette for dark #1B4332 surface
//   • 48px minimum touch targets for 58.1-avg-age farmers
//   • role="meter" + sr-only text for accessibility
//   • Disclaimer always visible (CFTC/NFA compliance pattern)
//
// Consumes: calculateQuickScore() from lib/services/marketing-score.ts
// Data flow: MorningDashboardClient passes futures prices → this component
//            calls calculateQuickScore per commodity → renders composite
// =============================================================================

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  calculateQuickScore,
  getScoreLabel,
  SCORE_FACTORS,
  getFactorRating,
  CROP_CONFIGS,
  type ScoreBreakdown,
  type FactorInfo,
} from '@/lib/services/marketing-score';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MarketingScoreCardProps {
  prices: Record<string, any>;
  loading?: boolean;
  className?: string;
}

// ─── WCAG AA Corrected Zone Colors (on #1B4332 surface) ──────────────────────
// Original blue (#2563EB) and gray (#6B7280) fail AA contrast.
// Corrected per research brief contrast table.

const ZONE_COLORS = [
  { min: 0,  max: 29, color: '#60A5FA', label: 'Strong Hold', glow: 'rgba(96,165,250,0.15)' },
  { min: 30, max: 44, color: '#F59E0B', label: 'Hold',        glow: 'rgba(245,158,11,0.15)' },
  { min: 45, max: 64, color: '#9CA3AF', label: 'Neutral',     glow: 'rgba(156,163,175,0.12)' },
  { min: 65, max: 79, color: '#EAB308', label: 'Favorable',   glow: 'rgba(234,179,8,0.15)' },
  { min: 80, max: 100, color: '#4ADE80', label: 'Strong Sell', glow: 'rgba(74,222,128,0.15)' },
];

// Zone boundaries as percentages of the 0–100 arc
const ZONE_SEGMENTS = [
  { start: 0,  length: 30, color: '#60A5FA' },  // Strong Hold: 0–29
  { start: 30, length: 15, color: '#F59E0B' },  // Hold: 30–44
  { start: 45, length: 20, color: '#9CA3AF' },  // Neutral: 45–64
  { start: 65, length: 15, color: '#EAB308' },  // Favorable: 65–79
  { start: 80, length: 20, color: '#4ADE80' },  // Strong Sell: 80–100
];

function getZoneColor(score: number): string {
  const zone = ZONE_COLORS.find(z => score >= z.min && score <= z.max);
  return zone?.color || '#9CA3AF';
}

function getZoneGlow(score: number): string {
  const zone = ZONE_COLORS.find(z => score >= z.min && score <= z.max);
  return zone?.glow || 'rgba(156,163,175,0.12)';
}

function getZoneLabel(score: number): string {
  const zone = ZONE_COLORS.find(z => score >= z.min && score <= z.max);
  return zone?.label || 'Neutral';
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(true); // SSR-safe default
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
}

function useInView(threshold = 0.3): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useAnimatedCounter(target: number, duration: number, enabled: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return value;
}

// ─── SVG Gauge ───────────────────────────────────────────────────────────────

const GAUGE_CX = 150;
const GAUGE_CY = 150;
const GAUGE_R = 120;
const GAUGE_STROKE = 16;
// Semicircular arc from left (30, 150) to right (270, 150) through top
const ARC_PATH = `M ${GAUGE_CX - GAUGE_R} ${GAUGE_CY} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${GAUGE_CX + GAUGE_R} ${GAUGE_CY}`;

function ScoreGauge({ score, animated }: { score: number; animated: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const displayScore = useAnimatedCounter(score, 400, shouldAnimate);
  const zoneColor = getZoneColor(score);
  const zoneLabel = getZoneLabel(score);

  // Needle angle: score 0 = -90° (left), score 100 = +90° (right)
  const needleAngle = shouldAnimate
    ? -90 + (displayScore / 100) * 180
    : -90 + (score / 100) * 180;

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow behind gauge */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[160px] rounded-full blur-3xl pointer-events-none"
        style={{ background: getZoneGlow(score) }}
      />

      <svg
        viewBox="0 0 300 175"
        className="w-full max-w-[280px] h-auto relative z-10"
        aria-hidden="true"
      >
        {/* Background arc — dim base */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
        />

        {/* Zone segments using pathLength="100" */}
        {ZONE_SEGMENTS.map((zone, i) => (
          <path
            key={i}
            d={ARC_PATH}
            fill="none"
            stroke={zone.color}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={`${zone.length} 100`}
            strokeDashoffset={-zone.start}
            opacity={score >= zone.start && score <= zone.start + zone.length - 1 ? 0.9 : 0.2}
            className="transition-opacity duration-500"
          />
        ))}

        {/* Active zone glow */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke={zoneColor}
          strokeWidth={GAUGE_STROKE + 8}
          strokeLinecap="butt"
          pathLength={100}
          strokeDasharray={`${ZONE_SEGMENTS.find(z => score >= z.start && score <= z.start + z.length - 1)?.length || 20} 100`}
          strokeDashoffset={-(ZONE_SEGMENTS.find(z => score >= z.start && score <= z.start + z.length - 1)?.start || 0)}
          opacity={0.12}
          filter="url(#gaugeGlow)"
          className="transition-opacity duration-500"
        />

        {/* Glow filter */}
        <defs>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Needle */}
        <g
          className={shouldAnimate ? 'hf-gauge-needle' : ''}
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${GAUGE_CX}px ${GAUGE_CY}px`,
            ...(shouldAnimate ? {} : {}),
          }}
        >
          {/* Needle line */}
          <line
            x1={GAUGE_CX}
            y1={GAUGE_CY}
            x2={GAUGE_CX}
            y2={GAUGE_CY - GAUGE_R + 24}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Needle tip */}
          <circle
            cx={GAUGE_CX}
            cy={GAUGE_CY - GAUGE_R + 22}
            r="4"
            fill={zoneColor}
            stroke="white"
            strokeWidth="1.5"
          />
          {/* Pivot circle */}
          <circle
            cx={GAUGE_CX}
            cy={GAUGE_CY}
            r="6"
            fill="#1B4332"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
          />
        </g>

        {/* Zone labels at ends */}
        <text x={GAUGE_CX - GAUGE_R - 2} y={GAUGE_CY + 18} textAnchor="middle"
          className="fill-white/20 text-[10px] font-semibold" style={{ fontSize: '10px' }}>
          0
        </text>
        <text x={GAUGE_CX + GAUGE_R + 2} y={GAUGE_CY + 18} textAnchor="middle"
          className="fill-white/20 text-[10px] font-semibold" style={{ fontSize: '10px' }}>
          100
        </text>
      </svg>

      {/* Score number + label — centered below gauge */}
      <div className="relative z-10 -mt-16 text-center">
        <div
          className="text-[42px] font-extrabold text-white tracking-tight tabular-nums leading-none"
          style={{ textShadow: `0 0 20px ${getZoneGlow(score)}` }}
        >
          {shouldAnimate ? displayScore : score}
        </div>
        <div
          className="text-sm font-bold mt-1 tracking-wide"
          style={{ color: zoneColor }}
        >
          {zoneLabel}
        </div>
      </div>
    </div>
  );
}

// ─── Factor Breakdown ────────────────────────────────────────────────────────

function FactorBar({
  factor,
  score,
  animated,
  delay,
}: {
  factor: FactorInfo;
  score: number;
  animated: boolean;
  delay: number;
}) {
  const rating = getFactorRating(score);
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left group"
      aria-expanded={expanded}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white/80">{factor.label}</span>
          <span className="text-[10px] text-white/25 font-medium">{factor.weight}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold"
            style={{ color: rating.color }}
          >
            {rating.label}
          </span>
          <span className="text-[11px] text-white/30 tabular-nums font-semibold">{score}</span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: animated ? `${score}%` : '0%',
            backgroundColor: rating.color,
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>

      {/* Expandable description */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <p className="text-xs text-white/35 leading-relaxed">
          {factor.description}
        </p>
      </div>
    </button>
  );
}

// ─── Recommendation Card ─────────────────────────────────────────────────────

function getRecommendation(score: number, primaryCrop: string): {
  headline: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
} {
  const cropName = CROP_CONFIGS[primaryCrop]?.name || 'grain';

  if (score >= 80) return {
    headline: `Market conditions strongly favor pricing ${cropName.toLowerCase()}`,
    bullets: [
      'Futures price is well above your estimated cost of production',
      'Seasonal patterns suggest current prices are near cycle highs',
      'Consider marketing a significant portion of uncommitted bushels',
    ],
    ctaLabel: 'Run ARC/PLC Calculator',
    ctaHref: '/check',
  };
  if (score >= 65) return {
    headline: `Conditions are favorable for marketing ${cropName.toLowerCase()}`,
    bullets: [
      'Current prices offer a healthy margin above breakeven',
      'Consider pricing 25–50% of uncommitted production',
      'Monitor basis for additional upside at local elevators',
    ],
    ctaLabel: 'Run ARC/PLC Calculator',
    ctaHref: '/check',
  };
  if (score >= 45) return {
    headline: 'Market conditions are mixed — review your plan',
    bullets: [
      'No strong signal to sell or hold at current levels',
      'Watch for seasonal price patterns in the weeks ahead',
      'Ensure your ARC/PLC election is optimized for this environment',
    ],
    ctaLabel: 'Check Your Election',
    ctaHref: '/check',
  };
  if (score >= 30) return {
    headline: `Current conditions suggest patience on new ${cropName.toLowerCase()} sales`,
    bullets: [
      'Seasonal patterns historically favor higher prices ahead',
      'Storage costs are manageable relative to potential upside',
      'Review your breakeven to know your sell targets',
    ],
    ctaLabel: 'Check Your Election',
    ctaHref: '/check',
  };
  return {
    headline: 'Market conditions are challenging — hold if storage allows',
    bullets: [
      'Prices are below or near cost of production for most operations',
      'Seasonal lows typically precede stronger prices in 2–4 months',
      'Focus on cost management and ARC/PLC program optimization',
    ],
    ctaLabel: 'Optimize Your Election',
    ctaHref: '/check',
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketingScoreCard({ prices, loading, className = '' }: MarketingScoreCardProps) {
  const [containerRef, inView] = useInView(0.2);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (inView && !hasAnimated) setHasAnimated(true);
  }, [inView, hasAnimated]);

  // Calculate scores for each commodity, then take the weighted average
  const scoreData = useMemo(() => {
    const commodities = ['CORN', 'SOYBEANS', 'WHEAT'];
    const breakdowns: { code: string; breakdown: ScoreBreakdown }[] = [];

    for (const code of commodities) {
      const priceData = prices[code];
      if (!priceData?.latestSettle) continue;

      const breakdown = calculateQuickScore(
        code,
        priceData.latestSettle,
        priceData.deferredPrice ?? null,
        null, // currentBasis — will be wired in Deploy 3D
        null, // historicalBasis — will be wired in Deploy 3D
      );
      breakdowns.push({ code, breakdown });
    }

    if (breakdowns.length === 0) {
      return {
        composite: 50,
        factors: { profitability: 50, seasonal: 50, curveShape: 50, storageBurn: 50, basisOpportunity: 50 },
        primaryCrop: 'CORN',
        cropCount: 0,
      };
    }

    // Average the factor scores across all commodities
    const avg = (key: keyof Omit<ScoreBreakdown, 'composite'>) =>
      Math.round(breakdowns.reduce((sum, b) => sum + b.breakdown[key], 0) / breakdowns.length);

    const factors = {
      profitability: avg('profitability'),
      seasonal: avg('seasonal'),
      curveShape: avg('curveShape'),
      storageBurn: avg('storageBurn'),
      basisOpportunity: avg('basisOpportunity'),
    };

    const composite = Math.round(
      factors.profitability * 0.30 +
      factors.seasonal * 0.25 +
      factors.curveShape * 0.20 +
      factors.storageBurn * 0.15 +
      factors.basisOpportunity * 0.10
    );

    // Primary crop = the one with the highest individual composite score
    const primaryCrop = breakdowns.reduce((best, curr) =>
      curr.breakdown.composite > best.breakdown.composite ? curr : best
    ).code;

    return { composite, factors, primaryCrop, cropCount: breakdowns.length };
  }, [prices]);

  const recommendation = useMemo(
    () => getRecommendation(scoreData.composite, scoreData.primaryCrop),
    [scoreData.composite, scoreData.primaryCrop]
  );

  const zoneColor = getZoneColor(scoreData.composite);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-5 h-5 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-32 h-4 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="flex justify-center mb-6">
          <div className="w-[240px] h-[140px] rounded-xl bg-white/[0.04] animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="w-24 h-3 rounded bg-white/[0.06] animate-pulse" />
                <div className="w-16 h-3 rounded bg-white/[0.06] animate-pulse" />
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] overflow-hidden ${className}`}
      role="meter"
      aria-valuenow={scoreData.composite}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Marketing Score: ${scoreData.composite} out of 100, rated ${getZoneLabel(scoreData.composite)}`}
    >
      {/* Header */}
      <div className="p-5 sm:p-6 pb-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Marketing Score</h2>
          </div>
          <button
            className="text-[10px] text-white/25 hover:text-white/40 transition-colors font-medium"
            onClick={() => {
              const el = document.getElementById('hf-score-disclaimer');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            How is this calculated?
          </button>
        </div>
        <p className="text-[11px] text-white/25 mb-4">
          Composite sell/hold signal across {scoreData.cropCount || 3} commodities
        </p>
      </div>

      {/* Screen reader only */}
      <span className="sr-only">
        Your Marketing Score is {scoreData.composite} out of 100, rated {getZoneLabel(scoreData.composite)}.
        {recommendation.headline}.
      </span>

      {/* Gauge */}
      <div className="px-5 sm:px-6 pb-2">
        <ScoreGauge score={scoreData.composite} animated={hasAnimated} />
      </div>

      {/* Factor Breakdown */}
      <div className="px-5 sm:px-6 py-4 border-t border-white/[0.04]">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
          Contributing Factors
        </div>
        <div className="space-y-3">
          {SCORE_FACTORS.map((factor, i) => (
            <FactorBar
              key={factor.key}
              factor={factor}
              score={scoreData.factors[factor.key as keyof typeof scoreData.factors] || 50}
              animated={hasAnimated}
              delay={700 + i * 80}
            />
          ))}
        </div>
      </div>

      {/* Recommendation Card */}
      <div className="mx-5 sm:mx-6 mb-4 rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${getZoneGlow(scoreData.composite)}, rgba(27,67,50,0.20))` }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${zoneColor}15`, border: `1px solid ${zoneColor}30` }}
            >
              {scoreData.composite >= 65 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={zoneColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
                </svg>
              ) : scoreData.composite >= 45 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={zoneColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={zoneColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-white/90 leading-snug">
                {recommendation.headline}
              </h3>
            </div>
          </div>

          <div className="space-y-1.5 mb-4 ml-11">
            {recommendation.bullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                <span className="text-xs text-white/40 leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>

          <a
            href={recommendation.ctaHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-[13px] text-[#0C1F17] transition-all hover:opacity-90 active:scale-[0.98] ml-11"
            style={{ background: `linear-gradient(135deg, ${zoneColor}, ${zoneColor}dd)` }}
          >
            {recommendation.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Disclaimer — always visible per CFTC/NFA compliance pattern */}
      <div id="hf-score-disclaimer" className="px-5 sm:px-6 py-3 border-t border-white/[0.04] bg-white/[0.02]">
        <p className="text-[10px] text-white/20 leading-relaxed">
          This Marketing Score is for informational and educational purposes only. It does not constitute
          financial advice or a recommendation to buy or sell commodities. Market conditions can change
          rapidly. Always consult with your marketing advisor before making pricing decisions.
        </p>
      </div>
    </div>
  );
}
