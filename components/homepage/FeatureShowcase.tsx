// =============================================================================
// HarvestFile — FeatureShowcase (Client Component)
// Phase 9 Build 4: Unified Cream — Final Polish
//
// FIX: Accent pill widened from 40% to 60% of card width
// =============================================================================

'use client';

import { useRef, type ReactNode } from 'react';
import { RevealOnScroll } from './shared/RevealOnScroll';
import { SectionBadgeLight } from './shared/SectionBadge';

function IconCalculator({ className }: { className?: string }) {
  return (<svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="18" x2="8" y2="18.01" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg>);
}
function IconMap({ className }: { className?: string }) {
  return (<svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>);
}
function IconTrendUp({ className }: { className?: string }) {
  return (<svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>);
}
function IconBrain({ className }: { className?: string }) {
  return (<svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8Z" /><path d="M10 22h4" /><path d="M9 13h2" /><path d="M13 13h2" /></svg>);
}
function IconBell({ className }: { className?: string }) {
  return (<svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>);
}
function IconFileText({ className }: { className?: string }) {
  return (<svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>);
}

function MiniCalculatorMockup() {
  return (
    <div className="rounded-xl bg-harvest-forest-950 border border-white/[0.08] p-4 shadow-lg shadow-black/10">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Live Estimate</span>
      </div>
      <div className="text-[11px] text-white/30 mb-3">Darke County, OH · Corn · 500 acres</div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between mb-1"><span className="text-[10px] font-bold text-emerald-400">ARC-CO</span><span className="text-[10px] font-bold text-emerald-400">$23,400</span></div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-emerald-500/60" style={{ width: '78%' }} /></div>
        </div>
        <div>
          <div className="flex justify-between mb-1"><span className="text-[10px] font-bold text-blue-400">PLC</span><span className="text-[10px] font-bold text-blue-400">$15,200</span></div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-blue-500/50" style={{ width: '51%' }} /></div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-white/30">ARC-CO advantage</span>
        <span className="text-[12px] font-extrabold text-harvest-gold">+$8,200/yr</span>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  highlight?: boolean;
  children?: ReactNode;
  className?: string;
}

function FeatureCard({ Icon, title, description, iconBg, iconColor, accentColor, highlight, children, className = '' }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} className={`group relative rounded-[20px] p-[1px] transition-all duration-300 hover:-translate-y-1.5 ${className}`} style={{ background: 'rgba(12,31,23,0.04)' }}>
      <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(201,168,76,0.20), transparent 50%)' }} />
      <div className="relative rounded-[19px] overflow-hidden h-full" style={{ background: '#FFFDF9', boxShadow: highlight ? '0 1px 2px rgba(12,31,23,0.06), 0 4px 8px rgba(12,31,23,0.04), 0 12px 24px rgba(12,31,23,0.03), 0 0 40px rgba(201,168,76,0.06)' : '0 1px 2px rgba(12,31,23,0.06), 0 2px 4px rgba(12,31,23,0.04), 0 4px 8px rgba(12,31,23,0.03)' }}>
        {/* Accent pill — 60% width, centered */}
        <div className="flex justify-center pt-4">
          <div className="h-[3px] w-[60%] rounded-full" style={{ background: accentColor }} />
        </div>
        {highlight && (
          <div className="absolute top-4 right-5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-harvest-gold/10 border border-harvest-gold/20 text-[10px] font-bold text-harvest-gold-dim uppercase tracking-wider">Most Popular</span>
          </div>
        )}
        <div className="p-7 pb-8">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} mb-5`}><Icon className={iconColor} /></div>
          <h3 className="text-[18px] font-bold text-harvest-forest-950 tracking-[-0.01em] mb-3">{title}</h3>
          <p className="text-[16px] text-[#4A5E52] leading-[1.65]">{description}</p>
        </div>
        {children && <div className="px-7 pb-7">{children}</div>}
      </div>
    </div>
  );
}

export function FeatureShowcase() {
  return (
    <section className="relative py-[120px] lg:py-[160px] overflow-hidden" style={{ background: '#F5F0E6' }}>
      <div className="hf-grain" />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: ['radial-gradient(ellipse 600px 400px at 15% 25%, rgba(12,31,23,0.05) 0%, transparent 70%)', 'radial-gradient(ellipse 500px 500px at 80% 60%, rgba(201,168,76,0.07) 0%, transparent 70%)', 'radial-gradient(ellipse 400px 300px at 30% 85%, rgba(45,94,71,0.04) 0%, transparent 70%)'].join(', ') }} />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <RevealOnScroll>
          <div className="mb-16">
            <SectionBadgeLight variant="gold" className="mb-5">Built for Farmers</SectionBadgeLight>
            <h2 className="text-[clamp(28px,4vw,46px)] font-extrabold text-harvest-forest-950 tracking-[-0.03em] leading-[1.1] max-w-[480px]">Government data,{' '}<span className="font-serif italic font-normal">finally useful</span></h2>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <RevealOnScroll delay={0} className="md:col-span-2">
            <FeatureCard Icon={IconCalculator} title="ARC/PLC Decision Calculator" description="Side-by-side payment comparison using your county's real yield history. Updated for 2025 OBBBA reference prices. See exactly how much you'd receive under each program." iconBg="bg-amber-50" iconColor="text-amber-700" accentColor="linear-gradient(90deg, #9E7E30, #C9A84C, #E2C366)" highlight><MiniCalculatorMockup /></FeatureCard>
          </RevealOnScroll>
          <RevealOnScroll delay={80}><FeatureCard Icon={IconMap} title="County Election Intelligence" description="7 years of FSA enrollment history for every farming county. See exactly how your neighbors have voted." iconBg="bg-emerald-50" iconColor="text-emerald-700" accentColor="#10b981" /></RevealOnScroll>
          <RevealOnScroll delay={160}><FeatureCard Icon={IconTrendUp} title="Multi-Year Scenario Modeler" description="Project ARC vs PLC payments across 5 years with interactive price and yield sliders. Model any scenario." iconBg="bg-blue-50" iconColor="text-blue-700" accentColor="#3b82f6" /></RevealOnScroll>
          <RevealOnScroll delay={240}><FeatureCard Icon={IconBrain} title="AI-Powered Farm Reports" description="Our AI analyzes your operation and generates a professional PDF with projections and an FSA prep guide." iconBg="bg-purple-50" iconColor="text-purple-700" accentColor="#8b5cf6" /></RevealOnScroll>
          <RevealOnScroll delay={320}><FeatureCard Icon={IconBell} title="Commodity Price Alerts" description="Get notified instantly when corn, soybeans, or wheat prices cross your thresholds. Never miss a move." iconBg="bg-orange-50" iconColor="text-orange-700" accentColor="#f59e0b" /></RevealOnScroll>
          <RevealOnScroll delay={400}><FeatureCard Icon={IconFileText} title="OBBBA Farm Bill Guide" description="The most comprehensive guide to the 2025 farm bill changes. New reference prices, base acres, and ARC+SCO stacking." iconBg="bg-teal-50" iconColor="text-teal-700" accentColor="#14b8a6" /></RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
