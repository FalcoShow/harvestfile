// =============================================================================
// lib/services/report-engine.ts
// HarvestFile AI Report Engine — The Core Intelligence
// Orchestrates data fetching → analysis → AI generation for 3 report types
// =============================================================================

import { nassService } from './usda-nass';
import { weatherService, type AgWeatherForecast, type HistoricalWeatherSummary, type PlantingWindow } from './weather';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ReportRequest {
  report_type: 'market_intelligence' | 'crop_planner' | 'weather_risk' | 'full_analysis';
  state: string;
  county: string;
  crops: string[];           // ['CORN', 'SOYBEANS']
  acres?: number;
  latitude?: number;
  longitude?: number;
  additional_context?: string; // User's specific questions
}

export interface GeneratedReport {
  id: string;
  type: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  data_sources: DataSource[];
  generated_at: string;
  generation_time_ms: number;
  model: string;
  tokens_used: number;
  raw_markdown: string;
}

export interface ReportSection {
  id: string;
  title: string;
  icon: string;
  content: string;          // Markdown content
  data?: any;               // Structured data for charts
  priority: number;         // 1 = highest
}

export interface DataSource {
  source: string;
  endpoint: string;
  fetched_at: string;
  records: number;
}

// ── Data Collection ─────────────────────────────────────────────────────────

interface CollectedData {
  prices: Record<string, Array<{ year: number; price: number | null; unit: string }>>;
  yields: Record<string, Array<{ year: number; yield: number | null; unit: string; production: number | null; acres_harvested: number | null }>>;
  nationalPrices: Record<string, Array<{ year: number; month: string; price: number | null; unit: string }>>;
  forecast?: AgWeatherForecast;
  historical?: HistoricalWeatherSummary;
  plantingWindows?: PlantingWindow[];
  rents?: Array<{ year: number; rent_cropland: number | null; rent_pasture: number | null }>;
  sources: DataSource[];
}

async function collectData(req: ReportRequest): Promise<CollectedData> {
  const sources: DataSource[] = [];
  const data: CollectedData = {
    prices: {},
    yields: {},
    nationalPrices: {},
    sources,
  };

  const startTime = Date.now();

  // ── Always fetch prices and yields for requested crops ──
  const pricePromises = req.crops.map(async (crop) => {
    try {
      const prices = await nassService.getCropPrices({
        commodity: crop,
        state: req.state,
      });
      data.prices[crop] = prices;
      sources.push({
        source: 'USDA NASS',
        endpoint: `quickstats/prices/${crop}/${req.state}`,
        fetched_at: new Date().toISOString(),
        records: prices.length,
      });
    } catch (e) {
      console.error(`Failed to fetch prices for ${crop}:`, e);
      data.prices[crop] = [];
    }
  });

  const yieldPromises = req.crops.map(async (crop) => {
    try {
      const yields = await nassService.getCountyYields({
        commodity: crop,
        state: req.state,
        county: req.county,
      });
      data.yields[crop] = yields;
      sources.push({
        source: 'USDA NASS',
        endpoint: `quickstats/yields/${crop}/${req.state}/${req.county}`,
        fetched_at: new Date().toISOString(),
        records: yields.length,
      });
    } catch (e) {
      console.error(`Failed to fetch yields for ${crop}:`, e);
      data.yields[crop] = [];
    }
  });

  // ── National monthly prices for market context ──
  const nationalPricePromises = req.crops.map(async (crop) => {
    try {
      const prices = await nassService.getNationalMonthlyPrices({ commodity: crop });
      data.nationalPrices[crop] = prices;
    } catch (e) {
      data.nationalPrices[crop] = [];
    }
  });

  // ── Weather data (if lat/lng available) ──
  let weatherPromise: Promise<void> | null = null;
  let historyPromise: Promise<void> | null = null;
  let plantingPromise: Promise<void> | null = null;

  if (req.latitude && req.longitude) {
    weatherPromise = (async () => {
      try {
        data.forecast = await weatherService.getAgForecast(req.latitude!, req.longitude!);
        sources.push({
          source: 'Open-Meteo',
          endpoint: 'forecast',
          fetched_at: new Date().toISOString(),
          records: data.forecast.daily.length,
        });
      } catch (e) {
        console.error('Failed to fetch weather forecast:', e);
      }
    })();

    if (req.report_type === 'weather_risk' || req.report_type === 'full_analysis' || req.report_type === 'crop_planner') {
      historyPromise = (async () => {
        try {
          data.historical = await weatherService.getHistoricalWeather({
            lat: req.latitude!,
            lng: req.longitude!,
          });
          sources.push({
            source: 'Open-Meteo ERA5',
            endpoint: 'historical',
            fetched_at: new Date().toISOString(),
            records: data.historical.annual_summaries.length,
          });
        } catch (e) {
          console.error('Failed to fetch historical weather:', e);
        }
      })();

      plantingPromise = (async () => {
        try {
          data.plantingWindows = await weatherService.analyzePlantingWindows({
            lat: req.latitude!,
            lng: req.longitude!,
            crops: req.crops,
          });
        } catch (e) {
          console.error('Failed to analyze planting windows:', e);
        }
      })();
    }
  }

  // ── Land rent data ──
  const rentPromise = (async () => {
    try {
      data.rents = await nassService.getCountyRentValues({
        state: req.state,
        county: req.county,
      });
    } catch (e) {
      data.rents = [];
    }
  })();

  // Wait for all data
  await Promise.all([
    ...pricePromises,
    ...yieldPromises,
    ...nationalPricePromises,
    weatherPromise,
    historyPromise,
    plantingPromise,
    rentPromise,
  ].filter(Boolean));

  console.log(`Data collection completed in ${Date.now() - startTime}ms — ${sources.length} sources`);
  return data;
}


// ── Prompt Building ─────────────────────────────────────────────────────────

function buildDataContext(req: ReportRequest, data: CollectedData): string {
  let context = `## Farm Profile\n`;
  context += `- **Location:** ${req.county} County, ${req.state}\n`;
  context += `- **Crops:** ${req.crops.join(', ')}\n`;
  if (req.acres) context += `- **Total Acres:** ${req.acres.toLocaleString()}\n`;
  context += `\n`;

  // Price data
  context += `## Historical Crop Prices (${req.state}, $/bu, Marketing Year Average)\n`;
  for (const [crop, prices] of Object.entries(data.prices)) {
    if (prices.length === 0) continue;
    context += `### ${crop}\n`;
    context += `| Year | Price |\n|------|-------|\n`;
    for (const p of prices) {
      context += `| ${p.year} | ${p.price !== null ? `$${p.price.toFixed(2)}` : 'N/A'} |\n`;
    }
    context += `\n`;
  }

  // Yield data
  context += `## County Yield History (${req.county} County, ${req.state})\n`;
  for (const [crop, yields] of Object.entries(data.yields)) {
    if (yields.length === 0) continue;
    context += `### ${crop}\n`;
    context += `| Year | Yield (bu/ac) | Acres Harvested | Production |\n|------|--------------|----------------|------------|\n`;
    for (const y of yields) {
      context += `| ${y.year} | ${y.yield?.toFixed(1) ?? 'N/A'} | ${y.acres_harvested?.toLocaleString() ?? 'N/A'} | ${y.production?.toLocaleString() ?? 'N/A'} |\n`;
    }
    context += `\n`;
  }

  // National price trends
  context += `## Recent National Monthly Prices\n`;
  for (const [crop, prices] of Object.entries(data.nationalPrices)) {
    if (prices.length === 0) continue;
    context += `### ${crop}\n`;
    const recent = prices.slice(-6);
    context += `| Month | Price |\n|-------|-------|\n`;
    for (const p of recent) {
      context += `| ${p.month} ${p.year} | ${p.price !== null ? `$${p.price.toFixed(2)}` : 'N/A'} |\n`;
    }
    context += `\n`;
  }

  // Weather forecast
  if (data.forecast) {
    const f = data.forecast;
    context += `## 16-Day Weather Forecast\n`;
    context += `| Date | High°F | Low°F | Precip (mm) | GDD | Frost Risk |\n|------|--------|-------|-------------|-----|------------|\n`;
    for (const d of f.daily.slice(0, 10)) {
      context += `| ${d.date} | ${d.temp_max_f} | ${d.temp_min_f} | ${d.precipitation_mm} | ${d.gdd_base50} | ${d.frost_risk ? '⚠️ YES' : 'No'} |\n`;
    }
    context += `\n**Summary:** ${f.hourly_summary.growing_degree_days} GDD total, ${f.hourly_summary.total_precipitation_mm}mm total precip, ${f.hourly_summary.frost_risk_hours} frost-risk hours\n\n`;

    // Soil conditions
    if (f.soil.length > 0) {
      const soil = f.soil[0];
      context += `## Current Soil Conditions\n`;
      context += `- Soil temp (2"): ${soil.soil_temp_2in_f}°F\n`;
      context += `- Soil temp (6"): ${soil.soil_temp_6in_f}°F\n`;
      context += `- Soil moisture (0-4"): ${soil.soil_moisture_0_4in} m³/m³\n`;
      context += `- Soil moisture (4-16"): ${soil.soil_moisture_4_16in} m³/m³\n\n`;
    }

    // Alerts
    if (f.alerts.length > 0) {
      context += `## Active Weather Alerts\n`;
      for (const a of f.alerts) {
        context += `- **${a.event}** (${a.severity}): ${a.headline}\n`;
      }
      context += `\n`;
    }
  }

  // Historical climate
  if (data.historical) {
    const h = data.historical;
    context += `## 10-Year Climate History\n`;
    context += `- Avg annual precipitation: ${h.climate_normals.avg_annual_precip_mm}mm (${(h.climate_normals.avg_annual_precip_mm / 25.4).toFixed(1)} inches)\n`;
    context += `- Avg growing season: ${h.climate_normals.avg_growing_season_days} frost-free days\n`;
    context += `- Avg last spring frost: ${h.climate_normals.avg_last_frost}\n`;
    context += `- Avg first fall frost: ${h.climate_normals.avg_first_frost}\n`;
    context += `- Avg GDD accumulation (base 50°F): ${h.climate_normals.avg_gdd_accumulation}\n\n`;

    context += `| Year | Precip (in) | Avg Temp°F | Frost-Free Days | GDD | Drought Days |\n|------|-------------|-----------|----------------|-----|-------------|\n`;
    for (const s of h.annual_summaries) {
      context += `| ${s.year} | ${(s.total_precip_mm / 25.4).toFixed(1)} | ${s.avg_temp_f} | ${s.frost_free_days} | ${s.total_gdd_base50} | ${s.drought_days} |\n`;
    }
    context += `\n`;
  }

  // Planting windows
  if (data.plantingWindows && data.plantingWindows.length > 0) {
    context += `## Planting Window Analysis\n`;
    for (const w of data.plantingWindows) {
      context += `### ${w.crop}\n`;
      context += `- Optimal window: ${w.optimal_start} – ${w.optimal_end}\n`;
      context += `- Soil temp: ${w.soil_temp_current_f}°F (needs ${w.soil_temp_needed_f}°F) — ${w.soil_temp_ready ? 'READY' : 'NOT READY'}\n`;
      context += `- Frost risk: ${w.frost_risk_level}\n`;
      context += `- Days until safe: ${w.days_until_safe}\n`;
      context += `- Confidence: ${w.confidence}%\n`;
      context += `- ${w.recommendation}\n\n`;
    }
  }

  // Rent data
  if (data.rents && data.rents.length > 0) {
    context += `## Cash Rent (${req.county} County)\n`;
    context += `| Year | Cropland $/ac | Pasture $/ac |\n|------|--------------|-------------|\n`;
    for (const r of data.rents) {
      context += `| ${r.year} | ${r.rent_cropland ? `$${r.rent_cropland}` : 'N/A'} | ${r.rent_pasture ? `$${r.rent_pasture}` : 'N/A'} |\n`;
    }
    context += `\n`;
  }

  return context;
}


function buildSystemPrompt(reportType: string): string {
  const basePrompt = `You are HarvestFile's AI Agricultural Intelligence Engine — the most advanced farm advisory system ever built. You generate ACTIONABLE, DATA-DRIVEN reports that tell farmers exactly what to DO with specific dates, dollar amounts, and confidence levels.

CRITICAL RULES:
1. ALWAYS cite specific numbers from the data provided — never make up statistics
2. ALWAYS give specific action items with dates and dollar amounts when possible
3. Calculate breakeven prices, profit margins, and ROI when data allows
4. Compare current conditions to historical averages
5. Flag risks with severity levels (LOW / MODERATE / HIGH / CRITICAL)
6. Write in clear, direct language — farmers are busy, not stupid
7. Every section must end with a concrete recommendation
8. Use bullet points for action items, tables for data comparisons
9. If data is missing or suppressed, say so honestly — never fabricate numbers

Format your response as a structured report with clear section headers using ## markdown headers.
Start with a 2-3 sentence executive summary that captures the single most important insight.`;

  const typePrompts: Record<string, string> = {
    market_intelligence: `${basePrompt}

You are generating a MARKET INTELLIGENCE REPORT. Focus on:
- Current price trends vs. historical averages (is this high or low?)
- Price momentum — are prices trending up or down?
- Breakeven analysis based on county yields and current prices
- Optimal marketing timing recommendations
- Revenue projections at current vs. historical prices
- National supply/demand context explaining price movements

Structure: Executive Summary → Price Analysis → Breakeven Calculator → Marketing Strategy → Revenue Projections → Risk Factors`,

    crop_planner: `${basePrompt}

You are generating a CROP PLANNING REPORT. Focus on:
- Planting window analysis based on soil temperature and frost data
- Crop selection optimization based on price trends and yield history
- Acreage allocation recommendations (what % of acres to each crop)
- Seed variety timing recommendations
- Input cost considerations
- Crop rotation benefits based on yield history

Structure: Executive Summary → Planting Windows → Crop Mix Optimization → Yield Projections → Input Planning → Timeline & Action Items`,

    weather_risk: `${basePrompt}

You are generating a WEATHER RISK ANALYSIS. Focus on:
- Current conditions and 16-day outlook for field operations
- Frost and freeze risk assessment with specific dates
- Drought risk based on soil moisture and precipitation forecast
- Heat stress risk for crops
- Historical weather patterns and what they mean for this season
- Growing degree day accumulation and what it means for crop development
- Severe weather alerts and their operational impact

Structure: Executive Summary → Current Conditions → 14-Day Operations Outlook → Seasonal Risk Assessment → Historical Comparison → GDD Analysis → Action Items`,

    full_analysis: `${basePrompt}

You are generating a COMPREHENSIVE FARM INTELLIGENCE REPORT — the most complete analysis possible combining market, crop, and weather data. This is the flagship report. Make it exceptional.

Structure: Executive Summary → Market Intelligence → Weather Outlook → Planting Strategy → Financial Projections → Risk Matrix → 30/60/90-Day Action Plan`,
  };

  return typePrompts[reportType] || typePrompts.full_analysis;
}


function buildUserPrompt(req: ReportRequest, dataContext: string): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `Generate a ${req.report_type.replace(/_/g, ' ')} report for a farm in ${req.county} County, ${req.state}.

**Today's Date:** ${today}
**Crops:** ${req.crops.join(', ')}
${req.acres ? `**Total Acres:** ${req.acres.toLocaleString()}` : ''}

${req.additional_context ? `**Farmer's Specific Questions:** ${req.additional_context}\n` : ''}

Here is all the data collected from USDA NASS, Open-Meteo weather, and other government sources:

${dataContext}

Generate the report now. Make every recommendation specific and actionable. Include dollar amounts where data allows. This farmer is making real decisions with real money — make this worth their time.`;
}


// ═════════════════════════════════════════════════════════════════════════════
// MAIN REPORT GENERATION FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

export async function generateIntelligenceReport(req: ReportRequest): Promise<GeneratedReport> {
  const startTime = Date.now();
  const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[${reportId}] Starting ${req.report_type} report for ${req.county}, ${req.state}`);

  // Step 1: Collect all data
  console.log(`[${reportId}] Collecting data...`);
  const data = await collectData(req);

  // Step 2: Build context for AI
  const dataContext = buildDataContext(req, data);
  const systemPrompt = buildSystemPrompt(req.report_type);
  const userPrompt = buildUserPrompt(req, dataContext);

  console.log(`[${reportId}] Context size: ~${Math.round(userPrompt.length / 4)} tokens`);

  // Step 3: Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  // Choose model based on report complexity
  const model = req.report_type === 'full_analysis' 
    ? 'claude-sonnet-4-20250514'
    : 'claude-sonnet-4-20250514';

  console.log(`[${reportId}] Calling ${model}...`);

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`[${reportId}] Claude API error:`, errorText);
    throw new Error(`AI generation failed: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const rawMarkdown = aiData.content?.[0]?.text || '';
  const tokensUsed = (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0);

  console.log(`[${reportId}] Generated ${rawMarkdown.length} chars, ${tokensUsed} tokens`);

  // Step 4: Parse markdown into sections
  const sections = parseMarkdownSections(rawMarkdown, req.report_type);

  // Step 5: Extract executive summary (first paragraph or first section)
  const summary = extractSummary(rawMarkdown);

  // Step 6: Build title
  const titles: Record<string, string> = {
    market_intelligence: `Market Intelligence: ${req.crops.join(' & ')} — ${req.county} County, ${req.state}`,
    crop_planner: `Crop Planning Report: ${req.county} County, ${req.state} — ${new Date().getFullYear()} Season`,
    weather_risk: `Weather Risk Analysis: ${req.county} County, ${req.state}`,
    full_analysis: `Complete Farm Intelligence: ${req.county} County, ${req.state}`,
  };

  const generationTime = Date.now() - startTime;
  console.log(`[${reportId}] Complete in ${generationTime}ms`);

  return {
    id: reportId,
    type: req.report_type,
    title: titles[req.report_type] || 'Intelligence Report',
    summary,
    sections,
    data_sources: data.sources,
    generated_at: new Date().toISOString(),
    generation_time_ms: generationTime,
    model,
    tokens_used: tokensUsed,
    raw_markdown: rawMarkdown,
  };
}


// ── Helpers ─────────────────────────────────────────────────────────────────

function parseMarkdownSections(markdown: string, reportType: string): ReportSection[] {
  const sectionIcons: Record<string, string> = {
    'executive summary': '📊',
    'price analysis': '💰',
    'market intelligence': '📈',
    'breakeven': '🎯',
    'marketing strategy': '🏪',
    'revenue': '💵',
    'risk': '⚠️',
    'planting': '🌱',
    'crop mix': '🌾',
    'yield': '📐',
    'input': '🛒',
    'timeline': '📅',
    'action': '✅',
    'weather': '🌤️',
    'current conditions': '🌡️',
    'forecast': '☁️',
    'outlook': '🔮',
    'frost': '❄️',
    'drought': '🏜️',
    'gdd': '🌡️',
    'growing degree': '🌡️',
    'historical': '📜',
    'financial': '💹',
    'soil': '🪱',
    'seasonal': '📅',
    'operations': '🚜',
  };

  // Split by ## headers
  const parts = markdown.split(/^## /gm).filter(Boolean);
  const sections: ReportSection[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const firstNewline = part.indexOf('\n');
    const title = firstNewline > -1 ? part.substring(0, firstNewline).trim() : part.trim();
    const content = firstNewline > -1 ? part.substring(firstNewline + 1).trim() : '';

    if (!content && !title) continue;

    // Find best icon match
    const titleLower = title.toLowerCase();
    let icon = '📄';
    for (const [keyword, emoji] of Object.entries(sectionIcons)) {
      if (titleLower.includes(keyword)) {
        icon = emoji;
        break;
      }
    }

    sections.push({
      id: `section_${i}`,
      title,
      icon,
      content: content || title,
      priority: i + 1,
    });
  }

  return sections;
}

function extractSummary(markdown: string): string {
  // Try to find executive summary section
  const execMatch = markdown.match(/## Executive Summary\n+([\s\S]*?)(?=\n## |$)/i);
  if (execMatch) {
    return execMatch[1].trim().split('\n\n')[0].substring(0, 500);
  }
  
  // Fall back to first paragraph
  const firstPara = markdown.split('\n\n')[0];
  return firstPara?.replace(/^#+\s+/gm, '').trim().substring(0, 500) || 'Report generated successfully.';
}


// ── Export ───────────────────────────────────────────────────────────────────
export { collectData, buildDataContext };
