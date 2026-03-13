// =============================================================================
// HarvestFile - Commodity Prices API (Phase 3C)
// GET /api/prices?state=OH&commodities=CORN,SOYBEANS,WHEAT
// Returns state-level prices with fallback chain for the price dashboard
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

const NASS_KEY = process.env.NASS_API_KEY || '';
const NASS_BASE = 'https://quickstats.nass.usda.gov/api/api_GET/';

const COMMODITY_CONFIG: Record<string, { nass: string; priceUnit: string; refPrice: number; unit: string }> = {
  CORN:     { nass: 'CORN',           priceUnit: '$ / BU',  refPrice: 4.10, unit: '/bu' },
  SOYBEANS: { nass: 'SOYBEANS',       priceUnit: '$ / BU',  refPrice: 10.00, unit: '/bu' },
  WHEAT:    { nass: 'WHEAT',          priceUnit: '$ / BU',  refPrice: 6.35, unit: '/bu' },
  SORGHUM:  { nass: 'SORGHUM',        priceUnit: '$ / BU',  refPrice: 3.95, unit: '/bu' },
  BARLEY:   { nass: 'BARLEY',         priceUnit: '$ / BU',  refPrice: 4.95, unit: '/bu' },
  OATS:     { nass: 'OATS',           priceUnit: '$ / BU',  refPrice: 2.40, unit: '/bu' },
  RICE:     { nass: 'RICE',           priceUnit: '$ / CWT', refPrice: 14.00, unit: '/cwt' },
  PEANUTS:  { nass: 'PEANUTS',        priceUnit: '$ / LB',  refPrice: 0.2675, unit: '/lb' },
  COTTON:   { nass: 'COTTON, UPLAND', priceUnit: '$ / LB',  refPrice: 0.367, unit: '/lb' },
};

function cleanValue(val: string): number | null {
  if (!val || ['(D)', '(Z)', '(NA)', '(S)', '(X)'].includes(val.trim())) return null;
  const num = parseFloat(val.replace(/,/g, '').trim());
  return isNaN(num) ? null : num;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state')?.toUpperCase() || 'OH';
  const commoditiesParam = searchParams.get('commodities') || 'CORN,SOYBEANS,WHEAT';
  const commodities = commoditiesParam.split(',').map(c => c.trim().toUpperCase());

  try {
    const results: Record<string, any> = {};

    await Promise.all(
      commodities.map(async (commodity) => {
        const config = COMMODITY_CONFIG[commodity];
        if (!config) return;

        // Fetch state-level prices (reliable, always available)
        const url = new URL(NASS_BASE);
        url.searchParams.set('key', NASS_KEY);
        url.searchParams.set('format', 'JSON');
        url.searchParams.set('source_desc', 'SURVEY');
        url.searchParams.set('commodity_desc', config.nass);
        url.searchParams.set('statisticcat_desc', 'PRICE RECEIVED');
        url.searchParams.set('unit_desc', config.priceUnit);
        url.searchParams.set('agg_level_desc', 'STATE');
        url.searchParams.set('state_alpha', state);
        url.searchParams.set('year__GE', '2017');
        url.searchParams.set('year__LE', '2024');

        const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
        if (!res.ok) return;

        const data = await res.json();
        const prices = (data?.data || [])
          .map((d: any) => {
            const val = cleanValue(d.Value);
            return val !== null ? { year: +d.year, price: val } : null;
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.year - b.year);

        const latestPrice = prices.length > 0 ? prices[prices.length - 1].price : null;
        const previousPrice = prices.length > 1 ? prices[prices.length - 2].price : null;
        const change = latestPrice && previousPrice
          ? Math.round((latestPrice - previousPrice) / previousPrice * 10000) / 100
          : null;

        results[commodity] = {
          commodity,
          prices,
          latestPrice,
          previousPrice,
          changePercent: change,
          referencePrice: config.refPrice,
          unit: config.unit,
          aboveRef: latestPrice ? latestPrice > config.refPrice : null,
          state,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: results, state, timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err: any) {
    console.error('Price dashboard error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
