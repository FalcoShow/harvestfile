// =============================================================================
// app/(marketing)/morning/_components/MarketingScoreCard.tsx
// HarvestFile — Surface 2 Deploy 3C: Marketing Score Gauge
//
// v2 FIXES (Deploy 3C hotfix):
//   - Needle shortened: only extends from arc inward ~28px, no longer overlaps score
//   - Condensed layout: tighter padding, smaller gauge, denser factor bars
//   - Reduced dead space throughout entire card
//
// Consumes: calculateQuickScore() from lib/services/marketing-score.ts
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

const ZONE_COLORS = [
  { min: 0,  max: 29, color: '#60A5FA', label: 'Strong Hold', glow: 'rgba(96,165,250,0.15)' },
  { min: 30, max: 44, color: '#F59E0B', label: 'Hold',        glow: 'rgba(245,158,11,0.15)' },
  { min: 45, max: 64, color: '#9CA3AF', label: 'Neutral',     glow: 'rgba(156,163,175,0.12)' },
  { min: 65, max: 79, color: '#EAB308', label: 'Favorable',   glow: 'rgba(234,179,8,0.15)' },
  { min: 80, max: 100, color: '#4ADE80', label: 'Strong Sell', glow: 'rgba(74,222,128,0.15)' },
];

const ZONE_SEGMENTS = [
  { start: 0,  length: 30, color: '#60A5FA' },
  { start: 30, length: 15, color: '#F59E0B' },
  { start: 45, length: 20, color: '#9CA3AF' },
  { start: 65, length: 15, color: '#EAB308' },
  { start: 80, length: 20, color: '#4ADE80' },
];

function getZoneColor(score: number): string {
  return ZONE_COLORS.find(z => score >= z.min && score <= z.max)?.color || '#9CA3AF';
}
function getZoneGlow(score: number): string {
  return ZONE_COLORS.find(z => score >= z.min && score <= z.max)?.glow || 'rgba(156,163,175,0.12)';
}
function getZoneLabel(score: number): string {
  return ZONE_COLORS.find(z => score >= z.min && score <= z.max)?.label || 'Neutral';
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(true);
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);
  return value;
}

// ─── SVG Gauge (compact) ─────────────────────────────────────────────────────
// Needle is short: only extends from just inside the arc ~28px inward.
// Score number sits at the center with zero overlap.

const CX = 150;
const CY = 130;
const R = 105;
const STROKE = 14;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function ScoreGauge({ score, animated }: { score: number; animated: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const displayScore = useAnimatedCounter(score, 400, shouldAnimate);
  const zoneColor = getZoneColor(score);
  const zoneLabel = getZoneLabel(score);

  // Needle: short segment near the arc, computed via polar coordinates
  // Score 0 = left (180°), Score 100 = right (0°), Score 50 = top (90°)
  const scorePct = shouldAnimate ? displayScore : score;
  const angleRad = Math.PI - (scorePct / 100) * Math.PI; // 180° to 0° as score goes 0→100
  const needleOuterR = R - 5;    // just inside the arc stroke
  const needleInnerR = R - 33;   // ~28px long needle
  const tipX = CX + needleOuterR * Math.cos(angleRad);
  const tipY = CY - needleOuterR * Math.sin(angleRad);
  const baseX = CX + needleInnerR * Math.cos(angleRad);
  const baseY = CY - needleInnerR * Math.sin(angleRad);

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[220px] h-[130px] rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background: getZoneGlow(score) }}
      />

      <svg viewBox="0 0 300 150" className="w-full max-w-[256px] h-auto relative z-10" aria-hidden="true">
        {/* Background arc */}
        <path d={ARC} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} strokeLinecap="round" />

        {/* Zone segments */}
        {ZONE_SEGMENTS.map((zone, i) => (
          <path
            key={i} d={ARC} fill="none" stroke={zone.color} strokeWidth={STROKE} strokeLinecap="butt"
            pathLength={100} strokeDasharray={`${zone.length} 100`} strokeDashoffset={-zone.start}
            opacity={score >= zone.start && score <= zone.start + zone.length - 1 ? 0.85 : 0.18}
            className="transition-opacity duration-500"
          />
        ))}

        {/* Active zone glow */}
        {(() => {
          const az = ZONE_SEGMENTS.find(z => score >= z.start && score <= z.start + z.length - 1);
          if (!az) return null;
          return (
            <path d={ARC} fill="none" stroke={zoneColor} strokeWidth={STROKE + 6} strokeLinecap="butt"
              pathLength={100} strokeDasharray={`${az.length} 100`} strokeDashoffset={-az.start}
              opacity={0.1} filter="url(#gaugeGlow)" />
          );
        })()}

        <defs>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Needle — short, near the arc only */}
        <line x1={baseX} y1={baseY} x2={tipX} y2={tipY}
          stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={tipX} cy={tipY} r="3.5" fill={zoneColor} stroke="white" strokeWidth="1.5" />

        {/* Scale labels */}
        <text x={CX - R} y={CY + 15} textAnchor="middle" style={{ fontSize: '10px' }} className="fill-white/15 font-semibold">0</text>
        <text x={CX + R} y={CY + 15} textAnchor="middle" style={{ fontSize: '10px' }} className="fill-white/15 font-semibold">100</text>
      </svg>

      {/* Score number + label — clear gap from needle */}
      <div className="relative z-10 -mt-[50px] text-center">
        <div className="text-[36px] font-extrabold text-white tracking-tight tabular-nums leading-none"
          style={{ textShadow: `0 0 16px ${getZoneGlow(score)}` }}>
          {shouldAnimate ? displayScore : score}
        </div>
        <div className="text-[13px] font-bold mt-0.5 tracking-wide" style={{ color: zoneColor }}>{zoneLabel}</div>
      </div>
    </div>
  );
}

// ─── Factor Bar (compact) ────────────────────────────────────────────────────

function FactorBar({ factor, score, animated, delay }: {
  factor: FactorInfo; score: number; animated: boolean; delay: number;
}) {
  const rating = getFactorRating(score);
  const [expanded, setExpanded] = useState(false);

  return (
    <button onClick={() => setExpanded(!expanded)} className="w-full text-left" aria-expanded={expanded}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-white/80">{factor.label}</span>
          <span className="text-[10px] text-white/20 font-medium">{factor.weight}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold" style={{ color: rating.color }}>{rating.label}</span>
          <span className="text-[11px] text-white/25 tabular-nums font-semibold">{score}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: animated ? `${score}%` : '0%', backgroundColor: rating.color, transitionDelay: `${delay}ms` }} />
      </div>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-20 opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
        <p className="text-[11px] text-white/30 leading-relaxed">{factor.description}</p>
      </div>
    </button>
  );
}

// ─── Recommendation helpers ──────────────────────────────────────────────────

function getRecommendation(score: number, primaryCrop: string) {
  const cropName = CROP_CONFIGS[primaryCrop]?.name || 'grain';
  if (score >= 80) return {
    headline: `Market conditions strongly favor pricing ${cropName.toLowerCase()}`,
    bullets: ['Futures well above estimated cost of production', 'Seasonal patterns near cycle highs', 'Consider marketing uncommitted bushels'],
    ctaLabel: 'Run ARC/PLC Calculator', ctaHref: '/check',
  };
  if (score >= 65) return {
    headline: `Conditions are favorable for marketing ${cropName.toLowerCase()}`,
    bullets: ['Healthy margin above breakeven', 'Consider pricing 25\u201350% of uncommitted production', 'Monitor basis at local elevators'],
    ctaLabel: 'Run ARC/PLC Calculator', ctaHref: '/check',
  };
  if (score >= 45) return {
    headline: 'Market conditions are mixed \u2014 review your plan',
    bullets: ['No strong signal to sell or hold', 'Watch seasonal price patterns ahead', 'Ensure ARC/PLC election is optimized'],
    ctaLabel: 'Check Your Election', ctaHref: '/check',
  };
  if (score >= 30) return {
    headline: `Patience favored on new ${cropName.toLowerCase()} sales`,
    bullets: ['Seasonal patterns favor higher prices ahead', 'Storage costs manageable vs potential upside', 'Review breakeven to set sell targets'],
    ctaLabel: 'Check Your Election', ctaHref: '/check',
  };
  return {
    headline: 'Challenging conditions \u2014 hold if storage allows',
    bullets: ['Prices near or below cost of production', 'Seasonal lows precede stronger prices in 2\u20134 months', 'Focus on cost management and program optimization'],
    ctaLabel: 'Optimize Your Election', ctaHref: '/check',
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketingScoreCard({ prices, loading, className = '' }: MarketingScoreCardProps) {
  const [containerRef, inView] = useInView(0.2);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (inView && !hasAnimated) setHasAnimated(true);
  }, [inView, hasAnimated]);

  const scoreData = useMemo(() => {
    const commodities = ['CORN', 'SOYBEANS', 'WHEAT'];
    const breakdowns: { code: string; breakdown: ScoreBreakdown }[] = [];
    for (const code of commodities) {
      const priceData = prices[code];
      if (!priceData?.latestSettle) continue;
      const breakdown = calculateQuickScore(code, priceData.latestSettle, priceData.deferredPrice ?? null, null, null);
      breakdowns.push({ code, breakdown });
    }
    if (breakdowns.length === 0) return {
      composite: 50, factors: { profitability: 50, seasonal: 50, curveShape: 50, storageBurn: 50, basisOpportunity: 50 },
      primaryCrop: 'CORN', cropCount: 0,
    };
    const avg = (key: keyof Omit<ScoreBreakdown, 'composite'>) =>
      Math.round(breakdowns.reduce((sum, b) => sum + b.breakdown[key], 0) / breakdowns.length);
    const factors = {
      profitability: avg('profitability'), seasonal: avg('seasonal'), curveShape: avg('curveShape'),
      storageBurn: avg('storageBurn'), basisOpportunity: avg('basisOpportunity'),
    };
    const composite = Math.round(
      factors.profitability * 0.30 + factors.seasonal * 0.25 + factors.curveShape * 0.20 +
      factors.storageBurn * 0.15 + factors.basisOpportunity * 0.10
    );
    const primaryCrop = breakdowns.reduce((best, curr) =>
      curr.breakdown.composite > best.breakdown.composite ? curr : best).code;
    return { composite, factors, primaryCrop, cropCount: breakdowns.length };
  }, [prices]);

  const recommendation = useMemo(
    () => getRecommendation(scoreData.composite, scoreData.primaryCrop),
    [scoreData.composite, scoreData.primaryCrop]
  );
  const zoneColor = getZoneColor(scoreData.composite);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-white/[0.06] bg-[rgba(27,67,50,0.30)] p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-28 h-3.5 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-[220px] h-[120px] rounded-xl bg-white/[0.04] animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between"><div className="w-20 h-3 rounded bg-white/[0.06] animate-pulse" /><div className="w-14 h-3 rounded bg-white/[0.06] animate-pulse" /></div>
              <div className="h-1.5 rounded-full bg-white/[0.06] animate-pulse" />
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
      role="meter" aria-valuenow={scoreData.composite} aria-valuemin={0} aria-valuemax={100}
      aria-label={`Marketing Score: ${scoreData.composite} out of 100, rated ${getZoneLabel(scoreData.composite)}`}
    >
      {/* Header */}
      <div className="px-5 sm:px-6 pt-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
            <h2 className="text-sm font-semibold text-white/90 tracking-tight">Marketing Score</h2>
          </div>
          <button className="text-[10px] text-white/20 hover:text-white/40 transition-colors font-medium"
            onClick={() => { document.getElementById('hf-score-disclaimer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
            How is this calculated?
          </button>
        </div>
        <p className="text-[11px] text-white/20 mt-0.5">Composite sell/hold signal across {scoreData.cropCount || 3} commodities</p>
      </div>

      <span className="sr-only">
        Your Marketing Score is {scoreData.composite} out of 100, rated {getZoneLabel(scoreData.composite)}.
        {recommendation.headline}.
      </span>

      {/* Gauge */}
      <div className="px-5 sm:px-6 pt-1 pb-0">
        <ScoreGauge score={scoreData.composite} animated={hasAnimated} />
      </div>

      {/* Factors */}
      <div className="px-5 sm:px-6 pt-3 pb-3 border-t border-white/[0.04] mt-2">
        <div className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.1em] mb-2">Contributing Factors</div>
        <div className="space-y-2.5">
          {SCORE_FACTORS.map((factor, i) => (
            <FactorBar key={factor.key} factor={factor}
              score={scoreData.factors[factor.key as keyof typeof scoreData.factors] || 50}
              animated={hasAnimated} delay={700 + i * 80} />
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${getZoneGlow(scoreData.composite)}, rgba(27,67,50,0.20))` }}>
        <div className="p-3.5">
          <div className="flex items-start gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${zoneColor}15`, border: `1px solid ${zoneColor}30` }}>
              {scoreData.composite >= 65 ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={zoneColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
              ) : scoreData.composite >= 45 ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={zoneColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={zoneColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></svg>
              )}
            </div>
            <h3 className="text-[13px] font-bold text-white/90 leading-snug pt-0.5">{recommendation.headline}</h3>
          </div>
          <div className="space-y-1 mb-3 ml-[38px]">
            {recommendation.bullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white/15 mt-1.5 flex-shrink-0" />
                <span className="text-[11px] text-white/35 leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>
          <a href={recommendation.ctaHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[12px] text-[#0C1F17] transition-all hover:opacity-90 active:scale-[0.98] ml-[38px]"
            style={{ background: `linear-gradient(135deg, ${zoneColor}, ${zoneColor}dd)` }}>
            {recommendation.ctaLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </a>
        </div>
      </div>

      {/* Disclaimer */}
      <div id="hf-score-disclaimer" className="px-5 sm:px-6 py-2.5 border-t border-white/[0.04] bg-white/[0.02]">
        <p className="text-[10px] text-white/15 leading-relaxed">
          This Marketing Score is for informational and educational purposes only. It does not constitute
          financial advice or a recommendation to buy or sell commodities. Consult with your marketing advisor
          before making pricing decisions.
        </p>
      </div>
    </div>
  );
}
