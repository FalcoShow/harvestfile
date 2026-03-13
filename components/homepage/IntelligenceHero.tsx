// =============================================================================
// HarvestFile - Intelligence Hub Hero Section (Phase 3C)
// The "Facebook moment" — first thing visitors see, immediately shows value
// Add this to your homepage between the main hero and the calculator section
// =============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';

const C = {
  dark: '#0C1F17', forest: '#1B4332', sage: '#40624D', muted: '#6B8F71',
  gold: '#C9A84C', goldBright: '#E2C366', goldDim: '#9E7E30',
  cream: '#FAFAF6', warm: '#F4F3ED', white: '#FFFFFF',
  text: '#111827', textSoft: '#6B7280', textMuted: '#9CA3AF',
  emerald: '#059669', emeraldLight: '#34D399',
};

const noiseStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'none', opacity: 0.12, mixBlendMode: 'soft-light' as any,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
};

// Animated counter
function AnimNum({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (value - start) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

// Intersection Observer hook for reveal animations
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function IntelligenceHero() {
  const { ref: sectionRef, inView } = useInView(0.1);
  const [activeTicker, setActiveTicker] = useState(0);

  // Simulated live price ticker
  const tickerData = [
    { crop: '🌽 Corn', price: '$4.32', change: '+2.1%', up: true },
    { crop: '🫘 Soybeans', price: '$11.85', change: '-0.8%', up: false },
    { crop: '🌾 Wheat', price: '$5.68', change: '+1.4%', up: true },
    { crop: '🌿 Sorghum', price: '$3.92', change: '+0.3%', up: true },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTicker(prev => (prev + 1) % tickerData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Feature cards
  const features = [
    {
      emoji: '📊',
      title: 'Real-Time Commodity Prices',
      desc: 'Interactive charts with USDA NASS data, reference price overlays, and year-over-year trends.',
      stat: '$4.10',
      statLabel: 'Corn Ref Price',
    },
    {
      emoji: '🌦️',
      title: '7-Day Weather Intelligence',
      desc: 'NWS forecasts tied to your exact county with yield impact analysis and GDD tracking.',
      stat: '2,450',
      statLabel: 'GDD Tracked',
    },
    {
      emoji: '🧠',
      title: 'AI Market Analysis',
      desc: 'Claude AI synthesizes USDA data, weather, and market signals into actionable intelligence.',
      stat: '4',
      statLabel: 'Report Types',
    },
    {
      emoji: '🏛️',
      title: 'Program Optimization',
      desc: 'ARC vs PLC payment projections using real county yields and current reference prices.',
      stat: '$12K',
      statLabel: 'Avg Savings Found',
    },
  ];

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative', overflow: 'hidden',
        background: C.dark, padding: '80px 24px 96px',
      }}
    >
      {/* Noise texture */}
      <div style={noiseStyle} />

      {/* Gradient orbs */}
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -200, left: -200, width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>

        {/* ─── Live Price Ticker ─────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          marginBottom: 48, flexWrap: 'wrap',
          opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(10px)',
          transition: 'all 0.8s cubic-bezier(0.25,0.1,0.25,1)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.12)',
            borderRadius: 100, padding: '5px 14px 5px 8px',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: 3, background: C.emeraldLight,
              boxShadow: '0 0 8px rgba(52,211,153,0.5)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Live Market Data
            </span>
          </div>

          {tickerData.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: i === activeTicker ? 1 : 0.35,
              transition: 'opacity 0.5s',
            }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{item.crop}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.price}</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: item.up ? C.emeraldLight : '#EF4444',
              }}>
                {item.change}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Main Headline ────────────────────────────────────────── */}
        <div style={{
          textAlign: 'center', marginBottom: 56,
          opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.25,0.1,0.25,1) 0.1s',
        }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900,
            letterSpacing: '-0.04em', lineHeight: 1.05,
            color: '#fff', marginBottom: 16,
          }}>
            Intelligence That{' '}
            <span style={{
              background: `linear-gradient(135deg, ${C.emeraldLight}, ${C.gold})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Pays for Itself
            </span>
          </h2>
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,0.4)',
            maxWidth: 640, margin: '0 auto', lineHeight: 1.6,
          }}>
            Real USDA commodity prices. County-level weather forecasts. AI-powered analysis.
            Everything a farmer needs to make smarter program decisions — in one dashboard.
          </p>
        </div>

        {/* ─── Feature Grid ─────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16, marginBottom: 48,
        }}>
          {features.map((feature, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: '28px 24px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'none' : 'translateY(20px)',
              transition: `all 0.6s cubic-bezier(0.25,0.1,0.25,1) ${0.15 + i * 0.08}s`,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative glow */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 80, height: 80,
                background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{feature.emoji}</span>
                <h3 style={{
                  fontSize: 16, fontWeight: 800, color: '#fff',
                  letterSpacing: '-0.02em', marginBottom: 6,
                }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, marginBottom: 16 }}>
                  {feature.desc}
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 6,
                  padding: '6px 12px', borderRadius: 10,
                  background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)',
                }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.gold, letterSpacing: '-0.03em' }}>
                    {feature.stat}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {feature.statLabel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── CTA ──────────────────────────────────────────────────── */}
        <div style={{
          textAlign: 'center',
          opacity: inView ? 1 : 0,
          transform: inView ? 'none' : 'translateY(15px)',
          transition: 'all 0.8s cubic-bezier(0.25,0.1,0.25,1) 0.5s',
        }}>
          <a
            href="/dashboard/intelligence"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: `linear-gradient(135deg, ${C.emerald}, ${C.forest})`,
              color: '#fff', fontSize: 16, fontWeight: 700,
              padding: '16px 32px', borderRadius: 14, textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(5,150,105,0.25)',
              transition: 'all 0.3s',
              letterSpacing: '-0.01em',
            }}
          >
            Open Intelligence Hub
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
            Free for all users · No credit card required
          </p>
        </div>

        {/* ─── Trust strip ──────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 24, marginTop: 48, flexWrap: 'wrap',
          opacity: inView ? 1 : 0,
          transition: 'opacity 0.8s 0.6s',
        }}>
          {[
            'USDA NASS verified data',
            'NWS weather forecasts',
            'Claude AI analysis',
            'Updated daily',
          ].map(badge => (
            <div key={badge} style={{
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill={C.emerald}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </section>
  );
}
