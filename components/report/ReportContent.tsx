// =============================================================================
// HarvestFile - Premium Report Content (V3 - BRANDED DESIGN)
// Matches homepage aesthetic: forest greens, gold accents, noise textures
// =============================================================================

'use client';

import React from 'react';

const C = {
  dark: "#0C1F17", forest: "#1B4332", sage: "#40624D", muted: "#6B8F71",
  gold: "#C9A84C", goldBright: "#E2C366", goldDim: "#9E7E30",
  cream: "#FAFAF6", warm: "#F4F3ED", white: "#FFFFFF",
  text: "#111827", textSoft: "#6B7280", textMuted: "#9CA3AF",
  emerald: "#059669", emeraldBg: "#ECFDF5",
};

const noiseStyle = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'none' as const, opacity: 0.18, mixBlendMode: 'soft-light' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
};

export default function ReportContent({ report, tier, onUpgradeClick }) {
  if (!report) return null;

  const isPaid = tier === 'full';
  const es = report.executiveSummary || {};
  const pa = report.programAnalysis || {};
  const sa = report.scenarioAnalysis || {};
  const fg = report.formsGuide || {};
  const fv = report.fsaVisitPrep || {};
  const ci = report.cropInsurance || {};
  const dc = report.deadlineCalendar || {};
  const cc = report.countyContext || {};

  const fmt = (n) => {
    if (n == null || isNaN(n)) return '$0';
    if (n >= 0) return `$${Math.round(n).toLocaleString()}`;
    return `-$${Math.abs(Math.round(n)).toLocaleString()}`;
  };

  // ─── Locked Overlay ────────────────────────────
  const LockedOverlay = ({ sectionName }) => (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(12,31,23,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 16,
      }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid rgba(201,168,76,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{sectionName}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>Unlock your complete personalized report</p>
          <button onClick={onUpgradeClick} style={{
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: C.dark,
            fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 12,
            border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
          }}>
            Unlock Full Report — $39
          </button>
        </div>
      </div>
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', opacity: 0.25, padding: '32px 24px' }}>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, width: '75%', marginBottom: 10 }}/>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, width: '100%', marginBottom: 10 }}/>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 8, width: '60%', marginBottom: 24 }}/>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, width: '90%', marginBottom: 10 }}/>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 8, width: '70%' }}/>
      </div>
    </div>
  );

  // ─── Section Wrapper ────────────────────────────
  const Section = ({ id, title, icon, lockedTitle = '', children, dark = false }) => {
    const isLocked = !isPaid && id !== 'executiveSummary';
    const bg = dark ? C.dark : C.white;
    const titleColor = dark ? '#fff' : C.forest;
    const headerBg = dark ? 'rgba(201,168,76,0.06)' : 'linear-gradient(90deg, rgba(27,67,50,0.04), rgba(5,150,105,0.03))';

    return (
      <section style={{ marginBottom: 20 }}>
        <div style={{
          background: bg, borderRadius: 20, overflow: 'hidden',
          border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.03)',
          position: 'relative',
        }}>
          {dark && <div style={noiseStyle} />}
          <div style={{ background: headerBg, padding: '18px 28px', borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.04)', position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: titleColor, display: 'flex', alignItems: 'center', gap: 10, margin: 0, letterSpacing: '-0.02em' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              {title}
            </h2>
          </div>
          <div style={{ padding: '24px 28px', position: 'relative', zIndex: 2 }}>
            {isLocked ? <LockedOverlay sectionName={lockedTitle || title} /> : children}
          </div>
        </div>
      </section>
    );
  };

  // ─── Tag Component ────────────────────────────
  const Tag = ({ children, color = C.emerald, bg = C.emeraldBg }) => (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</span>
  );

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>

      {/* ═══ REPORT HEADER ═══ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(160deg, ${C.dark} 0%, #0A2E1C 50%, ${C.forest} 100%)`,
        borderRadius: 24, padding: '40px 36px 36px', marginBottom: 20, color: 'white',
      }}>
        <div style={noiseStyle} />
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 60%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 55%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 26 }}>🌾</span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, textTransform: 'uppercase' }}>HarvestFile Report</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
              <div>Report #{(report.reportId || '').slice(0, 8).toUpperCase()}</div>
              <div>{new Date(report.generatedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, margin: '0 0 6px' }}>
            Personalized Farm Program Report
          </h1>
          <p style={{ fontSize: 16, color: C.gold, fontWeight: 600, margin: 0 }}>
            {cc.countyName || 'Your County'}, {cc.state || 'Your State'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { label: 'Recommendation', value: es.recommendation || 'N/A', accent: false },
              { label: 'Estimated Benefit', value: fmt(es.estimatedBenefit), accent: true },
              { label: 'Confidence', value: (es.confidenceLevel || 'N/A').charAt(0).toUpperCase() + (es.confidenceLevel || 'N/A').slice(1), accent: false },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '16px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: item.accent ? 28 : 22, fontWeight: 800, color: item.accent ? C.gold : '#fff', letterSpacing: '-0.03em' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      <Section id="executiveSummary" title="Executive Summary" icon="📋">
        {es.headline && (
          <div style={{ background: `linear-gradient(135deg, ${C.emeraldBg}, #F0FFF4)`, border: '1px solid rgba(5,150,105,0.12)', borderRadius: 16, padding: '20px 24px', marginBottom: 18, borderLeft: `4px solid ${C.emerald}` }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.forest, lineHeight: 1.35, margin: 0 }}>{es.headline}</p>
          </div>
        )}
        {es.keyInsight && <p style={{ fontSize: 14.5, color: C.textSoft, lineHeight: 1.75, margin: 0 }}>{es.keyInsight}</p>}

        {!isPaid && (
          <div style={{
            marginTop: 28, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(160deg, ${C.dark}, #0A2E1C)`,
            borderRadius: 20, padding: '32px 28px', textAlign: 'center',
          }}>
            <div style={noiseStyle} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 60%)', transform: 'translate(-50%,-50%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Want the complete analysis?</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 22px' }}>7 sections: breakdowns, scenarios, forms, FSA prep, deadlines & county context</p>
              <button onClick={onUpgradeClick} className="hf-shimmer-btn" style={{
                background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDim})`,
                backgroundSize: '200% auto', color: C.dark, fontWeight: 700, fontSize: 15,
                padding: '14px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
                boxShadow: '0 6px 28px rgba(201,168,76,0.25)', letterSpacing: '-0.01em',
              }}>
                Unlock Full Report — $39
              </button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>One-time · Instant access · Print for your FSA office</p>
            </div>
          </div>
        )}
      </Section>

      {/* ═══ PROGRAM ANALYSIS ═══ */}
      <Section id="programAnalysis" title="Detailed ARC vs PLC Analysis" icon="📊" lockedTitle="ARC vs PLC Breakdown" dark>
        {pa.analysisNarrative && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 24 }}>{pa.analysisNarrative}</p>}

        {(pa.comparisonTable || []).length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Year', 'ARC-CO', 'PLC', 'Difference', 'Winner'].map((h, i) => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: i === 0 ? 'left' : i === 4 ? 'center' : 'right', color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pa.comparisonTable.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#fff' }}>{row.year}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>{fmt(row.arcPayment)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>{fmt(row.plcPayment)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: C.gold }}>{fmt(row.difference)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: 'rgba(201,168,76,0.12)', color: C.gold }}>{row.winner}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { name: 'ARC-CO', data: pa.arcProjection, accent: C.gold, bg: 'rgba(201,168,76,0.05)', border: 'rgba(201,168,76,0.1)' },
            { name: 'PLC', data: pa.plcProjection, accent: C.emerald, bg: 'rgba(5,150,105,0.05)', border: 'rgba(5,150,105,0.1)' },
          ].map(({ name, data, accent, bg, border }) => (
            <div key={name} style={{ background: bg, borderRadius: 16, padding: '20px 18px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: accent, marginBottom: 14, letterSpacing: '-0.02em' }}>{name}</div>
              {(data?.pros || []).map((p, i) => (
                <p key={`p${i}`} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', margin: '0 0 5px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#10B981', fontSize: 11, marginTop: 2 }}>✓</span> {p}
                </p>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '10px 0' }} />
              {(data?.cons || []).map((c, i) => (
                <p key={`c${i}`} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '0 0 5px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>✗</span> {c}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ SCENARIOS ═══ */}
      <Section id="scenarioAnalysis" title="Price Scenario Analysis" icon="🎯" lockedTitle="5 Price Scenarios">
        {sa.narrative && <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, marginBottom: 20 }}>{sa.narrative}</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {(sa.scenarios || []).map((s, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 1fr 80px', alignItems: 'center', gap: 12,
              background: i % 2 === 0 ? C.cream : C.white, borderRadius: 12, padding: '14px 18px',
              border: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.forest }}>{s.scenarioName}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: (s.priceChange || 0) > 0 ? C.emerald : (s.priceChange || 0) < 0 ? '#DC2626' : C.textMuted, fontWeight: 600 }}>
                  {(s.priceChange || 0) > 0 ? '+' : ''}{s.priceChange || 0}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>ARC-CO</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.forest, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.arcPayment)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>PLC</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.plcPayment)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Tag color={s.winner === 'ARC-CO' ? C.forest : '#6D28D9'} bg={s.winner === 'ARC-CO' ? 'rgba(27,67,50,0.08)' : '#EDE9FE'}>{s.winner}</Tag>
              </div>
            </div>
          ))}
        </div>
        {sa.riskAssessment && (
          <div style={{ background: '#FFFBEB', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: '16px 20px', marginTop: 16, borderLeft: `4px solid ${C.gold}` }}>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}><strong>⚠️ Risk Assessment:</strong> {sa.riskAssessment}</p>
          </div>
        )}
      </Section>

      {/* ═══ FORMS ═══ */}
      <Section id="formsGuide" title="Forms & Paperwork Guide" icon="📝" lockedTitle="Required Forms" dark>
        {fg.narrative && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 20 }}>{fg.narrative}</p>}
        {(fg.requiredForms || []).map((f, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '18px 20px', marginBottom: 10, border: '1px solid rgba(255,255,255,0.05)', borderLeft: `3px solid ${C.gold}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: C.gold, fontSize: 13 }}>{f.formNumber}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{f.formName}</span>
            </div>
            {f.purpose && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>{f.purpose}</p>}
            {f.tips && <p style={{ fontSize: 12.5, color: C.gold, margin: 0, opacity: 0.8 }}>💡 {f.tips}</p>}
          </div>
        ))}
      </Section>

      {/* ═══ FSA VISIT ═══ */}
      <Section id="fsaVisitPrep" title="FSA Office Visit Prep" icon="🏛️" lockedTitle="FSA Visit Checklist">
        {fv.narrative && <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, marginBottom: 20 }}>{fv.narrative}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { title: '📎 BRING', items: fv.whatToBring || [], bg: C.emeraldBg, border: 'rgba(5,150,105,0.1)', mark: '☐', markColor: C.emerald },
            { title: '❓ ASK', items: fv.questionsToAsk || [], bg: '#EFF6FF', border: 'rgba(59,130,246,0.1)', mark: null, markColor: '#3B82F6' },
            { title: '⚠️ AVOID', items: fv.commonMistakes || [], bg: '#FEF2F2', border: 'rgba(239,68,68,0.1)', mark: '✗', markColor: '#EF4444' },
          ].map(({ title, items, bg, border, mark, markColor }, ci) => (
            <div key={ci} style={{ background: bg, borderRadius: 16, padding: '18px 16px', border: `1px solid ${border}` }}>
              <h4 style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h4>
              {items.map((item, j) => (
                <p key={j} style={{ fontSize: 12.5, color: C.textSoft, margin: '0 0 6px', display: 'flex', gap: 6, alignItems: 'flex-start', lineHeight: 1.5 }}>
                  <span style={{ color: markColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{mark || `${j + 1}.`}</span> {item}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ CROP INSURANCE ═══ */}
      <Section id="cropInsurance" title="Crop Insurance Interaction" icon="🛡️" lockedTitle="Insurance Analysis" dark>
        {ci.narrative && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 20 }}>{ci.narrative}</p>}
        {(ci.keyConsiderations || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: C.gold, fontSize: 14, marginTop: 1, flexShrink: 0 }}>▸</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item}</span>
          </div>
        ))}
      </Section>

      {/* ═══ DEADLINES ═══ */}
      <Section id="deadlineCalendar" title="Key Deadlines" icon="📅" lockedTitle="Deadline Calendar">
        {dc.narrative && <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, marginBottom: 20 }}>{dc.narrative}</p>}
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, ${C.emerald}, ${C.gold}, ${C.sage})`, borderRadius: 100 }} />
          {(dc.deadlines || []).map((d, i) => {
            const colors = { critical: { bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' }, important: { bg: '#FFFBEB', border: '#FDE68A', dot: C.gold }, optional: { bg: C.cream, border: '#E5E7EB', dot: C.sage } };
            const c = colors[d.importance] || colors.optional;
            return (
              <div key={i} style={{ position: 'relative', marginBottom: 12, paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: -14, top: 16, width: 10, height: 10, borderRadius: 100, background: c.dot, border: `2px solid ${C.white}`, boxShadow: '0 0 0 2px rgba(0,0,0,0.05)' }} />
                <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: c.dot, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.date}</span>
                    <Tag color={c.dot} bg={`${c.dot}15`}>{d.importance}</Tag>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{d.event}</div>
                  <div style={{ fontSize: 12.5, color: C.textSoft }}>{d.action}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ COUNTY CONTEXT ═══ */}
      <Section id="countyContext" title="County Agricultural Context" icon="🗺️" lockedTitle="Local Data" dark>
        {cc.historicalData && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 14 }}>{cc.historicalData}</p>}
        {cc.localConsiderations && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{cc.localConsiderations}</p>}
        {cc.fsaOfficeInfo && (
          <div style={{ background: 'rgba(5,150,105,0.06)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(5,150,105,0.1)', marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.emerald, marginBottom: 4 }}>🏢 Your Local FSA Office</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{cc.fsaOfficeInfo}</p>
          </div>
        )}
      </Section>

      {/* ═══ FOOTER ═══ */}
      <div style={{ position: 'relative', overflow: 'hidden', background: C.dark, borderRadius: 20, padding: '28px 24px', textAlign: 'center', marginTop: 8 }}>
        <div style={noiseStyle} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '0 0 8px', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(255,255,255,0.35)' }}>Disclaimer:</strong> This report is for informational purposes only.
            Projections are estimates based on available data. Actual payments depend on final MYA prices and county yields.
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>Generated by HarvestFile — harvestfile.com</p>
        </div>
      </div>

      {/* ═══ FLOATING CTA ═══ */}
      {!isPaid && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(12,31,23,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(201,168,76,0.1)', padding: '14px 24px',
        }}>
          <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Unlock your complete report</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>7 sections · Dollar projections · FSA-ready</p>
            </div>
            <button onClick={onUpgradeClick} style={{
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: C.dark,
              fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 12,
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.25)', whiteSpace: 'nowrap',
            }}>
              Get Full Report — $39
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
