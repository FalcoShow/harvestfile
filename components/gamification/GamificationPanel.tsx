// =============================================================================
// HarvestFile — Phase 30 Build 4: GamificationPanel
// components/gamification/GamificationPanel.tsx
//
// THE WAZE MECHANIC FOR FARMING.
//
// Renders after a farmer submits their election. Shows:
//   1. County Completion Meter — "12 of 15 farms needed for detailed data"
//   2. Impact Counter — "Your county's data was viewed 47 times this week"
//   3. Share/Referral — One-tap SMS share with personalized referral link
//   4. State Mini-Leaderboard — "Your county ranks #3 in Ohio"
//
// Design: Dark glassmorphism matching existing BenchmarkWidget aesthetic.
// Drop-in component — import into both calculator and county BenchmarkWidgets.
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GamificationPanelProps {
  countyFips: string;
  countyName: string;
  stateName: string;
  stateAbbr: string;
  sessionId: string;
  /** Whether the user just submitted (triggers referral code generation) */
  justSubmitted?: boolean;
}

interface ImpactData {
  total_views: number;
  views_this_week: number;
  views_today: number;
  total_submissions: number;
  data_tier: number;
}

interface LeaderboardEntry {
  rank: number;
  county_fips: string;
  county_name: string;
  total_submissions: number;
  data_tier: number;
}

interface LeaderboardData {
  state_name: string;
  state_stats: {
    total_submissions: number;
    counties_reporting: number;
    counties_unlocked: number;
  };
  top_counties: LeaderboardEntry[];
}

interface ReferralData {
  code: string;
  share_url: string;
  share_sms_url: string;
  uses: number;
}

// ─── Tier Configuration ──────────────────────────────────────────────────────

const TIERS = [
  { threshold: 5, label: 'Basic Data', description: 'ARC-CO vs PLC split' },
  { threshold: 15, label: 'Detailed Data', description: 'Crop-specific breakdown' },
  { threshold: 30, label: 'Full Intelligence', description: 'Trends + confidence intervals' },
];

function getTierInfo(submissions: number) {
  if (submissions >= 30) return { current: 3, next: null, target: 30, label: 'Full Intelligence', progress: 100 };
  if (submissions >= 15) return { current: 2, next: TIERS[2], target: 30, label: 'Detailed Data', progress: Math.round((submissions / 30) * 100) };
  if (submissions >= 5) return { current: 1, next: TIERS[1], target: 15, label: 'Basic Data', progress: Math.round((submissions / 15) * 100) };
  return { current: 0, next: TIERS[0], target: 5, label: 'Locked', progress: Math.round((submissions / 5) * 100) };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GamificationPanel({
  countyFips,
  countyName,
  stateName,
  stateAbbr,
  sessionId,
  justSubmitted = false,
}: GamificationPanelProps) {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeTab, setActiveTab] = useState<'impact' | 'share' | 'leaderboard'>('impact');

  const stateFips = countyFips.substring(0, 2);

  // ── Fetch impact data ───────────────────────────────────────────────────
  const fetchImpact = useCallback(async () => {
    try {
      const res = await fetch(`/api/benchmarks/impact?county_fips=${countyFips}`);
      if (res.ok) setImpact(await res.json());
    } catch {}
  }, [countyFips]);

  // ── Fetch leaderboard ───────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/benchmarks/leaderboard?state_fips=${stateFips}&limit=5`);
      if (res.ok) setLeaderboard(await res.json());
    } catch {}
  }, [stateFips]);

  // ── Generate referral code ──────────────────────────────────────────────
  const generateReferral = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/benchmarks/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, county_fips: countyFips }),
      });
      if (res.ok) setReferral(await res.json());
    } catch {}
  }, [sessionId, countyFips]);

  // ── Record a view (the contributor is viewing their own county) ─────────
  const recordView = useCallback(async () => {
    try {
      await fetch('/api/benchmarks/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ county_fips: countyFips }),
      });
    } catch {}
  }, [countyFips]);

  // ── Initial data load ──────────────────────────────────────────────────
  useEffect(() => {
    fetchImpact();
    recordView();
    if (justSubmitted) generateReferral();
  }, [fetchImpact, recordView, justSubmitted, generateReferral]);

  // Lazy-load leaderboard when tab is selected
  useEffect(() => {
    if (activeTab === 'leaderboard' && !leaderboard) fetchLeaderboard();
  }, [activeTab, leaderboard, fetchLeaderboard]);

  // ── Derived state ──────────────────────────────────────────────────────
  const tierInfo = getTierInfo(impact?.total_submissions || 0);
  const remaining = Math.max(0, tierInfo.target - (impact?.total_submissions || 0));
  const countyRank = leaderboard?.top_counties.findIndex(c => c.county_fips === countyFips);
  const isRanked = countyRank !== undefined && countyRank >= 0;

  // ── Share handlers ─────────────────────────────────────────────────────
  const shareUrl = referral?.share_url || `https://www.harvestfile.com/check`;
  const shareText = `See what farmers in ${countyName} are choosing for ARC-CO vs PLC this year. Free and anonymous:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${countyName} ARC/PLC Benchmark`, text: shareText, url: shareUrl });
      } catch {}
    }
  };

  const handleSMSShare = () => {
    const body = encodeURIComponent(`${shareText} ${shareUrl}`);
    window.open(`sms:?body=${body}`, '_self');
  };

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[
          { key: 'impact' as const, icon: '📊', label: 'Your Impact' },
          { key: 'share' as const, icon: '📱', label: 'Share' },
          { key: 'leaderboard' as const, icon: '🏆', label: stateAbbr },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold transition-all duration-200"
            style={{
              color: activeTab === tab.key ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.3)',
              background: activeTab === tab.key ? 'rgba(16,185,129,0.06)' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid rgba(16,185,129,0.5)' : '2px solid transparent',
            }}
          >
            <span className="text-[13px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ═══ TAB: YOUR IMPACT ═══ */}
        {activeTab === 'impact' && (
          <div style={{ animation: 'qc-enter 0.3s ease-out' }}>
            {/* County Completion Meter */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                    style={{
                      background: tierInfo.current >= 1 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${tierInfo.current >= 1 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {tierInfo.current >= 3 ? '✓' : tierInfo.current + 1}
                  </div>
                  <span className="text-[12px] font-semibold text-white/70">
                    {tierInfo.current >= 3 ? 'Full Intelligence Unlocked' : `${remaining} more needed for ${tierInfo.next?.label}`}
                  </span>
                </div>
                <span className="text-[11px] font-bold" style={{ color: 'rgba(16,185,129,0.7)' }}>
                  {impact?.total_submissions || 0} farms
                </span>
              </div>

              {/* Progress bar with tier markers */}
              <div className="relative">
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.min(100, tierInfo.progress)}%`,
                      background: tierInfo.current >= 3
                        ? 'linear-gradient(90deg, #059669, #10b981, #34d399)'
                        : tierInfo.current >= 1
                          ? 'linear-gradient(90deg, #059669, #10b981)'
                          : 'linear-gradient(90deg, #065f46, #059669)',
                    }}
                  />
                </div>

                {/* Tier markers */}
                <div className="flex justify-between mt-1.5">
                  {TIERS.map((tier, i) => {
                    const reached = (impact?.total_submissions || 0) >= tier.threshold;
                    return (
                      <div key={i} className="flex flex-col items-center" style={{ width: '30%' }}>
                        <div
                          className="w-1.5 h-1.5 rounded-full mb-0.5"
                          style={{
                            background: reached ? '#10b981' : 'rgba(255,255,255,0.15)',
                          }}
                        />
                        <span className="text-[9px]" style={{ color: reached ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.2)' }}>
                          {tier.threshold} · {tier.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Impact Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <ImpactStat
                value={impact?.views_this_week || 0}
                label="Views this week"
                icon="👁️"
              />
              <ImpactStat
                value={impact?.total_submissions || 0}
                label="Farms reporting"
                icon="🌾"
              />
              <ImpactStat
                value={impact?.total_views || 0}
                label="Total views"
                icon="📈"
              />
            </div>

            {/* Civic message */}
            <div
              className="mt-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
              style={{
                background: 'rgba(201,168,76,0.04)',
                border: '1px solid rgba(201,168,76,0.1)',
                color: 'rgba(201,168,76,0.6)',
              }}
            >
              Your contribution helps build the most complete farming dataset {countyName} has ever had. 
              Every farmer who shares makes the data more valuable for everyone.
            </div>
          </div>
        )}

        {/* ═══ TAB: SHARE ═══ */}
        {activeTab === 'share' && (
          <div style={{ animation: 'qc-enter 0.3s ease-out' }}>
            <p className="text-[12px] text-white/50 mb-3 leading-relaxed">
              The more neighbors who share, the more accurate your county&apos;s data becomes. 
              Every farmer makes it better for everyone.
            </p>

            {/* Referral code display */}
            {referral && (
              <div
                className="mb-3 px-3 py-2 rounded-lg flex items-center justify-between"
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}
              >
                <div>
                  <div className="text-[10px] text-emerald-400/50 font-medium mb-0.5">Your referral code</div>
                  <div className="text-[14px] font-mono font-bold text-emerald-400/80 tracking-wider">
                    {referral.code}
                  </div>
                </div>
                {referral.uses > 0 && (
                  <div className="text-right">
                    <div className="text-[14px] font-bold text-emerald-400/80">{referral.uses}</div>
                    <div className="text-[9px] text-emerald-400/40">referrals</div>
                  </div>
                )}
              </div>
            )}

            {/* Share buttons */}
            <div className="space-y-2">
              {/* SMS Share — Primary CTA */}
              <button
                onClick={handleSMSShare}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Text this to your neighbor
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: copied ? 'rgba(16,185,129,0.8)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy link
                  </>
                )}
              </button>

              {/* Native Share (mobile) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share via...
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: STATE LEADERBOARD ═══ */}
        {activeTab === 'leaderboard' && (
          <div style={{ animation: 'qc-enter 0.3s ease-out' }}>
            {!leaderboard ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* State header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-bold text-white/80">{leaderboard.state_name}</div>
                    <div className="text-[10px] text-white/30">
                      {leaderboard.state_stats.counties_reporting} counties reporting · {leaderboard.state_stats.counties_unlocked} unlocked
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-bold text-emerald-400/80">
                      {leaderboard.state_stats.total_submissions}
                    </div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">total farms</div>
                  </div>
                </div>

                {/* County rankings */}
                <div className="space-y-1.5">
                  {leaderboard.top_counties.map((county) => {
                    const isCurrentCounty = county.county_fips === countyFips;
                    return (
                      <div
                        key={county.county_fips}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                        style={{
                          background: isCurrentCounty ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                          border: isCurrentCounty ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                        }}
                      >
                        {/* Rank */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{
                            background: county.rank <= 3
                              ? county.rank === 1 ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)'
                              : 'rgba(255,255,255,0.03)',
                            color: county.rank <= 3
                              ? county.rank === 1 ? '#C9A84C' : 'rgba(255,255,255,0.5)'
                              : 'rgba(255,255,255,0.25)',
                            border: county.rank === 1 ? '1px solid rgba(201,168,76,0.3)' : 'none',
                          }}
                        >
                          {county.rank}
                        </div>

                        {/* County name */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold truncate" style={{
                            color: isCurrentCounty ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.6)',
                          }}>
                            {county.county_name}
                            {isCurrentCounty && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/60">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tier badge */}
                        <TierBadge tier={county.data_tier} />

                        {/* Submission count */}
                        <div className="text-[12px] font-bold text-white/40 tabular-nums">
                          {county.total_submissions}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Not ranked message */}
                {!isRanked && (
                  <div
                    className="mt-3 px-3 py-2 rounded-lg text-[11px] text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.3)' }}
                  >
                    {countyName} needs more submissions to appear on the leaderboard. Share to climb the ranks!
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ImpactStat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="text-[12px]">{icon}</span>
      <span className="text-[16px] font-bold text-white/80 tabular-nums">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-[9px] text-white/30 text-center leading-tight">{label}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const config = [
    { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', label: '—' },
    { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', color: 'rgba(16,185,129,0.5)', label: 'T1' },
    { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', color: 'rgba(59,130,246,0.5)', label: 'T2' },
    { bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)', color: '#C9A84C', label: 'T3' },
  ][tier] || { bg: 'transparent', border: 'transparent', color: 'white', label: '?' };

  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

export default GamificationPanel;
