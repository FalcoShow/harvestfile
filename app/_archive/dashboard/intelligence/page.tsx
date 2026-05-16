// =============================================================================
// HarvestFile - Intelligence Hub (Phase 3C: Upgraded)
// Features: Price Dashboard + County Autocomplete + Recharts + Enhanced UI
// Replace: app/dashboard/intelligence/page.tsx
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import PriceDashboard from '@/components/dashboard/PriceDashboard';
import CountyAutocomplete from '@/components/CountyAutocomplete';

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  dark: '#0C1F17', forest: '#1B4332', sage: '#40624D', muted: '#6B8F71',
  gold: '#C9A84C', goldBright: '#E2C366', goldDim: '#9E7E30',
  cream: '#FAFAF6', white: '#FFFFFF',
  text: '#111827', textSoft: '#6B7280', textMuted: '#9CA3AF',
  emerald: '#059669', emeraldLight: '#34D399', emeraldBg: '#ECFDF5',
  red: '#EF4444',
};

const STATES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

// Major ag states sorted first
const AG_STATES = ['IA','IL','NE','MN','IN','OH','SD','KS','ND','WI','MO','MI','TX','GA','AR','MS','NC','AL','KY','TN','OK','CO','MT','WA','OR','CA','ID','WY','PA','NY','VA','SC','LA','FL'];
const OTHER_STATES = Object.keys(STATES).filter(s => !AG_STATES.includes(s)).sort();
const ALL_STATES = [...AG_STATES, ...OTHER_STATES];

const REPORT_TYPES = [
  { id: 'market', name: 'Market Intelligence', emoji: '📊', desc: 'Commodity prices, trends, and market outlook' },
  { id: 'weather', name: 'Weather & Yield Impact', emoji: '🌦️', desc: '7-day forecast, growing conditions, yield risk' },
  { id: 'program', name: 'Program Optimization', emoji: '🏛️', desc: 'ARC vs PLC analysis with payment projections' },
  { id: 'seasonal', name: 'Seasonal Advisory', emoji: '📅', desc: 'Deadlines, planting windows, and action items' },
];

const CROPS = [
  { id: 'CORN', name: 'Corn', emoji: '🌽' },
  { id: 'SOYBEANS', name: 'Soybeans', emoji: '🫘' },
  { id: 'WHEAT', name: 'Wheat', emoji: '🌾' },
  { id: 'SORGHUM', name: 'Sorghum', emoji: '🌿' },
  { id: 'COTTON', name: 'Cotton', emoji: '☁️' },
  { id: 'RICE', name: 'Rice', emoji: '🍚' },
  { id: 'BARLEY', name: 'Barley', emoji: '🪴' },
  { id: 'OATS', name: 'Oats', emoji: '🌱' },
];

interface Report {
  id: string;
  report_type: string;
  state: string;
  county: string;
  crops: string[];
  status: string;
  created_at: string;
  content?: any;
}

export default function IntelligencePage() {
  // ─── State ───────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState('market');
  const [state, setState] = useState('OH');
  const [county, setCounty] = useState('');
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['CORN', 'SOYBEANS']);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);

  // ─── Fetch recent reports ────────────────────────────────────────
  useEffect(() => {
    async function loadReports() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('intelligence_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) setRecentReports(data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      }
    }
    loadReports();
  }, []);

  // ─── Toggle crop selection ───────────────────────────────────────
  const toggleCrop = (cropId: string) => {
    setSelectedCrops(prev =>
      prev.includes(cropId)
        ? prev.filter(c => c !== cropId)
        : [...prev, cropId]
    );
  };

  // ─── Generate report ────────────────────────────────────────────
  const generateReport = async () => {
    if (!state || !county || selectedCrops.length === 0) {
      setError('Please select state, county, and at least one crop.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/intelligence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: selectedType,
          state,
          county,
          crops: selectedCrops,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Add to recent reports
      if (data.report) {
        setRecentReports(prev => [data.report, ...prev].slice(0, 5));
      }

      setShowGenerator(false);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* ═══ HERO HEADER ═══ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            🧠
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
                Intelligence Hub
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                background: 'rgba(201,168,76,0.12)', color: C.gold,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Live
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              AI-powered market intelligence, weather analysis, and program optimization
            </p>
          </div>
        </div>
      </div>

      {/* ═══ PRICE DASHBOARD ═══ */}
      <div style={{ marginBottom: 32 }}>
        <PriceDashboard state={state} commodities={selectedCrops.length > 0 ? selectedCrops : ['CORN', 'SOYBEANS', 'WHEAT']} />
      </div>

      {/* ═══ GENERATE REPORT SECTION ═══ */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
        marginBottom: 32,
      }}>
        {/* Toggle Header */}
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          style={{
            width: '100%', padding: '20px 24px', cursor: 'pointer',
            background: showGenerator ? 'rgba(5,150,105,0.04)' : 'transparent',
            border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: showGenerator ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(201,168,76,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              ✨
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Generate New Report</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                AI analysis using real USDA data, weather forecasts, and market trends
              </div>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"
            style={{ transform: showGenerator ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Generator Form */}
        {showGenerator && (
          <div style={{ padding: 24 }}>
            {/* Report Type */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Report Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {REPORT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    style={{
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      border: selectedType === type.id
                        ? '1.5px solid rgba(5,150,105,0.4)'
                        : '1px solid rgba(255,255,255,0.06)',
                      background: selectedType === type.id
                        ? 'rgba(5,150,105,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      textAlign: 'left', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{type.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: selectedType === type.id ? C.emeraldLight : '#fff' }}>
                        {type.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
              {/* State */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setCounty('');
                  }}
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: 14, fontWeight: 500,
                    borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', color: '#fff',
                    outline: 'none', cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                  }}
                >
                  <option value="" style={{ background: C.dark }}>Select...</option>
                  <optgroup label="Major Ag States" style={{ background: C.dark }}>
                    {AG_STATES.map(s => (
                      <option key={s} value={s} style={{ background: C.dark }}>{STATES[s]} ({s})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other States" style={{ background: C.dark }}>
                    {OTHER_STATES.map(s => (
                      <option key={s} value={s} style={{ background: C.dark }}>{STATES[s]} ({s})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* County Autocomplete */}
              <CountyAutocomplete
                state={state}
                value={county}
                onChange={setCounty}
                darkMode={true}
              />
            </div>

            {/* Crops */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Crops
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CROPS.map(crop => {
                  const isSelected = selectedCrops.includes(crop.id);
                  return (
                    <button
                      key={crop.id}
                      onClick={() => toggleCrop(crop.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 100, cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                        border: isSelected ? '1.5px solid rgba(5,150,105,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        background: isSelected ? 'rgba(5,150,105,0.1)' : 'rgba(255,255,255,0.02)',
                        color: isSelected ? C.emeraldLight : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span>{crop.emoji}</span>
                      <span>{crop.name}</span>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 20 20" fill={C.emeraldLight}>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                fontSize: 13, color: C.red,
              }}>
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateReport}
              disabled={generating}
              style={{
                width: '100%', padding: '16px 24px', borderRadius: 14,
                background: generating ? C.sage : `linear-gradient(135deg, ${C.emerald}, ${C.forest})`,
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
                border: 'none', transition: 'all 0.3s',
                boxShadow: generating ? 'none' : '0 4px 20px rgba(5,150,105,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {generating ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 019.5 6.8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Generating Intelligence Report...
                </>
              ) : (
                <>
                  Generate Intelligence Report
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ═══ RECENT REPORTS ═══ */}
      {recentReports.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 14, letterSpacing: '-0.01em' }}>
            Recent Reports
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentReports.map(report => {
              const type = REPORT_TYPES.find(t => t.id === report.report_type);
              const isComplete = report.status === 'complete';
              const date = new Date(report.created_at);
              const timeAgo = getTimeAgo(date);

              return (
                <div key={report.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{type?.emoji || '📄'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                        {type?.name || 'Report'} — {report.county}, {report.state}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        {report.crops?.join(', ')} · {timeAgo}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                      background: isComplete ? 'rgba(5,150,105,0.1)' : 'rgba(201,168,76,0.1)',
                      color: isComplete ? C.emeraldLight : C.gold,
                    }}>
                      {isComplete ? '✓ Complete' : '⏳ Processing'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #0C1F17; color: #fff; }
      `}</style>
    </div>
  );
}

// ─── Time ago helper ─────────────────────────────────────────────────────────
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
