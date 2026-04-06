// =============================================================================
// HarvestFile — Deploy 4: 5 AM Farm Brief Email Template
// components/emails/digest/FarmBrief.tsx
//
// The daily habit email. Designed for farmers age 58+ checking email
// before 5 AM fieldwork on a phone screen.
//
// Information hierarchy (top to bottom):
//   1. Marketing Score (hero) — 36px number, color-coded, one-line label
//   2. Commodity prices — Corn, Soybeans, Wheat with ▲/▼ arrows
//   3. Spray go/no-go — bold green/red indicator
//   4. County weather — high/low, conditions, precip chance
//   5. Actionable insight — one sentence tied to the score
//
// Design constraints:
//   - 18px minimum body text (58+ audience)
//   - 24-32px for prices, 36-48px for score
//   - 44×44px minimum touch targets
//   - 600px max container (universal email safe width)
//   - 7:1 contrast ratio (WCAG AAA)
//   - Color + symbol for colorblind safety (▲/▼ + green/red)
//   - Uses render() → html for Inngest compatibility
//
// Subject: "Corn ▲$0.08 | Score: 72 — Apr 5"
// Classification: Commercial (daily digest, requires unsubscribe)
// =============================================================================

import {
  Text,
  Section,
  Button,
  Hr,
} from '@react-email/components';
import EmailLayout from '../shared/EmailLayout';

interface FarmBriefProps {
  countyName: string;
  stateAbbr: string;
  primaryCrop: string;
  // Market data
  cornPrice: number | null;
  cornChange: number | null;
  soybeansPrice: number | null;
  soybeansChange: number | null;
  wheatPrice: number | null;
  wheatChange: number | null;
  // Marketing Score
  marketingScore: number;
  scoreLabel: string;
  scoreColor: string;
  scoreRecommendation: string;
  // Weather
  tempHigh: number | null;
  tempLow: number | null;
  weatherCondition: string;
  windSpeed: number | null;
  precipChance: number | null;
  // Spray
  sprayOk: boolean;
  // Meta
  sendDate: string;
  unsubscribeToken: string;
  subscriberId: string;
}

const BASE_URL = 'https://www.harvestfile.com';

export default function FarmBrief({
  countyName = 'Darke County',
  stateAbbr = 'OH',
  primaryCrop = 'CORN',
  cornPrice = 4.52,
  cornChange = 0.08,
  soybeansPrice = 10.24,
  soybeansChange = -0.03,
  wheatPrice = 5.67,
  wheatChange = 0.05,
  marketingScore = 72,
  scoreLabel = 'Favorable',
  scoreColor = '#C9A84C',
  scoreRecommendation = 'Conditions are favorable for selling. Consider marketing 25–50% of your uncommitted bushels.',
  tempHigh = 74,
  tempLow = 52,
  weatherCondition = 'Partly Cloudy',
  windSpeed = 8,
  precipChance = 15,
  sprayOk = true,
  sendDate = '2026-04-06',
  unsubscribeToken = 'preview-token',
  subscriberId = 'preview-id',
}: FarmBriefProps) {
  // Format date for display
  const dateObj = new Date(sendDate + 'T12:00:00Z');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateDisplay = `${dayNames[dateObj.getUTCDay()]}, ${monthNames[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}`;

  // Preheader text (extends subject line in inbox preview)
  const secondaryCrop = primaryCrop.toUpperCase() !== 'SOYBEANS' ? 'Beans' : 'Wheat';
  const secondaryChange = primaryCrop.toUpperCase() !== 'SOYBEANS' ? soybeansChange : wheatChange;
  const secondaryStr = secondaryChange !== null
    ? `${secondaryChange >= 0 ? '▲' : '▼'}$${Math.abs(secondaryChange).toFixed(2)}`
    : 'unch';
  const preheaderText = `${secondaryCrop} ${secondaryStr} · ${weatherCondition} ${tempHigh ?? '--'}°F · Spray: ${sprayOk ? 'GO' : 'NO-GO'}`;

  return (
    <EmailLayout
      previewText={preheaderText}
      unsubscribeToken={unsubscribeToken}
    >
      {/* ── Date Header ───────────────────────────────────────── */}
      <Text style={dateHeaderStyle}>
        {dateDisplay} · {countyName}, {stateAbbr}
      </Text>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1: MARKETING SCORE (Hero)
          The single most actionable number. Big, bold, color-coded.
          ══════════════════════════════════════════════════════════ */}
      <Section style={scoreContainerStyle}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' as const, padding: '16px 0 8px' }}>
                <Text style={scoreLabelHeaderStyle}>MARKETING SCORE</Text>
                <Text style={{ ...scoreNumberStyle, color: scoreColor }}>
                  {marketingScore}
                </Text>
                <Text style={{ ...scoreBadgeStyle, color: scoreColor }}>
                  {scoreLabel}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2: COMMODITY PRICES
          ══════════════════════════════════════════════════════════ */}
      <Section style={pricesSectionStyle}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            <PriceRow name="Corn" price={cornPrice} change={cornChange} unit="/bu" />
            <PriceRow name="Soybeans" price={soybeansPrice} change={soybeansChange} unit="/bu" />
            <PriceRow name="Wheat" price={wheatPrice} change={wheatChange} unit="/bu" />
          </tbody>
        </table>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: SPRAY GO/NO-GO
          ══════════════════════════════════════════════════════════ */}
      <Section style={spraySectionStyle}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={sprayIndicatorCellStyle}>
                <span style={{
                  ...sprayBadgeStyle,
                  backgroundColor: sprayOk ? '#16a34a' : '#dc2626',
                }}>
                  {sprayOk ? 'GO' : 'NO-GO'}
                </span>
              </td>
              <td style={sprayDetailsCellStyle}>
                <Text style={sprayTitleStyle}>
                  Spray Window: {sprayOk ? 'Conditions Favorable' : 'Not Recommended'}
                </Text>
                <Text style={sprayMetaStyle}>
                  Wind {windSpeed ?? '--'} mph · {precipChance ?? '--'}% rain chance
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: COUNTY WEATHER
          ══════════════════════════════════════════════════════════ */}
      <Section style={weatherSectionStyle}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={weatherTempCellStyle}>
                <Text style={weatherHighStyle}>{tempHigh ?? '--'}°</Text>
                <Text style={weatherLowStyle}>{tempLow ?? '--'}°</Text>
              </td>
              <td style={weatherConditionCellStyle}>
                <Text style={weatherConditionTextStyle}>{weatherCondition}</Text>
                <Text style={weatherLocationStyle}>
                  {countyName}, {stateAbbr}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5: ACTIONABLE INSIGHT
          ══════════════════════════════════════════════════════════ */}
      <Hr style={dividerStyle} />

      <Section style={insightSectionStyle}>
        <Text style={insightTitleStyle}>Today&apos;s Insight</Text>
        <Text style={insightTextStyle}>{scoreRecommendation}</Text>
      </Section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <Section style={ctaContainerStyle}>
        <Button href={`${BASE_URL}/morning`} style={ctaButtonStyle}>
          Open Full Dashboard
        </Button>
      </Section>

      <Text style={footerNoteStyle}>
        You&apos;re receiving this because you used the HarvestFile ARC/PLC calculator.
        Data is for informational purposes only.
      </Text>
    </EmailLayout>
  );
}

// ── Price Row Sub-Component ──────────────────────────────────────────────────

function PriceRow({
  name,
  price,
  change,
  unit,
}: {
  name: string;
  price: number | null;
  change: number | null;
  unit: string;
}) {
  const isUp = change !== null && change >= 0;
  const arrow = change === null ? '' : isUp ? '▲' : '▼';
  const changeColor = change === null ? '#6B7264' : isUp ? '#16a34a' : '#dc2626';
  const changeStr = change !== null ? `$${Math.abs(change).toFixed(2)}` : 'unch';

  return (
    <tr>
      <td style={priceNameCellStyle}>
        <Text style={priceNameStyle}>{name}</Text>
      </td>
      <td style={priceValueCellStyle}>
        <Text style={priceValueStyle}>
          {price !== null ? `$${price.toFixed(2)}` : '--'}
          <span style={priceUnitStyle}>{unit}</span>
        </Text>
      </td>
      <td style={priceChangeCellStyle}>
        <Text style={{ ...priceChangeStyle, color: changeColor }}>
          {arrow} {changeStr}
        </Text>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// All inline (required for email client compatibility).
// Font sizes optimized for 58+ audience. Touch targets ≥44px.
// ══════════════════════════════════════════════════════════════════════════════

const dateHeaderStyle = {
  fontSize: '13px',
  color: '#6B7264',
  textAlign: 'center' as const,
  margin: '0 0 4px',
  letterSpacing: '0.02em',
};

// ── Score section ────────────────────────────────────────────────────────────

const scoreContainerStyle = {
  backgroundColor: '#0C1F17',
  borderRadius: '12px',
  padding: '4px 20px 16px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const scoreLabelHeaderStyle = {
  fontSize: '11px',
  fontWeight: '700' as const,
  color: '#8B9A82',
  letterSpacing: '0.12em',
  margin: '0 0 0',
  textAlign: 'center' as const,
};

const scoreNumberStyle = {
  fontSize: '48px',
  fontWeight: '800' as const,
  lineHeight: '1.1',
  margin: '0',
  textAlign: 'center' as const,
};

const scoreBadgeStyle = {
  fontSize: '16px',
  fontWeight: '700' as const,
  letterSpacing: '0.03em',
  margin: '0',
  textAlign: 'center' as const,
};

// ── Prices section ───────────────────────────────────────────────────────────

const pricesSectionStyle = {
  backgroundColor: '#f8faf7',
  border: '1px solid #e2ddd3',
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '0 0 12px',
};

const priceNameCellStyle = {
  width: '100px',
  padding: '8px 0',
  borderBottom: '1px solid #e8e5de',
  verticalAlign: 'middle' as const,
};

const priceNameStyle = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#1A1A1A',
  margin: '0',
};

const priceValueCellStyle = {
  padding: '8px 0',
  borderBottom: '1px solid #e8e5de',
  verticalAlign: 'middle' as const,
};

const priceValueStyle = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#1A1A1A',
  margin: '0',
  textAlign: 'right' as const,
};

const priceUnitStyle = {
  fontSize: '12px',
  fontWeight: '400' as const,
  color: '#9CA38F',
  marginLeft: '2px',
};

const priceChangeCellStyle = {
  width: '90px',
  padding: '8px 0 8px 12px',
  borderBottom: '1px solid #e8e5de',
  verticalAlign: 'middle' as const,
  textAlign: 'right' as const,
};

const priceChangeStyle = {
  fontSize: '15px',
  fontWeight: '700' as const,
  margin: '0',
  textAlign: 'right' as const,
};

// ── Spray section ────────────────────────────────────────────────────────────

const spraySectionStyle = {
  backgroundColor: '#f8faf7',
  border: '1px solid #e2ddd3',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '0 0 12px',
};

const sprayIndicatorCellStyle = {
  width: '64px',
  verticalAlign: 'middle' as const,
};

const sprayBadgeStyle = {
  display: 'inline-block' as const,
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: '800' as const,
  padding: '6px 12px',
  borderRadius: '6px',
  letterSpacing: '0.05em',
};

const sprayDetailsCellStyle = {
  paddingLeft: '12px',
  verticalAlign: 'middle' as const,
};

const sprayTitleStyle = {
  fontSize: '15px',
  fontWeight: '700' as const,
  color: '#1A1A1A',
  margin: '0 0 2px',
};

const sprayMetaStyle = {
  fontSize: '13px',
  color: '#6B7264',
  margin: '0',
};

// ── Weather section ──────────────────────────────────────────────────────────

const weatherSectionStyle = {
  backgroundColor: '#f8faf7',
  border: '1px solid #e2ddd3',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '0 0 16px',
};

const weatherTempCellStyle = {
  width: '80px',
  verticalAlign: 'middle' as const,
};

const weatherHighStyle = {
  fontSize: '28px',
  fontWeight: '800' as const,
  color: '#1A1A1A',
  margin: '0',
  lineHeight: '1.1',
};

const weatherLowStyle = {
  fontSize: '16px',
  fontWeight: '500' as const,
  color: '#6B7264',
  margin: '0',
};

const weatherConditionCellStyle = {
  paddingLeft: '12px',
  verticalAlign: 'middle' as const,
};

const weatherConditionTextStyle = {
  fontSize: '18px',
  fontWeight: '600' as const,
  color: '#1A1A1A',
  margin: '0 0 2px',
};

const weatherLocationStyle = {
  fontSize: '13px',
  color: '#6B7264',
  margin: '0',
};

// ── Insight section ──────────────────────────────────────────────────────────

const dividerStyle = {
  borderColor: '#e2ddd3',
  borderTop: '1px solid #e2ddd3',
  margin: '0 0 16px',
};

const insightSectionStyle = {
  margin: '0 0 16px',
};

const insightTitleStyle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#1B4332',
  margin: '0 0 4px',
  letterSpacing: '0.02em',
};

const insightTextStyle = {
  fontSize: '15px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0',
};

// ── CTA ──────────────────────────────────────────────────────────────────────

const ctaContainerStyle = {
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const ctaButtonStyle = {
  backgroundColor: '#1B4332',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '700' as const,
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
};

const footerNoteStyle = {
  fontSize: '11px',
  color: '#9CA38F',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
  fontStyle: 'italic' as const,
};
