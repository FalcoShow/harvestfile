// =============================================================================
// HarvestFile — Deploy 4: Send Farm Brief Worker
// lib/inngest/functions/send-farm-brief.ts
//
// Triggered by: 'digest/farm-brief.send' events (fanned out from cron jobs)
// Pattern matches send-alert-email.ts — idempotency check, build, send, log.
//
// Each worker:
//   1. Idempotency check (no duplicate digest per subscriber per day)
//   2. Fetch personalized weather for subscriber's county
//   3. Calculate Marketing Score using shared market data
//   4. Render FarmBrief React Email template to HTML
//   5. Send via Resend with RFC 8058 one-click unsubscribe headers
//   6. Update subscriber send tracking
//
// Constraints:
//   - Inngest free plan: concurrency limit 5
//   - Resend Pro: 5 req/s rate limit → throttle: { limit: 2, period: '1s' }
//   - React Email: must use render() → html, NOT react: prop
// =============================================================================

import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createHmac } from 'crypto';
import FarmBrief from '@/components/emails/digest/FarmBrief';
import { calculateQuickScore, getScoreLabel } from '@/lib/services/marketing-score';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const BASE_URL = 'https://www.harvestfile.com';
const HMAC_SECRET = process.env.DIGEST_HMAC_SECRET || process.env.LEAD_JWT_SECRET || 'harvestfile-digest-hmac-secret';

// ── HMAC token for unsubscribe URLs ──────────────────────────────────────────

function generateUnsubscribeToken(subscriberId: string, email: string): string {
  const payload = `${subscriberId}:${email}:digest`;
  return createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('base64url');
}

// ── Weather fetcher (Open-Meteo) ─────────────────────────────────────────────

interface WeatherData {
  tempHigh: number | null;
  tempLow: number | null;
  condition: string;
  windSpeed: number | null;
  humidity: number | null;
  precipChance: number | null;
  sprayOk: boolean;
}

async function fetchWeather(countyFips: string | null, stateAbbr: string | null): Promise<WeatherData> {
  const defaultWeather: WeatherData = {
    tempHigh: null, tempLow: null, condition: 'Unknown',
    windSpeed: null, humidity: null, precipChance: null, sprayOk: false,
  };

  if (!countyFips) return defaultWeather;

  try {
    // Look up county coordinates
    const { data: coord } = await supabase
      .from('county_coordinates')
      .select('latitude, longitude')
      .eq('fips_code', countyFips)
      .single();

    if (!coord) return defaultWeather;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.latitude}&longitude=${coord.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&hourly=windspeed_10m,relativehumidity_2m&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&forecast_days=1`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return defaultWeather;

    const json = await res.json();
    const daily = json?.daily;
    const hourly = json?.hourly;

    if (!daily) return defaultWeather;

    const tempHigh = daily.temperature_2m_max?.[0] ?? null;
    const tempLow = daily.temperature_2m_min?.[0] ?? null;
    const precipChance = daily.precipitation_probability_max?.[0] ?? null;
    const weatherCode = daily.weathercode?.[0] ?? 0;

    // Average wind speed from morning hours (6-10 AM local)
    const winds: number[] = (hourly?.windspeed_10m || []).slice(6, 11).filter((w: number | null) => w !== null);
    const windSpeed = winds.length > 0 ? Math.round(winds.reduce((a: number, b: number) => a + b, 0) / winds.length) : null;

    // Average humidity from morning hours
    const humidities: number[] = (hourly?.relativehumidity_2m || []).slice(6, 11).filter((h: number | null) => h !== null);
    const humidity = humidities.length > 0 ? Math.round(humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length) : null;

    // WMO weather code → condition string
    const condition = weatherCodeToCondition(weatherCode);

    // Spray go/no-go: wind <10mph, no rain, temp 45-95F
    const sprayOk = (
      windSpeed !== null && windSpeed < 10 &&
      (precipChance === null || precipChance < 30) &&
      tempHigh !== null && tempHigh >= 45 && tempHigh <= 95
    );

    return { tempHigh, tempLow, condition, windSpeed, humidity, precipChance, sprayOk };
  } catch (err) {
    console.error('[FarmBrief] Weather fetch error:', err);
    return defaultWeather;
  }
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

// ── Subject line builder ─────────────────────────────────────────────────────
// Format: "Corn ▲$0.08 | Score: 72 — Apr 5"
// Under 40 chars, price-led, consistent format.

function buildSubjectLine(
  primaryCrop: string | null,
  marketData: { corn: { price: number | null; change: number | null }; soybeans: { price: number | null; change: number | null }; wheat: { price: number | null; change: number | null } },
  score: number,
  sendDate: string
): string {
  // Determine which commodity to feature in subject
  const cropKey = (primaryCrop || 'CORN').toUpperCase();
  let featuredName = 'Corn';
  let featuredChange = marketData.corn.change;

  if (cropKey === 'SOYBEANS' || cropKey === 'SOYBEAN') {
    featuredName = 'Beans';
    featuredChange = marketData.soybeans.change;
  } else if (cropKey === 'WHEAT' || cropKey.includes('WHEAT')) {
    featuredName = 'Wheat';
    featuredChange = marketData.wheat.change;
  } else {
    featuredName = 'Corn';
    featuredChange = marketData.corn.change;
  }

  // Format date: "Apr 6"
  const date = new Date(sendDate + 'T12:00:00Z');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}`;

  // Format price change
  let changeStr = '';
  if (featuredChange !== null) {
    const arrow = featuredChange >= 0 ? '▲' : '▼';
    changeStr = `${arrow}$${Math.abs(featuredChange).toFixed(2)}`;
  } else {
    changeStr = 'unch';
  }

  // "Corn ▲$0.08 | Score: 72 — Apr 6" (35-38 chars)
  return `${featuredName} ${changeStr} | Score: ${score} — ${dateStr}`;
}

// ── The worker function ──────────────────────────────────────────────────────

export const sendFarmBrief = inngest.createFunction(
  {
    id: 'send-farm-brief',
    name: 'Send Individual Farm Brief',
    retries: 3,
    concurrency: [{ limit: 5 }],
    throttle: { limit: 2, period: '1s' }, // Resend rate limit: 5 req/s, leave headroom
  },
  { event: 'digest/farm-brief.send' },
  async ({ event, step }) => {
    const {
      subscriberId,
      email,
      timezoneGroup,
      countyFips,
      countyName,
      stateAbbr,
      primaryCrop,
      preferences,
      marketData,
      sendDate,
    } = event.data;

    // Step 1: Idempotency — no duplicate digest per subscriber per day
    const idempotencyKey = `digest:${subscriberId}:${sendDate}`;

    const isDuplicate = await step.run('check-idempotency', async () => {
      const { data } = await supabase
        .from('notification_log')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .limit(1);
      return (data?.length || 0) > 0;
    });

    if (isDuplicate) {
      return { skipped: true, reason: 'already_sent_today', email };
    }

    // Step 2: Fetch personalized weather
    const weather = await step.run('fetch-weather', async () => {
      return fetchWeather(countyFips, stateAbbr);
    });

    // Step 3: Calculate Marketing Score for primary crop
    const scoreData = await step.run('calculate-score', async () => {
      const cropCode = (primaryCrop || 'CORN').toUpperCase();
      const cropKey = cropCode === 'SOYBEANS' || cropCode === 'SOYBEAN' ? 'soybeans'
        : cropCode.includes('WHEAT') ? 'wheat' : 'corn';

      const futuresPrice = marketData[cropKey as keyof typeof marketData]?.price ?? null;
      const deferredPrice = marketData[cropKey as keyof typeof marketData]?.deferred ?? null;

      const breakdown = calculateQuickScore(cropCode, futuresPrice, deferredPrice);
      const label = getScoreLabel(breakdown.composite);

      return {
        score: breakdown.composite,
        label: label.label,
        recommendation: label.recommendation,
        color: label.color,
      };
    });

    // Step 4: Render email
    const emailContent = await step.run('render-email', async () => {
      const unsubscribeToken = generateUnsubscribeToken(subscriberId, email);

      const html = await render(
        FarmBrief({
          countyName: countyName || 'Your County',
          stateAbbr: stateAbbr || '',
          primaryCrop: primaryCrop || 'CORN',
          cornPrice: marketData.corn.price,
          cornChange: marketData.corn.change,
          soybeansPrice: marketData.soybeans.price,
          soybeansChange: marketData.soybeans.change,
          wheatPrice: marketData.wheat.price,
          wheatChange: marketData.wheat.change,
          marketingScore: scoreData.score,
          scoreLabel: scoreData.label,
          scoreColor: scoreData.color,
          scoreRecommendation: scoreData.recommendation,
          tempHigh: weather.tempHigh,
          tempLow: weather.tempLow,
          weatherCondition: weather.condition,
          windSpeed: weather.windSpeed,
          precipChance: weather.precipChance,
          sprayOk: weather.sprayOk,
          sendDate,
          unsubscribeToken,
          subscriberId,
        })
      );

      const subject = buildSubjectLine(primaryCrop, marketData, scoreData.score, sendDate);

      // Preheader extends the subject with secondary data
      const secondaryCrop = primaryCrop?.toUpperCase() !== 'SOYBEANS' ? 'Beans' : 'Wheat';
      const secondaryPrice = primaryCrop?.toUpperCase() !== 'SOYBEANS'
        ? marketData.soybeans : marketData.wheat;
      const secondaryChange = secondaryPrice.change !== null
        ? `${secondaryPrice.change >= 0 ? '▲' : '▼'}$${Math.abs(secondaryPrice.change).toFixed(2)}`
        : 'unch';
      const preheader = `${secondaryCrop} ${secondaryChange} · ${weather.condition} ${weather.tempHigh ?? '--'}°F · Spray: ${weather.sprayOk ? 'GO' : 'NO-GO'}`;

      return { html, subject, preheader, unsubscribeToken };
    });

    // Step 5: Send via Resend with RFC 8058 headers
    const sendResult = await step.run('send-email', async () => {
      const unsubUrl = `${BASE_URL}/api/unsubscribe?token=${emailContent.unsubscribeToken}&id=${subscriberId}`;

      const { data, error } = await resend.emails.send({
        from: 'HarvestFile <morning@mail.harvestfile.com>',
        to: [email],
        subject: emailContent.subject,
        html: emailContent.html,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
      return { messageId: data?.id || null };
    });

    // Step 6: Log + update subscriber
    await step.run('log-and-update', async () => {
      // Log to notification_log for idempotency + analytics
      await supabase.from('notification_log').insert({
        user_id: subscriberId,
        commodity: primaryCrop || 'CORN',
        trigger_price: marketData.corn.price || 0,
        threshold_price: scoreData.score,
        idempotency_key: idempotencyKey,
        delivery_status: 'sent',
        external_id: sendResult.messageId,
      });

      // Update subscriber tracking
      // Fetch current send_count, increment, and update in one step
      const { data: currentSub } = await supabase
        .from('subscribers')
        .select('send_count')
        .eq('id', subscriberId)
        .single();

      await supabase
        .from('subscribers')
        .update({
          last_sent_at: new Date().toISOString(),
          send_count: (currentSub?.send_count || 0) + 1,
        })
        .eq('id', subscriberId);
    });

    return {
      sent: true,
      email,
      subject: emailContent.subject,
      score: scoreData.score,
      messageId: sendResult.messageId,
    };
  }
);
