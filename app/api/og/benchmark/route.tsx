// =============================================================================
// HarvestFile — Phase 30 Build 2: County Benchmark Share Card Generator
// GET /api/og/benchmark?county=39037&commodity=CORN
//
// Generates a 1200×630 PNG card showing:
//   - County name + state
//   - ARC-CO vs PLC percentage bar
//   - Submission count
//   - HarvestFile branding + CTA
//
// Used for:
//   - SMS/iMessage link previews when farmers share county benchmark URLs
//   - Facebook/Twitter social cards
//   - County SEO page OG images (can point here)
//
// Edge runtime for fast generation (~50ms)
// =============================================================================

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const countyFips = searchParams.get('county') || '';
  const commodity = (searchParams.get('commodity') || 'ALL').toUpperCase();
  const year = parseInt(searchParams.get('year') || '2026');

  // Default values
  let countyName = 'Unknown County';
  let stateAbbr = '';
  let arcPct: number | null = null;
  let plcPct: number | null = null;
  let totalCount = 0;
  let isVisible = false;

  try {
    // Fetch county name
    if (countyFips && /^\d{5}$/.test(countyFips)) {
      const { data: countyRow } = await supabase
        .from('counties')
        .select('display_name, state_fips')
        .eq('county_fips', countyFips)
        .single();

      if (countyRow) {
        countyName = countyRow.display_name || countyFips;

        const { data: stateRow } = await supabase
          .from('states')
          .select('abbreviation')
          .eq('state_fips', countyRow.state_fips)
          .single();

        stateAbbr = stateRow?.abbreviation || '';
      }

      // Fetch benchmark data
      let query = supabase
        .from('county_benchmark_cache')
        .select('arc_co_count, plc_count, total_count, arc_co_pct, plc_pct, is_visible')
        .eq('county_fips', countyFips)
        .eq('program_year', year);

      if (commodity !== 'ALL') {
        query = query.eq('commodity_code', commodity);
      }

      const { data: benchmarks } = await query;

      if (benchmarks && benchmarks.length > 0) {
        // Aggregate across commodities
        let totalArc = 0;
        let totalPlc = 0;
        let total = 0;
        let anyVisible = false;

        for (const b of benchmarks) {
          totalArc += b.arc_co_count || 0;
          totalPlc += b.plc_count || 0;
          total += b.total_count || 0;
          if (b.is_visible) anyVisible = true;
        }

        totalCount = total;
        isVisible = anyVisible;

        if (isVisible && total > 0) {
          arcPct = Math.round((totalArc / total) * 1000) / 10;
          plcPct = Math.round((totalPlc / total) * 1000) / 10;
        }
      }
    }
  } catch {
    // Use defaults
  }

  const hasData = isVisible && arcPct !== null;
  const displayName = stateAbbr ? `${countyName}, ${stateAbbr}` : countyName;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          background: 'linear-gradient(145deg, #0a0f0d 0%, #0C1F17 40%, #142B21 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
              }}
            >
              {year} ARC/PLC Election Benchmark
            </span>
          </div>

          {/* County name */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            {displayName}
          </div>

          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 500,
            }}
          >
            {hasData
              ? `Based on ${totalCount} farmer${totalCount !== 1 ? 's' : ''} reporting`
              : 'Be among the first to share your election'}
          </div>
        </div>

        {/* Middle: Bar chart or CTA */}
        {hasData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, color: '#10b981' }}>
                  {arcPct}%
                </span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(16,185,129,0.6)' }}>
                  ARC-CO
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(59,130,246,0.6)' }}>
                  PLC
                </span>
                <span style={{ fontSize: '40px', fontWeight: 800, color: '#3b82f6' }}>
                  {plcPct}%
                </span>
              </div>
            </div>

            {/* Bar */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '32px',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${arcPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                }}
              />
              <div
                style={{
                  width: `${plcPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                }}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
              Share your election to unlock the benchmark for {countyName}
            </span>
          </div>
        )}

        {/* Bottom: CTA + Branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(16,185,129,0.8)' }}>
              See your county&apos;s benchmark →
            </span>
          </div>

          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #C9A84C, #E2C366)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: '#0C1F17',
              }}
            >
              H
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              HarvestFile
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
