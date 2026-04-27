'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

// =============================================================================
// HarvestFile — /planner page
// Surface 3: Farm Financial Planner — announcement & waitlist surface
// Built April 28, 2026. Replaces previous "Coming Soon" placeholder.
// =============================================================================

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate'

type Module = {
  id: string
  name: string
  ship: string
  tagline: string
  capabilities: string[]
  preview: 'cashflow' | 'breakeven' | 'score' | 'insurance'
}

const MODULES: Module[] = [
  {
    id: 'cashflow',
    name: 'Cash Flow Forecaster',
    ship: 'Ships August 2026',
    tagline:
      'Forecast 18 months of cash flow by month, with ARC/PLC payments, input costs, and debt service auto-mapped.',
    capabilities: [
      'Month-by-month cash position',
      'ARC/PLC payment timing modeled in',
      'Input cost calendar by crop',
      'Sensitivity to commodity price scenarios',
    ],
    preview: 'cashflow',
  },
  {
    id: 'breakeven',
    name: 'Breakeven Calculator',
    ship: 'Ships September 2026',
    tagline:
      'Per-acre breakeven for every crop on your farm — automatically updated with current input prices and county yield data.',
    capabilities: [
      'Real-time input cost integration',
      'County-specific yield assumptions',
      'Multi-scenario marketing comparison',
      'Print-ready breakeven sheet for the lender',
    ],
    preview: 'breakeven',
  },
  {
    id: 'score',
    name: 'Farm Score',
    ship: 'Ships October 2026',
    tagline:
      'A 0–850 score, like a credit score for farms. Built from financial discipline, marketing, risk, and operations.',
    capabilities: [
      'Six contributing factors, fully transparent',
      'Monthly score updates',
      'Anonymous peer benchmarking by county',
      'Lender-ready report on demand',
    ],
    preview: 'score',
  },
  {
    id: 'insurance',
    name: 'Crop Insurance Marketplace',
    ship: 'Ships Q4 2026',
    tagline:
      'Compare federal MPCI, hail, and supplemental coverage across providers. Find an agent — or work with the agent you already trust.',
    capabilities: [
      'All FCIC AIPs in one comparison',
      'SCO and ECO coverage modeling',
      'Agent matching by county',
      'One-click application handoff',
    ],
    preview: 'insurance',
  },
]

const TRUST = [
  'Your data stays yours',
  'Built by a sole founder in Ohio',
  'No advertising, no data sales, ever',
]

const SOFT_CTAS = [
  {
    href: '/check',
    label: 'Run your ARC/PLC numbers',
    sub: 'Live USDA data, every county, 60 seconds.',
  },
  {
    href: '/morning',
    label: 'Get the 5 AM Farm Brief',
    sub: 'Markets, basis, weather, spray windows — one email.',
  },
  {
    href: '/advisor',
    label: 'Ask the AI Farm Advisor',
    sub: 'Trained on OBBBA, RMA, and live commodity data.',
  },
]

// =============================================================================
// Module preview SVGs — schematic, brand-toned, no real numbers
// =============================================================================

function Preview({ kind }: { kind: Module['preview'] }) {
  const stroke = '#C9A84C'
  const dim = 'rgba(232, 240, 235, 0.22)'

  if (kind === 'cashflow') {
    return (
      <svg viewBox="0 0 240 100" className="w-full h-20" aria-hidden="true">
        {[20, 50, 80, 110, 140, 170, 200].map((x, i) => (
          <rect
            key={i}
            x={x}
            y={70 - (i % 3) * 8 - 10}
            width="14"
            height={(i % 3) * 8 + 10}
            fill={dim}
            rx="2"
          />
        ))}
        <polyline
          points="20,55 50,48 80,42 110,35 140,28 170,22 200,18 220,14"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="220" cy="14" r="3" fill={stroke} />
      </svg>
    )
  }

  if (kind === 'breakeven') {
    const rows = [
      { label: 'Corn', w: 180 },
      { label: 'Soy', w: 140 },
      { label: 'Wheat', w: 100 },
    ]
    return (
      <svg viewBox="0 0 240 100" className="w-full h-20" aria-hidden="true">
        {rows.map((r, i) => (
          <g key={i}>
            <rect
              x="40"
              y={20 + i * 22}
              width="180"
              height="10"
              fill={dim}
              rx="2"
            />
            <rect
              x="40"
              y={20 + i * 22}
              width={r.w}
              height="10"
              fill={stroke}
              rx="2"
              opacity="0.85"
            />
          </g>
        ))}
        <line
          x1="160"
          y1="10"
          x2="160"
          y2="90"
          stroke="#E2C366"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </svg>
    )
  }

  if (kind === 'score') {
    return (
      <svg viewBox="0 0 240 100" className="w-full h-20" aria-hidden="true">
        <path
          d="M 50 80 A 70 70 0 0 1 190 80"
          fill="none"
          stroke={dim}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 50 80 A 70 70 0 0 1 165 30"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <text
          x="120"
          y="72"
          textAnchor="middle"
          fill="#E8F0EB"
          fontSize="22"
          fontWeight="600"
          fontFamily="Bricolage Grotesque, sans-serif"
        >
          742
        </text>
      </svg>
    )
  }

  // insurance
  return (
    <svg viewBox="0 0 240 100" className="w-full h-20" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x="20"
            y={14 + i * 18}
            width="140"
            height="2"
            fill={dim}
            rx="1"
          />
          <circle
            cx="180"
            cy={15 + i * 18}
            r="4"
            fill={i < 3 ? stroke : 'transparent'}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <circle
            cx="205"
            cy={15 + i * 18}
            r="4"
            fill={i < 2 ? stroke : 'transparent'}
            stroke={stroke}
            strokeWidth="1.5"
          />
        </g>
      ))}
    </svg>
  )
}

// =============================================================================
// Page
// =============================================================================

export default function PlannerPage() {
  const [email, setEmail] = useState('')
  const [moduleInterest, setModuleInterest] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || status === 'submitting') return
    setStatus('submitting')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'planner_waitlist',
          module_interest: moduleInterest ?? null,
        }),
      })

      if (res.ok) {
        const json = await res.json().catch(() => ({}))
        setStatus(json.deduped ? 'duplicate' : 'success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  function notifyFor(moduleId: string) {
    setModuleInterest(moduleId)
    document
      .getElementById('waitlist')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main
      style={{ background: '#0C1F17', color: '#E8F0EB' }}
      className="min-h-screen"
    >
      {/* HERO */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full text-xs font-medium tracking-wide"
          style={{
            background: 'rgba(201, 168, 76, 0.12)',
            color: '#E2C366',
            border: '1px solid rgba(201, 168, 76, 0.3)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#C9A84C' }}
          />
          COMING Q3 2026
        </div>

        <h1
          className="text-5xl md:text-6xl font-semibold tracking-tight mb-6"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          Farm Financial Planner
        </h1>

        <p
          className="text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto"
          style={{ color: 'rgba(232, 240, 235, 0.78)' }}
        >
          Cash flow forecasting, breakeven analysis, a 0–850 Farm Score, and a
          crop insurance marketplace — built for the way row crop farmers
          actually plan.
        </p>

        <p
          className="mt-8 text-sm italic"
          style={{
            color: 'rgba(226, 195, 102, 0.85)',
            fontFamily: 'Instrument Serif, serif',
          }}
        >
          Early access goes out to the first 500 farmers and ag professionals on
          the waitlist.
        </p>
      </section>

      {/* MODULES */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="p-7 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: '#1B4332',
                border: '1px solid rgba(201, 168, 76, 0.18)',
              }}
            >
              <div className="mb-5">
                <Preview kind={m.preview} />
              </div>

              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <h3
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
                >
                  {m.name}
                </h3>
                <span
                  className="text-xs font-medium tracking-wide"
                  style={{ color: '#E2C366' }}
                >
                  {m.ship}
                </span>
              </div>

              <p
                className="mb-5 leading-relaxed"
                style={{ color: 'rgba(232, 240, 235, 0.78)' }}
              >
                {m.tagline}
              </p>

              <ul className="space-y-2 mb-6">
                {m.capabilities.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-3 text-sm"
                    style={{ color: 'rgba(232, 240, 235, 0.85)' }}
                  >
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: '#C9A84C' }}
                    />
                    {c}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => notifyFor(m.id)}
                className="text-sm font-medium transition-colors"
                style={{ color: '#E2C366' }}
              >
                Notify me when it ships →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* WAITLIST */}
      <section
        id="waitlist"
        className="px-6 py-20"
        style={{ background: 'rgba(27, 67, 50, 0.4)' }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-4"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Be first in line when the planner opens.
          </h2>
          <p
            className="text-lg mb-10"
            style={{ color: 'rgba(232, 240, 235, 0.78)' }}
          >
            One email. We send a single message the week before each module
            ships. Nothing else, ever.
          </p>

          {status === 'success' || status === 'duplicate' ? (
            <div
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(201, 168, 76, 0.1)',
                border: '1px solid rgba(201, 168, 76, 0.3)',
              }}
            >
              <p
                className="text-lg font-medium mb-1"
                style={{ color: '#E2C366' }}
              >
                {status === 'duplicate'
                  ? "You're already on the list."
                  : "You're on the list."}
              </p>
              <p
                className="text-sm"
                style={{ color: 'rgba(232, 240, 235, 0.7)' }}
              >
                We'll email you the week before launch.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourfarm.com"
                disabled={status === 'submitting'}
                className="flex-1 px-5 py-3.5 rounded-lg text-base focus:outline-none transition-colors"
                style={{
                  background: 'rgba(232, 240, 235, 0.06)',
                  border: '1px solid rgba(232, 240, 235, 0.18)',
                  color: '#E8F0EB',
                }}
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-7 py-3.5 rounded-lg font-semibold text-base transition-all disabled:opacity-60"
                style={{
                  background: '#C9A84C',
                  color: '#0C1F17',
                }}
              >
                {status === 'submitting' ? 'Joining…' : 'Join the waitlist →'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-4 text-sm" style={{ color: '#F4B400' }}>
              Something went wrong. Try again, or email hello@harvestfile.com
              directly.
            </p>
          )}
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="px-6 py-14">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center">
          {TRUST.map((t, i) => (
            <div key={t} className="flex items-center gap-3">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#C9A84C' }}
              />
              <span
                className="text-sm md:text-base font-medium"
                style={{ color: 'rgba(232, 240, 235, 0.85)' }}
              >
                {t}
              </span>
              {i < TRUST.length - 1 && (
                <span
                  className="hidden md:inline-block w-px h-4 ml-6"
                  style={{ background: 'rgba(232, 240, 235, 0.2)' }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SOFT CTAS */}
      <section className="px-6 pb-24 pt-8">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-center text-sm uppercase tracking-widest mb-8"
            style={{ color: 'rgba(232, 240, 235, 0.5)' }}
          >
            While you wait — start with what's live today
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {SOFT_CTAS.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className="block p-6 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: '#1B4332',
                  border: '1px solid rgba(201, 168, 76, 0.18)',
                }}
              >
                <div
                  className="text-base font-semibold mb-1.5"
                  style={{ color: '#E2C366' }}
                >
                  {cta.label} →
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: 'rgba(232, 240, 235, 0.7)' }}
                >
                  {cta.sub}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
