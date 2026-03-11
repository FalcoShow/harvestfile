// =============================================================================
// HarvestFile - Report Content Renderer (FIXED - null-safe)
// Won't crash if Claude returns slightly different data shapes
// =============================================================================

'use client';

import React from 'react';

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

  // Locked Section Overlay
  const LockedOverlay = ({ sectionName }) => (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(255,255,255,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 16, border: '2px dashed rgba(5,150,105,0.25)',
      }}>
        <div style={{ textAlign: 'center', padding: '24px 32px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{sectionName}</p>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Unlock your complete personalized report</p>
          <button
            onClick={onUpgradeClick}
            style={{
              background: '#059669', color: 'white', fontWeight: 700, fontSize: 14,
              padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5,150,105,0.2)',
            }}
          >
            Get Full Report — $39
          </button>
        </div>
      </div>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', opacity: 0.4, padding: '32px 24px' }}>
        <div style={{ height: 16, background: '#e5e7eb', borderRadius: 8, width: '75%', marginBottom: 12 }}></div>
        <div style={{ height: 16, background: '#e5e7eb', borderRadius: 8, width: '100%', marginBottom: 12 }}></div>
        <div style={{ height: 16, background: '#e5e7eb', borderRadius: 8, width: '85%', marginBottom: 12 }}></div>
        <div style={{ height: 16, background: '#e5e7eb', borderRadius: 8, width: '60%', marginBottom: 24 }}></div>
        <div style={{ height: 16, background: '#e5e7eb', borderRadius: 8, width: '100%', marginBottom: 12 }}></div>
        <div style={{ height: 16, background: '#e5e7eb', borderRadius: 8, width: '70%' }}></div>
      </div>
    </div>
  );

  // Section wrapper
  const Section = ({ id, title, icon, lockedTitle = '', children }) => {
    const isLocked = !isPaid && id !== 'executiveSummary';
    return (
      <section style={{ marginBottom: 28 }}>
        <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ background: 'linear-gradient(90deg, #ECFDF5, #F0FDFA)', padding: '16px 24px', borderBottom: '1px solid rgba(5,150,105,0.08)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              {title}
            </h2>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {isLocked ? <LockedOverlay sectionName={lockedTitle || title} /> : children}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ══ HEADER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #1B4332, #0C1F17)',
        borderRadius: 20, padding: '32px 28px', marginBottom: 28, color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>🌾</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.6, textTransform: 'uppercase' }}>HarvestFile</span>
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
          Personalized Farm Program Report
        </h1>
        <p style={{ fontSize: 15, opacity: 0.5, margin: 0 }}>
          {cc.countyName || 'Your County'}, {cc.state || 'Your State'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 4 }}>Recommendation</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{es.recommendation || 'N/A'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 4 }}>Est. Benefit</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(es.estimatedBenefit)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 4 }}>Confidence</div>
            <div style={{ fontSize: 22, fontWeight: 800, textTransform: 'capitalize' }}>{es.confidenceLevel || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 1: EXECUTIVE SUMMARY (FREE) ══ */}
      <Section id="executiveSummary" title="Executive Summary" icon="📋">
        {es.headline && (
          <div style={{ background: '#ECFDF5', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#064E3B', lineHeight: 1.4, margin: 0 }}>
              {es.headline}
            </p>
          </div>
        )}
        {es.keyInsight && (
          <p style={{ fontSize: 14.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            {es.keyInsight}
          </p>
        )}

        {/* Upgrade CTA after free section */}
        {!isPaid && (
          <div style={{
            marginTop: 28, padding: '24px 20px', textAlign: 'center',
            background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16,
          }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              Want the full analysis with dollar projections?
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 18px' }}>
              7 additional sections: detailed breakdowns, price scenarios, forms guide, FSA prep, deadlines & more.
            </p>
            <button
              onClick={onUpgradeClick}
              style={{
                background: '#1B4332', color: 'white', fontWeight: 700, fontSize: 15,
                padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(27,67,50,0.2)',
              }}
            >
              Unlock Full Report — $39
            </button>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>One-time purchase · Instant access · Take it to your FSA office</p>
          </div>
        )}
      </Section>

      {/* ══ SECTION 2: PROGRAM ANALYSIS ══ */}
      <Section id="programAnalysis" title="Detailed ARC vs PLC Analysis" icon="📊" lockedTitle="Detailed ARC vs PLC Breakdown">
        {pa.analysisNarrative && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 20 }}>{pa.analysisNarrative}</p>}

        {(pa.comparisonTable || []).length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #D1FAE5' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontWeight: 700 }}>Year</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6B7280', fontWeight: 700 }}>ARC-CO</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6B7280', fontWeight: 700 }}>PLC</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6B7280', fontWeight: 700 }}>Difference</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', color: '#6B7280', fontWeight: 700 }}>Winner</th>
                </tr>
              </thead>
              <tbody>
                {pa.comparisonTable.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.year}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.arcPayment)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.plcPayment)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: (row.difference || 0) > 0 ? '#059669' : '#DC2626' }}>{fmt(row.difference)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: row.winner === 'ARC-CO' ? '#DBEAFE' : '#EDE9FE', color: row.winner === 'ARC-CO' ? '#1D4ED8' : '#6D28D9' }}>{row.winner}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pros/Cons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { name: 'ARC-CO', data: pa.arcProjection, bg: '#EFF6FF' },
            { name: 'PLC', data: pa.plcProjection, bg: '#F5F3FF' },
          ].map(({ name, data, bg }) => (
            <div key={name} style={{ background: bg, borderRadius: 14, padding: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{name}</h4>
              {(data?.pros || []).map((p, i) => (
                <p key={`p${i}`} style={{ fontSize: 12.5, color: '#374151', margin: '0 0 4px', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#10B981' }}>✓</span> {p}
                </p>
              ))}
              {(data?.cons || []).map((c, i) => (
                <p key={`c${i}`} style={{ fontSize: 12.5, color: '#374151', margin: '4px 0 0', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#EF4444' }}>✗</span> {c}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ══ SECTION 3: SCENARIOS ══ */}
      <Section id="scenarioAnalysis" title="Price Scenario Analysis" icon="🎯" lockedTitle="5 Price Scenarios & Risk Analysis">
        {sa.narrative && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{sa.narrative}</p>}
        {(sa.scenarios || []).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ minWidth: 100 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.scenarioName}</div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: (s.priceChange || 0) > 0 ? '#059669' : (s.priceChange || 0) < 0 ? '#DC2626' : '#6B7280' }}>
                {(s.priceChange || 0) > 0 ? '+' : ''}{s.priceChange || 0}%
              </div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
              <div><span style={{ color: '#9CA3AF' }}>ARC-CO</span><br /><strong>{fmt(s.arcPayment)}</strong></div>
              <div><span style={{ color: '#9CA3AF' }}>PLC</span><br /><strong>{fmt(s.plcPayment)}</strong></div>
              <div><span style={{ color: '#9CA3AF' }}>Winner</span><br />
                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: s.winner === 'ARC-CO' ? '#DBEAFE' : '#EDE9FE', color: s.winner === 'ARC-CO' ? '#1D4ED8' : '#6D28D9' }}>{s.winner}</span>
              </div>
            </div>
          </div>
        ))}
        {sa.riskAssessment && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 14, marginTop: 12 }}>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}><strong>⚠️ Risk Assessment:</strong> {sa.riskAssessment}</p>
          </div>
        )}
      </Section>

      {/* ══ SECTION 4: FORMS ══ */}
      <Section id="formsGuide" title="Forms & Paperwork Guide" icon="📝" lockedTitle="Required Forms & Filing Guide">
        {fg.narrative && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{fg.narrative}</p>}
        {(fg.requiredForms || []).map((f, i) => (
          <div key={i} style={{ background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{f.formNumber}</span>
              <span style={{ margin: '0 8px', color: '#D1D5DB' }}>—</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{f.formName}</span>
            </div>
            {f.purpose && <p style={{ fontSize: 12.5, color: '#6B7280', margin: '6px 0 0' }}>{f.purpose}</p>}
            {f.tips && <p style={{ fontSize: 12.5, color: '#059669', margin: '4px 0 0' }}>💡 {f.tips}</p>}
          </div>
        ))}
      </Section>

      {/* ══ SECTION 5: FSA VISIT ══ */}
      <Section id="fsaVisitPrep" title="FSA Office Visit Prep" icon="🏛️" lockedTitle="FSA Visit Checklist & Tips">
        {fv.narrative && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{fv.narrative}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { title: '📎 Bring', items: fv.whatToBring || [], mark: '☐' },
            { title: '❓ Ask', items: fv.questionsToAsk || [], mark: null },
            { title: '⚠️ Avoid', items: fv.commonMistakes || [], mark: '✗' },
          ].map(({ title, items, mark }, ci) => (
            <div key={ci} style={{ background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
              {items.map((item, j) => (
                <p key={j} style={{ fontSize: 12, color: '#374151', margin: '0 0 4px', display: 'flex', gap: 4 }}>
                  {mark ? <span>{mark}</span> : <span style={{ fontWeight: 700 }}>{j + 1}.</span>} {item}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ══ SECTION 6: CROP INSURANCE ══ */}
      <Section id="cropInsurance" title="Crop Insurance Interaction" icon="🛡️" lockedTitle="How ARC/PLC Affects Your Insurance">
        {ci.narrative && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{ci.narrative}</p>}
        {(ci.keyConsiderations || []).map((item, i) => (
          <p key={i} style={{ fontSize: 13, color: '#374151', margin: '0 0 6px', display: 'flex', gap: 6 }}>
            <span style={{ color: '#F59E0B' }}>▸</span> {item}
          </p>
        ))}
      </Section>

      {/* ══ SECTION 7: DEADLINES ══ */}
      <Section id="deadlineCalendar" title="Key Deadlines" icon="📅" lockedTitle="Your Deadline Calendar">
        {dc.narrative && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{dc.narrative}</p>}
        {(dc.deadlines || []).map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, padding: 12, borderRadius: 10, marginBottom: 6,
            borderLeft: `4px solid ${d.importance === 'critical' ? '#EF4444' : d.importance === 'important' ? '#F59E0B' : '#D1D5DB'}`,
            background: d.importance === 'critical' ? '#FEF2F2' : d.importance === 'important' ? '#FFFBEB' : '#F9FAFB',
          }}>
            <div style={{ minWidth: 70, fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{d.date}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{d.event}</div>
              <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{d.action}</div>
            </div>
          </div>
        ))}
      </Section>

      {/* ══ SECTION 8: COUNTY CONTEXT ══ */}
      <Section id="countyContext" title="County Agricultural Context" icon="🗺️" lockedTitle="Local County Data & FSA Info">
        {cc.historicalData && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 12 }}>{cc.historicalData}</p>}
        {cc.localConsiderations && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 12 }}>{cc.localConsiderations}</p>}
        {cc.fsaOfficeInfo && (
          <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 8 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>🏢 Your Local FSA Office</h4>
            <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{cc.fsaOfficeInfo}</p>
          </div>
        )}
      </Section>

      {/* ══ FOOTER ══ */}
      <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 24, textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>
        <p style={{ margin: '0 0 8px' }}>
          <strong style={{ color: '#6B7280' }}>Disclaimer:</strong> This report is for informational purposes only.
          Projections are estimates based on available data. Actual payments depend on final MYA prices and county yields.
        </p>
        <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Generated by HarvestFile — harvestfile.com</p>
      </div>

      {/* ══ FLOATING CTA ══ */}
      {!isPaid && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,0,0,0.06)', padding: '12px 24px',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Unlock your complete report</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>7 additional sections with personalized analysis</p>
            </div>
            <button
              onClick={onUpgradeClick}
              style={{
                background: '#1B4332', color: 'white', fontWeight: 700, fontSize: 14,
                padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
              }}
            >
              Get Full Report — $39
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
