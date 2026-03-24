// =============================================================================
// HarvestFile — Phase 32 Build 1.2: Founding Farmer Client Component
// FIXES: localStorage persistence for returning visitors, actual brand logo SVG
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
interface CampaignStats { total_claimed: number; spots_remaining: number; is_open: boolean; recent_signups: Array<{ position: number; state: string; created_at: string }>; }
interface SignupResult { success: boolean; position?: number; referral_code?: string; total_claimed?: number; spots_remaining?: number; share_url?: string; already_registered?: boolean; message?: string; error?: string; }

// ── Tool links ───────────────────────────────────────────────────────────────
const TOOL_LINKS: Record<string, string> = {
  'ARC/PLC Calculator': '/check', 'Payment Estimator': '/payments', 'Base Acre Analyzer': '/fba', 'SDRP Tool': '/sdrp',
  'USDA Calendar': '/calendar', 'Crop Insurance': '/insurance', 'Spray Window': '/spray-window', 'Weather': '/weather',
  'Markets': '/markets', 'Morning Dashboard': '/morning', 'Breakeven': '/breakeven', 'Cash Flow': '/cashflow',
  'Farm Score': '/farm-score', 'Grain Marketing': '/grain', 'AI Farm Advisor': '/advisor', 'County Benchmarks': '/check',
};

// ── SVG Tier Icons (no emojis) ───────────────────────────────────────────────
function TierIcon({ tier, size = 32 }: { tier: string; size?: number }) {
  const s = size * 0.45;
  const cfg: Record<string, { bg: string; stroke: string }> = {
    base: { bg: 'linear-gradient(135deg, #2D6A4F, #40916C)', stroke: 'white' },
    bronze: { bg: 'linear-gradient(135deg, #8B5E34, #CD7F32)', stroke: 'white' },
    silver: { bg: 'linear-gradient(135deg, #71797E, #A8A9AD)', stroke: 'white' },
    gold: { bg: 'linear-gradient(135deg, #996515, #C9A84C)', stroke: 'white' },
    platinum: { bg: 'linear-gradient(135deg, #B0C4DE, #E5E4E2)', stroke: '#1a1a1a' },
  };
  const c = cfg[tier] || cfg.base;
  const icons: Record<string, React.ReactNode> = {
    base: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>,
    bronze: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-3 3h6l-3-3z"/><path d="M5 3h14l-2 8H7L5 3z"/></svg>,
    silver: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    gold: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    platinum: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  };
  return <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: size, height: size, background: c.bg }}>{icons[tier]}</div>;
}

// ── ACTUAL HarvestFile Brand Logo (matches components/marketing/logo.tsx) ─────
function HFLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1B4332" />
      <path d="M12 28L20 12L28 20" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2.5" fill="#C9A84C" opacity="0.5" />
      <circle cx="20" cy="12" r="2.5" fill="#C9A84C" />
      <circle cx="28" cy="20" r="2.5" fill="#C9A84C" opacity="0.7" />
      <path d="M20 24V32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M17 27L20 24L23 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

// ── Reward Tiers ─────────────────────────────────────────────────────────────
const REWARD_TIERS = [
  { name: 'Founding Farmer', referrals: 0, tierKey: 'base', color: '#6B8F71', benefits: ['Founding Farmer #XXX certificate', 'Lifetime locked-in pricing', 'Name on the Founders Wall', 'Early access to every new tool'] },
  { name: 'Bronze Steward', referrals: 3, tierKey: 'bronze', color: '#CD7F32', benefits: ['Everything above', 'Exclusive HarvestFile hat', 'Truck/gate sticker pack', 'Priority support queue'] },
  { name: 'Silver Pioneer', referrals: 5, tierKey: 'silver', color: '#A8A9AD', benefits: ['Everything above', 'First free year of Pro', 'Monthly product preview calls', 'Beta access to AI features'] },
  { name: 'Gold Cultivator', referrals: 10, tierKey: 'gold', color: '#C9A84C', benefits: ['Everything above', 'Lifetime Premium access', 'Quarterly founder calls', 'Input on product roadmap'] },
  { name: 'Platinum Founder', referrals: 25, tierKey: 'platinum', color: '#E5E4E2', benefits: ['Everything above', 'Advisory Board seat', 'Revenue share program', 'Personal onboarding for your entire operation'] },
];

// ── localStorage key ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'harvestfile_founding_farmer';

// ── Main Component ───────────────────────────────────────────────────────────
function FoundingFarmerInner() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const [stats, setStats] = useState<CampaignStats>({ total_claimed: 0, spots_remaining: 500, is_open: true, recent_signups: [] });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{ valid: boolean; referrer_position?: number; referrer_state?: string } | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const rewardsRef = useRef<HTMLElement>(null);

  // ── Restore from localStorage on mount ─────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.success && parsed?.position && parsed?.referral_code) {
          setResult(parsed);
        }
      }
    } catch { /* localStorage unavailable — no-op */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try { const res = await fetch('/api/founding-farmer'); if (res.ok) setStats(await res.json()); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (refCode) { fetch(`/api/founding-farmer?code=${encodeURIComponent(refCode)}`).then(r => r.json()).then(setReferrerInfo).catch(() => {}); }
  }, [refCode]);

  useEffect(() => { fetchStats(); const i = setInterval(fetchStats, 30000); return () => clearInterval(i); }, [fetchStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/founding-farmer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), referral_code: refCode || undefined, source: refCode ? 'referral' : 'direct', utm_source: searchParams.get('utm_source') || undefined, utm_medium: searchParams.get('utm_medium') || undefined, utm_campaign: searchParams.get('utm_campaign') || undefined }),
      });
      const data: SignupResult = await res.json();
      if (!res.ok || !data.success) { setError(data.error === 'campaign_full' ? 'All 500 spots have been claimed!' : data.error || 'Something went wrong. Please try again.'); return; }
      setResult(data);
      // ── Save to localStorage so returning visitors see their card ──────
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* no-op */ }
      fetchStats();
    } catch { setError('Network error. Please check your connection and try again.'); } finally { setLoading(false); }
  };

  const copyReferralLink = () => { if (result?.share_url) { navigator.clipboard.writeText(result.share_url); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const scrollToRewards = () => { rewardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const progressPercent = Math.min((stats.total_claimed / 500) * 100, 100);

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#1B4332]/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#C9A84C]/8 blur-[100px]" />
      </div>

      {referrerInfo?.valid && (
        <div className="relative z-10 bg-gradient-to-r from-[#C9A84C]/20 via-[#C9A84C]/10 to-[#C9A84C]/20 border-b border-[#C9A84C]/20">
          <div className="max-w-3xl mx-auto px-4 py-3 text-center">
            <p className="text-sm text-[#C9A84C]"><span className="font-semibold">Founding Farmer #{referrerInfo.referrer_position}</span>{referrerInfo.referrer_state && ` from ${referrerInfo.referrer_state}`} invited you to join</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C9A84C]">{stats.is_open ? 'Limited to 500 Farmers' : 'Campaign Closed'}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.03em] leading-[1.08] mb-6" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>
            <span className="text-white/90">Be one of the first </span><span className="text-[#C9A84C]">500 farmers</span><br className="hidden sm:block" /><span className="text-white/90"> to shape the future</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto leading-relaxed mb-4">HarvestFile is building the most powerful farm decision platform ever created. Founding Farmers get lifetime pricing, exclusive access, and a seat at the table.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30 mb-10">
            <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>16 Free Tools Live</span>
            <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>3,000+ County Pages</span>
            <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>AI-Powered Analytics</span>
          </div>
        </div>
      </section>

      {/* Counter + Form */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <div><span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">{stats.total_claimed}</span><span className="text-lg text-white/30 ml-1">/ 500</span></div>
                <span className="text-sm font-semibold text-[#C9A84C]">{stats.spots_remaining} spot{stats.spots_remaining !== 1 ? 's' : ''} left</span>
              </div>
              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.max(progressPercent, 1)}%`, background: 'linear-gradient(90deg, #1B4332 0%, #2D6A4F 40%, #C9A84C 100%)' }} /></div>
            </div>

            {result ? (
              <div className="text-center">
                <div className="flex justify-center mb-4"><HFLogo size={48} /></div>
                <h3 className="text-xl font-bold text-white mb-1">{result.already_registered ? "Welcome back!" : "You're in!"}</h3>
                <p className="text-2xl font-extrabold text-[#C9A84C] mb-1">Founding Farmer #{result.position}</p>
                <p className="text-sm text-white/40 mb-6">{result.already_registered ? "You've already claimed your spot." : "Your spot is secured. Share to unlock rewards."}</p>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 mb-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Your Referral Link</p>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={result.share_url || ''} className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 font-mono truncate focus:outline-none" />
                    <button onClick={copyReferralLink} className="shrink-0 px-4 py-2.5 rounded-lg bg-[#C9A84C] text-[#0a0f0d] text-sm font-bold hover:bg-[#E2C366] transition-colors">{copied ? '✓ Copied' : 'Copy'}</button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <a href={`sms:?body=${encodeURIComponent(`I just became Founding Farmer #${result.position} at HarvestFile — the most powerful farm decision platform ever built. Only ${stats.spots_remaining} spots left: ${result.share_url}`)}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D6A4F]/30 border border-[#2D6A4F]/40 text-sm font-semibold text-[#6FCF97] hover:bg-[#2D6A4F]/50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Text a Neighbor
                  </a>
                  <a href={`mailto:?subject=${encodeURIComponent('Join me as a Founding Farmer at HarvestFile')}&body=${encodeURIComponent(`I just became Founding Farmer #${result.position} at HarvestFile.\n\nOnly ${stats.spots_remaining} spots left:\n${result.share_url}`)}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm font-semibold text-white/60 hover:bg-white/[0.08] transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>Email
                  </a>
                </div>
                <button onClick={scrollToRewards} className="text-xs text-white/30 mt-6 hover:text-white/50 transition-colors cursor-pointer inline-block">Refer 3 farmers to unlock <span className="text-[#CD7F32] font-semibold">Bronze Steward</span> rewards →</button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input ref={emailInputRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required disabled={loading || !stats.is_open} className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:ring-1 focus:ring-[#C9A84C]/20 transition-all text-base disabled:opacity-50" autoComplete="email" />
                  <button type="submit" disabled={loading || !stats.is_open || !email.trim()} className="w-full py-3.5 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0a0f0d] hover:shadow-[0_0_30px_rgba(201,168,76,0.25)] active:scale-[0.98]">
                    {loading ? (<span className="inline-flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>Claiming your spot...</span>) : stats.is_open ? `Claim Founding Farmer #${stats.total_claimed + 1}` : 'All 500 Spots Claimed'}
                  </button>
                </form>
                {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}
                <p className="text-[11px] text-white/20 text-center mt-3">No credit card required. Unsubscribe anytime. We never share your email.</p>
              </>
            )}
          </div>

          {stats.recent_signups.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {stats.recent_signups.slice(0, 3).map((s) => (
                <div key={s.position} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2 animate-fadeIn">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                  <span className="text-xs text-white/30"><span className="text-white/50 font-semibold">Founding Farmer #{s.position}</span>{s.state !== 'Unknown' && ` from ${s.state}`}{' — '}{formatTimeAgo(s.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 px-4 py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white/90 mb-4" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>What Founding Farmers get</h2>
            <p className="text-lg text-white/40 max-w-lg mx-auto">These benefits are permanent. They never expire and can never be taken away.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, title: 'Lifetime Pricing Lock', desc: 'Your rate never increases. Even as we add features worth 10x what you pay today.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, title: 'Early Access to Everything', desc: 'Every new tool, every new feature — you see it first, before anyone else on earth.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: 'Founders Wall', desc: 'Your name permanently displayed on harvestfile.com as one of the original 500.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>, title: 'Numbered Certificate', desc: 'A personalized "Founding Farmer #XXX" certificate. Frame it for the office.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, title: 'Direct Founder Access', desc: 'Private channel to the founding team. Your feedback shapes the product directly.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'Built By Farmers, For Farmers', desc: "This isn't Silicon Valley telling you what to use. You're building it with us." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-[#C9A84C]/20 transition-colors group">
                <div className="text-[#C9A84C]/60 mb-3 group-hover:text-[#C9A84C] transition-colors">{item.icon}</div>
                <h3 className="text-sm font-bold text-white/80 mb-1">{item.title}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reward Tiers */}
      <section ref={rewardsRef} id="rewards" className="relative z-10 px-4 py-20 border-t border-white/[0.04] scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white/90 mb-4" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>Share and unlock rewards</h2>
            <p className="text-lg text-white/40 max-w-lg mx-auto">Every farmer you invite earns you both exclusive rewards. The more you share, the more you unlock.</p>
          </div>
          <div className="space-y-3">
            {REWARD_TIERS.map((tier, i) => (
              <div key={tier.name} className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center gap-4 sm:w-52 shrink-0">
                  <TierIcon tier={tier.tierKey} />
                  <div><p className="text-sm font-bold" style={{ color: tier.color }}>{tier.name}</p><p className="text-xs text-white/30">{i === 0 ? 'Signup' : `${tier.referrals} referral${tier.referrals !== 1 ? 's' : ''}`}</p></div>
                </div>
                <div className="flex-1"><div className="flex flex-wrap gap-2">{tier.benefits.map((b) => (<span key={b} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/[0.04] text-[11px] text-white/50">{b}</span>))}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 16 Tools */}
      <section className="relative z-10 px-4 py-20 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white/90 mb-4" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>16 free tools. Zero competition.</h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto mb-10">No other platform connects USDA program optimization, grain marketing intelligence, and farm financial analysis in one place. And it&apos;s free.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(TOOL_LINKS).map(([name, href]) => (<Link key={name} href={href} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 text-xs text-white/40 font-medium hover:border-[#C9A84C]/30 hover:text-[#C9A84C]/80 hover:bg-[#C9A84C]/5 transition-all">{name}</Link>))}
          </div>
          <div className="mt-10"><Link href="/check" className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9A84C] hover:text-[#E2C366] transition-colors">Try the free ARC/PLC calculator right now<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-4 py-20 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center text-white/90 mb-10" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>Questions? We&apos;ve got answers.</h2>
          <div className="space-y-4">
            {[
              { q: 'What exactly is a Founding Farmer?', a: "You're one of the first 500 people to join HarvestFile. You get permanent benefits — lifetime pricing, early access to every feature, your name on our Founders Wall, and direct access to the team building the platform. These benefits never expire." },
              { q: 'Is there any cost to sign up?', a: "No. Claiming your Founding Farmer spot is completely free. When HarvestFile's premium tools launch, you'll get a permanently locked-in rate that will never increase — even as we add tools worth significantly more." },
              { q: 'What happens after I sign up?', a: "You'll get a confirmation email with your Founding Farmer number and a unique referral link. Share that link to unlock tiered rewards. We'll send you behind-the-scenes updates as we build, and you'll be the first to try new features." },
              { q: 'How does the referral program work?', a: 'Every Founding Farmer gets a unique link. When someone signs up through your link, you both benefit. Hit 3 referrals for a HarvestFile hat, 5 for a free year of Pro, 10 for lifetime premium access, and 25 for an advisory board seat.' },
              { q: 'What if all 500 spots fill up?', a: "When they're gone, they're gone. We will not expand beyond 500 Founding Farmers. You can join our general waitlist, but Founding Farmer benefits are exclusive to the first 500." },
              { q: "I'm not tech-savvy. Is this for me?", a: "Absolutely. If you grow crops on base acres and deal with ARC-CO or PLC decisions, this was built for you. Our tools are designed to be simpler than anything you've used before — no spreadsheets, no manuals, just answers." },
            ].map((item) => (
              <details key={item.q} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-semibold text-white/70 hover:text-white/90 transition-colors list-none [&::-webkit-details-marker]:hidden">{item.q}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 ml-4 text-white/20 transition-transform group-open:rotate-180"><polyline points="6 9 12 15 18 9"/></svg></summary>
                <div className="px-5 pb-4 text-sm text-white/40 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-4 py-20 border-t border-white/[0.04]">
        <div className="max-w-lg mx-auto text-center">
          <div className="flex justify-center mb-4"><HFLogo size={40} /></div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white/90 mb-4" style={{ fontFamily: 'var(--font-bricolage, sans-serif)' }}>{stats.spots_remaining > 0 ? `${stats.spots_remaining} spots remaining` : 'All spots claimed'}</h2>
          <p className="text-white/40 mb-8">{stats.spots_remaining > 0 ? "Once they're gone, they're gone. No exceptions." : 'Join our general waitlist for updates.'}</p>
          {stats.is_open && !result && (<button onClick={() => emailInputRef.current?.focus()} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0a0f0d] hover:shadow-[0_0_30px_rgba(201,168,76,0.25)] transition-all">Claim Your Spot Now<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>)}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <HFLogo size={24} />
            <span className="text-xs text-white/50 font-extrabold tracking-[-0.02em]">Harvest<span className="text-[#C9A84C]">File</span></span>
            <span className="text-xs text-white/30">LLC — Tallmadge, Ohio</span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-white/20">
            <Link href="/" className="hover:text-white/40 transition-colors">Home</Link>
            <Link href="/check" className="hover:text-white/40 transition-colors">Free Calculator</Link>
            <Link href="/pricing" className="hover:text-white/40 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-white/40 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/40 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
      `}</style>
    </div>
  );
}

export function FoundingFarmerClient() {
  return (<Suspense fallback={<div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" /></div>}><FoundingFarmerInner /></Suspense>);
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
