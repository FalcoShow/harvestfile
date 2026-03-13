// =============================================================================
// HarvestFile - Intelligence Report Generation API (Phase 3C)
// POST /api/intelligence/generate
// Uses cascading NASS price fallback (county → state → national)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NASS_KEY = process.env.NASS_API_KEY || '';
const NASS_BASE = 'https://quickstats.nass.usda.gov/api/api_GET/';

// ─── NASS Helpers ────────────────────────────────────────────────────────────

const COMMODITY_CONFIG: Record<string, { nass: string; priceUnit: string; yieldUnit: string; refPrice: number }> = {
  CORN:     { nass: 'CORN',           priceUnit: '$ / BU',  yieldUnit: 'BU / ACRE', refPrice: 4.10 },
  SOYBEANS: { nass: 'SOYBEANS',       priceUnit: '$ / BU',  yieldUnit: 'BU / ACRE', refPrice: 10.00 },
  WHEAT:    { nass: 'WHEAT',          priceUnit: '$ / BU',  yieldUnit: 'BU / ACRE', refPrice: 6.35 },
  SORGHUM:  { nass: 'SORGHUM',        priceUnit: '$ / BU',  yieldUnit: 'BU / ACRE', refPrice: 3.95 },
  BARLEY:   { nass: 'BARLEY',         priceUnit: '$ / BU',  yieldUnit: 'BU / ACRE', refPrice: 4.95 },
  OATS:     { nass: 'OATS',           priceUnit: '$ / BU',  yieldUnit: 'BU / ACRE', refPrice: 2.40 },
  RICE:     { nass: 'RICE',           priceUnit: '$ / CWT', yieldUnit: 'CWT / ACRE', refPrice: 14.00 },
  COTTON:   { nass: 'COTTON, UPLAND', priceUnit: '$ / LB',  yieldUnit: 'LB / ACRE', refPrice: 0.367 },
};

function cleanVal(v: string): number | null {
  if (!v || ['(D)','(Z)','(NA)','(S)','(X)'].includes(v.trim())) return null;
  const n = parseFloat(v.replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

async function fetchNass(params: Record<string, string>): Promise<any[]> {
  const url = new URL(NASS_BASE);
  url.searchParams.set('key', NASS_KEY);
  url.searchParams.set('format', 'JSON');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch { return []; }
}

// Cascading price fetch: county → state → national
async function fetchPricesWithFallback(commodity: string, state: string, county: string) {
  const config = COMMODITY_CONFIG[commodity];
  if (!config) return { prices: [], source: 'none' };

  // Try county
  let data = await fetchNass({
    source_desc: 'SURVEY', commodity_desc: config.nass,
    statisticcat_desc: 'PRICE RECEIVED', unit_desc: config.priceUnit,
    agg_level_desc: 'COUNTY', state_alpha: state, county_name: county.toUpperCase(),
    year__GE: '2018', year__LE: '2024',
  });
  let prices = data.map(d => ({ year: +d.year, price: cleanVal(d.Value) })).filter(d => d.price !== null);
  if (prices.length >= 3) return { prices, source: 'county' };

  // Try state
  data = await fetchNass({
    source_desc: 'SURVEY', commodity_desc: config.nass,
    statisticcat_desc: 'PRICE RECEIVED', unit_desc: config.priceUnit,
    agg_level_desc: 'STATE', state_alpha: state,
    year__GE: '2018', year__LE: '2024',
  });
  prices = data.map(d => ({ year: +d.year, price: cleanVal(d.Value) })).filter(d => d.price !== null);
  if (prices.length >= 2) return { prices, source: 'state' };

  // National fallback
  data = await fetchNass({
    source_desc: 'SURVEY', commodity_desc: config.nass,
    statisticcat_desc: 'PRICE RECEIVED', unit_desc: config.priceUnit,
    agg_level_desc: 'NATIONAL',
    year__GE: '2018', year__LE: '2024',
  });
  prices = data.map(d => ({ year: +d.year, price: cleanVal(d.Value) })).filter(d => d.price !== null);
  return { prices, source: 'national' };
}

// Fetch county yields
async function fetchYields(commodity: string, state: string, county: string) {
  const config = COMMODITY_CONFIG[commodity];
  if (!config) return [];

  const data = await fetchNass({
    source_desc: 'SURVEY', commodity_desc: config.nass,
    statisticcat_desc: 'YIELD', unit_desc: config.yieldUnit,
    agg_level_desc: 'COUNTY', state_alpha: state, county_name: county.toUpperCase(),
    year__GE: '2018', year__LE: '2024',
  });

  return data
    .map(d => ({ year: +d.year, value: cleanVal(d.Value) }))
    .filter(d => d.value !== null)
    .sort((a: any, b: any) => a.year - b.year);
}

// ─── Weather (Open-Meteo) ────────────────────────────────────────────────────

async function fetchWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America/New_York&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Simple geocoding for county centers
const COUNTY_COORDS: Record<string, { lat: number; lon: number }> = {
  'SUMMIT-OH': { lat: 41.1259, lon: -81.4408 },
  'WAYNE-OH': { lat: 40.8298, lon: -81.8879 },
  'STARK-OH': { lat: 40.8139, lon: -81.3657 },
  // Add more as needed, or use a geocoding API
};

async function getCountyCoords(county: string, state: string): Promise<{ lat: number; lon: number } | null> {
  const key = `${county.toUpperCase()}-${state.toUpperCase()}`;
  if (COUNTY_COORDS[key]) return COUNTY_COORDS[key];

  // Fallback: use Open-Meteo geocoding
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(county + ' County ' + state)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (data?.results?.[0]) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { report_type, state, county, crops } = await request.json();

    if (!state || !county || !crops?.length) {
      return NextResponse.json(
        { success: false, error: 'State, county, and crops are required' },
        { status: 400 }
      );
    }

    // ─── Fetch all data in parallel ──────────────────────────────────
    const cropDataPromises = crops.map(async (crop: string) => {
      const [priceResult, yields] = await Promise.all([
        fetchPricesWithFallback(crop, state, county),
        fetchYields(crop, state, county),
      ]);
      return {
        crop,
        prices: priceResult.prices,
        priceSource: priceResult.source,
        yields,
        referencePrice: COMMODITY_CONFIG[crop]?.refPrice || 0,
      };
    });

    const coords = await getCountyCoords(county, state);
    const weatherPromise = coords ? fetchWeather(coords.lat, coords.lon) : Promise.resolve(null);

    const [cropData, weather] = await Promise.all([
      Promise.all(cropDataPromises),
      weatherPromise,
    ]);

    // ─── Build data context for AI ───────────────────────────────────
    const dataContext = cropData.map((cd: any) => {
      const latestPrice = cd.prices.length > 0 ? cd.prices[cd.prices.length - 1] : null;
      const avgYield = cd.yields.length > 0
        ? (cd.yields.reduce((s: number, y: any) => s + y.value, 0) / cd.yields.length).toFixed(1)
        : 'N/A';

      return [
        `\n${cd.crop}:`,
        `  Latest Price: ${latestPrice ? `$${latestPrice.price} (${latestPrice.year})` : 'N/A'} [Source: ${cd.priceSource}-level]`,
        `  OBBBA Reference Price: $${cd.referencePrice}`,
        `  Price History: ${cd.prices.map((p: any) => `${p.year}: $${p.price}`).join(', ') || 'No data'}`,
        `  County Yield History: ${cd.yields.map((y: any) => `${y.year}: ${y.value}`).join(', ') || 'No data'}`,
        `  Average Yield: ${avgYield}`,
        `  Price vs Reference: ${latestPrice ? (latestPrice.price > cd.referencePrice ? 'ABOVE' : 'BELOW') : 'N/A'}`,
      ].join('\n');
    }).join('\n');

    const weatherContext = weather?.daily ? [
      '\nWEATHER FORECAST (7-day):',
      ...weather.daily.time.map((date: string, i: number) => {
        const hi = weather.daily.temperature_2m_max[i];
        const lo = weather.daily.temperature_2m_min[i];
        const precip = weather.daily.precipitation_sum[i];
        return `  ${date}: High ${Math.round(hi * 9/5 + 32)}°F / Low ${Math.round(lo * 9/5 + 32)}°F, Precip: ${precip}mm`;
      }),
    ].join('\n') : '\nWeather data: unavailable';

    // ─── Call Claude AI ──────────────────────────────────────────────
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });
    }

    const reportTypeLabels: Record<string, string> = {
      market: 'Market Intelligence Report',
      weather: 'Weather & Yield Impact Report',
      program: 'Program Optimization Report',
      seasonal: 'Seasonal Advisory Report',
    };

    const systemPrompt = `You are HarvestFile's agricultural intelligence AI. Generate a ${reportTypeLabels[report_type] || 'Intelligence Report'} for ${county} County, ${state}.

You have access to REAL USDA NASS data and NWS weather forecasts. Use this data to provide specific, actionable intelligence — not generic advice.

IMPORTANT: All price data below is REAL from USDA NASS. When prices come from "state-level" source, note this but still use them confidently — state prices are the standard reference.

Respond ONLY with a JSON object (no markdown, no backticks).`;

    const userPrompt = `Generate a ${reportTypeLabels[report_type]} for:
Location: ${county} County, ${state}
Crops: ${crops.join(', ')}

REAL USDA NASS DATA:
${dataContext}

${weatherContext}

Respond with this JSON structure:
{
  "title": "${reportTypeLabels[report_type]}",
  "subtitle": "${county} County, ${state}",
  "generated_at": "${new Date().toISOString()}",
  "executive_summary": "2-3 paragraph executive summary with specific numbers from the data above",
  "sections": [
    {
      "title": "Section title",
      "icon": "emoji",
      "content": "Detailed analysis using the real data provided",
      "highlights": ["Key point 1", "Key point 2"],
      "data_points": [
        { "label": "Metric name", "value": "Specific value", "trend": "up|down|stable" }
      ]
    }
  ],
  "action_items": [
    { "priority": "high|medium|low", "action": "Specific action to take", "deadline": "When to do it" }
  ],
  "market_outlook": "Brief market outlook based on the price data",
  "data_sources": ["USDA NASS Quick Stats", "Open-Meteo Weather API", "OBBBA Reference Prices"]
}

Use 3-5 sections depending on report type. Include specific dollar amounts, yield figures, and percentages from the real data.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Claude API error:', errText);
      return NextResponse.json({ success: false, error: 'AI generation failed' }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.content?.[0]?.text || '';

    // Parse AI response
    let reportContent;
    try {
      let cleaned = aiContent.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      reportContent = JSON.parse(cleaned.trim());
    } catch {
      reportContent = { raw_analysis: aiContent, parse_error: true };
    }

    // Attach raw data for charts
    reportContent.chart_data = {
      crops: cropData.map((cd: any) => ({
        crop: cd.crop,
        yields: cd.yields,
        prices: cd.prices,
        priceSource: cd.priceSource,
        referencePrice: cd.referencePrice,
      })),
      weather: weather?.daily || null,
    };

    // ─── Save to Supabase ────────────────────────────────────────────
    // Get current user from auth header or create anonymous
    const authHeader = request.headers.get('authorization');
    let userId = null;

    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id;
    }

    const { data: savedReport, error: saveError } = await supabaseAdmin
      .from('intelligence_reports')
      .insert({
        user_id: userId,
        report_type,
        state,
        county,
        crops,
        status: 'complete',
        content: reportContent,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      // Still return the report even if save fails
    }

    return NextResponse.json({
      success: true,
      report: savedReport || { id: 'temp-' + Date.now(), ...reportContent },
    });

  } catch (error: any) {
    console.error('Intelligence generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
