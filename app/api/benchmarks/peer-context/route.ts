// =============================================================================
// app/api/benchmarks/peer-context/route.ts
// HarvestFile — Phase 31 Build 4: Peer Context for Grain Marketing
//
// Returns county-level benchmark data formatted for the Grain Marketing
// Command Center's peer context sidebar. Consumes from the shared cross-tool
// data layer (lib/cross-tool/benchmark-context.ts).
//
// GET /api/benchmarks/peer-context?county_fips=39153&commodity=CORN
// =============================================================================

import { NextResponse } from 'next/server';
import {
  getBenchmarkContextForCounty,
  getCountyInfo,
} from '@/lib/cross-tool/benchmark-context';

export const revalidate = 14400; // 4-hour ISR cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countyFips = searchParams.get('county_fips');
  const commodity = searchParams.get('commodity') || 'ALL';

  // ── Validate ────────────────────────────────────────────────────────────
  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { success: false, error: 'Valid county_fips required (5-digit FIPS code)' },
      { status: 400 }
    );
  }

  try {
    // Fetch full benchmark context from the cross-tool data layer
    const context = await getBenchmarkContextForCounty(countyFips, commodity);

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'County not found' },
        { status: 404 }
      );
    }

    // ── Compute peer marketing context ──────────────────────────────────
    // Confidence level based on data density
    let confidenceLevel: 1 | 2 | 3 = 1;
    if (context.live_2026.total >= 20) confidenceLevel = 3;
    else if (context.live_2026.total >= 10) confidenceLevel = 2;

    // Determine data scope label
    let dataScope: 'county' | 'region' | 'state' = 'county';
    if (context.live_2026.total < 5) {
      dataScope = 'state'; // k-anonymity threshold not met
    }

    // Build the last 3 years of historical data for trend display
    const recentHistory = context.historical
      .filter((y) => y.year >= 2023)
      .slice(-3);

    // Year-over-year trend
    let yoyChange: number | null = null;
    if (recentHistory.length >= 2) {
      const prev = recentHistory[recentHistory.length - 2];
      const latest = recentHistory[recentHistory.length - 1];
      yoyChange = Math.round((latest.arc_pct - prev.arc_pct) * 10) / 10;
    }

    // ── Response ────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        county: context.county,
        commodity,

        // Election data
        election: {
          arc_co_pct: context.live_2026.arc_co_pct,
          plc_pct: context.live_2026.plc_pct,
          total_reporters: context.live_2026.total,
          is_visible: context.live_2026.is_visible,
        },

        // Insights
        insights: {
          dominant: context.insights.historical_dominant,
          avg_arc_pct: context.insights.historical_avg_arc_pct,
          trend: context.insights.trend_direction,
          most_recent_arc_pct: context.insights.most_recent_arc_pct,
          most_recent_year: context.insights.most_recent_year,
          summary: context.insights.summary,
        },

        // Historical trend (last 3 years)
        history: recentHistory.map((y) => ({
          year: y.year,
          arc_pct: y.arc_pct,
          plc_pct: y.plc_pct,
        })),
        yoy_change: yoyChange,

        // Social proof
        social_proof: {
          state_this_week: context.social_proof.state_this_week,
          state_total: context.social_proof.state_total,
          county_total: context.social_proof.county_total,
        },

        // Meta
        confidence_level: confidenceLevel,
        data_scope: dataScope,
      },
    });
  } catch (err) {
    console.error('[PeerContext] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
